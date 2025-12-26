"""
Endpoints de Indisponibilidades
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import date
from typing import List

from app.database import get_db
from app.models.usuario import Usuario
from app.models.indisponibilidade import Indisponibilidade, MotivoIndisponibilidade
from app.models.distrito import Distrito
from app.models.enums import TipoUsuario
from app.api.deps import get_current_user
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException
from app.schemas.indisponibilidade import (
    IndisponibilidadeCreate,
    IndisponibilidadeUpdate,
    IndisponibilidadeResponse,
    IndisponibilidadeListResponse
)
from app.services.notificacao_service import NotificacaoService
from app.models.notificacao import TipoNotificacao


router = APIRouter()


def _to_response(ind: Indisponibilidade) -> IndisponibilidadeResponse:
    """Converte model para response."""
    return IndisponibilidadeResponse(
        id=int(ind.id),
        usuario_id=int(ind.usuario_id),
        data_inicio=ind.data_inicio,
        data_fim=ind.data_fim,
        motivo_tipo=str(ind.motivo_tipo.value) if ind.motivo_tipo else "OUTRO",
        motivo_descricao=str(ind.motivo_descricao) if ind.motivo_descricao else None,
        created_at=ind.created_at.isoformat() if ind.created_at else None,
        usuario_nome=ind.usuario.nome_completo if ind.usuario else None
    )


@router.get("/minhas", response_model=IndisponibilidadeListResponse)
def listar_minhas_indisponibilidades(
    apenas_futuras: bool = Query(True, description="Listar apenas indisponibilidades futuras"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista as indisponibilidades do usuário logado.
    """
    query = db.query(Indisponibilidade).filter(
        Indisponibilidade.usuario_id == current_user.id
    )
    
    if apenas_futuras:
        hoje = date.today()
        query = query.filter(Indisponibilidade.data_fim >= hoje)
    
    indisponibilidades = query.order_by(Indisponibilidade.data_inicio.asc()).all()
    
    items = [_to_response(ind) for ind in indisponibilidades]
    
    return IndisponibilidadeListResponse(total=len(items), indisponibilidades=items)


