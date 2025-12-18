"""
Endpoints de Notificações
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.notificacao_service import NotificacaoService
from app.models.usuario import Usuario
from app.api.deps import get_current_user


router = APIRouter()


@router.get("/")
def listar_notificacoes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista notificações do usuário.
    """
    service = NotificacaoService(db)
    return service.get_all(current_user.id, skip, limit)


@router.get("/nao-lidas")
def listar_nao_lidas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista notificações não lidas.
    """
    service = NotificacaoService(db)
    return service.get_unread(current_user.id)


@router.get("/count")
def contar_nao_lidas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Conta notificações não lidas.
    """
    service = NotificacaoService(db)
    return {"count": service.count_unread(current_user.id)}


@router.post("/{notificacao_id}/ler")
def marcar_como_lida(
    notificacao_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Marca notificação como lida.
    """
    service = NotificacaoService(db)
    success = service.mark_as_read(notificacao_id, current_user.id)
    
    return {"success": success}


@router.post("/ler-todas")
def marcar_todas_como_lidas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Marca todas as notificações como lidas.
    """
    service = NotificacaoService(db)
    count = service.mark_all_as_read(current_user.id)
    
    return {"count": count}
