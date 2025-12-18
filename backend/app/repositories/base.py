"""
Repository Base - Operações CRUD genéricas
"""
from typing import TypeVar, Generic, Optional, List, Type
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Repository base com operações CRUD genéricas"""

    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get_by_id(self, id: int) -> Optional[ModelType]:
        """Busca registro por ID"""
        return self.db.query(self.model).filter(self.model.id == id).first()

    def get_all(
        self, 
        skip: int = 0, 
        limit: int = 100,
        order_by: str = "id"
    ) -> List[ModelType]:
        """Lista todos os registros com paginação"""
        query = self.db.query(self.model)
        
        if hasattr(self.model, order_by):
            query = query.order_by(getattr(self.model, order_by))
        
        return query.offset(skip).limit(limit).all()

    def count(self) -> int:
        """Conta total de registros"""
        return self.db.query(func.count(self.model.id)).scalar()

    def create(self, obj_data: dict) -> ModelType:
        """Cria novo registro"""
        db_obj = self.model(**obj_data)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, id: int, obj_data: dict) -> Optional[ModelType]:
        """Atualiza registro existente"""
        db_obj = self.get_by_id(id)
        if db_obj:
            for key, value in obj_data.items():
                if value is not None:
                    setattr(db_obj, key, value)
            self.db.commit()
            self.db.refresh(db_obj)
        return db_obj

    def delete(self, id: int) -> bool:
        """Remove registro por ID"""
        db_obj = self.get_by_id(id)
        if db_obj:
            self.db.delete(db_obj)
            self.db.commit()
            return True
        return False

    def exists(self, id: int) -> bool:
        """Verifica se registro existe"""
        return self.db.query(
            self.db.query(self.model).filter(self.model.id == id).exists()
        ).scalar()
