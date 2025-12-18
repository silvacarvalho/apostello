# Sistema de Gerenciamento de Escalas - Melhores Práticas

## Guia Completo de Boas Práticas para Desenvolvimento

---

## ÍNDICE

1. [Arquitetura Geral](#1-arquitetura-geral)
2. [Backend - Python + FastAPI](#2-backend---python--fastapi)
3. [Frontend - React](#3-frontend---react)
4. [Mobile - React Native](#4-mobile---react-native)
5. [Banco de Dados - PostgreSQL](#5-banco-de-dados---postgresql)
6. [Segurança](#6-segurança)
7. [Performance e Otimização](#7-performance-e-otimização)
8. [Testes](#8-testes)
9. [DevOps e Deploy](#9-devops-e-deploy)
10. [Documentação](#10-documentação)
11. [Git e Versionamento](#11-git-e-versionamento)
12. [Monitoramento e Logs](#12-monitoramento-e-logs)

---

## 1. ARQUITETURA GERAL

### 1.1 Estrutura de Pastas do Projeto

```
escalas-pregacao/
├── backend/                 # API FastAPI
│   ├── app/
│   │   ├── api/            # Endpoints
│   │   ├── core/           # Configurações
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Lógica de negócio
│   │   ├── repositories/   # Acesso a dados
│   │   └── utils/          # Utilitários
│   ├── tests/
│   ├── alembic/            # Migrações
│   └── requirements.txt
│
├── frontend/               # React Web
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── pages/         # Páginas
│   │   ├── services/      # API calls
│   │   ├── hooks/         # Custom hooks
│   │   ├── contexts/      # Context API
│   │   ├── utils/         # Utilitários
│   │   └── assets/        # Imagens, fontes, etc
│   ├── public/
│   └── package.json
│
├── mobile/                 # React Native
│   ├── src/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── navigation/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
│   ├── android/
│   ├── ios/
│   └── package.json
│
├── database/
│   ├── migrations/        # SQL migrations
│   ├── seeds/            # Dados iniciais
│   └── scripts/          # Scripts utilitários
│
├── docs/                  # Documentação
│   ├── api/              # Documentação da API
│   ├── database/         # Modelo de dados
│   └── guides/           # Guias de uso
│
└── docker/               # Configurações Docker
    ├── docker-compose.yml
    ├── Dockerfile.backend
    └── Dockerfile.frontend
```

### 1.2 Princípios Arquiteturais

#### Clean Architecture
- **Separação de Responsabilidades:** Cada camada tem uma responsabilidade única
- **Dependências Unidirecionais:** Camadas externas dependem de internas, nunca o contrário
- **Inversão de Dependências:** Use interfaces/abstrações

#### Camadas da Aplicação

```
┌─────────────────────────────────────────┐
│         API Layer (FastAPI)             │  ← Endpoints HTTP
├─────────────────────────────────────────┤
│      Service Layer (Business Logic)     │  ← Regras de negócio
├─────────────────────────────────────────┤
│    Repository Layer (Data Access)       │  ← Acesso a dados
├─────────────────────────────────────────┤
│      Model Layer (SQLAlchemy)           │  ← Entidades
└─────────────────────────────────────────┘
```

**Exemplo de Implementação:**

```python
# models/usuario.py (Camada de Modelo)
from sqlalchemy import Column, Integer, String, Enum
from app.database import Base

class Usuario(Base):
    __tablename__ = "usuario"
    id = Column(Integer, primary_key=True)
    nome_completo = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    tipo = Column(Enum('ADMIN', 'PASTOR_DISTRITAL', 'PREGADOR', name='tipo_usuario'))

# repositories/usuario_repository.py (Camada de Repositório)
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate

class UsuarioRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_id(self, usuario_id: int) -> Optional[Usuario]:
        return self.db.query(Usuario).filter(Usuario.id == usuario_id).first()
    
    def get_by_email(self, email: str) -> Optional[Usuario]:
        return self.db.query(Usuario).filter(Usuario.email == email).first()
    
    def create(self, usuario_data: UsuarioCreate) -> Usuario:
        usuario = Usuario(**usuario_data.dict())
        self.db.add(usuario)
        self.db.commit()
        self.db.refresh(usuario)
        return usuario
    
    def list_by_tipo(self, tipo: str) -> List[Usuario]:
        return self.db.query(Usuario).filter(Usuario.tipo == tipo).all()

# services/usuario_service.py (Camada de Serviço)
from typing import List
from fastapi import HTTPException
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas.usuario import UsuarioCreate, UsuarioResponse
from app.utils.security import hash_password

class UsuarioService:
    def __init__(self, repository: UsuarioRepository):
        self.repository = repository
    
    def criar_usuario(self, usuario_data: UsuarioCreate) -> UsuarioResponse:
        # Validações de negócio
        existing = self.repository.get_by_email(usuario_data.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        
        # Hash da senha
        usuario_data.senha_hash = hash_password(usuario_data.senha)
        
        # Criar usuário
        usuario = self.repository.create(usuario_data)
        return UsuarioResponse.from_orm(usuario)
    
    def listar_pregadores(self) -> List[UsuarioResponse]:
        pregadores = self.repository.list_by_tipo('PREGADOR')
        return [UsuarioResponse.from_orm(p) for p in pregadores]

# api/endpoints/usuarios.py (Camada de API)
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.usuario_service import UsuarioService
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas.usuario import UsuarioCreate, UsuarioResponse

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

@router.post("/", response_model=UsuarioResponse, status_code=201)
def criar_usuario(
    usuario_data: UsuarioCreate,
    db: Session = Depends(get_db)
):
    repository = UsuarioRepository(db)
    service = UsuarioService(repository)
    return service.criar_usuario(usuario_data)

@router.get("/pregadores", response_model=List[UsuarioResponse])
def listar_pregadores(db: Session = Depends(get_db)):
    repository = UsuarioRepository(db)
    service = UsuarioService(repository)
    return service.listar_pregadores()
```

---

## 2. BACKEND - Python + FastAPI

### 2.1 Estrutura de Diretórios Backend

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Entry point
│   ├── database.py             # Configuração DB
│   ├── dependencies.py         # Injeção de dependências
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py            # Dependências comuns
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── endpoints/
│   │       │   ├── auth.py
│   │       │   ├── usuarios.py
│   │       │   ├── distritos.py
│   │       │   ├── igrejas.py
│   │       │   ├── escalas.py
│   │       │   ├── avaliacoes.py
│   │       │   └── relatorios.py
│   │       └── router.py      # Agrupa todas as rotas
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py          # Configurações (Settings)
│   │   ├── security.py        # JWT, hashing
│   │   └── exceptions.py      # Exceções customizadas
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py            # Base model
│   │   ├── usuario.py
│   │   ├── distrito.py
│   │   ├── igreja.py
│   │   ├── escala.py
│   │   └── ...
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── usuario.py         # Pydantic schemas
│   │   ├── distrito.py
│   │   ├── igreja.py
│   │   ├── escala.py
│   │   └── ...
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── usuario_service.py
│   │   ├── escala_service.py
│   │   ├── avaliacao_service.py
│   │   ├── notificacao_service.py
│   │   └── ...
│   │
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── base_repository.py
│   │   ├── usuario_repository.py
│   │   ├── escala_repository.py
│   │   └── ...
│   │
│   └── utils/
│       ├── __init__.py
│       ├── email.py           # Envio de emails
│       ├── sms.py             # Envio de SMS
│       ├── pdf.py             # Geração de PDFs
│       ├── validators.py      # Validadores customizados
│       └── helpers.py         # Funções auxiliares
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py            # Fixtures pytest
│   ├── test_api/
│   ├── test_services/
│   └── test_repositories/
│
├── alembic/
│   ├── versions/
│   ├── env.py
│   └── alembic.ini
│
├── .env.example
├── .env
├── requirements.txt
├── requirements-dev.txt
└── pyproject.toml
```

### 2.2 Configurações (Settings)

**app/core/config.py:**

```python
from pydantic_settings import BaseSettings
from typing import List, Optional
from functools import lru_cache

class Settings(BaseSettings):
    # Aplicação
    APP_NAME: str = "Sistema de Escalas"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"  # development, staging, production
    
    # Servidor
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Banco de Dados
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    
    # Segurança
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173"
    ]
    CORS_CREDENTIALS: bool = True
    CORS_METHODS: List[str] = ["*"]
    CORS_HEADERS: List[str] = ["*"]
    
    # Email
    SMTP_HOST: str
    SMTP_PORT: int = 587
    SMTP_USER: str
    SMTP_PASSWORD: str
    SMTP_FROM: str
    SMTP_FROM_NAME: str = "Sistema de Escalas"
    
    # SMS (Twilio)
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None
    
    # WhatsApp
    WHATSAPP_API_URL: Optional[str] = None
    WHATSAPP_API_TOKEN: Optional[str] = None
    
    # Upload
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "pdf"]
    
    # Redis (para cache e filas)
    REDIS_URL: Optional[str] = None
    
    # Sentry (monitoramento de erros)
    SENTRY_DSN: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

### 2.3 Main Application

**app/main.py:**

```python
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import time
import logging

from app.core.config import settings
from app.core.exceptions import CustomException
from app.api.v1.router import api_router
from app.database import engine, Base

# Configurar logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Criar tabelas (em produção, usar Alembic)
# Base.metadata.create_all(bind=engine)

# Criar aplicação
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
)

# ============================================================================
# MIDDLEWARES
# ============================================================================

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
)

# Trusted Host (segurança)
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*.seudominio.com.br", "seudominio.com.br"]
    )

# Middleware de timing (logs de performance)
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # Log de requisições lentas
    if process_time > 1.0:
        logger.warning(
            f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s"
        )
    
    return response

# ============================================================================
# EXCEPTION HANDLERS
# ============================================================================

@app.exception_handler(CustomException)
async def custom_exception_handler(request: Request, exc: CustomException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.error_code,
            "message": exc.message,
            "details": exc.details
        }
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTP_ERROR",
            "message": str(exc.detail)
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "VALIDATION_ERROR",
            "message": "Dados inválidos",
            "details": exc.errors()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "message": "Erro interno do servidor"
        }
    )

# ============================================================================
# EVENTOS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    
    # Inicializar conexões (Redis, etc)
    # await redis.connect()

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down application")
    
    # Fechar conexões
    # await redis.disconnect()

# ============================================================================
# ROTAS
# ============================================================================

@app.get("/", tags=["root"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }

@app.get("/health", tags=["health"])
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT
    }

# Incluir rotas da API
app.include_router(api_router, prefix="/api/v1")

# ============================================================================
# EXECUÇÃO
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info"
    )
```

### 2.4 Database Connection

**app/database.py:**

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from app.core.config import settings

# Engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,  # Verifica conexão antes de usar
    echo=settings.DEBUG,  # Log de SQL queries
)

# Session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para models
Base = declarative_base()

# Dependency para FastAPI
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 2.5 Schemas Pydantic

**app/schemas/usuario.py:**

```python
from pydantic import BaseModel, EmailStr, constr, validator
from typing import Optional
from datetime import datetime, date
from enum import Enum

class TipoUsuario(str, Enum):
    ADMIN = "ADMIN"
    PASTOR_DISTRITAL = "PASTOR_DISTRITAL"
    LIDER_DISTRITAL = "LIDER_DISTRITAL"
    PREGADOR = "PREGADOR"
    CANTOR = "CANTOR"
    MEMBRO = "MEMBRO"

class StatusGeral(str, Enum):
    ATIVO = "ATIVO"
    INATIVO = "INATIVO"

# Schema Base
class UsuarioBase(BaseModel):
    nome_completo: constr(min_length=3, max_length=255)
    email: EmailStr
    cpf: constr(regex=r'^\d{3}\.\d{3}\.\d{3}-\d{2}$')
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    data_nascimento: Optional[date] = None
    tipo: TipoUsuario
    distrito_id: Optional[int] = None
    igreja_id: Optional[int] = None
    
    @validator('cpf')
    def validar_cpf(cls, v):
        # Implementar validação de CPF
        return v

# Schema para criação (com senha)
class UsuarioCreate(UsuarioBase):
    senha: constr(min_length=8)
    confirmar_senha: constr(min_length=8)
    
    @validator('confirmar_senha')
    def senhas_coincidem(cls, v, values):
        if 'senha' in values and v != values['senha']:
            raise ValueError('Senhas não coincidem')
        return v

# Schema para atualização
class UsuarioUpdate(BaseModel):
    nome_completo: Optional[str] = None
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    data_nascimento: Optional[date] = None
    foto_url: Optional[str] = None
    status: Optional[StatusGeral] = None

# Schema de resposta
class UsuarioResponse(BaseModel):
    id: int
    nome_completo: str
    email: str
    cpf: str
    telefone: Optional[str]
    tipo: TipoUsuario
    distrito_id: Optional[int]
    igreja_id: Optional[int]
    score_atual: Optional[float]
    status: StatusGeral
    created_at: datetime
    
    class Config:
        orm_mode = True
        from_attributes = True

# Schema de resposta detalhada (com relacionamentos)
class UsuarioDetalhado(UsuarioResponse):
    distrito_nome: Optional[str] = None
    igreja_nome: Optional[str] = None
    contador_total_participacoes: Optional[int] = None
    media_avaliacoes: Optional[float] = None
```

### 2.6 Segurança e Autenticação

**app/core/security.py:**

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.usuario import Usuario

# Context para hash de senhas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# ============================================================================
# FUNÇÕES DE HASH
# ============================================================================

def hash_password(password: str) -> str:
    """Hash de senha usando bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica senha"""
    return pwd_context.verify(plain_password, hashed_password)

# ============================================================================
# FUNÇÕES JWT
# ============================================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Cria access token JWT"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({"exp": expire, "type": "access"})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Cria refresh token JWT"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt

def decode_token(token: str) -> dict:
    """Decodifica token JWT"""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ============================================================================
# DEPENDÊNCIAS DE AUTENTICAÇÃO
# ============================================================================

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Usuario:
    """Obtém usuário autenticado"""
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    
    user_id: int = payload.get("sub")
    token_type: str = payload.get("type")
    
    if user_id is None or token_type != "access":
        raise credentials_exception
    
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    
    if user is None:
        raise credentials_exception
    
    if user.status != "ATIVO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo"
        )
    
    return user

async def get_current_active_user(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """Garante que o usuário está ativo"""
    if current_user.status != "ATIVO":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário inativo"
        )
    return current_user

# ============================================================================
# PERMISSÕES
# ============================================================================

def require_roles(allowed_roles: list):
    """Decorator para verificar permissões por role"""
    def role_checker(current_user: Usuario = Depends(get_current_user)):
        if current_user.tipo not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissão negada"
            )
        return current_user
    return role_checker

# Aliases úteis
get_current_admin = require_roles(["ADMIN"])
get_current_pastor = require_roles(["ADMIN", "PASTOR_DISTRITAL", "LIDER_DISTRITAL"])
get_current_pregador = require_roles(["PREGADOR"])
```

### 2.7 Exemplo de Endpoint Completo

**app/api/v1/endpoints/escalas.py:**

```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.usuario import Usuario
from app.schemas.escala import (
    EscalaCreate, EscalaResponse, EscalaDetalhada,
    ItemEscalaResponse, EscalaGerarRequest
)
from app.services.escala_service import EscalaService
from app.repositories.escala_repository import EscalaRepository

router = APIRouter(prefix="/escalas", tags=["escalas"])

# ============================================================================
# CRIAR ESCALA (RASCUNHO)
# ============================================================================

@router.post("/", response_model=EscalaResponse, status_code=status.HTTP_201_CREATED)
async def criar_escala(
    escala_data: EscalaCreate,
    current_user: Usuario = Depends(require_roles(["ADMIN", "PASTOR_DISTRITAL", "LIDER_DISTRITAL"])),
    db: Session = Depends(get_db)
):
    """
    Cria uma nova escala em rascunho.
    
    Permissões: ADMIN, PASTOR_DISTRITAL, LIDER_DISTRITAL
    """
    repository = EscalaRepository(db)
    service = EscalaService(repository)
    
    # Validar permissões de distrito
    if current_user.tipo in ["PASTOR_DISTRITAL", "LIDER_DISTRITAL"]:
        if escala_data.distrito_id != current_user.distrito_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para criar escala neste distrito"
            )
    
    return service.criar_escala(escala_data, current_user.id)

# ============================================================================
# GERAR ESCALA AUTOMATICAMENTE
# ============================================================================

@router.post("/gerar", response_model=EscalaDetalhada)
async def gerar_escala_automatica(
    request: EscalaGerarRequest,
    current_user: Usuario = Depends(require_roles(["ADMIN", "PASTOR_DISTRITAL", "LIDER_DISTRITAL"])),
    db: Session = Depends(get_db)
):
    """
    Gera escala automaticamente usando algoritmo de distribuição.
    
    Permissões: ADMIN, PASTOR_DISTRITAL, LIDER_DISTRITAL
    
    O algoritmo considera:
    - Score dos pregadores/cantores
    - Recorrência máxima configurada
    - Intervalo mínimo entre participações
    - Preferências de igreja (se habilitado)
    - Indisponibilidades
    - Bloqueios temporários
    """
    repository = EscalaRepository(db)
    service = EscalaService(repository)
    
    # Usar distrito do usuário logado
    distrito_id = current_user.distrito_id
    
    if current_user.tipo == "ADMIN" and request.distrito_id:
        distrito_id = request.distrito_id
    
    return service.gerar_escala_automatica(
        distrito_id=distrito_id,
        mes=request.mes,
        ano=request.ano,
        pastor_id=current_user.id
    )

# ============================================================================
# LISTAR ESCALAS
# ============================================================================

@router.get("/", response_model=List[EscalaResponse])
async def listar_escalas(
    distrito_id: Optional[int] = Query(None),
    mes: Optional[int] = Query(None, ge=1, le=12),
    ano: Optional[int] = Query(None, ge=2024),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista escalas com filtros opcionais.
    
    Filtros por distrito são aplicados automaticamente conforme permissões.
    """
    repository = EscalaRepository(db)
    service = EscalaService(repository)
    
    # Aplicar filtro de distrito conforme permissões
    if current_user.tipo in ["PASTOR_DISTRITAL", "LIDER_DISTRITAL"]:
        distrito_id = current_user.distrito_id
    
    return service.listar_escalas(
        distrito_id=distrito_id,
        mes=mes,
        ano=ano,
        status=status,
        skip=skip,
        limit=limit
    )

# ============================================================================
# OBTER ESCALA POR ID
# ============================================================================

@router.get("/{escala_id}", response_model=EscalaDetalhada)
async def obter_escala(
    escala_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtém detalhes completos de uma escala incluindo itens.
    """
    repository = EscalaRepository(db)
    service = EscalaService(repository)
    
    escala = service.obter_escala(escala_id)
    
    # Validar permissões
    if current_user.tipo in ["PASTOR_DISTRITAL", "LIDER_DISTRITAL"]:
        if escala.distrito_id != current_user.distrito_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a esta escala"
            )
    
    return escala

# ============================================================================
# PUBLICAR ESCALA
# ============================================================================

@router.post("/{escala_id}/publicar", response_model=EscalaResponse)
async def publicar_escala(
    escala_id: int,
    current_user: Usuario = Depends(require_roles(["ADMIN", "PASTOR_DISTRITAL", "LIDER_DISTRITAL"])),
    db: Session = Depends(get_db)
):
    """
    Publica escala e dispara notificações para todos os escalados.
    
    Validações executadas:
    - Todas as igrejas têm pregador
    - Não há conflitos de data/horário
    - Respeitadas regras de recorrência
    """
    repository = EscalaRepository(db)
    service = EscalaService(repository)
    
    return service.publicar_escala(escala_id, current_user.id)

# ============================================================================
# DELETAR ESCALA
# ============================================================================

@router.delete("/{escala_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_escala(
    escala_id: int,
    current_user: Usuario = Depends(require_roles(["ADMIN", "PASTOR_DISTRITAL", "LIDER_DISTRITAL"])),
    db: Session = Depends(get_db)
):
    """
    Deleta uma escala.
    
    Apenas escalas em RASCUNHO podem ser deletadas.
    """
    repository = EscalaRepository(db)
    service = EscalaService(repository)
    
    service.deletar_escala(escala_id, current_user.id)
    return None
```

### 2.8 Tratamento de Erros Customizados

**app/core/exceptions.py:**

```python
from typing import Any, Optional

class CustomException(Exception):
    """Exceção base customizada"""
    
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: Optional[Any] = None
    ):
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.details = details
        super().__init__(self.message)

class NotFoundException(CustomException):
    """Recurso não encontrado"""
    
    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            status_code=404,
            error_code="NOT_FOUND",
            message=f"{resource} não encontrado",
            details={"identifier": identifier}
        )

class ValidationException(CustomException):
    """Erro de validação de negócio"""
    
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(
            status_code=400,
            error_code="VALIDATION_ERROR",
            message=message,
            details=details
        )

class UnauthorizedException(CustomException):
    """Não autorizado"""
    
    def __init__(self, message: str = "Não autorizado"):
        super().__init__(
            status_code=401,
            error_code="UNAUTHORIZED",
            message=message
        )

class ForbiddenException(CustomException):
    """Acesso negado"""
    
    def __init__(self, message: str = "Acesso negado"):
        super().__init__(
            status_code=403,
            error_code="FORBIDDEN",
            message=message
        )

class ConflictException(CustomException):
    """Conflito de dados"""
    
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(
            status_code=409,
            error_code="CONFLICT",
            message=message,
            details=details
        )

# Exemplo de uso:
# raise NotFoundException("Escala", escala_id)
# raise ValidationException("Igreja já possui escala para este mês", {"mes": 1, "ano": 2025})
```

### 2.9 Requirements.txt

```txt
# FastAPI e servidor
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Banco de dados
sqlalchemy==2.0.25
alembic==1.13.1
psycopg2-binary==2.9.9

# Pydantic
pydantic==2.5.3
pydantic-settings==2.1.0
email-validator==2.1.0

# Segurança
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==4.1.2

# Utilitários
python-dateutil==2.8.2
pytz==2023.3

# Email
aiosmtplib==3.0.1
jinja2==3.1.3

# SMS/WhatsApp
twilio==8.11.1

# Geração de PDFs/Excel
reportlab==4.0.9
openpyxl==3.1.2

# Cache
redis==5.0.1
aioredis==2.0.1

# Tasks assíncronas
celery==5.3.4

# Monitoramento
sentry-sdk==1.39.2

# Testes
pytest==7.4.4
pytest-asyncio==0.23.3
pytest-cov==4.1.0
httpx==0.26.0

# Desenvolvimento
black==24.1.1
flake8==7.0.0
mypy==1.8.0
pre-commit==3.6.0
```

---

## 3. FRONTEND - React

### 3.1 Estrutura de Diretórios Frontend

```
frontend/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
│
├── src/
│   ├── index.tsx              # Entry point
│   ├── App.tsx                # Componente raiz
│   ├── routes.tsx             # Definição de rotas
│   │
│   ├── components/            # Componentes reutilizáveis
│   │   ├── common/
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.styles.ts
│   │   │   │   └── Button.test.tsx
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── Card/
│   │   │   ├── Table/
│   │   │   └── Loading/
│   │   │
│   │   ├── layout/
│   │   │   ├── Header/
│   │   │   ├── Sidebar/
│   │   │   ├── Footer/
│   │   │   └── Layout/
│   │   │
│   │   └── domain/           # Componentes de domínio
│   │       ├── EscalaCard/
│   │       ├── PregadorSelect/
│   │       ├── CalendarioEscala/
│   │       └── AvaliacaoForm/
│   │
│   ├── pages/                # Páginas da aplicação
│   │   ├── Login/
│   │   ├── Dashboard/
│   │   ├── Escalas/
│   │   │   ├── EscalasList.tsx
│   │   │   ├── EscalaCreate.tsx
│   │   │   ├── EscalaEdit.tsx
│   │   │   └── EscalaView.tsx
│   │   ├── Pregadores/
│   │   ├── Avaliacoes/
│   │   └── Relatorios/
│   │
│   ├── services/             # Chamadas API
│   │   ├── api.ts           # Cliente Axios configurado
│   │   ├── auth.service.ts
│   │   ├── escala.service.ts
│   │   ├── usuario.service.ts
│   │   └── avaliacao.service.ts
│   │
│   ├── hooks/               # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useEscalas.ts
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   └── useNotification.ts
│   │
│   ├── contexts/            # React Context
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── NotificationContext.tsx
│   │
│   ├── store/              # Estado global (se usar Redux/Zustand)
│   │   ├── index.ts
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   └── escalaSlice.ts
│   │   └── store.ts
│   │
│   ├── types/              # TypeScript types
│   │   ├── usuario.types.ts
│   │   ├── escala.types.ts
│   │   ├── avaliacao.types.ts
│   │   └── api.types.ts
│   │
│   ├── utils/              # Funções utilitárias
│   │   ├── formatters.ts  # Formatação de data, CPF, etc
│   │   ├── validators.ts  # Validações
│   │   ├── constants.ts   # Constantes
│   │   └── helpers.ts
│   │
│   ├── styles/            # Estilos globais
│   │   ├── global.css
│   │   ├── variables.css
│   │   └── theme.ts
│   │
│   └── assets/           # Recursos estáticos
│       ├── images/
│       ├── icons/
│       └── fonts/
│
├── .env.example
├── .env
├── .eslintrc.js
├── .prettierrc
├── tsconfig.json
└── package.json
```

### 3.2 Configuração do Axios

**src/services/api.ts:**

```typescript
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Criar instância do Axios
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Adicionar token
api.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Tratar erros
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Token expirado - tentar refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        
        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);
        
        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        // Refresh falhou - fazer logout
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

### 3.3 Context de Autenticação

**src/contexts/AuthContext.tsx:**

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { Usuario } from '../types/usuario.types';

interface AuthContextData {
  user: Usuario | null;
  loading: boolean;
  signed: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): void;
  updateUser(user: Usuario): void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carregar usuário do localStorage
    const loadUser = async () => {
      const token = localStorage.getItem('access_token');
      
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      
      setLoading(false);
    };

    loadUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      const { access_token, refresh_token, user: userData } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const signOut = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const updateUser = (updatedUser: Usuario) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signed: !!user,
        signIn,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
```

### 3.4 Service de Escalas

**src/services/escala.service.ts:**

```typescript
import api from './api';
import {
  Escala,
  EscalaCreate,
  EscalaDetalhada,
  EscalaGerarRequest,
  ItemEscala,
} from '../types/escala.types';

class EscalaService {
  // Listar escalas
  async list(params?: {
    distrito_id?: number;
    mes?: number;
    ano?: number;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<Escala[]> {
    const response = await api.get('/escalas', { params });
    return response.data;
  }

  // Obter escala por ID
  async get(id: number): Promise<EscalaDetalhada> {
    const response = await api.get(`/escalas/${id}`);
    return response.data;
  }

  // Criar escala
  async create(data: EscalaCreate): Promise<Escala> {
    const response = await api.post('/escalas', data);
    return response.data;
  }

  // Gerar escala automaticamente
  async gerar(data: EscalaGerarRequest): Promise<EscalaDetalhada> {
    const response = await api.post('/escalas/gerar', data);
    return response.data;
  }

  // Publicar escala
  async publicar(id: number): Promise<Escala> {
    const response = await api.post(`/escalas/${id}/publicar`);
    return response.data;
  }

  // Atualizar item da escala
  async updateItem(itemId: number, data: Partial<ItemEscala>): Promise<ItemEscala> {
    const response = await api.put(`/escalas/itens/${itemId}`, data);
    return response.data;
  }

  // Deletar escala
  async delete(id: number): Promise<void> {
    await api.delete(`/escalas/${id}`);
  }

  // Exportar escala PDF
  async exportPDF(id: number): Promise<Blob> {
    const response = await api.get(`/escalas/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  }
}

export default new EscalaService();
```

### 3.5 Custom Hook de Escalas

**src/hooks/useEscalas.ts:**

```typescript
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import escalaService from '../services/escala.service';
import { Escala, EscalaCreate } from '../types/escala.types';
import { useNotification } from './useNotification';

export const useEscalas = (params?: {
  distrito_id?: number;
  mes?: number;
  ano?: number;
  status?: string;
}) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  // Query para listar escalas
  const {
    data: escalas,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['escalas', params],
    queryFn: () => escalaService.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Mutation para criar escala
  const createMutation = useMutation({
    mutationFn: (data: EscalaCreate) => escalaService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalas'] });
      showSuccess('Escala criada com sucesso!');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Erro ao criar escala');
    },
  });

  // Mutation para gerar escala
  const gerarMutation = useMutation({
    mutationFn: escalaService.gerar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalas'] });
      showSuccess('Escala gerada com sucesso!');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Erro ao gerar escala');
    },
  });

  // Mutation para publicar escala
  const publicarMutation = useMutation({
    mutationFn: (id: number) => escalaService.publicar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalas'] });
      showSuccess('Escala publicada com sucesso! Notificações enviadas.');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Erro ao publicar escala');
    },
  });

  // Mutation para deletar escala
  const deleteMutation = useMutation({
    mutationFn: (id: number) => escalaService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalas'] });
      showSuccess('Escala deletada com sucesso!');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Erro ao deletar escala');
    },
  });

  return {
    escalas,
    isLoading,
    error,
    refetch,
    createEscala: createMutation.mutate,
    gerarEscala: gerarMutation.mutate,
    publicarEscala: publicarMutation.mutate,
    deleteEscala: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isGerando: gerarMutation.isPending,
    isPublicando: publicarMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
```

### 3.6 Componente de Exemplo

**src/pages/Escalas/EscalasList.tsx:**

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEscalas } from '../../hooks/useEscalas';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Card, Table, Loading, Badge } from '../../components/common';
import { formatDate } from '../../utils/formatters';

const EscalasList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
  });

  const {
    escalas,
    isLoading,
    publicarEscala,
    deleteEscala,
    isPublicando,
    isDeleting,
  } = useEscalas({
    distrito_id: user?.distrito_id,
    mes: filters.mes,
    ano: filters.ano,
  });

  const handleGerarNova = () => {
    navigate('/escalas/gerar');
  };

  const handlePublicar = (id: number) => {
    if (window.confirm('Deseja publicar esta escala? Notificações serão enviadas.')) {
      publicarEscala(id);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Deseja deletar esta escala?')) {
      deleteEscala(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      RASCUNHO: { label: 'Rascunho', color: 'warning' },
      PUBLICADA: { label: 'Publicada', color: 'success' },
      ARQUIVADA: { label: 'Arquivada', color: 'default' },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap];

    return (
      <Badge color={statusInfo.color as any}>
        {statusInfo.label}
      </Badge>
    );
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="escalas-list-container">
      <div className="header">
        <h1>Escalas de Pregação</h1>
        <Button onClick={handleGerarNova} variant="primary">
          + Gerar Nova Escala
        </Button>
      </div>

      <Card>
        <div className="filters">
          <select
            value={filters.mes}
            onChange={(e) => setFilters({ ...filters, mes: Number(e.target.value) })}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString('pt-BR', { month: 'long' })}
              </option>
            ))}
          </select>

          <select
            value={filters.ano}
            onChange={(e) => setFilters({ ...filters, ano: Number(e.target.value) })}
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>

        <Table
          columns={[
            {
              header: 'Mês/Ano',
              accessor: (row) => `${row.mes.toString().padStart(2, '0')}/${row.ano}`,
            },
            {
              header: 'Status',
              accessor: (row) => getStatusBadge(row.status),
            },
            {
              header: 'Data Publicação',
              accessor: (row) =>
                row.data_publicacao ? formatDate(row.data_publicacao) : '-',
            },
            {
              header: 'Total de Cultos',
              accessor: (row) => row.total_itens || 0,
            },
            {
              header: 'Ações',
              accessor: (row) => (
                <div className="actions">
                  <Button
                    size="small"
                    onClick={() => navigate(`/escalas/${row.id}`)}
                  >
                    Ver Detalhes
                  </Button>

                  {row.status === 'RASCUNHO' && (
                    <>
                      <Button
                        size="small"
                        variant="success"
                        onClick={() => handlePublicar(row.id)}
                        loading={isPublicando}
                      >
                        Publicar
                      </Button>

                      <Button
                        size="small"
                        variant="danger"
                        onClick={() => handleDelete(row.id)}
                        loading={isDeleting}
                      >
                        Deletar
                      </Button>
                    </>
                  )}

                  {row.status === 'PUBLICADA' && (
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => navigate(`/escalas/${row.id}/pdf`)}
                    >
                      Exportar PDF
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          data={escalas || []}
          emptyMessage="Nenhuma escala encontrada"
        />
      </Card>
    </div>
  );
};

export default EscalasList;
```

### 3.7 Package.json

```json
{
  "name": "sistema-escalas-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "@tanstack/react-query": "^5.17.0",
    "axios": "^1.6.5",
    "date-fns": "^3.0.6",
    "react-hook-form": "^7.49.3",
    "react-toastify": "^10.0.4",
    "recharts": "^2.10.3",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.47",
    "@types/react-dom": "^18.2.18",
    "@types/node": "^20.10.6",
    "@typescript-eslint/eslint-plugin": "^6.18.0",
    "@typescript-eslint/parser": "^6.18.0",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react": "^7.33.2",
    "prettier": "^3.1.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.11",
    "@vitejs/plugin-react": "^4.2.1"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
  }
}
```

---

## 4. MOBILE - React Native

### 4.1 Estrutura de Diretórios Mobile

```
mobile/
├── src/
│   ├── @types/              # TypeScript types
│   │
│   ├── components/          # Componentes reutilizáveis
│   │   ├── common/
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Card/
│   │   │   └── Loading/
│   │   └── domain/
│   │       ├── EscalaCard/
│   │       └── CalendarioMobile/
│   │
│   ├── screens/            # Telas
│   │   ├── Auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── Home/
│   │   ├── MinhasEscalas/
│   │   ├── Calendario/
│   │   ├── Perfil/
│   │   └── Avaliacoes/
│   │
│   ├── navigation/         # Navegação
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── types.ts
│   │
│   ├── services/          # API services
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   └── escala.service.ts
│   │
│   ├── hooks/            # Custom hooks
│   │   ├── useAuth.ts
│   │   └── useEscalas.ts
│   │
│   ├── contexts/         # Contexts
│   │   └── AuthContext.tsx
│   │
│   ├── utils/           # Utilitários
│   │   ├── formatters.ts
│   │   └── storage.ts
│   │
│   └── config/         # Configurações
│       └── constants.ts
│
├── android/
├── ios/
├── app.json
└── package.json
```

### 4.2 Navegação (React Navigation)

**src/navigation/AppNavigator.tsx:**

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

import { useAuth } from '../contexts/AuthContext';

// Screens
import LoginScreen from '../screens/Auth/LoginScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import MinhasEscalasScreen from '../screens/MinhasEscalas/MinhasEscalasScreen';
import CalendarioScreen from '../screens/Calendario/CalendarioScreen';
import PerfilScreen from '../screens/Perfil/PerfilScreen';
import AvaliacoesScreen from '../screens/Avaliacoes/AvaliacoesScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tabs principais
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'MinhasEscalas':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Calendario':
              iconName = focused ? 'calendar-sharp' : 'calendar-outline';
              break;
            case 'Avaliacoes':
              iconName = focused ? 'star' : 'star-outline';
              break;
            case 'Perfil':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Início' }} />
      <Tab.Screen
        name="MinhasEscalas"
        component={MinhasEscalasScreen}
        options={{ title: 'Minhas Escalas' }}
      />
      <Tab.Screen
        name="Calendario"
        component={CalendarioScreen}
        options={{ title: 'Calendário' }}
      />
      <Tab.Screen
        name="Avaliacoes"
        component={AvaliacoesScreen}
        options={{ title: 'Avaliações' }}
      />
      <Tab.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
};

// Navegador principal
const AppNavigator = () => {
  const { signed, loading } = useAuth();

  if (loading) {
    return null; // ou um componente de Loading
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {signed ? (
          <Stack.Screen name="MainTabs" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
```

### 4.3 Tela de Exemplo - Minhas Escalas

**src/screens/MinhasEscalas/MinhasEscalasScreen.tsx:**

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useEscalas } from '../../hooks/useEscalas';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/formatters';
import { Button, Card, Loading } from '../../components/common';

const MinhasEscalasScreen = () => {
  const { user } = useAuth();
  const { escalasUsuario, isLoading, refetch } = useEscalas(user?.id);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMADO':
        return '#10b981';
      case 'PENDENTE':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const renderEscalaItem = ({ item }: any) => (
    <Card style={styles.escalaCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.data}>{formatDate(item.data_culto, 'dd/MM/yyyy')}</Text>
          <Text style={styles.diaSemana}>
            {formatDate(item.data_culto, 'EEEE', { locale: 'pt-BR' })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Icon name="time-outline" size={18} color="#6b7280" />
          <Text style={styles.infoText}>{item.horario}</Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="business-outline" size={18} color="#6b7280" />
          <Text style={styles.infoText}>{item.igreja_nome}</Text>
        </View>

        {item.tema && (
          <View style={styles.infoRow}>
            <Icon name="book-outline" size={18} color="#6b7280" />
            <Text style={styles.infoText}>{item.tema}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        {item.status === 'PENDENTE' && (
          <Button
            title="Confirmar Presença"
            variant="primary"
            onPress={() => handleConfirmar(item.id)}
            style={styles.button}
          />
        )}

        <Button
          title="Solicitar Troca"
          variant="secondary"
          onPress={() => handleSolicitarTroca(item.id)}
          style={styles.button}
        />
      </View>
    </Card>
  );

  const handleConfirmar = (itemId: number) => {
    // Lógica de confirmação
  };

  const handleSolicitarTroca = (itemId: number) => {
    // Navegar para tela de solicitação de troca
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Minhas Escalas</Text>
        <Text style={styles.subtitle}>
          {escalasUsuario?.length || 0} pregações/louvor agendados
        </Text>
      </View>

      <FlatList
        data={escalasUsuario}
        renderItem={renderEscalaItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="calendar-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>Você não possui escalas agendadas</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  listContainer: {
    padding: 16,
  },
  escalaCard: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  data: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  diaSemana: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9ca3af',
  },
});

export default MinhasEscalasScreen;
```

### 4.4 Push Notifications

**Configuração de Push Notifications com Firebase:**

```typescript
// src/services/notification.service.ts
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationService {
  async requestPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      return true;
    }
    
    return false;
  }

  async getToken() {
    try {
      const token = await messaging().getToken();
      console.log('FCM Token:', token);
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  async setupNotifications() {
    // Request permission
    await this.requestPermission();

    // Get token
    const token = await this.getToken();
    
    if (token) {
      // Save token to AsyncStorage
      await AsyncStorage.setItem('fcm_token', token);
      
      // Send token to backend
      // await api.post('/notifications/register-device', { token });
    }

    // Listen to token refresh
    messaging().onTokenRefresh((newToken) => {
      console.log('New FCM Token:', newToken);
      AsyncStorage.setItem('fcm_token', newToken);
      // Send new token to backend
    });

    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message:', remoteMessage);
      // Show local notification
    });

    // Handle background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message:', remoteMessage);
    });
  }
}

export default new NotificationService();
```

---

## 5. BANCO DE DADOS - PostgreSQL

### 5.1 Otimizações e Índices

**Índices Essenciais:**

```sql
-- Performance em queries de escala
CREATE INDEX CONCURRENTLY idx_item_escala_performance 
ON item_escala(data_culto, status_realizacao) 
INCLUDE (pregador_id, cantor_id);

-- Busca de pregadores disponíveis
CREATE INDEX CONCURRENTLY idx_usuario_disponivel 
ON usuario(distrito_id, tipo, status, score_atual DESC) 
WHERE tipo IN ('PREGADOR', 'CANTOR');

-- Queries de avaliação
CREATE INDEX CONCURRENTLY idx_avaliacao_performance 
ON avaliacao(avaliado_id, created_at DESC);

-- Full-text search
CREATE INDEX CONCURRENTLY idx_usuario_nome_fulltext 
ON usuario USING gin(to_tsvector('portuguese', nome_completo));
```

### 5.2 Particionamento (para tabelas grandes)

```sql
-- Particionar tabela de notificações por mês
CREATE TABLE notificacao_particioned (
    LIKE notificacao INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Criar partições
CREATE TABLE notificacao_2025_01 PARTITION OF notificacao_particioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE notificacao_2025_02 PARTITION OF notificacao_particioned
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

### 5.3 Materialized Views para Relatórios

```sql
-- View materializada para dashboard
CREATE MATERIALIZED VIEW mv_dashboard_estatisticas AS
SELECT 
    d.id AS distrito_id,
    d.nome AS distrito_nome,
    COUNT(DISTINCT i.id) AS total_igrejas,
    COUNT(DISTINCT CASE WHEN u.tipo = 'PREGADOR' THEN u.id END) AS total_pregadores,
    AVG(CASE WHEN u.tipo = 'PREGADOR' THEN u.score_atual END) AS media_score_pregadores,
    COUNT(DISTINCT ie.id) FILTER (WHERE ie.data_culto >= CURRENT_DATE - INTERVAL '30 days') AS cultos_ultimo_mes
FROM distrito d
LEFT JOIN igreja i ON i.distrito_id = d.id
LEFT JOIN usuario u ON u.distrito_id = d.id
LEFT JOIN item_escala ie ON ie.igreja_id = i.id
WHERE d.status = 'ATIVO'
GROUP BY d.id, d.nome;

-- Criar índice na view
CREATE INDEX idx_mv_dashboard_distrito ON mv_dashboard_estatisticas(distrito_id);

-- Refresh da view (executar periodicamente)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_estatisticas;
```

### 5.4 Backup e Restore

```bash
# Backup completo
pg_dump -h localhost -U usuario -d escalas_db -F c -b -v -f backup_$(date +%Y%m%d).dump

# Backup apenas schema
pg_dump -h localhost -U usuario -d escalas_db --schema-only -f schema_$(date +%Y%m%d).sql

# Backup apenas dados
pg_dump -h localhost -U usuario -d escalas_db --data-only -f data_$(date +%Y%m%d).sql

# Restore
pg_restore -h localhost -U usuario -d escalas_db -v backup_20250101.dump

# Backup automático (cron)
# Adicionar ao crontab: 0 2 * * * /path/to/backup_script.sh
```
## 6. SEGURANÇA

### 6.1 Autenticação e Autorização

#### JWT Best Practices

```python
# app/core/security.py

from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
import secrets

class SecurityManager:
    """Gerenciador centralizado de segurança"""
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Gera token criptograficamente seguro"""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def create_token_with_claims(
        user_id: int,
        tipo: str,
        distrito_id: Optional[int] = None,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Cria JWT com claims customizados"""
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        
        to_encode = {
            "sub": str(user_id),
            "tipo": tipo,
            "distrito_id": distrito_id,
            "exp": expire,
            "iat": datetime.utcnow(),
            "jti": secrets.token_urlsafe(16),  # JWT ID único
        }
        
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    @staticmethod
    def verify_token_claims(token: str, required_tipo: Optional[list] = None) -> dict:
        """Verifica e valida claims do token"""
        
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            
            # Validar tipo de usuário se especificado
            if required_tipo and payload.get("tipo") not in required_tipo:
                raise JWTError("Tipo de usuário não autorizado")
            
            return payload
            
        except JWTError as e:
            raise UnauthorizedException(f"Token inválido: {str(e)}")
```

#### Rate Limiting

```python
# app/middleware/rate_limit.py

from fastapi import Request, HTTPException
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Criar limiter
limiter = Limiter(key_func=get_remote_address)

# Configurar no main.py
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Usar em endpoints
@app.post("/api/v1/auth/login")
@limiter.limit("5/minute")  # 5 tentativas por minuto
async def login(request: Request, credentials: LoginRequest):
    # Implementação
    pass

# Rate limit dinâmico baseado no usuário
async def get_rate_limit_key(request: Request):
    """Chave de rate limit baseada em usuário autenticado"""
    token = request.headers.get("Authorization")
    if token:
        try:
            payload = decode_token(token.replace("Bearer ", ""))
            return f"user:{payload['sub']}"
        except:
            pass
    return get_remote_address(request)
```

### 6.2 Proteção contra Ataques

#### SQL Injection Prevention

```python
# ✅ CORRETO - Usar ORM
def get_usuario_by_email(db: Session, email: str) -> Usuario:
    return db.query(Usuario).filter(Usuario.email == email).first()

# ✅ CORRETO - Usar parâmetros em raw SQL
def search_usuarios(db: Session, search: str):
    query = text("SELECT * FROM usuario WHERE nome_completo ILIKE :search")
    return db.execute(query, {"search": f"%{search}%"}).fetchall()

# ❌ ERRADO - Concatenar strings
def search_usuarios_insecure(db: Session, search: str):
    query = f"SELECT * FROM usuario WHERE nome_completo ILIKE '%{search}%'"
    return db.execute(text(query)).fetchall()
```

#### XSS Prevention

```python
# app/utils/sanitizers.py

import bleach
from html import escape

def sanitize_html(text: str, allowed_tags: list = None) -> str:
    """Remove tags HTML perigosas"""
    if allowed_tags is None:
        allowed_tags = ['b', 'i', 'u', 'em', 'strong', 'p', 'br']
    
    return bleach.clean(
        text,
        tags=allowed_tags,
        attributes={},
        strip=True
    )

def escape_html(text: str) -> str:
    """Escapa caracteres HTML"""
    return escape(text)

# Uso em schemas
class ComentarioCreate(BaseModel):
    texto: str
    
    @validator('texto')
    def sanitize_texto(cls, v):
        return sanitize_html(v)
```

#### CSRF Protection

```python
# app/middleware/csrf.py

from fastapi import Request, HTTPException
from itsdangerous import URLSafeTimedSerializer
import secrets

class CSRFProtection:
    def __init__(self, secret_key: str):
        self.serializer = URLSafeTimedSerializer(secret_key)
    
    def generate_token(self, session_id: str) -> str:
        """Gera token CSRF"""
        return self.serializer.dumps(session_id, salt='csrf-token')
    
    def validate_token(self, token: str, session_id: str, max_age: int = 3600) -> bool:
        """Valida token CSRF"""
        try:
            data = self.serializer.loads(token, salt='csrf-token', max_age=max_age)
            return data == session_id
        except:
            return False

# Middleware
csrf = CSRFProtection(settings.SECRET_KEY)

@app.middleware("http")
async def csrf_protect(request: Request, call_next):
    # Apenas para métodos de mudança de estado
    if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
        token = request.headers.get('X-CSRF-Token')
        session_id = request.cookies.get('session_id')
        
        if not token or not session_id or not csrf.validate_token(token, session_id):
            raise HTTPException(status_code=403, detail="CSRF token inválido")
    
    return await call_next(request)
```

### 6.3 Criptografia de Dados Sensíveis

```python
# app/utils/encryption.py

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
import base64
import os

class DataEncryption:
    """Criptografia de dados sensíveis"""
    
    def __init__(self, master_key: str):
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'static_salt',  # Em produção, usar salt único por usuário
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(master_key.encode()))
        self.cipher = Fernet(key)
    
    def encrypt(self, data: str) -> str:
        """Criptografa dados"""
        return self.cipher.encrypt(data.encode()).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """Descriptografa dados"""
        return self.cipher.decrypt(encrypted_data.encode()).decode()

# Uso
encryptor = DataEncryption(settings.SECRET_KEY)

# Criptografar dados sensíveis antes de salvar
class Usuario(Base):
    cpf_encrypted = Column(String)
    
    @property
    def cpf(self):
        return encryptor.decrypt(self.cpf_encrypted)
    
    @cpf.setter
    def cpf(self, value):
        self.cpf_encrypted = encryptor.encrypt(value)
```

### 6.4 Logs de Auditoria

```python
# app/models/audit_log.py

from sqlalchemy import Column, Integer, String, DateTime, JSON, Text
from datetime import datetime
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_log"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    user_tipo = Column(String)
    action = Column(String, nullable=False)  # CREATE, UPDATE, DELETE, LOGIN, etc
    resource_type = Column(String)  # Usuario, Escala, etc
    resource_id = Column(Integer)
    changes = Column(JSON)  # Alterações realizadas
    ip_address = Column(String)
    user_agent = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<AuditLog {self.action} on {self.resource_type}:{self.resource_id}>"

# app/services/audit_service.py

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        user: Usuario,
        action: str,
        resource_type: str,
        resource_id: int,
        changes: dict,
        request: Request
    ):
        """Registra ação no log de auditoria"""
        
        audit = AuditLog(
            user_id=user.id,
            user_tipo=user.tipo,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            changes=changes,
            ip_address=request.client.host,
            user_agent=request.headers.get("User-Agent")
        )
        
        db.add(audit)
        db.commit()

# Uso em endpoints
@router.put("/usuarios/{usuario_id}")
async def update_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    # Atualizar usuário
    usuario = service.update_usuario(usuario_id, data)
    
    # Log de auditoria
    AuditService.log_action(
        db=db,
        user=current_user,
        action="UPDATE",
        resource_type="Usuario",
        resource_id=usuario_id,
        changes=data.dict(exclude_unset=True),
        request=request
    )
    
    return usuario
```

---

## 7. PERFORMANCE E OTIMIZAÇÃO

### 7.1 Caching com Redis

```python
# app/services/cache_service.py

import redis
import json
from typing import Optional, Any
from datetime import timedelta

class CacheService:
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url, decode_responses=True)
    
    def get(self, key: str) -> Optional[Any]:
        """Busca valor do cache"""
        value = self.redis.get(key)
        if value:
            return json.loads(value)
        return None
    
    def set(self, key: str, value: Any, ttl: int = 300):
        """Salva valor no cache com TTL"""
        self.redis.setex(
            key,
            ttl,
            json.dumps(value, default=str)
        )
    
    def delete(self, key: str):
        """Remove valor do cache"""
        self.redis.delete(key)
    
    def delete_pattern(self, pattern: str):
        """Remove todos os valores que correspondem ao padrão"""
        for key in self.redis.scan_iter(pattern):
            self.redis.delete(key)

# Instanciar cache
cache = CacheService(settings.REDIS_URL)

# Uso em services
class UsuarioService:
    def get_usuario(self, usuario_id: int) -> Usuario:
        # Tentar buscar do cache
        cache_key = f"usuario:{usuario_id}"
        cached = cache.get(cache_key)
        
        if cached:
            return Usuario(**cached)
        
        # Buscar do banco
        usuario = self.repository.get_by_id(usuario_id)
        
        # Salvar no cache (5 minutos)
        if usuario:
            cache.set(cache_key, usuario.__dict__, ttl=300)
        
        return usuario
    
    def update_usuario(self, usuario_id: int, data: UsuarioUpdate) -> Usuario:
        # Atualizar no banco
        usuario = self.repository.update(usuario_id, data)
        
        # Invalidar cache
        cache.delete(f"usuario:{usuario_id}")
        
        return usuario
```

### 7.2 Paginação Eficiente

```python
# app/schemas/pagination.py

from pydantic import BaseModel
from typing import Generic, TypeVar, List
from math import ceil

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    per_page: int
    total_pages: int
    has_next: bool
    has_prev: bool

# app/repositories/base_repository.py

class BaseRepository:
    def paginate(
        self,
        query,
        page: int = 1,
        per_page: int = 20
    ) -> PaginatedResponse:
        """Pagina resultados de uma query"""
        
        # Total de items
        total = query.count()
        
        # Calcular offset
        offset = (page - 1) * per_page
        
        # Buscar items da página
        items = query.limit(per_page).offset(offset).all()
        
        # Calcular total de páginas
        total_pages = ceil(total / per_page)
        
        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1
        )

# Uso
@router.get("/usuarios", response_model=PaginatedResponse[UsuarioResponse])
async def list_usuarios(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Usuario)
    return repository.paginate(query, page, per_page)
```

### 7.3 Otimização de Queries N+1

```python
# ❌ ERRADO - Problema N+1
def get_escalas_com_pregadores(db: Session) -> List[Escala]:
    escalas = db.query(Escala).all()
    
    for escala in escalas:
        # Para cada escala, faz uma query adicional
        escala.items = db.query(ItemEscala).filter(
            ItemEscala.escala_id == escala.id
        ).all()
        
        for item in escala.items:
            # Mais queries para cada item
            item.pregador = db.query(Usuario).filter(
                Usuario.id == item.pregador_id
            ).first()
    
    return escalas

# ✅ CORRETO - Usar eager loading
from sqlalchemy.orm import joinedload, selectinload

def get_escalas_com_pregadores_otimizado(db: Session) -> List[Escala]:
    escalas = db.query(Escala).options(
        selectinload(Escala.items).joinedload(ItemEscala.pregador),
        selectinload(Escala.items).joinedload(ItemEscala.cantor),
        selectinload(Escala.items).joinedload(ItemEscala.igreja)
    ).all()
    
    return escalas
```

### 7.4 Background Tasks com Celery

```python
# app/tasks/celery_app.py

from celery import Celery
from app.core.config import settings

celery_app = Celery(
    'escalas',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='America/Sao_Paulo',
    enable_utc=True,
)

# app/tasks/notification_tasks.py

from app.tasks.celery_app import celery_app
from app.services.email_service import EmailService
from app.services.sms_service import SMSService

@celery_app.task(bind=True, max_retries=3)
def send_email_task(self, to: str, subject: str, body: str):
    """Task assíncrona para enviar email"""
    try:
        EmailService.send_email(to, subject, body)
    except Exception as exc:
        # Retry com backoff exponencial
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))

@celery_app.task
def send_sms_task(to: str, message: str):
    """Task assíncrona para enviar SMS"""
    SMSService.send_sms(to, message)

@celery_app.task
def send_reminder_notifications():
    """Task agendada para enviar lembretes (executar diariamente)"""
    # Buscar cultos com data próxima
    # Enviar notificações
    pass

# Uso em endpoints
@router.post("/escalas/{escala_id}/publicar")
async def publicar_escala(escala_id: int):
    # Publicar escala
    escala = service.publicar_escala(escala_id)
    
    # Enviar notificações assincronamente
    for item in escala.items:
        if item.pregador_id:
            send_email_task.delay(
                to=item.pregador.email,
                subject="Você foi escalado!",
                body=f"Pregação em {item.data_culto}"
            )
    
    return escala

# Configurar tarefas periódicas
celery_app.conf.beat_schedule = {
    'send-reminders-7d': {
        'task': 'app.tasks.notification_tasks.send_reminder_notifications',
        'schedule': crontab(hour=8, minute=0),  # Todo dia às 8h
    },
}
```

### 7.5 Compressão de Responses

```python
# app/middleware/compression.py

from fastapi.middleware.gzip import GZIPMiddleware

# Adicionar no main.py
app.add_middleware(
    GZIPMiddleware,
    minimum_size=1000,  # Comprimir responses > 1KB
    compresslevel=6     # Nível de compressão (1-9)
)
```

---

## 8. TESTES

### 8.1 Estrutura de Testes

```python
# tests/conftest.py

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.models.usuario import Usuario

# Banco de dados de teste (in-memory)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    """Cria banco de teste para cada teste"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    """Cliente de teste"""
    def override_get_db():
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def admin_user(db):
    """Cria usuário admin para testes"""
    user = Usuario(
        nome_completo="Admin Teste",
        email="admin@iasd.com",
        senha_hash="123123",
        cpf="111.111.111-11",
        tipo="ADMIN",
        status="ATIVO"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def auth_headers(admin_user):
    """Headers de autenticação"""
    token = create_access_token({"sub": str(admin_user.id)})
    return {"Authorization": f"Bearer {token}"}
```

### 8.2 Testes de API

```python
# tests/test_api/test_usuarios.py

import pytest
from fastapi import status

def test_create_usuario(client, auth_headers):
    """Testa criação de usuário"""
    response = client.post(
        "/api/v1/usuarios",
        headers=auth_headers,
        json={
            "nome_completo": "João Silva",
            "email": "joao@iasd.com",
            "cpf": "222.222.222-22",
            "tipo": "PREGADOR",
            "senha": "123123",
            "confirmar_senha": "123123",
            "distrito_id": 1
        }
    )
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "joao@iasd.com"
    assert data["tipo"] == "PREGADOR"

def test_create_usuario_email_duplicado(client, auth_headers, admin_user):
    """Testa erro ao criar usuário com email duplicado"""
    response = client.post(
        "/api/v1/usuarios",
        headers=auth_headers,
        json={
            "nome_completo": "Teste",
            "email": admin_user.email,  # Email já existe
            "cpf": "333.333.333-33",
            "tipo": "PREGADOR",
            "senha": "123123",
            "confirmar_senha": "123123"
        }
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Email já cadastrado" in response.json()["message"]

def test_list_usuarios_sem_autenticacao(client):
    """Testa acesso negado sem autenticação"""
    response = client.get("/api/v1/usuarios")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
```

### 8.3 Testes de Services

```python
# tests/test_services/test_escala_service.py

import pytest
from datetime import datetime
from app.services.escala_service import EscalaService
from app.repositories.escala_repository import EscalaRepository

def test_gerar_escala_automatica(db):
    """Testa geração automática de escala"""
    # Setup - criar distrito, igrejas, pregadores
    distrito = create_test_distrito(db)
    igrejas = create_test_igrejas(db, distrito.id, count=3)
    pregadores = create_test_pregadores(db, distrito.id, count=10)
    
    # Executar
    repository = EscalaRepository(db)
    service = EscalaService(repository)
    
    escala = service.gerar_escala_automatica(
        distrito_id=distrito.id,
        mes=1,
        ano=2025,
        pastor_id=1
    )
    
    # Verificar
    assert escala is not None
    assert escala.mes == 1
    assert escala.ano == 2025
    assert len(escala.items) > 0
    
    # Verificar que todas as igrejas têm pregador
    for item in escala.items:
        assert item.pregador_id is not None

def test_validar_regras_recorrencia(db):
    """Testa validação de regras de recorrência máxima"""
    # Setup
    distrito = create_test_distrito(db, config_recorrencia_maxima=3)
    # ... criar escala com 4 pregações do mesmo pregador
    
    # Executar e verificar
    with pytest.raises(ValidationException) as exc:
        service.validar_escala(escala_id)
    
    assert "recorrência máxima" in str(exc.value)
```

### 8.4 Testes de Integração

```python
# tests/test_integration/test_escala_workflow.py

def test_workflow_completo_escala(client, auth_headers, db):
    """Testa workflow completo de criação e publicação de escala"""
    
    # 1. Criar distrito
    distrito_response = client.post(
        "/api/v1/distritos",
        headers=auth_headers,
        json={"nome": "Distrito Teste", "organizacao_id": 1}
    )
    distrito_id = distrito_response.json()["id"]
    
    # 2. Criar igrejas
    for i in range(3):
        client.post(
            "/api/v1/igrejas",
            headers=auth_headers,
            json={
                "nome": f"Igreja {i+1}",
                "distrito_id": distrito_id
            }
        )
    
    # 3. Criar pregadores
    for i in range(10):
        client.post(
            "/api/v1/usuarios",
            headers=auth_headers,
            json={
                "nome_completo": f"Pregador {i+1}",
                "email": f"pregador{i+1}@iasd.com",
                "cpf": f"{i+1:03d}.{i+1:03d}.{i+1:03d}-{i+1:02d}",
                "tipo": "PREGADOR",
                "senha": "123123",
                "confirmar_senha": "123123",
                "distrito_id": distrito_id
            }
        )
    
    # 4. Gerar escala
    gerar_response = client.post(
        "/api/v1/escalas/gerar",
        headers=auth_headers,
        json={
            "mes": 1,
            "ano": 2026
        }
    )
    
    assert gerar_response.status_code == status.HTTP_200_OK
    escala_id = gerar_response.json()["id"]
    
    # 5. Publicar escala
    publicar_response = client.post(
        f"/api/v1/escalas/{escala_id}/publicar",
        headers=auth_headers
    )
    
    assert publicar_response.status_code == status.HTTP_200_OK
    assert publicar_response.json()["status"] == "PUBLICADA"
```

### 8.5 Coverage

```bash
# Executar testes com coverage
pytest --cov=app --cov-report=html --cov-report=term

# Ver relatório HTML
open htmlcov/index.html

# Configurar minimum coverage no pytest.ini
[tool:pytest]
addopts = --cov=app --cov-fail-under=70
```

---

## 9. DevOps e Deploy

### 9.1 Docker

**Dockerfile (Backend):**

```dockerfile
# Multi-stage build
FROM python:3.12-slim as builder

WORKDIR /app

# Instalar dependências de compilação
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt .

# Instalar dependências Python
RUN pip install --no-cache-dir --user -r requirements.txt

# Estágio final
FROM python:3.12-slim

WORKDIR /app

# Copiar dependências do builder
COPY --from=builder /root/.local /root/.local

# Garantir que scripts estão no PATH
ENV PATH=/root/.local/bin:$PATH

# Copiar código da aplicação
COPY . .

# Criar usuário não-root
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expor porta
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Comando de inicialização
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  # Banco de dados
  postgres:
    image: postgres:15-alpine
    container_name: escalas_db
    environment:
      POSTGRES_DB: escalas_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    container_name: escalas_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: escalas_backend
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/escalas_db
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: ${SECRET_KEY}
      ENVIRONMENT: ${ENVIRONMENT:-development}
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - backend_uploads:/app/uploads
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: escalas_frontend
    environment:
      REACT_APP_API_URL: http://localhost:8000/api/v1
    ports:
      - "3000:3000"
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules

  # Celery Worker
  celery_worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: escalas_celery_worker
    command: celery -A app.tasks.celery_app worker -l info
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/escalas_db
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app

  # Celery Beat (tarefas agendadas)
  celery_beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: escalas_celery_beat
    command: celery -A app.tasks.celery_app beat -l info
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/escalas_db
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app

volumes:
  postgres_data:
  redis_data:
  backend_uploads:
```

### 9.2 CI/CD com GitHub Actions

**.github/workflows/backend.yml:**

```yaml
name: Backend CI/CD

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'backend/**'
  pull_request:
    branches: [ main, develop ]
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.12'
    
    - name: Cache dependencies
      uses: actions/cache@v3
      with:
        path: ~/.cache/pip
        key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
        restore-keys: |
          ${{ runner.os }}-pip-
    
    - name: Install dependencies
      run: |
        cd backend
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install -r requirements-dev.txt
    
    - name: Run linting
      run: |
        cd backend
        flake8 app --count --select=E9,F63,F7,F82 --show-source --statistics
        black --check app
    
    - name: Run type checking
      run: |
        cd backend
        mypy app
    
    - name: Run tests
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        SECRET_KEY: test_secret_key
      run: |
        cd backend
        pytest --cov=app --cov-report=xml --cov-report=term
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage.xml
        flags: backend
        name: backend-coverage

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to DockerHub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: ./backend
        push: true
        tags: ${{ secrets.DOCKERHUB_USERNAME }}/escalas-backend:latest
        cache-from: type=registry,ref=${{ secrets.DOCKERHUB_USERNAME }}/escalas-backend:buildcache
        cache-to: type=registry,ref=${{ secrets.DOCKERHUB_USERNAME }}/escalas-backend:buildcache,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to production
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.PRODUCTION_HOST }}
        username: ${{ secrets.PRODUCTION_USER }}
        key: ${{ secrets.PRODUCTION_SSH_KEY }}
        script: |
          cd /var/www/escalas
          docker-compose pull
          docker-compose up -d
          docker system prune -f
```

### 9.3 Ambientes e Configuração

**.env.example:**

```bash
# Ambiente
ENVIRONMENT=development  # development, staging, production
DEBUG=True

# Aplicação
APP_NAME=Sistema de Escalas
APP_VERSION=1.0.0
HOST=0.0.0.0
PORT=8000

# Banco de Dados
DATABASE_URL=postgresql://user:password@localhost:5432/escalas_db
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20

# Segurança
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@escalas.com.br
SMTP_FROM_NAME=Sistema de Escalas

# SMS/WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Redis
REDIS_URL=redis://localhost:6379/0

# Sentry (monitoramento)
SENTRY_DSN=

# Upload
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE=10485760  # 10MB
```

---

## 10. DOCUMENTAÇÃO

### 10.1 Documentação de API (OpenAPI/Swagger)

```python
# app/main.py

app = FastAPI(
    title="Sistema de Escalas - API",
    description="""
    API REST para gerenciamento de escalas de pregação e louvor.
    
    ## Recursos Principais
    
    * **Autenticação** - JWT-based authentication
    * **Usuários** - Gerenciamento de usuários (Admin, Pastor, Pregador, Cantor, Membro)
    * **Distritos e Igrejas** - Estrutura organizacional
    * **Escalas** - Geração automática e manual de escalas
    * **Avaliações** - Sistema de avaliação com score
    * **Notificações** - Email, SMS e WhatsApp
    
    ## Autenticação
    
    Todas as rotas protegidas requerem um token JWT no header:
    ```
    Authorization: Bearer <token>
    ```
    
    Obtenha seu token através do endpoint `/api/v1/auth/login`.
    """,
    version="1.0.0",
    contact={
        "name": "Suporte Técnico",
        "email": "suporte@escalas.com.br",
    },
    license_info={
        "name": "MIT",
    },
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_tags=[
        {
            "name": "auth",
            "description": "Autenticação e autorização"
        },
        {
            "name": "usuarios",
            "description": "Gerenciamento de usuários"
        },
        {
            "name": "escalas",
            "description": "Escalas de pregação e louvor"
        },
        {
            "name": "avaliacoes",
            "description": "Sistema de avaliações"
        },
    ]
)

# Documentar endpoints
@router.post(
    "/usuarios",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo usuário",
    description="""
    Cria um novo usuário no sistema.
    
    **Permissões:** ADMIN, PASTOR_DISTRITAL (apenas para seu distrito)
    
    **Validações:**
    - Email deve ser único
    - CPF deve ser único e válido
    - Senha deve ter no mínimo 8 caracteres
    - Tipo MEMBRO requer igreja_id
    - Tipo PREGADOR/CANTOR requer distrito_id
    """,
    responses={
        201: {"description": "Usuário criado com sucesso"},
        400: {"description": "Dados inválidos"},
        403: {"description": "Permissão negada"},
        409: {"description": "Email ou CPF já cadastrado"},
    },
    tags=["usuarios"]
)
async def criar_usuario(...):
    pass
```

### 10.2 README.md Completo

```markdown
# Sistema de Gerenciamento de Escalas de Pregação e Louvor

Sistema web e mobile para gerenciamento de escalas de pregação e louvor em organizações religiosas.

## 🚀 Funcionalidades

- ✅ Geração automática de escalas baseada em score
- ✅ Sistema de avaliação com 5 critérios
- ✅ Notificações por Email, SMS e WhatsApp
- ✅ Confirmação de presença
- ✅ Solicitação de trocas
- ✅ Relatórios e dashboards
- ✅ Calendário visual
- ✅ App mobile (iOS e Android)

## 📋 Pré-requisitos

- Python 3.12+
- PostgreSQL 15+
- Node.js 18+
- Redis (opcional, para cache)
- Docker e Docker Compose (recomendado)

## 🔧 Instalação

### Usando Docker (Recomendado)

```bash
# Clonar repositório
git clone https://github.com/sua-org/sistema-escalas.git
cd sistema-escalas

# Copiar arquivo de ambiente
cp .env.example .env

# Editar .env com suas configurações
nano .env

# Iniciar serviços
docker-compose up -d

# Executar migrações
docker-compose exec backend alembic upgrade head

# Criar usuário admin
docker-compose exec backend python scripts/create_admin.py
```

Acesse:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Docs API: http://localhost:8000/api/docs

### Instalação Manual

#### Backend

```bash
cd backend

# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Instalar dependências
pip install -r requirements.txt

# Configurar banco de dados
# Criar database no PostgreSQL
createdb escalas_db

# Executar migrações
alembic upgrade head

# Iniciar servidor
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

## 📱 App Mobile

```bash
cd mobile

# Instalar dependências
npm install

# iOS
cd ios && pod install && cd ..
npm run ios

# Android
npm run android
```

## 🧪 Testes

```bash
# Backend
cd backend
pytest --cov=app

# Frontend
cd frontend
npm test

# E2E
npm run test:e2e
```

## 📚 Documentação

- [API Documentation](docs/api/README.md)
- [Database Schema](docs/database/schema.md)
- [User Guide](docs/guides/user-guide.md)
- [Developer Guide](docs/guides/developer-guide.md)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## ✨ Autores

- Seu Nome - [@seu-usuario](https://github.com/seu-usuario)

## 🙏 Agradecimentos

- FastAPI
- React
- PostgreSQL
- Comunidade open source
```

---

## 11. GIT E VERSIONAMENTO

### 11.1 Gitignore

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
.venv

# FastAPI
*.db
*.sqlite
uploads/

# Node
node_modules/
.npm
.pnp
.pnp.js
build/
dist/

# React Native
.expo/
.expo-shared/
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
logs/

# Coverage
.coverage
htmlcov/
coverage/

# Docker
*.log
.dockerignore
```

### 11.2 Conventional Commits

```bash
# Formato
<type>(<scope>): <subject>

# Types
feat: Nova funcionalidade
fix: Correção de bug
docs: Documentação
style: Formatação (não afeta código)
refactor: Refatoração
test: Testes
chore: Manutenção

# Exemplos
feat(escalas): adiciona geração automática de escala
fix(auth): corrige validação de token JWT
docs(api): atualiza documentação de endpoints
test(services): adiciona testes para EscalaService
```

### 11.3 Git Hooks com Pre-commit

**.pre-commit-config.yaml:**

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
        args: ['--maxkb=5000']

  - repo: https://github.com/psf/black
    rev: 23.12.1
    hooks:
      - id: black
        language_version: python3.12

  - repo: https://github.com/pycqa/flake8
    rev: 7.0.0
    hooks:
      - id: flake8
        args: ['--max-line-length=100']

  - repo: https://github.com/pycqa/isort
    rev: 5.13.2
    hooks:
      - id: isort
```

---

## 12. MONITORAMENTO E LOGS

### 12.1 Sentry (Error Tracking)

```python
# app/main.py

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    integrations=[
        FastApiIntegration(),
        SqlalchemyIntegration(),
    ],
    environment=settings.ENVIRONMENT,
    traces_sample_rate=0.1,  # 10% das transações
    profiles_sample_rate=0.1,  # 10% dos profiles
)
```

### 12.2 Structured Logging

```python
# app/core/logging.py

import logging
import json
from datetime import datetime
from pythonjsonlogger import jsonlogger

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        log_record['timestamp'] = datetime.utcnow().isoformat()
        log_record['level'] = record.levelname
        log_record['logger'] = record.name
        if hasattr(record, 'user_id'):
            log_record['user_id'] = record.user_id

# Configurar logger
def setup_logging():
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    handler = logging.StreamHandler()
    formatter = CustomJsonFormatter('%(timestamp)s %(level)s %(name)s %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger

logger = setup_logging()

# Uso
logger.info("Escala publicada", extra={
    "user_id": current_user.id,
    "escala_id": escala.id,
    "mes": escala.mes,
    "ano": escala.ano
})
```

### 12.3 Métricas com Prometheus

```python
# app/middleware/metrics.py

from prometheus_client import Counter, Histogram, Gauge
from prometheus_client import generate_latest
from fastapi import Request
import time

# Métricas
http_requests_total = Counter(
    'http_requests_total',
    'Total de requisições HTTP',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'Duração das requisições HTTP',
    ['method', 'endpoint']
)

active_requests = Gauge(
    'active_requests',
    'Requisições ativas'
)

# Middleware
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    active_requests.inc()
    
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    
    http_requests_total.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    http_request_duration_seconds.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)
    
    active_requests.dec()
    
    return response

# Endpoint de métricas
@app.get("/metrics")
async def metrics():
    return Response(
        content=generate_latest(),
        media_type="text/plain"
    )
```

---

## ✅ CHECKLIST DE PRODUÇÃO

Antes de fazer deploy em produção, verificar:

### Segurança
- [ ] SECRET_KEY forte e único
- [ ] HTTPS habilitado
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativado
- [ ] Senhas criptografadas (bcrypt)
- [ ] Tokens JWT com expiração
- [ ] Logs de auditoria implementados
- [ ] Validação de inputs
- [ ] Proteção contra SQL Injection
- [ ] Proteção contra XSS

### Performance
- [ ] Cache Redis configurado
- [ ] Índices de banco otimizados
- [ ] Queries N+1 eliminadas
- [ ] Compressão de responses (GZIP)
- [ ] CDN para assets estáticos
- [ ] Paginação em listagens
- [ ] Background tasks com Celery

### Monitoramento
- [ ] Sentry configurado
- [ ] Logs estruturados
- [ ] Métricas Prometheus
- [ ] Alertas configurados
- [ ] Healthcheck endpoint

### Backup
- [ ] Backup diário automático
- [ ] Testes de restore
- [ ] Retenção de 30 dias
- [ ] Backup de uploads

### Testes
- [ ] Cobertura > 70%
- [ ] Testes de integração
- [ ] Testes E2E críticos
- [ ] CI/CD configurado

### Documentação
- [ ] README.md completo
- [ ] API documentada (OpenAPI)
- [ ] Guias de deploy
- [ ] Changelog

---

**FIM DO GUIA DE MELHORES PRÁTICAS**

