"""Router: Pregações"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, UUID4
from app.core.database import get_db
from app.core.deps import require_pastor_distrital, require_pregador, get_current_active_user
from app.models import Pregacao, Usuario, Notificacao
from app.schemas.pregacao import PregacaoCreate, PregacaoUpdate, PregacaoResponse, PregacaoAceitarRecusar, PregacaoComRelacionamentosResponse

router = APIRouter()


class AtribuirPregadorRequest(BaseModel):
    """Schema para atribuir pregador manualmente ou aceitar sugestão"""
    pregador_id: UUID4


@router.post("/", response_model=PregacaoResponse, status_code=status.HTTP_201_CREATED)
def criar_pregacao(data: PregacaoCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    nova_pregacao = Pregacao(**data.dict())
    db.add(nova_pregacao)
    db.commit()
    db.refresh(nova_pregacao)
    return nova_pregacao

@router.get("/", response_model=List[PregacaoComRelacionamentosResponse])
def listar_pregacoes(escala_id: str = None, pregador_id: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    query = db.query(Pregacao).options(
        joinedload(Pregacao.igreja),
        joinedload(Pregacao.pregador),
        joinedload(Pregacao.tematica)
    )
    if escala_id:
        query = query.filter(Pregacao.escala_id == escala_id)
    if pregador_id:
        query = query.filter(Pregacao.pregador_id == pregador_id)
    pregacoes = query.order_by(Pregacao.data_pregacao).offset(skip).limit(limit).all()
    return pregacoes

@router.get("/{pregacao_id}", response_model=PregacaoComRelacionamentosResponse)
def obter_pregacao(pregacao_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    pregacao = db.query(Pregacao).options(
        joinedload(Pregacao.igreja),
        joinedload(Pregacao.pregador),
        joinedload(Pregacao.tematica)
    ).filter(Pregacao.id == pregacao_id).first()
    if not pregacao:
        raise HTTPException(status_code=404, detail="Pregação não encontrada")
    return pregacao

@router.put("/{pregacao_id}", response_model=PregacaoResponse)
def atualizar_pregacao(pregacao_id: str, data: PregacaoUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pastor_distrital)):
    pregacao = db.query(Pregacao).filter(Pregacao.id == pregacao_id).first()
    if not pregacao:
        raise HTTPException(status_code=404, detail="Pregação não encontrada")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(pregacao, key, value)
    db.commit()
    db.refresh(pregacao)
    return pregacao

@router.post("/{pregacao_id}/responder", response_model=PregacaoResponse)
def aceitar_ou_recusar_pregacao(pregacao_id: str, data: PregacaoAceitarRecusar, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pregador)):
    pregacao = db.query(Pregacao).filter(Pregacao.id == pregacao_id).first()
    if not pregacao:
        raise HTTPException(status_code=404, detail="Pregação não encontrada")
    
    if str(pregacao.pregador_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    from datetime import datetime
    if data.aceitar:
        pregacao.status = "aceito"
        pregacao.aceito_em = datetime.utcnow()
    else:
        pregacao.status = "recusado"
        pregacao.recusado_em = datetime.utcnow()
        pregacao.motivo_recusa = data.motivo_recusa
        # Aplicar penalização no score (15%)
        from app.services.pregador_service import aplicar_penalizacao_recusa
        aplicar_penalizacao_recusa(db, current_user.id)
        
        # Notificar pastor sobre a recusa e sugerir novo pregador
        from app.services.escala_service import sugerir_pregador_substituto
        sugerir_pregador_substituto(db, pregacao_id)
    
    db.commit()
    db.refresh(pregacao)
    return pregacao


@router.post("/{pregacao_id}/atribuir-pregador", response_model=PregacaoResponse)
def atribuir_pregador(
    pregacao_id: str,
    data: AtribuirPregadorRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_pastor_distrital)
):
    """
    Atribuir manualmente um pregador a uma pregação.
    Usado quando o pastor aceita a sugestão do sistema ou escolhe outro pregador.
    """
    pregacao = db.query(Pregacao).filter(Pregacao.id == pregacao_id).first()
    if not pregacao:
        raise HTTPException(status_code=404, detail="Pregação não encontrada")
    
    # Verificar se o pregador existe e está ativo
    novo_pregador = db.query(Usuario).filter(
        Usuario.id == data.pregador_id,
        Usuario.ativo == True,
        Usuario.perfis.contains(["pregador"])
    ).first()
    
    if not novo_pregador:
        raise HTTPException(status_code=404, detail="Pregador não encontrado ou inativo")
    
    # Guardar pregador original se for uma troca
    if pregacao.pregador_id != data.pregador_id:
        if not pregacao.pregador_original_id:
            pregacao.pregador_original_id = pregacao.pregador_id
        pregacao.foi_trocado = True
    
    # Atribuir novo pregador
    pregacao.pregador_id = data.pregador_id
    pregacao.status = "agendado"  # Resetar para agendado, novo pregador precisa confirmar
    pregacao.aceito_em = None
    pregacao.recusado_em = None
    pregacao.motivo_recusa = None
    
    db.commit()
    db.refresh(pregacao)
    
    # Criar notificação para o novo pregador
    from app.models import Igreja
    igreja = db.query(Igreja).filter(Igreja.id == pregacao.igreja_id).first()
    
    notificacao = Notificacao(
        usuario_id=data.pregador_id,
        pregacao_id=pregacao.id,
        tipo="push",
        titulo="Nova Pregação Atribuída",
        mensagem=f"Você foi escalado para pregar no dia {pregacao.data_pregacao.strftime('%d/%m/%Y')} às {pregacao.horario_pregacao.strftime('%H:%M') if pregacao.horario_pregacao else '-'} na {igreja.nome if igreja else 'igreja'}. Por favor, confirme sua disponibilidade.",
        dados_extra={
            "pregacao_id": str(pregacao.id),
            "tipo_notificacao": "nova_pregacao"
        }
    )
    db.add(notificacao)
    db.commit()
    
    return pregacao
