"""
Model de Solicitação de Troca
"""
from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.models.base import Base


class TipoAvaliado(str, enum.Enum):
    PREGADOR = "PREGADOR"
    CANTOR = "CANTOR"


class StatusSolicitacaoTroca(str, enum.Enum):
    PENDENTE_SUBSTITUTO = "PENDENTE_SUBSTITUTO"
    PENDENTE_PASTOR = "PENDENTE_PASTOR"
    APROVADA = "APROVADA"
    RECUSADA = "RECUSADA"


class SolicitacaoTroca(Base):
    __tablename__ = "solicitacao_troca"

    id = Column(Integer, primary_key=True, index=True)
    item_escala_id = Column(Integer, ForeignKey("item_escala.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(SQLEnum(TipoAvaliado), nullable=False)
    solicitante_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    substituto_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    motivo = Column(Text, nullable=False)
    status = Column(SQLEnum(StatusSolicitacaoTroca), default=StatusSolicitacaoTroca.PENDENTE_SUBSTITUTO)
    data_resposta_substituto = Column(DateTime(timezone=True))
    data_resposta_pastor = Column(DateTime(timezone=True))
    pastor_id = Column(Integer, ForeignKey("usuario.id", ondelete="SET NULL"))
    observacao_pastor = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    item_escala = relationship("ItemEscala", back_populates="solicitacoes_troca")
    solicitante = relationship("Usuario", foreign_keys=[solicitante_id])
    substituto = relationship("Usuario", foreign_keys=[substituto_id])
    pastor = relationship("Usuario", foreign_keys=[pastor_id])

    def __repr__(self):
        return f"<SolicitacaoTroca(id={self.id}, status={self.status})>"
