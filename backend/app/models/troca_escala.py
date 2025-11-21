"""
Model: TrocaEscala
"""

from sqlalchemy import Column, Text, ForeignKey, Enum as SQLEnum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum

from app.core.database import Base
from .mixins import TimestampMixin


class StatusTroca(str, enum.Enum):
    """Enum de status de troca"""
    PENDENTE_SOLICITANTE = "pendente_solicitante"
    PENDENTE_DESTINATARIO = "pendente_destinatario"
    ACEITA = "aceita"
    REJEITADA = "rejeitada"
    CANCELADA = "cancelada"


class TrocaEscala(Base, TimestampMixin):
    """Solicitações de troca automática entre pregadores"""

    __tablename__ = "trocas_escalas"

    # Chaves
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Pregação do solicitante
    pregacao_solicitante_id = Column(UUID(as_uuid=True), ForeignKey("pregacoes.id", ondelete="CASCADE"), nullable=False)
    usuario_solicitante_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)

    # Pregação do destinatário
    pregacao_destinatario_id = Column(UUID(as_uuid=True), ForeignKey("pregacoes.id", ondelete="CASCADE"), nullable=False)
    usuario_destinatario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)

    # Status
    status = Column(SQLEnum(StatusTroca, name="status_troca", create_type=False), default=StatusTroca.PENDENTE_DESTINATARIO)

    # Justificativa
    motivo_solicitante = Column(Text)

    # Respostas
    aceito_solicitante_em = Column(DateTime(timezone=True))
    aceito_destinatario_em = Column(DateTime(timezone=True))
    rejeitado_em = Column(DateTime(timezone=True))
    motivo_rejeicao = Column(Text)
    rejeitado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"))

    # Finalização
    concluido_em = Column(DateTime(timezone=True))

    # Relacionamentos
    pregacao_solicitante = relationship("Pregacao", foreign_keys=[pregacao_solicitante_id], back_populates="trocas_solicitante")
    usuario_solicitante = relationship("Usuario", foreign_keys=[usuario_solicitante_id], back_populates="trocas_solicitadas")
    pregacao_destinatario = relationship("Pregacao", foreign_keys=[pregacao_destinatario_id], back_populates="trocas_destinatario")
    usuario_destinatario = relationship("Usuario", foreign_keys=[usuario_destinatario_id], back_populates="trocas_recebidas")
    rejeitador = relationship("Usuario", foreign_keys=[rejeitado_por])
    notificacoes = relationship("Notificacao", back_populates="troca")

    def __repr__(self):
        return f"<TrocaEscala {self.status} Solicitante={self.usuario_solicitante_id} Destinatario={self.usuario_destinatario_id}>"
