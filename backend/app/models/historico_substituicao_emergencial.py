"""
Model de Histórico de Substituição Emergencial
"""
from sqlalchemy import Column, Integer, Numeric, Text, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base


class HistoricoSubstituicaoEmergencial(Base):
    __tablename__ = "historico_substituicao_emergencial"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    item_escala_id = Column(Integer, ForeignKey("item_escala.id", ondelete="CASCADE"), nullable=False)
    usuario_substituido_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    igreja_id = Column(Integer, ForeignKey("igreja.id", ondelete="CASCADE"), nullable=False)
    data_culto = Column(Date, nullable=False)
    horario_aceitacao = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    motivo_emergencia = Column(Text, nullable=False)
    pontos_ganhos = Column(Numeric(5, 2), default=5.00)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    usuario_substituido = relationship("Usuario", foreign_keys=[usuario_substituido_id])
    item_escala = relationship("ItemEscala")
    igreja = relationship("Igreja")

    def __repr__(self):
        return f"<HistoricoSubstituicaoEmergencial(id={self.id}, usuario_id={self.usuario_id})>"
