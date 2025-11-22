"""Router: Avaliações"""
from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_avaliador, get_current_active_user
from app.models import Avaliacao, Usuario, Pregacao
from app.models.configuracao import Configuracao
from app.schemas.avaliacao import AvaliacaoCreate, AvaliacaoResponse

router = APIRouter()


def validar_periodo_avaliacao(db: Session, pregacao: Pregacao, user: Usuario) -> bool:
    """
    Valida se a avaliação está dentro do período permitido

    Retorna True se válido, levanta HTTPException se inválido
    """
    # Buscar configuração de período (igreja > distrito)
    config = db.query(Configuracao).filter(
        Configuracao.igreja_id == user.igreja_id,
        Configuracao.chave == "periodo_avaliacao"
    ).first()

    if not config:
        config = db.query(Configuracao).filter(
            Configuracao.distrito_id == user.distrito_id,
            Configuracao.chave == "periodo_avaliacao"
        ).first()

    # Valores padrão se não houver configuração
    if config:
        dias_antes = config.valor.get('dias_antes_pregacao', 0)
        dias_depois = config.valor.get('dias_depois_pregacao', 7)
        habilitado = config.valor.get('habilitado', True)
    else:
        dias_antes = 0
        dias_depois = 7
        habilitado = True

    # Se não está habilitado, permitir sempre
    if not habilitado:
        return True

    # Calcular período válido
    data_pregacao = datetime.combine(pregacao.data_pregacao, datetime.min.time())
    data_inicio = data_pregacao - timedelta(days=dias_antes)
    data_fim = data_pregacao + timedelta(days=dias_depois)
    data_atual = datetime.utcnow()

    # Validar se está dentro do período
    if data_atual < data_inicio:
        raise HTTPException(
            status_code=403,
            detail=f"O formulário de avaliação estará disponível a partir de {data_inicio.strftime('%d/%m/%Y')}"
        )

    if data_atual > data_fim:
        raise HTTPException(
            status_code=403,
            detail=f"O período para avaliação encerrou em {data_fim.strftime('%d/%m/%Y')}"
        )

    return True

@router.post("/", response_model=AvaliacaoResponse, status_code=status.HTTP_201_CREATED)
def criar_avaliacao(data: AvaliacaoCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_avaliador)):
    # Buscar a pregação
    pregacao = db.query(Pregacao).filter(Pregacao.id == data.pregacao_id).first()
    if not pregacao:
        raise HTTPException(status_code=404, detail="Pregação não encontrada")

    # VALIDAÇÃO 0: Verificar se está dentro do período de avaliação
    validar_periodo_avaliacao(db, pregacao, current_user)

    # VALIDAÇÃO 1: Verificar se o avaliador pertence à mesma igreja
    if current_user.igreja_id != pregacao.igreja_id:
        raise HTTPException(
            status_code=403,
            detail="Você só pode avaliar pregações da sua própria igreja"
        )

    # VALIDAÇÃO 2: Verificar se o avaliador não é o próprio pregador
    if current_user.id == pregacao.pregador_id:
        raise HTTPException(
            status_code=403,
            detail="Você não pode avaliar sua própria pregação"
        )

    # VALIDAÇÃO 3: Verificar se o avaliador não estava escalado no mesmo horário
    pregacao_avaliador = db.query(Pregacao).filter(
        Pregacao.pregador_id == current_user.id,
        Pregacao.data_pregacao == pregacao.data_pregacao,
        Pregacao.horario_pregacao == pregacao.horario_pregacao
    ).first()

    if pregacao_avaliador:
        raise HTTPException(
            status_code=403,
            detail="Você não pode avaliar esta pregação pois estava escalado para pregar no mesmo horário"
        )

    # Verificar se já avaliou esta pregação
    existing = db.query(Avaliacao).filter(
        Avaliacao.pregacao_id == data.pregacao_id,
        Avaliacao.avaliador_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Você já avaliou esta pregação")

    nova_avaliacao = Avaliacao(**data.dict(), avaliador_id=current_user.id)
    db.add(nova_avaliacao)
    db.commit()
    db.refresh(nova_avaliacao)

    # Recalcular score do pregador
    from app.services.pregador_service import recalcular_score
    recalcular_score(db, data.pregador_id)

    return nova_avaliacao

@router.get("/", response_model=List[AvaliacaoResponse])
def listar_avaliacoes(pregador_id: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    query = db.query(Avaliacao)
    if pregador_id:
        query = query.filter(Avaliacao.pregador_id == pregador_id)
    avaliacoes = query.offset(skip).limit(limit).all()
    return avaliacoes
