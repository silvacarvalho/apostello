"""Add reset token fields to usuario table

Revision ID: 20251229_0001
Revises: 20251223_1400_bdcd53f6bfdb
Create Date: 2024-12-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20251229_0001_reset_token'
down_revision: str = 'add_confirmou_identidade'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add reset token columns to usuario table
    op.add_column('usuario', sa.Column('reset_token', sa.String(255), nullable=True))
    op.add_column('usuario', sa.Column('reset_token_expires', sa.DateTime(timezone=True), nullable=True))
    
    # Create index for faster token lookup
    op.create_index('ix_usuario_reset_token', 'usuario', ['reset_token'])


def downgrade() -> None:
    # Remove index
    op.drop_index('ix_usuario_reset_token', table_name='usuario')
    
    # Remove columns
    op.drop_column('usuario', 'reset_token_expires')
    op.drop_column('usuario', 'reset_token')
