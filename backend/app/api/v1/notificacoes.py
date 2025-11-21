"""Router: Notificações"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models import Notificacao, Usuario
from app.schemas.notificacao import NotificacaoResponse

router = APIRouter()

@router.get("/", response_model=List[NotificacaoResponse])
def listar_minhas_notificacoes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    notificacoes = db.query(Notificacao).filter(Notificacao.usuario_id == current_user.id).order_by(Notificacao.criado_em.desc()).offset(skip).limit(limit).all()
    return notificacoes

@router.post("/{notificacao_id}/marcar-lida", response_model=NotificacaoResponse)
def marcar_como_lida(notificacao_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    notificacao = db.query(Notificacao).filter(Notificacao.id == notificacao_id, Notificacao.usuario_id == current_user.id).first()
    if not notificacao:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    from datetime import datetime
    notificacao.lido_em = datetime.utcnow()
    notificacao.status = "lido"
    db.commit()
    db.refresh(notificacao)
    return notificacao
