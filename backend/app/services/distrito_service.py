"""
Serviço de Distrito
"""
from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ForbiddenException
from app.repositories.distrito_repository import DistritoRepository
from app.models.distrito import Distrito
from app.models.usuario import Usuario
from app.schemas.distrito import DistritoCreate, DistritoUpdate


class DistritoService:
    """Serviço de distritos"""

    def __init__(self, db: Session):
        self.db = db
        self.repository = DistritoRepository(db)

    def create(self, data: DistritoCreate, current_user: Usuario) -> Distrito:
        """Cria novo distrito"""
        if not current_user.is_admin:
            raise ForbiddenException("Apenas administradores podem criar distritos")
        
        return self.repository.create(data.model_dump())

    def get_by_id(self, distrito_id: int) -> Distrito:
        """Busca distrito por ID"""
        distrito = self.repository.get_by_id(distrito_id)
        if not distrito:
            raise NotFoundException("Distrito", distrito_id)
        return distrito

    def list_all(
        self, 
        organizacao_id: int,
        skip: int = 0, 
        limit: int = 100
    ) -> tuple[List[Distrito], int]:
        """Lista distritos de uma organização"""
        distritos = self.repository.get_by_organizacao(organizacao_id, skip, limit)
        total = self.repository.count_by_organizacao(organizacao_id)
        return distritos, total

    def update(
        self, 
        distrito_id: int, 
        data: DistritoUpdate, 
        current_user: Usuario
    ) -> Distrito:
        """Atualiza distrito"""
        distrito = self.get_by_id(distrito_id)
        
        if not self._can_manage(current_user, distrito):
            raise ForbiddenException("Sem permissão para editar este distrito")
        
        update_data = data.model_dump(exclude_unset=True)
        return self.repository.update(distrito_id, update_data)

    def delete(self, distrito_id: int, current_user: Usuario) -> bool:
        """Remove distrito"""
        if not current_user.is_admin:
            raise ForbiddenException("Apenas administradores podem remover distritos")
        
        return self.repository.delete(distrito_id)

    def get_by_pastor(self, pastor_id: int) -> Optional[Distrito]:
        """Busca distrito de um pastor"""
        return self.repository.get_by_pastor(pastor_id)

    def list_publico(self, skip: int = 0, limit: int = 100) -> tuple[List[Distrito], int]:
        """Lista distritos ativos (para auto-cadastro público)"""
        distritos = self.repository.get_all_ativos(skip, limit)
        total = self.repository.count_ativos()
        return distritos, total

    def search(
        self, 
        search: str = "",
        skip: int = 0, 
        limit: int = 50
    ) -> tuple[List[Distrito], int]:
        """Pesquisa distritos por nome"""
        distritos = self.repository.search_by_nome(search, skip, limit)
        total = self.repository.count_search(search)
        return distritos, total

    def _can_manage(self, user: Usuario, distrito: Distrito) -> bool:
        """Verifica se usuário pode gerenciar distrito"""
        if user.is_admin:
            return True
        
        if user.is_pastor and user.distrito_id == distrito.id:
            return True
        
        return False
