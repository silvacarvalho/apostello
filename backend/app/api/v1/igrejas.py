"""Router: Igrejas"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_pastor_distrital, get_current_active_user
from app.models import Igreja, Usuario
from app.schemas.igreja import IgrejaCreate, IgrejaUpdate, IgrejaResponse

router = APIRouter()

@router.post("/", response_model=IgrejaResponse, status_code=status.HTTP_201_CREATED)
def criar_igreja(data: IgrejaCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    nova_igreja = Igreja(**data.dict())
    db.add(nova_igreja)
    db.commit()
    db.refresh(nova_igreja)
    return nova_igreja

@router.get("/", response_model=List[IgrejaResponse])
def listar_igrejas(distrito_id: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    query = db.query(Igreja).filter(Igreja.ativo == True)
    if distrito_id:
        query = query.filter(Igreja.distrito_id == distrito_id)
    igrejas = query.offset(skip).limit(limit).all()
    return igrejas

@router.get("/{igreja_id}", response_model=IgrejaResponse)
def obter_igreja(igreja_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    igreja = db.query(Igreja).filter(Igreja.id == igreja_id).first()
    if not igreja:
        raise HTTPException(status_code=404, detail="Igreja não encontrada")
    return igreja

@router.put("/{igreja_id}", response_model=IgrejaResponse)
def atualizar_igreja(igreja_id: str, data: IgrejaUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    igreja = db.query(Igreja).filter(Igreja.id == igreja_id).first()
    if not igreja:
        raise HTTPException(status_code=404, detail="Igreja não encontrada")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(igreja, key, value)
    db.commit()
    db.refresh(igreja)
    return igreja

@router.delete("/{igreja_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_igreja(igreja_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    igreja = db.query(Igreja).filter(Igreja.id == igreja_id).first()
    if not igreja:
        raise HTTPException(status_code=404, detail="Igreja não encontrada")
    igreja.ativo = False
    from datetime import datetime
    igreja.excluido_em = datetime.utcnow()
    db.commit()
    return None
