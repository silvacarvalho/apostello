"""
Model: Avaliacao
"""

from sqlalchemy import Column, Text, Boolean, ForeignKey, Numeric, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base
from .mixins import TimestampMixinSimples


class Avaliacao(Base, TimestampMixinSimples):
    """Avaliações de pregadores pelos membros"""

    __tablename__ = "avaliacoes"

    # Chaves
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pregacao_id = Column(UUID(as_uuid=True), ForeignKey("pregacoes.id", ondelete="CASCADE"), nullable=False)
    pregador_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    avaliador_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)

    # Avaliação (0-5 estrelas)
    nota = Column(Numeric(2, 1), nullable=False)

    # Critérios individuais (opcional)
    qualidade_conteudo = Column(Numeric(2, 1))
    apresentacao = Column(Numeric(2, 1))
    fundamentacao_biblica = Column(Numeric(2, 1))
    engajamento = Column(Numeric(2, 1))

    # Comentários
    comentarios = Column(Text)

    # Controle
    anonimo = Column(Boolean, default=False)

    # Constraints
    __table_args__ = (
        CheckConstraint("nota >= 0 AND nota <= 5", name="chk_avaliacao_nota"),
        CheckConstraint("qualidade_conteudo IS NULL OR (qualidade_conteudo >= 0 AND qualidade_conteudo <= 5)", name="chk_qualidade_conteudo"),
        CheckConstraint("apresentacao IS NULL OR (apresentacao >= 0 AND apresentacao <= 5)", name="chk_apresentacao"),
        CheckConstraint("fundamentacao_biblica IS NULL OR (fundamentacao_biblica >= 0 AND fundamentacao_biblica <= 5)", name="chk_fundamentacao"),
        CheckConstraint("engajamento IS NULL OR (engajamento >= 0 AND engajamento <= 5)", name="chk_engajamento"),
        UniqueConstraint("pregacao_id", "avaliador_id", name="uk_avaliacao_pregacao_avaliador"),
    )

    # Relacionamentos
    pregacao = relationship("Pregacao", back_populates="avaliacoes")
    pregador = relationship("Usuario", foreign_keys=[pregador_id], back_populates="avaliacoes_recebidas")
    avaliador = relationship("Usuario", foreign_keys=[avaliador_id], back_populates="avaliacoes_feitas")

    def __repr__(self):
        return f"<Avaliacao Pregador={self.pregador_id} Nota={self.nota}>"
