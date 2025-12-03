"""
Model: LogImportacao
"""

from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base
from .mixins import TimestampMixinSimples


class LogImportacao(Base, TimestampMixinSimples):
    """Logs de importações via Excel/CSV"""

    __tablename__ = "logs_importacao"

    # Chaves
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"))

    # Dados da importação
    tipo_importacao = Column(String(50), nullable=False)  # membros, distritos, tematicas, etc
    nome_arquivo = Column(String(255))
    tamanho_arquivo = Column(Integer)

    # Estatísticas
    total_linhas = Column(Integer)
    linhas_sucesso = Column(Integer)
    linhas_erro = Column(Integer)

    # Erros detalhados
    erros = Column(JSONB)

    # Status
    status = Column(String(50), default="processando")

    # Timestamps
    iniciado_em = Column(DateTime(timezone=True))
    concluido_em = Column(DateTime(timezone=True))

    # Relacionamentos
    usuario = relationship("Usuario", foreign_keys=[usuario_id])

    def __repr__(self):
        return f"<LogImportacao {self.tipo_importacao} Status={self.status} Sucesso={self.linhas_sucesso}/{self.total_linhas}>"
