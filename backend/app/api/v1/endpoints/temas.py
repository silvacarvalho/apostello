"""
Endpoints de Temas
"""
from typing import Optional, List, Any, cast
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, status, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import json

from app.database import get_db
from app.models.tema import Tema, TipoRecorrenciaTema as TipoRecorrenciaModel, StatusGeral as StatusGeralModel
from app.models.item_escala import ItemEscala
from app.models.usuario import Usuario
from app.schemas.tema import (
    TemaCreate, TemaUpdate, TemaResponse, TemaListResponse,
    TemaExportTemplate, TemaExportItem, TemaImportResult,
    TipoRecorrenciaTema, StatusGeral
)
from app.api.deps import get_current_user, require_admin_ou_associacao
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException


router = APIRouter()


def get_organizacao_id(user: Usuario) -> int:
    """Obtém o ID da organização do usuário"""
    # Por simplicidade, retorna 1 (única organização)
    return 1


@router.get("/", response_model=TemaListResponse)
def listar_temas(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filtro: Optional[str] = Query(None, description="Filtrar por status (ATIVO/INATIVO)"),
    search: Optional[str] = Query(None, description="Buscar por título ou descrição"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista todos os temas da organização.
    """
    org_id = get_organizacao_id(current_user)
    
    query = db.query(Tema).filter(Tema.organizacao_id == org_id)
    
    # Filtro por status
    if status_filtro:
        try:
            status_enum = StatusGeral(status_filtro)
            query = query.filter(Tema.status == status_enum)
        except ValueError:
            pass
    
    # Busca por texto
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Tema.titulo.ilike(search_term)) |
            (Tema.descricao.ilike(search_term))
        )
    
    total = query.count()
    
    temas = query.order_by(Tema.titulo).offset(skip).limit(limit).all()
    
    # Adicionar contagem de uso para cada tema
    result = []
    for tema in temas:
        vezes_usado = db.query(func.count(ItemEscala.id)).filter(
            ItemEscala.tema_id == tema.id
        ).scalar() or 0
        
        tema_dict = {
            "id": tema.id,
            "organizacao_id": tema.organizacao_id,
            "titulo": tema.titulo,
            "descricao": tema.descricao,
            "tipo_recorrencia": tema.tipo_recorrencia,
            "config_recorrencia": tema.config_recorrencia,
            "ano_aplicacao": tema.ano_aplicacao,
            "status": tema.status,
            "vezes_usado": vezes_usado,
            "created_at": tema.created_at,
            "updated_at": tema.updated_at
        }
        result.append(tema_dict)
    
    return {"items": result, "total": total}


@router.get("/{tema_id}", response_model=TemaResponse)
def obter_tema(
    tema_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtém um tema pelo ID.
    """
    org_id = get_organizacao_id(current_user)
    
    tema = db.query(Tema).filter(
        Tema.id == tema_id,
        Tema.organizacao_id == org_id
    ).first()
    
    if not tema:
        raise NotFoundException("Tema não encontrado")
    
    vezes_usado = db.query(func.count(ItemEscala.id)).filter(
        ItemEscala.tema_id == tema.id
    ).scalar() or 0
    
    return {
        "id": tema.id,
        "organizacao_id": tema.organizacao_id,
        "titulo": tema.titulo,
        "descricao": tema.descricao,
        "tipo_recorrencia": tema.tipo_recorrencia,
        "config_recorrencia": tema.config_recorrencia,
        "ano_aplicacao": tema.ano_aplicacao,
        "status": tema.status,
        "vezes_usado": vezes_usado,
        "created_at": tema.created_at,
        "updated_at": tema.updated_at
    }


@router.post("/", response_model=TemaResponse, status_code=status.HTTP_201_CREATED)
def criar_tema(
    data: TemaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin_ou_associacao)
):
    """
    Cria um novo tema.
    Apenas administradores podem criar temas.
    """
    org_id = get_organizacao_id(current_user)
    
    # Verificar se já existe tema com mesmo título
    existente = db.query(Tema).filter(
        Tema.organizacao_id == org_id,
        Tema.titulo == data.titulo
    ).first()
    
    if existente:
        raise BadRequestException(f"Já existe um tema com o título '{data.titulo}'")
    
    tema = Tema(
        organizacao_id=org_id,
        titulo=data.titulo,
        descricao=data.descricao,
        tipo_recorrencia=data.tipo_recorrencia,
        config_recorrencia=data.config_recorrencia,
        ano_aplicacao=data.ano_aplicacao,
        status=StatusGeralModel.ATIVO
    )
    
    db.add(tema)
    db.commit()
    db.refresh(tema)
    
    return {
        "id": tema.id,
        "organizacao_id": tema.organizacao_id,
        "titulo": tema.titulo,
        "descricao": tema.descricao,
        "tipo_recorrencia": tema.tipo_recorrencia,
        "config_recorrencia": tema.config_recorrencia,
        "ano_aplicacao": tema.ano_aplicacao,
        "status": tema.status,
        "vezes_usado": 0,
        "created_at": tema.created_at,
        "updated_at": tema.updated_at
    }


@router.put("/{tema_id}", response_model=TemaResponse)
def atualizar_tema(
    tema_id: int,
    data: TemaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin_ou_associacao)
):
    """
    Atualiza um tema existente.
    """
    org_id = get_organizacao_id(current_user)
    
    tema = db.query(Tema).filter(
        Tema.id == tema_id,
        Tema.organizacao_id == org_id
    ).first()
    
    if not tema:
        raise NotFoundException("Tema não encontrado")
    
    # Verificar duplicidade de título
    if data.titulo and data.titulo != tema.titulo:
        existente = db.query(Tema).filter(
            Tema.organizacao_id == org_id,
            Tema.titulo == data.titulo,
            Tema.id != tema_id
        ).first()
        if existente:
            raise BadRequestException(f"Já existe outro tema com o título '{data.titulo}'")
    
    # Atualizar campos
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tema, field, value)
    
    db.commit()
    db.refresh(tema)
    
    vezes_usado = db.query(func.count(ItemEscala.id)).filter(
        ItemEscala.tema_id == tema.id
    ).scalar() or 0
    
    return {
        "id": tema.id,
        "organizacao_id": tema.organizacao_id,
        "titulo": tema.titulo,
        "descricao": tema.descricao,
        "tipo_recorrencia": tema.tipo_recorrencia,
        "config_recorrencia": tema.config_recorrencia,
        "ano_aplicacao": tema.ano_aplicacao,
        "status": tema.status,
        "vezes_usado": vezes_usado,
        "created_at": tema.created_at,
        "updated_at": tema.updated_at
    }


