"""Add dados_extra to notificacoes

Revision ID: add_dados_extra_notif
Revises: 20251126_add_semana_toda_to_tematica
Create Date: 2025-01-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_dados_extra_notif'
down_revision = '20251126_add_semana_toda_to_tematica'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add dados_extra column to notificacoes table
    op.add_column('notificacoes', sa.Column('dados_extra', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'))


def downgrade() -> None:
    # Remove dados_extra column from notificacoes table
    op.drop_column('notificacoes', 'dados_extra')
