"""
Endpoints de Igrejas
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.igreja_service import IgrejaService
from app.schemas.igreja import (
    IgrejaCreate, IgrejaUpdate, IgrejaResponse, IgrejaListResponse
)
from app.schemas.horario_culto import HorarioCultoCreate, HorarioCultoResponse
from app.models.usuario import Usuario, TipoUsuario
from app.models.horario_culto import HorarioCulto
from app.api.deps import (
    get_current_user, require_admin, require_pastor,
    get_user_distrito_id, verify_distrito_access, verify_igreja_access
)
from app.core.exceptions import ForbiddenException


router = APIRouter()


@router.post("/", response_model=IgrejaResponse, status_code=status.HTTP_201_CREATED)
def criar_igreja(
    data: IgrejaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Cria nova igreja.
    Pastor/Líder só pode criar igrejas no seu distrito.
    """
    # Verificar acesso ao distrito
    verify_distrito_access(current_user, data.distrito_id)
    
    service = IgrejaService(db)
    return service.create(data, current_user)


@router.get("/", response_model=IgrejaListResponse)
def listar_igrejas(
    distrito_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Lista igrejas.
    
    - ADMIN: pode listar todas ou filtrar por distrito_id
    - PASTOR/LIDER: lista apenas igrejas do seu distrito
    
    Apenas Pastores e Administradores têm acesso.
    """
    # Forçar filtro por distrito do usuário se não for admin
    if current_user.tipo != TipoUsuario.ADMIN:
        user_distrito_id = get_user_distrito_id(current_user)
        if not user_distrito_id:
            raise ForbiddenException("Usuário sem distrito associado")
        distrito_id = user_distrito_id
    
    service = IgrejaService(db)
    igrejas, total = service.list_all(distrito_id, skip, limit)
    
    return {
        "items": igrejas,
        "total": total
    }


@router.get("/search")
def buscar_igrejas(
    nome: str = Query(..., min_length=2),
    distrito_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Busca igrejas por nome.
    Apenas Pastores e Administradores têm acesso.
    """
    # Forçar filtro por distrito do usuário se não for admin
    if current_user.tipo != TipoUsuario.ADMIN:
        user_distrito_id = get_user_distrito_id(current_user)
        if not user_distrito_id:
            raise ForbiddenException("Usuário sem distrito associado")
        distrito_id = user_distrito_id
    
    service = IgrejaService(db)
    return service.search(nome, distrito_id)


@router.get("/{igreja_id}", response_model=IgrejaResponse)
def obter_igreja(
    igreja_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtém igreja por ID.
    """
    service = IgrejaService(db)
    return service.get_by_id(igreja_id)


@router.put("/{igreja_id}", response_model=IgrejaResponse)
def atualizar_igreja(
    igreja_id: int,
    data: IgrejaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Atualiza igreja.
    Pastor/Líder só pode atualizar igrejas do seu distrito.
    """
    # Verificar acesso à igreja
    verify_igreja_access(current_user, igreja_id, db)
    
    service = IgrejaService(db)
    return service.update(igreja_id, data, current_user)


@router.delete("/{igreja_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_igreja(
    igreja_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Remove igreja (apenas admin).
    """
    service = IgrejaService(db)
    service.delete(igreja_id, current_user)


# Horários de Culto
@router.get("/{igreja_id}/horarios")
def listar_horarios(
    igreja_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista horários de culto de uma igreja.
    """
    horarios = db.query(HorarioCulto).filter(
        HorarioCulto.igreja_id == igreja_id,
        HorarioCulto.ativo == True
    ).all()
    
    return horarios


@router.post("/{igreja_id}/horarios", response_model=HorarioCultoResponse, status_code=status.HTTP_201_CREATED)
def criar_horario(
    igreja_id: int,
    data: HorarioCultoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Cria horário de culto para uma igreja.
    """
    horario = HorarioCulto(
        igreja_id=igreja_id,
        dia_semana=data.dia_semana,
        horario=data.horario
    )
    
    db.add(horario)
    db.commit()
    db.refresh(horario)
    
    return horario


@router.delete("/{igreja_id}/horarios/{horario_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_horario(
    igreja_id: int,
    horario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Remove horário de culto.
    """
    horario = db.query(HorarioCulto).filter(
        HorarioCulto.id == horario_id,
        HorarioCulto.igreja_id == igreja_id
    ).first()
    
    if horario:
        horario.ativo = False
        db.commit()
