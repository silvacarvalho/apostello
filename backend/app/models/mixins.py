"""
Mixins para Models
"""

from sqlalchemy import Column, DateTime
from sqlalchemy.sql import func


class TimestampMixin:
    """Mixin para adicionar timestamps automáticos"""

    criado_em = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    excluido_em = Column(DateTime(timezone=True), nullable=True)  # Soft delete


class TimestampMixinSimples:
    """Mixin para adicionar timestamps automáticos sem soft delete (usa campo ativo)"""

    criado_em = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
