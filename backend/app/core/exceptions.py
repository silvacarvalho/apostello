"""
Exceções customizadas da aplicação
"""
from typing import Any, Optional, Dict
from fastapi import HTTPException, status


class AppException(HTTPException):
    """Exceção base da aplicação"""
    def __init__(
        self, 
        status_code: int, 
        detail: str,
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class NotFoundException(AppException):
    """Recurso não encontrado"""
    def __init__(self, resource: str, resource_id: Any = None):
        detail = f"{resource} não encontrado"
        if resource_id:
            detail = f"{resource} com ID {resource_id} não encontrado"
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class UnauthorizedException(AppException):
    """Não autorizado"""
    def __init__(self, detail: str = "Credenciais inválidas"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )


class ForbiddenException(AppException):
    """Acesso negado"""
    def __init__(self, detail: str = "Você não tem permissão para acessar este recurso"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class BadRequestException(AppException):
    """Requisição inválida"""
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class ConflictException(AppException):
    """Conflito de dados"""
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class ValidationException(AppException):
    """Erro de validação"""
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


class InternalServerException(AppException):
    """Erro interno do servidor"""
    def __init__(self, detail: str = "Erro interno do servidor"):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)
