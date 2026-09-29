"""
Endpoints de Bloqueio Temporário
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import date
from typing import Optional

from app.database import get_db
from app.models.usuario import Usuario
from app.models.bloqueio_temporario import BloqueioTemporario
from app.models.enums import TipoUsuario
from app.api.deps import get_current_user, require_pastor
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException
from app.schemas.bloqueio_temporario import (
    BloqueioTemporarioCreate,
    BloqueioTemporarioUpdate,
    BloqueioTemporarioResponse,
    BloqueioTemporarioListResponse
)


router = APIRouter()


def _to_response(bloqueio: BloqueioTemporario, db: Session) -> BloqueioTemporarioResponse:
    """Converte modelo para response."""
    usuario = db.query(Usuario).filter(Usuario.id == bloqueio.usuario_id).first()
    pastor = db.query(Usuario).filter(Usuario.id == bloqueio.pastor_id).first()
    
    return BloqueioTemporarioResponse(
        id=bloqueio.id,
        usuario_id=bloqueio.usuario_id,
        bloqueado_por_id=bloqueio.pastor_id,
        data_inicio=bloqueio.data_inicio,
        data_fim=bloqueio.data_fim,
        motivo=bloqueio.motivo,
        created_at=bloqueio.created_at.isoformat() if bloqueio.created_at else None,
        usuario_nome=usuario.nome_completo if usuario else None,
        bloqueado_por_nome=pastor.nome_completo if pastor else None
    )


@router.get("/", response_model=BloqueioTemporarioListResponse)
def listar_bloqueios(
    incluir_passados: bool = Query(False, description="Incluir bloqueios já encerrados"),
    distrito_id: Optional[int] = Query(None, description="Filtrar por distrito"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Lista os bloqueios temporários criados pelo pastor.
    Por padrão, lista apenas bloqueios ativos e futuros.
    Apenas pastores podem visualizar bloqueios.
    """
    query = db.query(BloqueioTemporario).join(
        Usuario, BloqueioTemporario.usuario_id == Usuario.id
    )
    
    # Filtrar por pastor (exceto admin que vê todos)
    if current_user.tipo not in [TipoUsuario.ADMIN, TipoUsuario.ASSOCIACAO]:
        query = query.filter(BloqueioTemporario.pastor_id == current_user.id)
    
    # Filtrar por distrito
    if distrito_id:
        query = query.filter(Usuario.distrito_id == distrito_id)
    
    # Por padrão, exclui bloqueios passados (mostra ativos e futuros)
    if not incluir_passados:
        hoje = date.today()
        query = query.filter(BloqueioTemporario.data_fim >= hoje)
    
    bloqueios = query.order_by(BloqueioTemporario.data_inicio.asc()).all()
    
    items = [_to_response(b, db) for b in bloqueios]
    
    return BloqueioTemporarioListResponse(total=len(items), bloqueios=items)


