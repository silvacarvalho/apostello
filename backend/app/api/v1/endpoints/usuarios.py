"""
Endpoints de Usuários
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.usuario_service import UsuarioService
from app.schemas.usuario import (
    UsuarioCreate, UsuarioUpdate, UsuarioResponse, UsuarioListResponse
)
from app.models.usuario import Usuario, TipoUsuario
from app.api.deps import get_current_user, require_admin, require_pastor


router = APIRouter()


@router.post("/", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def criar_usuario(
    data: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Cria novo usuário (requer permissão de pastor/admin).
    """
    service = UsuarioService(db)
    return service.create(data)


@router.post("/auto-cadastro", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def auto_cadastro(
    data: UsuarioCreate,
    db: Session = Depends(get_db)
):
    """
    Auto cadastro de pregadores/cantores (pendente de aprovação).
    """
    service = UsuarioService(db)
    return service.create(data, auto_cadastro=True)


@router.get("/", response_model=UsuarioListResponse)
def listar_usuarios(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    tipo: Optional[TipoUsuario] = None,
    distrito_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista usuários com filtros.
    """
    service = UsuarioService(db)
    
    # Se não for admin, filtrar por distrito
    if not current_user.is_admin and current_user.distrito_id:
        distrito_id = current_user.distrito_id
    
    usuarios, total = service.list_all(skip, limit, tipo, distrito_id, search)
    
    return {
        "items": usuarios,
        "total": total,
        "page": skip // limit + 1,
        "size": limit,
        "pages": (total + limit - 1) // limit
    }


@router.get("/pregadores")
def listar_pregadores(
    distrito_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista pregadores ativos de um distrito.
    """
    service = UsuarioService(db)
    return service.list_pregadores(distrito_id)


@router.get("/cantores")
def listar_cantores(
    distrito_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista cantores ativos de um distrito.
    """
    service = UsuarioService(db)
    return service.list_cantores(distrito_id)


@router.get("/pendentes")
def listar_pendentes(
    distrito_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Lista usuários pendentes de aprovação.
    """
    service = UsuarioService(db)
    
    # Pastor só vê do seu distrito
    if current_user.is_pastor and not current_user.is_admin:
        distrito_id = current_user.distrito_id
    
    return service.list_pendentes_aprovacao(distrito_id)


@router.get("/{usuario_id}", response_model=UsuarioResponse)
def obter_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtém usuário por ID.
    """
    service = UsuarioService(db)
    return service.get_by_id(usuario_id)


@router.put("/{usuario_id}", response_model=UsuarioResponse)
def atualizar_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Atualiza usuário.
    """
    service = UsuarioService(db)
    return service.update(usuario_id, data, current_user)


@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Remove usuário (apenas admin).
    """
    service = UsuarioService(db)
    service.delete(usuario_id, current_user)


@router.post("/{usuario_id}/ativar", response_model=UsuarioResponse)
def ativar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Ativa usuário.
    """
    service = UsuarioService(db)
    return service.activate(usuario_id, current_user)


@router.post("/{usuario_id}/desativar", response_model=UsuarioResponse)
def desativar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Desativa usuário.
    """
    service = UsuarioService(db)
    return service.deactivate(usuario_id, current_user)


@router.post("/{usuario_id}/aprovar", response_model=UsuarioResponse)
def aprovar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Aprova cadastro de usuário.
    """
    service = UsuarioService(db)
    return service.approve(usuario_id, current_user, aprovar=True)


@router.post("/{usuario_id}/recusar", response_model=UsuarioResponse)
def recusar_usuario(
    usuario_id: int,
    motivo: str = Query(..., min_length=10),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Recusa cadastro de usuário.
    """
    service = UsuarioService(db)
    return service.approve(usuario_id, current_user, aprovar=False, motivo=motivo)
