"""
Model de Usuário - Tabela polimórfica para todos os tipos de usuários
"""
from sqlalchemy import (
    Column, Integer, String, Text, Date, Numeric, Boolean, 
    ForeignKey, DateTime, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base
from app.models.enums import TipoUsuario, StatusGeral, StatusAprovacao


class Usuario(Base):
    __tablename__ = "usuario"

    id = Column(Integer, primary_key=True, index=True)
    nome_completo = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    senha_hash = Column(String(255), nullable=False)
    cpf = Column(String(14), unique=True, nullable=False, index=True)
    telefone = Column(String(20))
    whatsapp = Column(String(20))
    data_nascimento = Column(Date)
    foto_url = Column(Text)
    tipo = Column(SQLEnum(TipoUsuario, name='tipo_usuario', create_type=False), nullable=False)
    
    # Relacionamentos
    distrito_id = Column(Integer, ForeignKey("distrito.id", ondelete="SET NULL"))
    igreja_id = Column(Integer, ForeignKey("igreja.id", ondelete="SET NULL"))
    
    # Dados específicos Pregador/Cantor
    score_atual = Column(Numeric(5, 2), default=70.00)
    contador_mes_atual = Column(Integer, default=0)
    contador_total_participacoes = Column(Integer, default=0)
    contador_faltas = Column(Integer, default=0)
    contador_desmarcacoes = Column(Integer, default=0)
    
    # Habilidades de escalação (para todos os tipos de usuário)
    pode_pregar = Column(Boolean, default=False, nullable=False)
    pode_cantar = Column(Boolean, default=False, nullable=False)
    
    # Status
    status = Column(SQLEnum(StatusGeral, name='status_geral', create_type=False), default=StatusGeral.ATIVO)
    status_aprovacao = Column(SQLEnum(StatusAprovacao, name='status_aprovacao', create_type=False), default=StatusAprovacao.APROVADO)
    data_solicitacao_cadastro = Column(DateTime(timezone=True))
    data_aprovacao = Column(DateTime(timezone=True))
    aprovado_por_id = Column(Integer, ForeignKey("usuario.id", ondelete="SET NULL"))
    motivo_recusa = Column(Text)
    
    # Auditoria
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    ultimo_login = Column(DateTime(timezone=True))

    # Relationships
    distrito = relationship("Distrito", foreign_keys=[distrito_id], back_populates="usuarios")
    igreja = relationship("Igreja", foreign_keys=[igreja_id], back_populates="membros")
    distrito_como_pastor = relationship("Distrito", foreign_keys="Distrito.pastor_distrital_id", back_populates="pastor_distrital")
    distrito_como_lider = relationship("Distrito", foreign_keys="Distrito.lider_distrital_id", back_populates="lider_distrital")
    aprovado_por = relationship("Usuario", remote_side=[id], foreign_keys=[aprovado_por_id])
    
    # Preferências e indisponibilidades
    preferencias_igreja = relationship("PreferenciaIgreja", back_populates="usuario", cascade="all, delete-orphan")
    preferencia_notificacao = relationship("PreferenciaNotificacao", back_populates="usuario", uselist=False, cascade="all, delete-orphan")
    indisponibilidades = relationship("Indisponibilidade", back_populates="usuario", cascade="all, delete-orphan")
    bloqueios_recebidos = relationship("BloqueioTemporario", foreign_keys="BloqueioTemporario.usuario_id", back_populates="usuario")
    
    # Escalas
    escalas_como_pregador = relationship("ItemEscala", foreign_keys="ItemEscala.pregador_id", back_populates="pregador")
    escalas_como_cantor = relationship("ItemEscala", foreign_keys="ItemEscala.cantor_id", back_populates="cantor")
    
    # Avaliações
    avaliacoes_recebidas = relationship("Avaliacao", foreign_keys="Avaliacao.avaliado_id", back_populates="avaliado")
    avaliacoes_feitas = relationship("Avaliacao", foreign_keys="Avaliacao.avaliador_id", back_populates="avaliador")
    
    # Históricos
    historico_score = relationship("HistoricoScore", back_populates="usuario", cascade="all, delete-orphan")
    penalidades = relationship("Penalidade", foreign_keys="Penalidade.usuario_id", back_populates="usuario")
    
    # Notificações
    notificacoes = relationship("Notificacao", back_populates="usuario", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Usuario(id={self.id}, email='{self.email}', tipo={self.tipo})>"

    @property
    def is_admin(self) -> bool:
        return self.tipo == TipoUsuario.ADMIN

    @property
    def is_pastor(self) -> bool:
        return self.tipo in [TipoUsuario.PASTOR_DISTRITAL, TipoUsuario.LIDER_DISTRITAL]

    @property
    def is_pregador_cantor(self) -> bool:
        return self.tipo in [TipoUsuario.PREGADOR, TipoUsuario.CANTOR]
