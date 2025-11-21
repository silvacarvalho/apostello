"""Router: Pregadores"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_pregador, get_current_active_user
from app.models import Usuario, PerfilPregador
from app.schemas.pregador import PregadorResponse, PregadorUpdate

router = APIRouter()

@router.get("/", response_model=List[PregadorResponse])
def listar_pregadores(distrito_id: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    query = db.query(PerfilPregador).join(Usuario).filter(Usuario.ativo == True, PerfilPregador.ativo == True)
    if distrito_id:
        query = query.filter(Usuario.distrito_id == distrito_id)
    pregadores = query.order_by(PerfilPregador.score_medio.desc()).offset(skip).limit(limit).all()
    return pregadores

@router.get("/{usuario_id}", response_model=PregadorResponse)
def obter_pregador(usuario_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    pregador = db.query(PerfilPregador).filter(PerfilPregador.usuario_id == usuario_id).first()
    if not pregador:
        raise HTTPException(status_code=404, detail="Pregador não encontrado")
    return pregador

@router.put("/{usuario_id}", response_model=PregadorResponse)
def atualizar_pregador(usuario_id: str, data: PregadorUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pregador)):
    pregador = db.query(PerfilPregador).filter(PerfilPregador.usuario_id == usuario_id).first()
    if not pregador:
        raise HTTPException(status_code=404, detail="Pregador não encontrado")
    
    # Verificar permissão
    if str(pregador.usuario_id) != str(current_user.id) and not current_user.tem_perfil("pastor_distrital"):
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(pregador, key, value)
    db.commit()
    db.refresh(pregador)
    return pregador
