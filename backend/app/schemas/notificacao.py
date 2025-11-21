"""
Schemas: Notificacao
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, UUID4


class NotificacaoCreate(BaseModel):
    """Schema para criar Notificação"""
    usuario_id: UUID4
    tipo: str  # whatsapp, sms, push, email
    titulo: str = Field(..., min_length=1, max_length=200)
    mensagem: str = Field(..., min_length=1)
    pregacao_id: Optional[UUID4] = None
    troca_id: Optional[UUID4] = None
    agendado_para: Optional[datetime] = None


class NotificacaoResponse(BaseModel):
    """Schema de resposta para Notificação"""
    id: UUID4
    usuario_id: UUID4
    tipo: str
    status: str
    titulo: str
    mensagem: str
    pregacao_id: Optional[UUID4] = None
    troca_id: Optional[UUID4] = None
    agendado_para: Optional[datetime] = None
    enviado_em: Optional[datetime] = None
    entregue_em: Optional[datetime] = None
    lido_em: Optional[datetime] = None
    tentativas: int
    criado_em: datetime

    class Config:
        from_attributes = True
