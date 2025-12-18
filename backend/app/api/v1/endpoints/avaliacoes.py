"""
Endpoints de Avaliações
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.avaliacao_service import AvaliacaoService
from app.schemas.avaliacao import AvaliacaoCreate, AvaliacaoResponse, AvaliacaoListResponse
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
    Lista itens pendentes de avaliação para o membro.
    """
    service = AvaliacaoService(db)
    return service.get_pendentes_avaliacao(
        current_user.igreja_id,
        current_user.id
    )


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
