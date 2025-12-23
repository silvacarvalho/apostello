"""
Schemas de Horário de Culto
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import time, datetime
from uuid import UUID

from app.models.horario_culto import DiaSemana


class HorarioCultoBase(BaseModel):
    """Schema base de horário de culto"""
    dia_semana: DiaSemana = Field(..., description="Dia da semana do culto")
    horario: time = Field(..., description="Horário do culto")


class HorarioCultoCreate(HorarioCultoBase):
    """Schema para criação de horário de culto"""
    igreja_id: int


class HorarioCultoCreateLote(BaseModel):
    """Schema para criação em lote de horários (todas as igrejas do distrito)"""
    distrito_id: int
    horarios: list[HorarioCultoBase]


class HorarioCultoUpdate(BaseModel):
    """Schema para atualização de horário de culto"""
    dia_semana: Optional[DiaSemana] = None
    horario: Optional[time] = None
    ativo: Optional[bool] = None


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


class HorariosPorIgrejaResponse(BaseModel):
    """Schema de resposta com horários agrupados por igreja"""
    igreja_id: int
    igreja_nome: str
    horarios: list[HorarioCultoResponse]

    class Config:
        from_attributes = True
