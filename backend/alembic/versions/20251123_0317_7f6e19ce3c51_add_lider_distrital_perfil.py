"""add_lider_distrital_perfil

Revision ID: 7f6e19ce3c51
Revises: 
Create Date: 2025-11-23 03:17:18.911137-03:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7f6e19ce3c51'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adicionar novo valor ao enum perfil_usuario
    op.execute("ALTER TYPE perfil_usuario ADD VALUE IF NOT EXISTS 'lider_distrital'")


def downgrade() -> None:
    # Não é possível remover valores de enums no PostgreSQL de forma simples
    # Seria necessário recriar o enum, o que é muito complexo
    pass
