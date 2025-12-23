"""
Migration: Adicionar NAO_CONFIRMOU_PRAZO ao enum TipoPenalidade

Revision ID: add_nao_confirmou_prazo
Revises: previous_migration
Create Date: 2024-12-23
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_nao_confirmou_prazo'
down_revision = None  # Ajustar para a última migration
branch_labels = None
depends_on = None


def upgrade():
    """
    Adiciona o valor NAO_CONFIRMOU_PRAZO ao enum TipoPenalidade
    """
    # PostgreSQL permite adicionar valores a enums
    op.execute("ALTER TYPE tipopenalidade ADD VALUE IF NOT EXISTS 'NAO_CONFIRMOU_PRAZO'")
    
    # Nota: Se o banco não suportar IF NOT EXISTS, use:
    # op.execute("""
    #     DO $$ 
    #     BEGIN
    #         IF NOT EXISTS (
    #             SELECT 1 FROM pg_enum 
    #             WHERE enumlabel = 'NAO_CONFIRMOU_PRAZO' 
    #             AND enumtypid = 'tipopenalidade'::regtype
    #         ) THEN
    #             ALTER TYPE tipopenalidade ADD VALUE 'NAO_CONFIRMOU_PRAZO';
    #         END IF;
    #     END $$;
    # """)


def downgrade():
    """
    Não é possível remover valores de enums no PostgreSQL de forma simples.
    Para fazer downgrade completo, seria necessário:
    1. Remover todas as referências ao valor
    2. Recriar o enum sem o valor
    3. Atualizar todas as tabelas
    
    Por segurança, deixamos sem implementação.
    """
    pass
