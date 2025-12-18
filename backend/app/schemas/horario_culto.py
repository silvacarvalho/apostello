"""
Schemas de Horário de Culto
"""
from pydantic import BaseModel
from typing import Optional
from datetime import time, datetime
from uuid import UUID

from app.models.horario_culto import DiaSemana


class HorarioCultoBase(BaseModel):
    """Schema base de horário de culto"""
    igreja_id: int
    dia_semana: DiaSemana
    horario: time


class HorarioCultoCreate(HorarioCultoBase):
    """Schema para criação de horário de culto"""
    pass


class HorarioCultoBatchCreate(BaseModel):
    """Schema para criação em lote de horários"""
    igreja_ids: list[int]
    dia_semana: DiaSemana
    horario: time


class HorarioCultoResponse(BaseModel):
    """Schema de resposta de horário de culto"""
    id: int
    igreja_id: int
    dia_semana: DiaSemana
    horario: time
    ativo: bool
    aplicado_em_lote: bool
    lote_id: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True
