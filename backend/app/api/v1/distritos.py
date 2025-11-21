"""Router: Distritos"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_pastor_distrital, get_current_active_user
from app.models import Distrito, Usuario
from app.schemas.distrito import DistritoCreate, DistritoUpdate, DistritoResponse

router = APIRouter()

@router.post("/", response_model=DistritoResponse, status_code=status.HTTP_201_CREATED)
def criar_distrito(data: DistritoCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    novo_distrito = Distrito(**data.dict())
    db.add(novo_distrito)
    db.commit()
    db.refresh(novo_distrito)
    return novo_distrito

@router.get("/", response_model=List[DistritoResponse])
def listar_distritos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    distritos = db.query(Distrito).filter(Distrito.ativo == True).offset(skip).limit(limit).all()
    return distritos

@router.get("/{distrito_id}", response_model=DistritoResponse)
def obter_distrito(distrito_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    distrito = db.query(Distrito).filter(Distrito.id == distrito_id).first()
    if not distrito:
        raise HTTPException(status_code=404, detail="Distrito não encontrado")
    return distrito

@router.put("/{distrito_id}", response_model=DistritoResponse)
def atualizar_distrito(distrito_id: str, data: DistritoUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    distrito = db.query(Distrito).filter(Distrito.id == distrito_id).first()
    if not distrito:
        raise HTTPException(status_code=404, detail="Distrito não encontrado")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(distrito, key, value)
    db.commit()
    db.refresh(distrito)
    return distrito

@router.delete("/{distrito_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_distrito(distrito_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    distrito = db.query(Distrito).filter(Distrito.id == distrito_id).first()
    if not distrito:
        raise HTTPException(status_code=404, detail="Distrito não encontrado")
    distrito.ativo = False
    from datetime import datetime
    distrito.excluido_em = datetime.utcnow()
    db.commit()
    return None
