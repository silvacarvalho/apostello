"""Add itinerario_pastor table

Revision ID: 20260101_0001_itinerario_pastor
Revises: 20251229_0002_sms_preferencia
Create Date: 2026-01-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260101_0001_itinerario_pastor'
down_revision: str = '20251229_0002_sms_preferencia'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'itinerario_pastor',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('distrito_id', sa.Integer(), sa.ForeignKey('distrito.id', ondelete='CASCADE'), nullable=False),
        sa.Column('igreja_id', sa.Integer(), sa.ForeignKey('igreja.id', ondelete='CASCADE'), nullable=False),
        sa.Column('pastor_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False),
        sa.Column('data_culto', sa.Date(), nullable=False),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('igreja_id', 'data_culto', name='uq_itinerario_igreja_data'),
    )
    op.create_index('ix_itinerario_pastor_id', 'itinerario_pastor', ['id'])
    op.create_index('ix_itinerario_pastor_distrito_id', 'itinerario_pastor', ['distrito_id'])
    op.create_index('ix_itinerario_pastor_data_culto', 'itinerario_pastor', ['data_culto'])


def downgrade() -> None:
    op.drop_table('itinerario_pastor')
