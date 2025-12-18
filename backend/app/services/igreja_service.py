"""
Serviço de Igreja
"""
from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ForbiddenException
from app.repositories.igreja_repository import IgrejaRepository
from app.models.igreja import Igreja
from app.models.usuario import Usuario
from app.schemas.igreja import IgrejaCreate, IgrejaUpdate


class IgrejaService:
    """Serviço de igrejas"""

    def __init__(self, db: Session):
        self.db = db
        self.repository = IgrejaRepository(db)

    def create(self, data: IgrejaCreate, current_user: Usuario) -> Igreja:
        """Cria nova igreja"""
        if not current_user.is_admin and not current_user.is_pastor:
            raise ForbiddenException("Sem permissão para criar igrejas")
        
        # Pastor só pode criar no seu distrito
        if current_user.is_pastor and current_user.distrito_id != data.distrito_id:
            raise ForbiddenException("Você só pode criar igrejas no seu distrito")
        
        return self.repository.create(data.model_dump())

    def get_by_id(self, igreja_id: int) -> Igreja:
        """Busca igreja por ID"""
        igreja = self.repository.get_by_id(igreja_id)
        if not igreja:
            raise NotFoundException("Igreja", igreja_id)
        return igreja

    def list_by_distrito(
        self, 
        distrito_id: int,
        skip: int = 0, 
        limit: int = 100
    ) -> tuple[List[Igreja], int]:
        """Lista igrejas de um distrito"""
        igrejas = self.repository.get_by_distrito(distrito_id, skip, limit)
        total = self.repository.count_by_distrito(distrito_id)
        return igrejas, total

    def update(
        self, 
        igreja_id: int, 
        data: IgrejaUpdate, 
        current_user: Usuario
    ) -> Igreja:
        """Atualiza igreja"""
        igreja = self.get_by_id(igreja_id)
        
        if not self._can_manage(current_user, igreja):
            raise ForbiddenException("Sem permissão para editar esta igreja")
        
        update_data = data.model_dump(exclude_unset=True)
        return self.repository.update(igreja_id, update_data)

    def delete(self, igreja_id: int, current_user: Usuario) -> bool:
        """Remove igreja"""
        igreja = self.get_by_id(igreja_id)
        
        if not current_user.is_admin:
            raise ForbiddenException("Apenas administradores podem remover igrejas")
        
        return self.repository.delete(igreja_id)

    def search(
        self, 
        nome: str, 
        distrito_id: Optional[int] = None
    ) -> List[Igreja]:
        """Busca igrejas por nome"""
        return self.repository.search_by_nome(nome, distrito_id)

    def _can_manage(self, user: Usuario, igreja: Igreja) -> bool:
        """Verifica se usuário pode gerenciar igreja"""
        if user.is_admin:
            return True
        
        if user.is_pastor and user.distrito_id == igreja.distrito_id:
            return True
        
        return False
