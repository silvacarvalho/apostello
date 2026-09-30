"""
Endpoints PÚBLICOS (sem login) para a escala consultada por QR Code.

Regras de privacidade:
- Só mostram escalas PUBLICADAS (ou ARQUIVADAS, que já foram publicadas).
- Expõem apenas: data, horário, igreja, nome de quem prega/canta, tema e
  se o pastor estará presente. Nunca telefone, e-mail ou CPF.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundException
from app.database import get_db
from app.models.distrito import Distrito
from app.models.enums import StatusEscala
from app.models.escala import Escala
from app.models.igreja import Igreja
from app.models.item_escala import ItemEscala
from app.services.itinerario_helper import mapa_itinerario

router = APIRouter()

STATUS_VISIVEIS = [StatusEscala.PUBLICADA, StatusEscala.ARQUIVADA]
DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]


class CultoPublico(BaseModel):
    data_culto: str
    dia_semana: str
    horario: str
    igreja_id: int
    igreja_nome: str
    pregador_nome: Optional[str] = None
    pastor_presente: bool = False
    pastor_nome: Optional[str] = None
    cantor_nome: Optional[str] = None
    tema: Optional[str] = None


class IgrejaPublica(BaseModel):
    id: int
    nome: str
    endereco: Optional[str] = None


class EscalaIgrejaPublica(BaseModel):
    igreja: IgrejaPublica
    distrito_id: int
    distrito_nome: str
    mes: int
    ano: int
    disponivel: bool
    cultos: List[CultoPublico]


class IgrejaComCultos(BaseModel):
    igreja: IgrejaPublica
    cultos: List[CultoPublico]


class EscalaDistritoPublica(BaseModel):
    distrito_id: int
    distrito_nome: str
    mes: int
    ano: int
    disponivel: bool
    igrejas: List[IgrejaComCultos]


def _buscar_itens(db: Session, distrito_id: int, mes: int, ano: int, igreja_id: Optional[int] = None):
    escala = db.query(Escala).filter(
        Escala.distrito_id == distrito_id,
        Escala.mes == mes,
        Escala.ano == ano,
        Escala.status.in_(STATUS_VISIVEIS),
    ).first()
    if not escala:
        return [], {}

    query = db.query(ItemEscala).options(
        joinedload(ItemEscala.pregador),
        joinedload(ItemEscala.cantor),
        joinedload(ItemEscala.tema),
        joinedload(ItemEscala.igreja),
    ).filter(ItemEscala.escala_id == escala.id)
    if igreja_id:
        query = query.filter(ItemEscala.igreja_id == igreja_id)
    itens = query.order_by(ItemEscala.data_culto, ItemEscala.horario).all()

    itinerario = mapa_itinerario(db, mes, ano, distrito_id=distrito_id)
    return itens, itinerario


def _para_culto(item: ItemEscala, itinerario: dict) -> CultoPublico:
    it = itinerario.get((item.igreja_id, item.data_culto))
    pastor_presente = it is not None and item.pregador is None
    tema = None
    if item.tema:
        tema = item.tema.titulo
    elif item.tema_customizado:
        tema = item.tema_customizado
    return CultoPublico(
        data_culto=item.data_culto.isoformat(),
        dia_semana=DIAS_SEMANA[item.data_culto.weekday()],
        horario=item.horario.strftime("%H:%M"),
        igreja_id=item.igreja_id,
        igreja_nome=item.igreja.nome if item.igreja else "",
        pregador_nome=item.pregador.nome_completo if item.pregador else None,
        pastor_presente=pastor_presente,
        pastor_nome=(it.pastor.nome_completo if pastor_presente and it.pastor else None),
        cantor_nome=item.cantor.nome_completo if item.cantor else None,
        tema=tema,
    )


@router.get("/igrejas/{igreja_id}/escala", response_model=EscalaIgrejaPublica)
def escala_publica_igreja(
    igreja_id: int,
    mes: int = Query(..., ge=1, le=12),
    ano: int = Query(..., ge=2024, le=2100),
    db: Session = Depends(get_db),
):
    """Escala publicada de uma igreja em um mês (sem login)."""
    igreja = db.query(Igreja).filter(Igreja.id == igreja_id).first()
    if not igreja:
        raise NotFoundException("Igreja", igreja_id)
    distrito = db.query(Distrito).filter(Distrito.id == igreja.distrito_id).first()

    itens, itinerario = _buscar_itens(db, igreja.distrito_id, mes, ano, igreja_id=igreja_id)
    return EscalaIgrejaPublica(
        igreja=IgrejaPublica(id=igreja.id, nome=igreja.nome, endereco=igreja.endereco_completo),
        distrito_id=igreja.distrito_id,
        distrito_nome=distrito.nome if distrito else "",
        mes=mes,
        ano=ano,
        disponivel=len(itens) > 0,
        cultos=[_para_culto(i, itinerario) for i in itens],
    )


@router.get("/distritos/{distrito_id}/escalas", response_model=EscalaDistritoPublica)
def escalas_publicas_distrito(
    distrito_id: int,
    mes: int = Query(..., ge=1, le=12),
    ano: int = Query(..., ge=2024, le=2100),
    db: Session = Depends(get_db),
):
    """Escalas publicadas de TODAS as igrejas de um distrito em um mês (sem login)."""
    distrito = db.query(Distrito).filter(Distrito.id == distrito_id).first()
    if not distrito:
        raise NotFoundException("Distrito", distrito_id)

    itens, itinerario = _buscar_itens(db, distrito_id, mes, ano)

    por_igreja = {}
    for item in itens:
        if item.igreja_id not in por_igreja:
            por_igreja[item.igreja_id] = IgrejaComCultos(
                igreja=IgrejaPublica(
                    id=item.igreja_id,
                    nome=item.igreja.nome if item.igreja else "",
                    endereco=item.igreja.endereco_completo if item.igreja else None,
                ),
                cultos=[],
            )
        por_igreja[item.igreja_id].cultos.append(_para_culto(item, itinerario))

    igrejas = sorted(por_igreja.values(), key=lambda g: g.igreja.nome.lower())
    return EscalaDistritoPublica(
        distrito_id=distrito_id,
        distrito_nome=distrito.nome,
        mes=mes,
        ano=ano,
        disponivel=len(itens) > 0,
        igrejas=igrejas,
    )
