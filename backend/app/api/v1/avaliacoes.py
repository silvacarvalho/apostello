"""Router: Avaliações"""
from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_avaliador, get_current_active_user
from app.models import Avaliacao, Usuario, Pregacao
from app.models.configuracao import Configuracao
from app.schemas.avaliacao import (
    AvaliacaoCreate,
    AvaliacaoResponse,
    PregacaoDetectadaResponse,
    PregacoesDisponiveisResponse,
    PregadorInfo,
    IgrejaInfo
)

router = APIRouter()


def validar_periodo_avaliacao(db: Session, pregacao: Pregacao, user: Usuario) -> bool:
    """
    Valida se a avaliação está dentro do período permitido

    Retorna True se válido, levanta HTTPException se inválido
    """
    # Buscar configuração de período (igreja > distrito)
    config = db.query(Configuracao).filter(
        Configuracao.igreja_id == user.igreja_id,
        Configuracao.chave == "periodo_avaliacao"
    ).first()

    if not config:
        config = db.query(Configuracao).filter(
            Configuracao.distrito_id == user.distrito_id,
            Configuracao.chave == "periodo_avaliacao"
        ).first()

    # Valores padrão se não houver configuração
    if config:
        dias_antes = config.valor.get('dias_antes_pregacao', 0)
        dias_depois = config.valor.get('dias_depois_pregacao', 7)
        habilitado = config.valor.get('habilitado', True)
    else:
        dias_antes = 0
        dias_depois = 7
        habilitado = True

    # Se não está habilitado, permitir sempre
    if not habilitado:
        return True

    # Calcular período válido
    data_pregacao = datetime.combine(pregacao.data_pregacao, datetime.min.time())
    data_inicio = data_pregacao - timedelta(days=dias_antes)
    data_fim = data_pregacao + timedelta(days=dias_depois)
    data_atual = datetime.utcnow()

    # Validar se está dentro do período
    if data_atual < data_inicio:
        raise HTTPException(
            status_code=403,
            detail=f"O formulário de avaliação estará disponível a partir de {data_inicio.strftime('%d/%m/%Y')}"
        )

    if data_atual > data_fim:
        raise HTTPException(
            status_code=403,
            detail=f"O período para avaliação encerrou em {data_fim.strftime('%d/%m/%Y')}"
        )

    return True

