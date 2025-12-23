"""
Endpoints de Usuários
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.services.usuario_service import UsuarioService
from app.schemas.usuario import (
    UsuarioCreate, UsuarioUpdate, UsuarioResponse, UsuarioListResponse,
    UsuarioLimitedResponse, UsuarioLimitedListResponse
)
from app.models.usuario import Usuario, TipoUsuario
from app.api.deps import (
    get_current_user, require_admin, require_pastor, 
    get_user_distrito_id, can_edit_user, verify_distrito_access
)
from app.core.exceptions import ForbiddenException


router = APIRouter()


@router.post("/", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def criar_usuario(
    data: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Cria novo usuário (requer permissão de pastor/admin).
    """
    service = UsuarioService(db)
    return service.create(data)


@router.post("/auto-cadastro", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def auto_cadastro(
    data: UsuarioCreate,
    db: Session = Depends(get_db)
):
    """
    Auto cadastro de pregadores/cantores (pendente de aprovação).
    """
    service = UsuarioService(db)
    return service.create(data, auto_cadastro=True)


@router.get("/", response_model=UsuarioListResponse | UsuarioLimitedListResponse)
def listar_usuarios(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    tipo: Optional[TipoUsuario] = None,
    distrito_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista usuários com filtros.
    
    - ADMIN: Vê todos os usuários com dados completos
    - PASTOR/LIDER: Vê usuários do seu distrito com dados completos
    - PREGADOR/CANTOR: Vê usuários do distrito com dados limitados (nome, foto, score)
    - MEMBRO: Vê usuários do distrito com dados limitados
    """
    service = UsuarioService(db)
    
    # Determinar se deve retornar dados limitados
    return_limited = current_user.tipo in [
        TipoUsuario.PREGADOR, 
        TipoUsuario.CANTOR, 
        TipoUsuario.MEMBRO
    ]
    
    # Forçar filtro por distrito do usuário se não for admin
    if current_user.tipo != TipoUsuario.ADMIN:
        user_distrito_id = get_user_distrito_id(current_user)
        if not user_distrito_id:
            raise ForbiddenException("Usuário sem distrito associado")
        distrito_id = user_distrito_id
    
    # Buscar usuários
    usuarios, total = service.list_all(skip, limit, tipo, distrito_id, search)
    
    # Retornar com dados limitados ou completos
    if return_limited:
        limited_items = [
            UsuarioLimitedResponse(
                id=u.id,
                nome_completo=u.nome_completo,
                foto_url=u.foto_url,
                tipo=u.tipo,
                score_atual=u.score_atual
            )
            for u in usuarios
        ]
        return UsuarioLimitedListResponse(
            items=limited_items,
            total=total,
            page=skip // limit + 1,
            size=limit,
            pages=(total + limit - 1) // limit
        )
    
    return UsuarioListResponse(
        items=usuarios,
        total=total,
        page=skip // limit + 1,
        size=limit,
        pages=(total + limit - 1) // limit
    )


@router.get("/pregadores")
def listar_pregadores(
    distrito_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista pregadores ativos de um distrito.
    """
    service = UsuarioService(db)
    return service.list_pregadores(distrito_id)


@router.get("/cantores")
def listar_cantores(
    distrito_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista cantores ativos de um distrito.
    """
    service = UsuarioService(db)
    return service.list_cantores(distrito_id)


@router.get("/pendentes")
def listar_pendentes(
    distrito_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Lista usuários pendentes de aprovação.
    """
    service = UsuarioService(db)
    
    # Pastor só vê do seu distrito
    if current_user.is_pastor and not current_user.is_admin:
        distrito_id = current_user.distrito_id
    
    return service.list_pendentes_aprovacao(distrito_id)


@router.get("/disponiveis-para-troca")
def listar_disponiveis_para_troca(
    data_culto: date,
    tipo: TipoUsuario = Query(..., description="PREGADOR ou CANTOR"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista pregadores ou cantores disponíveis para troca em uma data específica.
    
    Filtra automaticamente por:
    - Usuários do mesmo distrito
    - Indisponibilidades cadastradas
    - Bloqueios temporários
    - Status ativo
    
    Apenas PREGADOR ou CANTOR podem usar este endpoint.
    """
    from app.models.indisponibilidade import Indisponibilidade
    from app.models.bloqueio_temporario import BloqueioTemporario
    from app.models.enums import StatusGeral
    from sqlalchemy import and_, or_
    
    # Apenas pregadores/cantores podem solicitar troca
    if current_user.tipo not in [TipoUsuario.PREGADOR, TipoUsuario.CANTOR]:
        raise ForbiddenException("Apenas pregadores e cantores podem solicitar trocas")
    
    # Validar tipo solicitado
    if tipo not in [TipoUsuario.PREGADOR, TipoUsuario.CANTOR]:
        raise ForbiddenException("Tipo deve ser PREGADOR ou CANTOR")
    
    user_distrito_id = get_user_distrito_id(current_user)
    if not user_distrito_id:
        raise ForbiddenException("Usuário sem distrito associado")
    
    # Buscar usuários do mesmo tipo e distrito
    query = db.query(Usuario).filter(
        Usuario.tipo == tipo,
        Usuario.distrito_id == user_distrito_id,
        Usuario.status == StatusGeral.ATIVO,
        Usuario.id != current_user.id,  # Excluir o próprio usuário
        Usuario.email != "master@iasd.com"
    )
    
    # Excluir usuários com indisponibilidade na data
    subquery_indisponibilidade = db.query(Indisponibilidade.usuario_id).filter(
        and_(
            Indisponibilidade.data_inicio <= data_culto,
            Indisponibilidade.data_fim >= data_culto
        )
    )
    query = query.filter(~Usuario.id.in_(subquery_indisponibilidade))
    
    # Excluir usuários com bloqueio temporário na data
    subquery_bloqueio = db.query(BloqueioTemporario.usuario_id).filter(
        and_(
            BloqueioTemporario.data_inicio <= data_culto,
            BloqueioTemporario.data_fim >= data_culto
        )
    )
    query = query.filter(~Usuario.id.in_(subquery_bloqueio))
    
    # Excluir usuários já escalados na mesma data
    from app.models.item_escala import ItemEscala
    
    if tipo == TipoUsuario.PREGADOR:
        # Excluir pregadores já escalados como pregador na data
        subquery_escalados = db.query(ItemEscala.pregador_id).filter(
            ItemEscala.data_culto == data_culto,
            ItemEscala.pregador_id.isnot(None)
        )
        query = query.filter(~Usuario.id.in_(subquery_escalados))
    else:  # CANTOR
        # Excluir cantores já escalados como cantor na data
        subquery_escalados = db.query(ItemEscala.cantor_id).filter(
            ItemEscala.data_culto == data_culto,
            ItemEscala.cantor_id.isnot(None)
        )
        query = query.filter(~Usuario.id.in_(subquery_escalados))
    
    usuarios_disponiveis = query.all()
    
    # Retornar com dados limitados
    return [
        UsuarioLimitedResponse(
            id=u.id,
            nome_completo=u.nome_completo,
            foto_url=u.foto_url,
            tipo=u.tipo,
            score_atual=u.score_atual
        )
        for u in usuarios_disponiveis
    ]


@router.get("/{usuario_id}", response_model=UsuarioResponse)
def obter_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtém usuário por ID.
    """
    service = UsuarioService(db)
    return service.get_by_id(usuario_id)


@router.put("/{usuario_id}", response_model=UsuarioResponse)
def atualizar_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Atualiza usuário.
    
    - ADMIN: pode atualizar qualquer usuário
    - PASTOR/LIDER: pode atualizar usuários do seu distrito
    - PREGADOR/CANTOR/MEMBRO: pode atualizar apenas a si mesmo
    """
    service = UsuarioService(db)
    
    # Buscar usuário alvo
    target_user = service.get_by_id(usuario_id)
    
    # Verificar permissão de edição
    if not can_edit_user(current_user, target_user):
        raise ForbiddenException("Sem permissão para editar este usuário")
    
    return service.update(usuario_id, data, current_user)


@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Remove usuário (apenas admin).
    """
    service = UsuarioService(db)
    service.delete(usuario_id, current_user)


@router.post("/{usuario_id}/ativar", response_model=UsuarioResponse)
def ativar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Ativa usuário.
    """
    service = UsuarioService(db)
    return service.activate(usuario_id, current_user)


@router.post("/{usuario_id}/desativar", response_model=UsuarioResponse)
def desativar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Desativa usuário.
    """
    service = UsuarioService(db)
    return service.deactivate(usuario_id, current_user)


@router.post("/{usuario_id}/aprovar", response_model=UsuarioResponse)
def aprovar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Aprova cadastro de usuário.
    """
    service = UsuarioService(db)
    return service.approve(usuario_id, current_user, aprovar=True)


@router.post("/{usuario_id}/recusar", response_model=UsuarioResponse)
def recusar_usuario(
    usuario_id: int,
    motivo: str = Query(..., min_length=10),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Recusa cadastro de usuário.
    """
    service = UsuarioService(db)
    return service.approve(usuario_id, current_user, aprovar=False, motivo=motivo)
