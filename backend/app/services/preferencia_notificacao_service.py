"""
Service de Preferência de Notificação
"""
from sqlalchemy.orm import Session

from app.models.usuario import Usuario
from app.schemas.preferencia_notificacao import (
    PreferenciaNotificacaoUpdate,
    PreferenciaNotificacaoResponse
)
from app.repositories.preferencia_notificacao_repository import PreferenciaNotificacaoRepository


class PreferenciaNotificacaoService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = PreferenciaNotificacaoRepository(db)
    
    def get_preferencia(self, usuario: Usuario) -> PreferenciaNotificacaoResponse:
        """Obtém preferências de notificação do usuário (cria se não existir)"""
        preferencia = self.repository.get_or_create_default(usuario.id)
        return PreferenciaNotificacaoResponse.from_orm(preferencia)
    
    def update_preferencia(
        self,
        usuario: Usuario,
        data: PreferenciaNotificacaoUpdate
    ) -> PreferenciaNotificacaoResponse:
        """Atualiza preferências de notificação"""
        preferencia = self.repository.get_or_create_default(usuario.id)
        
        # Atualizar apenas campos fornecidos
        update_data = data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(preferencia, field, value)
        
        self.db.commit()
        self.db.refresh(preferencia)
        
        return PreferenciaNotificacaoResponse.from_orm(preferencia)
