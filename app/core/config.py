"""
Configurações da aplicação FastAPI
"""
from pydantic_settings import BaseSettings
from decouple import config


class Settings(BaseSettings):
    """Configurações da aplicação"""
    
    # Aplicação
    APP_NAME: str = "Apostello - Sistema de Gestão de Escalas"
    APP_VERSION: str = "1.0.0"
    
    # Segurança
    SECRET_KEY: str = config('SECRET_KEY', default='sua-chave-secreta-aqui-muito-segura-123456789')
    ALGORITHM: str = config('ALGORITHM', default='HS256')
    ACCESS_TOKEN_EXPIRE_MINUTES: int = config('ACCESS_TOKEN_EXPIRE_MINUTES', default=30, cast=int)
    
    # Banco de dados
    DATABASE_URL: str = config('DATABASE_URL', default='sqlite:///./apostello.db')
    
    # Twilio/WhatsApp
    TWILIO_ACCOUNT_SID: str = config('TWILIO_ACCOUNT_SID', default='')
    TWILIO_AUTH_TOKEN: str = config('TWILIO_AUTH_TOKEN', default='')
    TWILIO_WHATSAPP_NUMBER: str = config('TWILIO_WHATSAPP_NUMBER', default='')
    
    # Redis
    REDIS_URL: str = config('REDIS_URL', default='redis://localhost:6379/0')
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