@router.post("/", response_model=IndisponibilidadeResponse, status_code=status.HTTP_201_CREATED)
def criar_indisponibilidade(
    data: IndisponibilidadeCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Cria uma nova indisponibilidade.
    
    Se a indisponibilidade for para menos de 7 dias, notifica o pastor automaticamente.
    """
    # Validar datas
    if data.data_fim < data.data_inicio:
        raise BadRequestException("A data de fim deve ser maior ou igual à data de início")
    
    if data.data_inicio < date.today():
        raise BadRequestException("Não é possível criar indisponibilidade para datas passadas")
    
    # Verificar se já existe indisponibilidade conflitante
    conflito = db.query(Indisponibilidade).filter(
        Indisponibilidade.usuario_id == current_user.id,
        or_(
            and_(
                Indisponibilidade.data_inicio <= data.data_fim,
                Indisponibilidade.data_fim >= data.data_inicio
            )
        )
    ).first()
    
    if conflito:
        data_inicio_str = conflito.data_inicio.strftime('%d/%m/%Y')
        data_fim_str = conflito.data_fim.strftime('%d/%m/%Y')
        raise BadRequestException(
            f"Já existe uma indisponibilidade conflitante no período de {data_inicio_str} a {data_fim_str}"
        )
    
    # Criar indisponibilidade
    indisponibilidade = Indisponibilidade(
        usuario_id=int(current_user.id),
        data_inicio=data.data_inicio,
        data_fim=data.data_fim,
        motivo_tipo=MotivoIndisponibilidade(data.motivo.value),
        motivo_descricao=data.descricao
    )
    
    db.add(indisponibilidade)
    db.commit()
    db.refresh(indisponibilidade)
    
    # Verificar se é uma indisponibilidade próxima (menos de 7 dias) - notificar pastor
    dias_ate_inicio = (data.data_inicio - date.today()).days
    if dias_ate_inicio < 7 and current_user.distrito_id:
        # Buscar pastor do distrito do usuário
        distrito = db.query(Distrito).filter(Distrito.id == current_user.distrito_id).first()
        if distrito and distrito.pastor_id:
            pastor = db.query(Usuario).filter(Usuario.id == distrito.pastor_id).first()
            if pastor:
                notificacao_service = NotificacaoService(db)
                motivo_texto = data.motivo.value.replace("_", " ").title()
                inicio_str = data.data_inicio.strftime('%d/%m/%Y')
                fim_str = data.data_fim.strftime('%d/%m/%Y')
                notificacao_service.create(
                    usuario_id=int(pastor.id),
                    tipo=TipoNotificacao.SISTEMA,
                    titulo="Indisponibilidade de Última Hora",
                    mensagem=f"{current_user.nome_completo} marcou indisponibilidade para {inicio_str} a {fim_str} (em {dias_ate_inicio} dias). Motivo: {motivo_texto}.",
                    link="/usuarios"
                )
    
    return _to_response(indisponibilidade)


@router.put("/{indisponibilidade_id}", response_model=IndisponibilidadeResponse)
def atualizar_indisponibilidade(
    indisponibilidade_id: int,
    data: IndisponibilidadeUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Atualiza uma indisponibilidade existente.
    """
    indisponibilidade = db.query(Indisponibilidade).filter(
        Indisponibilidade.id == indisponibilidade_id
    ).first()
    
    if not indisponibilidade:
        raise NotFoundException("Indisponibilidade não encontrada")
    
    # Verificar se pertence ao usuário
    if int(indisponibilidade.usuario_id) != int(current_user.id):
        raise ForbiddenException("Você não pode editar indisponibilidades de outros usuários")
    
    # Atualizar campos
    if data.data_inicio is not None:
        if data.data_inicio < date.today():
            raise BadRequestException("Não é possível definir data de início no passado")
        indisponibilidade.data_inicio = data.data_inicio
    
    if data.data_fim is not None:
        indisponibilidade.data_fim = data.data_fim
    
    if data.motivo is not None:
        indisponibilidade.motivo_tipo = MotivoIndisponibilidade(data.motivo.value)
    
    if data.descricao is not None:
        indisponibilidade.motivo_descricao = data.descricao
    
    # Validar datas após atualização
    if indisponibilidade.data_fim < indisponibilidade.data_inicio:
        raise BadRequestException("A data de fim deve ser maior ou igual à data de início")
    
    db.commit()
    db.refresh(indisponibilidade)
    
    return _to_response(indisponibilidade)


@router.delete("/{indisponibilidade_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_indisponibilidade(
    indisponibilidade_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Exclui uma indisponibilidade.
    """
    indisponibilidade = db.query(Indisponibilidade).filter(
        Indisponibilidade.id == indisponibilidade_id
    ).first()
    
    if not indisponibilidade:
        raise NotFoundException("Indisponibilidade não encontrada")
    
    # Verificar se pertence ao usuário ou se é pastor
    is_pastor = current_user.tipo in [TipoUsuario.ADMIN, TipoUsuario.PASTOR_DISTRITAL]
    if int(indisponibilidade.usuario_id) != int(current_user.id) and not is_pastor:
        raise ForbiddenException("Você não pode excluir indisponibilidades de outros usuários")
    
    db.delete(indisponibilidade)
    db.commit()
    
    return None


@router.get("/usuario/{usuario_id}", response_model=IndisponibilidadeListResponse)
def listar_indisponibilidades_usuario(
    usuario_id: int,
    apenas_futuras: bool = Query(True, description="Listar apenas indisponibilidades futuras"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista as indisponibilidades de um usuário específico (apenas para pastores).
    """
    # Verificar permissão
    if current_user.tipo not in [TipoUsuario.ADMIN, TipoUsuario.ASSOCIACAO, TipoUsuario.PASTOR_DISTRITAL, TipoUsuario.LIDER_DISTRITAL]:
        raise ForbiddenException("Apenas pastores podem visualizar indisponibilidades de outros usuários")
    
    # Verificar se usuário existe
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise NotFoundException("Usuário não encontrado")
    
    query = db.query(Indisponibilidade).filter(
        Indisponibilidade.usuario_id == usuario_id
    )
    
    if apenas_futuras:
        hoje = date.today()
        query = query.filter(Indisponibilidade.data_fim >= hoje)
    
    indisponibilidades = query.order_by(Indisponibilidade.data_inicio.asc()).all()
    
    items = [_to_response(ind) for ind in indisponibilidades]
    
    return IndisponibilidadeListResponse(total=len(items), indisponibilidades=items)
