"""
Model de Configuração do Distrito
"""
from sqlalchemy import Column, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.models.base import Base


class ConfiguracaoDistrito(Base):
    """Model de Configuração do Distrito"""
    
    __tablename__ = "configuracao_distrito"
    
    id = Column(Integer, primary_key=True, index=True)
    distrito_id = Column(Integer, ForeignKey("distrito.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Configurações de Escala
    recorrencia_maxima_mes = Column(Integer, default=3, nullable=False)
    intervalo_minimo_dias = Column(Integer, default=7, nullable=False)
    sistema_preferencias_habilitado = Column(Boolean, default=True, nullable=False)
    
    # Configurações de Avaliação
    prazo_avaliacao_dias = Column(Integer, default=7, nullable=False)
    
    # Configurações de Confirmação
    confirmacao_obrigatoria = Column(Boolean, default=True, nullable=False)
    prazo_confirmacao_horas = Column(Integer, default=48, nullable=False)
    
    # Configurações de Trocas
    permitir_trocas = Column(Boolean, default=True, nullable=False)
    aprovar_trocas_obrigatorio = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relacionamentos
    distrito = relationship("Distrito", back_populates="configuracao")
