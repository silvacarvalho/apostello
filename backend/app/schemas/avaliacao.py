"""
Schemas de Avaliação
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal

from app.models.avaliacao import TipoAvaliado


class AvaliacaoBase(BaseModel):
    """Schema base de avaliação"""
    item_escala_id: int
    avaliado_id: int
    tipo: TipoAvaliado
    criterio_1: int = Field(..., ge=1, le=5)
    criterio_2: int = Field(..., ge=1, le=5)
    criterio_3: int = Field(..., ge=1, le=5)
    criterio_4: int = Field(..., ge=1, le=5)
    criterio_5: int = Field(..., ge=1, le=5)
    confirmou_identidade: bool = Field(True, description="Se o pregador/cantor é realmente quem estava escalado")
    comentario: Optional[str] = None


class AvaliacaoCreate(AvaliacaoBase):
    """Schema para criação de avaliação"""
    pass


class AvaliacaoResponse(BaseModel):
    """Schema de resposta de avaliação"""
    id: int
    item_escala_id: int
    avaliado_id: int
    avaliador_id: int
    tipo: TipoAvaliado
    criterio_1: int
    criterio_2: int
    criterio_3: int
    criterio_4: int
    criterio_5: int
    confirmou_identidade: bool
    comentario: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @property
    def media(self) -> Decimal:
        return Decimal(
            (self.criterio_1 + self.criterio_2 + self.criterio_3 + 
             self.criterio_4 + self.criterio_5) / 5
        ).quantize(Decimal('0.01'))


class AvaliacaoListResponse(BaseModel):
    """Schema para listagem de avaliações"""
    items: list[AvaliacaoResponse]
    total: int
    media_geral: Decimal


class AvaliadoInfo(BaseModel):
    """Informações do avaliado para exibir no formulário de avaliação"""
    id: int
    nome_completo: str
    foto_perfil: Optional[str] = None
    tipo: TipoAvaliado
    
    class Config:
        from_attributes = True


class ItemAvaliacaoPendente(BaseModel):
    """Item de escala pendente de avaliação com dados do avaliado"""
    item_id: int
    escala_id: int
    data_culto: datetime
    igreja_id: int
    igreja_nome: str
    pregador: Optional[AvaliadoInfo] = None
    cantor: Optional[AvaliadoInfo] = None
    
    class Config:
        from_attributes = True


class QuestionarioAvaliacaoResponse(BaseModel):
    """Schema completo para o questionário de avaliação"""
    item_escala: ItemAvaliacaoPendente
    criterios_pregador: dict = {
        "criterio_1": "Conteúdo Bíblico",
        "criterio_2": "Comunicação",
        "criterio_3": "Tempo/Organização",
        "criterio_4": "Impacto Espiritual",
        "criterio_5": "Avaliação Geral"
    }
    criterios_cantor: dict = {
        "criterio_1": "Técnica Vocal",
        "criterio_2": "Interpretação",
        "criterio_3": "Ministração",
        "criterio_4": "Apresentação",
        "criterio_5": "Avaliação Geral"
    }
    pergunta_confirmacao: str = "Esta pessoa é realmente quem estava escalado(a) para esta função?"

