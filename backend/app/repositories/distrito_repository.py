"""
Repository de Distrito
"""
from typing import Optional, List
from sqlalchemy.orm import Session

from app.repositories.base import BaseRepository
from app.models.distrito import Distrito, StatusGeral


class DistritoRepository(BaseRepository[Distrito]):
    """Repository para operações de Distrito"""

    def __init__(self, db: Session):
        super().__init__(Distrito, db)

    def get_by_organizacao(
        self, 
        organizacao_id: int,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Distrito]:
        """Lista distritos de uma organização"""
        return self.db.query(Distrito).filter(
            Distrito.organizacao_id == organizacao_id,
            Distrito.status == StatusGeral.ATIVO
        ).offset(skip).limit(limit).all()

    def get_by_pastor(self, pastor_id: int) -> Optional[Distrito]:
        """Busca distrito por pastor"""
        return self.db.query(Distrito).filter(
            Distrito.pastor_distrital_id == pastor_id
        ).first()

    def get_by_lider(self, lider_id: int) -> Optional[Distrito]:
        """Busca distrito por líder"""
        return self.db.query(Distrito).filter(
            Distrito.lider_distrital_id == lider_id
        ).first()

    def get_ativos(self, organizacao_id: int) -> List[Distrito]:
        """Lista distritos ativos de uma organização"""
        return self.db.query(Distrito).filter(
            Distrito.organizacao_id == organizacao_id,
            Distrito.status == StatusGeral.ATIVO
        ).order_by(Distrito.nome).all()

    def count_by_organizacao(self, organizacao_id: int) -> int:
        """Conta distritos de uma organização"""
        return self.db.query(Distrito).filter(
            Distrito.organizacao_id == organizacao_id
        ).count()

    def get_all_ativos(self, skip: int = 0, limit: int = 100) -> List[Distrito]:
        """Lista todos os distritos ativos (para auto-cadastro)"""
        return self.db.query(Distrito).filter(
            Distrito.status == StatusGeral.ATIVO
        ).order_by(Distrito.nome).offset(skip).limit(limit).all()

    def count_ativos(self) -> int:
        """Conta todos os distritos ativos"""
        return self.db.query(Distrito).filter(
            Distrito.status == StatusGeral.ATIVO
        ).count()

    def search_by_nome(
        self, 
        search: str,
        skip: int = 0, 
        limit: int = 50
    ) -> List[Distrito]:
        """Pesquisa distritos por nome"""
        query = self.db.query(Distrito).filter(
            Distrito.status == StatusGeral.ATIVO
        )
        
        if search:
            query = query.filter(Distrito.nome.ilike(f"%{search}%"))
        
        return query.order_by(Distrito.nome).offset(skip).limit(limit).all()

    def count_search(self, search: str) -> int:
        """Conta distritos que correspondem à pesquisa"""
        query = self.db.query(Distrito).filter(
            Distrito.status == StatusGeral.ATIVO
        )
        
        if search:
            query = query.filter(Distrito.nome.ilike(f"%{search}%"))
        
        return query.count()
