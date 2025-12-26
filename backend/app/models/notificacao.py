"""
Model de Notificação
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.models.base import Base


class TipoNotificacao(str, enum.Enum):
    ESCALA_PUBLICADA = "ESCALA_PUBLICADA"
    LEMBRETE_7D = "LEMBRETE_7D"
    LEMBRETE_3D = "LEMBRETE_3D"
    LEMBRETE_24H = "LEMBRETE_24H"
    CONFIRMACAO = "CONFIRMACAO"
    TROCA = "TROCA"
    AVALIACAO = "AVALIACAO"
    PENALIDADE = "PENALIDADE"
    AUTO_CADASTRO_APROVADO = "AUTO_CADASTRO_APROVADO"
    AUTO_CADASTRO_RECUSADO = "AUTO_CADASTRO_RECUSADO"
    AUTO_CADASTRO_PENDENTE = "AUTO_CADASTRO_PENDENTE"
    SISTEMA = "SISTEMA"  # Notificações de sistema (indisponibilidades, etc)


class Notificacao(Base):
    __tablename__ = "notificacao"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(SQLEnum(TipoNotificacao), nullable=False)
    titulo = Column(String(255), nullable=False)
    mensagem = Column(Text, nullable=False)
    link = Column(Text)
    lida = Column(Boolean, default=False)
    
    # Status de envio por canal
    enviada_email = Column(Boolean, default=False)
    enviada_sms = Column(Boolean, default=False)
    enviada_whatsapp = Column(Boolean, default=False)
    
    data_envio_email = Column(DateTime(timezone=True))
    data_envio_sms = Column(DateTime(timezone=True))
    data_envio_whatsapp = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    usuario = relationship("Usuario", back_populates="notificacoes")
    logs = relationship("LogNotificacao", back_populates="notificacao", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Notificacao(id={self.id}, tipo={self.tipo}, lida={self.lida})>"
