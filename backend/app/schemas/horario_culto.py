"""
Schemas: HorarioCulto
Request/Response para horários de cultos
"""

from pydantic import BaseModel, Field, UUID4
from typing import Optional
from datetime import time
from enum import Enum


class DiaSemanaEnum(str, Enum):
    """Enum de dias da semana"""
    DOMINGO = "domingo"
    SEGUNDA = "segunda"
    TERCA = "terca"
    QUARTA = "quarta"
    QUINTA = "quinta"
    SEXTA = "sexta"
    SABADO = "sabado"


class HorarioCultoBase(BaseModel):
    """Base schema para horário de culto"""
    dia_semana: DiaSemanaEnum = Field(..., description="Dia da semana do culto")
    horario: time = Field(..., description="Horário do culto")
    nome_culto: Optional[str] = Field(None, max_length=100, description="Nome do culto (ex: Culto Divino)")
    duracao_minutos: int = Field(default=120, ge=30, le=480, description="Duração em minutos")
    requer_pregador: bool = Field(default=True, description="Se requer pregador escalado")
    ativo: bool = Field(default=True, description="Se está ativo")

    class Config:
        from_attributes = True


class HorarioCultoCreate(HorarioCultoBase):
    """Schema para criar horário de culto"""
    distrito_id: Optional[UUID4] = Field(None, description="ID do distrito (se aplicável a todas igrejas)")
    igreja_id: Optional[UUID4] = Field(None, description="ID da igreja (se específico)")

    class Config:
        json_schema_extra = {
            "example": {
                "distrito_id": "123e4567-e89b-12d3-a456-426614174000",
                "dia_semana": "sabado",
                "horario": "08:30:00",
                "nome_culto": "Culto Divino",
                "duracao_minutos": 120,
                "requer_pregador": True,
                "ativo": True
            }
        }


class HorarioCultoUpdate(BaseModel):
    """Schema para atualizar horário de culto"""
    dia_semana: Optional[DiaSemanaEnum] = None
    horario: Optional[time] = None
    nome_culto: Optional[str] = Field(None, max_length=100)
    duracao_minutos: Optional[int] = Field(None, ge=30, le=480)
    requer_pregador: Optional[bool] = None
    ativo: Optional[bool] = None

    class Config:
        from_attributes = True


class HorarioCultoResponse(HorarioCultoBase):
    """Schema de resposta para horário de culto"""
    id: UUID4
    distrito_id: Optional[UUID4] = None
    igreja_id: Optional[UUID4] = None

    class Config:
        from_attributes = True


class HorarioCultoPadraoRequest(BaseModel):
    """Schema para criar horários padrão IASD"""
    distrito_id: UUID4 = Field(..., description="ID do distrito")
    aplicar_todas_igrejas: bool = Field(
        default=True,
        description="Se deve aplicar a todas as igrejas do distrito"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "distrito_id": "123e4567-e89b-12d3-a456-426614174000",
                "aplicar_todas_igrejas": True
            }
        }
