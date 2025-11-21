"""
Segurança e Autenticação (JWT, Bcrypt)
Sistema de Gestão de Escalas de Pregação - IASD
"""

from datetime import datetime, timedelta
from typing import Optional, Any, Dict
from jose import jwt, JWTError
from passlib.context import CryptContext

from .config import settings

# ============================================================
# CRYPT CONTEXT (Bcrypt)
# ============================================================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================================================
# FUNÇÕES DE SENHA
# ============================================================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica se a senha em texto plano corresponde ao hash.

    Args:
        plain_password: Senha em texto plano
        hashed_password: Hash da senha

    Returns:
        bool: True se a senha está correta
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Gera hash da senha usando bcrypt.

    Args:
        password: Senha em texto plano

    Returns:
        str: Hash da senha
    """
    return pwd_context.hash(password)


# ============================================================
# FUNÇÕES DE TOKEN JWT
# ============================================================
def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Cria um token de acesso JWT.

    Args:
        data: Dados a serem codificados no token (ex: {"sub": "user_id"})
        expires_delta: Tempo de expiração customizado

    Returns:
        str: Token JWT codificado
    """
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


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Cria um token de refresh JWT.

    Args:
        data: Dados a serem codificados no token
        expires_delta: Tempo de expiração customizado

    Returns:
        str: Token JWT codificado
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodifica e valida um token JWT.

    Args:
        token: Token JWT

    Returns:
        Dict com os dados do token ou None se inválido
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def verify_token(token: str, token_type: str = "access") -> Optional[str]:
    """
    Verifica se o token é válido e retorna o subject (geralmente user_id).

    Args:
        token: Token JWT
        token_type: Tipo do token ("access" ou "refresh")

    Returns:
        str: Subject do token (user_id) ou None se inválido
    """
    payload = decode_token(token)

    if payload is None:
        return None

    # Verificar tipo do token
    if payload.get("type") != token_type:
        return None

    # Extrair subject (user_id)
    user_id: Optional[str] = payload.get("sub")
    return user_id
