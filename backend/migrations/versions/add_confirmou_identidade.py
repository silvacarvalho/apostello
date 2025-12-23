"""
Migration: Adicionar confirmou_identidade à tabela avaliacao

Revision ID: add_confirmou_identidade
Revises: add_nao_confirmou_prazo
Create Date: 2024-12-23
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_confirmou_identidade'
down_revision = 'add_nao_confirmou_prazo'
branch_labels = None
depends_on = None


def upgrade():
    """
    Adiciona coluna confirmou_identidade na tabela avaliacao
    """
    op.add_column(
        'avaliacao',
        sa.Column('confirmou_identidade', sa.Boolean(), nullable=False, server_default='true')
    )


def downgrade():
    """
    Remove coluna confirmou_identidade
    """
    op.drop_column('avaliacao', 'confirmou_identidade')
