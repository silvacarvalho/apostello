"""
Configurações da Aplicação
Sistema de Gestão de Escalas de Pregação - IASD
"""

from typing import List, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações da aplicação"""

    # ============================================================
    # APLICAÇÃO
    # ============================================================
    APP_NAME: str = "Sistema de Escalas de Pregação - IASD"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    # ============================================================
    # API
    # ============================================================
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Apostello API"
    FRONTEND_URL: Optional[str] = "http://localhost:3000"

    # ============================================================
    # BANCO DE DADOS
    # ============================================================
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10

    # ============================================================
    # SEGURANÇA
    # ============================================================
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ============================================================
    # CORS
    # ============================================================
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8080"
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v

    # ============================================================
    # WHATSAPP (Twilio)
    # ============================================================
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_WHATSAPP_NUMBER: Optional[str] = None

    # ============================================================
    # SMS (Twilio)
    # ============================================================
    TWILIO_PHONE_NUMBER: Optional[str] = None

    # ============================================================
    # EMAIL (SMTP)
    # ============================================================
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@apostello.com.br"
    SMTP_FROM_NAME: str = "Sistema de Escalas - IASD"

    # ============================================================
    # REDIS
    # ============================================================
    REDIS_URL: str = "redis://localhost:6379/0"

    # ============================================================
    # CELERY
    # ============================================================
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # ============================================================
    # UPLOADS
    # ============================================================
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    ALLOWED_EXTENSIONS: List[str] = [".xlsx", ".xls", ".csv", ".pdf", ".jpg", ".jpeg", ".png"]

    # ============================================================
    # LOGS
    # ============================================================
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "/app/logs/app.log"
    LOG_ROTATION: str = "500 MB"
    LOG_RETENTION: str = "10 days"

    # ============================================================
    # NOTIFICAÇÕES
    # ============================================================
    NOTIFICATIONS_WHATSAPP_ENABLED: bool = True
    NOTIFICATIONS_SMS_ENABLED: bool = False
    NOTIFICATIONS_PUSH_ENABLED: bool = True
    NOTIFICATIONS_EMAIL_ENABLED: bool = True
    NOTIFICATIONS_MAX_RETRIES: int = 3
    NOTIFICATIONS_RETRY_DELAY_SECONDS: int = 60

    # ============================================================
    # GERAÇÃO DE ESCALAS
    # ============================================================
    SCORE_WEIGHT_AVALIACOES: float = 0.6
    SCORE_WEIGHT_FREQUENCIA: float = 0.25
    SCORE_WEIGHT_PONTUALIDADE: float = 0.15
    SCORE_PENALIZACAO_RECUSA: float = 0.15

    # ============================================================
    # LEMBRETES
    # ============================================================
    LEMBRETE_7_DIAS_HABILITADO: bool = True
    LEMBRETE_3_DIAS_HABILITADO: bool = True
    LEMBRETE_24H_HABILITADO: bool = True

    # ============================================================
    # SENTRY (Opcional)
    # ============================================================
    SENTRY_DSN: Optional[str] = None
    SENTRY_ENVIRONMENT: str = "production"
    SENTRY_TRACES_SAMPLE_RATE: float = 1.0

    # ============================================================
    # RATE LIMITING
    # ============================================================
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # ============================================================
    # BACKUP
    # ============================================================
    BACKUP_ENABLED: bool = True
    BACKUP_DIR: str = "/app/backups"
    BACKUP_RETENTION_DAYS: int = 30

    # Configuração do Pydantic Settings
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )


# Instância global de configurações
settings = Settings()
