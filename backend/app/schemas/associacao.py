"""
Schemas: Associacao
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, UUID4


class AssociacaoBase(BaseModel):
    """Base schema para Associação"""
    nome: str = Field(..., min_length=1, max_length=200)
    sigla: Optional[str] = Field(None, max_length=20)
    endereco: Optional[str] = None
    cidade: Optional[str] = Field(None, max_length=100)
    estado: Optional[str] = Field(None, max_length=50)
    pais: str = Field(default="Brasil", max_length=50)
    telefone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    site: Optional[str] = Field(None, max_length=200)
    url_logo: Optional[str] = Field(None, max_length=500)


class AssociacaoCreate(AssociacaoBase):
    """Schema para criar Associação"""
    pass


class AssociacaoUpdate(BaseModel):
    """Schema para atualizar Associação"""
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    sigla: Optional[str] = Field(None, max_length=20)
    endereco: Optional[str] = None
    cidade: Optional[str] = Field(None, max_length=100)
    estado: Optional[str] = Field(None, max_length=50)
    pais: Optional[str] = Field(None, max_length=50)
    telefone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    site: Optional[str] = Field(None, max_length=200)
    url_logo: Optional[str] = Field(None, max_length=500)
    ativo: Optional[bool] = None


class AssociacaoResponse(AssociacaoBase):
    """Schema de resposta para Associação"""
    id: UUID4
    codigo: int
    ativo: bool
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True
