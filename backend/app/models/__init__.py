"""Models module - SQLAlchemy models"""
from app.models.base import Base
from app.models.organizacao import Organizacao
from app.models.distrito import Distrito
from app.models.configuracao_distrito import ConfiguracaoDistrito
from app.models.igreja import Igreja
from app.models.horario_culto import HorarioCulto
from app.models.usuario import Usuario
from app.models.preferencia_igreja import PreferenciaIgreja
from app.models.preferencia_notificacao import PreferenciaNotificacao
from app.models.indisponibilidade import Indisponibilidade
from app.models.bloqueio_temporario import BloqueioTemporario
from app.models.tema import Tema
from app.models.escala import Escala
from app.models.item_escala import ItemEscala
from app.models.historico_item_escala import HistoricoItemEscala
from app.models.solicitacao_troca import SolicitacaoTroca
from app.models.avaliacao import Avaliacao
from app.models.historico_score import HistoricoScore
from app.models.penalidade import Penalidade
from app.models.historico_troca_escala import HistoricoTrocaEscala
from app.models.historico_substituicao_emergencial import HistoricoSubstituicaoEmergencial
from app.models.solicitacao_substituicao_emergencial import SolicitacaoSubstituicaoEmergencial
from app.models.notificacao import Notificacao
from app.models.log_notificacao import LogNotificacao

__all__ = [
    "Base",
    "Organizacao",
    "Distrito",
    "ConfiguracaoDistrito",
    "Igreja",
    "HorarioCulto",
    "Usuario",
    "PreferenciaIgreja",
    "PreferenciaNotificacao",
    "Indisponibilidade",
    "BloqueioTemporario",
    "Tema",
    "Escala",
    "ItemEscala",
    "HistoricoItemEscala",
    "SolicitacaoTroca",
    "Avaliacao",
    "HistoricoScore",
    "Penalidade",
    "HistoricoTrocaEscala",
    "HistoricoSubstituicaoEmergencial",
    "SolicitacaoSubstituicaoEmergencial",
    "Notificacao",
    "LogNotificacao",
]
