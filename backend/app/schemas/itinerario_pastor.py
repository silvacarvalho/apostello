"""
Schemas de Itinerário do Pastor
"""
from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, List


class ItinerarioPastorCreate(BaseModel):
    igreja_id: int = Field(..., description="Igreja onde o pastor estará")
    data_culto: date = Field(..., description="Data em que o pastor estará na igreja")
    observacoes: Optional[str] = None


class ItinerarioPastorUpdate(BaseModel):
    igreja_id: Optional[int] = None
    data_culto: Optional[date] = None
    observacoes: Optional[str] = None


class ItinerarioPastorResponse(BaseModel):
    id: int
    distrito_id: int
    igreja_id: int
    igreja_nome: Optional[str] = None
    pastor_id: int
    pastor_nome: Optional[str] = None
    data_culto: date
    observacoes: Optional[str] = None


class ItinerarioPastorListResponse(BaseModel):
    total: int
    itinerarios: List[ItinerarioPastorResponse]
