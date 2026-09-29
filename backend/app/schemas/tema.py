"""
Schemas de Tema
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class TipoRecorrenciaTema(str, Enum):
    SEMANAL_MES = "SEMANAL_MES"  # Ex: "Todo segundo sábado do mês"
    PERIODO_ESPECIFICO = "PERIODO_ESPECIFICO"  # Ex: "Semana Santa - 13/04 a 20/04"
    ANUAL = "ANUAL"  # Ex: "Dia das Mães - segundo domingo de maio"


class StatusGeral(str, Enum):
    ATIVO = "ATIVO"
    INATIVO = "INATIVO"


class TemaBase(BaseModel):
    """Schema base para Tema"""
    titulo: str = Field(..., min_length=1, max_length=255)
    descricao: Optional[str] = None
    tipo_recorrencia: TipoRecorrenciaTema
    config_recorrencia: Dict[str, Any] = Field(
        ...,
        description="""
        Configuração de recorrência. Exemplos:
        - SEMANAL_MES: {"semana": 2, "dia_semana": 6} (segundo sábado)
        - PERIODO_ESPECIFICO: {"data_inicio": "2025-04-13", "data_fim": "2025-04-20"}
        - ANUAL: {"mes": 5, "semana": 2, "dia_semana": 0} (segundo domingo de maio)
        """
    )
    ano_aplicacao: Optional[int] = None


class TemaCreate(TemaBase):
    """Schema para criação de Tema"""
    pass


class TemaUpdate(BaseModel):
    """Schema para atualização de Tema"""
    titulo: Optional[str] = Field(None, min_length=1, max_length=255)
    descricao: Optional[str] = None
    tipo_recorrencia: Optional[TipoRecorrenciaTema] = None
    config_recorrencia: Optional[Dict[str, Any]] = None
    ano_aplicacao: Optional[int] = None
    status: Optional[StatusGeral] = None


class TemaResponse(TemaBase):
    """Schema de resposta para Tema"""
    id: int
    organizacao_id: int
    status: StatusGeral
    vezes_usado: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TemaListResponse(BaseModel):
    """Lista paginada de temas"""
    items: List[TemaResponse]
    total: int


class TemaExportItem(BaseModel):
    """Schema para exportação de tema (sem IDs)"""
    titulo: str
    descricao: Optional[str] = None
    tipo_recorrencia: TipoRecorrenciaTema
    config_recorrencia: Dict[str, Any]
    ano_aplicacao: Optional[int] = None


class TemaExportTemplate(BaseModel):
    """Template de exportação de temas"""
    version: str = "1.0"
    exported_at: datetime
    total_temas: int
    temas: List[TemaExportItem]


class TemaImportResult(BaseModel):
    """Resultado da importação de temas"""
    total_importados: int
    total_ignorados: int
    erros: List[str]
