"""
Model de Penalidade
"""
from sqlalchemy import Column, Integer, Numeric, Text, Date, Boolean, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.models.base import Base


class TipoPenalidade(str, enum.Enum):
    FALTA_SEM_AVISO = "FALTA_SEM_AVISO"
    DESMARCACAO_SEM_TROCA = "DESMARCACAO_SEM_TROCA"
    DESMARCACAO_48H = "DESMARCACAO_48H"
    ATRASO = "ATRASO"
    CUSTOM = "CUSTOM"


class Penalidade(Base):
    __tablename__ = "penalidade"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    pastor_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(SQLEnum(TipoPenalidade), nullable=False)
    valor_subtracao = Column(Numeric(5, 2), nullable=False)
    motivo = Column(Text, nullable=False)
    data_aplicacao = Column(Date, nullable=False, default=func.current_date())
    data_validade = Column(Date)
    item_escala_id = Column(Integer, ForeignKey("item_escala.id", ondelete="SET NULL"))
    ativa = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    usuario = relationship("Usuario", foreign_keys=[usuario_id], back_populates="penalidades")
    pastor = relationship("Usuario", foreign_keys=[pastor_id])
    item_escala = relationship("ItemEscala")

    def __repr__(self):
        return f"<Penalidade(id={self.id}, usuario_id={self.usuario_id}, tipo={self.tipo})>"
