"""
Model de Organização
"""
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base


class Organizacao(Base):
    __tablename__ = "organizacao"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    cnpj = Column(String(18), unique=True, index=True)
    logo_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    distritos = relationship("Distrito", back_populates="organizacao", cascade="all, delete-orphan")
    temas = relationship("Tema", back_populates="organizacao", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Organizacao(id={self.id}, nome='{self.nome}')>"
