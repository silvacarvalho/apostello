"""
Schemas: Escala
"""

from typing import Optional, List, Dict
from datetime import datetime, date, time
from pydantic import BaseModel, Field, UUID4


class EscalaBase(BaseModel):
    """Base schema para Escala"""
    mes_referencia: int = Field(..., ge=1, le=12)
    ano_referencia: int = Field(..., ge=2024)
    observacoes: Optional[str] = None


class EscalaCreate(EscalaBase):
    """Schema para criar Escala"""
    distrito_id: UUID4


class EscalaUpdate(BaseModel):
    """Schema para atualizar Escala"""
    observacoes: Optional[str] = None
    status: Optional[str] = None


class EscalaResponse(EscalaBase):
    """Schema de resposta para Escala"""
    id: UUID4
    codigo: int
    distrito_id: UUID4
    status: str
    criado_por: Optional[UUID4] = None
    aprovado_por: Optional[UUID4] = None
    finalizado_por: Optional[UUID4] = None
    criado_em: datetime
    aprovado_em: Optional[datetime] = None
    finalizado_em: Optional[datetime] = None
    atualizado_em: datetime

    class Config:
        from_attributes = True


class EscalaGerarRequest(BaseModel):
    """Schema para gerar escala automaticamente"""
    distrito_id: UUID4
    mes_referencia: int = Field(..., ge=1, le=12)
    ano_referencia: int = Field(..., ge=2024)


# =======================
# Relatório de Geração
# =======================

class EstatisticaIgreja(BaseModel):
    """Estatística de uma igreja na geração"""
    igreja_id: UUID4
    igreja_nome: str
    pregacoes_criadas: int
    horarios_sem_pregador: int


class RelatorioGeracao(BaseModel):
    """Relatório completo da geração de escala"""
    escala_id: UUID4
    total_igrejas: int
    total_pregacoes: int
    total_horarios_sem_pregador: int
    igrejas_sem_pregacao: List[str]
    estatisticas_por_igreja: List[EstatisticaIgreja]


# =======================
# Calendário / Listagens
# =======================

class EventoCalendario(BaseModel):
    """Evento para calendários (igreja)"""
    id: UUID4
    title: str
    start: datetime
    end: datetime
    status: str
    igreja_id: UUID4
    pregador_id: UUID4
    meta: dict


class EventoCalendarioComIgreja(EventoCalendario):
    """Evento com dados de igreja para visão por distrito"""
    igreja_nome: str


class MinhaPregacaoItem(BaseModel):
    """Item de lista para visão do pregador"""
    id: UUID4
    data: date
    horario: time
    status: str
    igreja_id: UUID4
    igreja_nome: str
    nome_culto: Optional[str] = None
