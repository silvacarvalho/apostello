"""
Model de Log de Notificação
"""
from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.models.base import Base


class CanalNotificacao(str, enum.Enum):
    EMAIL = "EMAIL"
    SMS = "SMS"
    WHATSAPP = "WHATSAPP"


class StatusEnvio(str, enum.Enum):
    ENVIADO = "ENVIADO"
    FALHA = "FALHA"
    PENDENTE = "PENDENTE"


class LogNotificacao(Base):
    __tablename__ = "log_notificacao"

    id = Column(Integer, primary_key=True, index=True)
    notificacao_id = Column(Integer, ForeignKey("notificacao.id", ondelete="CASCADE"), nullable=False)
    canal = Column(SQLEnum(CanalNotificacao), nullable=False)
    status = Column(SQLEnum(StatusEnvio), nullable=False)
    erro_mensagem = Column(Text)
    tentativas = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    notificacao = relationship("Notificacao", back_populates="logs")

    def __repr__(self):
        return f"<LogNotificacao(id={self.id}, canal={self.canal}, status={self.status})>"
