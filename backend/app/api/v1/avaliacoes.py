"""Router: Avaliações"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_avaliador, get_current_active_user
from app.models import Avaliacao, Usuario
from app.schemas.avaliacao import AvaliacaoCreate, AvaliacaoResponse

router = APIRouter()

@router.post("/", response_model=AvaliacaoResponse, status_code=status.HTTP_201_CREATED)
def criar_avaliacao(data: AvaliacaoCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_avaliador)):
    # Verificar se já avaliou esta pregação
    existing = db.query(Avaliacao).filter(
        Avaliacao.pregacao_id == data.pregacao_id,
        Avaliacao.avaliador_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Você já avaliou esta pregação")
    
    nova_avaliacao = Avaliacao(**data.dict(), avaliador_id=current_user.id)
    db.add(nova_avaliacao)
    db.commit()
    db.refresh(nova_avaliacao)
    
    # Recalcular score do pregador
    from app.services.pregador_service import recalcular_score
    recalcular_score(db, data.pregador_id)
    
    return nova_avaliacao

@router.get("/", response_model=List[AvaliacaoResponse])
def listar_avaliacoes(pregador_id: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    query = db.query(Avaliacao)
    if pregador_id:
        query = query.filter(Avaliacao.pregador_id == pregador_id)
    avaliacoes = query.offset(skip).limit(limit).all()
    return avaliacoes
