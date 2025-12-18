"""
Model de Item de Escala
"""
from sqlalchemy import (
    Column, Integer, Date, Time, Text, ForeignKey, DateTime, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.models.base import Base


class StatusConfirmacao(str, enum.Enum):
    PENDENTE = "PENDENTE"
    CONFIRMADO = "CONFIRMADO"
    NAO_CONFIRMADO = "NAO_CONFIRMADO"


class StatusRealizacao(str, enum.Enum):
    PENDENTE = "PENDENTE"
    REALIZADO = "REALIZADO"
    CANCELADO = "CANCELADO"
    FALTA_PREGADOR = "FALTA_PREGADOR"
    FALTA_CANTOR = "FALTA_CANTOR"


class ItemEscala(Base):
    __tablename__ = "item_escala"

    id = Column(Integer, primary_key=True, index=True)
    escala_id = Column(Integer, ForeignKey("escala.id", ondelete="CASCADE"), nullable=False)
    igreja_id = Column(Integer, ForeignKey("igreja.id", ondelete="CASCADE"), nullable=False)
    data_culto = Column(Date, nullable=False)
    horario = Column(Time, nullable=False)
    
    # Escalados
    pregador_id = Column(Integer, ForeignKey("usuario.id", ondelete="SET NULL"))
    cantor_id = Column(Integer, ForeignKey("usuario.id", ondelete="SET NULL"))
    
    # Tema
    tema_id = Column(Integer, ForeignKey("tema.id", ondelete="SET NULL"))
    tema_customizado = Column(Text)
    
    # Confirmações
    status_confirmacao_pregador = Column(SQLEnum(StatusConfirmacao), default=StatusConfirmacao.PENDENTE)
    status_confirmacao_cantor = Column(SQLEnum(StatusConfirmacao), default=StatusConfirmacao.PENDENTE)
    data_confirmacao_pregador = Column(DateTime(timezone=True))
    data_confirmacao_cantor = Column(DateTime(timezone=True))
    
    # Realização
    status_realizacao = Column(SQLEnum(StatusRealizacao), default=StatusRealizacao.PENDENTE)
    observacoes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    escala = relationship("Escala", back_populates="itens")
    igreja = relationship("Igreja", back_populates="itens_escala")
    pregador = relationship("Usuario", foreign_keys=[pregador_id], back_populates="escalas_como_pregador")
    cantor = relationship("Usuario", foreign_keys=[cantor_id], back_populates="escalas_como_cantor")
    tema = relationship("Tema", back_populates="itens_escala")
    historico = relationship("HistoricoItemEscala", back_populates="item_escala", cascade="all, delete-orphan")
    solicitacoes_troca = relationship("SolicitacaoTroca", back_populates="item_escala", cascade="all, delete-orphan")
    avaliacoes = relationship("Avaliacao", back_populates="item_escala", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ItemEscala(id={self.id}, data={self.data_culto}, igreja_id={self.igreja_id})>"
