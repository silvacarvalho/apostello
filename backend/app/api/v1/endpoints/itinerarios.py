"""
Endpoints de Itinerário do Pastor

O pastor registra em qual igreja estará em cada data.
Na geração da escala, esses cultos ficam sem pregador sorteado.
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.usuario import Usuario
from app.models.igreja import Igreja
from app.models.itinerario_pastor import ItinerarioPastor
from app.models.enums import TipoUsuario
from app.api.deps import require_pastor
from app.core.exceptions import (
    NotFoundException, BadRequestException, ForbiddenException, ConflictException
)
from app.schemas.itinerario_pastor import (
    ItinerarioPastorCreate,
    ItinerarioPastorUpdate,
    ItinerarioPastorResponse,
    ItinerarioPastorListResponse,
)


router = APIRouter()

TIPOS_ADMIN = [TipoUsuario.ADMIN, TipoUsuario.ASSOCIACAO]


def _to_response(item: ItinerarioPastor) -> ItinerarioPastorResponse:
    return ItinerarioPastorResponse(
        id=item.id,
        distrito_id=item.distrito_id,
        igreja_id=item.igreja_id,
        igreja_nome=item.igreja.nome if item.igreja else None,
        pastor_id=item.pastor_id,
        pastor_nome=item.pastor.nome_completo if item.pastor else None,
        data_culto=item.data_culto,
        observacoes=item.observacoes,
    )


def _validar_permissao_igreja(igreja: Igreja, current_user: Usuario):
    """Pastor só mexe em igrejas do próprio distrito (admin pode tudo)."""
    if current_user.tipo not in TIPOS_ADMIN and igreja.distrito_id != current_user.distrito_id:
        raise ForbiddenException("Você só pode gerenciar o itinerário do seu distrito")


def _get_item(db: Session, item_id: int, current_user: Usuario) -> ItinerarioPastor:
    item = db.query(ItinerarioPastor).filter(ItinerarioPastor.id == item_id).first()
    if not item:
        raise NotFoundException("Itinerário", item_id)
    if current_user.tipo not in TIPOS_ADMIN and item.distrito_id != current_user.distrito_id:
        raise ForbiddenException("Você só pode gerenciar o itinerário do seu distrito")
    return item


@router.get("/", response_model=ItinerarioPastorListResponse)
def listar_itinerarios(
    distrito_id: Optional[int] = Query(None, description="Distrito (admin)"),
    mes: Optional[int] = Query(None, ge=1, le=12),
    ano: Optional[int] = Query(None, ge=2024),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor),
):
    """Lista o itinerário do pastor, opcionalmente filtrado por mês/ano."""
    query = db.query(ItinerarioPastor)

    if current_user.tipo in TIPOS_ADMIN:
        if distrito_id:
            query = query.filter(ItinerarioPastor.distrito_id == distrito_id)
    else:
        query = query.filter(ItinerarioPastor.distrito_id == current_user.distrito_id)

    if mes and ano:
        from calendar import monthrange
        from datetime import date
        _, ultimo_dia = monthrange(ano, mes)
        query = query.filter(
            ItinerarioPastor.data_culto >= date(ano, mes, 1),
            ItinerarioPastor.data_culto <= date(ano, mes, ultimo_dia),
        )

    itens = query.order_by(ItinerarioPastor.data_culto.asc()).all()
    return ItinerarioPastorListResponse(
        total=len(itens), itinerarios=[_to_response(i) for i in itens]
    )


@router.post("/", response_model=ItinerarioPastorResponse, status_code=status.HTTP_201_CREATED)
def criar_itinerario(
    data: ItinerarioPastorCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor),
):
    """Registra que o pastor estará em uma igreja em uma data."""
    igreja = db.query(Igreja).filter(Igreja.id == data.igreja_id).first()
    if not igreja:
        raise NotFoundException("Igreja", data.igreja_id)
    _validar_permissao_igreja(igreja, current_user)

    existente = db.query(ItinerarioPastor).filter(
        ItinerarioPastor.igreja_id == data.igreja_id,
        ItinerarioPastor.data_culto == data.data_culto,
    ).first()
    if existente:
        raise ConflictException("Já existe itinerário para esta igreja nesta data")

    # O pastor não pode estar em duas igrejas no mesmo dia
    mesmo_dia = db.query(ItinerarioPastor).filter(
        ItinerarioPastor.distrito_id == igreja.distrito_id,
        ItinerarioPastor.data_culto == data.data_culto,
    ).first()
    if mesmo_dia:
        raise ConflictException(
            "O pastor já tem itinerário em outra igreja nesta data"
        )

    item = ItinerarioPastor(
        distrito_id=igreja.distrito_id,
        igreja_id=data.igreja_id,
        pastor_id=current_user.id,
        data_culto=data.data_culto,
        observacoes=data.observacoes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_response(item)


@router.put("/{item_id}", response_model=ItinerarioPastorResponse)
def atualizar_itinerario(
    item_id: int,
    data: ItinerarioPastorUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor),
):
    """Atualiza um registro do itinerário."""
    item = _get_item(db, item_id, current_user)

    nova_igreja_id = data.igreja_id or item.igreja_id
    nova_data = data.data_culto or item.data_culto

    if data.igreja_id and data.igreja_id != item.igreja_id:
        igreja = db.query(Igreja).filter(Igreja.id == data.igreja_id).first()
        if not igreja:
            raise NotFoundException("Igreja", data.igreja_id)
        _validar_permissao_igreja(igreja, current_user)
        if igreja.distrito_id != item.distrito_id:
            raise BadRequestException("A igreja deve ser do mesmo distrito")

    conflito = db.query(ItinerarioPastor).filter(
        ItinerarioPastor.id != item.id,
        ItinerarioPastor.distrito_id == item.distrito_id,
        ItinerarioPastor.data_culto == nova_data,
    ).first()
    if conflito:
        raise ConflictException("O pastor já tem itinerário nesta data")

    item.igreja_id = nova_igreja_id
    item.data_culto = nova_data
    if data.observacoes is not None:
        item.observacoes = data.observacoes

    db.commit()
    db.refresh(item)
    return _to_response(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_itinerario(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor),
):
    """Remove um registro do itinerário."""
    item = _get_item(db, item_id, current_user)
    db.delete(item)
    db.commit()
