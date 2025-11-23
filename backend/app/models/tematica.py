"""
Model: Tematica
"""

from sqlalchemy import Column, String, Integer, Text, Date, Boolean, ForeignKey, Enum as SQLEnum, CheckConstraint, Sequence
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum

from app.core.database import Base
from .mixins import TimestampMixin
from .horario_culto import DiaSemana


class TipoRecorrencia(str, enum.Enum):
    """Enum de tipos de recorrência"""
    DATA_ESPECIFICA = "data_especifica"
    SEMANAL = "semanal"
    MENSAL = "mensal"


class Tematica(Base, TimestampMixin):
    """Temáticas sugestivas de pregação cadastradas pela Associação"""

    __tablename__ = "tematicas"

    # Chaves
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(Integer, Sequence('tematicas_codigo_seq'), unique=True, nullable=False)
    associacao_id = Column(UUID(as_uuid=True), ForeignKey("associacoes.id", ondelete="CASCADE"), nullable=False)
    criado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)

    # Dados da temática
    titulo = Column(String(300), nullable=False)
    descricao = Column(Text)
    referencia_biblica = Column(String(200))

    # Recorrência
    tipo_recorrencia = Column(SQLEnum(TipoRecorrencia, name="tipo_recorrencia", create_type=False), nullable=False)

    # Para recorrência específica
    data_especifica = Column(Date)

    # Para recorrência semanal
    dia_semana_semanal = Column(SQLEnum(DiaSemana, name="dia_semana", create_type=False))

    # Para recorrência mensal
    numero_semana_mes = Column(Integer)  # 1º, 2º, 3º, 4º, 5º
    dia_semana_mensal = Column(SQLEnum(DiaSemana, name="dia_semana", create_type=False))

    # Período de validade
    valido_de = Column(Date)
    valido_ate = Column(Date)

    # Controle
    ativo = Column(Boolean, default=True)

    # Constraints de validação
    __table_args__ = (
        CheckConstraint(
            "tipo_recorrencia != 'data_especifica' OR data_especifica IS NOT NULL",
            name="chk_tematica_data_especifica"
        ),
        CheckConstraint(
            "tipo_recorrencia != 'semanal' OR dia_semana_semanal IS NOT NULL",
            name="chk_tematica_semanal"
        ),
        CheckConstraint(
            "tipo_recorrencia != 'mensal' OR (numero_semana_mes IS NOT NULL AND dia_semana_mensal IS NOT NULL)",
            name="chk_tematica_mensal"
        ),
    )

    # Relacionamentos
    associacao = relationship("Associacao", back_populates="tematicas")
    criador = relationship("Usuario", foreign_keys=[criado_por])
    pregacoes = relationship("Pregacao", back_populates="tematica")

    def __repr__(self):
        return f"<Tematica {self.titulo}>"
