"""
Schemas: Distrito
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, UUID4


class DistritoBase(BaseModel):
    """Base schema para Distrito"""
    nome: str = Field(..., min_length=1, max_length=200)
    codigo_distrito: Optional[str] = Field(None, max_length=50)
    regiao: Optional[str] = Field(None, max_length=100)


class DistritoCreate(DistritoBase):
    """Schema para criar Distrito"""
    associacao_id: UUID4


class DistritoUpdate(BaseModel):
    """Schema para atualizar Distrito"""
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    codigo_distrito: Optional[str] = Field(None, max_length=50)
    regiao: Optional[str] = Field(None, max_length=100)
    ativo: Optional[bool] = None


class DistritoResponse(DistritoBase):
    """Schema de resposta para Distrito"""
    id: UUID4
    codigo: int
    associacao_id: UUID4
    ativo: bool
    total_igrejas: int = 0
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True
