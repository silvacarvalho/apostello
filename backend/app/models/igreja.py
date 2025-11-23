"""
Model: Igreja
"""

from sqlalchemy import Column, String, Boolean, Integer, Text, ForeignKey, Sequence
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base
from .mixins import TimestampMixin


class Igreja(Base, TimestampMixin):
    """Igrejas locais pertencentes a um distrito"""

    __tablename__ = "igrejas"

    # Chaves
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(Integer, Sequence('igrejas_codigo_seq'), unique=True, nullable=False)
    distrito_id = Column(UUID(as_uuid=True), ForeignKey("distritos.id", ondelete="CASCADE"), nullable=False)

    # Dados da igreja
    nome = Column(String(200), nullable=False)
    endereco = Column(Text)
    cidade = Column(String(100))
    estado = Column(String(50))
    cep = Column(String(20))
    telefone = Column(String(20))
    email = Column(String(100))
    capacidade = Column(Integer)
    tem_som = Column(Boolean, default=True)
    tem_projecao = Column(Boolean, default=True)
    observacoes = Column(Text)

    # Controle
    ativo = Column(Boolean, default=True)

    # Relacionamentos
    distrito = relationship("Distrito", back_populates="igrejas")
    usuarios = relationship("Usuario", back_populates="igreja")
    pregacoes = relationship("Pregacao", back_populates="igreja", cascade="all, delete-orphan")
    horarios_cultos = relationship("HorarioCulto", back_populates="igreja")
    configuracoes = relationship("Configuracao", back_populates="igreja")

    def __repr__(self):
        return f"<Igreja {self.nome}>"
