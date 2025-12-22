"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# Identificadores de revisão usados pelo Alembic
revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    """
    Aplica as mudanças da migração (upgrade).
    
    Este método é executado quando você roda:
    - alembic upgrade head (aplica todas as migrações pendentes)
    - alembic upgrade +1 (aplica a próxima migração)
    - alembic upgrade <revision> (aplica até uma revisão específica)
    """
    ${upgrades if upgrades else "pass"}


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
    ${downgrades if downgrades else "pass"}
