"""Router: Pregadores"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_pregador, get_current_active_user
from app.models import Usuario, PerfilPregador
from app.schemas.pregador import PregadorResponse, PregadorUpdate

router = APIRouter()

@router.get("/", response_model=List[PregadorResponse])
def listar_pregadores(distrito_id: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    query = db.query(PerfilPregador).join(Usuario).filter(Usuario.ativo == True, PerfilPregador.ativo == True)
    if distrito_id:
        query = query.filter(Usuario.distrito_id == distrito_id)
    pregadores = query.order_by(PerfilPregador.score_medio.desc()).offset(skip).limit(limit).all()
    
    # Montar resposta com dados do usuário
    resultado = []
    for idx, pregador in enumerate(pregadores, 1):
        pregador_dict = {
            'usuario_id': pregador.usuario_id,
            'nome_completo': pregador.usuario.nome_completo,
            'email': pregador.usuario.email,
            'telefone': pregador.usuario.telefone,
            'igreja': pregador.usuario.igreja if pregador.usuario.igreja else None,
            'tipo_ordenacao': pregador.tipo_ordenacao,
            'data_ordenacao': pregador.data_ordenacao,
            'anos_experiencia': pregador.anos_experiencia,
            'score_medio': pregador.score_medio,
            'score_avaliacoes': pregador.score_avaliacoes,
            'score_frequencia': pregador.score_frequencia,
            'score_pontualidade': pregador.score_pontualidade,
            'total_pregacoes': pregador.total_pregacoes,
            'pregacoes_realizadas': pregador.pregacoes_realizadas,
            'pregacoes_faltou': pregador.pregacoes_faltou,
            'pregacoes_recusadas': pregador.pregacoes_recusadas,
            'taxa_frequencia': pregador.taxa_frequencia,
            'taxa_pontualidade': pregador.taxa_pontualidade,
            'max_pregacoes_mes': pregador.max_pregacoes_mes,
            'media_avaliacoes': float(pregador.score_avaliacoes),
            'total_avaliacoes': pregador.total_pregacoes,  # Pode ser ajustado se houver tabela de avaliações
            'taxa_confirmacao': float(pregador.taxa_frequencia),
            'posicao_ranking': idx,
            'ativo': pregador.ativo
        }
        resultado.append(PregadorResponse(**pregador_dict))
    
    return resultado

@router.get("/{usuario_id}", response_model=PregadorResponse)
def obter_pregador(usuario_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    pregador = db.query(PerfilPregador).filter(PerfilPregador.usuario_id == usuario_id).first()
    if not pregador:
        raise HTTPException(status_code=404, detail="Pregador não encontrado")
    return pregador

@router.put("/{usuario_id}", response_model=PregadorResponse)
def atualizar_pregador(usuario_id: str, data: PregadorUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_pregador)):
    pregador = db.query(PerfilPregador).filter(PerfilPregador.usuario_id == usuario_id).first()
    if not pregador:
        raise HTTPException(status_code=404, detail="Pregador não encontrado")
    
    # Verificar permissão
    if str(pregador.usuario_id) != str(current_user.id) and not current_user.tem_perfil("pastor_distrital"):
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(pregador, key, value)
    db.commit()
    db.refresh(pregador)
    return pregador
