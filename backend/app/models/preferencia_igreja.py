"""
Model de Preferência de Igreja
"""
from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base


class PreferenciaIgreja(Base):
    __tablename__ = "preferencia_igreja"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    igreja_id = Column(Integer, ForeignKey("igreja.id", ondelete="CASCADE"), nullable=False)
    ordem = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    usuario = relationship("Usuario", back_populates="preferencias_igreja")
    igreja = relationship("Igreja", back_populates="preferencias")

    def __repr__(self):
        return f"<PreferenciaIgreja(usuario_id={self.usuario_id}, igreja_id={self.igreja_id}, ordem={self.ordem})>"