@router.post("/", response_model=AvaliacaoResponse, status_code=status.HTTP_201_CREATED)
def criar_avaliacao(data: AvaliacaoCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_avaliador)):
    # Buscar a pregação
    pregacao = db.query(Pregacao).filter(Pregacao.id == data.pregacao_id).first()
    if not pregacao:
        raise HTTPException(status_code=404, detail="Pregação não encontrada")

    # VALIDAÇÃO 0: Verificar se está dentro do período de avaliação
    validar_periodo_avaliacao(db, pregacao, current_user)

    # VALIDAÇÃO 1: Verificar se o avaliador pertence à mesma igreja
    if current_user.igreja_id != pregacao.igreja_id:
        raise HTTPException(
            status_code=403,
            detail="Você só pode avaliar pregações da sua própria igreja"
        )

    # VALIDAÇÃO 2: Verificar se o avaliador não é o próprio pregador
    if current_user.id == pregacao.pregador_id:
        raise HTTPException(
            status_code=403,
            detail="Você não pode avaliar sua própria pregação"
        )

    # VALIDAÇÃO 3: Verificar se o avaliador não estava escalado no mesmo horário
    pregacao_avaliador = db.query(Pregacao).filter(
        Pregacao.pregador_id == current_user.id,
        Pregacao.data_pregacao == pregacao.data_pregacao,
        Pregacao.horario_pregacao == pregacao.horario_pregacao
    ).first()

    if pregacao_avaliador:
        raise HTTPException(
            status_code=403,
            detail="Você não pode avaliar esta pregação pois estava escalado para pregar no mesmo horário"
        )

    # Verificar se já avaliou esta pregação
    existing = db.query(Avaliacao).filter(
        Avaliacao.pregacao_id == data.pregacao_id,
        Avaliacao.avaliador_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Você já avaliou esta pregação")

    nova_avaliacao = Avaliacao(**data.dict(), avaliador_id=current_user.id)
    db.add(nova_avaliacao)
    db.commit()
    db.refresh(nova_avaliacao)

    # Recalcular score do pregador
    from app.services.pregador_service import recalcular_score
    recalcular_score(db, data.pregador_id)

    return nova_avaliacao

@router.get("/", response_model=List[AvaliacaoResponse])
def listar_avaliacoes(pregador_id: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    query = db.query(Avaliacao)
    if pregador_id:
        query = query.filter(Avaliacao.pregador_id == pregador_id)
    avaliacoes = query.offset(skip).limit(limit).all()
    return avaliacoes


# ============================================================
# DETECÇÃO AUTOMÁTICA DE PREGAÇÃO
# ============================================================

@router.get("/detectar-pregacao", response_model=PregacaoDetectadaResponse)
def detectar_pregacao_automatica(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Detecta automaticamente qual pregação o usuário deve avaliar

    Lógica de detecção:
    1. Identifica a igreja do usuário
    2. Busca pregações do dia atual na igreja
    3. Se houver múltiplas, escolhe a mais próxima do horário atual
    4. Valida se está dentro do período de avaliação
    5. Valida se o usuário pode avaliar (não é o pregador, não pregou no mesmo horário)

    Retorna a pregação detectada com informações completas
    """
    from app.models.igreja import Igreja
    from app.models.tematica import Tematica
    from datetime import date, time

    hoje = date.today()
    agora = datetime.now().time()

    # Buscar pregações da igreja do usuário no dia de hoje ou recentes
    pregacoes_hoje = db.query(Pregacao).filter(
        Pregacao.igreja_id == current_user.igreja_id,
        Pregacao.data_pregacao == hoje,
        Pregacao.status.in_(['REALIZADO', 'ACEITO'])
    ).order_by(Pregacao.horario_pregacao).all()

    # Se não houver pregações hoje, buscar a mais recente dos últimos 7 dias
    if not pregacoes_hoje:
        from datetime import timedelta
        data_inicio = hoje - timedelta(days=7)

        pregacao_recente = db.query(Pregacao).filter(
            Pregacao.igreja_id == current_user.igreja_id,
            Pregacao.data_pregacao >= data_inicio,
            Pregacao.data_pregacao <= hoje,
            Pregacao.status.in_(['REALIZADO', 'ACEITO'])
        ).order_by(
            Pregacao.data_pregacao.desc(),
            Pregacao.horario_pregacao.desc()
        ).first()

        if pregacao_recente:
            pregacoes_hoje = [pregacao_recente]

    if not pregacoes_hoje:
        raise HTTPException(
            status_code=404,
            detail="Nenhuma pregação encontrada para avaliar. Não há pregações recentes na sua igreja."
        )

    # Se houver múltiplas pregações, escolher a mais próxima do horário atual
    pregacao_selecionada = None
    menor_diferenca = None

    for pregacao in pregacoes_hoje:
        # Calcular diferença de tempo
        hora_pregacao = datetime.combine(hoje, pregacao.horario_pregacao)
        hora_atual = datetime.combine(hoje, agora)
        diferenca = abs((hora_atual - hora_pregacao).total_seconds())

        if menor_diferenca is None or diferenca < menor_diferenca:
            menor_diferenca = diferenca
            pregacao_selecionada = pregacao

    if not pregacao_selecionada:
        pregacao_selecionada = pregacoes_hoje[0]

    # Buscar informações do pregador e igreja
    pregador = db.query(Usuario).filter(Usuario.id == pregacao_selecionada.pregador_id).first()
    igreja = db.query(Igreja).filter(Igreja.id == pregacao_selecionada.igreja_id).first()

    # Buscar temática se houver
    tematica_titulo = None
    if pregacao_selecionada.tematica_id:
        tematica = db.query(Tematica).filter(
            Tematica.id == pregacao_selecionada.tematica_id
        ).first()
        if tematica:
            tematica_titulo = tematica.titulo

    # Validar se o usuário pode avaliar
    pode_avaliar = True
    motivo_nao_pode_avaliar = None

    # Verificar se é o próprio pregador
    if current_user.id == pregacao_selecionada.pregador_id:
        pode_avaliar = False
        motivo_nao_pode_avaliar = "Você não pode avaliar sua própria pregação"

    # Verificar se estava escalado no mesmo horário
    if pode_avaliar:
        pregacao_avaliador = db.query(Pregacao).filter(
            Pregacao.pregador_id == current_user.id,
            Pregacao.data_pregacao == pregacao_selecionada.data_pregacao,
            Pregacao.horario_pregacao == pregacao_selecionada.horario_pregacao
        ).first()

        if pregacao_avaliador:
            pode_avaliar = False
            motivo_nao_pode_avaliar = "Você estava escalado para pregar no mesmo horário"

    # Verificar se já avaliou
    if pode_avaliar:
        ja_avaliou = db.query(Avaliacao).filter(
            Avaliacao.pregacao_id == pregacao_selecionada.id,
            Avaliacao.avaliador_id == current_user.id
        ).first()

        if ja_avaliou:
            pode_avaliar = False
            motivo_nao_pode_avaliar = "Você já avaliou esta pregação"

    # Calcular dias restantes para avaliação
    dias_restantes = None
    if pode_avaliar:
        # Buscar configuração de período
        config = db.query(Configuracao).filter(
            Configuracao.igreja_id == current_user.igreja_id,
            Configuracao.chave == "periodo_avaliacao"
        ).first()

        if not config:
            config = db.query(Configuracao).filter(
                Configuracao.distrito_id == current_user.distrito_id,
                Configuracao.chave == "periodo_avaliacao"
            ).first()

        if config:
            dias_depois = config.valor.get('dias_depois_pregacao', 7)
        else:
            dias_depois = 7

        data_pregacao = datetime.combine(pregacao_selecionada.data_pregacao, datetime.min.time())
        data_fim = data_pregacao + timedelta(days=dias_depois)
        data_atual = datetime.now()

        if data_atual > data_fim:
            pode_avaliar = False
            motivo_nao_pode_avaliar = f"O período para avaliação encerrou em {data_fim.strftime('%d/%m/%Y')}"
            dias_restantes = 0
        else:
            dias_restantes = (data_fim - data_atual).days

    return PregacaoDetectadaResponse(
        pregacao_id=str(pregacao_selecionada.id),
        pregador=PregadorInfo(
            id=str(pregador.id),
            nome_completo=pregador.nome_completo
        ),
        igreja=IgrejaInfo(
            id=str(igreja.id),
            nome=igreja.nome
        ),
        data_pregacao=pregacao_selecionada.data_pregacao,
        horario_pregacao=pregacao_selecionada.horario_pregacao,
        nome_culto=pregacao_selecionada.nome_culto,
        tematica_titulo=tematica_titulo,
        pode_avaliar=pode_avaliar,
        motivo_nao_pode_avaliar=motivo_nao_pode_avaliar,
        dias_restantes_avaliacao=dias_restantes
    )


@router.get("/pregacoes-disponiveis", response_model=PregacoesDisponiveisResponse)
def listar_pregacoes_disponiveis(
    dias: int = 7,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Lista todas as pregações disponíveis para avaliação na igreja do usuário

    Parâmetros:
    - dias: Número de dias para trás a buscar (padrão: 7)

    Retorna lista de pregações que o usuário pode avaliar
    """
    from app.models.igreja import Igreja
    from app.models.tematica import Tematica
    from datetime import date, timedelta

    hoje = date.today()
    data_inicio = hoje - timedelta(days=dias)

    # Buscar pregações da igreja
    pregacoes = db.query(Pregacao).filter(
        Pregacao.igreja_id == current_user.igreja_id,
        Pregacao.data_pregacao >= data_inicio,
        Pregacao.data_pregacao <= hoje,
        Pregacao.status.in_(['REALIZADO', 'ACEITO'])
    ).order_by(
        Pregacao.data_pregacao.desc(),
        Pregacao.horario_pregacao.desc()
    ).all()

    pregacoes_info = []

    for pregacao in pregacoes:
        # Buscar informações
        pregador = db.query(Usuario).filter(Usuario.id == pregacao.pregador_id).first()
        igreja = db.query(Igreja).filter(Igreja.id == pregacao.igreja_id).first()

        tematica_titulo = None
        if pregacao.tematica_id:
            tematica = db.query(Tematica).filter(Tematica.id == pregacao.tematica_id).first()
            if tematica:
                tematica_titulo = tematica.titulo

        # Validar se pode avaliar
        pode_avaliar = True
        motivo = None

        if current_user.id == pregacao.pregador_id:
            pode_avaliar = False
            motivo = "Sua própria pregação"

        # Verificar se já avaliou
        if pode_avaliar:
            ja_avaliou = db.query(Avaliacao).filter(
                Avaliacao.pregacao_id == pregacao.id,
                Avaliacao.avaliador_id == current_user.id
            ).first()

            if ja_avaliou:
                pode_avaliar = False
                motivo = "Já avaliada"

        # Calcular dias restantes
        dias_restantes = None
        if pode_avaliar:
            config = db.query(Configuracao).filter(
                Configuracao.igreja_id == current_user.igreja_id,
                Configuracao.chave == "periodo_avaliacao"
            ).first()

            if not config:
                config = db.query(Configuracao).filter(
                    Configuracao.distrito_id == current_user.distrito_id,
                    Configuracao.chave == "periodo_avaliacao"
                ).first()

            dias_depois = config.valor.get('dias_depois_pregacao', 7) if config else 7

            data_pregacao = datetime.combine(pregacao.data_pregacao, datetime.min.time())
            data_fim = data_pregacao + timedelta(days=dias_depois)
            data_atual = datetime.now()

            if data_atual > data_fim:
                pode_avaliar = False
                motivo = "Período encerrado"
                dias_restantes = 0
            else:
                dias_restantes = (data_fim - data_atual).days

        pregacoes_info.append(PregacaoDetectadaResponse(
            pregacao_id=str(pregacao.id),
            pregador=PregadorInfo(
                id=str(pregador.id),
                nome_completo=pregador.nome_completo
            ),
            igreja=IgrejaInfo(
                id=str(igreja.id),
                nome=igreja.nome
            ),
            data_pregacao=pregacao.data_pregacao,
            horario_pregacao=pregacao.horario_pregacao,
            nome_culto=pregacao.nome_culto,
            tematica_titulo=tematica_titulo,
            pode_avaliar=pode_avaliar,
            motivo_nao_pode_avaliar=motivo,
            dias_restantes_avaliacao=dias_restantes
        ))

    total_disponiveis = sum(1 for p in pregacoes_info if p.pode_avaliar)

    mensagem = f"Encontradas {len(pregacoes_info)} pregações. {total_disponiveis} disponíveis para avaliação."

    return PregacoesDisponiveisResponse(
        total=total_disponiveis,
        pregacoes=pregacoes_info,
        mensagem=mensagem
    )
