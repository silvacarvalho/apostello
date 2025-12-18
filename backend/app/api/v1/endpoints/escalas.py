"""
Endpoints de Escalas
"""
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.escala_service import EscalaService
from app.schemas.escala import (
    EscalaCreate, EscalaResponse, EscalaGenerateRequest, EscalaPublish
)
from app.schemas.item_escala import (
    ItemEscalaCreate, ItemEscalaUpdate, ItemEscalaResponse, ItemEscalaConfirmacao
)
from app.models.usuario import Usuario
from app.api.deps import get_current_user, require_pastor


router = APIRouter()


@router.post("/", response_model=EscalaResponse, status_code=status.HTTP_201_CREATED)
def criar_escala(
    data: EscalaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Cria nova escala vazia.
    """
    service = EscalaService(db)
    return service.create(data, current_user)


@router.post("/gerar", response_model=EscalaResponse, status_code=status.HTTP_201_CREATED)
def gerar_escala(
    data: EscalaGenerateRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Gera escala automaticamente.
    """
    service = EscalaService(db)
    return service.generate(data, current_user)


@router.get("/")
def listar_escalas(
    distrito_id: int = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista escalas de um distrito.
    """
    service = EscalaService(db)
    return service.list_by_distrito(distrito_id, skip, limit)


@router.get("/minhas")
def minhas_escalas(
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista escalas do usuário logado.
    """
    service = EscalaService(db)
    return service.get_my_schedule(current_user, data_inicio, data_fim)


@router.get("/{escala_id}", response_model=EscalaResponse)
def obter_escala(
    escala_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtém escala por ID.
    """
    service = EscalaService(db)
    return service.get_by_id(escala_id)


@router.get("/{escala_id}/itens")
def listar_itens_escala(
    escala_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista itens de uma escala.
    """
    service = EscalaService(db)
    escala = service.escala_repo.get_with_items(escala_id)
    
    if not escala:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Escala", escala_id)
    
    return escala.itens


@router.post("/{escala_id}/publicar", response_model=EscalaResponse)
def publicar_escala(
    escala_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Publica escala.
    """
    service = EscalaService(db)
    return service.publish(escala_id, current_user)


@router.put("/itens/{item_id}", response_model=ItemEscalaResponse)
def atualizar_item(
    item_id: int,
    data: ItemEscalaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Atualiza item da escala.
    """
    service = EscalaService(db)
    return service.update_item(
        item_id,
        pregador_id=data.pregador_id,
        cantor_id=data.cantor_id,
        current_user=current_user
    )


@router.post("/itens/{item_id}/confirmar")
def confirmar_presenca(
    item_id: int,
    data: ItemEscalaConfirmacao,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Confirma ou recusa presença em um item da escala.
    """
    service = EscalaService(db)
    item = service.confirm_presence(item_id, current_user, data.confirmado)
    
    return {
        "message": "Presença confirmada" if data.confirmado else "Presença recusada",
        "item_id": item.id
    }
