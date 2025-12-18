"""
Model de Horário de Culto
"""
from sqlalchemy import (
    Column, Integer, Time, Boolean, ForeignKey, DateTime, Enum as SQLEnum, String
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.models.base import Base


class DiaSemana(str, enum.Enum):
    SABADO = "SABADO"
    DOMINGO = "DOMINGO"
    QUARTA = "QUARTA"


class HorarioCulto(Base):
    __tablename__ = "horario_culto"

    id = Column(Integer, primary_key=True, index=True)
    igreja_id = Column(Integer, ForeignKey("igreja.id", ondelete="CASCADE"), nullable=False)
    dia_semana = Column(SQLEnum(DiaSemana), nullable=False)
    horario = Column(Time, nullable=False)
    ativo = Column(Boolean, default=True)
    aplicado_em_lote = Column(Boolean, default=False)
    lote_id = Column(UUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    igreja = relationship("Igreja", back_populates="horarios_culto")

    def __repr__(self):
        return f"<HorarioCulto(id={self.id}, igreja_id={self.igreja_id}, dia={self.dia_semana}, horario={self.horario})>"
