"""
Schemas para Dashboard
"""
from typing import List, Optional
from pydantic import BaseModel
from datetime import date


class StatCard(BaseModel):
    """Card de estatística para o dashboard"""
    title: str
    value: str
    change: str
    icon: str


class ProximoEvento(BaseModel):
    """Próximo evento/escala do dashboard"""
    id: int
    date: str
    time: str
    church: str
    type: str
    status: str
    confirmado: bool = False


class TopPregador(BaseModel):
    """Top pregador/cantor para ranking"""
    id: int
    nome: str
    score: float
    participacoes: int


class EscalaDistritoSummary(BaseModel):
    """Resumo de escala por distrito"""
    distrito_id: int
    distrito_nome: str
    status: str
    total_cultos: int
    total_pregadores: int


class DashboardAdmin(BaseModel):
    """Dashboard para Administradores"""
    stats_cards: List[StatCard]
    escalas_mes_atual: List[EscalaDistritoSummary]
    top_pregadores: List[TopPregador]
    top_cantores: List[TopPregador]
    taxa_avaliacao: float
    taxa_comparecimento: float


class DashboardPastor(BaseModel):
    """Dashboard para Pastores"""
    stats_cards: List[StatCard]
    proximos_cultos: List[ProximoEvento]
    pendencias: dict
    pregadores_score_queda: List[dict]


class DashboardPregadorCantor(BaseModel):
    """Dashboard para Pregadores/Cantores"""
    stats_cards: List[StatCard]
    proximos_eventos: List[ProximoEvento]
    score_atual: float
    media_avaliacoes: Optional[dict] = None
    participacoes_mes: int
    participacoes_ano: int
    participacoes_total: int


class DashboardMembro(BaseModel):
    """Dashboard para Membros"""
    stats_cards: List[StatCard]
    proximos_cultos: List[ProximoEvento]
    avaliacoes_pendentes: int
    igreja_nome: Optional[str] = None
    distrito_nome: Optional[str] = None


class DashboardResponse(BaseModel):
    """Response do dashboard baseado no tipo de usuário"""
    tipo_usuario: str
    admin: Optional[DashboardAdmin] = None
    pastor: Optional[DashboardPastor] = None
    pregador_cantor: Optional[DashboardPregadorCantor] = None
    membro: Optional[DashboardMembro] = None
