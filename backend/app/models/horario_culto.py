"""
Model: HorarioCulto
"""

from sqlalchemy import Column, String, Boolean, Integer, Time, ForeignKey, Enum as SQLEnum, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum

from app.core.database import Base
from .mixins import TimestampMixin


class DiaSemana(str, enum.Enum):
    """Enum de dias da semana"""
    DOMINGO = "domingo"
    SEGUNDA = "segunda"
    TERCA = "terca"
    QUARTA = "quarta"
    QUINTA = "quinta"
    SEXTA = "sexta"
    SABADO = "sabado"


class HorarioCulto(Base, TimestampMixin):
    """Horários de cultos por distrito ou igreja específica"""

    __tablename__ = "horarios_cultos"

    # Chaves
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    distrito_id = Column(UUID(as_uuid=True), ForeignKey("distritos.id", ondelete="CASCADE"), nullable=True)
    igreja_id = Column(UUID(as_uuid=True), ForeignKey("igrejas.id", ondelete="CASCADE"), nullable=True)

    # Dados do horário
    dia_semana = Column(SQLEnum(DiaSemana, name="dia_semana", create_type=False), nullable=False)
    horario = Column(Time, nullable=False)
    nome_culto = Column(String(100))  # Ex: Escola Sabatina, Culto Divino
    duracao_minutos = Column(Integer, default=120)
    requer_pregador = Column(Boolean, default=True)

    # Controle
    ativo = Column(Boolean, default=True)

    # Constraint: OU distrito OU igreja (não ambos)
    __table_args__ = (
        CheckConstraint(
            "(distrito_id IS NOT NULL AND igreja_id IS NULL) OR (distrito_id IS NULL AND igreja_id IS NOT NULL)",
            name="chk_horario_escopo"
        ),
    )

    # Relacionamentos
    distrito = relationship("Distrito", back_populates="horarios_cultos")
    igreja = relationship("Igreja", back_populates="horarios_cultos")

    def __repr__(self):
        escopo = f"Distrito {self.distrito_id}" if self.distrito_id else f"Igreja {self.igreja_id}"
        return f"<HorarioCulto {escopo} {self.dia_semana} {self.horario}>"
