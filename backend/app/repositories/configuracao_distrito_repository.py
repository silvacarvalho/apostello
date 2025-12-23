"""
Repository de Configuração do Distrito
"""
from typing import Optional
from sqlalchemy.orm import Session

from app.repositories.base import BaseRepository
from app.models.configuracao_distrito import ConfiguracaoDistrito


class ConfiguracaoDistritoRepository(BaseRepository[ConfiguracaoDistrito]):
    """Repository para operações de Configuração do Distrito"""

    def __init__(self, db: Session):
        super().__init__(ConfiguracaoDistrito, db)

    def get_by_distrito(self, distrito_id: int) -> Optional[ConfiguracaoDistrito]:
        """Busca configuração por ID do distrito"""
        return self.db.query(ConfiguracaoDistrito)\
            .filter(ConfiguracaoDistrito.distrito_id == distrito_id)\
            .first()

    def get_or_create_default(self, distrito_id: int) -> ConfiguracaoDistrito:
        """Busca configuração ou cria com valores padrão se não existir"""
        config = self.get_by_distrito(distrito_id)
        
        if not config:
            config = ConfiguracaoDistrito(
                distrito_id=distrito_id,
                recorrencia_maxima_mes=3,
                intervalo_minimo_dias=7,
                sistema_preferencias_habilitado=True,
                prazo_avaliacao_dias=7,
                confirmacao_obrigatoria=True,
                prazo_confirmacao_horas=48,
                permitir_trocas=True,
                aprovar_trocas_obrigatorio=True
            )
            self.db.add(config)
            self.db.commit()
            self.db.refresh(config)
        
        return config
