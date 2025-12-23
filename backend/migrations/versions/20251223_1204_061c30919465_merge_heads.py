"""merge_heads

Revision ID: 061c30919465
Revises: 0003, 6737ac862e2e
Create Date: 2025-12-23 12:04:18.172964

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Identificadores de revisão usados pelo Alembic
revision: str = '061c30919465'
down_revision: Union[str, None] = ('0003', '6737ac862e2e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Aplica as mudanças da migração (upgrade).
    
    Este método é executado quando você roda:
    - alembic upgrade head (aplica todas as migrações pendentes)
    - alembic upgrade +1 (aplica a próxima migração)
    - alembic upgrade <revision> (aplica até uma revisão específica)
    """
    pass


def downgrade() -> None:
    """
    Reverte as mudanças da migração (downgrade).
    
    Este método é executado quando você roda:
    - alembic downgrade -1 (reverte a última migração)
    - alembic downgrade base (reverte todas as migrações)
    - alembic downgrade <revision> (reverte até uma revisão específica)
    
    ATENÇÃO: Nem todas as operações podem ser revertidas!
    Revise sempre este método após gerar uma migração.
    """
    pass
