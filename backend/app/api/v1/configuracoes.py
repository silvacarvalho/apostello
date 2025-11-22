"""
Rotas para gerenciamento de configurações do sistema
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import (
    get_current_active_user,
    require_pastor_distrital,
    require_membro_associacao
)
from app.models.usuario import Usuario
from app.models.configuracao import Configuracao
from app.schemas.configuracao import (
    ConfiguracaoResponse,
    ConfiguracaoCreate,
    ConfiguracaoUpdate,
    PeriodoAvaliacaoCreate,
    PeriodoAvaliacaoResponse,
    PeriodoAvaliacaoValor,
    QRCodeConfigCreate,
    QRCodeConfigResponse,
    ModoQRCode,
    EscopoConfiguracao
)

router = APIRouter()


# ============================================================
# CONFIGURAÇÕES GERAIS
# ============================================================

@router.get("/", response_model=List[ConfiguracaoResponse])
def listar_configuracoes(
    escopo: Optional[str] = Query(None, description="Filtrar por escopo: associacao, distrito, igreja"),
    chave: Optional[str] = Query(None, description="Filtrar por chave específica"),
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Lista configurações do sistema"""
    query = db.query(Configuracao)

    # Filtrar baseado no perfil do usuário
    if 'membro_associacao' in [p.value for p in current_user.perfis]:
        # Membro da associação vê todas
        if escopo == 'associacao':
            query = query.filter(Configuracao.associacao_id == current_user.associacao_id)
        elif escopo == 'distrito':
            query = query.filter(Configuracao.distrito_id == current_user.distrito_id)
        elif escopo == 'igreja':
            query = query.filter(Configuracao.igreja_id == current_user.igreja_id)
    elif 'pastor_distrital' in [p.value for p in current_user.perfis]:
        # Pastor distrital vê do distrito e igrejas
        query = query.filter(
            (Configuracao.distrito_id == current_user.distrito_id) |
            (Configuracao.igreja_id.in_(
                db.query(Igreja.id).filter(Igreja.distrito_id == current_user.distrito_id)
            ))
        )
    else:
        # Outros vêm apenas da própria igreja
        query = query.filter(Configuracao.igreja_id == current_user.igreja_id)

    if chave:
        query = query.filter(Configuracao.chave == chave)

    configs = query.all()
    return [ConfiguracaoResponse.from_orm(c) for c in configs]


