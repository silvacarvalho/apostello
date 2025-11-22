"""
Schemas para importação em massa de dados
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum


class TipoImportacao(str, Enum):
    """Tipos de importação suportados"""
    MEMBROS = "membros"
    TEMATICAS = "tematicas"
    HORARIOS_CULTO = "horarios_culto"
    PREGADORES = "pregadores"


class StatusImportacao(str, Enum):
    """Status da importação"""
    PENDENTE = "pendente"
    PROCESSANDO = "processando"
    CONCLUIDO = "concluido"
    ERRO = "erro"


class ErroLinha(BaseModel):
    """Detalhes de erro em uma linha"""
    linha: int
    campo: Optional[str] = None
    mensagem: str
    dados: Optional[Dict[str, Any]] = None


class ImportacaoResponse(BaseModel):
    """Resposta da importação"""
    id: str
    tipo_importacao: str
    nome_arquivo: str
    status: str
    total_linhas: int
    linhas_sucesso: int
    linhas_erro: int
    erros: Optional[List[ErroLinha]] = []
    iniciado_em: datetime
    concluido_em: Optional[datetime] = None
    usuario_id: str

    class Config:
        from_attributes = True


class ImportacaoCreate(BaseModel):
    """Schema para iniciar importação"""
    tipo_importacao: TipoImportacao
    arquivo_path: str
    validar_apenas: bool = Field(
        default=False,
        description="Se True, apenas valida sem salvar no banco"
    )


class MembroImportacao(BaseModel):
    """Schema para importação de membro individual"""
    nome_completo: str = Field(..., min_length=3, max_length=200)
    email: str = Field(..., max_length=100)
    telefone: Optional[str] = Field(None, max_length=20)
    igreja_id: str
    perfis: List[str] = Field(default_factory=lambda: ["avaliador"])

    # Campos opcionais
    cpf: Optional[str] = Field(None, max_length=14)
    data_nascimento: Optional[str] = None
    cargo: Optional[str] = Field(None, max_length=100)

    @validator('email')
    def validar_email(cls, v):
        if '@' not in v:
            raise ValueError('Email inválido')
        return v.lower().strip()


class TematicaImportacao(BaseModel):
    """Schema para importação de temática individual"""
    titulo: str = Field(..., min_length=3, max_length=300)
    descricao: Optional[str] = None
    referencia_biblica: Optional[str] = Field(None, max_length=200)
    tipo_recorrencia: str = Field(..., description="DATA_ESPECIFICA, SEMANAL ou MENSAL")

    # Campos condicionais baseados no tipo
    data_especifica: Optional[str] = None
    dia_semana_semanal: Optional[str] = None
    numero_semana_mes: Optional[int] = None
    dia_semana_mensal: Optional[str] = None

    # Período de validade
    valido_de: Optional[str] = None
    valido_ate: Optional[str] = None

    @validator('tipo_recorrencia')
    def validar_tipo_recorrencia(cls, v):
        validos = ['DATA_ESPECIFICA', 'SEMANAL', 'MENSAL']
        if v.upper() not in validos:
            raise ValueError(f'tipo_recorrencia deve ser um de: {", ".join(validos)}')
        return v.upper()


class ImportacaoValidacao(BaseModel):
    """Resultado da validação de importação"""
    valido: bool
    total_linhas: int
    linhas_validas: int
    linhas_invalidas: int
    erros: List[ErroLinha]
    preview: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Primeiras 5 linhas para preview"
    )


class TemplateImportacao(BaseModel):
    """Informações sobre template de importação"""
    tipo: TipoImportacao
    colunas_obrigatorias: List[str]
    colunas_opcionais: List[str]
    exemplo: Dict[str, Any]
    url_download: str
