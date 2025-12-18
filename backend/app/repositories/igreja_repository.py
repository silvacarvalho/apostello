"""
Repository de Igreja
"""
from typing import Optional, List
from sqlalchemy.orm import Session

from app.repositories.base import BaseRepository
from app.models.igreja import Igreja, StatusGeral


class IgrejaRepository(BaseRepository[Igreja]):
    """Repository para operações de Igreja"""

    def __init__(self, db: Session):
        super().__init__(Igreja, db)

    def get_by_distrito(
        self, 
        distrito_id: int,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Igreja]:
        """Lista igrejas de um distrito"""
        return self.db.query(Igreja).filter(
            Igreja.distrito_id == distrito_id,
            Igreja.status == StatusGeral.ATIVO
        ).order_by(Igreja.nome).offset(skip).limit(limit).all()

    def get_ativas(self, distrito_id: int) -> List[Igreja]:
        """Lista igrejas ativas de um distrito"""
        return self.db.query(Igreja).filter(
            Igreja.distrito_id == distrito_id,
            Igreja.status == StatusGeral.ATIVO
        ).order_by(Igreja.nome).all()

    def count_by_distrito(self, distrito_id: int) -> int:
        """Conta igrejas de um distrito"""
        return self.db.query(Igreja).filter(
            Igreja.distrito_id == distrito_id
        ).count()

    def search_by_nome(
        self, 
        nome: str, 
        distrito_id: Optional[int] = None
    ) -> List[Igreja]:
        """Busca igrejas por nome"""
        query = self.db.query(Igreja).filter(
            Igreja.nome.ilike(f"%{nome}%"),
            Igreja.status == StatusGeral.ATIVO
        )
        
        if distrito_id:
            query = query.filter(Igreja.distrito_id == distrito_id)
        
        return query.order_by(Igreja.nome).all()
