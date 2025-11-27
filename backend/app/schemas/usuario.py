"""
Schemas: Usuario
"""

from typing import Optional, List, Any
from datetime import datetime, date
from pydantic import BaseModel, EmailStr, Field, UUID4, field_validator


class UsuarioBase(BaseModel):
    """Base schema para Usuário"""
    email: EmailStr
    nome_completo: str = Field(..., min_length=1, max_length=200)
    telefone: Optional[str] = Field(None, max_length=20)
    whatsapp: Optional[str] = Field(None, max_length=20)
    cpf: Optional[str] = Field(None, max_length=14)
    data_nascimento: Optional[date] = None
    genero: Optional[str] = Field(None, max_length=20)
    url_foto: Optional[str] = None


class UsuarioCreate(UsuarioBase):
    """Schema para criar Usuário"""
    senha: str = Field(..., min_length=6)
    distrito_id: Optional[UUID4] = None
    igreja_id: Optional[UUID4] = None
    perfis: List[str] = Field(default=["pregador"])


class UsuarioUpdate(BaseModel):
    """Schema para atualizar Usuário"""
    email: Optional[EmailStr] = None
    nome_completo: Optional[str] = Field(None, min_length=1, max_length=200)
    telefone: Optional[str] = Field(None, max_length=20)
    whatsapp: Optional[str] = Field(None, max_length=20)
    cpf: Optional[str] = Field(None, max_length=14)
    data_nascimento: Optional[date] = None
    genero: Optional[str] = Field(None, max_length=20)
    url_foto: Optional[str] = None
    perfis: Optional[List[str]] = None
    notif_whatsapp: Optional[bool] = None
    notif_sms: Optional[bool] = None
    notif_push: Optional[bool] = None
    notif_email: Optional[bool] = None


class UsuarioResponse(UsuarioBase):
    """Schema de resposta para Usuário"""
    id: UUID4
    codigo: int
    associacao_id: Optional[UUID4] = None
    distrito_id: Optional[UUID4] = None
    igreja_id: Optional[UUID4] = None
    perfis: List[str]
    status_aprovacao: str
    ativo: bool
    notif_whatsapp: bool
    notif_sms: bool
    notif_push: bool
    notif_email: bool
    criado_em: datetime
    atualizado_em: datetime

    @field_validator('perfis', mode='before')
    @classmethod
    def convert_perfis_to_strings(cls, v: Any) -> List[str]:
        """Converte enums de perfil para strings"""
        if not v:
            return []
        return [item.value if hasattr(item, 'value') else item for item in v]
    
    @field_validator('status_aprovacao', mode='before')
    @classmethod
    def convert_status_to_string(cls, v: Any) -> str:
        """Converte enum de status para string"""
        return v.value if hasattr(v, 'value') else v

    class Config:
        from_attributes = True


class UsuarioLogin(BaseModel):
    """Schema para login"""
    email: EmailStr
    senha: str


class Token(BaseModel):
    """Schema para token JWT"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema para dados do token"""
    user_id: Optional[str] = None
