"""
Endpoints de Administração do Sistema
Scheduler, jobs, status do sistema
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuario import Usuario
from app.models.enums import TipoUsuario
from app.api.deps import get_current_user
from app.core.scheduler import get_scheduler_status, executar_job_manualmente
from app.services.lembrete_service import LembreteService


router = APIRouter()


@router.get("/scheduler/status")
def status_scheduler(
    current_user: Usuario = Depends(get_current_user)
):
    """
    Retorna o status do scheduler e seus jobs agendados.
    Apenas administradores podem acessar.
    """
    if current_user.tipo != TipoUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    return get_scheduler_status()


@router.post("/scheduler/executar/{job_id}")
def executar_job(
    job_id: str,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Executa um job manualmente.
    Apenas administradores podem executar.
    """
    if current_user.tipo != TipoUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    if executar_job_manualmente(job_id):
        return {"message": f"Job {job_id} executado com sucesso"}
    
    raise HTTPException(status_code=404, detail=f"Job {job_id} não encontrado")


@router.post("/lembretes/processar")
def processar_lembretes_manual(
    tipo: str = "todos",
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Processa lembretes manualmente.
    tipo: '7d', '3d', '24h' ou 'todos'
    """
    if current_user.tipo not in [TipoUsuario.ADMIN, TipoUsuario.ASSOCIACAO]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    service = LembreteService(db)
    resultados = {}
    
    if tipo in ['7d', 'todos']:
        resultados['7d'] = service.processar_lembretes_7_dias()
    
    if tipo in ['3d', 'todos']:
        resultados['3d'] = service.processar_lembretes_3_dias()
    
    if tipo in ['24h', 'todos']:
        resultados['24h'] = service.processar_lembretes_24_horas()
    
    return {
        "message": "Lembretes processados",
        "enviados": resultados
    }
