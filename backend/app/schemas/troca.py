"""
Schemas: TrocaEscala
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, UUID4


class TrocaCreate(BaseModel):
    """Schema para criar Troca de Escala"""
    pregacao_solicitante_id: UUID4
    pregacao_destinatario_id: UUID4
    motivo_solicitante: Optional[str] = None


class TrocaAceitarRejeitar(BaseModel):
    """Schema para aceitar/rejeitar troca"""
    aceitar: bool
    motivo_rejeicao: Optional[str] = None


class TrocaResponse(BaseModel):
    """Schema de resposta para Troca"""
    id: UUID4
    pregacao_solicitante_id: UUID4
    usuario_solicitante_id: UUID4
    pregacao_destinatario_id: UUID4
    usuario_destinatario_id: UUID4
    status: str
    motivo_solicitante: Optional[str] = None
    aceito_solicitante_em: Optional[datetime] = None
    aceito_destinatario_em: Optional[datetime] = None
    rejeitado_em: Optional[datetime] = None
    motivo_rejeicao: Optional[str] = None
    concluido_em: Optional[datetime] = None
    criado_em: datetime

    class Config:
        from_attributes = True
