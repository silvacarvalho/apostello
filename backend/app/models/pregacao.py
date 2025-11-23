"""
Model: Pregacao
"""

from sqlalchemy import Column, String, Integer, Text, Date, Time, Boolean, ForeignKey, Enum as SQLEnum, DateTime, Sequence
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum

from app.core.database import Base
from .mixins import TimestampMixin


class StatusPregacao(str, enum.Enum):
    """Enum de status de pregação"""
    AGENDADO = "agendado"
    ACEITO = "aceito"
    RECUSADO = "recusado"
    REALIZADO = "realizado"
    FALTOU = "faltou"


class Pregacao(Base, TimestampMixin):
    """Pregações individuais dentro de uma escala mensal"""

    __tablename__ = "pregacoes"

    # Chaves
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(Integer, Sequence('pregacoes_codigo_seq'), unique=True, nullable=False)
    escala_id = Column(UUID(as_uuid=True), ForeignKey("escalas.id", ondelete="CASCADE"), nullable=False)
    igreja_id = Column(UUID(as_uuid=True), ForeignKey("igrejas.id", ondelete="CASCADE"), nullable=False)
    pregador_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    tematica_id = Column(UUID(as_uuid=True), ForeignKey("tematicas.id", ondelete="SET NULL"))

    # Dados da pregação
    data_pregacao = Column(Date, nullable=False, index=True)
    horario_pregacao = Column(Time, nullable=False)
    nome_culto = Column(String(100))

    # Status
    status = Column(SQLEnum(StatusPregacao, name="status_pregacao", create_type=False), default=StatusPregacao.AGENDADO)

    # Resposta do pregador
    aceito_em = Column(DateTime(timezone=True))
    recusado_em = Column(DateTime(timezone=True))
    motivo_recusa = Column(Text)

    # Confirmação de realização
    realizado_em = Column(DateTime(timezone=True))
    confirmado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"))

    # Observações
    observacoes = Column(Text)
    instrucoes_especiais = Column(Text)

    # Controle de troca
    foi_trocado = Column(Boolean, default=False)
    pregador_original_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"))

    # Relacionamentos
    escala = relationship("Escala", back_populates="pregacoes")
    igreja = relationship("Igreja", back_populates="pregacoes")
    pregador = relationship("Usuario", foreign_keys=[pregador_id], back_populates="pregacoes")
    tematica = relationship("Tematica", back_populates="pregacoes")
    confirmador = relationship("Usuario", foreign_keys=[confirmado_por])
    pregador_original = relationship("Usuario", foreign_keys=[pregador_original_id])
    avaliacoes = relationship("Avaliacao", back_populates="pregacao", cascade="all, delete-orphan")
    trocas_solicitante = relationship("TrocaEscala", foreign_keys="[TrocaEscala.pregacao_solicitante_id]", back_populates="pregacao_solicitante")
    trocas_destinatario = relationship("TrocaEscala", foreign_keys="[TrocaEscala.pregacao_destinatario_id]", back_populates="pregacao_destinatario")
    notificacoes = relationship("Notificacao", back_populates="pregacao")

    def __repr__(self):
        return f"<Pregacao {self.data_pregacao} Igreja {self.igreja_id} Pregador {self.pregador_id}>"
