"""Migracao inicial - Criacao de todas as tabelas do sistema Apostello

Revision ID: 0001
Revises: 
Create Date: 2024-12-22

Esta migracao cria toda a estrutura do banco de dados do sistema.

IMPORTANTE para ambientes com banco ja existente:
Se o banco ja existe com as tabelas criadas (via SQLAlchemy direto),
execute: alembic stamp 0001
para marcar esta migracao como ja aplicada sem executar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ENUM as PostgresEnum
from sqlalchemy import inspect, text


# Identificadores de revisao usados pelo Alembic
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def create_enum_if_not_exists(name: str, values: list) -> str:
    """Gera SQL para criar ENUM apenas se nao existir."""
    values_str = ", ".join([f"'{v}'" for v in values])
    return f"""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{name}') THEN
            CREATE TYPE {name} AS ENUM ({values_str});
        END IF;
    END$$;
    """


def use_existing_enum(name: str) -> sa.types.TypeEngine:
    """Retorna um tipo ENUM PostgreSQL que referencia um tipo já existente sem tentar criá-lo."""
    return PostgresEnum(name=name, create_type=False)


def table_exists(table_name: str) -> bool:
    """Verifica se uma tabela ja existe no banco."""
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def fk_exists(table_name: str, fk_name: str) -> bool:
    """Verifica se uma foreign key ja existe."""
    try:
        bind = op.get_bind()
        inspector = inspect(bind)
        fks = inspector.get_foreign_keys(table_name)
        return any(fk.get('name') == fk_name for fk in fks)
    except Exception:
        return False


def upgrade() -> None:
    """
    Cria todas as tabelas do sistema Apostello.
    """
    
    # ==========================================================================
    # TIPOS ENUM - Criar primeiro pois sao usados pelas tabelas
    # Usa DO $$ para verificar se tipo ja existe antes de criar
    # ==========================================================================
    
    op.execute(create_enum_if_not_exists('status_geral', ['ATIVO', 'INATIVO']))
    op.execute(create_enum_if_not_exists('tipo_usuario', ['ADMIN', 'PASTOR_DISTRITAL', 'LIDER_DISTRITAL', 'PREGADOR', 'CANTOR', 'MEMBRO']))
    op.execute(create_enum_if_not_exists('status_aprovacao', ['PENDENTE_APROVACAO', 'APROVADO', 'RECUSADO']))
    op.execute(create_enum_if_not_exists('status_escala', ['RASCUNHO', 'PUBLICADA', 'ARQUIVADA']))
    op.execute(create_enum_if_not_exists('diasemana', ['SABADO', 'DOMINGO', 'QUARTA']))
    op.execute(create_enum_if_not_exists('motivoindisponibilidade', ['FERIAS', 'VIAGEM', 'COMPROMISSO', 'SAUDE', 'OUTRO']))
    op.execute(create_enum_if_not_exists('tipo_recorrencia_tema', ['SEMANAL_MES', 'PERIODO_ESPECIFICO', 'ANUAL']))
    op.execute(create_enum_if_not_exists('statusconfirmacao', ['PENDENTE', 'CONFIRMADO', 'NAO_CONFIRMADO']))
    op.execute(create_enum_if_not_exists('statusrealizacao', ['PENDENTE', 'REALIZADO', 'CANCELADO', 'FALTA_PREGADOR', 'FALTA_CANTOR']))
    op.execute(create_enum_if_not_exists('acaoitemescala', ['CRIACAO', 'EDICAO', 'TROCA', 'CANCELAMENTO', 'SUBSTITUICAO']))
    op.execute(create_enum_if_not_exists('tipoavaliado', ['PREGADOR', 'CANTOR']))
    op.execute(create_enum_if_not_exists('statussolicitacaotroca', ['PENDENTE_SUBSTITUTO', 'PENDENTE_PASTOR', 'APROVADA', 'RECUSADA']))
    op.execute(create_enum_if_not_exists('motivoscore', ['AVALIACAO', 'PENALIDADE', 'BONUS', 'AJUSTE_MANUAL']))
    op.execute(create_enum_if_not_exists('tipopenalidade', ['FALTA_SEM_AVISO', 'DESMARCACAO_SEM_TROCA', 'DESMARCACAO_48H', 'ATRASO', 'CUSTOM']))
    op.execute(create_enum_if_not_exists('tipoacaotroca', ['SOLICITOU_TROCA', 'ACEITOU_TROCA', 'RECUSOU_TROCA', 'SUBSTITUICAO_EMERGENCIAL']))
    op.execute(create_enum_if_not_exists('tiponotificacao', [
        'ESCALA_PUBLICADA', 'LEMBRETE_7D', 'LEMBRETE_3D', 'LEMBRETE_24H',
        'CONFIRMACAO', 'TROCA', 'AVALIACAO', 'PENALIDADE',
        'AUTO_CADASTRO_APROVADO', 'AUTO_CADASTRO_RECUSADO'
    ]))
    op.execute(create_enum_if_not_exists('canalnotificacao', ['EMAIL', 'SMS', 'WHATSAPP']))
    op.execute(create_enum_if_not_exists('statusenvio', ['ENVIADO', 'FALHA', 'PENDENTE']))
    
    # ==========================================================================
    # TABELAS PRINCIPAIS
    # ==========================================================================
    
    # Organizacao
    if not table_exists('organizacao'):
        op.create_table(
            'organizacao',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('nome', sa.String(255), nullable=False),
            sa.Column('cnpj', sa.String(18), unique=True),
            sa.Column('logo_url', sa.Text()),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_organizacao_id', 'organizacao', ['id'])
        op.create_index('ix_organizacao_cnpj', 'organizacao', ['cnpj'])
    
    # Usuario
    if not table_exists('usuario'):
        op.create_table(
            'usuario',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('nome_completo', sa.String(255), nullable=False),
            sa.Column('email', sa.String(255), unique=True, nullable=False),
            sa.Column('senha_hash', sa.String(255), nullable=False),
            sa.Column('cpf', sa.String(14), unique=True, nullable=False),
            sa.Column('telefone', sa.String(20)),
            sa.Column('whatsapp', sa.String(20)),
            sa.Column('data_nascimento', sa.Date()),
            sa.Column('foto_url', sa.Text()),
            sa.Column('tipo', use_existing_enum('tipo_usuario'), nullable=False),
            sa.Column('distrito_id', sa.Integer()),
            sa.Column('igreja_id', sa.Integer()),
            sa.Column('score_atual', sa.Numeric(5, 2), server_default='70.00'),
            sa.Column('contador_mes_atual', sa.Integer(), server_default='0'),
            sa.Column('contador_total_participacoes', sa.Integer(), server_default='0'),
            sa.Column('contador_faltas', sa.Integer(), server_default='0'),
            sa.Column('contador_desmarcacoes', sa.Integer(), server_default='0'),
            sa.Column('status', use_existing_enum('status_geral'), server_default='ATIVO'),
            sa.Column('status_aprovacao', use_existing_enum('status_aprovacao'), server_default='APROVADO'),
            sa.Column('data_solicitacao_cadastro', sa.DateTime(timezone=True)),
            sa.Column('data_aprovacao', sa.DateTime(timezone=True)),
            sa.Column('aprovado_por_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='SET NULL')),
            sa.Column('motivo_recusa', sa.Text()),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('ultimo_login', sa.DateTime(timezone=True)),
        )
        op.create_index('ix_usuario_id', 'usuario', ['id'])
        op.create_index('ix_usuario_email', 'usuario', ['email'])
        op.create_index('ix_usuario_cpf', 'usuario', ['cpf'])
    
    # Distrito
    if not table_exists('distrito'):
        op.create_table(
            'distrito',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('organizacao_id', sa.Integer(), sa.ForeignKey('organizacao.id', ondelete='CASCADE'), nullable=False),
            sa.Column('nome', sa.String(255), nullable=False),
            sa.Column('descricao', sa.Text()),
            sa.Column('pastor_distrital_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='SET NULL')),
            sa.Column('lider_distrital_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='SET NULL')),
            sa.Column('config_recorrencia_maxima', sa.Integer(), server_default='3'),
            sa.Column('config_intervalo_minimo', sa.Integer(), server_default='7'),
            sa.Column('config_usa_preferencia', sa.Boolean(), server_default='false'),
            sa.Column('config_exige_confirmacao', sa.Boolean(), server_default='true'),
            sa.Column('config_prazo_confirmacao_horas', sa.Integer(), server_default='48'),
            sa.Column('config_exige_aprovacao_troca', sa.Boolean(), server_default='true'),
            sa.Column('config_prazo_avaliacao_dias', sa.Integer(), server_default='7'),
            sa.Column('status', use_existing_enum('status_geral'), server_default='ATIVO'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_distrito_id', 'distrito', ['id'])
    
    # FK usuario -> distrito (so adiciona se nao existir)
    if table_exists('usuario') and table_exists('distrito') and not fk_exists('usuario', 'fk_usuario_distrito'):
        op.create_foreign_key('fk_usuario_distrito', 'usuario', 'distrito', ['distrito_id'], ['id'], ondelete='SET NULL')
    
    # Igreja
    if not table_exists('igreja'):
        op.create_table(
            'igreja',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('distrito_id', sa.Integer(), sa.ForeignKey('distrito.id', ondelete='CASCADE'), nullable=False),
            sa.Column('nome', sa.String(255), nullable=False),
            sa.Column('endereco_completo', sa.Text()),
            sa.Column('telefone', sa.String(20)),
            sa.Column('email', sa.String(255)),
            sa.Column('status', use_existing_enum('status_geral'), server_default='ATIVO'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_igreja_id', 'igreja', ['id'])
    
    # FK usuario -> igreja (so adiciona se nao existir)
    if table_exists('usuario') and table_exists('igreja') and not fk_exists('usuario', 'fk_usuario_igreja'):
        op.create_foreign_key('fk_usuario_igreja', 'usuario', 'igreja', ['igreja_id'], ['id'], ondelete='SET NULL')
    
    # Horario de Culto
    if not table_exists('horario_culto'):
        op.create_table(
            'horario_culto',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('igreja_id', sa.Integer(), sa.ForeignKey('igreja.id', ondelete='CASCADE'), nullable=False),
            sa.Column('dia_semana', use_existing_enum('diasemana'), nullable=False),
            sa.Column('horario', sa.Time(), nullable=False),
            sa.Column('ativo', sa.Boolean(), server_default='true'),
            sa.Column('aplicado_em_lote', sa.Boolean(), server_default='false'),
            sa.Column('lote_id', UUID(as_uuid=True)),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_horario_culto_id', 'horario_culto', ['id'])
    
    # Preferencia de Igreja
    if not table_exists('preferencia_igreja'):
        op.create_table(
            'preferencia_igreja',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False),
            sa.Column('igreja_id', sa.Integer(), sa.ForeignKey('igreja.id', ondelete='CASCADE'), nullable=False),
            sa.Column('ordem', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_preferencia_igreja_id', 'preferencia_igreja', ['id'])
    
    # Indisponibilidade
    if not table_exists('indisponibilidade'):
        op.create_table(
            'indisponibilidade',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False),
            sa.Column('data_inicio', sa.Date(), nullable=False),
            sa.Column('data_fim', sa.Date(), nullable=False),
            sa.Column('motivo_tipo', use_existing_enum('motivoindisponibilidade'), nullable=False),
            sa.Column('motivo_descricao', sa.Text()),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_indisponibilidade_id', 'indisponibilidade', ['id'])
    
    # Bloqueio Temporario
    if not table_exists('bloqueio_temporario'):
        op.create_table(
            'bloqueio_temporario',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False),
            sa.Column('pastor_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False),
            sa.Column('data_inicio', sa.Date(), nullable=False),
            sa.Column('data_fim', sa.Date(), nullable=False),
            sa.Column('motivo', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_bloqueio_temporario_id', 'bloqueio_temporario', ['id'])
    
    # Tema
    if not table_exists('tema'):
        op.create_table(
            'tema',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('organizacao_id', sa.Integer(), sa.ForeignKey('organizacao.id', ondelete='CASCADE'), nullable=False),
            sa.Column('titulo', sa.String(255), nullable=False),
            sa.Column('descricao', sa.Text()),
            sa.Column('tipo_recorrencia', use_existing_enum('tipo_recorrencia_tema'), nullable=False),
            sa.Column('config_recorrencia', JSONB(), nullable=False),
            sa.Column('ano_aplicacao', sa.Integer()),
            sa.Column('status', use_existing_enum('status_geral'), server_default='ATIVO'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_tema_id', 'tema', ['id'])
    
    # Escala
    if not table_exists('escala'):
        op.create_table(
            'escala',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('distrito_id', sa.Integer(), sa.ForeignKey('distrito.id', ondelete='CASCADE'), nullable=False),
            sa.Column('mes', sa.Integer(), nullable=False),
            sa.Column('ano', sa.Integer(), nullable=False),
            sa.Column('status', use_existing_enum('status_escala'), server_default='RASCUNHO'),
            sa.Column('data_publicacao', sa.DateTime(timezone=True)),
            sa.Column('pastor_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='RESTRICT'), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_escala_id', 'escala', ['id'])
        op.create_index('ix_escala_distrito_mes_ano', 'escala', ['distrito_id', 'mes', 'ano'])
        op.create_index('ix_escala_distrito_status', 'escala', ['distrito_id', 'status'])
    
    # Item de Escala
    if not table_exists('item_escala'):
        op.create_table(
            'item_escala',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('escala_id', sa.Integer(), sa.ForeignKey('escala.id', ondelete='CASCADE'), nullable=False),
            sa.Column('igreja_id', sa.Integer(), sa.ForeignKey('igreja.id', ondelete='CASCADE'), nullable=False),
            sa.Column('data_culto', sa.Date(), nullable=False),
            sa.Column('horario', sa.Time(), nullable=False),
            sa.Column('pregador_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='SET NULL')),
            sa.Column('cantor_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='SET NULL')),
            sa.Column('tema_id', sa.Integer(), sa.ForeignKey('tema.id', ondelete='SET NULL')),
            sa.Column('tema_customizado', sa.Text()),
            sa.Column('status_confirmacao_pregador', use_existing_enum('statusconfirmacao'), server_default='PENDENTE'),
            sa.Column('status_confirmacao_cantor', use_existing_enum('statusconfirmacao'), server_default='PENDENTE'),
            sa.Column('data_confirmacao_pregador', sa.DateTime(timezone=True)),
            sa.Column('data_confirmacao_cantor', sa.DateTime(timezone=True)),
            sa.Column('status_realizacao', use_existing_enum('statusrealizacao'), server_default='PENDENTE'),
            sa.Column('observacoes', sa.Text()),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_item_escala_id', 'item_escala', ['id'])
    
    # Historico de Item de Escala
    if not table_exists('historico_item_escala'):
        op.create_table(
            'historico_item_escala',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('item_escala_id', sa.Integer(), sa.ForeignKey('item_escala.id', ondelete='CASCADE'), nullable=False),
            sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False),
            sa.Column('acao', use_existing_enum('acaoitemescala'), nullable=False),
            sa.Column('descricao', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_historico_item_escala_id', 'historico_item_escala', ['id'])
    
    # Solicitacao de Troca
    if not table_exists('solicitacao_troca'):
        op.create_table(
            'solicitacao_troca',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('item_escala_id', sa.Integer(), sa.ForeignKey('item_escala.id', ondelete='CASCADE'), nullable=False),
            sa.Column('tipo', use_existing_enum('tipoavaliado'), nullable=False),
            sa.Column('solicitante_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False),
            sa.Column('substituto_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False),
            sa.Column('motivo', sa.Text(), nullable=False),
            sa.Column('status', use_existing_enum('statussolicitacaotroca'), server_default='PENDENTE_SUBSTITUTO'),
            sa.Column('data_resposta_substituto', sa.DateTime(timezone=True)),
            sa.Column('data_resposta_pastor', sa.DateTime(timezone=True)),
            sa.Column('pastor_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='SET NULL')),
            sa.Column('observacao_pastor', sa.Text()),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_solicitacao_troca_id', 'solicitacao_troca', ['id'])
    
    # Avaliacao
    if not table_exists('avaliacao'):
        op.create_table(
            'avaliacao',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('item_escala_id', sa.Integer(), sa.ForeignKey('item_escala.id', ondelete='CASCADE'), nullable=False),
            sa.Column('avaliado_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False),
            sa.Column('avaliador_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False),
            sa.Column('tipo', use_existing_enum('tipoavaliado'), nullable=False),
            sa.Column('criterio_1', sa.Integer(), nullable=False),
            sa.Column('criterio_2', sa.Integer(), nullable=False),
            sa.Column('criterio_3', sa.Integer(), nullable=False),
            sa.Column('criterio_4', sa.Integer(), nullable=False),
            sa.Column('criterio_5', sa.Integer(), nullable=False),
            sa.Column('comentario', sa.Text()),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_avaliacao_id', 'avaliacao', ['id'])
    
    # Historico de Score
    if not table_exists('historico_score'):
        op.create_table(
            'historico_score',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False),
            sa.Column('score_anterior', sa.Numeric(5, 2), nullable=False),
            sa.Column('score_novo', sa.Numeric(5, 2), nullable=False),
            sa.Column('delta', sa.Numeric(5, 2), nullable=False),
            sa.Column('motivo_tipo', use_existing_enum('motivoscore'), nullable=False),
            sa.Column('referencia_id', sa.Integer()),
            sa.Column('descricao', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_historico_score_id', 'historico_score', ['id'])
    
    # Penalidade
    if not table_exists('penalidade'):
        op.create_table(
            'penalidade',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False),
            sa.Column('pastor_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False),
            sa.Column('tipo', use_existing_enum('tipopenalidade'), nullable=False),
            sa.Column('valor_subtracao', sa.Numeric(5, 2), nullable=False),
            sa.Column('motivo', sa.Text(), nullable=False),
            sa.Column('data_aplicacao', sa.Date(), nullable=False, server_default=sa.text('CURRENT_DATE')),
            sa.Column('data_validade', sa.Date()),
            sa.Column('item_escala_id', sa.Integer(), sa.ForeignKey('item_escala.id', ondelete='SET NULL')),
            sa.Column('ativa', sa.Boolean(), server_default='true'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_penalidade_id', 'penalidade', ['id'])
    
    # Historico de Troca de Escala
    if not table_exists('historico_troca_escala'):
        op.create_table(
            'historico_troca_escala',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False),
            sa.Column('item_escala_original_id', sa.Integer(), sa.ForeignKey('item_escala.id', ondelete='SET NULL')),
            sa.Column('item_escala_novo_id', sa.Integer(), sa.ForeignKey('item_escala.id', ondelete='SET NULL')),
            sa.Column('tipo_acao', use_existing_enum('tipoacaotroca'), nullable=False),
            sa.Column('outro_usuario_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE')),
            sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('motivo', sa.Text()),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_historico_troca_escala_id', 'historico_troca_escala', ['id'])
    
    # Historico de Substituicao Emergencial
    if not table_exists('historico_substituicao_emergencial'):
        op.create_table(
            'historico_substituicao_emergencial',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False),
            sa.Column('item_escala_id', sa.Integer(), sa.ForeignKey('item_escala.id', ondelete='CASCADE'), nullable=False),
            sa.Column('usuario_substituido_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False),
            sa.Column('igreja_id', sa.Integer(), sa.ForeignKey('igreja.id', ondelete='CASCADE'), nullable=False),
            sa.Column('data_culto', sa.Date(), nullable=False),
            sa.Column('horario_aceitacao', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('motivo_emergencia', sa.Text(), nullable=False),
            sa.Column('pontos_ganhos', sa.Numeric(5, 2), server_default='5.00'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_historico_substituicao_emergencial_id', 'historico_substituicao_emergencial', ['id'])
    
    # Notificacao
    if not table_exists('notificacao'):
        op.create_table(
            'notificacao',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuario.id', ondelete='CASCADE'), nullable=False),
            sa.Column('tipo', use_existing_enum('tiponotificacao'), nullable=False),
            sa.Column('titulo', sa.String(255), nullable=False),
            sa.Column('mensagem', sa.Text(), nullable=False),
            sa.Column('link', sa.Text()),
            sa.Column('lida', sa.Boolean(), server_default='false'),
            sa.Column('enviada_email', sa.Boolean(), server_default='false'),
            sa.Column('enviada_sms', sa.Boolean(), server_default='false'),
            sa.Column('enviada_whatsapp', sa.Boolean(), server_default='false'),
            sa.Column('data_envio_email', sa.DateTime(timezone=True)),
            sa.Column('data_envio_sms', sa.DateTime(timezone=True)),
            sa.Column('data_envio_whatsapp', sa.DateTime(timezone=True)),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_notificacao_id', 'notificacao', ['id'])
    
    # Log de Notificacao
    if not table_exists('log_notificacao'):
        op.create_table(
            'log_notificacao',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('notificacao_id', sa.Integer(), sa.ForeignKey('notificacao.id', ondelete='CASCADE'), nullable=False),
            sa.Column('canal', use_existing_enum('canalnotificacao'), nullable=False),
            sa.Column('status', use_existing_enum('statusenvio'), nullable=False),
            sa.Column('erro_mensagem', sa.Text()),
            sa.Column('tentativas', sa.Integer(), server_default='1'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        op.create_index('ix_log_notificacao_id', 'log_notificacao', ['id'])


def downgrade() -> None:
    """
    Remove todas as tabelas do sistema Apostello.
    ATENCAO: Esta operacao e destrutiva e nao pode ser desfeita!
    """
    
    # Remover tabelas na ordem inversa de criacao (respeitando dependencias)
    if table_exists('log_notificacao'):
        op.drop_table('log_notificacao')
    if table_exists('notificacao'):
        op.drop_table('notificacao')
    if table_exists('historico_substituicao_emergencial'):
        op.drop_table('historico_substituicao_emergencial')
    if table_exists('historico_troca_escala'):
        op.drop_table('historico_troca_escala')
    if table_exists('penalidade'):
        op.drop_table('penalidade')
    if table_exists('historico_score'):
        op.drop_table('historico_score')
    if table_exists('avaliacao'):
        op.drop_table('avaliacao')
    if table_exists('solicitacao_troca'):
        op.drop_table('solicitacao_troca')
    if table_exists('historico_item_escala'):
        op.drop_table('historico_item_escala')
    if table_exists('item_escala'):
        op.drop_table('item_escala')
    if table_exists('escala'):
        op.drop_table('escala')
    if table_exists('tema'):
        op.drop_table('tema')
    if table_exists('bloqueio_temporario'):
        op.drop_table('bloqueio_temporario')
    if table_exists('indisponibilidade'):
        op.drop_table('indisponibilidade')
    if table_exists('preferencia_igreja'):
        op.drop_table('preferencia_igreja')
    if table_exists('horario_culto'):
        op.drop_table('horario_culto')
    
    # Remover FKs de usuario antes de remover igreja e distrito
    if table_exists('usuario'):
        if fk_exists('usuario', 'fk_usuario_igreja'):
            op.drop_constraint('fk_usuario_igreja', 'usuario', type_='foreignkey')
        if fk_exists('usuario', 'fk_usuario_distrito'):
            op.drop_constraint('fk_usuario_distrito', 'usuario', type_='foreignkey')
    
    if table_exists('igreja'):
        op.drop_table('igreja')
    if table_exists('distrito'):
        op.drop_table('distrito')
    if table_exists('usuario'):
        op.drop_table('usuario')
    if table_exists('organizacao'):
        op.drop_table('organizacao')
    
    # Remover tipos enum
    op.execute('DROP TYPE IF EXISTS statusenvio')
    op.execute('DROP TYPE IF EXISTS canalnotificacao')
    op.execute('DROP TYPE IF EXISTS tiponotificacao')
    op.execute('DROP TYPE IF EXISTS tipoacaotroca')
    op.execute('DROP TYPE IF EXISTS tipopenalidade')
    op.execute('DROP TYPE IF EXISTS motivoscore')
    op.execute('DROP TYPE IF EXISTS statussolicitacaotroca')
    op.execute('DROP TYPE IF EXISTS tipoavaliado')
    op.execute('DROP TYPE IF EXISTS acaoitemescala')
    op.execute('DROP TYPE IF EXISTS statusrealizacao')
    op.execute('DROP TYPE IF EXISTS statusconfirmacao')
    op.execute('DROP TYPE IF EXISTS tipo_recorrencia_tema')
    op.execute('DROP TYPE IF EXISTS motivoindisponibilidade')
    op.execute('DROP TYPE IF EXISTS diasemana')
    op.execute('DROP TYPE IF EXISTS status_escala')
    op.execute('DROP TYPE IF EXISTS status_aprovacao')
    op.execute('DROP TYPE IF EXISTS tipo_usuario')
    op.execute('DROP TYPE IF EXISTS status_geral')
