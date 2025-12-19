"""
Endpoints de Dashboard
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import DashboardResponse
from app.models.usuario import Usuario
from app.api.deps import get_current_user


router = APIRouter()


@router.get("/", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Retorna dados do dashboard baseado no tipo de usuário logado.
    
    - **Admin**: Estatísticas gerais, ranking de pregadores/cantores, escalas por distrito
    - **Pastor**: Estatísticas do distrito, próximos cultos, pendências
    - **Pregador/Cantor**: Score, próximas pregações, avaliações
    - **Membro**: Cultos da igreja, avaliações pendentes
    """
    service = DashboardService(db)
    return service.get_dashboard(current_user)
