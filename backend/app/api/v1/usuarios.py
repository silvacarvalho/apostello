"""Router: Usuários"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_pastor_distrital, get_current_active_user
from app.models import Usuario
from app.models.usuario import PerfilUsuario, StatusAprovacao
from app.schemas.usuario import UsuarioUpdate, UsuarioResponse

router = APIRouter()

@router.get("/", response_model=List[UsuarioResponse])
def listar_usuarios(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    usuarios = db.query(Usuario).filter(Usuario.ativo == True).offset(skip).limit(limit).all()
    return usuarios

@router.get("/{usuario_id}", response_model=UsuarioResponse)
def obter_usuario(usuario_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return usuario

@router.put("/{usuario_id}", response_model=UsuarioResponse)
def atualizar_usuario(usuario_id: str, data: UsuarioUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar permissão
    if str(usuario.id) != str(current_user.id) and not current_user.tem_perfil(PerfilUsuario.MEMBRO_ASSOCIACAO):
        raise HTTPException(status_code=403, detail="Sem permissão para atualizar este usuário")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(usuario, key, value)
    db.commit()
    db.refresh(usuario)
    return usuario

@router.post("/{usuario_id}/aprovar", response_model=UsuarioResponse)
def aprovar_usuario(usuario_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    usuario.status_aprovacao = StatusAprovacao.APROVADO
    usuario.aprovado_por = current_user.id
    from datetime import datetime
    usuario.aprovado_em = datetime.utcnow()
    db.commit()
    db.refresh(usuario)
    return usuario
