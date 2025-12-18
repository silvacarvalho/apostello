"""
Model de Bloqueio Temporário
"""
from sqlalchemy import Column, Integer, Text, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base


class BloqueioTemporario(Base):
    __tablename__ = "bloqueio_temporario"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    pastor_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    data_inicio = Column(Date, nullable=False)
    data_fim = Column(Date, nullable=False)
    motivo = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    usuario = relationship("Usuario", foreign_keys=[usuario_id], back_populates="bloqueios_recebidos")
    pastor = relationship("Usuario", foreign_keys=[pastor_id])

    def __repr__(self):
        return f"<BloqueioTemporario(usuario_id={self.usuario_id}, inicio={self.data_inicio}, fim={self.data_fim})>"
