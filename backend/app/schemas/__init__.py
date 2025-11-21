"""
Schemas Pydantic
Sistema de Gestão de Escalas de Pregação - IASD
"""

from .associacao import AssociacaoCreate, AssociacaoUpdate, AssociacaoResponse
from .distrito import DistritoCreate, DistritoUpdate, DistritoResponse
from .igreja import IgrejaCreate, IgrejaUpdate, IgrejaResponse
from .usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse, UsuarioLogin, Token
from .pregador import PregadorResponse, PregadorUpdate
from .escala import EscalaCreate, EscalaUpdate, EscalaResponse, EscalaGerarRequest
from .pregacao import PregacaoCreate, PregacaoUpdate, PregacaoResponse, PregacaoAceitarRecusar
from .tematica import TematicaCreate, TematicaUpdate, TematicaResponse
from .avaliacao import AvaliacaoCreate, AvaliacaoResponse
from .troca import TrocaCreate, TrocaResponse, TrocaAceitarRejeitar
from .notificacao import NotificacaoCreate, NotificacaoResponse
from .indisponibilidade import IndisponibilidadeCreate, IndisponibilidadeResponse
from .horario_culto import (
    HorarioCultoCreate,
    HorarioCultoUpdate,
    HorarioCultoResponse,
    HorarioCultoPadraoRequest
)

__all__ = [
    # Associação
    "AssociacaoCreate",
    "AssociacaoUpdate",
    "AssociacaoResponse",
    # Distrito
    "DistritoCreate",
    "DistritoUpdate",
    "DistritoResponse",
    # Igreja
    "IgrejaCreate",
    "IgrejaUpdate",
    "IgrejaResponse",
    # Usuário
    "UsuarioCreate",
    "UsuarioUpdate",
    "UsuarioResponse",
    "UsuarioLogin",
    "Token",
    # Pregador
    "PregadorResponse",
    "PregadorUpdate",
    # Escala
    "EscalaCreate",
    "EscalaUpdate",
    "EscalaResponse",
    "EscalaGerarRequest",
    # Pregação
    "PregacaoCreate",
    "PregacaoUpdate",
    "PregacaoResponse",
    "PregacaoAceitarRecusar",
    # Temática
    "TematicaCreate",
    "TematicaUpdate",
    "TematicaResponse",
    # Avaliação
    "AvaliacaoCreate",
    "AvaliacaoResponse",
    # Troca
    "TrocaCreate",
    "TrocaResponse",
    "TrocaAceitarRejeitar",
    # Notificação
    "NotificacaoCreate",
    "NotificacaoResponse",
    # Indisponibilidade
    "IndisponibilidadeCreate",
    "IndisponibilidadeResponse",
    # Horário de Culto
    "HorarioCultoCreate",
    "HorarioCultoUpdate",
    "HorarioCultoResponse",
    "HorarioCultoPadraoRequest",
]