@router.get("/usuario/{usuario_id}", response_model=BloqueioTemporarioListResponse)
def listar_bloqueios_usuario(
    usuario_id: int,
    apenas_ativos: bool = Query(True, description="Listar apenas bloqueios ativos"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Lista os bloqueios de um usuário específico.
    """
    # Verificar se usuário existe
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise NotFoundException("Usuário não encontrado")
    
    query = db.query(BloqueioTemporario).filter(
        BloqueioTemporario.usuario_id == usuario_id
    )
    
    # Filtrar por pastor (exceto admin)
    if current_user.tipo not in [TipoUsuario.ADMIN, TipoUsuario.ASSOCIACAO]:
        query = query.filter(BloqueioTemporario.pastor_id == current_user.id)
    
    if apenas_ativos:
        hoje = date.today()
        query = query.filter(
            BloqueioTemporario.data_inicio <= hoje,
            BloqueioTemporario.data_fim >= hoje
        )
    
    bloqueios = query.order_by(BloqueioTemporario.data_fim.desc()).all()
    
    items = [_to_response(b, db) for b in bloqueios]
    
    return BloqueioTemporarioListResponse(total=len(items), bloqueios=items)


@router.post("/", response_model=BloqueioTemporarioResponse, status_code=status.HTTP_201_CREATED)
def criar_bloqueio(
    data: BloqueioTemporarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Cria um bloqueio temporário para um pregador/cantor.
    
    O bloqueio é confidencial - o usuário bloqueado não é notificado.
    Durante o período de bloqueio, o usuário não aparece na lista de disponíveis
    para escalas e não pode ser escalado automaticamente.
    """
    # Validar datas
    if data.data_fim < data.data_inicio:
        raise BadRequestException("A data de fim deve ser maior ou igual à data de início")
    
    # Verificar se usuário existe
    usuario = db.query(Usuario).filter(Usuario.id == data.usuario_id).first()
    if not usuario:
        raise NotFoundException("Usuário não encontrado")
    
    # Verificar se o usuário é pregador ou cantor
    if usuario.tipo not in [TipoUsuario.PREGADOR, TipoUsuario.CANTOR]:
        raise BadRequestException("Apenas pregadores e cantores podem ser bloqueados")
    
    # Verificar se o pastor tem permissão sobre este usuário (mesmo distrito)
    if current_user.tipo not in [TipoUsuario.ADMIN, TipoUsuario.ASSOCIACAO]:
        if usuario.distrito_id != current_user.distrito_id:
            raise ForbiddenException("Você só pode bloquear usuários do seu distrito")
    
    # Verificar se já existe bloqueio ativo conflitante
    conflito = db.query(BloqueioTemporario).filter(
        BloqueioTemporario.usuario_id == data.usuario_id,
        or_(
            and_(
                BloqueioTemporario.data_inicio <= data.data_fim,
                BloqueioTemporario.data_fim >= data.data_inicio
            )
        )
    ).first()
    
    if conflito:
        raise BadRequestException(
            f"Já existe um bloqueio conflitante no período de "
            f"{conflito.data_inicio.strftime('%d/%m/%Y')} a {conflito.data_fim.strftime('%d/%m/%Y')}"
        )
    
    # Criar bloqueio
    bloqueio = BloqueioTemporario(
        usuario_id=data.usuario_id,
        pastor_id=current_user.id,
        data_inicio=data.data_inicio,
        data_fim=data.data_fim,
        motivo=data.motivo
    )
    
    db.add(bloqueio)
    db.commit()
    db.refresh(bloqueio)
    
    # NÃO notificar o usuário bloqueado - é confidencial
    
    return _to_response(bloqueio, db)


@router.put("/{bloqueio_id}", response_model=BloqueioTemporarioResponse)
def atualizar_bloqueio(
    bloqueio_id: int,
    data: BloqueioTemporarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Atualiza um bloqueio temporário existente.
    """
    bloqueio = db.query(BloqueioTemporario).filter(
        BloqueioTemporario.id == bloqueio_id
    ).first()
    
    if not bloqueio:
        raise NotFoundException("Bloqueio não encontrado")
    
    # Verificar se é o pastor que criou o bloqueio
    if current_user.tipo not in [TipoUsuario.ADMIN, TipoUsuario.ASSOCIACAO]:
        if bloqueio.pastor_id != current_user.id:
            raise ForbiddenException("Você só pode editar bloqueios que você criou")
    
    # Atualizar campos
    if data.data_inicio is not None:
        bloqueio.data_inicio = data.data_inicio
    
    if data.data_fim is not None:
        bloqueio.data_fim = data.data_fim
    
    if data.motivo is not None:
        bloqueio.motivo = data.motivo
    
    # Validar datas após atualização
    if bloqueio.data_fim < bloqueio.data_inicio:
        raise BadRequestException("A data de fim deve ser maior ou igual à data de início")
    
    db.commit()
    db.refresh(bloqueio)
    
    return _to_response(bloqueio, db)


@router.delete("/{bloqueio_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_bloqueio(
    bloqueio_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Exclui (encerra) um bloqueio temporário.
    """
    bloqueio = db.query(BloqueioTemporario).filter(
        BloqueioTemporario.id == bloqueio_id
    ).first()
    
    if not bloqueio:
        raise NotFoundException("Bloqueio não encontrado")
    
    # Verificar se é o pastor que criou o bloqueio
    if current_user.tipo not in [TipoUsuario.ADMIN, TipoUsuario.ASSOCIACAO]:
        if bloqueio.pastor_id != current_user.id:
            raise ForbiddenException("Você só pode excluir bloqueios que você criou")
    
    db.delete(bloqueio)
    db.commit()
    
    return None


@router.get("/verificar/{usuario_id}")
def verificar_bloqueio_ativo(
    usuario_id: int,
    data_verificacao: Optional[date] = Query(None, description="Data para verificar (padrão: hoje)"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Verifica se um usuário possui bloqueio ativo em uma determinada data.
    """
    if data_verificacao is None:
        data_verificacao = date.today()
    
    bloqueio = db.query(BloqueioTemporario).filter(
        BloqueioTemporario.usuario_id == usuario_id,
        BloqueioTemporario.data_inicio <= data_verificacao,
        BloqueioTemporario.data_fim >= data_verificacao
    ).first()
    
    if bloqueio:
        return {
            "bloqueado": True,
            "bloqueio_id": bloqueio.id,
            "data_inicio": bloqueio.data_inicio.isoformat(),
            "data_fim": bloqueio.data_fim.isoformat(),
            "motivo": bloqueio.motivo
        }
    
    return {"bloqueado": False}
