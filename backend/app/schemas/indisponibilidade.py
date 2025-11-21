"""
Schemas: PeriodoIndisponibilidade
"""

from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, UUID4


class IndisponibilidadeCreate(BaseModel):
    """Schema para criar Período de Indisponibilidade"""
    data_inicio: date
    data_fim: date
    motivo: Optional[str] = None


class IndisponibilidadeResponse(BaseModel):
    """Schema de resposta para Indisponibilidade"""
    id: UUID4
    pregador_id: UUID4
    data_inicio: date
    data_fim: date
    motivo: Optional[str] = None
    ativo: bool
    criado_em: datetime

    class Config:
        from_attributes = True
