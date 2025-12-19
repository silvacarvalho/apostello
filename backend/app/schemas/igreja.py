"""
Schemas de Igreja
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, time

from app.models.igreja import StatusGeral
from app.models.horario_culto import DiaSemana


class HorarioCultoBase(BaseModel):
    """Schema base de horário de culto"""
    dia_semana: DiaSemana
    horario: time


class HorarioCultoInIgreja(HorarioCultoBase):
    """Schema de horário de culto dentro de igreja"""
    id: int

    class Config:
        from_attributes = True


class DistritoSimples(BaseModel):
    """Schema simplificado de distrito"""
    id: int
    nome: str

    class Config:
        from_attributes = True


class IgrejaBase(BaseModel):
    """Schema base de igreja"""
    nome: str = Field(..., min_length=2, max_length=255)
    distrito_id: int
    endereco_completo: Optional[str] = None
    telefone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None


class IgrejaCreate(IgrejaBase):
    """Schema para criação de igreja"""
    pass


class IgrejaUpdate(BaseModel):
    """Schema para atualização de igreja"""
    nome: Optional[str] = Field(None, min_length=2, max_length=255)
    endereco_completo: Optional[str] = None
    telefone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    status: Optional[StatusGeral] = None


class IgrejaResponse(BaseModel):
    """Schema de resposta de igreja"""
    id: int
    distrito_id: int
    nome: str
    endereco_completo: Optional[str]
    telefone: Optional[str]
    email: Optional[str]
    status: StatusGeral
    created_at: datetime
    updated_at: datetime
    distrito: Optional[DistritoSimples] = None
    horarios_culto: List[HorarioCultoInIgreja] = Field(default=[], validation_alias="horarios_culto_ativos")

    class Config:
        from_attributes = True
        populate_by_name = True


class IgrejaListResponse(BaseModel):
    """Schema para listagem de igrejas"""
    items: list[IgrejaResponse]
    total: int
