"""add prioridade to horario_culto

Revision ID: add_prioridade_horario
Revises: add_dados_extra_notif
Create Date: 2025-11-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_prioridade_horario'
down_revision: Union[str, None] = 'add_dados_extra_notif'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adicionar coluna prioridade à tabela horarios_cultos
    op.add_column('horarios_cultos', sa.Column('prioridade', sa.Integer(), nullable=True, server_default='1'))
    
    # Atualizar registros existentes para ter prioridade baseada no dia da semana
    op.execute("""
        UPDATE horarios_cultos 
        SET prioridade = CASE 
            WHEN dia_semana = 'sabado' THEN 1
            WHEN dia_semana = 'domingo' THEN 2
            WHEN dia_semana = 'quarta' THEN 3
            ELSE 5
        END
        WHERE prioridade IS NULL OR prioridade = 1
    """)


def downgrade() -> None:
    op.drop_column('horarios_cultos', 'prioridade')
