"""
Enums compartilhados entre os models
"""
import enum


class StatusGeral(str, enum.Enum):
    """Status geral para entidades (Ativo/Inativo)"""
    ATIVO = "ATIVO"
    INATIVO = "INATIVO"


class TipoUsuario(str, enum.Enum):
    """Tipos de usuário do sistema"""
    ADMIN = "ADMIN"
    ASSOCIACAO = "ASSOCIACAO"
    PASTOR_DISTRITAL = "PASTOR_DISTRITAL"
    LIDER_DISTRITAL = "LIDER_DISTRITAL"
    PREGADOR = "PREGADOR"
    CANTOR = "CANTOR"
    MEMBRO = "MEMBRO"


class StatusAprovacao(str, enum.Enum):
    """Status de aprovação de usuário"""
    PENDENTE_APROVACAO = "PENDENTE_APROVACAO"
    APROVADO = "APROVADO"
    RECUSADO = "RECUSADO"


class StatusEscala(str, enum.Enum):
    """Status de uma escala"""
    RASCUNHO = "RASCUNHO"
    PUBLICADA = "PUBLICADA"
    ARQUIVADA = "ARQUIVADA"
