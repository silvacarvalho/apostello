"""
Endpoints de Distritos
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.distrito_service import DistritoService
from app.schemas.distrito import (
    DistritoCreate, DistritoUpdate, DistritoResponse, DistritoListResponse
)
from app.models.usuario import Usuario
from app.api.deps import get_current_user, require_admin


router = APIRouter()


@router.get("/publico", response_model=DistritoListResponse)
def listar_distritos_publico(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Lista distritos ativos (endpoint público para auto-cadastro).
    """
    service = DistritoService(db)
    distritos, total = service.list_publico(skip, limit)
    
    return {
        "items": distritos,
        "total": total
    }


@router.get("/pesquisar", response_model=DistritoListResponse)
def pesquisar_distritos(
    search: str = Query("", description="Termo de pesquisa"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Pesquisa distritos por nome.
    """
    service = DistritoService(db)
    distritos, total = service.search(search, skip, limit)
    
    return {
        "items": distritos,
        "total": total
    }


@router.post("/", response_model=DistritoResponse, status_code=status.HTTP_201_CREATED)
def criar_distrito(
    data: DistritoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Cria novo distrito (apenas admin).
    """
    service = DistritoService(db)
    return service.create(data, current_user)


@router.get("/", response_model=DistritoListResponse)
def listar_distritos(
    organizacao_id: int = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista distritos de uma organização.
    """
    service = DistritoService(db)
    distritos, total = service.list_all(organizacao_id, skip, limit)
    
    return {
        "items": distritos,
        "total": total
    }


@router.get("/{distrito_id}", response_model=DistritoResponse)
def obter_distrito(
    distrito_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtém distrito por ID.
    """
    service = DistritoService(db)
    return service.get_by_id(distrito_id)


@router.put("/{distrito_id}", response_model=DistritoResponse)
def atualizar_distrito(
    distrito_id: int,
    data: DistritoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Atualiza distrito.
    """
    service = DistritoService(db)
    return service.update(distrito_id, data, current_user)


@router.delete("/{distrito_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_distrito(
    distrito_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Remove distrito (apenas admin).
    """
    service = DistritoService(db)
    service.delete(distrito_id, current_user)
