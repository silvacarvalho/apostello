"""
Configuração do Banco de Dados (PostgreSQL)
Sistema de Gestão de Escalas de Pregação - IASD
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from .config import settings

# ============================================================
# ENGINE
# ============================================================
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Testa conexões antes de usar
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    echo=settings.DEBUG,  # Log de SQL queries em modo debug
)

# ============================================================
# SESSION
# ============================================================
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# ============================================================
# BASE PARA MODELOS
# ============================================================
Base = declarative_base()


# ============================================================
# DEPENDENCY PARA FASTAPI
# ============================================================
def get_db() -> Generator[Session, None, None]:
    """
    Dependency para obter sessão do banco de dados.
    Usado em routers do FastAPI.

    Yields:
        Session: Sessão do SQLAlchemy

    Example:
        @router.get("/items")
        def get_items(db: Session = Depends(get_db)):
            items = db.query(Item).all()
            return items
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================
def init_db() -> None:
    """
    Inicializa o banco de dados criando todas as tabelas.
    Usar apenas em desenvolvimento ou testes.
    Em produção, usar Alembic migrations.
    """
    Base.metadata.create_all(bind=engine)


def drop_db() -> None:
    """
    Remove todas as tabelas do banco de dados.
    CUIDADO: Usar apenas em desenvolvimento/testes!
    """
    Base.metadata.drop_all(bind=engine)
