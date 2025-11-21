"""
Modelos de Notificações e WhatsApp
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Notificacao(Base):
    """Modelo de Notificação para usuários"""
    __tablename__ = "notificacoes"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo_notificacao = Column(String(30), nullable=False)  # ESCALA_PUBLICADA, SLOT_DESIGNADO, SLOT_ALTERADO, LEMBRETE, SUGESTAO_TEMA
    canal = Column(String(20), nullable=False)  # WHATSAPP, EMAIL, PUSH
    titulo = Column(String(200), nullable=False)
    mensagem = Column(Text, nullable=False)
    status = Column(String(20), default='PENDENTE', nullable=False)  # PENDENTE, ENVIADA, FALHOU, LIDA
    escala_id = Column(Integer, ForeignKey("escalas.id"))
    slot_id = Column(Integer, ForeignKey("slots_escala.id"))
    mensagem_erro = Column(Text)
    criado_em = Column(DateTime, default=datetime.utcnow)
    enviado_em = Column(DateTime)
    lido_em = Column(DateTime)
    
    # Relacionamentos
    usuario = relationship("Usuario", back_populates="notificacoes")
    escala = relationship("Escala", back_populates="notificacoes")
    slot = relationship("SlotEscala", back_populates="notificacoes")
    mensagem_whatsapp = relationship("MensagemWhatsApp", back_populates="notificacao", uselist=False)
    
    def __repr__(self):
        return f"<Notificacao {self.tipo_notificacao} - {self.status}>"


class MensagemWhatsApp(Base):
    """Modelo de Mensagem do WhatsApp"""
    __tablename__ = "mensagens_whatsapp"
    
    id = Column(Integer, primary_key=True, index=True)
    notificacao_id = Column(Integer, ForeignKey("notificacoes.id"), nullable=False, unique=True)
    numero_destino = Column(String(20), nullable=False)
    message_sid = Column(String(100))  # ID da mensagem no Twilio
    status_twilio = Column(String(50))
    criado_em = Column(DateTime, default=datetime.utcnow)
    entregue_em = Column(DateTime)
    
    # Relacionamentos
    notificacao = relationship("Notificacao", back_populates="mensagem_whatsapp")
    
    def __repr__(self):
        return f"<MensagemWhatsApp para {self.numero_destino} - {self.status_twilio}>"
