"""add semana_toda to tematica

Revision ID: 20251126_add_semana_toda_to_tematica
Revises: 7f6e19ce3c51
Create Date: 2025-11-26 00:00:00.000000-03:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251126_add_semana_toda_to_tematica'
down_revision = '7f6e19ce3c51'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adicionar coluna semana_toda à tabela tematicas
    op.add_column('tematicas', sa.Column('semana_toda', sa.Boolean(), nullable=True, server_default='false'))
    
    # Remover a constraint antiga de semanal
    op.drop_constraint('chk_tematica_semanal', 'tematicas', type_='check')
    
    # Adicionar nova constraint que aceita semana_toda OU dia_semana_semanal
    op.create_check_constraint(
        'chk_tematica_semanal',
        'tematicas',
        "tipo_recorrencia != 'semanal' OR (semana_toda = TRUE OR dia_semana_semanal IS NOT NULL)"
    )


def downgrade() -> None:
    # Remover a nova constraint
    op.drop_constraint('chk_tematica_semanal', 'tematicas', type_='check')
    
    # Restaurar a constraint antiga
    op.create_check_constraint(
        'chk_tematica_semanal',
        'tematicas',
        "tipo_recorrencia != 'semanal' OR dia_semana_semanal IS NOT NULL"
    )
    
    # Remover a coluna semana_toda
    op.drop_column('tematicas', 'semana_toda')
