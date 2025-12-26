"""
Schemas de Preferência de Notificação
"""
from pydantic import BaseModel
from datetime import datetime


class PreferenciaNotificacaoBase(BaseModel):
    """Schema base de preferência de notificação"""
    novas_escalas: bool = True
    escalas_atribuidas: bool = True
    lembretes: bool = True
    avaliacoes: bool = True
    trocas_escalas: bool = True
    substituicoes: bool = True
    email: bool = True
    push: bool = True
    sms: bool = False
    whatsapp: bool = False


class PreferenciaNotificacaoCreate(PreferenciaNotificacaoBase):
    """Schema para criação de preferência"""
    pass


class PreferenciaNotificacaoUpdate(BaseModel):
    """Schema para atualização de preferência"""
    novas_escalas: bool | None = None
    escalas_atribuidas: bool | None = None
    lembretes: bool | None = None
    avaliacoes: bool | None = None
    trocas_escalas: bool | None = None
    substituicoes: bool | None = None
    email: bool | None = None
    push: bool | None = None
    sms: bool | None = None
    whatsapp: bool | None = None


class PreferenciaNotificacaoResponse(PreferenciaNotificacaoBase):
    """Schema de resposta de preferência"""
    id: int
    usuario_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
