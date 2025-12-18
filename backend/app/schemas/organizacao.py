"""
Schemas de Organização
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
import re


class OrganizacaoBase(BaseModel):
    """Schema base de organização"""
    nome: str = Field(..., min_length=2, max_length=255)
    cnpj: Optional[str] = Field(None, max_length=18)
    logo_url: Optional[str] = None

    @validator('cnpj')
    def validate_cnpj(cls, v):
        """Remove formatação e valida CNPJ"""
        if v:
            cnpj = re.sub(r'[^\d]', '', v)
            if len(cnpj) != 14:
                raise ValueError('CNPJ deve ter 14 dígitos')
            return cnpj
        return v


class OrganizacaoCreate(OrganizacaoBase):
    """Schema para criação de organização"""
    pass


class OrganizacaoUpdate(BaseModel):
    """Schema para atualização de organização"""
    nome: Optional[str] = Field(None, min_length=2, max_length=255)
    cnpj: Optional[str] = Field(None, max_length=18)
    logo_url: Optional[str] = None


class OrganizacaoResponse(BaseModel):
    """Schema de resposta de organização"""
    id: int
    nome: str
    cnpj: Optional[str]
    logo_url: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
