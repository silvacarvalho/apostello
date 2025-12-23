"""
Model de Preferência de Notificação
"""
from sqlalchemy import Column, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base


class PreferenciaNotificacao(Base):
    __tablename__ = "preferencia_notificacao"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Preferências de notificação
    novas_escalas = Column(Boolean, default=True, nullable=False)
    escalas_atribuidas = Column(Boolean, default=True, nullable=False)
    lembretes = Column(Boolean, default=True, nullable=False)
    avaliacoes = Column(Boolean, default=True, nullable=False)
    trocas_escalas = Column(Boolean, default=True, nullable=False)
    substituicoes = Column(Boolean, default=True, nullable=False)
    
    # Canais de notificação
    email = Column(Boolean, default=True, nullable=False)
    push = Column(Boolean, default=True, nullable=False)
    whatsapp = Column(Boolean, default=False, nullable=False)
    
    # Auditoria
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    usuario = relationship("Usuario", back_populates="preferencia_notificacao")

    def __repr__(self):
        return f"<PreferenciaNotificacao(usuario_id={self.usuario_id})>"
