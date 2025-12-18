"""
Model de Igreja
"""
from sqlalchemy import (
    Column, Integer, String, Text, ForeignKey, DateTime, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base
from app.models.enums import StatusGeral


class Igreja(Base):
    __tablename__ = "igreja"

    id = Column(Integer, primary_key=True, index=True)
    distrito_id = Column(Integer, ForeignKey("distrito.id", ondelete="CASCADE"), nullable=False)
    nome = Column(String(255), nullable=False)
    endereco_completo = Column(Text)
    telefone = Column(String(20))
    email = Column(String(255))
    status = Column(SQLEnum(StatusGeral), default=StatusGeral.ATIVO)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    distrito = relationship("Distrito", back_populates="igrejas")
    horarios_culto = relationship("HorarioCulto", back_populates="igreja", cascade="all, delete-orphan")
    membros = relationship("Usuario", foreign_keys="Usuario.igreja_id", back_populates="igreja")
    preferencias = relationship("PreferenciaIgreja", back_populates="igreja", cascade="all, delete-orphan")
    itens_escala = relationship("ItemEscala", back_populates="igreja")

    def __repr__(self):
        return f"<Igreja(id={self.id}, nome='{self.nome}')>"
