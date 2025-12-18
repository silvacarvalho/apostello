"""
Model de Histórico de Score
"""
from sqlalchemy import Column, Integer, Numeric, Text, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.models.base import Base


class MotivoScore(str, enum.Enum):
    AVALIACAO = "AVALIACAO"
    PENALIDADE = "PENALIDADE"
    BONUS = "BONUS"
    AJUSTE_MANUAL = "AJUSTE_MANUAL"


class HistoricoScore(Base):
    __tablename__ = "historico_score"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    score_anterior = Column(Numeric(5, 2), nullable=False)
    score_novo = Column(Numeric(5, 2), nullable=False)
    delta = Column(Numeric(5, 2), nullable=False)
    motivo_tipo = Column(SQLEnum(MotivoScore), nullable=False)
    referencia_id = Column(Integer)  # ID genérico (avaliacao_id, penalidade_id, etc)
    descricao = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    usuario = relationship("Usuario", back_populates="historico_score")

    def __repr__(self):
        return f"<HistoricoScore(usuario_id={self.usuario_id}, delta={self.delta})>"
