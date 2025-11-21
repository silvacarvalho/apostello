"""
Router: Associações
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_membro_associacao, get_current_active_user
from app.models import Associacao, Usuario
from app.schemas.associacao import AssociacaoCreate, AssociacaoUpdate, AssociacaoResponse

router = APIRouter()


@router.post("/", response_model=AssociacaoResponse, status_code=status.HTTP_201_CREATED)
def criar_associacao(
    data: AssociacaoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_membro_associacao)
):
    """Criar nova associação"""
    nova_associacao = Associacao(**data.dict())
    db.add(nova_associacao)
    db.commit()
    db.refresh(nova_associacao)
    return nova_associacao


@router.get("/", response_model=List[AssociacaoResponse])
def listar_associacoes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Listar todas as associações"""
    associacoes = db.query(Associacao).filter(Associacao.ativo == True).offset(skip).limit(limit).all()
    return associacoes


@router.get("/{associacao_id}", response_model=AssociacaoResponse)
def obter_associacao(
    associacao_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obter associação por ID"""
    associacao = db.query(Associacao).filter(Associacao.id == associacao_id).first()
    if not associacao:
        raise HTTPException(status_code=404, detail="Associação não encontrada")
    return associacao


@router.put("/{associacao_id}", response_model=AssociacaoResponse)
def atualizar_associacao(
    associacao_id: str,
    data: AssociacaoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_membro_associacao)
):
    """Atualizar associação"""
    associacao = db.query(Associacao).filter(Associacao.id == associacao_id).first()
    if not associacao:
        raise HTTPException(status_code=404, detail="Associação não encontrada")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(associacao, key, value)
    
    db.commit()
    db.refresh(associacao)
    return associacao


@router.delete("/{associacao_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_associacao(
    associacao_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_membro_associacao)
):
    """Deletar associação (soft delete)"""
    associacao = db.query(Associacao).filter(Associacao.id == associacao_id).first()
    if not associacao:
        raise HTTPException(status_code=404, detail="Associação não encontrada")
    
    associacao.ativo = False
    from datetime import datetime
    associacao.excluido_em = datetime.utcnow()
    db.commit()
    return None
