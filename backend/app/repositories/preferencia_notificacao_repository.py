"""
Repository de Preferência de Notificação
"""
from sqlalchemy.orm import Session
from typing import Optional

from app.models.preferencia_notificacao import PreferenciaNotificacao
from app.repositories.base import BaseRepository


class PreferenciaNotificacaoRepository(BaseRepository[PreferenciaNotificacao]):
    def __init__(self, db: Session):
        super().__init__(PreferenciaNotificacao, db)
    
    def get_by_usuario(self, usuario_id: int) -> Optional[PreferenciaNotificacao]:
        """Busca preferência por usuário"""
        return self.db.query(PreferenciaNotificacao).filter(
            PreferenciaNotificacao.usuario_id == usuario_id
        ).first()
    
    def get_or_create_default(self, usuario_id: int) -> PreferenciaNotificacao:
        """Busca ou cria preferência com valores padrão"""
        preferencia = self.get_by_usuario(usuario_id)
        if not preferencia:
            preferencia = PreferenciaNotificacao(usuario_id=usuario_id)
            self.db.add(preferencia)
            self.db.commit()
            self.db.refresh(preferencia)
        return preferencia
