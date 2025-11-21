"""Router: Temáticas"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_membro_associacao, get_current_active_user
from app.models import Tematica, Usuario
from app.schemas.tematica import TematicaCreate, TematicaUpdate, TematicaResponse

router = APIRouter()

@router.post("/", response_model=TematicaResponse, status_code=status.HTTP_201_CREATED)
def criar_tematica(data: TematicaCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_membro_associacao)):
    nova_tematica = Tematica(**data.dict(), criado_por=current_user.id)
    db.add(nova_tematica)
    db.commit()
    db.refresh(nova_tematica)
    return nova_tematica

@router.get("/", response_model=List[TematicaResponse])
def listar_tematicas(associacao_id: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    query = db.query(Tematica).filter(Tematica.ativo == True)
    if associacao_id:
        query = query.filter(Tematica.associacao_id == associacao_id)
    tematicas = query.offset(skip).limit(limit).all()
    return tematicas

@router.get("/{tematica_id}", response_model=TematicaResponse)
def obter_tematica(tematica_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    tematica = db.query(Tematica).filter(Tematica.id == tematica_id).first()
    if not tematica:
        raise HTTPException(status_code=404, detail="Temática não encontrada")
    return tematica

@router.put("/{tematica_id}", response_model=TematicaResponse)
def atualizar_tematica(tematica_id: str, data: TematicaUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_membro_associacao)):
    tematica = db.query(Tematica).filter(Tematica.id == tematica_id).first()
    if not tematica:
        raise HTTPException(status_code=404, detail="Temática não encontrada")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(tematica, key, value)
    db.commit()
    db.refresh(tematica)
    return tematica
