"""
Dependências comuns da API
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.models.usuario import Usuario, TipoUsuario
from app.repositories.usuario_repository import UsuarioRepository


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Usuario:
    """Obtém usuário atual a partir do token JWT"""
    payload = decode_token(token)
    
    if not payload:
        raise UnauthorizedException("Token inválido ou expirado")
    
    if payload.get("type") != "access":
        raise UnauthorizedException("Token inválido")
    
    user_id = payload.get("user_id")
    repository = UsuarioRepository(db)
    usuario = repository.get_by_id(user_id)
    
    if not usuario:
        raise UnauthorizedException("Usuário não encontrado")
    
    from app.models.usuario import StatusGeral
    if usuario.status != StatusGeral.ATIVO:
        raise UnauthorizedException("Usuário inativo")
    
    return usuario


def get_current_active_user(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """Verifica se usuário está ativo"""
    from app.models.usuario import StatusGeral
    if current_user.status != StatusGeral.ATIVO:
        raise ForbiddenException("Usuário inativo")
    return current_user


def require_admin(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """Requer que usuário seja administrador"""
    if current_user.tipo != TipoUsuario.ADMIN:
        raise ForbiddenException("Acesso restrito a administradores")
    return current_user


def require_admin_ou_associacao(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """Requer que usuário seja administrador ou associação"""
    if current_user.tipo not in [TipoUsuario.ADMIN, TipoUsuario.ASSOCIACAO]:
        raise ForbiddenException("Acesso restrito a administradores e associação")
    return current_user


def require_pastor(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """Requer que usuário seja pastor ou líder distrital"""
    if current_user.tipo not in [
        TipoUsuario.ADMIN, 
        TipoUsuario.PASTOR_DISTRITAL, 
        TipoUsuario.LIDER_DISTRITAL
    ]:
        raise ForbiddenException("Acesso restrito a pastores")
    return current_user


def require_pregador_cantor(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """Requer que usuário seja pregador ou cantor"""
    if current_user.tipo not in [TipoUsuario.PREGADOR, TipoUsuario.CANTOR]:
        raise ForbiddenException("Acesso restrito a pregadores e cantores")
    return current_user


def require_membro(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """Requer que usuário seja membro"""
    if current_user.tipo != TipoUsuario.MEMBRO:
        raise ForbiddenException("Acesso restrito a membros")
    return current_user


# ============================================================================
# HELPERS DE AUTORIZAÇÃO BASEADA EM DISTRITO/IGREJA
# ============================================================================

def get_user_distrito_id(user: Usuario) -> Optional[int]:
    """
    Retorna o distrito_id do usuário baseado em seu tipo.
    
    - ADMIN: None (acesso a todos os distritos)
    - PASTOR_DISTRITAL/LIDER_DISTRITAL: distrito_id direto
    - PREGADOR/CANTOR: distrito_id direto
    - MEMBRO: distrito_id através da igreja
    """
    if user.tipo == TipoUsuario.ADMIN:
        return None
    
    if user.tipo in [
        TipoUsuario.PASTOR_DISTRITAL, 
        TipoUsuario.LIDER_DISTRITAL,
        TipoUsuario.PREGADOR,
        TipoUsuario.CANTOR
    ]:
        return user.distrito_id
    
    if user.tipo == TipoUsuario.MEMBRO:
        if user.igreja and user.igreja.distrito_id:
            return user.igreja.distrito_id
        return None
    
    return None


def verify_distrito_access(user: Usuario, distrito_id: int) -> None:
    """
    Verifica se o usuário tem acesso ao distrito especificado.
    Lança ForbiddenException se não tiver acesso.
    
    - ADMIN: acesso a todos
    - PASTOR/LIDER: apenas seu distrito
    - PREGADOR/CANTOR: apenas seu distrito
    - MEMBRO: apenas distrito da sua igreja
    """
    if user.tipo == TipoUsuario.ADMIN:
        return
    
    user_distrito = get_user_distrito_id(user)
    
    if user_distrito is None:
        raise ForbiddenException("Usuário sem distrito associado")
    
    if user_distrito != distrito_id:
        raise ForbiddenException("Acesso negado a este distrito")


def verify_igreja_access(user: Usuario, igreja_id: int, db: Session) -> None:
    """
    Verifica se o usuário tem acesso à igreja especificada.
    Lança ForbiddenException se não tiver acesso.
    
    - ADMIN: acesso a todas
    - PASTOR/LIDER: apenas igrejas do seu distrito
    - PREGADOR/CANTOR/MEMBRO: validação específica se necessário
    """
    if user.tipo == TipoUsuario.ADMIN:
        return
    
    from app.repositories.igreja_repository import IgrejaRepository
    igreja_repo = IgrejaRepository(db)
    igreja = igreja_repo.get_by_id(igreja_id)
    
    if not igreja:
        raise ForbiddenException("Igreja não encontrada")
    
    verify_distrito_access(user, igreja.distrito_id)


def can_edit_user(current_user: Usuario, target_user: Usuario) -> bool:
    """
    Verifica se current_user pode editar target_user.
    
    Regras:
    - ADMIN: pode editar qualquer um
    - PASTOR/LIDER: pode editar usuários do seu distrito
    - PREGADOR/CANTOR/MEMBRO: pode editar apenas a si mesmo
    """
    # Admin pode editar qualquer um
    if current_user.tipo == TipoUsuario.ADMIN:
        return True
    
    # Pode editar a si mesmo
    if current_user.id == target_user.id:
        return True
    
    # Pastor/Líder pode editar usuários do seu distrito
    if current_user.tipo in [TipoUsuario.PASTOR_DISTRITAL, TipoUsuario.LIDER_DISTRITAL]:
        current_distrito = get_user_distrito_id(current_user)
        target_distrito = get_user_distrito_id(target_user)
        
        if current_distrito and target_distrito and current_distrito == target_distrito:
            return True
    
    return False


def get_accessible_distrito_ids(user: Usuario, db: Session) -> Optional[list[int]]:
    """
    Retorna lista de IDs de distritos que o usuário pode acessar.
    
    - ADMIN: None (todos os distritos)
    - Outros: lista com apenas seu distrito
    """
    if user.tipo == TipoUsuario.ADMIN:
        return None
    
    distrito_id = get_user_distrito_id(user)
    
    if distrito_id:
        return [distrito_id]
    
    return []
