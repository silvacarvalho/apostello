"""
Router: Autenticação
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.models import Usuario
from app.schemas.usuario import Token, UsuarioCreate, UsuarioResponse
from app.core.deps import get_current_active_user

router = APIRouter()


@router.post("/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def register(usuario_data: UsuarioCreate, db: Session = Depends(get_db)):
    """Registro de novo usuário (auto-cadastro)"""
    
    # Verificar se email já existe
    existing_user = db.query(Usuario).filter(Usuario.email == usuario_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )
    
    # Verificar se CPF já existe
    if usuario_data.cpf:
        existing_cpf = db.query(Usuario).filter(Usuario.cpf == usuario_data.cpf).first()
        if existing_cpf:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CPF já cadastrado"
            )
    
    # Criar usuário
    from app.core.security import get_password_hash
    
    novo_usuario = Usuario(
        email=usuario_data.email,
        senha_hash=get_password_hash(usuario_data.senha),
        nome_completo=usuario_data.nome_completo,
        telefone=usuario_data.telefone,
        whatsapp=usuario_data.whatsapp,
        cpf=usuario_data.cpf,
        data_nascimento=usuario_data.data_nascimento,
        genero=usuario_data.genero,
        distrito_id=usuario_data.distrito_id,
        igreja_id=usuario_data.igreja_id,
        perfis=usuario_data.perfis,
        status_aprovacao="pendente"
    )
    
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    
    return novo_usuario


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login de usuário"""
    
    # Buscar usuário
    usuario = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    
    if not usuario or not verify_password(form_data.password, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not usuario.ativo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário inativo"
        )
    
    if usuario.status_aprovacao != "aprovado":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário aguardando aprovação"
        )
    
    # Atualizar último login
    from datetime import datetime
    usuario.ultimo_login_em = datetime.utcnow()
    db.commit()
    
    # Criar tokens
    access_token = create_access_token(data={"sub": str(usuario.id)})
    refresh_token = create_refresh_token(data={"sub": str(usuario.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UsuarioResponse)
def get_current_user_info(current_user: Usuario = Depends(get_current_active_user)):
    """Obter informações do usuário autenticado"""
    return current_user
