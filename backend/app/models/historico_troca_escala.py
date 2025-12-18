"""
Model de Histórico de Troca de Escala
"""
from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.models.base import Base


class TipoAcaoTroca(str, enum.Enum):
    SOLICITOU_TROCA = "SOLICITOU_TROCA"
    ACEITOU_TROCA = "ACEITOU_TROCA"
    RECUSOU_TROCA = "RECUSOU_TROCA"
    SUBSTITUICAO_EMERGENCIAL = "SUBSTITUICAO_EMERGENCIAL"


class HistoricoTrocaEscala(Base):
    __tablename__ = "historico_troca_escala"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    item_escala_original_id = Column(Integer, ForeignKey("item_escala.id", ondelete="SET NULL"))
    item_escala_novo_id = Column(Integer, ForeignKey("item_escala.id", ondelete="SET NULL"))
    tipo_acao = Column(SQLEnum(TipoAcaoTroca), nullable=False)
    outro_usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"))
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    motivo = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    outro_usuario = relationship("Usuario", foreign_keys=[outro_usuario_id])
    item_escala_original = relationship("ItemEscala", foreign_keys=[item_escala_original_id])
    item_escala_novo = relationship("ItemEscala", foreign_keys=[item_escala_novo_id])

    def __repr__(self):
        return f"<HistoricoTrocaEscala(id={self.id}, tipo={self.tipo_acao})>"
