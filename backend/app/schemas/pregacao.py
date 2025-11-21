"""
Schemas: Pregacao
"""

from typing import Optional
from datetime import datetime, date, time
from pydantic import BaseModel, Field, UUID4


class PregacaoBase(BaseModel):
    """Base schema para Pregação"""
    data_pregacao: date
    horario_pregacao: time
    nome_culto: Optional[str] = Field(None, max_length=100)
    observacoes: Optional[str] = None
    instrucoes_especiais: Optional[str] = None


class PregacaoCreate(PregacaoBase):
    """Schema para criar Pregação"""
    escala_id: UUID4
    igreja_id: UUID4
    pregador_id: UUID4
    tematica_id: Optional[UUID4] = None


class PregacaoUpdate(BaseModel):
    """Schema para atualizar Pregação"""
    data_pregacao: Optional[date] = None
    horario_pregacao: Optional[time] = None
    nome_culto: Optional[str] = Field(None, max_length=100)
    pregador_id: Optional[UUID4] = None
    tematica_id: Optional[UUID4] = None
    observacoes: Optional[str] = None
    instrucoes_especiais: Optional[str] = None


class PregacaoResponse(PregacaoBase):
    """Schema de resposta para Pregação"""
    id: UUID4
    codigo: int
    escala_id: UUID4
    igreja_id: UUID4
    pregador_id: UUID4
    tematica_id: Optional[UUID4] = None
    status: str
    aceito_em: Optional[datetime] = None
    recusado_em: Optional[datetime] = None
    motivo_recusa: Optional[str] = None
    realizado_em: Optional[datetime] = None
    foi_trocado: bool
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


class PregacaoAceitarRecusar(BaseModel):
    """Schema para aceitar/recusar pregação"""
    aceitar: bool
    motivo_recusa: Optional[str] = None
