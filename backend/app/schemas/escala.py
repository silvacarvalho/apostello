"""
Schemas: Escala
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, UUID4


class EscalaBase(BaseModel):
    """Base schema para Escala"""
    mes_referencia: int = Field(..., ge=1, le=12)
    ano_referencia: int = Field(..., ge=2024)
    observacoes: Optional[str] = None


class EscalaCreate(EscalaBase):
    """Schema para criar Escala"""
    distrito_id: UUID4


class EscalaUpdate(BaseModel):
    """Schema para atualizar Escala"""
    observacoes: Optional[str] = None
    status: Optional[str] = None


class EscalaResponse(EscalaBase):
    """Schema de resposta para Escala"""
    id: UUID4
    codigo: int
    distrito_id: UUID4
    status: str
    criado_por: Optional[UUID4] = None
    aprovado_por: Optional[UUID4] = None
    finalizado_por: Optional[UUID4] = None
    criado_em: datetime
    aprovado_em: Optional[datetime] = None
    finalizado_em: Optional[datetime] = None
    atualizado_em: datetime

    class Config:
        from_attributes = True


class EscalaGerarRequest(BaseModel):
    """Schema para gerar escala automaticamente"""
    distrito_id: UUID4
    mes_referencia: int = Field(..., ge=1, le=12)
    ano_referencia: int = Field(..., ge=2024)
