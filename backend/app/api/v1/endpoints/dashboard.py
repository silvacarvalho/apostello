"""
Endpoints de Dashboard - Estatísticas e métricas
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.usuario import Usuario
from app.models.distrito import Distrito
from app.models.igreja import Igreja
from app.models.escala import Escala
from app.models.item_escala import ItemEscala
from app.models.enums import TipoUsuario, StatusGeral, StatusEscala
from app.api.deps import get_current_user


router = APIRouter()


class DashboardStats(BaseModel):
    """Estatísticas do dashboard"""
    total_pregadores: int
    total_cantores: int
    total_membros: int
    total_igrejas: int
    total_distritos: int
    total_escalas_publicadas: int
    total_usuarios: int
    media_score_pregadores: Optional[float] = None
    media_score_cantores: Optional[float] = None


class DashboardStatsDistrito(BaseModel):
    """Estatísticas do dashboard por distrito"""
    distrito_id: int
    distrito_nome: str
    total_pregadores: int
    total_cantores: int
    total_membros: int
    total_igrejas: int
    total_escalas_publicadas: int


class DashboardResponse(BaseModel):
    """Resposta do dashboard"""
    stats: DashboardStats
    distritos: list[DashboardStatsDistrito] = []


@router.get("/stats", response_model=DashboardResponse)
def obter_estatisticas_dashboard(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtém estatísticas gerais para o dashboard.
    """
    # Contagem de usuários por tipo
    total_pregadores = db.query(func.count(Usuario.id)).filter(
        Usuario.tipo == TipoUsuario.PREGADOR,
        Usuario.status == StatusGeral.ATIVO
    ).scalar() or 0
    
    total_cantores = db.query(func.count(Usuario.id)).filter(
        Usuario.tipo == TipoUsuario.CANTOR,
        Usuario.status == StatusGeral.ATIVO
    ).scalar() or 0
    
    total_membros = db.query(func.count(Usuario.id)).filter(
        Usuario.tipo == TipoUsuario.MEMBRO,
        Usuario.status == StatusGeral.ATIVO
    ).scalar() or 0
    
    total_usuarios = db.query(func.count(Usuario.id)).filter(
        Usuario.status == StatusGeral.ATIVO
    ).scalar() or 0
    
    # Contagem de igrejas e distritos
    total_igrejas = db.query(func.count(Igreja.id)).filter(
        Igreja.status == StatusGeral.ATIVO
    ).scalar() or 0
    
    total_distritos = db.query(func.count(Distrito.id)).filter(
        Distrito.status == StatusGeral.ATIVO
    ).scalar() or 0
    
    # Contagem de escalas publicadas
    total_escalas_publicadas = db.query(func.count(Escala.id)).filter(
        Escala.status == StatusEscala.PUBLICADA
    ).scalar() or 0
    
    # Média de scores
    media_score_pregadores = db.query(func.avg(Usuario.score_atual)).filter(
        Usuario.tipo == TipoUsuario.PREGADOR,
        Usuario.status == StatusGeral.ATIVO,
        Usuario.score_atual.isnot(None)
    ).scalar()
    
    media_score_cantores = db.query(func.avg(Usuario.score_atual)).filter(
        Usuario.tipo == TipoUsuario.CANTOR,
        Usuario.status == StatusGeral.ATIVO,
        Usuario.score_atual.isnot(None)
    ).scalar()
    
    # Estatísticas por distrito
    distritos_stats = []
    distritos = db.query(Distrito).filter(Distrito.status == StatusGeral.ATIVO).all()
    
    for distrito in distritos:
        pregadores_distrito = db.query(func.count(Usuario.id)).filter(
            Usuario.distrito_id == distrito.id,
            Usuario.tipo == TipoUsuario.PREGADOR,
            Usuario.status == StatusGeral.ATIVO
        ).scalar() or 0
        
        cantores_distrito = db.query(func.count(Usuario.id)).filter(
            Usuario.distrito_id == distrito.id,
            Usuario.tipo == TipoUsuario.CANTOR,
            Usuario.status == StatusGeral.ATIVO
        ).scalar() or 0
        
        membros_distrito = db.query(func.count(Usuario.id)).filter(
            Usuario.distrito_id == distrito.id,
            Usuario.tipo == TipoUsuario.MEMBRO,
            Usuario.status == StatusGeral.ATIVO
        ).scalar() or 0
        
        igrejas_distrito = db.query(func.count(Igreja.id)).filter(
            Igreja.distrito_id == distrito.id,
            Igreja.status == StatusGeral.ATIVO
        ).scalar() or 0
        
        escalas_distrito = db.query(func.count(Escala.id)).filter(
            Escala.distrito_id == distrito.id,
            Escala.status == StatusEscala.PUBLICADA
        ).scalar() or 0
        
        distritos_stats.append(DashboardStatsDistrito(
            distrito_id=distrito.id,
            distrito_nome=distrito.nome,
            total_pregadores=pregadores_distrito,
            total_cantores=cantores_distrito,
            total_membros=membros_distrito,
            total_igrejas=igrejas_distrito,
            total_escalas_publicadas=escalas_distrito
        ))
    
    return DashboardResponse(
        stats=DashboardStats(
            total_pregadores=total_pregadores,
            total_cantores=total_cantores,
            total_membros=total_membros,
            total_igrejas=total_igrejas,
            total_distritos=total_distritos,
            total_escalas_publicadas=total_escalas_publicadas,
            total_usuarios=total_usuarios,
            media_score_pregadores=round(float(media_score_pregadores), 2) if media_score_pregadores else None,
            media_score_cantores=round(float(media_score_cantores), 2) if media_score_cantores else None
        ),
        distritos=distritos_stats
    )
