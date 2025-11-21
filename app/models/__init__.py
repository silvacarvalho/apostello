"""
Módulo de modelos do banco de dados
Importa todos os modelos para facilitar o uso
"""
from app.core.database import Base

# Importar todos os modelos
from app.models.usuario import Usuario
from app.models.core import Distrito, Igreja, Membro, Pregador, Tema
from app.models.escala import Escala, SlotEscala, Conflito, GeracaoEscala
from app.models.notificacao import Notificacao, MensagemWhatsApp

# Exportar todos os modelos
__all__ = [
    "Base",
    "Usuario",
    "Distrito",
    "Igreja",
    "Membro",
    "Pregador",
    "Tema",
    "Escala",
    "SlotEscala",
    "Conflito",
    "GeracaoEscala",
    "Notificacao",
    "MensagemWhatsApp",
]
