"""
Repository de Tema
"""
from typing import Optional, List
from datetime import date
from calendar import monthrange
from sqlalchemy.orm import Session

from app.repositories.base import BaseRepository
from app.models.tema import Tema, TipoRecorrenciaTema, StatusGeral


class TemaRepository(BaseRepository[Tema]):
    """Repository para operações de Tema"""

    def __init__(self, db: Session):
        super().__init__(Tema, db)

    def get_ativos(self, organizacao_id: int = 1) -> List[Tema]:
        """Lista temas ativos"""
        return self.db.query(Tema).filter(
            Tema.organizacao_id == organizacao_id,
            Tema.status == StatusGeral.ATIVO
        ).all()

    def get_tema_para_data(
        self, 
        data_culto: date, 
        organizacao_id: int = 1
    ) -> Optional[Tema]:
        """
        Busca tema aplicável para uma data específica.
        Retorna o primeiro tema que se aplica à data.
        """
        temas = self.get_ativos(organizacao_id)
        
        for tema in temas:
            if self._tema_aplica_na_data(tema, data_culto):
                return tema
        
        return None

    def _tema_aplica_na_data(self, tema: Tema, data_culto: date) -> bool:
        """Verifica se um tema se aplica a uma data específica"""
        config = tema.config_recorrencia
        if not config:
            return False
        
        try:
            if tema.tipo_recorrencia == TipoRecorrenciaTema.PERIODO_ESPECIFICO:
                # Período específico: verifica se data está no range
                data_inicio = date.fromisoformat(config.get("data_inicio", ""))
                data_fim = date.fromisoformat(config.get("data_fim", ""))
                return data_inicio <= data_culto <= data_fim
            
            elif tema.tipo_recorrencia == TipoRecorrenciaTema.SEMANAL_MES:
                # Semanal do mês: ex. todo 2º sábado do mês
                semana_config = config.get("semana", 0)  # 1-5
                dia_config = config.get("dia", "").upper()  # SABADO, DOMINGO, QUARTA
                
                # Mapear dia da semana
                dia_semana_map = {
                    "SEGUNDA": 0, "TERCA": 1, "QUARTA": 2, "QUINTA": 3,
                    "SEXTA": 4, "SABADO": 5, "DOMINGO": 6
                }
                
                dia_config_num = dia_semana_map.get(dia_config)
                if dia_config_num is None:
                    return False
                
                # Verificar se é o dia correto
                if data_culto.weekday() != dia_config_num:
                    return False
                
                # Verificar semana do mês
                semana_atual = self._get_semana_do_mes(data_culto)
                return semana_atual == semana_config
            
            elif tema.tipo_recorrencia == TipoRecorrenciaTema.ANUAL:
                # Anual recorrente: ex. Dia das Mães (2º domingo de maio)
                mes_config = config.get("mes", 0)
                semana_config = config.get("semana", 0)
                dia_config = config.get("dia", "").upper()
                
                if data_culto.month != mes_config:
                    return False
                
                dia_semana_map = {
                    "SEGUNDA": 0, "TERCA": 1, "QUARTA": 2, "QUINTA": 3,
                    "SEXTA": 4, "SABADO": 5, "DOMINGO": 6
                }
                
                dia_config_num = dia_semana_map.get(dia_config)
                if dia_config_num is None:
                    return False
                
                if data_culto.weekday() != dia_config_num:
                    return False
                
                semana_atual = self._get_semana_do_mes(data_culto)
                return semana_atual == semana_config
                
        except (ValueError, TypeError, KeyError):
            return False
        
        return False

    def _get_semana_do_mes(self, data: date) -> int:
        """
        Retorna qual semana do mês uma data está.
        Conta quantos dias do mesmo dia da semana vieram antes.
        Ex: 2º sábado = semana 2
        """
        dia_semana = data.weekday()
        contador = 0
        
        for dia in range(1, data.day + 1):
            data_check = date(data.year, data.month, dia)
            if data_check.weekday() == dia_semana:
                contador += 1
        
        return contador
