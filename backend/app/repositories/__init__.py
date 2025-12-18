"""Repositories module - Data access layer"""
from app.repositories.base import BaseRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.repositories.distrito_repository import DistritoRepository
from app.repositories.igreja_repository import IgrejaRepository
from app.repositories.escala_repository import EscalaRepository

__all__ = [
    "BaseRepository",
    "UsuarioRepository",
    "DistritoRepository",
    "IgrejaRepository",
    "EscalaRepository",
]
