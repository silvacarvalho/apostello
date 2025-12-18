"""
Schemas de Avaliação
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal

from app.models.avaliacao import TipoAvaliado


class AvaliacaoBase(BaseModel):
    """Schema base de avaliação"""
    item_escala_id: int
    avaliado_id: int
    tipo: TipoAvaliado
    criterio_1: int = Field(..., ge=1, le=5)
    criterio_2: int = Field(..., ge=1, le=5)
    criterio_3: int = Field(..., ge=1, le=5)
    criterio_4: int = Field(..., ge=1, le=5)
    criterio_5: int = Field(..., ge=1, le=5)
    comentario: Optional[str] = None


class AvaliacaoCreate(AvaliacaoBase):
    """Schema para criação de avaliação"""
    pass


class AvaliacaoResponse(BaseModel):
    """Schema de resposta de avaliação"""
    id: int
    item_escala_id: int
    avaliado_id: int
    avaliador_id: int
    tipo: TipoAvaliado
    criterio_1: int
    criterio_2: int
    criterio_3: int
    criterio_4: int
    criterio_5: int
    comentario: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @property
    def media(self) -> Decimal:
        return Decimal(
            (self.criterio_1 + self.criterio_2 + self.criterio_3 + 
             self.criterio_4 + self.criterio_5) / 5
        ).quantize(Decimal('0.01'))


class AvaliacaoListResponse(BaseModel):
    """Schema para listagem de avaliações"""
    items: list[AvaliacaoResponse]
    total: int
    media_geral: Decimal
