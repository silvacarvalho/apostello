"""
Endpoints de Configurações
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user
from app.models.usuario import Usuario
from app.services.configuracao_distrito_service import ConfiguracaoDistritoService
from app.schemas.configuracao_distrito import (
    ConfiguracaoDistritoUpdate,
    ConfiguracaoDistritoResponse
)

router = APIRouter()


@router.get("/distritos/{distrito_id}/configuracoes", response_model=ConfiguracaoDistritoResponse)
def get_configuracao_distrito(
    distrito_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Busca configuração do distrito (cria com valores padrão se não existir)
    
    Permissões: ADMINISTRADOR, PASTOR_DISTRITAL, LIDER_DISTRITAL do distrito
    """
    service = ConfiguracaoDistritoService(db)
    return service.get_configuracao(distrito_id, current_user)


@router.put("/distritos/{distrito_id}/configuracoes", response_model=ConfiguracaoDistritoResponse)
def update_configuracao_distrito(
    distrito_id: int,
    data: ConfiguracaoDistritoUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Atualiza configuração do distrito
    
    Permissões: ADMINISTRADOR, PASTOR_DISTRITAL, LIDER_DISTRITAL do distrito
    """
    service = ConfiguracaoDistritoService(db)
    return service.update_configuracao(distrito_id, data, current_user)
