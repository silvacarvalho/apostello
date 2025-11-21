"""
Model: PerfilPregador
"""

from sqlalchemy import Column, String, Integer, Date, Text, Boolean, ARRAY, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base
from .mixins import TimestampMixin


class PerfilPregador(Base, TimestampMixin):
    """Perfil estendido para usuários pregadores"""

    __tablename__ = "perfis_pregadores"

    # Chaves
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Informações do pregador
    tipo_ordenacao = Column(String(50))  # Ancião, Pastor, Evangelista, etc
    data_ordenacao = Column(Date)
    anos_experiencia = Column(Integer)

    # Score de pregador (0-5)
    score_medio = Column(Numeric(3, 2), default=0.00)
    score_avaliacoes = Column(Numeric(3, 2), default=0.00)
    score_frequencia = Column(Numeric(3, 2), default=0.00)
    score_pontualidade = Column(Numeric(3, 2), default=0.00)

    # Estatísticas
    total_pregacoes = Column(Integer, default=0)
    pregacoes_realizadas = Column(Integer, default=0)
    pregacoes_faltou = Column(Integer, default=0)
    pregacoes_recusadas = Column(Integer, default=0)

    # Taxas (0-100%)
    taxa_frequencia = Column(Numeric(5, 2), default=100.00)
    taxa_pontualidade = Column(Numeric(5, 2), default=100.00)

    # Preferências
    max_pregacoes_mes = Column(Integer, default=4)
    horarios_preferidos = Column(ARRAY(Text))

    # Observações
    observacoes = Column(Text)

    # Controle
    ativo = Column(Boolean, default=True)

    # Relacionamentos
    usuario = relationship("Usuario", back_populates="perfil_pregador")

    def __repr__(self):
        return f"<PerfilPregador usuario_id={self.usuario_id} score={self.score_medio}>"