@router.delete("/{tema_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_tema(
    tema_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin_ou_associacao)
):
    """
    Exclui um tema.
    Não pode excluir temas que estão em uso nas escalas.
    """
    org_id = get_organizacao_id(current_user)
    
    tema = db.query(Tema).filter(
        Tema.id == tema_id,
        Tema.organizacao_id == org_id
    ).first()
    
    if not tema:
        raise NotFoundException("Tema não encontrado")
    
    # Verificar se está em uso
    em_uso = db.query(ItemEscala).filter(ItemEscala.tema_id == tema_id).first()
    if em_uso:
        raise BadRequestException(
            "Este tema está em uso em escalas e não pode ser excluído. "
            "Considere desativá-lo ao invés de excluir."
        )
    
    db.delete(tema)
    db.commit()


@router.post("/{tema_id}/toggle-status", response_model=TemaResponse)
def alternar_status_tema(
    tema_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin_ou_associacao)
):
    """
    Alterna o status do tema entre ATIVO e INATIVO.
    """
    org_id = get_organizacao_id(current_user)
    
    tema = db.query(Tema).filter(
        Tema.id == tema_id,
        Tema.organizacao_id == org_id
    ).first()
    
    if not tema:
        raise NotFoundException("Tema não encontrado")
    
    # Toggle status
    novo_status = StatusGeralModel.INATIVO if str(tema.status) == StatusGeralModel.ATIVO.value else StatusGeralModel.ATIVO
    tema.status = novo_status  # type: ignore
    db.commit()
    db.refresh(tema)
    
    vezes_usado = db.query(func.count(ItemEscala.id)).filter(
        ItemEscala.tema_id == tema.id
    ).scalar() or 0
    
    return {
        "id": tema.id,
        "organizacao_id": tema.organizacao_id,
        "titulo": tema.titulo,
        "descricao": tema.descricao,
        "tipo_recorrencia": tema.tipo_recorrencia,
        "config_recorrencia": tema.config_recorrencia,
        "ano_aplicacao": tema.ano_aplicacao,
        "status": tema.status,
        "vezes_usado": vezes_usado,
        "created_at": tema.created_at,
        "updated_at": tema.updated_at
    }


# ============ EXPORTAÇÃO ============

