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
from app.api.deps import get_current_user, get_user_distrito_id
from app.core.exceptions import ForbiddenException


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


class UserPersonalStats(BaseModel):
    """Estatísticas pessoais do usuário (pregador/cantor)"""
    score_atual: Optional[float] = None
    participacoes_mes: int = 0
    participacoes_total: int = 0
    faltas: int = 0
    desmarcacoes: int = 0
    proximas_escalas: int = 0


class DashboardPregadorCantorResponse(BaseModel):
    """Dashboard para pregadores e cantores"""
    personal_stats: UserPersonalStats
    distrito_stats: DashboardStatsDistrito


@router.get("/stats", response_model=DashboardResponse | DashboardPregadorCantorResponse)
def obter_estatisticas_dashboard(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtém estatísticas para o dashboard baseadas no tipo de usuário.
    
    - ADMIN: Vê estatísticas gerais de todos os distritos
    - PASTOR/LIDER: Vê estatísticas apenas do seu distrito
    - PREGADOR/CANTOR: Vê suas estatísticas pessoais + estatísticas do distrito (sem dados individuais)
    - MEMBRO: Não tem acesso ao dashboard (deve usar /escalas)
    """
    
    # Membros não devem acessar dashboard
    if current_user.tipo == TipoUsuario.MEMBRO:
        raise ForbiddenException("Membros não têm acesso ao dashboard. Use a página de escalas.")
    
    # PREGADORES E CANTORES: Dashboard personalizado
    if current_user.tipo in [TipoUsuario.PREGADOR, TipoUsuario.CANTOR]:
        return _get_pregador_cantor_dashboard(db, current_user)
    
    # ADMIN, PASTOR, LIDER: Dashboard completo
    return _get_admin_pastor_dashboard(db, current_user)


def _get_pregador_cantor_dashboard(
    db: Session,
    current_user: Usuario
) -> DashboardPregadorCantorResponse:
    """Retorna dashboard personalizado para pregadores e cantores"""
    from datetime import datetime, timezone
    
    # Estatísticas pessoais do usuário
    personal_stats = UserPersonalStats(
        score_atual=float(current_user.score_atual) if current_user.score_atual else None,
        participacoes_mes=current_user.contador_mes_atual or 0,
        participacoes_total=current_user.contador_total_participacoes or 0,
        faltas=current_user.contador_faltas or 0,
        desmarcacoes=current_user.contador_desmarcacoes or 0
    )
    
    # Contar próximas escalas (futuras)
    now = datetime.now(timezone.utc).date()
    if current_user.tipo == TipoUsuario.PREGADOR:
        proximas = db.query(func.count(ItemEscala.id)).filter(
            ItemEscala.pregador_id == current_user.id,
            ItemEscala.data_culto >= now
        ).scalar() or 0
    else:  # CANTOR
        proximas = db.query(func.count(ItemEscala.id)).filter(
            ItemEscala.cantor_id == current_user.id,
            ItemEscala.data_culto >= now
        ).scalar() or 0
    
    personal_stats.proximas_escalas = proximas
    
    # Estatísticas do distrito (SEM dados individuais de outros usuários)
    user_distrito_id = get_user_distrito_id(current_user)
    
    if not user_distrito_id:
        raise ForbiddenException("Usuário sem distrito associado")
    
    distrito = db.query(Distrito).filter(Distrito.id == user_distrito_id).first()
    
    if not distrito:
        raise ForbiddenException("Distrito não encontrado")
    
    # Estatísticas agregadas do distrito
    total_pregadores = db.query(func.count(Usuario.id)).filter(
        Usuario.distrito_id == user_distrito_id,
        Usuario.tipo == TipoUsuario.PREGADOR,
        Usuario.status == StatusGeral.ATIVO,
        Usuario.email != "master@iasd.com"
    ).scalar() or 0
    
    total_cantores = db.query(func.count(Usuario.id)).filter(
        Usuario.distrito_id == user_distrito_id,
        Usuario.tipo == TipoUsuario.CANTOR,
        Usuario.status == StatusGeral.ATIVO,
        Usuario.email != "master@iasd.com"
    ).scalar() or 0
    
    total_membros = db.query(func.count(Usuario.id)).join(Igreja).filter(
        Igreja.distrito_id == user_distrito_id,
        Usuario.tipo == TipoUsuario.MEMBRO,
        Usuario.status == StatusGeral.ATIVO,
        Usuario.email != "master@iasd.com"
    ).scalar() or 0
    
    total_igrejas = db.query(func.count(Igreja.id)).filter(
        Igreja.distrito_id == user_distrito_id,
        Igreja.status == StatusGeral.ATIVO
    ).scalar() or 0
    
    total_escalas = db.query(func.count(Escala.id)).filter(
        Escala.distrito_id == user_distrito_id,
        Escala.status == StatusEscala.PUBLICADA
    ).scalar() or 0
    
    distrito_stats = DashboardStatsDistrito(
        distrito_id=distrito.id,
        distrito_nome=distrito.nome,
        total_pregadores=total_pregadores,
        total_cantores=total_cantores,
        total_membros=total_membros,
        total_igrejas=total_igrejas,
        total_escalas_publicadas=total_escalas
    )
    
    return DashboardPregadorCantorResponse(
        personal_stats=personal_stats,
        distrito_stats=distrito_stats
    )


def _get_admin_pastor_dashboard(
    db: Session,
    current_user: Usuario
) -> DashboardResponse:
    """Retorna dashboard completo para admin, pastor e líder distrital"""
    
    user_distrito_id = get_user_distrito_id(current_user)
    
    # Construir filtros baseados no tipo de usuário
    # ADMIN: sem filtro (vê tudo)
    # PASTOR/LIDER: apenas seu distrito
    
    # Contagem de usuários por tipo
    query_pregadores = db.query(func.count(Usuario.id)).filter(
        Usuario.tipo == TipoUsuario.PREGADOR,
        Usuario.status == StatusGeral.ATIVO,
        Usuario.email != "master@iasd.com"
    )
    if user_distrito_id:
        query_pregadores = query_pregadores.filter(Usuario.distrito_id == user_distrito_id)
    total_pregadores = query_pregadores.scalar() or 0
    
    query_cantores = db.query(func.count(Usuario.id)).filter(
        Usuario.tipo == TipoUsuario.CANTOR,
        Usuario.status == StatusGeral.ATIVO,
        Usuario.email != "master@iasd.com"
    )
    if user_distrito_id:
        query_cantores = query_cantores.filter(Usuario.distrito_id == user_distrito_id)
    total_cantores = query_cantores.scalar() or 0
    
    query_membros = db.query(func.count(Usuario.id)).filter(
        Usuario.tipo == TipoUsuario.MEMBRO,
        Usuario.status == StatusGeral.ATIVO,
        Usuario.email != "master@iasd.com"
    )
    if user_distrito_id:
        query_membros = query_membros.join(Igreja).filter(Igreja.distrito_id == user_distrito_id)
    total_membros = query_membros.scalar() or 0
    
    query_usuarios = db.query(func.count(Usuario.id)).filter(
        Usuario.status == StatusGeral.ATIVO,
        Usuario.email != "master@iasd.com"
    )
    if user_distrito_id:
        # Para contar todos os usuários do distrito
        query_usuarios = query_usuarios.filter(
            (Usuario.distrito_id == user_distrito_id) |
            (Usuario.igreja_id.in_(
                db.query(Igreja.id).filter(Igreja.distrito_id == user_distrito_id)
            ))
        )
    total_usuarios = query_usuarios.scalar() or 0
    
    # Contagem de igrejas
    query_igrejas = db.query(func.count(Igreja.id)).filter(Igreja.status == StatusGeral.ATIVO)
    if user_distrito_id:
        query_igrejas = query_igrejas.filter(Igreja.distrito_id == user_distrito_id)
    total_igrejas = query_igrejas.scalar() or 0
    
    # Contagem de distritos
    if user_distrito_id:
        total_distritos = 1  # Pastor vê apenas 1 distrito (o seu)
    else:
        total_distritos = db.query(func.count(Distrito.id)).filter(
            Distrito.status == StatusGeral.ATIVO
        ).scalar() or 0
    
    # Contagem de escalas publicadas
    query_escalas = db.query(func.count(Escala.id)).filter(Escala.status == StatusEscala.PUBLICADA)
    if user_distrito_id:
        query_escalas = query_escalas.filter(Escala.distrito_id == user_distrito_id)
    total_escalas_publicadas = query_escalas.scalar() or 0
    
    # Média de scores
    query_score_pregadores = db.query(func.avg(Usuario.score_atual)).filter(
        Usuario.tipo == TipoUsuario.PREGADOR,
        Usuario.status == StatusGeral.ATIVO,
        Usuario.score_atual.isnot(None),
        Usuario.email != "master@iasd.com"
    )
    if user_distrito_id:
        query_score_pregadores = query_score_pregadores.filter(Usuario.distrito_id == user_distrito_id)
    media_score_pregadores = query_score_pregadores.scalar()
    
    query_score_cantores = db.query(func.avg(Usuario.score_atual)).filter(
        Usuario.tipo == TipoUsuario.CANTOR,
        Usuario.status == StatusGeral.ATIVO,
        Usuario.score_atual.isnot(None),
        Usuario.email != "master@iasd.com"
    )
    if user_distrito_id:
        query_score_cantores = query_score_cantores.filter(Usuario.distrito_id == user_distrito_id)
    media_score_cantores = query_score_cantores.scalar()
    
    # Estatísticas por distrito
    distritos_stats = []
    
    if user_distrito_id:
        # Pastor/Líder vê apenas seu distrito
        distritos = db.query(Distrito).filter(
            Distrito.id == user_distrito_id,
            Distrito.status == StatusGeral.ATIVO
        ).all()
    else:
        # Admin vê todos os distritos
        distritos = db.query(Distrito).filter(Distrito.status == StatusGeral.ATIVO).all()
    
    for distrito in distritos:
        pregadores_distrito = db.query(func.count(Usuario.id)).filter(
            Usuario.distrito_id == distrito.id,
            Usuario.tipo == TipoUsuario.PREGADOR,
            Usuario.status == StatusGeral.ATIVO,
            Usuario.email != "master@iasd.com"
        ).scalar() or 0
        
        cantores_distrito = db.query(func.count(Usuario.id)).filter(
            Usuario.distrito_id == distrito.id,
            Usuario.tipo == TipoUsuario.CANTOR,
            Usuario.status == StatusGeral.ATIVO,
            Usuario.email != "master@iasd.com"
        ).scalar() or 0
        
        membros_distrito = db.query(func.count(Usuario.id)).join(Igreja).filter(
            Igreja.distrito_id == distrito.id,
            Usuario.tipo == TipoUsuario.MEMBRO,
            Usuario.status == StatusGeral.ATIVO,
            Usuario.email != "master@iasd.com"
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
