"""
Model de Distrito
"""
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base
from app.models.enums import StatusGeral


class Distrito(Base):
    __tablename__ = "distrito"

    id = Column(Integer, primary_key=True, index=True)
    organizacao_id = Column(Integer, ForeignKey("organizacao.id", ondelete="CASCADE"), nullable=False)
    nome = Column(String(255), nullable=False)
    descricao = Column(Text)
    pastor_distrital_id = Column(Integer, ForeignKey("usuario.id", ondelete="SET NULL"))
    lider_distrital_id = Column(Integer, ForeignKey("usuario.id", ondelete="SET NULL"))
    
    # Configurações
    config_recorrencia_maxima = Column(Integer, default=3)
    config_intervalo_minimo = Column(Integer, default=7)
    config_usa_preferencia = Column(Boolean, default=False)
    config_exige_confirmacao = Column(Boolean, default=True)
    config_prazo_confirmacao_horas = Column(Integer, default=48)
    config_exige_aprovacao_troca = Column(Boolean, default=True)
    config_prazo_avaliacao_dias = Column(Integer, default=7)
    
    status = Column(SQLEnum(StatusGeral, name='status_geral', create_type=False), default=StatusGeral.ATIVO)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organizacao = relationship("Organizacao", back_populates="distritos")
    pastor_distrital = relationship("Usuario", foreign_keys=[pastor_distrital_id], back_populates="distrito_como_pastor")
    lider_distrital = relationship("Usuario", foreign_keys=[lider_distrital_id], back_populates="distrito_como_lider")
    igrejas = relationship("Igreja", back_populates="distrito", cascade="all, delete-orphan")
    escalas = relationship("Escala", back_populates="distrito", cascade="all, delete-orphan")
    usuarios = relationship("Usuario", foreign_keys="Usuario.distrito_id", back_populates="distrito")
    configuracao = relationship("ConfiguracaoDistrito", back_populates="distrito", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Distrito(id={self.id}, nome='{self.nome}')>"
