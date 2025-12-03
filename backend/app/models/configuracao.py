"""
Model: Configuracao
"""

from sqlalchemy import Column, String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base
from .mixins import TimestampMixinSimples


class Configuracao(Base, TimestampMixinSimples):
    """Configurações flexíveis por associação/distrito/igreja/usuário"""

    __tablename__ = "configuracoes"

    # Chaves
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Escopo da configuração (apenas um deve ser preenchido)
    associacao_id = Column(UUID(as_uuid=True), ForeignKey("associacoes.id", ondelete="CASCADE"))
    distrito_id = Column(UUID(as_uuid=True), ForeignKey("distritos.id", ondelete="CASCADE"))
    igreja_id = Column(UUID(as_uuid=True), ForeignKey("igrejas.id", ondelete="CASCADE"))
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"))

    # Dados da configuração
    chave = Column(String(100), nullable=False)
    valor = Column(JSONB, nullable=False)
    descricao = Column(Text)

    # Constraint: uma configuração por escopo e chave
    __table_args__ = (
        UniqueConstraint(
            "associacao_id", "distrito_id", "igreja_id", "usuario_id", "chave",
            name="uk_configuracao_escopo_chave",
            postgresql_nulls_not_distinct=True
        ),
    )

    # Relacionamentos
    associacao = relationship("Associacao", back_populates="configuracoes")
    distrito = relationship("Distrito", back_populates="configuracoes")
    igreja = relationship("Igreja", back_populates="configuracoes")
    usuario = relationship("Usuario", back_populates="configuracoes")

    def __repr__(self):
        escopo = f"Associacao={self.associacao_id}" if self.associacao_id else \
                 f"Distrito={self.distrito_id}" if self.distrito_id else \
                 f"Igreja={self.igreja_id}" if self.igreja_id else \
                 f"Usuario={self.usuario_id}"
        return f"<Configuracao {escopo} chave={self.chave}>"
