"""
Serviço de Autenticação
"""
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.core.security import (
    verify_password, get_password_hash, 
    create_tokens, decode_token, Token
)
from app.core.exceptions import UnauthorizedException, BadRequestException
from app.repositories.usuario_repository import UsuarioRepository
from app.models.usuario import Usuario, StatusGeral, StatusAprovacao


class AuthService:
    """Serviço de autenticação e autorização"""

    def __init__(self, db: Session):
        self.db = db
        self.repository = UsuarioRepository(db)

    def authenticate(self, email: str, password: str) -> Token:
        """Autentica usuário e retorna tokens JWT"""
        usuario = self.repository.get_by_email(email)
        
        if not usuario:
            raise UnauthorizedException("Email ou senha inválidos")
        
        if not verify_password(password, usuario.senha_hash):
            raise UnauthorizedException("Email ou senha inválidos")
        
        if usuario.status != StatusGeral.ATIVO:
            raise UnauthorizedException("Usuário inativo")
        
        if usuario.status_aprovacao != StatusAprovacao.APROVADO:
            raise UnauthorizedException("Cadastro pendente de aprovação")
        
        # Atualizar último login
        self.repository.update_ultimo_login(usuario.id)
        
        # Criar tokens
        token_data = {
            "user_id": usuario.id,
            "email": usuario.email,
            "tipo": usuario.tipo.value,
            "distrito_id": usuario.distrito_id,
            "igreja_id": usuario.igreja_id
        }
        
        return create_tokens(token_data)

    def refresh_token(self, refresh_token: str) -> Token:
        """Renova tokens usando refresh token"""
        payload = decode_token(refresh_token)
        
        if not payload:
            raise UnauthorizedException("Token inválido")
        
        if payload.get("type") != "refresh":
            raise UnauthorizedException("Token inválido")
        
        user_id = payload.get("user_id")
        usuario = self.repository.get_by_id(user_id)
        
        if not usuario or usuario.status != StatusGeral.ATIVO:
            raise UnauthorizedException("Usuário inválido")
        
        token_data = {
            "user_id": usuario.id,
            "email": usuario.email,
            "tipo": usuario.tipo.value,
            "distrito_id": usuario.distrito_id,
            "igreja_id": usuario.igreja_id
        }
        
        return create_tokens(token_data)

    def get_current_user(self, token: str) -> Usuario:
        """Obtém usuário atual a partir do token"""
        payload = decode_token(token)
        
        if not payload:
            raise UnauthorizedException("Token inválido")
        
        if payload.get("type") != "access":
            raise UnauthorizedException("Token inválido")
        
        user_id = payload.get("user_id")
        usuario = self.repository.get_by_id(user_id)
        
        if not usuario:
            raise UnauthorizedException("Usuário não encontrado")
        
        if usuario.status != StatusGeral.ATIVO:
            raise UnauthorizedException("Usuário inativo")
        
        return usuario

    def change_password(
        self, 
        user_id: int, 
        senha_atual: str, 
        nova_senha: str
    ) -> bool:
        """Altera senha do usuário"""
        usuario = self.repository.get_by_id(user_id)
        
        if not usuario:
            raise BadRequestException("Usuário não encontrado")
        
        if not verify_password(senha_atual, usuario.senha_hash):
            raise BadRequestException("Senha atual incorreta")
        
        usuario.senha_hash = get_password_hash(nova_senha)
        self.db.commit()
        
        return True

    def reset_password(self, email: str) -> str:
        """Inicia processo de reset de senha"""
        usuario = self.repository.get_by_email(email)
        
        if not usuario:
            # Por segurança, não revelamos se o email existe
            return "Se o email existir, você receberá instruções"
        
        # TODO: Implementar envio de email com token de reset
        # Por agora, retornamos mensagem genérica
        
        return "Se o email existir, você receberá instruções"
