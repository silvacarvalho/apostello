"""
Modelos principais: Distrito, Igreja, Membro, Pregador, Tema
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Distrito(Base):
    """Modelo de Distrito - região administrativa"""
    __tablename__ = "distritos"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    descricao = Column(Text)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    igrejas = relationship("Igreja", back_populates="distrito")
    
    def __repr__(self):
        return f"<Distrito {self.nome}>"


class Igreja(Base):
    """Modelo de Igreja dentro de um distrito"""
    __tablename__ = "igrejas"
    
    id = Column(Integer, primary_key=True, index=True)
    distrito_id = Column(Integer, ForeignKey("distritos.id"), nullable=False)
    nome = Column(String(200), nullable=False)
    endereco = Column(Text)
    cidade = Column(String(100), nullable=False)
    estado = Column(String(2), nullable=False)
    telefone = Column(String(20))
    email = Column(String(100))
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    distrito = relationship("Distrito", back_populates="igrejas")
    membros = relationship("Membro", back_populates="igreja")
    escalas = relationship("Escala", back_populates="igreja")
    
    def __repr__(self):
        return f"<Igreja {self.nome}>"


class Membro(Base):
    """Modelo de Membro da igreja"""
    __tablename__ = "membros"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, unique=True)
    igreja_id = Column(Integer, ForeignKey("igrejas.id"), nullable=False)
    cargo = Column(String(20), default='MEMBRO')  # PASTOR, LIDER, PREGADOR, MEMBRO
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    usuario = relationship("Usuario", back_populates="membro")
    igreja = relationship("Igreja", back_populates="membros")
    pregador = relationship("Pregador", back_populates="membro", uselist=False)
    
    def __repr__(self):
        return f"<Membro {self.usuario.nome if self.usuario else 'N/A'}>"


class Pregador(Base):
    """Modelo de Pregador - pessoa que prega"""
    __tablename__ = "pregadores"
    
    id = Column(Integer, primary_key=True, index=True)
    membro_id = Column(Integer, ForeignKey("membros.id"), nullable=False, unique=True)
    score = Column(Integer, default=0, nullable=False, index=True)
    notas_disponibilidade = Column(Text)
    ativo = Column(Boolean, default=True, nullable=False)
    total_pregacoes = Column(Integer, default=0)
    data_ultima_pregacao = Column(Date)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    membro = relationship("Membro", back_populates="pregador")
    slots_designados = relationship("SlotEscala", back_populates="pregador")
    
    def __repr__(self):
        return f"<Pregador {self.membro.usuario.nome if self.membro and self.membro.usuario else 'N/A'} - Score: {self.score}>"


class Tema(Base):
    """Modelo de Tema/Temática para pregações"""
    __tablename__ = "temas"
    
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=False)
    referencias_biblicas = Column(Text)
    categoria = Column(String(100))
    nivel_dificuldade = Column(Integer, default=1)  # 1-5
    ativo = Column(Boolean, default=True, nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    slots_designados = relationship("SlotEscala", back_populates="tema")
    
    def __repr__(self):
        return f"<Tema {self.titulo}>"
