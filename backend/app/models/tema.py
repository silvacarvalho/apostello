"""
Model de Tema
"""
from sqlalchemy import (
    Column, Integer, String, Text, ForeignKey, DateTime, Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.models.base import Base


class TipoRecorrenciaTema(str, enum.Enum):
    SEMANAL_MES = "SEMANAL_MES"
    PERIODO_ESPECIFICO = "PERIODO_ESPECIFICO"
    ANUAL = "ANUAL"


class StatusGeral(str, enum.Enum):
    ATIVO = "ATIVO"
    INATIVO = "INATIVO"


class Tema(Base):
    __tablename__ = "tema"

    id = Column(Integer, primary_key=True, index=True)
    organizacao_id = Column(Integer, ForeignKey("organizacao.id", ondelete="CASCADE"), nullable=False)
    titulo = Column(String(255), nullable=False)
    descricao = Column(Text)
    tipo_recorrencia = Column(SQLEnum(TipoRecorrenciaTema), nullable=False)
    config_recorrencia = Column(JSONB, nullable=False)
    ano_aplicacao = Column(Integer)
    status = Column(SQLEnum(StatusGeral), default=StatusGeral.ATIVO)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organizacao = relationship("Organizacao", back_populates="temas")
    itens_escala = relationship("ItemEscala", back_populates="tema")

    def __repr__(self):
        return f"<Tema(id={self.id}, titulo='{self.titulo}')>"
