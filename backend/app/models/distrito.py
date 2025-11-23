"""
Model: Distrito
"""

from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Sequence
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base
from .mixins import TimestampMixin


class Distrito(Base, TimestampMixin):
    """Distritos pertencentes a uma Associação"""

    __tablename__ = "distritos"

    # Chaves
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(Integer, Sequence('distritos_codigo_seq'), unique=True, nullable=False)
    associacao_id = Column(UUID(as_uuid=True), ForeignKey("associacoes.id", ondelete="CASCADE"), nullable=False)

    # Dados do distrito
    nome = Column(String(200), nullable=False)
    codigo_distrito = Column(String(50))
    regiao = Column(String(100))

    # Controle
    ativo = Column(Boolean, default=True)

    # Relacionamentos
    associacao = relationship("Associacao", back_populates="distritos")
    igrejas = relationship("Igreja", back_populates="distrito", cascade="all, delete-orphan")
    usuarios = relationship("Usuario", back_populates="distrito")
    escalas = relationship("Escala", back_populates="distrito", cascade="all, delete-orphan")
    horarios_cultos = relationship("HorarioCulto", back_populates="distrito")
    configuracoes = relationship("Configuracao", back_populates="distrito")

    def __repr__(self):
        return f"<Distrito {self.nome}>"
