"""
Configuração do ambiente Alembic para o Sistema Apostello.

Este arquivo configura o Alembic para:
- Carregar variáveis de ambiente do .env
- Usar os models SQLAlchemy existentes
- Gerar migrações automaticamente baseadas nos models
"""
import sys
from pathlib import Path
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Adicionar o diretório raiz ao path para importar os módulos da aplicação
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Carregar variáveis de ambiente
from dotenv import load_dotenv
load_dotenv()

# Importar configurações e models da aplicação
from app.core.config import settings
from app.models.base import Base

# Importar TODOS os models para que o metadata seja populado
from app.models import (
    Organizacao,
    Distrito,
    Igreja,
    HorarioCulto,
    Usuario,
    PreferenciaIgreja,
    Indisponibilidade,
    BloqueioTemporario,
    Tema,
    Escala,
    ItemEscala,
    HistoricoItemEscala,
    SolicitacaoTroca,
    Avaliacao,
    HistoricoScore,
    Penalidade,
    HistoricoTrocaEscala,
    HistoricoSubstituicaoEmergencial,
    Notificacao,
    LogNotificacao,
)

# Este é o objeto config do Alembic, que fornece acesso aos valores do .ini
config = context.config

# Configurar logging do Alembic
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Configurar a URL do banco de dados a partir das configurações da aplicação
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Metadata dos models para o autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Executa migrações em modo 'offline'.
    
    Neste modo, o contexto é configurado apenas com uma URL
    e não um Engine, sendo necessário apenas a URL do banco.
    
    Útil para gerar scripts SQL sem conectar ao banco.
    
    Uso: alembic upgrade head --sql > migration.sql
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Opções para melhor suporte a PostgreSQL
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Executa migrações em modo 'online'.
    
    Neste modo, criamos um Engine e associamos uma conexão
    com o contexto.
    
    Este é o modo padrão usado em produção.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # Opções para melhor detecção de mudanças
            compare_type=True,
            compare_server_default=True,
            # Incluir objetos (tipos enum, etc.) na migração
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


def include_object(object, name, type_, reflected, compare_to):
    """
    Filtro para determinar quais objetos incluir nas migrações.
    
    Pode ser usado para ignorar tabelas específicas (ex: alembic_version)
    ou incluir apenas certas tabelas.
    """
    # Ignorar tabelas do sistema
    if type_ == "table" and name in ("alembic_version",):
        return False
    return True


# Determinar modo de execução
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
