"""
Model de Histórico de Item de Escala
"""
from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.models.base import Base


class AcaoItemEscala(str, enum.Enum):
    CRIACAO = "CRIACAO"
    EDICAO = "EDICAO"
    TROCA = "TROCA"
    CANCELAMENTO = "CANCELAMENTO"
    SUBSTITUICAO = "SUBSTITUICAO"


class HistoricoItemEscala(Base):
    __tablename__ = "historico_item_escala"

    id = Column(Integer, primary_key=True, index=True)
    item_escala_id = Column(Integer, ForeignKey("item_escala.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    acao = Column(SQLEnum(AcaoItemEscala), nullable=False)
    descricao = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    item_escala = relationship("ItemEscala", back_populates="historico")
    usuario = relationship("Usuario")

    def __repr__(self):
        return f"<HistoricoItemEscala(id={self.id}, item_id={self.item_escala_id}, acao={self.acao})>"
