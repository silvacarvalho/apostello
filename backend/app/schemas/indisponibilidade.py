"""
Schemas de Indisponibilidade
"""
from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, List
from enum import Enum


class MotivoIndisponibilidade(str, Enum):
    FERIAS = "FERIAS"
    VIAGEM = "VIAGEM"
    COMPROMISSO = "COMPROMISSO"
    SAUDE = "SAUDE"
    OUTRO = "OUTRO"


class IndisponibilidadeCreate(BaseModel):
    data_inicio: date = Field(..., description="Data de início da indisponibilidade")
    data_fim: date = Field(..., description="Data de fim da indisponibilidade")
    motivo: MotivoIndisponibilidade = Field(..., description="Tipo do motivo")
    descricao: Optional[str] = Field(None, description="Descrição adicional do motivo")


class IndisponibilidadeUpdate(BaseModel):
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    motivo: Optional[MotivoIndisponibilidade] = None
    descricao: Optional[str] = None


class IndisponibilidadeResponse(BaseModel):
    id: int
    usuario_id: int
    data_inicio: date
    data_fim: date
    motivo_tipo: str
    motivo_descricao: Optional[str] = None
    created_at: Optional[str] = None
    usuario_nome: Optional[str] = None

    class Config:
        from_attributes = True


class IndisponibilidadeListResponse(BaseModel):
    total: int
    indisponibilidades: List[IndisponibilidadeResponse]
