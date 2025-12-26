"""
Schemas de Bloqueio Temporário
"""
from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, List


class BloqueioTemporarioCreate(BaseModel):
    usuario_id: int = Field(..., description="ID do usuário a ser bloqueado")
    data_inicio: date = Field(..., description="Data de início do bloqueio")
    data_fim: date = Field(..., description="Data de fim do bloqueio")
    motivo: str = Field(..., min_length=3, description="Motivo do bloqueio")


class BloqueioTemporarioUpdate(BaseModel):
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    motivo: Optional[str] = None


class BloqueioTemporarioResponse(BaseModel):
    id: int
    usuario_id: int
    bloqueado_por_id: int
    data_inicio: date
    data_fim: date
    motivo: str
    created_at: Optional[str] = None
    usuario_nome: Optional[str] = None
    bloqueado_por_nome: Optional[str] = None

    class Config:
        from_attributes = True


class BloqueioTemporarioListResponse(BaseModel):
    total: int
    bloqueios: List[BloqueioTemporarioResponse]
