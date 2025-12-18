"""
Schemas de Distrito
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.models.distrito import StatusGeral


class DistritoBase(BaseModel):
    """Schema base de distrito"""
    nome: str = Field(..., min_length=2, max_length=255)
    descricao: Optional[str] = None
    organizacao_id: int
    pastor_distrital_id: Optional[int] = None
    lider_distrital_id: Optional[int] = None
    config_recorrencia_maxima: int = Field(default=3, ge=1)
    config_intervalo_minimo: int = Field(default=7, ge=0)
    config_usa_preferencia: bool = False
    config_exige_confirmacao: bool = True
    config_prazo_confirmacao_horas: int = Field(default=48, ge=1)
    config_exige_aprovacao_troca: bool = True
    config_prazo_avaliacao_dias: int = Field(default=7, ge=1, le=30)


class DistritoCreate(DistritoBase):
    """Schema para criação de distrito"""
    pass


class DistritoUpdate(BaseModel):
    """Schema para atualização de distrito"""
    nome: Optional[str] = Field(None, min_length=2, max_length=255)
    descricao: Optional[str] = None
    pastor_distrital_id: Optional[int] = None
    lider_distrital_id: Optional[int] = None
    config_recorrencia_maxima: Optional[int] = Field(None, ge=1)
    config_intervalo_minimo: Optional[int] = Field(None, ge=0)
    config_usa_preferencia: Optional[bool] = None
    config_exige_confirmacao: Optional[bool] = None
    config_prazo_confirmacao_horas: Optional[int] = Field(None, ge=1)
    config_exige_aprovacao_troca: Optional[bool] = None
    config_prazo_avaliacao_dias: Optional[int] = Field(None, ge=1, le=30)
    status: Optional[StatusGeral] = None


class DistritoResponse(BaseModel):
    """Schema de resposta de distrito"""
    id: int
    organizacao_id: int
    nome: str
    descricao: Optional[str]
    pastor_distrital_id: Optional[int]
    lider_distrital_id: Optional[int]
    config_recorrencia_maxima: int
    config_intervalo_minimo: int
    config_usa_preferencia: bool
    config_exige_confirmacao: bool
    config_prazo_confirmacao_horas: int
    config_exige_aprovacao_troca: bool
    config_prazo_avaliacao_dias: int
    status: StatusGeral
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DistritoListResponse(BaseModel):
    """Schema para listagem de distritos"""
    items: list[DistritoResponse]
    total: int
