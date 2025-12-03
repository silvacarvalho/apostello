"""add_only_unique_constraint_pregacao

Revision ID: 884ca9b4029a
Revises: add_prioridade_horario
Create Date: 2025-12-02 18:40:43.578767-03:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '884ca9b4029a'
down_revision = 'add_prioridade_horario'  # Voltar para a revisão anterior funcionando
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adicionar apenas a constraint única para prevenir duplicatas
    op.create_unique_constraint(
        'unique_pregacao_igreja_data_horario', 
        'pregacoes', 
        ['igreja_id', 'data_pregacao', 'horario_pregacao']
    )


def downgrade() -> None:
    # Remover a constraint única
    op.drop_constraint(
        'unique_pregacao_igreja_data_horario', 
        'pregacoes', 
        type_='unique'
    )
