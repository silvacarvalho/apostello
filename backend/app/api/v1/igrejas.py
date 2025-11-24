"""Router: Igrejas"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.deps import require_gestor_distrital, get_current_active_user
from app.models import Igreja, Usuario
from app.schemas.igreja import IgrejaCreate, IgrejaUpdate, IgrejaResponse

router = APIRouter()

@router.post("/", response_model=IgrejaResponse, status_code=status.HTTP_201_CREATED)
def criar_igreja(data: IgrejaCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_gestor_distrital)):
    nova_igreja = Igreja(**data.dict())
    db.add(nova_igreja)
    db.commit()
    db.refresh(nova_igreja)
    return nova_igreja

@router.get("/", response_model=List[IgrejaResponse])
def listar_igrejas(distrito_id: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    query = db.query(Igreja).options(joinedload(Igreja.distrito)).filter(Igreja.ativo == True)
    
    # Se distrito_id foi passado como parâmetro, usar ele
    if distrito_id:
        query = query.filter(Igreja.distrito_id == distrito_id)
    # Senão, filtrar pelo distrito do usuário logado
    elif current_user.distrito_id:
        query = query.filter(Igreja.distrito_id == current_user.distrito_id)
    # Se usuário tem igreja_id, filtrar pelo distrito dessa igreja
    elif current_user.igreja_id:
        igreja_usuario = db.query(Igreja).filter(Igreja.id == current_user.igreja_id).first()
        if igreja_usuario and igreja_usuario.distrito_id:
            query = query.filter(Igreja.distrito_id == igreja_usuario.distrito_id)
    
    igrejas = query.offset(skip).limit(limit).all()
    return igrejas

@router.get("/{igreja_id}", response_model=IgrejaResponse)
def obter_igreja(igreja_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    igreja = db.query(Igreja).filter(Igreja.id == igreja_id).first()
    if not igreja:
        raise HTTPException(status_code=404, detail="Igreja não encontrada")
    return igreja

@router.put("/{igreja_id}", response_model=IgrejaResponse)
def atualizar_igreja(igreja_id: str, data: IgrejaUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_gestor_distrital)):
    igreja = db.query(Igreja).filter(Igreja.id == igreja_id).first()
    if not igreja:
        raise HTTPException(status_code=404, detail="Igreja não encontrada")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(igreja, key, value)
    db.commit()
    db.refresh(igreja)
    return igreja

@router.delete("/{igreja_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_igreja(igreja_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(require_gestor_distrital)):
    igreja = db.query(Igreja).filter(Igreja.id == igreja_id).first()
    if not igreja:
        raise HTTPException(status_code=404, detail="Igreja não encontrada")
    igreja.ativo = False
    from datetime import datetime
    igreja.excluido_em = datetime.utcnow()
    db.commit()
    return None
