"""
Model de Itinerário do Pastor
"""
from sqlalchemy import (
    Column, Integer, Text, Date, ForeignKey, DateTime, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base


class ItinerarioPastor(Base):
    """
    Registra em qual igreja o Pastor Distrital estará em determinada data.
    Nesses cultos a escala não sorteia pregador, pois o pastor já estará presente.
    """
    __tablename__ = "itinerario_pastor"
    __table_args__ = (
        UniqueConstraint("igreja_id", "data_culto", name="uq_itinerario_igreja_data"),
    )

    id = Column(Integer, primary_key=True, index=True)
    distrito_id = Column(Integer, ForeignKey("distrito.id", ondelete="CASCADE"), nullable=False, index=True)
    igreja_id = Column(Integer, ForeignKey("igreja.id", ondelete="CASCADE"), nullable=False)
    pastor_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    data_culto = Column(Date, nullable=False, index=True)
    observacoes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    igreja = relationship("Igreja")
    pastor = relationship("Usuario", foreign_keys=[pastor_id])

    def __repr__(self):
        return f"<ItinerarioPastor(igreja_id={self.igreja_id}, data={self.data_culto})>"
