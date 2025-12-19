"""
Model de Escala
"""
from sqlalchemy import (
    Column, Integer, ForeignKey, DateTime, Enum as SQLEnum, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base
from app.models.enums import StatusEscala


class Escala(Base):
    __tablename__ = "escala"
    
    # Índices compostos para consultas frequentes
    __table_args__ = (
        Index('ix_escala_distrito_mes_ano', 'distrito_id', 'mes', 'ano'),
        Index('ix_escala_distrito_status', 'distrito_id', 'status'),
    )

    id = Column(Integer, primary_key=True, index=True)
    distrito_id = Column(Integer, ForeignKey("distrito.id", ondelete="CASCADE"), nullable=False)
    mes = Column(Integer, nullable=False)
    ano = Column(Integer, nullable=False)
    status = Column(SQLEnum(StatusEscala, name='status_escala', create_type=False), default=StatusEscala.RASCUNHO)
    data_publicacao = Column(DateTime(timezone=True))
    pastor_id = Column(Integer, ForeignKey("usuario.id", ondelete="RESTRICT"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    distrito = relationship("Distrito", back_populates="escalas")
    pastor = relationship("Usuario", foreign_keys=[pastor_id])
    itens = relationship("ItemEscala", back_populates="escala", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Escala(id={self.id}, distrito_id={self.distrito_id}, {self.mes}/{self.ano})>"
