"""
Schemas de Configuração do Distrito
"""
from pydantic import BaseModel, Field
from datetime import datetime


class ConfiguracaoDistritoBase(BaseModel):
    """Schema base de Configuração do Distrito"""
    recorrencia_maxima_mes: int = Field(default=3, ge=1, le=10, description="Quantidade máxima de pregações/louvor por mês")
    intervalo_minimo_dias: int = Field(default=7, ge=1, le=30, description="Dias mínimos entre pregações do mesmo pregador")
    sistema_preferencias_habilitado: bool = Field(default=True, description="Habilitar sistema de preferência por igreja")
    prazo_avaliacao_dias: int = Field(default=7, ge=1, le=30, description="Prazo para avaliação após o culto (dias)")
    confirmacao_obrigatoria: bool = Field(default=True, description="Exigir confirmação de presença")
    prazo_confirmacao_horas: int = Field(default=48, ge=12, le=168, description="Prazo para confirmação (horas)")
    permitir_trocas: bool = Field(default=True, description="Permitir trocas entre pregadores/cantores")
    aprovar_trocas_obrigatorio: bool = Field(default=True, description="Exigir aprovação do pastor para trocas")


class ConfiguracaoDistritoCreate(ConfiguracaoDistritoBase):
    """Schema para criação de Configuração do Distrito"""
    distrito_id: int


class ConfiguracaoDistritoUpdate(ConfiguracaoDistritoBase):
    """Schema para atualização de Configuração do Distrito"""
    pass


class ConfiguracaoDistritoResponse(ConfiguracaoDistritoBase):
    """Schema de resposta de Configuração do Distrito"""
    id: int
    distrito_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
