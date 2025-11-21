"""Router: Pregações"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_pastor_distrital, require_pregador, get_current_active_user
from app.models import Pregacao, Usuario
from app.schemas.pregacao import PregacaoCreate, PregacaoUpdate, PregacaoResponse, PregacaoAceitarRecusar

router = APIRouter()

@router.post("/", response_model=PregacaoResponse, status_code=status.HTTP_201_CREATED)
def criar_pregacao(data: PregacaoCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    nova_pregacao = Pregacao(**data.dict())
    db.add(nova_pregacao)
    db.commit()
    db.refresh(nova_pregacao)
    return nova_pregacao

@router.get("/", response_model=List[PregacaoResponse])
def listar_pregacoes(escala_id: str = None, pregador_id: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    query = db.query(Pregacao)
    if escala_id:
        query = query.filter(Pregacao.escala_id == escala_id)
    if pregador_id:
        query = query.filter(Pregacao.pregador_id == pregador_id)
    pregacoes = query.order_by(Pregacao.data_pregacao).offset(skip).limit(limit).all()
    return pregacoes

@router.get("/{pregacao_id}", response_model=PregacaoResponse)
def obter_pregacao(pregacao_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    pregacao = db.query(Pregacao).filter(Pregacao.id == pregacao_id).first()
    if not pregacao:
        raise HTTPException(status_code=404, detail="Pregação não encontrada")
    return pregacao

@router.put("/{pregacao_id}", response_model=PregacaoResponse)
def atualizar_pregacao(pregacao_id: str, data: PregacaoUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    pregacao = db.query(Pregacao).filter(Pregacao.id == pregacao_id).first()
    if not pregacao:
        raise HTTPException(status_code=404, detail="Pregação não encontrada")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(pregacao, key, value)
    db.commit()
    db.refresh(pregacao)
    return pregacao

@router.post("/{pregacao_id}/responder", response_model=PregacaoResponse)
def aceitar_ou_recusar_pregacao(pregacao_id: str, data: PregacaoAceitarRecusar, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pregador)):
    pregacao = db.query(Pregacao).filter(Pregacao.id == pregacao_id).first()
    if not pregacao:
        raise HTTPException(status_code=404, detail="Pregação não encontrada")
    
    if str(pregacao.pregador_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    from datetime import datetime
    if data.aceitar:
        pregacao.status = "aceito"
        pregacao.aceito_em = datetime.utcnow()
    else:
        pregacao.status = "recusado"
        pregacao.recusado_em = datetime.utcnow()
        pregacao.motivo_recusa = data.motivo_recusa
        # Aplicar penalização no score (15%)
        from app.services.pregador_service import aplicar_penalizacao_recusa
        aplicar_penalizacao_recusa(db, current_user.id)
    
    db.commit()
    db.refresh(pregacao)
    return pregacao
