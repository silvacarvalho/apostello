"""
Schemas: Avaliacao
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, UUID4
from decimal import Decimal


class AvaliacaoCreate(BaseModel):
    """Schema para criar Avaliação"""
    pregacao_id: UUID4
    pregador_id: UUID4
    nota: Decimal = Field(..., ge=0, le=5)
    qualidade_conteudo: Optional[Decimal] = Field(None, ge=0, le=5)
    apresentacao: Optional[Decimal] = Field(None, ge=0, le=5)
    fundamentacao_biblica: Optional[Decimal] = Field(None, ge=0, le=5)
    engajamento: Optional[Decimal] = Field(None, ge=0, le=5)
    comentarios: Optional[str] = None
    anonimo: bool = False


class AvaliacaoResponse(BaseModel):
    """Schema de resposta para Avaliação"""
    id: UUID4
    pregacao_id: UUID4
    pregador_id: UUID4
    avaliador_id: UUID4
    nota: Decimal
    qualidade_conteudo: Optional[Decimal] = None
    apresentacao: Optional[Decimal] = None
    fundamentacao_biblica: Optional[Decimal] = None
    engajamento: Optional[Decimal] = None
    comentarios: Optional[str] = None
    anonimo: bool
    criado_em: datetime

    class Config:
        from_attributes = True
