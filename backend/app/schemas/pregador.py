"""
Schemas: Pregador
"""

from typing import Optional, List
from datetime import date
from pydantic import BaseModel, Field, UUID4
from decimal import Decimal


class PregadorUpdate(BaseModel):
    """Schema para atualizar Perfil Pregador"""
    tipo_ordenacao: Optional[str] = Field(None, max_length=50)
    data_ordenacao: Optional[date] = None
    anos_experiencia: Optional[int] = Field(None, ge=0)
    max_pregacoes_mes: Optional[int] = Field(None, ge=1, le=31)
    horarios_preferidos: Optional[List[str]] = None
    observacoes: Optional[str] = None


class PregadorResponse(BaseModel):
    """Schema de resposta para Pregador"""
    usuario_id: UUID4
    tipo_ordenacao: Optional[str] = None
    data_ordenacao: Optional[date] = None
    anos_experiencia: Optional[int] = None
    score_medio: Decimal
    score_avaliacoes: Decimal
    score_frequencia: Decimal
    score_pontualidade: Decimal
    total_pregacoes: int
    pregacoes_realizadas: int
    pregacoes_faltou: int
    pregacoes_recusadas: int
    taxa_frequencia: Decimal
    taxa_pontualidade: Decimal
    max_pregacoes_mes: int
    ativo: bool

    class Config:
        from_attributes = True
