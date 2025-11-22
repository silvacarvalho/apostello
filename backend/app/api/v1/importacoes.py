"""
Rotas para importação em massa de dados
"""
import os
import shutil
import uuid
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import pandas as pd

from app.core.database import get_db
from app.core.deps import (
    get_current_active_user,
    require_membro_associacao,
    require_pastor_distrital
)
from app.core.config import settings
from app.models.usuario import Usuario
from app.models.log_importacao import LogImportacao
from app.schemas.importacao import (
    ImportacaoResponse,
    TipoImportacao,
    ImportacaoValidacao,
    TemplateImportacao
)
from app.services.importacao_service import (
    ImportacaoService,
    gerar_template_membros,
    gerar_template_tematicas
)

router = APIRouter()


@router.post("/upload", response_model=ImportacaoResponse)
async def upload_arquivo_importacao(
    tipo_importacao: TipoImportacao,
    validar_apenas: bool = Query(
        default=False,
        description="Se True, apenas valida sem importar"
    ),
    arquivo: UploadFile = File(...),
    current_user: Usuario = Depends(require_membro_associacao),
    db: Session = Depends(get_db)
):
    """
    Upload de arquivo para importação em massa

    Formatos aceitos: .xlsx, .xls, .csv

    Tipos de importação:
    - MEMBROS: Importar membros/avaliadores
    - TEMATICAS: Importar temáticas de culto
    """
    # Validar extensão do arquivo
    extensao = os.path.splitext(arquivo.filename)[1].lower()
    if extensao not in ['.xlsx', '.xls', '.csv']:
        raise HTTPException(
            status_code=400,
            detail=f"Formato de arquivo não suportado. Use .xlsx, .xls ou .csv"
        )

    # Validar tamanho do arquivo
    if arquivo.size and arquivo.size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande. Tamanho máximo: {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )

    # Criar diretório de upload se não existir
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Salvar arquivo temporariamente
    arquivo_id = str(uuid.uuid4())
    arquivo_path = os.path.join(
        settings.UPLOAD_DIR,
        f"{arquivo_id}{extensao}"
    )

    try:
        with open(arquivo_path, "wb") as buffer:
            shutil.copyfileobj(arquivo.file, buffer)

        # Processar importação
        service = ImportacaoService(db, str(current_user.id))
        log = service.processar_importacao(
            arquivo_path=arquivo_path,
            tipo_importacao=tipo_importacao,
            validar_apenas=validar_apenas,
            associacao_id=str(current_user.associacao_id)
        )

        return ImportacaoResponse.from_orm(log)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar arquivo: {str(e)}"
        )
    finally:
        # Limpar arquivo temporário após processamento
        if os.path.exists(arquivo_path):
            try:
                os.remove(arquivo_path)
            except:
                pass


@router.get("/", response_model=List[ImportacaoResponse])
def listar_importacoes(
    tipo_importacao: TipoImportacao = None,
    skip: int = 0,
    limit: int = 20,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Lista importações realizadas"""
    query = db.query(LogImportacao)

    # Filtrar por tipo se especificado
    if tipo_importacao:
        query = query.filter(LogImportacao.tipo_importacao == tipo_importacao.value)

    # Apenas membros da associação veem todas; outros veem só as suas
    if 'membro_associacao' not in [p.value for p in current_user.perfis]:
        query = query.filter(LogImportacao.usuario_id == current_user.id)

    logs = query.order_by(LogImportacao.iniciado_em.desc()).offset(skip).limit(limit).all()

    return [ImportacaoResponse.from_orm(log) for log in logs]


@router.get("/{importacao_id}", response_model=ImportacaoResponse)
def obter_importacao(
    importacao_id: str,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obtém detalhes de uma importação específica"""
    log = db.query(LogImportacao).filter(
        LogImportacao.id == uuid.UUID(importacao_id)
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="Importação não encontrada")

    # Verificar permissão
    if (log.usuario_id != current_user.id and
            'membro_associacao' not in [p.value for p in current_user.perfis]):
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para ver esta importação"
        )

    return ImportacaoResponse.from_orm(log)


@router.get("/templates/{tipo}", response_class=StreamingResponse)
def download_template(
    tipo: TipoImportacao,
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Download de template Excel para importação

    Templates disponíveis:
    - MEMBROS: Template para importação de membros
    - TEMATICAS: Template para importação de temáticas
    """
    # Gerar template baseado no tipo
    if tipo == TipoImportacao.MEMBROS:
        df = gerar_template_membros()
        filename = "template_importacao_membros.xlsx"
    elif tipo == TipoImportacao.TEMATICAS:
        df = gerar_template_tematicas()
        filename = "template_importacao_tematicas.xlsx"
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Template não disponível para tipo: {tipo}"
        )

    # Criar arquivo Excel em memória
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Dados')

        # Adicionar sheet de instruções
        instrucoes = {
            'Coluna': list(df.columns),
            'Obrigatório': ['Sim' if col in ['nome_completo', 'email', 'igreja_id', 'titulo', 'tipo_recorrencia']
                           else 'Não' for col in df.columns],
            'Descrição': [
                'Nome completo do membro',
                'Email único do membro',
                'Telefone com DDD',
                'UUID da igreja',
                'Perfis separados por vírgula (avaliador, pregador)',
                'CPF do membro',
                'Data de nascimento (AAAA-MM-DD)',
                'Cargo na igreja'
            ][:len(df.columns)]
        }
        import pandas as pd
        pd.DataFrame(instrucoes).to_excel(writer, index=False, sheet_name='Instruções')

    output.seek(0)

    return StreamingResponse(
        output,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
    )


@router.get("/templates/{tipo}/info", response_model=TemplateImportacao)
def info_template(
    tipo: TipoImportacao,
    current_user: Usuario = Depends(get_current_active_user)
):
    """Retorna informações sobre o template de importação"""

    if tipo == TipoImportacao.MEMBROS:
        return TemplateImportacao(
            tipo=tipo,
            colunas_obrigatorias=['nome_completo', 'email', 'igreja_id'],
            colunas_opcionais=['telefone', 'perfis', 'cpf', 'data_nascimento', 'cargo'],
            exemplo={
                'nome_completo': 'João da Silva',
                'email': 'joao@exemplo.com',
                'telefone': '11999999999',
                'igreja_id': 'uuid-da-igreja',
                'perfis': 'avaliador',
                'cpf': '123.456.789-00',
                'data_nascimento': '1990-01-15',
                'cargo': 'Ancião'
            },
            url_download=f"/api/v1/importacoes/templates/{tipo.value}"
        )

    elif tipo == TipoImportacao.TEMATICAS:
        return TemplateImportacao(
            tipo=tipo,
            colunas_obrigatorias=['titulo', 'tipo_recorrencia'],
            colunas_opcionais=[
                'descricao', 'referencia_biblica', 'data_especifica',
                'dia_semana_semanal', 'numero_semana_mes', 'dia_semana_mensal',
                'valido_de', 'valido_ate'
            ],
            exemplo={
                'titulo': 'Santificação do Sábado',
                'descricao': 'Importância da observância do sábado',
                'referencia_biblica': 'Êxodo 20:8-11',
                'tipo_recorrencia': 'SEMANAL',
                'dia_semana_semanal': 'SABADO',
                'valido_de': '2025-01-01',
                'valido_ate': '2025-12-31'
            },
            url_download=f"/api/v1/importacoes/templates/{tipo.value}"
        )

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Template não disponível para tipo: {tipo}"
        )
