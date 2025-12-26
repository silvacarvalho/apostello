"""
Schemas de Autenticação
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class Token(BaseModel):
    """Resposta de token JWT"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 3600  # Tempo em segundos até expiração do access_token


class TokenData(BaseModel):
    """Dados extraídos do token JWT"""
    user_id: int
    email: str
    tipo: str
    distrito_id: Optional[int] = None
    igreja_id: Optional[int] = None


class LoginRequest(BaseModel):
    """Request de login"""
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    """Request de refresh token"""
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    """Request para solicitar reset de senha"""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Request para resetar senha com token"""
    token: str
    nova_senha: str = Field(..., min_length=6, max_length=100)


class ForgotPasswordResponse(BaseModel):
    """Resposta do pedido de reset de senha"""
    message: str
    success: bool = True


class ResetPasswordResponse(BaseModel):
    """Resposta do reset de senha"""
    message: str
    success: bool = True
