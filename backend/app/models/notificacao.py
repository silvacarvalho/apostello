"""
Model: Notificacao
"""

from sqlalchemy import Column, String, Text, Integer, ForeignKey, Enum as SQLEnum, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
import enum

from app.core.database import Base
from .mixins import TimestampMixinSimples


class TipoNotificacao(str, enum.Enum):
    """Enum de tipos de notificação"""
    WHATSAPP = "whatsapp"
    SMS = "sms"
    PUSH = "push"
    EMAIL = "email"


class StatusNotificacao(str, enum.Enum):
    """Enum de status de notificação"""
    PENDENTE = "pendente"
    ENVIADO = "enviado"
    FALHOU = "falhou"
    ENTREGUE = "entregue"
    LIDO = "lido"


class Notificacao(Base, TimestampMixinSimples):
    """Sistema de notificações WhatsApp/SMS/Push/Email"""

    __tablename__ = "notificacoes"

    # Chaves
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)

    # Tipo e status
    tipo = Column(String(50), nullable=False)  # Mantendo como string por compatibilidade
    status = Column(String(50), default="pendente")  # Mantendo como string por compatibilidade

    # Conteúdo
    titulo = Column(String(200), nullable=False)
    mensagem = Column(Text, nullable=False)
    
    # Dados extras em formato JSON para informações adicionais
    dados_extra = Column(JSONB, default=dict)

    # IDs de mensagens por tipo
    id_mensagem_whatsapp = Column(String(100))
    id_mensagem_sms = Column(String(100))
    id_mensagem_push = Column(String(100))
    id_mensagem_email = Column(String(100))

    # Relacionamentos
    pregacao_id = Column(UUID(as_uuid=True), ForeignKey("pregacoes.id", ondelete="SET NULL"))
    troca_id = Column(UUID(as_uuid=True), ForeignKey("trocas_escalas.id", ondelete="SET NULL"))

    # Controle de envio
    agendado_para = Column(DateTime(timezone=True))
    enviado_em = Column(DateTime(timezone=True))
    entregue_em = Column(DateTime(timezone=True))
    lido_em = Column(DateTime(timezone=True))
    falhou_em = Column(DateTime(timezone=True))
    motivo_falha = Column(Text)

    # Retentativas
    tentativas = Column(Integer, default=0)
    max_tentativas = Column(Integer, default=3)

    # Relacionamentos
    usuario = relationship("Usuario", back_populates="notificacoes")
    pregacao = relationship("Pregacao", back_populates="notificacoes")
    troca = relationship("TrocaEscala", back_populates="notificacoes")

    def __repr__(self):
        return f"<Notificacao {self.tipo} Usuario={self.usuario_id} Status={self.status}>"
