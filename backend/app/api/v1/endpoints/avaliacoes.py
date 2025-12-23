"""
Endpoints de Avaliações
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.services.avaliacao_service import AvaliacaoService
from app.schemas.avaliacao import (
    AvaliacaoCreate, AvaliacaoResponse, AvaliacaoListResponse,
    QuestionarioAvaliacaoResponse, ItemAvaliacaoPendente, AvaliadoInfo
)
from app.models.usuario import Usuario
from app.api.deps import get_current_user, require_membro


router = APIRouter()


@router.post("/", response_model=AvaliacaoResponse, status_code=status.HTTP_201_CREATED)
def criar_avaliacao(
    data: AvaliacaoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_membro)
):
    """
    Cria nova avaliação (apenas membros).
    """
    service = AvaliacaoService(db)
    return service.create(data, current_user)


@router.get("/pendentes")
def listar_pendentes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_membro)
):
    """
    Lista itens pendentes de avaliação para o membro com fotos dos avaliados.
    Retorna dados formatados para exibir questionário completo.
    """
    from app.models.item_escala import ItemEscala, StatusRealizacao
    from app.models.avaliacao import Avaliacao, TipoAvaliado
    from app.models.igreja import Igreja
    from app.models.escala import Escala
    from app.models.configuracao_distrito import ConfiguracaoDistrito
    from datetime import date, timedelta
    
    # Buscar configuração do distrito
    if current_user.igreja:
        distrito_id = current_user.igreja.distrito_id
        config = db.query(ConfiguracaoDistrito).filter(
            ConfiguracaoDistrito.distrito_id == distrito_id
        ).first()
        prazo_dias = config.prazo_avaliacao_dias if config else 7
    else:
        prazo_dias = 7
    
    data_limite = date.today() - timedelta(days=prazo_dias)
    
    # Subquery de itens já avaliados pelo usuário
    avaliados_pregador = db.query(Avaliacao.item_escala_id).filter(
        Avaliacao.avaliador_id == current_user.id,
        Avaliacao.tipo == TipoAvaliado.PREGADOR
    ).subquery()
    
    avaliados_cantor = db.query(Avaliacao.item_escala_id).filter(
        Avaliacao.avaliador_id == current_user.id,
        Avaliacao.tipo == TipoAvaliado.CANTOR
    ).subquery()
    
    # Buscar itens pendentes
    # Incluir itens REALIZADOS ou itens PENDENTES cuja data já passou
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).date()
    
    itens = db.query(ItemEscala).filter(
        ItemEscala.igreja_id == current_user.igreja_id,
        ItemEscala.data_culto >= data_limite,
        ItemEscala.data_culto <= now,  # Apenas cultos que já aconteceram
        or_(
            ItemEscala.status_realizacao == StatusRealizacao.REALIZADO,
            ItemEscala.status_realizacao == StatusRealizacao.PENDENTE
        )
    ).order_by(ItemEscala.data_culto.desc()).all()
    
    resultado = []
    
    for item in itens:
        igreja = db.query(Igreja).filter(Igreja.id == item.igreja_id).first()
        
        item_data = {
            "item_id": item.id,
            "escala_id": item.escala_id,
            "data_culto": item.data_culto,
            "igreja_id": item.igreja_id,
            "igreja_nome": igreja.nome if igreja else "Igreja",
            "pregador": None,
            "cantor": None
        }
        
        # Verificar se precisa avaliar pregador
        if item.pregador_id:
            ja_avaliou = db.query(Avaliacao).filter(
                Avaliacao.item_escala_id == item.id,
                Avaliacao.avaliador_id == current_user.id,
                Avaliacao.tipo == TipoAvaliado.PREGADOR
            ).first()
            
            if not ja_avaliou:
                pregador = db.query(Usuario).filter(Usuario.id == item.pregador_id).first()
                if pregador:
                    item_data["pregador"] = {
                        "id": pregador.id,
                        "nome_completo": pregador.nome_completo,
                        "foto_perfil": pregador.foto_url,
                        "tipo": TipoAvaliado.PREGADOR
                    }
        
        # Verificar se precisa avaliar cantor
        if item.cantor_id:
            ja_avaliou = db.query(Avaliacao).filter(
                Avaliacao.item_escala_id == item.id,
                Avaliacao.avaliador_id == current_user.id,
                Avaliacao.tipo == TipoAvaliado.CANTOR
            ).first()
            
            if not ja_avaliou:
                cantor = db.query(Usuario).filter(Usuario.id == item.cantor_id).first()
                if cantor:
                    item_data["cantor"] = {
                        "id": cantor.id,
                        "nome_completo": cantor.nome_completo,
                        "foto_perfil": cantor.foto_url,
                        "tipo": TipoAvaliado.CANTOR
                    }
        
        # Só adicionar se tiver algo para avaliar
        if item_data["pregador"] or item_data["cantor"]:
            resultado.append(item_data)
    
    return resultado


@router.get("/usuario/{usuario_id}", response_model=AvaliacaoListResponse)
def listar_por_usuario(
    usuario_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista avaliações de um usuário.
    """
    service = AvaliacaoService(db)
    avaliacoes, total, media = service.list_by_avaliado(usuario_id, skip, limit)
    
    return {
        "items": avaliacoes,
        "total": total,
        "media_geral": media
    }


@router.get("/item/{item_escala_id}")
def listar_por_item(
    item_escala_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista avaliações de um item de escala.
    """
    service = AvaliacaoService(db)
    return service.list_by_item(item_escala_id)


@router.get("/{avaliacao_id}", response_model=AvaliacaoResponse)
def obter_avaliacao(
    avaliacao_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtém avaliação por ID.
    """
    service = AvaliacaoService(db)
    return service.get_by_id(avaliacao_id)
