"""
Model de Avaliação
"""
from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.models.base import Base


class TipoAvaliado(str, enum.Enum):
    PREGADOR = "PREGADOR"
    CANTOR = "CANTOR"


class Avaliacao(Base):
    __tablename__ = "avaliacao"

    id = Column(Integer, primary_key=True, index=True)
    item_escala_id = Column(Integer, ForeignKey("item_escala.id", ondelete="CASCADE"), nullable=False)
    avaliado_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    avaliador_id = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(SQLEnum(TipoAvaliado), nullable=False)
    
    # Critérios (1-5 estrelas)
    criterio_1 = Column(Integer, nullable=False)  # PREGADOR: Conteúdo Bíblico | CANTOR: Técnica Vocal
    criterio_2 = Column(Integer, nullable=False)  # PREGADOR: Comunicação | CANTOR: Interpretação
    criterio_3 = Column(Integer, nullable=False)  # PREGADOR: Tempo | CANTOR: Ministração
    criterio_4 = Column(Integer, nullable=False)  # PREGADOR: Impacto Espiritual | CANTOR: Apresentação
    criterio_5 = Column(Integer, nullable=False)  # Avaliação Geral
    
    # Confirmação de identidade (se o avaliado é realmente quem estava escalado)
    confirmou_identidade = Column(Integer, default=True, nullable=False)  # True/False
    
    comentario = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    item_escala = relationship("ItemEscala", back_populates="avaliacoes")
    avaliado = relationship("Usuario", foreign_keys=[avaliado_id], back_populates="avaliacoes_recebidas")
    avaliador = relationship("Usuario", foreign_keys=[avaliador_id], back_populates="avaliacoes_feitas")

    @property
    def media(self) -> float:
        """Calcula a média das avaliações"""
        return (self.criterio_1 + self.criterio_2 + self.criterio_3 + self.criterio_4 + self.criterio_5) / 5

    def __repr__(self):
        return f"<Avaliacao(id={self.id}, avaliado_id={self.avaliado_id}, media={self.media:.2f})>"
