"""Add SMS field to preferencia_notificacao

Revision ID: 20251229_0002
Revises: 20251229_0001_reset_token
Create Date: 2024-12-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20251229_0002_sms_preferencia'
down_revision: str = '20251229_0001_reset_token'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add SMS column to preferencia_notificacao table
    op.add_column('preferencia_notificacao', 
        sa.Column('sms', sa.Boolean(), nullable=False, server_default='false')
    )


def downgrade() -> None:
    op.drop_column('preferencia_notificacao', 'sms')
