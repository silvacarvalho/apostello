"""Router: Trocas de Escala"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_pregador, get_current_active_user
from app.models import TrocaEscala, Usuario, Pregacao
from app.schemas.troca import TrocaCreate, TrocaResponse, TrocaAceitarRejeitar

router = APIRouter()

@router.post("/", response_model=TrocaResponse, status_code=status.HTTP_201_CREATED)
def solicitar_troca(data: TrocaCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pregador)):
    # Verificar se as pregações existem
    pregacao_sol = db.query(Pregacao).filter(Pregacao.id == data.pregacao_solicitante_id).first()
    pregacao_dest = db.query(Pregacao).filter(Pregacao.id == data.pregacao_destinatario_id).first()
    if not pregacao_sol or not pregacao_dest:
        raise HTTPException(status_code=404, detail="Pregação não encontrada")
    
    # Verificar se é pregador da pregação solicitante
    if str(pregacao_sol.pregador_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Você não é o pregador desta pregação")
    
    nova_troca = TrocaEscala(
        pregacao_solicitante_id=data.pregacao_solicitante_id,
        usuario_solicitante_id=current_user.id,
        pregacao_destinatario_id=data.pregacao_destinatario_id,
        usuario_destinatario_id=pregacao_dest.pregador_id,
        motivo_solicitante=data.motivo_solicitante,
        status="pendente_destinatario"
    )
    db.add(nova_troca)
    db.commit()
    db.refresh(nova_troca)
    
    # TODO: Enviar notificação ao destinatário
    from app.services.notificacao_service import enviar_notificacao_troca
    enviar_notificacao_troca(db, nova_troca.id)
    
    return nova_troca

@router.get("/", response_model=List[TrocaResponse])
def listar_trocas(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    trocas = db.query(TrocaEscala).filter(
        (TrocaEscala.usuario_solicitante_id == current_user.id) | 
        (TrocaEscala.usuario_destinatario_id == current_user.id)
    ).order_by(TrocaEscala.criado_em.desc()).offset(skip).limit(limit).all()
    return trocas

@router.post("/{troca_id}/responder", response_model=TrocaResponse)
def responder_troca(troca_id: str, data: TrocaAceitarRejeitar, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pregador)):
    troca = db.query(TrocaEscala).filter(TrocaEscala.id == troca_id).first()
    if not troca:
        raise HTTPException(status_code=404, detail="Troca não encontrada")
    
    # Verificar se é o destinatário
    if str(troca.usuario_destinatario_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Você não pode responder esta troca")
    
    from datetime import datetime
    if data.aceitar:
        troca.status = "aceita"
        troca.aceito_destinatario_em = datetime.utcnow()
        troca.concluido_em = datetime.utcnow()
        
        # Executar troca automaticamente
        from app.services.escala_service import executar_troca_automatica
        executar_troca_automatica(db, troca.id)
    else:
        troca.status = "rejeitada"
        troca.rejeitado_em = datetime.utcnow()
        troca.motivo_rejeicao = data.motivo_rejeicao
        troca.rejeitado_por = current_user.id
    
    db.commit()
    db.refresh(troca)
    return troca
