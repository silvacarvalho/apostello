"""add auto_cadastro_pendente notification type

Revision ID: 0003
Revises: 0002
Create Date: 2025-12-23

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade():
    # Adicionar o novo tipo de notificação ao enum
    op.execute("""
        ALTER TYPE tiponotificacao ADD VALUE IF NOT EXISTS 'AUTO_CADASTRO_PENDENTE'
    """)


def downgrade():
    # Não é possível remover valores de enum no PostgreSQL
    # Esta operação precisa ser feita manualmente se necessário
    pass
