"""
Schemas: Igreja
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, UUID4


class IgrejaBase(BaseModel):
    """Base schema para Igreja"""
    nome: str = Field(..., min_length=1, max_length=200)
    endereco: Optional[str] = None
    cidade: Optional[str] = Field(None, max_length=100)
    estado: Optional[str] = Field(None, max_length=50)
    cep: Optional[str] = Field(None, max_length=20)
    telefone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    capacidade: Optional[int] = Field(None, gt=0)
    tem_som: bool = True
    tem_projecao: bool = True
    observacoes: Optional[str] = None


class IgrejaCreate(IgrejaBase):
    """Schema para criar Igreja"""
    distrito_id: UUID4


class IgrejaUpdate(BaseModel):
    """Schema para atualizar Igreja"""
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    endereco: Optional[str] = None
    cidade: Optional[str] = Field(None, max_length=100)
    estado: Optional[str] = Field(None, max_length=50)
    cep: Optional[str] = Field(None, max_length=20)
    telefone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    capacidade: Optional[int] = Field(None, gt=0)
    tem_som: Optional[bool] = None
    tem_projecao: Optional[bool] = None
    observacoes: Optional[str] = None
    ativo: Optional[bool] = None


class IgrejaResponse(IgrejaBase):
    """Schema de resposta para Igreja"""
    id: UUID4
    codigo: int
    distrito_id: UUID4
    ativo: bool
    criado_em: datetime
    atualizado_em: datetime
    
    # Relacionamento
    distrito: Optional['DistritoSimple'] = None

    class Config:
        from_attributes = True


class DistritoSimple(BaseModel):
    """Schema simplificado de Distrito para uso em relacionamentos"""
    id: UUID4
    codigo: int
    nome: str
    
    class Config:
        from_attributes = True


# Atualizar referências forward
IgrejaResponse.model_rebuild()
