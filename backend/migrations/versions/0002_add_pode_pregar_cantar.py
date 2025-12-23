"""add pode_pregar e pode_cantar

Revision ID: 0002
Revises: 0001
Create Date: 2025-12-22

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade():
    # Adicionar colunas pode_pregar e pode_cantar
    op.add_column('usuario', sa.Column('pode_pregar', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('usuario', sa.Column('pode_cantar', sa.Boolean(), nullable=False, server_default='false'))
    
    # Atualizar valores padrão baseado no tipo de usuário
    op.execute("""
        UPDATE usuario 
        SET pode_pregar = true 
        WHERE tipo IN ('PREGADOR', 'PASTOR_DISTRITAL')
    """)
    
    op.execute("""
        UPDATE usuario 
        SET pode_cantar = true 
        WHERE tipo = 'CANTOR'
    """)


def downgrade():
    op.drop_column('usuario', 'pode_cantar')
    op.drop_column('usuario', 'pode_pregar')
