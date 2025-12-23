"""
Schemas de Escala
"""
from pydantic import BaseModel, Field
from typing import Optional, Any, List
from datetime import datetime

from app.models.escala import StatusEscala


class EscalaBase(BaseModel):
    """Schema base de escala"""
    distrito_id: int
    mes: int = Field(..., ge=1, le=12)
    ano: int = Field(..., ge=2024)


class EscalaCreate(EscalaBase):
    """Schema para criação de escala"""
    pass


class EscalaUpdate(BaseModel):
    """Schema para atualização de escala"""
    status: Optional[StatusEscala] = None


class EscalaPublish(BaseModel):
    """Schema para publicação de escala"""
    enviar_notificacoes: bool = True
    canais: list[str] = ["EMAIL"]  # EMAIL, SMS, WHATSAPP


class EscalaResponse(BaseModel):
    """Schema de resposta de escala"""
    id: int
    distrito_id: int
    mes: int
    ano: int
    status: StatusEscala
    data_publicacao: Optional[datetime]
    pastor_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EscalaWithItensResponse(BaseModel):
    """Schema de resposta de escala com itens"""
    id: int
    distrito_id: int
    mes: int
    ano: int
    status: StatusEscala
    data_publicacao: Optional[datetime]
    pastor_id: int
    created_at: datetime
    updated_at: datetime
    itens: List[Any] = []  # Lista de ItemEscala

    class Config:
        from_attributes = True


class EscalaDetailResponse(EscalaResponse):
    """Schema de resposta detalhada de escala"""
    total_itens: int
    confirmados: int
    pendentes: int
    nao_confirmados: int


class EscalaListResponse(BaseModel):
    """Schema para listagem de escalas"""
    items: list[EscalaResponse]
    total: int


class EscalaGenerateRequest(BaseModel):
    """Schema para geração automática de escala"""
    distrito_id: int
    mes: int = Field(..., ge=1, le=12)
    ano: int = Field(..., ge=2024)
    usar_score: bool = True
    priorizar_sabado: bool = True
    respeitar_intervalo: bool = True
    respeitar_recorrencia: bool = True
