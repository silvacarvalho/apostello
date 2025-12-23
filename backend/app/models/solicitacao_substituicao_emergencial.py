"""
Model de Solicitação de Substituição Emergencial
"""
from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum

from app.models.base import Base


class StatusSubstituicaoEmergencial(str, Enum):
    PENDENTE = "PENDENTE"
    ACEITA = "ACEITA"
    RECUSADA = "RECUSADA"


class SolicitacaoSubstituicaoEmergencial(Base):
    __tablename__ = "solicitacao_substituicao_emergencial"

    id = Column(Integer, primary_key=True, index=True)
    solicitacao_troca_id = Column(Integer, ForeignKey("solicitacao_troca.id", ondelete="CASCADE"), nullable=False)
    item_escala_id = Column(Integer, ForeignKey("item_escala.id", ondelete="CASCADE"), nullable=False)
    substituto_emergencial_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    usuario_substituido_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    pastor_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    igreja_id = Column(Integer, ForeignKey("igreja.id", ondelete="CASCADE"), nullable=False)
    motivo_emergencia = Column(Text, nullable=False)
    observacao_pastor = Column(Text, nullable=True)
    status = Column(SQLEnum(StatusSubstituicaoEmergencial), default=StatusSubstituicaoEmergencial.PENDENTE, nullable=False)
    tipo = Column(Text, nullable=False)  # PREGADOR ou CANTOR
    data_resposta = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    solicitacao_troca = relationship("SolicitacaoTroca")
    item_escala = relationship("ItemEscala")
    substituto_emergencial = relationship("Usuario", foreign_keys=[substituto_emergencial_id])
    usuario_substituido = relationship("Usuario", foreign_keys=[usuario_substituido_id])
    pastor = relationship("Usuario", foreign_keys=[pastor_id])
    igreja = relationship("Igreja")

    def __repr__(self):
        return f"<SolicitacaoSubstituicaoEmergencial(id={self.id}, substituto_emergencial_id={self.substituto_emergencial_id}, status={self.status})>"
