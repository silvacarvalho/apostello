"""Router: Escalas"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_pastor_distrital, get_current_active_user
from app.models import Escala, Usuario, Pregacao, Igreja
from app.models.escala import StatusEscala
from app.models.usuario import PerfilUsuario
from app.schemas.escala import (
    EscalaCreate,
    EscalaUpdate,
    EscalaResponse,
    EscalaGerarRequest,
    EventoCalendario,
    EventoCalendarioComIgreja,
    MinhaPregacaoItem,
    RelatorioGeracao,
)
from app.schemas.pregacao import PregacaoCreate, PregacaoUpdate, PregacaoResponse
from datetime import datetime, timedelta, date

router = APIRouter()

@router.post("/", response_model=EscalaResponse, status_code=status.HTTP_201_CREATED)
def criar_escala(data: EscalaCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    nova_escala = Escala(**data.dict(), criado_por=current_user.id)
    db.add(nova_escala)
    db.commit()
    db.refresh(nova_escala)
    return nova_escala

@router.post("/gerar", status_code=status.HTTP_201_CREATED)
def gerar_escala_automatica(data: EscalaGerarRequest, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    """
    Gerar escala automaticamente baseada em score
    
    Retorna a escala criada e um relatório completo da geração mostrando:
    - Total de igrejas processadas
    - Total de pregações criadas
    - Horários que não puderam ser preenchidos
    - Estatísticas detalhadas por igreja
    """
    from app.services.escala_service import gerar_escala_automatica
    
    try:
        escala, relatorio = gerar_escala_automatica(db, data.distrito_id, data.mes_referencia, data.ano_referencia, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        # Log do erro completo para debug
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao gerar escala: {str(e)}", exc_info=True)
        # Retornar mensagem amigável para o frontend
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Erro ao gerar escala: {str(e)}"
        )
    
    # Serializar escala manualmente
    escala_dict = {
        "id": escala.id,
        "codigo": escala.codigo,
        "distrito_id": escala.distrito_id,
        "mes_referencia": escala.mes_referencia,
        "ano_referencia": escala.ano_referencia,
        "status": escala.status.value if hasattr(escala.status, 'value') else str(escala.status),
        "observacoes": escala.observacoes,
        "criado_por": escala.criado_por,
        "aprovado_por": escala.aprovado_por,
        "finalizado_por": escala.finalizado_por,
        "criado_em": escala.criado_em,
        "aprovado_em": escala.aprovado_em,
        "finalizado_em": escala.finalizado_em,
        "atualizado_em": escala.atualizado_em
    }
    
    return {
        "escala": escala_dict,
        "relatorio": relatorio
    }


@router.get("/{escala_id}/relatorio", response_model=RelatorioGeracao)
def obter_relatorio_geracao(escala_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    """
    Obter relatório de geração de uma escala
    
    Mostra estatísticas de cobertura por igreja:
    - Quantas pregações foram criadas
    - Quais horários não puderam ser preenchidos
    - Quais igrejas não receberam nenhuma pregação
    """
    escala = db.query(Escala).filter(Escala.id == escala_id).first()
    if not escala:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    
    # Buscar todas as igrejas do distrito
    igrejas = db.query(Igreja).filter(
        Igreja.distrito_id == escala.distrito_id,
        Igreja.ativo == True
    ).all()
    
    # Buscar pregações da escala
    pregacoes = db.query(Pregacao).filter(Pregacao.escala_id == escala_id).all()
    
    # Agrupar pregações por igreja
    pregacoes_por_igreja = {}
    for pregacao in pregacoes:
        igreja_id = str(pregacao.igreja_id)
        if igreja_id not in pregacoes_por_igreja:
            pregacoes_por_igreja[igreja_id] = []
        pregacoes_por_igreja[igreja_id].append(pregacao)
    
    # Calcular estatísticas
    estatisticas = []
    igrejas_sem_pregacao = []
    
    for igreja in igrejas:
        igreja_id_str = str(igreja.id)
        pregacoes_igreja = pregacoes_por_igreja.get(igreja_id_str, [])
        num_pregacoes = len(pregacoes_igreja)
        
        if num_pregacoes == 0:
            igrejas_sem_pregacao.append(igreja.nome)
        
        estatisticas.append({
            "igreja_id": igreja_id_str,
            "igreja_nome": igreja.nome,
            "pregacoes_criadas": num_pregacoes,
            "horarios_sem_pregador": 0  # Não temos como calcular retroativamente
        })
    
    return {
        "escala_id": str(escala.id),
        "total_igrejas": len(igrejas),
        "total_pregacoes": len(pregacoes),
        "total_horarios_sem_pregador": 0,  # Não temos como calcular retroativamente
        "igrejas_sem_pregacao": igrejas_sem_pregacao,
        "estatisticas_por_igreja": estatisticas
    }


# ==============================
# Edição Manual (status: rascunho)
# ==============================

def _assert_rascunho(escala: Escala):
    if escala.status != StatusEscala.RASCUNHO:
        raise HTTPException(status_code=400, detail="Escala não está em rascunho")


@router.post("/{escala_id}/pregacoes", response_model=PregacaoResponse, status_code=status.HTTP_201_CREATED)
def adicionar_pregacao(
    escala_id: str,
    payload: PregacaoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor_distrital)
):
    escala = db.query(Escala).filter(Escala.id == escala_id).first()
    if not escala:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    _assert_rascunho(escala)

    # Validar mês/ano
    if payload.data_pregacao.month != escala.mes_referencia or payload.data_pregacao.year != escala.ano_referencia:
        raise HTTPException(status_code=400, detail="Data fora do mês/ano da escala")

    # Impedir múltiplas igrejas no mesmo dia para o mesmo pregador
    conflito = db.query(Pregacao).filter(
        Pregacao.pregador_id == str(payload.pregador_id),
        Pregacao.data_pregacao == payload.data_pregacao,
        Pregacao.status.in_(["agendado", "aceito", "realizado"]),
    ).first()
    if conflito:
        raise HTTPException(status_code=400, detail="Pregador já possui pregação neste dia")

    preg = Pregacao(
        escala_id=escala.id,
        igreja_id=str(payload.igreja_id),
        pregador_id=str(payload.pregador_id),
        tematica_id=str(payload.tematica_id) if payload.tematica_id else None,
        data_pregacao=payload.data_pregacao,
        horario_pregacao=payload.horario_pregacao,
        nome_culto=payload.nome_culto,
        observacoes=payload.observacoes,
        instrucoes_especiais=payload.instrucoes_especiais,
        status="agendado",
    )
    db.add(preg)
    db.commit()
    db.refresh(preg)
    return preg


@router.put("/{escala_id}/pregacoes/{pregacao_id}", response_model=PregacaoResponse)
def atualizar_pregacao(
    escala_id: str,
    pregacao_id: str,
    payload: PregacaoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor_distrital)
):
    escala = db.query(Escala).filter(Escala.id == escala_id).first()
    if not escala:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    _assert_rascunho(escala)

    preg = db.query(Pregacao).filter(Pregacao.id == pregacao_id, Pregacao.escala_id == escala_id).first()
    if not preg:
        raise HTTPException(status_code=404, detail="Pregação não encontrada")

    # Se trocar pregador/data, verificar conflito de múltiplas igrejas no mesmo dia
    novo_pregador_id = str(payload.pregador_id) if payload.pregador_id else str(preg.pregador_id)
    nova_data = payload.data_pregacao or preg.data_pregacao
    if novo_pregador_id and nova_data:
        conflito = db.query(Pregacao).filter(
            Pregacao.id != preg.id,
            Pregacao.pregador_id == novo_pregador_id,
            Pregacao.data_pregacao == nova_data,
            Pregacao.status.in_(["agendado", "aceito", "realizado"]),
        ).first()
        if conflito:
            raise HTTPException(status_code=400, detail="Pregador já possui pregação neste dia")

    # Aplicar atualizações
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(preg, k, v)

    db.commit()
    db.refresh(preg)
    return preg


@router.delete("/{escala_id}/pregacoes/{pregacao_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_pregacao(
    escala_id: str,
    pregacao_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor_distrital)
):
    escala = db.query(Escala).filter(Escala.id == escala_id).first()
    if not escala:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    _assert_rascunho(escala)

    preg = db.query(Pregacao).filter(Pregacao.id == pregacao_id, Pregacao.escala_id == escala_id).first()
    if not preg:
        raise HTTPException(status_code=404, detail="Pregação não encontrada")

    db.delete(preg)
    db.commit()
    return


@router.post("/{escala_id}/autoatribuir", response_model=PregacaoResponse, status_code=status.HTTP_201_CREATED)
def autoatribuir_pastor_ou_lider(
    escala_id: str,
    payload: PregacaoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor_distrital)
):
    """Autoatribuir-se a uma data (somente Pastor/Líder) enquanto rascunho."""
    # Validar perfil: precisa ser pastor_distrital ou lider_distrital (não apenas membro_associacao)
    perfis = [p.value if isinstance(p, PerfilUsuario) else p for p in (current_user.perfis or [])]
    if not any(p in ["pastor_distrital", "lider_distrital"] for p in perfis):
        raise HTTPException(status_code=403, detail="Somente Pastor/Líder podem autoatribuir-se")

    escala = db.query(Escala).filter(Escala.id == escala_id).first()
    if not escala:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    _assert_rascunho(escala)

    # Preencher pregador_id com usuário atual
    payload.pregador_id = current_user.id  # type: ignore[assignment]
    return adicionar_pregacao(escala_id, payload, db, current_user)

@router.get("/", response_model=List[EscalaResponse])
def listar_escalas(distrito_id: Optional[str] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    try:
        query = db.query(Escala)
        if distrito_id:
            # Validar UUID antes de filtrar
            try:
                from uuid import UUID
                UUID(distrito_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="distrito_id inválido")
            query = query.filter(Escala.distrito_id == distrito_id)
        escalas = query.order_by(Escala.ano_referencia.desc(), Escala.mes_referencia.desc()).offset(skip).limit(limit).all()
        
        # Converter status enum para string para evitar problemas de serialização
        resultado = []
        for escala in escalas:
            escala_dict = {
                "id": escala.id,
                "codigo": escala.codigo,
                "distrito_id": escala.distrito_id,
                "mes_referencia": escala.mes_referencia,
                "ano_referencia": escala.ano_referencia,
                "status": escala.status.value if hasattr(escala.status, 'value') else str(escala.status),
                "observacoes": escala.observacoes,
                "criado_por": escala.criado_por,
                "aprovado_por": escala.aprovado_por,
                "finalizado_por": escala.finalizado_por,
                "criado_em": escala.criado_em,
                "aprovado_em": escala.aprovado_em,
                "finalizado_em": escala.finalizado_em,
                "atualizado_em": escala.atualizado_em
            }
            resultado.append(escala_dict)
        
        return resultado
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao listar escalas: {str(e)}")

@router.get("/{escala_id}", response_model=EscalaResponse)
def obter_escala(escala_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    escala = db.query(Escala).filter(Escala.id == escala_id).first()
    if not escala:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    return escala

@router.put("/{escala_id}", response_model=EscalaResponse)
def atualizar_escala(escala_id: str, data: EscalaUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    escala = db.query(Escala).filter(Escala.id == escala_id).first()
    if not escala:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(escala, key, value)
    db.commit()
    db.refresh(escala)
    return escala

@router.post("/{escala_id}/aprovar", response_model=EscalaResponse)
def aprovar_escala(escala_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    escala = db.query(Escala).filter(Escala.id == escala_id).first()
    if not escala:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    escala.status = "aprovado"
    escala.aprovado_por = current_user.id
    from datetime import datetime
    escala.aprovado_em = datetime.utcnow()
    db.commit()
    db.refresh(escala)
    return escala

@router.post("/{escala_id}/finalizar", response_model=EscalaResponse)
def finalizar_escala(escala_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    escala = db.query(Escala).filter(Escala.id == escala_id).first()
    if not escala:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    escala.status = "finalizado"
    escala.finalizado_por = current_user.id
    from datetime import datetime
    escala.finalizado_em = datetime.utcnow()
    db.commit()
    db.refresh(escala)
    
    # TODO: Enviar notificações aos pregadores
    from app.services.notificacao_service import enviar_notificacoes_escala
    enviar_notificacoes_escala(db, escala.id)
    
    return escala


# ==============================
# Leitura para Calendários
# ==============================

def _intervalo_mes(mes: int, ano: int) -> tuple[date, date]:
    ini = date(ano, mes, 1)
    if mes == 12:
        fim = date(ano + 1, 1, 1) - timedelta(days=1)
    else:
        fim = date(ano, mes + 1, 1) - timedelta(days=1)
    return ini, fim


@router.get("/calendario/igreja", response_model=List[EventoCalendario])
def calendario_por_igreja(
    igreja_id: str,
    mes: int,
    ano: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    ini, fim = _intervalo_mes(mes, ano)
    pregacoes = db.query(Pregacao, Usuario).join(Usuario, Pregacao.pregador_id == Usuario.id).filter(
        Pregacao.igreja_id == igreja_id,
        Pregacao.data_pregacao >= ini,
        Pregacao.data_pregacao <= fim,
    ).all()

    eventos: List[EventoCalendario] = []
    for preg, user in pregacoes:
        start_dt = datetime.combine(preg.data_pregacao, preg.horario_pregacao)
        end_dt = start_dt + timedelta(hours=2)  # duração padrão
        title = f"{user.nome_completo} - {preg.nome_culto or 'Culto'}"
        eventos.append(EventoCalendario(
            id=preg.id,
            title=title,
            start=start_dt,
            end=end_dt,
            status=str(preg.status),
            igreja_id=preg.igreja_id,
            pregador_id=preg.pregador_id,
            meta={"tematica_id": str(preg.tematica_id) if preg.tematica_id else None},
        ))
    return eventos


@router.get("/calendario/distrito", response_model=List[EventoCalendarioComIgreja])
def calendario_por_distrito(
    distrito_id: str,
    mes: int,
    ano: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    ini, fim = _intervalo_mes(mes, ano)
    igrejas = db.query(Igreja).filter(Igreja.distrito_id == distrito_id, Igreja.ativo == True).all()
    igrejas_ids = [str(i.id) for i in igrejas]
    pregacoes = db.query(Pregacao, Usuario, Igreja).join(Usuario, Pregacao.pregador_id == Usuario.id).join(Igreja, Pregacao.igreja_id == Igreja.id).filter(
        Pregacao.igreja_id.in_(igrejas_ids),
        Pregacao.data_pregacao >= ini,
        Pregacao.data_pregacao <= fim,
    ).all()

    eventos: List[EventoCalendarioComIgreja] = []
    for preg, user, ig in pregacoes:
        start_dt = datetime.combine(preg.data_pregacao, preg.horario_pregacao)
        end_dt = start_dt + timedelta(hours=2)
        title = f"{user.nome_completo} - {preg.nome_culto or 'Culto'}"
        eventos.append(EventoCalendarioComIgreja(
            id=preg.id,
            title=title,
            start=start_dt,
            end=end_dt,
            status=str(preg.status),
            igreja_id=preg.igreja_id,
            pregador_id=preg.pregador_id,
            igreja_nome=ig.nome,
            meta={"tematica_id": str(preg.tematica_id) if preg.tematica_id else None},
        ))
    return eventos


@router.get("/minhas", response_model=List[MinhaPregacaoItem])
def minhas_pregacoes(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    q = db.query(Pregacao, Igreja).join(Igreja, Pregacao.igreja_id == Igreja.id).filter(
        Pregacao.pregador_id == current_user.id,
    )
    if mes and ano:
        ini, fim = _intervalo_mes(mes, ano)
        q = q.filter(Pregacao.data_pregacao >= ini, Pregacao.data_pregacao <= fim)
    else:
        # Próximas por padrão
        q = q.filter(Pregacao.data_pregacao >= date.today())

    pregacoes = q.order_by(Pregacao.data_pregacao.asc(), Pregacao.horario_pregacao.asc()).all()

    itens: List[MinhaPregacaoItem] = []
    for preg, ig in pregacoes:
        itens.append(MinhaPregacaoItem(
            id=preg.id,
            data=preg.data_pregacao,
            horario=preg.horario_pregacao,
            status=str(preg.status),
            igreja_id=preg.igreja_id,
            igreja_nome=ig.nome,
            nome_culto=preg.nome_culto,
        ))
    return itens
