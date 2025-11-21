"""
Modelos de usuários e autenticação
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Usuario(Base):
    """Modelo de Usuário do sistema"""
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    nome = Column(String(100), nullable=False)
    sobrenome = Column(String(100), nullable=False)
    telefone = Column(String(20))
    whatsapp = Column(String(20))
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    membro = relationship("Membro", back_populates="usuario", uselist=False)
    notificacoes = relationship("Notificacao", back_populates="usuario")
    
    def __repr__(self):
        return f"<Usuario {self.username}>"
