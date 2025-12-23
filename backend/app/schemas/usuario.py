"""
Schemas de Usuário
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
import re

from app.models.usuario import TipoUsuario, StatusGeral, StatusAprovacao


class UsuarioBase(BaseModel):
    """Schema base de usuário"""
    nome_completo: str = Field(..., min_length=3, max_length=255)
    email: EmailStr
    cpf: str = Field(..., min_length=11, max_length=14)
    telefone: Optional[str] = Field(None, max_length=20)
    whatsapp: Optional[str] = Field(None, max_length=20)
    data_nascimento: Optional[date] = None
    foto_url: Optional[str] = None
    tipo: TipoUsuario
    distrito_id: Optional[int] = None
    igreja_id: Optional[int] = None
    pode_pregar: bool = False
    pode_cantar: bool = False

    @validator('cpf')
    def validate_cpf(cls, v):
        """Remove formatação e valida CPF com dígito verificador"""
        cpf = re.sub(r'[^\d]', '', v)
        if len(cpf) != 11:
            raise ValueError('CPF deve ter 11 dígitos')
        
        # Verifica CPFs inválidos conhecidos (todos dígitos iguais)
        if cpf == cpf[0] * 11:
            raise ValueError('CPF inválido')
        
        # Calcula primeiro dígito verificador
        soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
        d1 = (soma * 10 % 11) % 10
        
        # Calcula segundo dígito verificador
        soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
        d2 = (soma * 10 % 11) % 10
        
        if cpf[-2:] != f"{d1}{d2}":
            raise ValueError('CPF inválido')
        
        return cpf

    @validator('telefone', 'whatsapp')
    def validate_phone(cls, v):
        """Remove formatação do telefone"""
        if v:
            return re.sub(r'[^\d]', '', v)
        return v


class UsuarioCreate(UsuarioBase):
    """Schema para criação de usuário"""
    senha: str = Field(..., min_length=8, max_length=100)

    @validator('senha')
    def validate_password(cls, v):
        """Valida força da senha"""
        if len(v) < 8:
            raise ValueError('Senha deve ter no mínimo 8 caracteres')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Senha deve conter ao menos uma letra maiúscula')
        if not re.search(r'[a-z]', v):
            raise ValueError('Senha deve conter ao menos uma letra minúscula')
        if not re.search(r'\d', v):
            raise ValueError('Senha deve conter ao menos um número')
        return v


class UsuarioUpdate(BaseModel):
    """Schema para atualização de usuário"""
    nome_completo: Optional[str] = Field(None, min_length=3, max_length=255)
    telefone: Optional[str] = Field(None, max_length=20)
    whatsapp: Optional[str] = Field(None, max_length=20)
    data_nascimento: Optional[date] = None
    foto_url: Optional[str] = None
    distrito_id: Optional[int] = None
    igreja_id: Optional[int] = None
    pode_pregar: Optional[bool] = None
    pode_cantar: Optional[bool] = None
    status: Optional[StatusGeral] = None


class UsuarioResponse(BaseModel):
    """Schema de resposta de usuário"""
    id: int
    nome_completo: str
    email: str
    cpf: str
    telefone: Optional[str]
    whatsapp: Optional[str]
    data_nascimento: Optional[date]
    foto_url: Optional[str]
    tipo: TipoUsuario
    distrito_id: Optional[int]
    igreja_id: Optional[int]
    score_atual: Optional[Decimal]
    contador_mes_atual: Optional[int]
    contador_total_participacoes: Optional[int]
    contador_faltas: Optional[int]
    contador_desmarcacoes: Optional[int]
    pode_pregar: bool
    pode_cantar: bool
    status: StatusGeral
    status_aprovacao: StatusAprovacao
    created_at: datetime
    updated_at: datetime
    ultimo_login: Optional[datetime]

    class Config:
        from_attributes = True


class UsuarioLogin(BaseModel):
    """Schema para login"""
    email: EmailStr
    senha: str


class UsuarioResetPassword(BaseModel):
    """Schema para reset de senha"""
    email: EmailStr


class UsuarioChangePassword(BaseModel):
    """Schema para alteração de senha"""
    senha_atual: str
    nova_senha: str = Field(..., min_length=8, max_length=100)
    confirmar_senha: str

    @validator('nova_senha')
    def validate_password(cls, v):
        """Valida força da senha"""
        if len(v) < 8:
            raise ValueError('Senha deve ter no mínimo 8 caracteres')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Senha deve conter ao menos uma letra maiúscula')
        if not re.search(r'[a-z]', v):
            raise ValueError('Senha deve conter ao menos uma letra minúscula')
        if not re.search(r'\d', v):
            raise ValueError('Senha deve conter ao menos um número')
        return v

    @validator('confirmar_senha')
    def passwords_match(cls, v, values):
        """Valida se senhas conferem"""
        if 'nova_senha' in values and v != values['nova_senha']:
            raise ValueError('Senhas não conferem')
        return v


class UsuarioListResponse(BaseModel):
    """Schema para listagem de usuários"""
    items: list[UsuarioResponse]
    total: int
    page: int
    size: int
    pages: int


class UsuarioLimitedResponse(BaseModel):
    """Schema com dados limitados (apenas nome e foto) para pregadores/cantores"""
    id: int
    nome_completo: str
    foto_url: Optional[str]
    tipo: TipoUsuario
    score_atual: Optional[Decimal]  # Útil para ver disponibilidade

    class Config:
        from_attributes = True


class UsuarioLimitedListResponse(BaseModel):
    """Schema para listagem limitada de usuários"""
    items: list[UsuarioLimitedResponse]
    total: int
    page: int
    size: int
    pages: int
