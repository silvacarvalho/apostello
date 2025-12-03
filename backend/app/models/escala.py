"""
Model: Escala
"""

from sqlalchemy import Column, String, Integer, Text, ForeignKey, Enum as SQLEnum, DateTime, CheckConstraint, UniqueConstraint, Sequence
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum

from app.core.database import Base
from .mixins import TimestampMixinSimples


class StatusEscala(str, enum.Enum):
    """Enum de status de escala"""
    RASCUNHO = "rascunho"
    APROVADO = "aprovado"
    FINALIZADO = "finalizado"


class Escala(Base, TimestampMixinSimples):
    """Escalas mensais de pregação por distrito"""

    __tablename__ = "escalas"

    # Chaves
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(Integer, Sequence('escalas_codigo_seq'), unique=True, nullable=False)
    distrito_id = Column(UUID(as_uuid=True), ForeignKey("distritos.id", ondelete="CASCADE"), nullable=False)

    # Período de referência
    mes_referencia = Column(Integer, nullable=False)
    ano_referencia = Column(Integer, nullable=False)

    # Status
    status = Column(String, nullable=False, default="rascunho")

    # Responsáveis
    criado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"))
    aprovado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"))
    finalizado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"))

    # Timestamps específicos
    aprovado_em = Column(DateTime(timezone=True))
    finalizado_em = Column(DateTime(timezone=True))

    # Observações
    observacoes = Column(Text)

    # Constraints
    __table_args__ = (
        CheckConstraint("mes_referencia BETWEEN 1 AND 12", name="chk_mes_valido"),
        CheckConstraint("ano_referencia >= 2024", name="chk_ano_valido"),
        UniqueConstraint("distrito_id", "mes_referencia", "ano_referencia", name="uk_escala_distrito_mes"),
    )

    # Relacionamentos
    distrito = relationship("Distrito", back_populates="escalas")
    criador = relationship("Usuario", foreign_keys=[criado_por])
    aprovador = relationship("Usuario", foreign_keys=[aprovado_por])
    finalizador = relationship("Usuario", foreign_keys=[finalizado_por])
    pregacoes = relationship("Pregacao", back_populates="escala", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Escala {self.mes_referencia}/{self.ano_referencia} Distrito {self.distrito_id}>"
