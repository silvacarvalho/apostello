"""
Schemas de Item de Escala
"""
from pydantic import BaseModel
from typing import Optional
from datetime import date, time, datetime

from app.models.item_escala import StatusConfirmacao, StatusRealizacao


class ItemEscalaBase(BaseModel):
    """Schema base de item de escala"""
    escala_id: int
    igreja_id: int
    data_culto: date
    horario: time
    pregador_id: Optional[int] = None
    cantor_id: Optional[int] = None
    tema_id: Optional[int] = None
    tema_customizado: Optional[str] = None


class ItemEscalaCreate(ItemEscalaBase):
    """Schema para criação de item de escala"""
    pass


class ItemEscalaUpdate(BaseModel):
    """Schema para atualização de item de escala"""
    pregador_id: Optional[int] = None
    cantor_id: Optional[int] = None
    tema_id: Optional[int] = None
    tema_customizado: Optional[str] = None
    status_realizacao: Optional[StatusRealizacao] = None
    observacoes: Optional[str] = None


class ItemEscalaConfirmacao(BaseModel):
    """Schema para confirmação de presença"""
    confirmado: bool


class ItemEscalaResponse(BaseModel):
    """Schema de resposta de item de escala"""
    id: int
    escala_id: int
    igreja_id: int
    data_culto: date
    horario: time
    pregador_id: Optional[int]
    cantor_id: Optional[int]
    tema_id: Optional[int]
    tema_customizado: Optional[str]
    status_confirmacao_pregador: StatusConfirmacao
    status_confirmacao_cantor: StatusConfirmacao
    data_confirmacao_pregador: Optional[datetime]
    data_confirmacao_cantor: Optional[datetime]
    status_realizacao: StatusRealizacao
    observacoes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ItemEscalaDetailResponse(ItemEscalaResponse):
    """Schema de resposta detalhada com relacionamentos"""
    igreja_nome: Optional[str] = None
    pregador_nome: Optional[str] = None
    cantor_nome: Optional[str] = None
    tema_titulo: Optional[str] = None
    pregador_score: Optional[float] = None
    cantor_score: Optional[float] = None


class ItemEscalaListResponse(BaseModel):
    """Schema para listagem de itens de escala"""
    items: list[ItemEscalaResponse]
    total: int
