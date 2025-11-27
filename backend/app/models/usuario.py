"""
Model: Usuario
"""

from sqlalchemy import Column, String, Boolean, Integer, Date, ForeignKey, ARRAY, Enum as SQLEnum, DateTime, Sequence, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum

from app.core.database import Base
from .mixins import TimestampMixin


class PerfilUsuario(str, enum.Enum):
    """Enum de perfis de usuário"""
    MEMBRO_ASSOCIACAO = "membro_associacao"
    PASTOR_DISTRITAL = "pastor_distrital"
    LIDER_DISTRITAL = "lider_distrital"
    PREGADOR = "pregador"
    AVALIADOR = "avaliador"


class StatusAprovacao(str, enum.Enum):
    """Enum de status de aprovação"""
    PENDENTE = "pendente"
    APROVADO = "aprovado"
    REJEITADO = "rejeitado"


class Usuario(Base, TimestampMixin):
    """Usuários do sistema com múltiplos perfis possíveis"""

    __tablename__ = "usuarios"

    # Chaves
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(Integer, Sequence('usuarios_codigo_seq'), unique=True, nullable=False)

    # Relacionamentos organizacionais
    associacao_id = Column(UUID(as_uuid=True), ForeignKey("associacoes.id", ondelete="SET NULL"), nullable=True)
    distrito_id = Column(UUID(as_uuid=True), ForeignKey("distritos.id", ondelete="SET NULL"), nullable=True)
    igreja_id = Column(UUID(as_uuid=True), ForeignKey("igrejas.id", ondelete="SET NULL"), nullable=True)

    # Dados de acesso
    email = Column(String(150), unique=True, nullable=False, index=True)
    telefone = Column(String(20))
    whatsapp = Column(String(20))
    senha_hash = Column(String(255), nullable=False)

    # Dados pessoais
    nome_completo = Column(String(200), nullable=False)
    cpf = Column(String(14), unique=True, index=True)
    data_nascimento = Column(Date)
    genero = Column(String(20))
    url_foto = Column(Text)

    # Perfis de acesso (array de ENUMs)
    perfis = Column(
        ARRAY(SQLEnum(PerfilUsuario, name="perfil_usuario", create_type=False, values_callable=lambda x: [e.value for e in x])),
        nullable=False,
        default=[PerfilUsuario.PREGADOR]
    )

    # Status de aprovação
    status_aprovacao = Column(
        SQLEnum(StatusAprovacao, name="status_aprovacao", create_type=False, values_callable=lambda x: [e.value for e in x]),
        default=StatusAprovacao.PENDENTE
    )
    aprovado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    aprovado_em = Column(DateTime(timezone=True))

    # Configurações de notificação
    notif_whatsapp = Column(Boolean, default=True)
    notif_sms = Column(Boolean, default=False)
    notif_push = Column(Boolean, default=True)
    notif_email = Column(Boolean, default=True)

    # Controle
    ativo = Column(Boolean, default=True)
    ultimo_login_em = Column(DateTime(timezone=True))

    # Relacionamentos
    associacao = relationship("Associacao", back_populates="usuarios", foreign_keys=[associacao_id])
    distrito = relationship("Distrito", back_populates="usuarios", foreign_keys=[distrito_id])
    igreja = relationship("Igreja", back_populates="usuarios", foreign_keys=[igreja_id])

    # Auto-referência para aprovação
    aprovador = relationship("Usuario", remote_side=[id], foreign_keys=[aprovado_por])

    # Perfil de pregador (1:1)
    perfil_pregador = relationship("PerfilPregador", back_populates="usuario", uselist=False, cascade="all, delete-orphan")

    # Pregações
    pregacoes = relationship("Pregacao", back_populates="pregador", foreign_keys="[Pregacao.pregador_id]")

    # Avaliações (feitas e recebidas)
    avaliacoes_feitas = relationship("Avaliacao", back_populates="avaliador", foreign_keys="[Avaliacao.avaliador_id]")
    avaliacoes_recebidas = relationship("Avaliacao", back_populates="pregador", foreign_keys="[Avaliacao.pregador_id]")

    # Notificações
    notificacoes = relationship("Notificacao", back_populates="usuario", cascade="all, delete-orphan")

    # Trocas de escala
    trocas_solicitadas = relationship("TrocaEscala", back_populates="usuario_solicitante", foreign_keys="[TrocaEscala.usuario_solicitante_id]")
    trocas_recebidas = relationship("TrocaEscala", back_populates="usuario_destinatario", foreign_keys="[TrocaEscala.usuario_destinatario_id]")

    # Períodos de indisponibilidade
    periodos_indisponibilidade = relationship("PeriodoIndisponibilidade", back_populates="pregador", cascade="all, delete-orphan")

    # Configurações
    configuracoes = relationship("Configuracao", back_populates="usuario")

    # Logs de auditoria
    logs_auditoria = relationship("LogAuditoria", back_populates="usuario")

    def __repr__(self):
        return f"<Usuario {self.nome_completo} ({self.email})>"

    def tem_perfil(self, perfil: PerfilUsuario) -> bool:
        """Verifica se o usuário tem um perfil específico"""
        return perfil in (self.perfis or [])

    def is_aprovado(self) -> bool:
        """Verifica se o usuário está aprovado"""
        return self.status_aprovacao == StatusAprovacao.APROVADO
