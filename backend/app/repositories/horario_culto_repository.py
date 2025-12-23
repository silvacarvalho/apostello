"""
Repository de Horário de Culto
"""
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from uuid import UUID

from app.repositories.base import BaseRepository
from app.models.horario_culto import HorarioCulto, DiaSemana


class HorarioCultoRepository(BaseRepository[HorarioCulto]):
    """Repository para operações de Horário de Culto"""

    def __init__(self, db: Session):
        super().__init__(HorarioCulto, db)

    def get_by_igreja(self, igreja_id: int, apenas_ativos: bool = True) -> List[HorarioCulto]:
        """Busca horários de culto por igreja"""
        query = self.db.query(HorarioCulto).filter(HorarioCulto.igreja_id == igreja_id)
        
        if apenas_ativos:
            query = query.filter(HorarioCulto.ativo == True)
        
        return query.order_by(
            HorarioCulto.dia_semana,
            HorarioCulto.horario
        ).all()

    def get_by_distrito(self, distrito_id: int, apenas_ativos: bool = True) -> List[HorarioCulto]:
        """Busca todos os horários de culto de um distrito"""
        from app.models.igreja import Igreja
        
        query = self.db.query(HorarioCulto)\
            .join(Igreja, Igreja.id == HorarioCulto.igreja_id)\
            .filter(Igreja.distrito_id == distrito_id)
        
        if apenas_ativos:
            query = query.filter(HorarioCulto.ativo == True)
        
        return query.order_by(
            Igreja.nome,
            HorarioCulto.dia_semana,
            HorarioCulto.horario
        ).all()

    def get_by_lote(self, lote_id: UUID) -> List[HorarioCulto]:
        """Busca horários criados em um lote específico"""
        return self.db.query(HorarioCulto)\
            .filter(HorarioCulto.lote_id == lote_id)\
            .all()

    def delete_by_igreja(self, igreja_id: int) -> int:
        """Deleta todos os horários de uma igreja"""
        count = self.db.query(HorarioCulto)\
            .filter(HorarioCulto.igreja_id == igreja_id)\
            .delete()
        self.db.commit()
        return count

    def delete_by_lote(self, lote_id: UUID) -> int:
        """Deleta todos os horários de um lote"""
        count = self.db.query(HorarioCulto)\
            .filter(HorarioCulto.lote_id == lote_id)\
            .delete()
        self.db.commit()
        return count
