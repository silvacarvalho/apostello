"""Router: Escalas"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_pastor_distrital, get_current_active_user
from app.models import Escala, Usuario
from app.schemas.escala import EscalaCreate, EscalaUpdate, EscalaResponse, EscalaGerarRequest

router = APIRouter()

@router.post("/", response_model=EscalaResponse, status_code=status.HTTP_201_CREATED)
def criar_escala(data: EscalaCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    nova_escala = Escala(**data.dict(), criado_por=current_user.id)
    db.add(nova_escala)
    db.commit()
    db.refresh(nova_escala)
    return nova_escala

@router.post("/gerar", response_model=EscalaResponse, status_code=status.HTTP_201_CREATED)
def gerar_escala_automatica(data: EscalaGerarRequest, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    """Gerar escala automaticamente baseada em score"""
    from app.services.escala_service import gerar_escala_automatica
    escala = gerar_escala_automatica(db, data.distrito_id, data.mes_referencia, data.ano_referencia, current_user.id)
    return escala

@router.get("/", response_model=List[EscalaResponse])
def listar_escalas(distrito_id: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    query = db.query(Escala)
    if distrito_id:
        query = query.filter(Escala.distrito_id == distrito_id)
    escalas = query.order_by(Escala.ano_referencia.desc(), Escala.mes_referencia.desc()).offset(skip).limit(limit).all()
    return escalas

@router.get("/{escala_id}", response_model=EscalaResponse)
def obter_escala(escala_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    escala = db.query(Escala).filter(Escala.id == escala_id).first()
    if not escala:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    return escala

@router.put("/{escala_id}", response_model=EscalaResponse)
def atualizar_escala(escala_id: str, data: EscalaUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    escala = db.query(Escala).filter(Escala.id == escala_id).first()
    if not escala:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(escala, key, value)
    db.commit()
    db.refresh(escala)
    return escala

@router.post("/{escala_id}/aprovar", response_model=EscalaResponse)
def aprovar_escala(escala_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    escala = db.query(Escala).filter(Escala.id == escala_id).first()
    if not escala:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    escala.status = "aprovado"
    escala.aprovado_por = current_user.id
    from datetime import datetime
    escala.aprovado_em = datetime.utcnow()
    db.commit()
    db.refresh(escala)
    return escala

@router.post("/{escala_id}/finalizar", response_model=EscalaResponse)
def finalizar_escala(escala_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    escala = db.query(Escala).filter(Escala.id == escala_id).first()
    if not escala:
        raise HTTPException(status_code=404, detail="Escala não encontrada")
    escala.status = "finalizado"
    escala.finalizado_por = current_user.id
    from datetime import datetime
    escala.finalizado_em = datetime.utcnow()
    db.commit()
    db.refresh(escala)
    
    # TODO: Enviar notificações aos pregadores
    from app.services.notificacao_service import enviar_notificacoes_escala
    enviar_notificacoes_escala(db, escala.id)
    
    return escala