@router.get("/{configuracao_id}", response_model=ConfiguracaoResponse)
def obter_configuracao(
    configuracao_id: str,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obtém uma configuração específica"""
    config = db.query(Configuracao).filter(
        Configuracao.id == uuid.UUID(configuracao_id)
    ).first()

    if not config:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")

    return ConfiguracaoResponse.from_orm(config)


# ============================================================
# CONFIGURAÇÃO DE PERÍODO DE AVALIAÇÃO
# ============================================================

@router.post("/periodo-avaliacao/distrito", response_model=PeriodoAvaliacaoResponse)
def criar_periodo_avaliacao_distrito(
    data: PeriodoAvaliacaoCreate,
    current_user: Usuario = Depends(require_pastor_distrital),
    db: Session = Depends(get_db)
):
    """
    Cria ou atualiza configuração de período de avaliação para o distrito

    Apenas Pastor Distrital pode configurar
    """
    # Verificar se já existe
    config_existente = db.query(Configuracao).filter(
        Configuracao.distrito_id == current_user.distrito_id,
        Configuracao.chave == "periodo_avaliacao"
    ).first()

    valor = PeriodoAvaliacaoValor(**data.dict()).dict()

    if config_existente:
        # Atualizar
        config_existente.valor = valor
        db.commit()
        db.refresh(config_existente)
        config = config_existente
    else:
        # Criar nova
        config = Configuracao(
            id=uuid.uuid4(),
            distrito_id=current_user.distrito_id,
            chave="periodo_avaliacao",
            valor=valor,
            descricao="Período em que o formulário de avaliação fica disponível"
        )
        db.add(config)
        db.commit()
        db.refresh(config)

    return PeriodoAvaliacaoResponse(
        id=str(config.id),
        escopo=EscopoConfiguracao.DISTRITO,
        escopo_id=str(config.distrito_id),
        dias_antes_pregacao=config.valor['dias_antes_pregacao'],
        dias_depois_pregacao=config.valor['dias_depois_pregacao'],
        habilitado=config.valor['habilitado'],
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.post("/periodo-avaliacao/igreja/{igreja_id}", response_model=PeriodoAvaliacaoResponse)
def criar_periodo_avaliacao_igreja(
    igreja_id: str,
    data: PeriodoAvaliacaoCreate,
    current_user: Usuario = Depends(require_pastor_distrital),
    db: Session = Depends(get_db)
):
    """
    Cria ou atualiza configuração de período de avaliação para uma igreja específica

    Apenas Pastor Distrital pode configurar
    """
    # Verificar se igreja existe e pertence ao distrito do pastor
    from app.models.igreja import Igreja
    igreja = db.query(Igreja).filter(Igreja.id == uuid.UUID(igreja_id)).first()

    if not igreja:
        raise HTTPException(status_code=404, detail="Igreja não encontrada")

    if igreja.distrito_id != current_user.distrito_id:
        raise HTTPException(
            status_code=403,
            detail="Você só pode configurar igrejas do seu distrito"
        )

    # Verificar se já existe
    config_existente = db.query(Configuracao).filter(
        Configuracao.igreja_id == igreja.id,
        Configuracao.chave == "periodo_avaliacao"
    ).first()

    valor = PeriodoAvaliacaoValor(**data.dict()).dict()

    if config_existente:
        config_existente.valor = valor
        db.commit()
        db.refresh(config_existente)
        config = config_existente
    else:
        config = Configuracao(
            id=uuid.uuid4(),
            igreja_id=igreja.id,
            chave="periodo_avaliacao",
            valor=valor,
            descricao=f"Período de avaliação específico para {igreja.nome}"
        )
        db.add(config)
        db.commit()
        db.refresh(config)

    return PeriodoAvaliacaoResponse(
        id=str(config.id),
        escopo=EscopoConfiguracao.IGREJA,
        escopo_id=str(config.igreja_id),
        dias_antes_pregacao=config.valor['dias_antes_pregacao'],
        dias_depois_pregacao=config.valor['dias_depois_pregacao'],
        habilitado=config.valor['habilitado'],
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.get("/periodo-avaliacao/atual", response_model=PeriodoAvaliacaoResponse)
def obter_periodo_avaliacao_atual(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Obtém a configuração de período de avaliação aplicável ao usuário atual

    Prioridade: Igreja > Distrito > Padrão (7 dias)
    """
    # Tentar buscar configuração da igreja
    config = db.query(Configuracao).filter(
        Configuracao.igreja_id == current_user.igreja_id,
        Configuracao.chave == "periodo_avaliacao"
    ).first()

    if not config:
        # Tentar buscar configuração do distrito
        config = db.query(Configuracao).filter(
            Configuracao.distrito_id == current_user.distrito_id,
            Configuracao.chave == "periodo_avaliacao"
        ).first()

    if config:
        escopo = EscopoConfiguracao.IGREJA if config.igreja_id else EscopoConfiguracao.DISTRITO
        escopo_id = str(config.igreja_id or config.distrito_id)

        return PeriodoAvaliacaoResponse(
            id=str(config.id),
            escopo=escopo,
            escopo_id=escopo_id,
            dias_antes_pregacao=config.valor['dias_antes_pregacao'],
            dias_depois_pregacao=config.valor['dias_depois_pregacao'],
            habilitado=config.valor['habilitado'],
            created_at=config.created_at,
            updated_at=config.updated_at
        )

    # Retornar configuração padrão
    from datetime import datetime
    return PeriodoAvaliacaoResponse(
        id="default",
        escopo=EscopoConfiguracao.DISTRITO,
        escopo_id=str(current_user.distrito_id),
        dias_antes_pregacao=0,
        dias_depois_pregacao=7,
        habilitado=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )


# ============================================================
# CONFIGURAÇÃO DE QR CODE
# ============================================================

@router.post("/qrcode/distrito", response_model=QRCodeConfigResponse)
def criar_qrcode_config_distrito(
    data: QRCodeConfigCreate,
    current_user: Usuario = Depends(require_pastor_distrital),
    db: Session = Depends(get_db)
):
    """
    Configurar modo de QR Code para o distrito

    Apenas Pastor Distrital pode configurar
    """
    config_existente = db.query(Configuracao).filter(
        Configuracao.distrito_id == current_user.distrito_id,
        Configuracao.chave == "modo_qr_code"
    ).first()

    valor = {
        "modo": data.modo.value,
        "incluir_logo": data.incluir_logo,
        "tamanho": data.tamanho
    }

    if config_existente:
        config_existente.valor = valor
        db.commit()
        db.refresh(config_existente)
        config = config_existente
    else:
        config = Configuracao(
            id=uuid.uuid4(),
            distrito_id=current_user.distrito_id,
            chave="modo_qr_code",
            valor=valor,
            descricao="Configuração de geração de QR Code"
        )
        db.add(config)
        db.commit()
        db.refresh(config)

    return QRCodeConfigResponse(
        id=str(config.id),
        escopo=EscopoConfiguracao.DISTRITO,
        escopo_id=str(config.distrito_id),
        modo=ModoQRCode(config.valor['modo']),
        incluir_logo=config.valor['incluir_logo'],
        tamanho=config.valor['tamanho'],
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.get("/qrcode/atual", response_model=QRCodeConfigResponse)
def obter_qrcode_config_atual(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Obtém configuração de QR Code aplicável ao usuário

    Prioridade: Igreja > Distrito > Padrão (único por culto)
    """
    # Tentar buscar configuração do distrito
    config = db.query(Configuracao).filter(
        Configuracao.distrito_id == current_user.distrito_id,
        Configuracao.chave == "modo_qr_code"
    ).first()

    if config:
        return QRCodeConfigResponse(
            id=str(config.id),
            escopo=EscopoConfiguracao.DISTRITO,
            escopo_id=str(config.distrito_id),
            modo=ModoQRCode(config.valor['modo']),
            incluir_logo=config.valor['incluir_logo'],
            tamanho=config.valor['tamanho'],
            created_at=config.created_at,
            updated_at=config.updated_at
        )

    # Retornar configuração padrão
    from datetime import datetime
    return QRCodeConfigResponse(
        id="default",
        escopo=EscopoConfiguracao.DISTRITO,
        escopo_id=str(current_user.distrito_id),
        modo=ModoQRCode.UNICO_POR_CULTO,
        incluir_logo=True,
        tamanho=300,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
