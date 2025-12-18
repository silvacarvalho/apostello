"""
Endpoints de Autenticação
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import Token, LoginRequest, RefreshTokenRequest
from app.schemas.usuario import UsuarioChangePassword
from app.api.deps import get_current_user
from app.models.usuario import Usuario


router = APIRouter()


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login com email e senha.
    Retorna access_token e refresh_token.
    """
    auth_service = AuthService(db)
    return auth_service.authenticate(form_data.username, form_data.password)


@router.post("/login/json", response_model=Token)
def login_json(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login com JSON (alternativa ao form).
    """
    auth_service = AuthService(db)
    return auth_service.authenticate(login_data.email, login_data.password)


@router.post("/refresh", response_model=Token)
def refresh_token(
    data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Renova tokens usando refresh_token.
    """
    auth_service = AuthService(db)
    return auth_service.refresh_token(data.refresh_token)


@router.post("/change-password")
def change_password(
    data: UsuarioChangePassword,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Altera senha do usuário logado.
    """
    auth_service = AuthService(db)
    auth_service.change_password(
        current_user.id,
        data.senha_atual,
        data.nova_senha
    )
    return {"message": "Senha alterada com sucesso"}


@router.get("/me")
def get_me(current_user: Usuario = Depends(get_current_user)):
    """
    Retorna dados do usuário logado.
    """
    return {
        "id": current_user.id,
        "nome_completo": current_user.nome_completo,
        "email": current_user.email,
        "tipo": current_user.tipo.value,
        "distrito_id": current_user.distrito_id,
        "igreja_id": current_user.igreja_id,
        "foto_url": current_user.foto_url,
        "score_atual": float(current_user.score_atual) if current_user.score_atual else None
    }
