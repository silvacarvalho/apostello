"""
Model de Indisponibilidade
"""
from sqlalchemy import Column, Integer, Text, Date, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.models.base import Base


class MotivoIndisponibilidade(str, enum.Enum):
    FERIAS = "FERIAS"
    VIAGEM = "VIAGEM"
    COMPROMISSO = "COMPROMISSO"
    SAUDE = "SAUDE"
    OUTRO = "OUTRO"


class Indisponibilidade(Base):
    __tablename__ = "indisponibilidade"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    data_inicio = Column(Date, nullable=False)
    data_fim = Column(Date, nullable=False)
    motivo_tipo = Column(SQLEnum(MotivoIndisponibilidade), nullable=False)
    motivo_descricao = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    usuario = relationship("Usuario", back_populates="indisponibilidades")

    def __repr__(self):
        return f"<Indisponibilidade(usuario_id={self.usuario_id}, inicio={self.data_inicio}, fim={self.data_fim})>"