@router.get("/exportar/template", response_model=TemaExportTemplate)
def exportar_temas(
    apenas_ativos: bool = Query(True, description="Exportar apenas temas ativos"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin_ou_associacao)
):
    """
    Exporta todos os temas como template JSON.
    Pode ser usado para backup ou migração.
    """
    org_id = get_organizacao_id(current_user)
    
    query = db.query(Tema).filter(Tema.organizacao_id == org_id)
    
    if apenas_ativos:
        query = query.filter(Tema.status == StatusGeralModel.ATIVO)
    
    temas = query.order_by(Tema.titulo).all()
    
    export_items: List[TemaExportItem] = []
    for tema in temas:
        # Cast para evitar erros de tipagem com SQLAlchemy
        titulo_str = cast(str, tema.titulo)
        descricao_str = cast(Optional[str], tema.descricao)
        tipo_str = cast(str, tema.tipo_recorrencia or "SEMANAL_MES")  # type: ignore
        config_dict = cast(dict, tema.config_recorrencia or {})  # type: ignore
        ano_int = cast(Optional[int], tema.ano_aplicacao)
        
        export_items.append(TemaExportItem(
            titulo=titulo_str,
            descricao=descricao_str,
            tipo_recorrencia=TipoRecorrenciaTema(tipo_str),
            config_recorrencia=config_dict,
            ano_aplicacao=ano_int
        ))
    
    return TemaExportTemplate(
        version="1.0",
        exported_at=datetime.now(timezone.utc),
        total_temas=len(export_items),
        temas=export_items
    )


# ============ IMPORTAÇÃO ============

@router.post("/importar/template", response_model=TemaImportResult)
def importar_temas(
    template: TemaExportTemplate,
    sobrescrever_existentes: bool = Query(False, description="Sobrescrever temas com mesmo título"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin_ou_associacao)
):
    """
    Importa temas a partir de um template JSON.
    """
    org_id = get_organizacao_id(current_user)
    
    importados = 0
    ignorados = 0
    erros = []
    
    for i, item in enumerate(template.temas):
        try:
            # Verificar se já existe
            existente = db.query(Tema).filter(
                Tema.organizacao_id == org_id,
                Tema.titulo == item.titulo
            ).first()
            
            if existente:
                if sobrescrever_existentes:
                    # Atualizar existente
                    existente.descricao = item.descricao  # type: ignore
                    existente.tipo_recorrencia = item.tipo_recorrencia  # type: ignore
                    existente.config_recorrencia = item.config_recorrencia  # type: ignore
                    existente.ano_aplicacao = item.ano_aplicacao  # type: ignore
                    importados += 1
                else:
                    ignorados += 1
            else:
                # Criar novo
                tema = Tema(
                    organizacao_id=org_id,
                    titulo=item.titulo,
                    descricao=item.descricao,
                    tipo_recorrencia=item.tipo_recorrencia,
                    config_recorrencia=item.config_recorrencia,
                    ano_aplicacao=item.ano_aplicacao,
                    status=StatusGeralModel.ATIVO
                )
                db.add(tema)
                importados += 1
                
        except Exception as e:
            erros.append(f"Erro no tema '{item.titulo}': {str(e)}")
    
    db.commit()
    
    return TemaImportResult(
        total_importados=importados,
        total_ignorados=ignorados,
        erros=erros
    )


@router.post("/importar/arquivo", response_model=TemaImportResult)
async def importar_temas_arquivo(
    arquivo: UploadFile = File(..., description="Arquivo JSON com template de temas"),
    sobrescrever_existentes: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin_ou_associacao)
):
    """
    Importa temas a partir de um arquivo JSON.
    """
    if not arquivo.filename or not arquivo.filename.endswith('.json'):
        raise BadRequestException("O arquivo deve ser um JSON (.json)")
    
    try:
        content = await arquivo.read()
        data = json.loads(content.decode('utf-8'))
    except json.JSONDecodeError as e:
        raise BadRequestException(f"Erro ao ler JSON: {str(e)}")
    except Exception as e:
        raise BadRequestException(f"Erro ao processar arquivo: {str(e)}")
    
    # Validar estrutura
    if "temas" not in data:
        raise BadRequestException("Arquivo inválido: campo 'temas' não encontrado")
    
    org_id = get_organizacao_id(current_user)
    
    importados = 0
    ignorados = 0
    erros = []
    
    for item in data["temas"]:
        try:
            titulo = item.get("titulo")
            if not titulo:
                erros.append("Tema sem título ignorado")
                continue
            
            tipo_recorrencia = item.get("tipo_recorrencia", "SEMANAL_MES")
            config_recorrencia = item.get("config_recorrencia", {})
            
            # Verificar se já existe
            existente = db.query(Tema).filter(
                Tema.organizacao_id == org_id,
                Tema.titulo == titulo
            ).first()
            
            if existente:
                if sobrescrever_existentes:
                    existente.descricao = item.get("descricao")  # type: ignore
                    existente.tipo_recorrencia = TipoRecorrenciaModel(tipo_recorrencia)  # type: ignore
                    existente.config_recorrencia = config_recorrencia  # type: ignore
                    existente.ano_aplicacao = item.get("ano_aplicacao")  # type: ignore
                    importados += 1
                else:
                    ignorados += 1
            else:
                tema = Tema(
                    organizacao_id=org_id,
                    titulo=titulo,
                    descricao=item.get("descricao"),
                    tipo_recorrencia=TipoRecorrenciaModel(tipo_recorrencia),
                    config_recorrencia=config_recorrencia,
                    ano_aplicacao=item.get("ano_aplicacao"),
                    status=StatusGeralModel.ATIVO
                )
                db.add(tema)
                importados += 1
                
        except Exception as e:
            erros.append(f"Erro: {str(e)}")
    
    db.commit()
    
    return TemaImportResult(
        total_importados=importados,
        total_ignorados=ignorados,
        erros=erros
    )


