"""
Auxiliar para consultar o Itinerário do Pastor
"""
from calendar import monthrange
from datetime import date
from typing import Dict, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.itinerario_pastor import ItinerarioPastor

TEXTO_PASTOR_PRESENTE = "Pastor presente"


def mapa_itinerario(
    db: Session,
    mes: int,
    ano: int,
    distrito_id: Optional[int] = None,
    igreja_id: Optional[int] = None,
) -> Dict[Tuple[int, date], ItinerarioPastor]:
    """
    Retorna {(igreja_id, data_culto): ItinerarioPastor} do mês informado,
    filtrando por distrito e/ou igreja.
    """
    _, ultimo_dia = monthrange(ano, mes)
    query = db.query(ItinerarioPastor).filter(
        ItinerarioPastor.data_culto >= date(ano, mes, 1),
        ItinerarioPastor.data_culto <= date(ano, mes, ultimo_dia),
    )
    if distrito_id:
        query = query.filter(ItinerarioPastor.distrito_id == distrito_id)
    if igreja_id:
        query = query.filter(ItinerarioPastor.igreja_id == igreja_id)
    return {(i.igreja_id, i.data_culto): i for i in query.all()}


def texto_pastor_presente(itinerario: Optional[ItinerarioPastor]) -> str:
    """Ex.: 'Pastor presente: João Silva' (ou só 'Pastor presente' sem nome)."""
    if itinerario is not None and itinerario.pastor:
        return f"{TEXTO_PASTOR_PRESENTE}: {itinerario.pastor.nome_completo}"
    return TEXTO_PASTOR_PRESENTE
