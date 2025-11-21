"""
Schemas: Tematica
"""

from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, Field, UUID4


class TematicaBase(BaseModel):
    """Base schema para Temática"""
    titulo: str = Field(..., min_length=1, max_length=300)
    descricao: Optional[str] = None
    referencia_biblica: Optional[str] = Field(None, max_length=200)
    tipo_recorrencia: str  # data_especifica, semanal, mensal
    data_especifica: Optional[date] = None
    dia_semana_semanal: Optional[str] = None
    numero_semana_mes: Optional[int] = Field(None, ge=1, le=5)
    dia_semana_mensal: Optional[str] = None
    valido_de: Optional[date] = None
    valido_ate: Optional[date] = None


class TematicaCreate(TematicaBase):
    """Schema para criar Temática"""
    associacao_id: UUID4


class TematicaUpdate(BaseModel):
    """Schema para atualizar Temática"""
    titulo: Optional[str] = Field(None, min_length=1, max_length=300)
    descricao: Optional[str] = None
    referencia_biblica: Optional[str] = Field(None, max_length=200)
    valido_de: Optional[date] = None
    valido_ate: Optional[date] = None
    ativo: Optional[bool] = None


class TematicaResponse(TematicaBase):
    """Schema de resposta para Temática"""
    id: UUID4
    codigo: int
    associacao_id: UUID4
    criado_por: Optional[UUID4] = None
    ativo: bool
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True
