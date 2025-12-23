"""
Endpoints de Horários de Culto
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.api.deps import get_current_user
from app.models.usuario import Usuario
from app.services.horario_culto_service import HorarioCultoService
from app.schemas.horario_culto import (
    HorarioCultoCreate,
    HorarioCultoCreateLote,
    HorarioCultoUpdate,
    HorarioCultoResponse,
    HorariosPorIgrejaResponse
)

router = APIRouter()


@router.get("/distritos/{distrito_id}/horarios", response_model=List[HorariosPorIgrejaResponse])
def listar_horarios_distrito(
    distrito_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista todos os horários de culto do distrito agrupados por igreja
    
    Permissões: ADMIN, PASTOR_DISTRITAL, LIDER_DISTRITAL do distrito
    """
    service = HorarioCultoService(db)
    return service.listar_por_distrito(distrito_id, current_user)


@router.get("/igrejas/{igreja_id}/horarios", response_model=List[HorarioCultoResponse])
def listar_horarios_igreja(
    igreja_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista horários de culto de uma igreja específica
    
    Permissões: ADMIN, PASTOR_DISTRITAL, LIDER_DISTRITAL do distrito
    """
    service = HorarioCultoService(db)
    return service.listar_por_igreja(igreja_id, current_user)


@router.post("/horarios", response_model=HorarioCultoResponse)
def criar_horario(
    data: HorarioCultoCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cria um horário de culto para uma igreja
    
    Permissões: ADMIN, PASTOR_DISTRITAL, LIDER_DISTRITAL do distrito
    """
    service = HorarioCultoService(db)
    return service.criar_horario(data, current_user)


@router.post("/horarios/lote", response_model=List[HorarioCultoResponse])
def criar_horarios_lote(
    data: HorarioCultoCreateLote,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cria horários em lote para todas as igrejas ativas do distrito
    
    Permissões: ADMIN, PASTOR_DISTRITAL, LIDER_DISTRITAL do distrito
    """
    service = HorarioCultoService(db)
    return service.criar_horarios_lote(data, current_user)


@router.put("/horarios/{horario_id}", response_model=HorarioCultoResponse)
def atualizar_horario(
    horario_id: int,
    data: HorarioCultoUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Atualiza um horário de culto
    
    Permissões: ADMIN, PASTOR_DISTRITAL, LIDER_DISTRITAL do distrito
    """
    service = HorarioCultoService(db)
    return service.atualizar_horario(horario_id, data, current_user)


@router.delete("/horarios/{horario_id}")
def deletar_horario(
    horario_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deleta um horário de culto
    
    Permissões: ADMIN, PASTOR_DISTRITAL, LIDER_DISTRITAL do distrito
    """
    service = HorarioCultoService(db)
    service.deletar_horario(horario_id, current_user)
    return {"message": "Horário deletado com sucesso"}


@router.delete("/igrejas/{igreja_id}/horarios")
def deletar_horarios_igreja(
    igreja_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deleta todos os horários de uma igreja
    
    Permissões: ADMIN, PASTOR_DISTRITAL, LIDER_DISTRITAL do distrito
    """
    service = HorarioCultoService(db)
    count = service.deletar_por_igreja(igreja_id, current_user)
    return {"message": f"{count} horários deletados com sucesso"}
