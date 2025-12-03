"""
Model: PeriodoIndisponibilidade
"""

from sqlalchemy import Column, Text, Date, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base
from .mixins import TimestampMixinSimples


class PeriodoIndisponibilidade(Base, TimestampMixinSimples):
    """Períodos de indisponibilidade dos pregadores"""

    __tablename__ = "periodos_indisponibilidade"

    # Chaves
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pregador_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)

    # Período
    data_inicio = Column(Date, nullable=False)
    data_fim = Column(Date, nullable=False)

    # Motivo
    motivo = Column(Text)

    # Controle
    ativo = Column(Boolean, default=True)

    # Constraint: data_fim >= data_inicio
    __table_args__ = (
        CheckConstraint("data_fim >= data_inicio", name="chk_indisponibilidade_datas"),
    )

    # Relacionamentos
    pregador = relationship("Usuario", back_populates="periodos_indisponibilidade")

    def __repr__(self):
        return f"<PeriodoIndisponibilidade {self.pregador_id} {self.data_inicio} a {self.data_fim}>"
