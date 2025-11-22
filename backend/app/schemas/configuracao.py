"""
Schemas para configurações do sistema
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum


class EscopoConfiguracao(str, Enum):
    """Escopo da configuração"""
    ASSOCIACAO = "associacao"
    DISTRITO = "distrito"
    IGREJA = "igreja"
    USUARIO = "usuario"


class ChaveConfiguracao(str, Enum):
    """Chaves de configuração conhecidas"""
    PERIODO_AVALIACAO = "periodo_avaliacao"
    MODO_QR_CODE = "modo_qr_code"
    NOTIFICACOES_EMAIL = "notificacoes_email"
    NOTIFICACOES_WHATSAPP = "notificacoes_whatsapp"


class ConfiguracaoBase(BaseModel):
    """Schema base para configurações"""
    chave: str = Field(..., max_length=100)
    valor: Dict[str, Any]
    descricao: Optional[str] = None


class ConfiguracaoCreate(ConfiguracaoBase):
    """Schema para criar configuração"""
    # O escopo será determinado pelo contexto (usuário logado)
    pass


class ConfiguracaoUpdate(BaseModel):
    """Schema para atualizar configuração"""
    valor: Optional[Dict[str, Any]] = None
    descricao: Optional[str] = None


class ConfiguracaoResponse(ConfiguracaoBase):
    """Schema de resposta de configuração"""
    id: str
    associacao_id: Optional[str] = None
    distrito_id: Optional[str] = None
    igreja_id: Optional[str] = None
    usuario_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# SCHEMAS ESPECÍFICOS PARA PERÍODO DE AVALIAÇÃO
# ============================================================

class PeriodoAvaliacaoValor(BaseModel):
    """Valor da configuração de período de avaliação"""
    dias_antes_pregacao: int = Field(
        default=0,
        ge=0,
        description="Quantos dias antes da pregação o formulário fica disponível"
    )
    dias_depois_pregacao: int = Field(
        default=7,
        ge=1,
        le=90,
        description="Quantos dias após a pregação o formulário fica disponível"
    )
    habilitado: bool = Field(
        default=True,
        description="Se o controle de período está ativo"
    )

    @validator('dias_depois_pregacao')
    def validar_dias_minimo(cls, v):
        if v < 1:
            raise ValueError('Período mínimo é de 1 dia após a pregação')
        return v


class PeriodoAvaliacaoCreate(BaseModel):
    """Schema para criar/atualizar configuração de período de avaliação"""
    dias_antes_pregacao: int = Field(default=0, ge=0)
    dias_depois_pregacao: int = Field(default=7, ge=1, le=90)
    habilitado: bool = Field(default=True)


class PeriodoAvaliacaoResponse(BaseModel):
    """Schema de resposta com informações completas do período"""
    id: str
    escopo: EscopoConfiguracao
    escopo_id: str
    dias_antes_pregacao: int
    dias_depois_pregacao: int
    habilitado: bool
    created_at: datetime
    updated_at: datetime


# ============================================================
# SCHEMAS ESPECÍFICOS PARA QR CODE
# ============================================================

class ModoQRCode(str, Enum):
    """Modo de geração de QR Code"""
    UNICO_POR_CULTO = "unico_por_culto"
    POR_PREGADOR = "por_pregador"


class QRCodeConfigValor(BaseModel):
    """Valor da configuração de QR Code"""
    modo: ModoQRCode = Field(
        default=ModoQRCode.UNICO_POR_CULTO,
        description="Modo de geração: único para todo o culto ou individual por pregador"
    )
    incluir_logo: bool = Field(
        default=True,
        description="Se deve incluir logo da igreja no QR Code"
    )
    tamanho: int = Field(
        default=300,
        ge=100,
        le=1000,
        description="Tamanho do QR Code em pixels"
    )


class QRCodeConfigCreate(BaseModel):
    """Schema para criar/atualizar configuração de QR Code"""
    modo: ModoQRCode = Field(default=ModoQRCode.UNICO_POR_CULTO)
    incluir_logo: bool = Field(default=True)
    tamanho: int = Field(default=300, ge=100, le=1000)


class QRCodeConfigResponse(BaseModel):
    """Schema de resposta de configuração de QR Code"""
    id: str
    escopo: EscopoConfiguracao
    escopo_id: str
    modo: ModoQRCode
    incluir_logo: bool
    tamanho: int
    created_at: datetime
    updated_at: datetime
