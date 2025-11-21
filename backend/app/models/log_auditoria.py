"""
Model: LogAuditoria
"""

from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base
from .mixins import TimestampMixin


class LogAuditoria(Base, TimestampMixin):
    """Logs de auditoria de todas as ações importantes"""

    __tablename__ = "logs_auditoria"

    # Chaves
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"))

    # Ação realizada
    acao = Column(String(100), nullable=False)
    tipo_entidade = Column(String(100), nullable=False)
    entidade_id = Column(UUID(as_uuid=True))

    # Valores antigos e novos
    valores_antigos = Column(JSONB)
    valores_novos = Column(JSONB)

    # Informações da requisição
    endereco_ip = Column(INET)
    user_agent = Column(Text)

    # Relacionamentos
    usuario = relationship("Usuario", back_populates="logs_auditoria")

    def __repr__(self):
        return f"<LogAuditoria {self.acao} {self.tipo_entidade} Usuario={self.usuario_id}>"
