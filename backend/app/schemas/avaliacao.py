"""
Schemas: Avaliacao
"""

from typing import Optional, List
from datetime import datetime, date, time
from pydantic import BaseModel, Field, UUID4
from decimal import Decimal


class AvaliacaoCreate(BaseModel):
    """Schema para criar Avaliação"""
    pregacao_id: UUID4
    pregador_id: UUID4
    nota: Decimal = Field(..., ge=0, le=5)
    qualidade_conteudo: Optional[Decimal] = Field(None, ge=0, le=5)
    apresentacao: Optional[Decimal] = Field(None, ge=0, le=5)
    fundamentacao_biblica: Optional[Decimal] = Field(None, ge=0, le=5)
    engajamento: Optional[Decimal] = Field(None, ge=0, le=5)
    comentarios: Optional[str] = None
    anonimo: bool = False


class AvaliacaoResponse(BaseModel):
    """Schema de resposta para Avaliação"""
    id: UUID4
    pregacao_id: UUID4
    pregador_id: UUID4
    avaliador_id: UUID4
    nota: Decimal
    qualidade_conteudo: Optional[Decimal] = None
    apresentacao: Optional[Decimal] = None
    fundamentacao_biblica: Optional[Decimal] = None
    engajamento: Optional[Decimal] = None
    comentarios: Optional[str] = None
    anonimo: bool
    criado_em: datetime

    class Config:
        from_attributes = True


# ============================================================
# SCHEMAS PARA DETECÇÃO AUTOMÁTICA DE PREGAÇÃO
# ============================================================

class PregadorInfo(BaseModel):
    """Informações do pregador"""
    id: str
    nome_completo: str


class IgrejaInfo(BaseModel):
    """Informações da igreja"""
    id: str
    nome: str


class PregacaoDetectadaResponse(BaseModel):
    """Resposta da detecção automática de pregação"""
    pregacao_id: str
    pregador: PregadorInfo
    igreja: IgrejaInfo
    data_pregacao: date
    horario_pregacao: time
    nome_culto: Optional[str] = None
    tematica_titulo: Optional[str] = None
    pode_avaliar: bool
    motivo_nao_pode_avaliar: Optional[str] = None
    dias_restantes_avaliacao: Optional[int] = None


class PregacoesDisponiveisResponse(BaseModel):
    """Lista de pregações disponíveis para avaliação"""
    total: int
    pregacoes: List[PregacaoDetectadaResponse]
    mensagem: str