# ============ TEMPLATES PRÉ-DEFINIDOS ============

@router.get("/templates/disponiveis")
def listar_templates_disponiveis(
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista templates pré-definidos disponíveis para importação.
    """
    templates = [
        {
            "id": "iasd_basico",
            "nome": "IASD - Temas Básicos",
            "descricao": "Temas recorrentes para igrejas adventistas",
            "total_temas": 12
        },
        {
            "id": "datas_especiais",
            "nome": "Datas Especiais",
            "descricao": "Temas para datas comemorativas (Dia das Mães, Natal, etc)",
            "total_temas": 8
        },
        {
            "id": "estudos_biblicos",
            "nome": "Estudos Bíblicos",
            "descricao": "Séries de estudos bíblicos temáticos",
            "total_temas": 15
        }
    ]
    return templates


@router.post("/templates/{template_id}/importar", response_model=TemaImportResult)
def importar_template_predefinido(
    template_id: str,
    sobrescrever_existentes: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin_ou_associacao)
):
    """
    Importa um template pré-definido.
    """
    templates_data = {
        "iasd_basico": [
            {"titulo": "Mordomia Cristã", "descricao": "Administração dos dons e recursos dados por Deus", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 2, "dia_semana": 6}},
            {"titulo": "Lar e Família", "descricao": "A importância da família cristã", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": -1, "dia_semana": 3}},
            {"titulo": "Evangelismo", "descricao": "A missão de compartilhar o evangelho", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 1, "dia_semana": 6}},
            {"titulo": "O Sábado", "descricao": "A importância e santidade do dia de descanso", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 3, "dia_semana": 6}},
            {"titulo": "Saúde e Temperança", "descricao": "Cuidado com o corpo como templo do Espírito Santo", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 4, "dia_semana": 6}},
            {"titulo": "Segunda Vinda de Cristo", "descricao": "A esperança do retorno de Jesus", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 1, "dia_semana": 0}},
            {"titulo": "Oração e Devoção", "descricao": "A importância da vida devocional", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 2, "dia_semana": 3}},
            {"titulo": "Jovens e Educação", "descricao": "O futuro da igreja nas mãos dos jovens", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 3, "dia_semana": 0}},
            {"titulo": "Missões", "descricao": "O chamado missionário global", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 4, "dia_semana": 0}},
            {"titulo": "Louvor e Adoração", "descricao": "A música como forma de adoração", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 1, "dia_semana": 3}},
            {"titulo": "Estudo da Bíblia", "descricao": "A Palavra de Deus como guia", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 2, "dia_semana": 0}},
            {"titulo": "Comunhão e Fraternidade", "descricao": "A importância da vida em comunidade", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 4, "dia_semana": 3}},
        ],
        "datas_especiais": [
            {"titulo": "Dia das Mães", "descricao": "Homenagem às mães cristãs", "tipo_recorrencia": "ANUAL", "config_recorrencia": {"mes": 5, "semana": 2, "dia_semana": 0}},
            {"titulo": "Dia dos Pais", "descricao": "Homenagem aos pais cristãos", "tipo_recorrencia": "ANUAL", "config_recorrencia": {"mes": 8, "semana": 2, "dia_semana": 0}},
            {"titulo": "Natal", "descricao": "Celebração do nascimento de Cristo", "tipo_recorrencia": "PERIODO_ESPECIFICO", "config_recorrencia": {"data_inicio": "2025-12-20", "data_fim": "2025-12-25"}},
            {"titulo": "Semana Santa", "descricao": "Reflexão sobre a paixão e ressurreição de Cristo", "tipo_recorrencia": "PERIODO_ESPECIFICO", "config_recorrencia": {"data_inicio": "2025-04-13", "data_fim": "2025-04-20"}},
            {"titulo": "Ano Novo", "descricao": "Reflexões para o novo ano", "tipo_recorrencia": "PERIODO_ESPECIFICO", "config_recorrencia": {"data_inicio": "2025-12-28", "data_fim": "2026-01-01"}},
            {"titulo": "Dia da Criança", "descricao": "Celebração das crianças na igreja", "tipo_recorrencia": "PERIODO_ESPECIFICO", "config_recorrencia": {"data_inicio": "2025-10-11", "data_fim": "2025-10-12"}},
            {"titulo": "Dia do Professor", "descricao": "Homenagem aos educadores", "tipo_recorrencia": "PERIODO_ESPECIFICO", "config_recorrencia": {"data_inicio": "2025-10-15", "data_fim": "2025-10-15"}},
            {"titulo": "Dia de Ação de Graças", "descricao": "Gratidão pelas bênçãos recebidas", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 4, "dia_semana": 4}},
        ],
        "estudos_biblicos": [
            {"titulo": "Gênesis - A Criação", "descricao": "Estudo sobre os primeiros capítulos de Gênesis", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 1, "dia_semana": 3}},
            {"titulo": "Os Salmos", "descricao": "Estudo dos Salmos de Davi", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 2, "dia_semana": 3}},
            {"titulo": "Provérbios", "descricao": "Sabedoria prática para a vida", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 3, "dia_semana": 3}},
            {"titulo": "Sermão do Monte", "descricao": "Os ensinamentos de Jesus em Mateus 5-7", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 4, "dia_semana": 3}},
            {"titulo": "Parábolas de Jesus", "descricao": "As histórias contadas por Jesus", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 1, "dia_semana": 0}},
            {"titulo": "Milagres de Jesus", "descricao": "Os sinais e maravilhas de Cristo", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 2, "dia_semana": 0}},
            {"titulo": "Romanos", "descricao": "A justiça de Deus pela fé", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 3, "dia_semana": 0}},
            {"titulo": "Apocalipse", "descricao": "As profecias do fim dos tempos", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 4, "dia_semana": 0}},
            {"titulo": "Frutos do Espírito", "descricao": "Gálatas 5 - Vida no Espírito", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 1, "dia_semana": 6}},
            {"titulo": "Armadura de Deus", "descricao": "Efésios 6 - Batalha espiritual", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 2, "dia_semana": 6}},
            {"titulo": "Fé em Hebreus", "descricao": "Hebreus 11 - Heróis da fé", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 3, "dia_semana": 6}},
            {"titulo": "Amor em Coríntios", "descricao": "1 Coríntios 13 - O mais excelente caminho", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 4, "dia_semana": 6}},
            {"titulo": "Daniel - Profecias", "descricao": "As visões proféticas de Daniel", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 1, "dia_semana": 3}},
            {"titulo": "Jonas", "descricao": "A misericórdia de Deus", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 2, "dia_semana": 3}},
            {"titulo": "Rute", "descricao": "Fidelidade e redenção", "tipo_recorrencia": "SEMANAL_MES", "config_recorrencia": {"semana": 3, "dia_semana": 3}},
        ]
    }
    
    if template_id not in templates_data:
        raise NotFoundException(f"Template '{template_id}' não encontrado")
    
    org_id = get_organizacao_id(current_user)
    temas_data = templates_data[template_id]
    
    importados = 0
    ignorados = 0
    erros = []
    
    for item in temas_data:
        try:
            existente = db.query(Tema).filter(
                Tema.organizacao_id == org_id,
                Tema.titulo == item["titulo"]
            ).first()
            
            if existente:
                if sobrescrever_existentes:
                    existente.descricao = item["descricao"]  # type: ignore
                    existente.tipo_recorrencia = TipoRecorrenciaModel(item["tipo_recorrencia"])  # type: ignore
                    existente.config_recorrencia = item["config_recorrencia"]  # type: ignore
                    importados += 1
                else:
                    ignorados += 1
            else:
                tema = Tema(
                    organizacao_id=org_id,
                    titulo=item["titulo"],
                    descricao=item["descricao"],
                    tipo_recorrencia=TipoRecorrenciaModel(item["tipo_recorrencia"]),
                    config_recorrencia=item["config_recorrencia"],
                    status=StatusGeralModel.ATIVO
                )
                db.add(tema)
                importados += 1
                
        except Exception as e:
            erros.append(f"Erro no tema '{item['titulo']}': {str(e)}")
    
    db.commit()
    
    return TemaImportResult(
        total_importados=importados,
        total_ignorados=ignorados,
        erros=erros
    )
