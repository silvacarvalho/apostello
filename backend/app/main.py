"""
Aplicação Principal FastAPI
Sistema de Gestão de Escalas de Pregação - IASD
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings
from app.core.database import engine, Base

# Importar todos os modelos (necessário para criar tabelas)
from app.models import *

# Importar routers
from app.api.v1 import (
    auth,
    associacoes,
    distritos,
    igrejas,
    usuarios,
    pregadores,
    escalas,
    pregacoes,
    tematicas,
    avaliacoes,
    notificacoes,
    trocas,
    horarios_cultos,
    importacoes,
    configuracoes,
    qrcodes,
)

# ============================================================
# CONFIGURAÇÃO DE LOGS
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ============================================================
# CRIAR APLICAÇÃO FASTAPI
# ============================================================
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.APP_VERSION,
    description="API RESTful para gestão de escalas de pregação - IASD",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# ============================================================
# MIDDLEWARE CORS
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# ============================================================
# INCLUIR ROUTERS
# ============================================================
app.include_router(
    auth.router,
    prefix=f"{settings.API_V1_PREFIX}/auth",
    tags=["Autenticação"]
)

app.include_router(
    associacoes.router,
    prefix=f"{settings.API_V1_PREFIX}/associacoes",
    tags=["Associações"]
)

app.include_router(
    distritos.router,
    prefix=f"{settings.API_V1_PREFIX}/distritos",
    tags=["Distritos"]
)

app.include_router(
    igrejas.router,
    prefix=f"{settings.API_V1_PREFIX}/igrejas",
    tags=["Igrejas"]
)

app.include_router(
    usuarios.router,
    prefix=f"{settings.API_V1_PREFIX}/usuarios",
    tags=["Usuários"]
)

app.include_router(
    pregadores.router,
    prefix=f"{settings.API_V1_PREFIX}/pregadores",
    tags=["Pregadores"]
)

app.include_router(
    escalas.router,
    prefix=f"{settings.API_V1_PREFIX}/escalas",
    tags=["Escalas"]
)

app.include_router(
    pregacoes.router,
    prefix=f"{settings.API_V1_PREFIX}/pregacoes",
    tags=["Pregações"]
)

app.include_router(
    tematicas.router,
    prefix=f"{settings.API_V1_PREFIX}/tematicas",
    tags=["Temáticas"]
)

app.include_router(
    avaliacoes.router,
    prefix=f"{settings.API_V1_PREFIX}/avaliacoes",
    tags=["Avaliações"]
)

app.include_router(
    notificacoes.router,
    prefix=f"{settings.API_V1_PREFIX}/notificacoes",
    tags=["Notificações"]
)

app.include_router(
    trocas.router,
    prefix=f"{settings.API_V1_PREFIX}/trocas",
    tags=["Trocas de Escala"]
)

app.include_router(
    horarios_cultos.router,
    prefix=f"{settings.API_V1_PREFIX}",
    tags=["Horários de Cultos"]
)

app.include_router(
    importacoes.router,
    prefix=f"{settings.API_V1_PREFIX}/importacoes",
    tags=["Importações"]
)

app.include_router(
    configuracoes.router,
    prefix=f"{settings.API_V1_PREFIX}/configuracoes",
    tags=["Configurações"]
)

app.include_router(
    qrcodes.router,
    prefix=f"{settings.API_V1_PREFIX}/qrcodes",
    tags=["QR Codes"]
)

# ============================================================
# EVENTOS
# ============================================================
@app.on_event("startup")
async def startup_event():
    """Executado ao iniciar a aplicação"""
    logger.info(f"Iniciando {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Ambiente: {settings.ENVIRONMENT}")
    logger.info(f"Debug: {settings.DEBUG}")

    # Criar tabelas (apenas em desenvolvimento, usar Alembic em produção)
    if settings.ENVIRONMENT == "development":
        Base.metadata.create_all(bind=engine)
        logger.info("Tabelas criadas/verificadas no banco de dados")


@app.on_event("shutdown")
async def shutdown_event():
    """Executado ao encerrar a aplicação"""
    logger.info("Encerrando aplicação...")


# ============================================================
# ROTAS PRINCIPAIS
# ============================================================
@app.get("/")
async def root():
    """Rota raiz - Informações da API"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "redoc": "/redoc",
        "api_v1": settings.API_V1_PREFIX
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


# ============================================================
# EXCEPTION HANDLERS
# ============================================================
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handler global para exceções não tratadas"""
    logger.error(f"Erro não tratado: {exc}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Erro interno do servidor",
            "error": str(exc) if settings.DEBUG else "Erro interno"
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
