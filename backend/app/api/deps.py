"""
Dependências comuns da API
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.models.usuario import Usuario, TipoUsuario
from app.repositories.usuario_repository import UsuarioRepository


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Usuario:
    """Obtém usuário atual a partir do token JWT"""
    payload = decode_token(token)
    
    if not payload:
        raise UnauthorizedException("Token inválido ou expirado")
    
    if payload.get("type") != "access":
        raise UnauthorizedException("Token inválido")
    
    user_id = payload.get("user_id")
    repository = UsuarioRepository(db)
    usuario = repository.get_by_id(user_id)
    
    if not usuario:
        raise UnauthorizedException("Usuário não encontrado")
    
    from app.models.usuario import StatusGeral
    if usuario.status != StatusGeral.ATIVO:
        raise UnauthorizedException("Usuário inativo")
    
    return usuario


def get_current_active_user(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """Verifica se usuário está ativo"""
    from app.models.usuario import StatusGeral
    if current_user.status != StatusGeral.ATIVO:
        raise ForbiddenException("Usuário inativo")
    return current_user


def require_admin(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """Requer que usuário seja administrador"""
    if current_user.tipo != TipoUsuario.ADMIN:
        raise ForbiddenException("Acesso restrito a administradores")
    return current_user


def require_pastor(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """Requer que usuário seja pastor ou líder distrital"""
    if current_user.tipo not in [
        TipoUsuario.ADMIN, 
        TipoUsuario.PASTOR_DISTRITAL, 
        TipoUsuario.LIDER_DISTRITAL
    ]:
        raise ForbiddenException("Acesso restrito a pastores")
    return current_user


def require_pregador_cantor(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """Requer que usuário seja pregador ou cantor"""
    if current_user.tipo not in [TipoUsuario.PREGADOR, TipoUsuario.CANTOR]:
        raise ForbiddenException("Acesso restrito a pregadores e cantores")
    return current_user


def require_membro(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """Requer que usuário seja membro"""
    if current_user.tipo != TipoUsuario.MEMBRO:
        raise ForbiddenException("Acesso restrito a membros")
    return current_user
