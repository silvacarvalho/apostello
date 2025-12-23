"""
Endpoints de Escalas
"""
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.services.escala_service import EscalaService
from app.schemas.escala import (
    EscalaCreate, EscalaResponse, EscalaGenerateRequest, EscalaPublish,
    EscalaListResponse
)
from app.schemas.item_escala import (
    ItemEscalaCreate, ItemEscalaUpdate, ItemEscalaResponse, ItemEscalaConfirmacao,
    ItemEscalaDetailResponse
)
from app.models.usuario import Usuario, TipoUsuario
from app.models.escala import Escala
from app.models.item_escala import ItemEscala
from app.api.deps import get_current_user, require_pastor, verify_distrito_access, get_user_distrito_id
from app.core.exceptions import ForbiddenException


router = APIRouter()


@router.post("/", response_model=EscalaResponse, status_code=status.HTTP_201_CREATED)
def criar_escala(
    data: EscalaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Cria nova escala vazia.
    Pastor/Líder só pode criar escalas do seu distrito.
    """
    # Verificar acesso ao distrito
    verify_distrito_access(current_user, data.distrito_id)
    
    service = EscalaService(db)
    return service.create(data, current_user)


@router.get("/validar-distrito/{distrito_id}")
def validar_distrito_para_geracao(
    distrito_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Valida se o distrito tem igrejas com horários de culto cadastrados.
    Retorna lista de igrejas sem horários para confirmação do usuário.
    """
    from app.models.igreja import Igreja
    from app.models.horario_culto import HorarioCulto
    from sqlalchemy import func
    
    # Verificar acesso ao distrito
    verify_distrito_access(current_user, distrito_id)
    
    # Buscar igrejas ativas do distrito
    igrejas_ativas = db.query(Igreja).filter(
        Igreja.distrito_id == distrito_id,
        Igreja.status == "ATIVO"
    ).all()
    
    if not igrejas_ativas:
        return {
            "valido": False,
            "mensagem": "Nenhuma igreja ativa encontrada no distrito",
            "igrejas_sem_horario": [],
            "total_igrejas": 0
        }
    
    # Verificar quais igrejas não têm horários de culto
    igrejas_sem_horario = []
    for igreja in igrejas_ativas:
        count_horarios = db.query(func.count(HorarioCulto.id)).filter(
            HorarioCulto.igreja_id == igreja.id,
            HorarioCulto.ativo == True
        ).scalar()
        
        if count_horarios == 0:
            igrejas_sem_horario.append({
                "id": igreja.id,
                "nome": igreja.nome
            })
    
    return {
        "valido": len(igrejas_sem_horario) == 0,
        "mensagem": f"{len(igrejas_sem_horario)} igreja(s) sem horários de culto cadastrados" if igrejas_sem_horario else "Distrito válido para geração de escala",
        "igrejas_sem_horario": igrejas_sem_horario,
        "total_igrejas": len(igrejas_ativas)
    }


@router.get("/conflitos/{distrito_id}")
def listar_conflitos(
    distrito_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Lista conflitos de escalas no distrito (pregadores/cantores escalados múltiplas vezes no mesmo dia).
    """
    from app.models.igreja import Igreja
    from sqlalchemy import and_, or_
    
    # Verificar acesso ao distrito
    verify_distrito_access(current_user, distrito_id)
    
    # Buscar conflitos de pregadores
    conflitos_pregador = db.query(
        ItemEscala.data_culto,
        ItemEscala.pregador_id,
        Usuario.nome_completo.label("pregador_nome")
    ).join(
        Usuario, ItemEscala.pregador_id == Usuario.id
    ).join(
        Escala, ItemEscala.escala_id == Escala.id
    ).filter(
        Escala.distrito_id == distrito_id,
        ItemEscala.pregador_id.isnot(None)
    ).group_by(
        ItemEscala.data_culto,
        ItemEscala.pregador_id,
        Usuario.nome_completo
    ).having(
        func.count(ItemEscala.id) > 1
    ).all()
    
    # Buscar conflitos de cantores
    conflitos_cantor = db.query(
        ItemEscala.data_culto,
        ItemEscala.cantor_id,
        Usuario.nome_completo.label("cantor_nome")
    ).join(
        Usuario, ItemEscala.cantor_id == Usuario.id
    ).join(
        Escala, ItemEscala.escala_id == Escala.id
    ).filter(
        Escala.distrito_id == distrito_id,
        ItemEscala.cantor_id.isnot(None)
    ).group_by(
        ItemEscala.data_culto,
        ItemEscala.cantor_id,
        Usuario.nome_completo
    ).having(
        func.count(ItemEscala.id) > 1
    ).all()
    
    # Montar detalhes dos conflitos
    conflitos = []
    
    for conflito in conflitos_pregador:
        # Buscar itens específicos desse conflito
        itens = db.query(ItemEscala, Igreja).join(
            Igreja, ItemEscala.igreja_id == Igreja.id
        ).join(
            Escala, ItemEscala.escala_id == Escala.id
        ).filter(
            ItemEscala.data_culto == conflito.data_culto,
            ItemEscala.pregador_id == conflito.pregador_id,
            Escala.distrito_id == distrito_id
        ).all()
        
        conflitos.append({
            "tipo": "pregador",
            "data": conflito.data_culto.isoformat(),
            "usuario_id": conflito.pregador_id,
            "usuario_nome": conflito.pregador_nome,
            "total_escalas": len(itens),
            "itens": [
                {
                    "item_id": item.ItemEscala.id,
                    "escala_id": item.ItemEscala.escala_id,
                    "igreja_id": item.ItemEscala.igreja_id,
                    "igreja_nome": item.Igreja.nome,
                    "horario": str(item.ItemEscala.horario)
                }
                for item in itens
            ]
        })
    
    for conflito in conflitos_cantor:
        # Buscar itens específicos desse conflito
        itens = db.query(ItemEscala, Igreja).join(
            Igreja, ItemEscala.igreja_id == Igreja.id
        ).join(
            Escala, ItemEscala.escala_id == Escala.id
        ).filter(
            ItemEscala.data_culto == conflito.data_culto,
            ItemEscala.cantor_id == conflito.cantor_id,
            Escala.distrito_id == distrito_id
        ).all()
        
        conflitos.append({
            "tipo": "cantor",
            "data": conflito.data_culto.isoformat(),
            "usuario_id": conflito.cantor_id,
            "usuario_nome": conflito.cantor_nome,
            "total_escalas": len(itens),
            "itens": [
                {
                    "item_id": item.ItemEscala.id,
                    "escala_id": item.ItemEscala.escala_id,
                    "igreja_id": item.ItemEscala.igreja_id,
                    "igreja_nome": item.Igreja.nome,
                    "horario": str(item.ItemEscala.horario)
                }
                for item in itens
            ]
        })
    
    return {
        "total_conflitos": len(conflitos),
        "conflitos": conflitos
    }


@router.get("/minhas-proximas")
def listar_minhas_proximas_escalas(
    limit: int = Query(10, description="Número máximo de escalas a retornar"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista as próximas escalas do usuário logado.
    Busca escalas onde o usuário está como pregador ou cantor.
    Retorna escalas futuras ordenadas por data.
    """
    from datetime import datetime, timezone
    from app.models.igreja import Igreja
    from sqlalchemy import or_
    
    now = datetime.now(timezone.utc).date()
    
    # Buscar escalas onde o usuário está como pregador OU cantor
    # (independente do tipo de usuário - Pastor também pode estar escalado)
    query = db.query(
        ItemEscala,
        Igreja.nome.label("igreja_nome"),
        Escala.id.label("escala_id"),
        Escala.mes.label("escala_mes"),
        Escala.ano.label("escala_ano")
    ).join(
        Igreja, ItemEscala.igreja_id == Igreja.id
    ).join(
        Escala, ItemEscala.escala_id == Escala.id
    ).filter(
        ItemEscala.data_culto >= now,
        or_(
            ItemEscala.pregador_id == current_user.id,
            ItemEscala.cantor_id == current_user.id
        )
    )
    
    # Ordenar por data e limitar resultados
    results = query.order_by(
        ItemEscala.data_culto.asc(),
        ItemEscala.horario.asc()
    ).limit(limit).all()
    
    escalas = []
    for item, igreja_nome, escala_id, escala_mes, escala_ano in results:
        # Buscar tema se houver tema_id
        tema_texto = None
        if item.tema_id:
            from app.models.tema import Tema
            tema = db.query(Tema).filter(Tema.id == item.tema_id).first()
            if tema:
                tema_texto = tema.titulo
        elif item.tema_customizado:
            tema_texto = item.tema_customizado
        
        # Verificar se há solicitação de troca pendente para este item
        from app.models.solicitacao_troca import SolicitacaoTroca, StatusSolicitacaoTroca, TipoAvaliado
        tipo_troca = TipoAvaliado.PREGADOR if item.pregador_id == current_user.id else TipoAvaliado.CANTOR
        
        solicitacao_pendente = db.query(SolicitacaoTroca).filter(
            SolicitacaoTroca.item_escala_id == item.id,
            SolicitacaoTroca.tipo == tipo_troca,
            SolicitacaoTroca.status.in_([
                StatusSolicitacaoTroca.PENDENTE_SUBSTITUTO,
                StatusSolicitacaoTroca.PENDENTE_PASTOR
            ])
        ).first()
        
        escalas.append({
            "item_id": item.id,
            "escala_id": escala_id,
            "escala_nome": f"{escala_mes:02d}/{escala_ano}",
            "data_culto": item.data_culto.isoformat(),
            "horario": str(item.horario),
            "igreja_id": item.igreja_id,
            "igreja_nome": igreja_nome,
            "tipo": "pregador" if item.pregador_id == current_user.id else "cantor",
            "confirmado": item.status_confirmacao_pregador.value if item.pregador_id == current_user.id else item.status_confirmacao_cantor.value,
            "tema": tema_texto,
            "tem_troca_pendente": solicitacao_pendente is not None,
            "solicitacao_troca_id": solicitacao_pendente.id if solicitacao_pendente else None
        })
    
    return {
        "total": len(escalas),
        "escalas": escalas
    }


@router.post("/gerar", response_model=EscalaResponse, status_code=status.HTTP_201_CREATED)
def gerar_escala(
    data: EscalaGenerateRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Gera escala automaticamente.
    Pastor/Líder só pode gerar escalas do seu distrito.
    """
    # Verificar acesso ao distrito
    verify_distrito_access(current_user, data.distrito_id)
    
    service = EscalaService(db)
    return service.generate(data, current_user)


@router.get("/", response_model=EscalaListResponse)
def listar_escalas(
    distrito_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista escalas de um distrito.
    
    - ADMIN: pode especificar distrito_id ou listar todos
    - PASTOR/LIDER/PREGADOR/CANTOR/MEMBRO: vê apenas escalas do seu distrito (distrito_id é ignorado)
    """
    # Se não for admin, usa o distrito do usuário
    if current_user.tipo != TipoUsuario.ADMIN:
        user_distrito_id = get_user_distrito_id(current_user)
        if not user_distrito_id:
            raise ForbiddenException("Usuário sem distrito associado")
        distrito_id = user_distrito_id
    
    # Admin sem distrito_id especificado retorna erro
    if not distrito_id:
        raise ForbiddenException("distrito_id é obrigatório para administradores")
    
    # Verificar acesso ao distrito
    verify_distrito_access(current_user, distrito_id)
    
    service = EscalaService(db)
    escalas, total = service.list_by_distrito(distrito_id, skip, limit)
    return {"items": escalas, "total": total}


@router.get("/minhas")
def minhas_escalas(
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista escalas do usuário logado.
    """
    service = EscalaService(db)
    return service.get_my_schedule(current_user, data_inicio, data_fim)


@router.get("/solicitacoes-pendentes-pastor")
def listar_solicitacoes_pendentes_pastor(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista solicitações de troca pendentes de aprovação do pastor.
    """
    from app.models.solicitacao_troca import SolicitacaoTroca, StatusSolicitacaoTroca
    from app.models.igreja import Igreja
    
    # Verificar se é pastor
    if current_user.tipo not in [TipoUsuario.ADMIN, TipoUsuario.ASSOCIACAO, TipoUsuario.PASTOR_DISTRITAL]:
        raise ForbiddenException("Apenas pastores podem acessar este recurso")
    
    # Buscar solicitações pendentes do pastor
    solicitacoes = db.query(
        SolicitacaoTroca,
        ItemEscala,
        Igreja.nome.label("igreja_nome")
    ).join(
        ItemEscala, SolicitacaoTroca.item_escala_id == ItemEscala.id
    ).join(
        Igreja, ItemEscala.igreja_id == Igreja.id
    ).filter(
        SolicitacaoTroca.pastor_id == current_user.id,
        SolicitacaoTroca.status == StatusSolicitacaoTroca.PENDENTE_PASTOR
    ).all()
    
    resultado = []
    for solicitacao, item, igreja_nome in solicitacoes:
        # Buscar solicitante e substituto
        solicitante = db.query(Usuario).filter(
            Usuario.id == solicitacao.solicitante_id
        ).first()
        substituto = db.query(Usuario).filter(
            Usuario.id == solicitacao.substituto_id
        ).first()
        
        resultado.append({
            "id": solicitacao.id,
            "tipo": solicitacao.tipo.value,
            "motivo": solicitacao.motivo,
            "status": solicitacao.status.value,
            "solicitante_id": solicitacao.solicitante_id,
            "solicitante_nome": solicitante.nome_completo if solicitante else "Desconhecido",
            "substituto_id": solicitacao.substituto_id,
            "substituto_nome": substituto.nome_completo if substituto else "Desconhecido",
            "igreja_nome": igreja_nome,
            "igreja_id": item.igreja_id,
            "item_escala_id": item.id,
            "data_culto": item.data_culto.isoformat(),
            "horario": str(item.horario),
            "created_at": solicitacao.created_at.isoformat()
        })
    
    return resultado


@router.get("/itens/{item_escala_id}/substitutos-disponiveis")
def listar_substitutos_disponiveis(
    item_escala_id: int,
    tipo: str = Query(..., description="PREGADOR ou CANTOR"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista usuários disponíveis para substituição emergencial em um item de escala.
    Apenas para pastores.
    """
    if current_user.tipo not in [TipoUsuario.ADMIN, TipoUsuario.ASSOCIACAO, TipoUsuario.PASTOR_DISTRITAL]:
        raise ForbiddenException("Apenas pastores podem acessar este recurso")
    
    # Buscar item da escala
    item = db.query(ItemEscala).filter(ItemEscala.id == item_escala_id).first()
    if not item:
        raise NotFoundException("Item de escala não encontrado")
    
    # Buscar igreja para pegar o distrito
    from app.models.igreja import Igreja
    igreja = db.query(Igreja).filter(Igreja.id == item.igreja_id).first()
    if not igreja:
        raise NotFoundException("Igreja não encontrada")
    
    # Buscar usuários do mesmo distrito com o tipo adequado
    if tipo == "PREGADOR":
        usuarios = db.query(Usuario).filter(
            Usuario.distrito_id == igreja.distrito_id,
            Usuario.tipo.in_([TipoUsuario.PREGADOR, TipoUsuario.PASTOR_DISTRITAL]),
            Usuario.status == "ATIVO",
            Usuario.id != item.pregador_id  # Não incluir o pregador atual
        ).all()
    else:  # CANTOR
        usuarios = db.query(Usuario).filter(
            Usuario.distrito_id == igreja.distrito_id,
            Usuario.tipo == TipoUsuario.CANTOR,
            Usuario.status == "ATIVO",
            Usuario.id != item.cantor_id  # Não incluir o cantor atual
        ).all()
    
    resultado = []
    for usuario in usuarios:
        resultado.append({
            "id": usuario.id,
            "nome_completo": usuario.nome_completo,
            "telefone": usuario.telefone,
            "email": usuario.email
        })
    
    return resultado


@router.get("/minhas-solicitacoes-troca")

def listar_minhas_solicitacoes_troca(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista todas as solicitações de troca do usuário logado (como solicitante ou substituto)
    com seus respectivos status.
    """
    from app.models.solicitacao_troca import SolicitacaoTroca, StatusSolicitacaoTroca
    from app.models.igreja import Igreja
    
    # Buscar solicitações onde o usuário é o substituto ou solicitante
    solicitacoes = db.query(
        SolicitacaoTroca
    ).filter(
        (SolicitacaoTroca.substituto_id == current_user.id) |
        (SolicitacaoTroca.solicitante_id == current_user.id)
    ).all()
    
    resultado = []
    for solicitacao in solicitacoes:
        resultado.append({
            "id": solicitacao.id,
            "status": solicitacao.status.value,
        })
    
    return resultado


@router.get("/solicitacoes-pendentes")
def listar_solicitacoes_pendentes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista solicitações de troca pendentes onde o usuário logado é o substituto.
    """
    from app.models.solicitacao_troca import SolicitacaoTroca, StatusSolicitacaoTroca
    from app.models.igreja import Igreja
    
    # Buscar solicitações onde o usuário é o substituto e status é PENDENTE_SUBSTITUTO
    solicitacoes = db.query(
        SolicitacaoTroca,
        ItemEscala,
        Igreja.nome.label("igreja_nome")
    ).join(
        ItemEscala, SolicitacaoTroca.item_escala_id == ItemEscala.id
    ).join(
        Igreja, ItemEscala.igreja_id == Igreja.id
    ).filter(
        SolicitacaoTroca.substituto_id == current_user.id,
        SolicitacaoTroca.status == StatusSolicitacaoTroca.PENDENTE_SUBSTITUTO
    ).all()
    
    resultado = []
    for solicitacao, item, igreja_nome in solicitacoes:
        # Buscar solicitante
        solicitante = db.query(Usuario).filter(
            Usuario.id == solicitacao.solicitante_id
        ).first()
        
        resultado.append({
            "id": solicitacao.id,
            "tipo": solicitacao.tipo.value,
            "motivo": solicitacao.motivo,
            "status": solicitacao.status.value,
            "solicitante_nome": solicitante.nome_completo if solicitante else "Desconhecido",
            "igreja_nome": igreja_nome,
            "data_culto": item.data_culto.isoformat(),
            "horario": str(item.horario),
            "created_at": solicitacao.created_at.isoformat()
        })
    
    return resultado


@router.get("/{escala_id}", response_model=EscalaResponse)
def obter_escala(
    escala_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtém escala por ID.
    """
    service = EscalaService(db)
    return service.get_by_id(escala_id)


@router.get("/{escala_id}/estatisticas")
def obter_estatisticas(
    escala_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtém estatísticas da escala.
    """
    service = EscalaService(db)
    return service.get_estatisticas(escala_id)


@router.get("/{escala_id}/itens")
def listar_itens_escala(
    escala_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista itens de uma escala com dados detalhados.
    """
    service = EscalaService(db)
    escala = service.escala_repo.get_with_items(escala_id)
    
    if not escala:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Escala", escala_id)
    
    # Enriquecer itens com nomes
    result = []
    for item in escala.itens:
        item_dict = {
            "id": item.id,
            "escala_id": item.escala_id,
            "igreja_id": item.igreja_id,
            "data_culto": item.data_culto,
            "horario": item.horario,
            "pregador_id": item.pregador_id,
            "cantor_id": item.cantor_id,
            "tema_id": item.tema_id,
            "tema_customizado": item.tema_customizado,
            "status_confirmacao_pregador": item.status_confirmacao_pregador,
            "status_confirmacao_cantor": item.status_confirmacao_cantor,
            "data_confirmacao_pregador": item.data_confirmacao_pregador,
            "data_confirmacao_cantor": item.data_confirmacao_cantor,
            "status_realizacao": item.status_realizacao,
            "observacoes": item.observacoes,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
            "igreja_nome": item.igreja.nome if item.igreja else None,
            "pregador_nome": item.pregador.nome_completo if item.pregador else None,
            "cantor_nome": item.cantor.nome_completo if item.cantor else None,
            "tema_titulo": item.tema.titulo if item.tema else None,
            "pregador_score": float(item.pregador.score_atual) if item.pregador and item.pregador.score_atual else None,
            "cantor_score": float(item.cantor.score_atual) if item.cantor and item.cantor.score_atual else None
        }
        result.append(item_dict)
    
    return result


@router.post("/{escala_id}/publicar", response_model=EscalaResponse)
def publicar_escala(
    escala_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Publica escala.
    """
    service = EscalaService(db)
    return service.publish(escala_id, current_user)


@router.delete("/{escala_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_escala(
    escala_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Exclui escala (apenas rascunho).
    """
    service = EscalaService(db)
    service.delete(escala_id, current_user)


@router.put("/itens/{item_id}", response_model=ItemEscalaResponse)
def atualizar_item(
    item_id: int,
    data: ItemEscalaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor)
):
    """
    Atualiza item da escala.
    """
    service = EscalaService(db)
    return service.update_item(
        item_id,
        pregador_id=data.pregador_id,
        cantor_id=data.cantor_id,
        current_user=current_user
    )


@router.post("/itens/{item_id}/confirmar")
def confirmar_presenca(
    item_id: int,
    data: ItemEscalaConfirmacao,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Confirma ou recusa presença em um item da escala.
    """
    service = EscalaService(db)
    item = service.confirm_presence(item_id, current_user, data.confirmado)
    
    return {
        "message": "Presença confirmada" if data.confirmado else "Presença recusada",
        "item_id": item.id
    }


@router.post("/itens/{item_id}/solicitar-troca", status_code=status.HTTP_201_CREATED)
def solicitar_troca(
    item_id: int,
    substituto_id: int = Query(..., description="ID do substituto"),
    motivo: str = Query(..., description="Motivo da solicitação"),
    tipo: str = Query(..., description="PREGADOR ou CANTOR"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Cria uma solicitação de troca de pregador/cantor em um item da escala.
    
    Fluxo:
    1. Solicitante cria a solicitação indicando substituto e motivo
    2. Status inicial: PENDENTE_SUBSTITUTO
    3. Substituto aceita ou recusa
    4. Se aceito, vai para PENDENTE_PASTOR
    5. Pastor aprova ou recusa
    6. Se aprovado, status: APROVADA e substituto assume a escala
    """
    from app.models.solicitacao_troca import SolicitacaoTroca, TipoAvaliado, StatusSolicitacaoTroca
    from app.core.exceptions import NotFoundException, BadRequestException
    
    # Verificar se item existe
    item = db.query(ItemEscala).filter(ItemEscala.id == item_id).first()
    if not item:
        raise NotFoundException("Item de escala não encontrado")
    
    # Verificar se usuário está escalado neste item
    if tipo == "PREGADOR" and item.pregador_id != current_user.id:
        raise ForbiddenException("Você não está escalado como pregador neste item")
    elif tipo == "CANTOR" and item.cantor_id != current_user.id:
        raise ForbiddenException("Você não está escalado como cantor neste item")
    
    # Verificar se substituto existe
    substituto = db.query(Usuario).filter(Usuario.id == substituto_id).first()
    if not substituto:
        raise NotFoundException("Substituto não encontrado")
    
    # Verificar se já existe solicitação pendente para este item
    solicitacao_existente = db.query(SolicitacaoTroca).filter(
        SolicitacaoTroca.item_escala_id == item_id,
        SolicitacaoTroca.tipo == TipoAvaliado(tipo),
        SolicitacaoTroca.status.in_([
            StatusSolicitacaoTroca.PENDENTE_SUBSTITUTO,
            StatusSolicitacaoTroca.PENDENTE_PASTOR
        ])
    ).first()
    
    if solicitacao_existente:
        raise BadRequestException("Já existe uma solicitação de troca pendente para este item")
    
    # Buscar pastor do distrito
    escala = db.query(Escala).filter(Escala.id == item.escala_id).first()
    pastor_id = escala.pastor_id if escala else None
    
    # Criar solicitação
    solicitacao = SolicitacaoTroca(
        item_escala_id=item_id,
        tipo=TipoAvaliado(tipo),
        solicitante_id=current_user.id,
        substituto_id=substituto_id,
        motivo=motivo,
        pastor_id=pastor_id,
        status=StatusSolicitacaoTroca.PENDENTE_SUBSTITUTO
    )
    
    db.add(solicitacao)
    db.commit()
    db.refresh(solicitacao)
    
    # Enviar notificação para o substituto
    from app.services.notificacao_service import NotificacaoService
    from app.models.notificacao import TipoNotificacao
    from app.models.igreja import Igreja
    
    notificacao_service = NotificacaoService(db)
    
    # Buscar igreja para incluir no título
    igreja = db.query(Igreja).filter(Igreja.id == item.igreja_id).first()
    igreja_nome = igreja.nome if igreja else "igreja"
    
    # Criar notificação para o SOLICITANTE (confirmação)
    notificacao_service.create(
        usuario_id=current_user.id,
        tipo=TipoNotificacao.TROCA,
        titulo=f"Solicitação de Troca Enviada",
        mensagem=f"Sua solicitação de troca de {tipo.lower()} com {substituto.nome_completo} para {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')} foi enviada. Aguardando resposta.",
        link=f"/notificacoes"
    )
    
    # Criar notificação in-app para o substituto
    notificacao_service.create(
        usuario_id=substituto_id,
        tipo=TipoNotificacao.TROCA,
        titulo=f"Solicitação de Troca Recebida",
        mensagem=f"{current_user.nome_completo} solicitou que você assuma a {tipo.lower()} na {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')} às {item.horario.strftime('%H:%M')}. Motivo: {motivo}",
        link=f"/notificacoes?solicitacao_id={solicitacao.id}"
    )
    
    # Enviar notificação para o pastor do distrito
    if pastor_id:
        notificacao_service.create(
            usuario_id=pastor_id,
            tipo=TipoNotificacao.TROCA,
            titulo=f"Solicitação de Troca Pendente",
            mensagem=f"{current_user.nome_completo} solicitou troca de {tipo.lower()} com {substituto.nome_completo} para {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')}.",
            link=f"/notificacoes"
        )
    
    # Buscar líder distrital do distrito e notificar
    escala_obj = db.query(Escala).filter(Escala.id == item.escala_id).first()
    if escala_obj and escala_obj.distrito_id:
        # Buscar líderes distritais do mesmo distrito
        lideres = db.query(Usuario).filter(
            Usuario.tipo == TipoUsuario.LIDER_DISTRITAL,
            Usuario.distrito_id == escala_obj.distrito_id
        ).all()
        
        for lider in lideres:
            notificacao_service.create(
                usuario_id=lider.id,
                tipo=TipoNotificacao.TROCA,
                titulo=f"Solicitação de Troca Pendente",
                mensagem=f"{current_user.nome_completo} solicitou troca de {tipo.lower()} com {substituto.nome_completo} para {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')}.",
                link=f"/notificacoes"
            )
    
    return {
        "message": "Solicitação de troca criada com sucesso",
        "solicitacao_id": solicitacao.id,
        "status": solicitacao.status.value
    }


@router.post("/itens/solicitacao-troca/{solicitacao_id}/responder-substituto")
def responder_solicitacao_substituto(
    solicitacao_id: int,
    aceitar: bool = Query(..., description="True para aceitar, False para recusar"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Substituto aceita ou recusa uma solicitação de troca.
    """
    from app.models.solicitacao_troca import SolicitacaoTroca, StatusSolicitacaoTroca
    from app.core.exceptions import NotFoundException, ForbiddenException
    from app.services.notificacao_service import NotificacaoService
    from app.models.notificacao import TipoNotificacao
    from app.models.igreja import Igreja
    from datetime import datetime
    
    # Buscar solicitação
    solicitacao = db.query(SolicitacaoTroca).filter(
        SolicitacaoTroca.id == solicitacao_id
    ).first()
    
    if not solicitacao:
        raise NotFoundException("Solicitação não encontrada")
    
    # Verificar se usuário é o substituto
    if solicitacao.substituto_id != current_user.id:
        raise ForbiddenException("Você não é o substituto desta solicitação")
    
    # Verificar se solicitação está pendente
    if solicitacao.status != StatusSolicitacaoTroca.PENDENTE_SUBSTITUTO:
        raise BadRequestException(f"Solicitação já foi processada. Status atual: {solicitacao.status.value}")
    
    # Buscar dados para notificação
    item = db.query(ItemEscala).filter(ItemEscala.id == solicitacao.item_escala_id).first()
    igreja = db.query(Igreja).filter(Igreja.id == item.igreja_id).first() if item else None
    igreja_nome = igreja.nome if igreja else "igreja"
    solicitante = db.query(Usuario).filter(Usuario.id == solicitacao.solicitante_id).first()
    
    notificacao_service = NotificacaoService(db)
    
    if aceitar:
        # Atualizar status para PENDENTE_PASTOR
        solicitacao.status = StatusSolicitacaoTroca.PENDENTE_PASTOR
        solicitacao.data_resposta_substituto = datetime.utcnow()
        
        # Notificar solicitante
        notificacao_service.create(
            usuario_id=solicitacao.solicitante_id,
            tipo=TipoNotificacao.TROCA,
            titulo=f"Substituto Aceitou a Troca",
            mensagem=f"{current_user.nome_completo} aceitou assumir a {solicitacao.tipo.value.lower()} na {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')}. Aguardando aprovação do pastor.",
            link=f"/notificacoes"
        )
        
        # Notificar pastor
        if solicitacao.pastor_id:
            notificacao_service.create(
                usuario_id=solicitacao.pastor_id,
                tipo=TipoNotificacao.TROCA,
                titulo=f"Troca Aceita - Aguardando Aprovação",
                mensagem=f"{current_user.nome_completo} aceitou substituir {solicitante.nome_completo} na {solicitacao.tipo.value.lower()} em {igreja_nome}. Aprove ou recuse esta troca.",
                link=f"/notificacoes?solicitacao_id={solicitacao.id}&item_escala_id={item.id}&tipo={solicitacao.tipo.value}"
            )
        
        message = "Solicitação aceita. Aguardando aprovação do pastor."
    else:
        # Atualizar status para RECUSADA
        solicitacao.status = StatusSolicitacaoTroca.RECUSADA
        solicitacao.data_resposta_substituto = datetime.utcnow()
        
        # Notificar solicitante
        notificacao_service.create(
            usuario_id=solicitacao.solicitante_id,
            tipo=TipoNotificacao.TROCA,
            titulo=f"Solicitação de Troca Recusada",
            mensagem=f"{current_user.nome_completo} recusou assumir a {solicitacao.tipo.value.lower()} na {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')}. Você pode solicitar troca para outro pregador.",
            link=f"/dashboard"
        )
        
        message = "Solicitação recusada."
    
    db.commit()
    
    return {
        "message": message,
        "status": solicitacao.status.value
    }


@router.post("/itens/solicitacao-troca/{solicitacao_id}/responder-pastor")
def responder_solicitacao_pastor(
    solicitacao_id: int,
    aprovar: bool = Query(..., description="True para aprovar, False para recusar"),
    observacao: str = Query(None, description="Observação do pastor"),
    substituto_emergencial_id: int = Query(None, description="ID do substituto emergencial (apenas se recusar)"),
    motivo_emergencia: str = Query(None, description="Motivo da substituição emergencial"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Pastor aprova ou recusa uma solicitação de troca.
    Se recusar, pode indicar um substituto emergencial.
    """
    from app.models.solicitacao_troca import SolicitacaoTroca, StatusSolicitacaoTroca
    from app.models.solicitacao_substituicao_emergencial import SolicitacaoSubstituicaoEmergencial, StatusSubstituicaoEmergencial
    from app.models.item_escala import StatusConfirmacao
    from app.core.exceptions import NotFoundException, ForbiddenException
    from app.services.notificacao_service import NotificacaoService
    from app.models.notificacao import TipoNotificacao
    from app.models.igreja import Igreja
    from app.models.historico_substituicao_emergencial import HistoricoSubstituicaoEmergencial
    from datetime import datetime
    
    # Buscar solicitação
    solicitacao = db.query(SolicitacaoTroca).filter(
        SolicitacaoTroca.id == solicitacao_id
    ).first()
    
    if not solicitacao:
        raise NotFoundException("Solicitação não encontrada")
    
    # Verificar se usuário é o pastor ou tem permissão
    if current_user.tipo not in [TipoUsuario.ADMIN, TipoUsuario.ASSOCIACAO, TipoUsuario.PASTOR_DISTRITAL]:
        if solicitacao.pastor_id != current_user.id:
            raise ForbiddenException("Você não tem permissão para aprovar esta solicitação")
    
    # Verificar se solicitação está pendente aprovação do pastor
    if solicitacao.status != StatusSolicitacaoTroca.PENDENTE_PASTOR:
        raise BadRequestException(f"Solicitação não está aguardando aprovação. Status atual: {solicitacao.status.value}")
    
    # Buscar dados para notificação
    item = db.query(ItemEscala).filter(ItemEscala.id == solicitacao.item_escala_id).first()
    igreja = db.query(Igreja).filter(Igreja.id == item.igreja_id).first() if item else None
    igreja_nome = igreja.nome if igreja else "igreja"
    substituto = db.query(Usuario).filter(Usuario.id == solicitacao.substituto_id).first()
    
    notificacao_service = NotificacaoService(db)
    
    if aprovar:
        # Atualizar status para APROVADA
        solicitacao.status = StatusSolicitacaoTroca.APROVADA
        solicitacao.data_resposta_pastor = datetime.utcnow()
        solicitacao.observacao_pastor = observacao
        
        # REALIZAR A TROCA: substituir o pregador/cantor no item da escala
        if solicitacao.tipo.value == "PREGADOR":
            item.pregador_id = solicitacao.substituto_id
            # Marcar confirmação automática do substituto
            item.status_confirmacao_pregador = StatusConfirmacao.CONFIRMADO
            item.data_confirmacao_pregador = datetime.utcnow()
        elif solicitacao.tipo.value == "CANTOR":
            item.cantor_id = solicitacao.substituto_id
            # Marcar confirmação automática do substituto
            item.status_confirmacao_cantor = StatusConfirmacao.CONFIRMADO
            item.data_confirmacao_cantor = datetime.utcnow()
        
        # Notificar solicitante
        notificacao_service.create(
            usuario_id=solicitacao.solicitante_id,
            tipo=TipoNotificacao.TROCA,
            titulo=f"Troca Aprovada pelo Pastor",
            mensagem=f"Sua troca de {solicitacao.tipo.value.lower()} com {substituto.nome_completo} para {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')} foi aprovada pelo pastor.",
            link=f"/dashboard"
        )
        
        # Notificar substituto
        notificacao_service.create(
            usuario_id=solicitacao.substituto_id,
            tipo=TipoNotificacao.TROCA,
            titulo=f"Troca Aprovada - Você Está Escalado",
            mensagem=f"A troca foi aprovada! Você está confirmado como {solicitacao.tipo.value.lower()} na {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')} às {item.horario.strftime('%H:%M')}.",
            link=f"/dashboard"
        )
        
        message = "Troca aprovada e efetivada com sucesso."
    else:
        # Atualizar status para RECUSADA
        solicitacao.status = StatusSolicitacaoTroca.RECUSADA
        solicitacao.data_resposta_pastor = datetime.utcnow()
        solicitacao.observacao_pastor = observacao
        
        # Se foi indicado um substituto emergencial
        if substituto_emergencial_id and motivo_emergencia:
            # Buscar substituto emergencial
            substituto_emergencial = db.query(Usuario).filter(
                Usuario.id == substituto_emergencial_id
            ).first()
            
            if not substituto_emergencial:
                raise NotFoundException("Substituto emergencial não encontrado")
            
            # Criar solicitação de substituição emergencial PENDENTE
            solicitacao_emergencial = SolicitacaoSubstituicaoEmergencial(
                solicitacao_troca_id=solicitacao.id,
                item_escala_id=item.id,
                substituto_emergencial_id=substituto_emergencial_id,
                usuario_substituido_id=solicitacao.solicitante_id,
                pastor_id=current_user.id,
                igreja_id=item.igreja_id,
                motivo_emergencia=motivo_emergencia,
                observacao_pastor=observacao,
                tipo=solicitacao.tipo.value,
                status=StatusSubstituicaoEmergencial.PENDENTE
            )
            db.add(solicitacao_emergencial)
            db.flush()  # Garantir que o ID seja gerado
            db.refresh(solicitacao_emergencial)  # Atualizar o objeto com o ID gerado
            
            # Verificar se o substituto emergencial é o próprio pastor
            is_pastor_auto_designado = substituto_emergencial_id == current_user.id
            
            if is_pastor_auto_designado:
                # Pastor se auto-designou - efetivar imediatamente sem necessidade de aceitação
                solicitacao_emergencial.status = StatusSubstituicaoEmergencial.ACEITA
                solicitacao_emergencial.data_resposta = datetime.utcnow()
                
                # Registrar no histórico
                historico = HistoricoSubstituicaoEmergencial(
                    usuario_id=substituto_emergencial_id,
                    item_escala_id=item.id,
                    usuario_substituido_id=solicitacao.solicitante_id,
                    igreja_id=item.igreja_id,
                    data_culto=item.data_culto,
                    motivo_emergencia=motivo_emergencia,
                    pontos_ganhos=5.00
                )
                db.add(historico)
                
                # Efetivar troca
                if solicitacao.tipo.value == "PREGADOR":
                    item.pregador_id = substituto_emergencial_id
                    # Marcar confirmação automática do pastor auto-designado
                    item.status_confirmacao_pregador = StatusConfirmacao.CONFIRMADO
                    item.data_confirmacao_pregador = datetime.utcnow()
                elif solicitacao.tipo.value == "CANTOR":
                    item.cantor_id = substituto_emergencial_id
                    # Marcar confirmação automática do pastor auto-designado
                    item.status_confirmacao_cantor = StatusConfirmacao.CONFIRMADO
                    item.data_confirmacao_cantor = datetime.utcnow()
                
                # Notificar apenas os envolvidos (não o pastor)
                notificacao_service.create(
                    usuario_id=solicitacao.solicitante_id,
                    tipo=TipoNotificacao.TROCA,
                    titulo=f"Pastor Auto-Designado para Substituição",
                    mensagem=f"Sua solicitação de troca foi recusada, mas o pastor {current_user.nome_completo} se auto-designou para {solicitacao.tipo.value.lower()} na {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')}.{' Motivo: ' + observacao if observacao else ''}",
                    link=f"/dashboard"
                )
                
                if substituto:
                    notificacao_service.create(
                        usuario_id=solicitacao.substituto_id,
                        tipo=TipoNotificacao.TROCA,
                        titulo=f"Pastor Auto-Designado para Substituição",
                        mensagem=f"A solicitação de troca para {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')} foi recusada. O pastor {current_user.nome_completo} se auto-designou para realizar a {solicitacao.tipo.value.lower()}.",
                        link=f"/dashboard"
                    )
                
                message = "Solicitação recusada e pastor auto-designado com sucesso."
            else:
                # Substituto emergencial é outra pessoa - enviar solicitação para aceitação
                # Notificar substituto emergencial pedindo aceitação
                notificacao_service.create(
                    usuario_id=substituto_emergencial_id,
                    tipo=TipoNotificacao.TROCA,
                    titulo=f"🚨 Solicitação de Substituição Emergencial",
                    mensagem=f"O pastor {current_user.nome_completo} solicita que você realize uma substituição emergencial como {solicitacao.tipo.value.lower()} na {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')} às {item.horario.strftime('%H:%M')}. Motivo: {motivo_emergencia}. Você ganhará +5 pontos ao aceitar!",
                    link=f"/notificacoes?solicitacao_emergencial_id={solicitacao_emergencial.id}"
                )
                
                # Notificar solicitante original
                notificacao_service.create(
                    usuario_id=solicitacao.solicitante_id,
                    tipo=TipoNotificacao.TROCA,
                    titulo=f"Solicitação Recusada - Substituto Indicado",
                    mensagem=f"Sua solicitação de troca foi recusada. O pastor indicou {substituto_emergencial.nome_completo} como substituto para {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')}. Aguardando aceitação.{' Motivo: ' + observacao if observacao else ''}",
                    link=f"/dashboard"
                )
                
                # Notificar o substituto que havia aceitado
                if substituto:
                    notificacao_service.create(
                        usuario_id=solicitacao.substituto_id,
                        tipo=TipoNotificacao.TROCA,
                        titulo=f"Troca Recusada pelo Pastor",
                        mensagem=f"A solicitação de troca para {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')} foi recusada pelo pastor. Um substituto emergencial foi indicado e está sendo consultado.",
                        link=f"/dashboard"
                    )
                
                message = "Solicitação recusada e substituto emergencial indicado. Aguardando aceitação."
        else:
            # Notificar solicitante
            mensagem_obs = f" Motivo: {observacao}" if observacao else ""
            notificacao_service.create(
                usuario_id=solicitacao.solicitante_id,
                tipo=TipoNotificacao.TROCA,
                titulo=f"Solicitação de Troca Recusada pelo Pastor",
                mensagem=f"Sua solicitação de troca de {solicitacao.tipo.value.lower()} para {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')} foi recusada pelo pastor.{mensagem_obs}",
                link=f"/dashboard"
            )
            
            # Notificar substituto
            notificacao_service.create(
                usuario_id=solicitacao.substituto_id,
                tipo=TipoNotificacao.TROCA,
                titulo=f"Troca Recusada pelo Pastor",
                mensagem=f"A solicitação de troca para {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')} foi recusada pelo pastor.{mensagem_obs}",
                link=f"/dashboard"
            )
            
            message = "Solicitação recusada."
    
    db.commit()
    
    return {
        "message": message,
        "status": solicitacao.status.value
    }


@router.post("/itens/solicitacao-emergencial/{solicitacao_emergencial_id}/responder")
def responder_solicitacao_emergencial(
    solicitacao_emergencial_id: int,
    aceitar: bool = Query(..., description="True para aceitar, False para recusar"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Substituto emergencial aceita ou recusa uma solicitação de substituição emergencial.
    """
    from app.models.solicitacao_substituicao_emergencial import SolicitacaoSubstituicaoEmergencial, StatusSubstituicaoEmergencial
    from app.models.solicitacao_troca import SolicitacaoTroca
    from app.models.item_escala import StatusConfirmacao
    from app.core.exceptions import NotFoundException, ForbiddenException
    from app.services.notificacao_service import NotificacaoService
    from app.models.notificacao import TipoNotificacao
    from app.models.igreja import Igreja
    from app.models.historico_substituicao_emergencial import HistoricoSubstituicaoEmergencial
    from datetime import datetime
    
    # Buscar solicitação
    solicitacao_emergencial = db.query(SolicitacaoSubstituicaoEmergencial).filter(
        SolicitacaoSubstituicaoEmergencial.id == solicitacao_emergencial_id
    ).first()
    
    if not solicitacao_emergencial:
        raise NotFoundException("Solicitação de substituição emergencial não encontrada")
    
    # Verificar se usuário é o substituto
    if solicitacao_emergencial.substituto_emergencial_id != current_user.id:
        raise ForbiddenException("Você não tem permissão para responder esta solicitação")
    
    # Verificar se solicitação está pendente
    if solicitacao_emergencial.status != StatusSubstituicaoEmergencial.PENDENTE:
        raise BadRequestException(f"Solicitação já foi processada. Status atual: {solicitacao_emergencial.status.value}")
    
    # Buscar dados para notificação
    item = db.query(ItemEscala).filter(ItemEscala.id == solicitacao_emergencial.item_escala_id).first()
    igreja = db.query(Igreja).filter(Igreja.id == item.igreja_id).first() if item else None
    igreja_nome = igreja.nome if igreja else "igreja"
    solicitacao_troca = db.query(SolicitacaoTroca).filter(
        SolicitacaoTroca.id == solicitacao_emergencial.solicitacao_troca_id
    ).first()
    pastor = db.query(Usuario).filter(Usuario.id == solicitacao_emergencial.pastor_id).first()
    solicitante = db.query(Usuario).filter(Usuario.id == solicitacao_emergencial.usuario_substituido_id).first()
    substituto_original = db.query(Usuario).filter(Usuario.id == solicitacao_troca.substituto_id).first() if solicitacao_troca else None
    
    notificacao_service = NotificacaoService(db)
    
    if aceitar:
        # Atualizar status para ACEITA
        solicitacao_emergencial.status = StatusSubstituicaoEmergencial.ACEITA
        solicitacao_emergencial.data_resposta = datetime.utcnow()
        
        # Registrar no histórico de substituição emergencial
        historico = HistoricoSubstituicaoEmergencial(
            usuario_id=current_user.id,
            item_escala_id=item.id,
            usuario_substituido_id=solicitacao_emergencial.usuario_substituido_id,
            igreja_id=item.igreja_id,
            data_culto=item.data_culto,
            motivo_emergencia=solicitacao_emergencial.motivo_emergencia,
            pontos_ganhos=5.00
        )
        db.add(historico)
        
        # EFETIVAR A TROCA: substituir no item da escala
        if solicitacao_emergencial.tipo == "PREGADOR":
            item.pregador_id = current_user.id
            # Marcar confirmação automática do substituto emergencial
            item.status_confirmacao_pregador = StatusConfirmacao.CONFIRMADO
            item.data_confirmacao_pregador = datetime.utcnow()
        elif solicitacao_emergencial.tipo == "CANTOR":
            item.cantor_id = current_user.id
            # Marcar confirmação automática do substituto emergencial
            item.status_confirmacao_cantor = StatusConfirmacao.CONFIRMADO
            item.data_confirmacao_cantor = datetime.utcnow()
        
        # Notificar pastor
        notificacao_service.create(
            usuario_id=solicitacao_emergencial.pastor_id,
            tipo=TipoNotificacao.TROCA,
            titulo=f"Substituição Emergencial Aceita",
            mensagem=f"{current_user.nome_completo} aceitou a substituição emergencial para {solicitacao_emergencial.tipo.lower()} na {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')}. A troca foi efetivada.",
            link=f"/dashboard"
        )
        
        # Notificar solicitante original
        notificacao_service.create(
            usuario_id=solicitacao_emergencial.usuario_substituido_id,
            tipo=TipoNotificacao.TROCA,
            titulo=f"Substituição Emergencial Confirmada",
            mensagem=f"{current_user.nome_completo} aceitou a substituição emergencial para {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')}. A troca foi efetivada pelo pastor.",
            link=f"/dashboard"
        )
        
        # Notificar substituto original (se houver)
        if substituto_original:
            notificacao_service.create(
                usuario_id=substituto_original.id,
                tipo=TipoNotificacao.TROCA,
                titulo=f"Substituição Emergencial Confirmada",
                mensagem=f"{current_user.nome_completo} aceitou a substituição emergencial para {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')}.",
                link=f"/dashboard"
            )
        
        message = "Substituição emergencial aceita! Você ganhou +5 pontos."
    else:
        # Atualizar status para RECUSADA
        solicitacao_emergencial.status = StatusSubstituicaoEmergencial.RECUSADA
        solicitacao_emergencial.data_resposta = datetime.utcnow()
        
        # Notificar pastor
        notificacao_service.create(
            usuario_id=solicitacao_emergencial.pastor_id,
            tipo=TipoNotificacao.TROCA,
            titulo=f"Substituição Emergencial Recusada",
            mensagem=f"{current_user.nome_completo} recusou a substituição emergencial para {solicitacao_emergencial.tipo.lower()} na {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')}. Será necessário encontrar outro substituto.",
            link=f"/dashboard"
        )
        
        # Notificar solicitante original
        notificacao_service.create(
            usuario_id=solicitacao_emergencial.usuario_substituido_id,
            tipo=TipoNotificacao.TROCA,
            titulo=f"Substituição Emergencial Recusada",
            mensagem=f"{current_user.nome_completo} recusou a substituição emergencial para {igreja_nome} no dia {item.data_culto.strftime('%d/%m/%Y')}. O pastor está buscando outra solução.",
            link=f"/dashboard"
        )
        
        message = "Solicitação de substituição emergencial recusada."
    
    db.commit()
    
    return {
        "message": message,
        "status": solicitacao_emergencial.status.value
    }
