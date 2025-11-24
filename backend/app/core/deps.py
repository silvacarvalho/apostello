"""
Dependencies para FastAPI
Sistema de Gestão de Escalas de Pregação - IASD
"""

from typing import Optional, Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError

from .database import SessionLocal
from .security import decode_token
from app.models import Usuario
from app.models.usuario import StatusAprovacao, PerfilUsuario

# ============================================================
# OAUTH2
# ============================================================
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ============================================================
# DATABASE DEPENDENCY
# ============================================================
def get_db() -> Generator[Session, None, None]:
    """
    Dependency para obter sessão do banco de dados.

    Yields:
        Session: Sessão do SQLAlchemy
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================
# AUTH DEPENDENCIES
# ============================================================
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Usuario:
    """
    Dependency para obter o usuário autenticado atual.

    Args:
        token: Token JWT do cabeçalho Authorization
        db: Sessão do banco de dados

    Returns:
        Usuario: Usuário autenticado

    Raises:
        HTTPException: 401 se token inválido ou usuário não encontrado
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
        if payload is None:
            raise credentials_exception

        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # Buscar usuário no banco
    usuario = db.query(Usuario).filter(Usuario.id == user_id).first()
    if usuario is None:
        raise credentials_exception

    return usuario


def get_current_active_user(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """
    Dependency para obter o usuário autenticado E ativo.

    Args:
        current_user: Usuário do get_current_user

    Returns:
        Usuario: Usuário ativo

    Raises:
        HTTPException: 400 se usuário inativo ou não aprovado
    """
    if not current_user.ativo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário inativo"
        )

    if current_user.status_aprovacao != StatusAprovacao.APROVADO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário ainda não foi aprovado"
        )

    return current_user


def require_perfil(perfis_permitidos: list):
    """
    Dependency factory para verificar perfis do usuário.

    Args:
        perfis_permitidos: Lista de perfis permitidos (como strings ou enums)

    Returns:
        Função dependency que verifica perfis

    Example:
        @router.get("/admin")
        def admin_only(
            user: Usuario = Depends(require_perfil(["membro_associacao"]))
        ):
            return {"message": "Acesso permitido"}
    """
    def perfil_checker(
        current_user: Usuario = Depends(get_current_active_user)
    ) -> Usuario:
        # Verifica se usuário tem algum dos perfis permitidos
        user_perfis = current_user.perfis or []
        
        # Normalizar perfis para strings (valores dos enums)
        user_perfis_values = [
            p.value if isinstance(p, PerfilUsuario) else p 
            for p in user_perfis
        ]

        if not any(perfil in user_perfis_values for perfil in perfis_permitidos):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Perfis permitidos: {', '.join(perfis_permitidos)}"
            )

        return current_user

    return perfil_checker


# ============================================================
# ATALHOS PARA PERFIS ESPECÍFICOS
# ============================================================
def require_membro_associacao(
    current_user: Usuario = Depends(require_perfil(["membro_associacao"]))
) -> Usuario:
    """Dependency: Requer perfil Membro da Associação"""
    return current_user


def require_pastor_distrital(
    current_user: Usuario = Depends(
        require_perfil(["pastor_distrital", "membro_associacao"])
    )
) -> Usuario:
    """Dependency: Requer perfil Pastor Distrital ou Membro Associação"""
    return current_user


def require_gestor_distrital(
    current_user: Usuario = Depends(
        require_perfil(["pastor_distrital", "lider_distrital", "membro_associacao"])
    )
) -> Usuario:
    """Dependency: Requer perfil Pastor Distrital, Líder Distrital ou Membro Associação"""
    return current_user


def require_pregador(
    current_user: Usuario = Depends(require_perfil(["pregador"]))
) -> Usuario:
    """Dependency: Requer perfil Pregador"""
    return current_user


def require_avaliador(
    current_user: Usuario = Depends(require_perfil(["avaliador"]))
) -> Usuario:
    """Dependency: Requer perfil Avaliador"""
    return current_user
