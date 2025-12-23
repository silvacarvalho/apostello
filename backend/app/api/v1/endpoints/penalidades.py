"""
Endpoint para marcar falta e aplicar penalidade
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuario import Usuario
from app.models.item_escala import ItemEscala, StatusRealizacao
from app.models.escala import Escala
from app.services.penalidade_service import PenalidadeService
from app.api.deps import require_pastor
from app.core.exceptions import NotFoundException, BadRequestException

router = APIRouter()


@router.post("/itens/{item_id}/marcar-falta-pregador")
def marcar_falta_pregador(
    item_id: int,
    motivo: str = "Falta sem aviso prévio",
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Marca que o pregador faltou e aplica penalidade de -15 pontos
    """
    # Buscar item
    item = db.query(ItemEscala).filter(ItemEscala.id == item_id).first()
    if not item:
        raise NotFoundException("Item de escala não encontrado")
    
    if not item.pregador_id:
        raise BadRequestException("Este item não tem pregador escalado")
    
    # Verificar se culto foi realizado
    if item.status_realizacao != StatusRealizacao.REALIZADO:
        raise BadRequestException("O culto ainda não foi marcado como realizado")
    
    # Aplicar penalidade
    penalidade_service = PenalidadeService(db)
    penalidade = penalidade_service.aplicar_penalidade_falta_sem_aviso(
        usuario_id=item.pregador_id,
        pastor_id=current_user.id,
        item_escala_id=item.id,
        motivo=motivo
    )
    
    return {
        "message": "Falta registrada e penalidade aplicada",
        "penalidade_id": penalidade.id,
        "pontos_subtraidos": float(penalidade.valor_subtracao)
    }


@router.post("/itens/{item_id}/marcar-falta-cantor")
def marcar_falta_cantor(
    item_id: int,
    motivo: str = "Falta sem aviso prévio",
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Marca que o cantor faltou e aplica penalidade de -15 pontos
    """
    # Buscar item
    item = db.query(ItemEscala).filter(ItemEscala.id == item_id).first()
    if not item:
        raise NotFoundException("Item de escala não encontrado")
    
    if not item.cantor_id:
        raise BadRequestException("Este item não tem cantor escalado")
    
    # Verificar se culto foi realizado
    if item.status_realizacao != StatusRealizacao.REALIZADO:
        raise BadRequestException("O culto ainda não foi marcado como realizado")
    
    # Aplicar penalidade
    penalidade_service = PenalidadeService(db)
    penalidade = penalidade_service.aplicar_penalidade_falta_sem_aviso(
        usuario_id=item.cantor_id,
        pastor_id=current_user.id,
        item_escala_id=item.id,
        motivo=motivo
    )
    
    return {
        "message": "Falta registrada e penalidade aplicada",
        "penalidade_id": penalidade.id,
        "pontos_subtraidos": float(penalidade.valor_subtracao)
    }
