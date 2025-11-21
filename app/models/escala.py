"""
Modelos de Escalas, Slots e Conflitos
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Date, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Escala(Base):
    """Modelo de Escala de pregação"""
    __tablename__ = "escalas"
    
    id = Column(Integer, primary_key=True, index=True)
    igreja_id = Column(Integer, ForeignKey("igrejas.id"), nullable=False)
    titulo = Column(String(200), nullable=False)
    mes = Column(Integer, nullable=False)  # 1-12
    ano = Column(Integer, nullable=False)
    status = Column(String(20), default='RASCUNHO', nullable=False)  # RASCUNHO, PUBLICADO, ENVIADO, CONCLUIDO
    gerada_automaticamente = Column(Boolean, default=False)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    publicado_em = Column(DateTime)
    
    # Relacionamentos
    igreja = relationship("Igreja", back_populates="escalas")
    slots = relationship("SlotEscala", back_populates="escala", cascade="all, delete-orphan")
    geracoes = relationship("GeracaoEscala", back_populates="escala")
    notificacoes = relationship("Notificacao", back_populates="escala")
    
    def __repr__(self):
        return f"<Escala {self.titulo} - {self.mes}/{self.ano}>"


class SlotEscala(Base):
    """Modelo de Slot/vaga na escala"""
    __tablename__ = "slots_escala"
    
    id = Column(Integer, primary_key=True, index=True)
    escala_id = Column(Integer, ForeignKey("escalas.id"), nullable=False)
    data = Column(Date, nullable=False, index=True)
    tipo_slot = Column(String(20), default='PREGACAO', nullable=False)  # PREGACAO, LOUVOR
    pregador_id = Column(Integer, ForeignKey("pregadores.id"))
    tema_id = Column(Integer, ForeignKey("temas.id"))
    observacoes = Column(Text)
    confirmado = Column(Boolean, default=False)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    escala = relationship("Escala", back_populates="slots")
    pregador = relationship("Pregador", back_populates="slots_designados")
    tema = relationship("Tema", back_populates="slots_designados")
    conflitos = relationship("Conflito", back_populates="slot", cascade="all, delete-orphan")
    notificacoes = relationship("Notificacao", back_populates="slot")
    
    def __repr__(self):
        return f"<SlotEscala {self.data} - {self.tipo_slot}>"


class Conflito(Base):
    """Modelo de Conflito de agendamento"""
    __tablename__ = "conflitos"
    
    id = Column(Integer, primary_key=True, index=True)
    slot_id = Column(Integer, ForeignKey("slots_escala.id"), nullable=False)
    tipo_conflito = Column(String(30), nullable=False)  # DATA_INDISPONIVEL, DUPLA_MARCACAO, PREGADOR_INATIVO, OUTRO
    descricao = Column(Text, nullable=False)
    resolvido = Column(Boolean, default=False)
    criado_em = Column(DateTime, default=datetime.utcnow)
    resolvido_em = Column(DateTime)
    
    # Relacionamentos
    slot = relationship("SlotEscala", back_populates="conflitos")
    
    def __repr__(self):
        return f"<Conflito {self.tipo_conflito} - {self.slot.data if self.slot else 'N/A'}>"


class GeracaoEscala(Base):
    """Modelo de histórico de geração de escalas"""
    __tablename__ = "geracoes_escala"
    
    id = Column(Integer, primary_key=True, index=True)
    escala_id = Column(Integer, ForeignKey("escalas.id"), nullable=False)
    versao_algoritmo = Column(String(50), nullable=False)
    parametros = Column(JSON)  # Parâmetros usados na geração
    conflitos_encontrados = Column(Integer, default=0)
    tempo_economizado_estimado = Column(Float, default=0.0)  # em horas
    criado_em = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    escala = relationship("Escala", back_populates="geracoes")
    
    def __repr__(self):
        return f"<GeracaoEscala {self.escala.titulo if self.escala else 'N/A'} - v{self.versao_algoritmo}>"
