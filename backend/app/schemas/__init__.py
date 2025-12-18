"""Schemas module - Pydantic schemas for request/response validation"""
from app.schemas.usuario import (
    UsuarioBase, UsuarioCreate, UsuarioUpdate, UsuarioResponse,
    UsuarioLogin, UsuarioResetPassword, UsuarioChangePassword
)
from app.schemas.auth import Token, TokenData, LoginRequest, RefreshTokenRequest
from app.schemas.organizacao import OrganizacaoBase, OrganizacaoCreate, OrganizacaoUpdate, OrganizacaoResponse
from app.schemas.distrito import DistritoBase, DistritoCreate, DistritoUpdate, DistritoResponse
from app.schemas.igreja import IgrejaBase, IgrejaCreate, IgrejaUpdate, IgrejaResponse
from app.schemas.horario_culto import HorarioCultoBase, HorarioCultoCreate, HorarioCultoResponse
from app.schemas.escala import EscalaBase, EscalaCreate, EscalaUpdate, EscalaResponse
from app.schemas.item_escala import ItemEscalaBase, ItemEscalaCreate, ItemEscalaUpdate, ItemEscalaResponse
from app.schemas.avaliacao import AvaliacaoBase, AvaliacaoCreate, AvaliacaoResponse

__all__ = [
    # Usuario
    "UsuarioBase", "UsuarioCreate", "UsuarioUpdate", "UsuarioResponse",
    "UsuarioLogin", "UsuarioResetPassword", "UsuarioChangePassword",
    # Auth
    "Token", "TokenData", "LoginRequest", "RefreshTokenRequest",
    # Organizacao
    "OrganizacaoBase", "OrganizacaoCreate", "OrganizacaoUpdate", "OrganizacaoResponse",
    # Distrito
    "DistritoBase", "DistritoCreate", "DistritoUpdate", "DistritoResponse",
    # Igreja
    "IgrejaBase", "IgrejaCreate", "IgrejaUpdate", "IgrejaResponse",
    # HorarioCulto
    "HorarioCultoBase", "HorarioCultoCreate", "HorarioCultoResponse",
    # Escala
    "EscalaBase", "EscalaCreate", "EscalaUpdate", "EscalaResponse",
    # ItemEscala
    "ItemEscalaBase", "ItemEscalaCreate", "ItemEscalaUpdate", "ItemEscalaResponse",
    # Avaliacao
    "AvaliacaoBase", "AvaliacaoCreate", "AvaliacaoResponse",
]
