"""consolidate_schema_state

Revision ID: 7c50a429cfd5
Revises: d1246efde52b
Create Date: 2025-12-02 22:34:19.995888-03:00

Consolidates all schema changes including:
- dados_extra column in notificacoes table (JSONB)
- prioridade column in horarios_cultos table
- unique constraint on pregacoes table
- semana_toda column in tematicas table
- lider_distrital profile support
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '7c50a429cfd5'
down_revision = 'd1246efde52b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Esta migração está vazia porque todas as alterações já foram aplicadas
    manualmente ou por migrações anteriores inconsistentes.
    
    Estado atual das tabelas:
    - notificacoes: tem coluna dados_extra (JSONB)
    - horarios_cultos: tem coluna prioridade (INTEGER)
    - pregacoes: tem constraint única
    - tematicas: tem coluna semana_toda
    """
    pass


def downgrade() -> None:
    """
    Downgrade não é suportado para esta migração consolidada.
    Use as migrações específicas se necessário.
    """
    pass
