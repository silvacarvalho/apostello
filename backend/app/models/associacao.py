"""
Model: Associacao
"""

from sqlalchemy import Column, String, Boolean, Text, Integer, Sequence
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base
from .mixins import TimestampMixin


class Associacao(Base, TimestampMixin):
    """Associações da Igreja Adventista"""

    __tablename__ = "associacoes"

    # Chaves
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(Integer, Sequence('associacoes_codigo_seq'), unique=True, nullable=False)

    # Dados da associação
    nome = Column(String(200), nullable=False)
    sigla = Column(String(20))
    endereco = Column(Text)
    cidade = Column(String(100))
    estado = Column(String(50))
    pais = Column(String(50), default="Brasil")
    telefone = Column(String(20))
    email = Column(String(100))
    site = Column(String(200))
    url_logo = Column(String(500))

    # Controle
    ativo = Column(Boolean, default=True)

    # Relacionamentos
    distritos = relationship("Distrito", back_populates="associacao", cascade="all, delete-orphan")
    tematicas = relationship("Tematica", back_populates="associacao", cascade="all, delete-orphan")
    usuarios = relationship("Usuario", back_populates="associacao")
    configuracoes = relationship("Configuracao", back_populates="associacao")

    def __repr__(self):
        return f"<Associacao {self.nome} ({self.sigla})>"
