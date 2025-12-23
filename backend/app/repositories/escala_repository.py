"""
Repository de Escala e Item de Escala
"""
from typing import Optional, List
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_

from app.repositories.base import BaseRepository
from app.models.escala import Escala, StatusEscala
from app.models.item_escala import ItemEscala, StatusConfirmacao, StatusRealizacao


class EscalaRepository(BaseRepository[Escala]):
    """Repository para operações de Escala"""

    def __init__(self, db: Session):
        super().__init__(Escala, db)

    def get_by_distrito_mes_ano(
        self, 
        distrito_id: int, 
        mes: int, 
        ano: int
    ) -> Optional[Escala]:
        """Busca escala por distrito, mês e ano"""
        return self.db.query(Escala).filter(
            Escala.distrito_id == distrito_id,
            Escala.mes == mes,
            Escala.ano == ano
        ).first()

    def get_by_distrito(
        self, 
        distrito_id: int,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Escala]:
        """Lista escalas de um distrito"""
        return self.db.query(Escala).filter(
            Escala.distrito_id == distrito_id
        ).order_by(Escala.ano.desc(), Escala.mes.desc()).offset(skip).limit(limit).all()

    def count_by_distrito(self, distrito_id: int) -> int:
        """Conta escalas de um distrito"""
        return self.db.query(Escala).filter(
            Escala.distrito_id == distrito_id
        ).count()

    def get_publicadas(self, distrito_id: int) -> List[Escala]:
        """Lista escalas publicadas de um distrito"""
        return self.db.query(Escala).filter(
            Escala.distrito_id == distrito_id,
            Escala.status == StatusEscala.PUBLICADA
        ).order_by(Escala.ano.desc(), Escala.mes.desc()).all()

    def get_with_items(self, escala_id: int) -> Optional[Escala]:
        """Busca escala com itens carregados"""
        return self.db.query(Escala).options(
            joinedload(Escala.itens)
        ).filter(Escala.id == escala_id).first()


class ItemEscalaRepository(BaseRepository[ItemEscala]):
    """Repository para operações de Item de Escala"""

    def __init__(self, db: Session):
        super().__init__(ItemEscala, db)

    def get_by_escala(self, escala_id: int) -> List[ItemEscala]:
        """Lista itens de uma escala"""
        return self.db.query(ItemEscala).filter(
            ItemEscala.escala_id == escala_id
        ).order_by(ItemEscala.data_culto, ItemEscala.horario).all()

    def get_by_igreja(
        self, 
        igreja_id: int, 
        data_inicio: date, 
        data_fim: date
    ) -> List[ItemEscala]:
        """Lista itens por igreja em um período"""
        return self.db.query(ItemEscala).filter(
            ItemEscala.igreja_id == igreja_id,
            ItemEscala.data_culto >= data_inicio,
            ItemEscala.data_culto <= data_fim
        ).order_by(ItemEscala.data_culto, ItemEscala.horario).all()

    def get_by_pregador(
        self, 
        pregador_id: int, 
        data_inicio: Optional[date] = None, 
        data_fim: Optional[date] = None
    ) -> List[ItemEscala]:
        """Lista itens de um pregador"""
        query = self.db.query(ItemEscala).filter(
            ItemEscala.pregador_id == pregador_id
        )
        
        if data_inicio:
            query = query.filter(ItemEscala.data_culto >= data_inicio)
        if data_fim:
            query = query.filter(ItemEscala.data_culto <= data_fim)
        
        return query.order_by(ItemEscala.data_culto, ItemEscala.horario).all()

    def get_by_cantor(
        self, 
        cantor_id: int, 
        data_inicio: Optional[date] = None, 
        data_fim: Optional[date] = None
    ) -> List[ItemEscala]:
        """Lista itens de um cantor"""
        query = self.db.query(ItemEscala).filter(
            ItemEscala.cantor_id == cantor_id
        )
        
        if data_inicio:
            query = query.filter(ItemEscala.data_culto >= data_inicio)
        if data_fim:
            query = query.filter(ItemEscala.data_culto <= data_fim)
        
        return query.order_by(ItemEscala.data_culto, ItemEscala.horario).all()

    def get_pendentes_confirmacao(self, usuario_id: int) -> List[ItemEscala]:
        """Lista itens pendentes de confirmação para um usuário"""
        return self.db.query(ItemEscala).filter(
            and_(
                ItemEscala.data_culto >= date.today(),
                (
                    (ItemEscala.pregador_id == usuario_id) & 
                    (ItemEscala.status_confirmacao_pregador == StatusConfirmacao.PENDENTE)
                ) | (
                    (ItemEscala.cantor_id == usuario_id) & 
                    (ItemEscala.status_confirmacao_cantor == StatusConfirmacao.PENDENTE)
                )
            )
        ).order_by(ItemEscala.data_culto).all()

    def count_participacoes_mes(
        self, 
        usuario_id: int, 
        mes: int, 
        ano: int,
        tipo: str = "pregador"  # "pregador" ou "cantor"
    ) -> int:
        """Conta participações de um usuário em um mês"""
        from calendar import monthrange
        
        data_inicio = date(ano, mes, 1)
        data_fim = date(ano, mes, monthrange(ano, mes)[1])
        
        query = self.db.query(ItemEscala).filter(
            ItemEscala.data_culto >= data_inicio,
            ItemEscala.data_culto <= data_fim
        )
        
        if tipo == "pregador":
            query = query.filter(ItemEscala.pregador_id == usuario_id)
        else:
            query = query.filter(ItemEscala.cantor_id == usuario_id)
        
        return query.count()

    def get_ultima_participacao(
        self, 
        usuario_id: int, 
        tipo: str = "pregador"
    ) -> Optional[ItemEscala]:
        """Busca última participação de um usuário"""
        query = self.db.query(ItemEscala).filter(
            ItemEscala.data_culto < date.today()
        )
        
        if tipo == "pregador":
            query = query.filter(ItemEscala.pregador_id == usuario_id)
        else:
            query = query.filter(ItemEscala.cantor_id == usuario_id)
        
        return query.order_by(ItemEscala.data_culto.desc()).first()

    def confirmar_presenca(
        self, 
        item_id: int, 
        usuario_id: int, 
        confirmado: bool
    ) -> Optional[ItemEscala]:
        """Confirma ou recusa presença (sem validação de prazo - feita no service)"""
        from datetime import datetime
        
        item = self.get_by_id(item_id)
        if not item:
            return None
        
        status = StatusConfirmacao.CONFIRMADO if confirmado else StatusConfirmacao.NAO_CONFIRMADO
        
        if item.pregador_id == usuario_id:
            item.status_confirmacao_pregador = status
            item.data_confirmacao_pregador = datetime.now(timezone.utc)
        elif item.cantor_id == usuario_id:
            item.status_confirmacao_cantor = status
            item.data_confirmacao_cantor = datetime.now(timezone.utc)
        else:
            return None
        
        self.db.commit()
        self.db.refresh(item)
        return item
