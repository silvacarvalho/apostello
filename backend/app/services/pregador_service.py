"""
Service: Pregador
Lógica de negócio para pregadores
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from app.models import PerfilPregador, Avaliacao, Pregacao


def recalcular_score(db: Session, pregador_id: str) -> Decimal:
    """
    Recalcula o score de um pregador baseado na fórmula:
    SCORE = (Média_Avaliações × 0.6) + (Taxa_Frequência × 0.25) + (Taxa_Pontualidade × 0.15)
    """
    # Buscar perfil
    perfil = db.query(PerfilPregador).filter(PerfilPregador.usuario_id == pregador_id).first()
    if not perfil:
        return Decimal("0.00")
    
    # Buscar média de avaliações
    media_avaliacoes = db.query(func.avg(Avaliacao.nota)).filter(
        Avaliacao.pregador_id == pregador_id
    ).scalar() or Decimal("0.00")
    
    # Taxa de frequência (0-100 convertido para 0-5)
    taxa_freq_normalizada = (perfil.taxa_frequencia / 100) * 5
    
    # Taxa de pontualidade (0-100 convertido para 0-5)
    taxa_pont_normalizada = (perfil.taxa_pontualidade / 100) * 5
    
    # Calcular score final
    score_final = (
        (Decimal(str(media_avaliacoes)) * Decimal("0.6")) +
        (Decimal(str(taxa_freq_normalizada)) * Decimal("0.25")) +
        (Decimal(str(taxa_pont_normalizada)) * Decimal("0.15"))
    )
    
    # Atualizar perfil
    perfil.score_medio = round(score_final, 2)
    perfil.score_avaliacoes = round(Decimal(str(media_avaliacoes)), 2)
    perfil.score_frequencia = round(Decimal(str(taxa_freq_normalizada)), 2)
    perfil.score_pontualidade = round(Decimal(str(taxa_pont_normalizada)), 2)
    
    db.commit()
    db.refresh(perfil)
    
    return perfil.score_medio


def aplicar_penalizacao_recusa(db: Session, pregador_id: str) -> None:
    """Aplica penalização de 15% no score ao recusar pregação"""
    perfil = db.query(PerfilPregador).filter(PerfilPregador.usuario_id == pregador_id).first()
    if not perfil:
        return
    
    # Reduzir score em 15%
    perfil.score_medio = perfil.score_medio - (perfil.score_medio * Decimal("0.15"))
    perfil.score_medio = round(perfil.score_medio, 2)
    
    db.commit()
    
    # Atualizar estatísticas
    atualizar_estatisticas(db, pregador_id)


def atualizar_estatisticas(db: Session, pregador_id: str) -> None:
    """Atualiza estatísticas do pregador (totais, taxas)"""
    perfil = db.query(PerfilPregador).filter(PerfilPregador.usuario_id == pregador_id).first()
    if not perfil:
        return
    
    # Contar pregações
    total = db.query(func.count(Pregacao.id)).filter(Pregacao.pregador_id == pregador_id).scalar() or 0
    realizadas = db.query(func.count(Pregacao.id)).filter(
        Pregacao.pregador_id == pregador_id,
        Pregacao.status == "realizado"
    ).scalar() or 0
    faltou = db.query(func.count(Pregacao.id)).filter(
        Pregacao.pregador_id == pregador_id,
        Pregacao.status == "faltou"
    ).scalar() or 0
    recusadas = db.query(func.count(Pregacao.id)).filter(
        Pregacao.pregador_id == pregador_id,
        Pregacao.status == "recusado"
    ).scalar() or 0
    
    # Atualizar totais
    perfil.total_pregacoes = total
    perfil.pregacoes_realizadas = realizadas
    perfil.pregacoes_faltou = faltou
    perfil.pregacoes_recusadas = recusadas
    
    # Calcular taxa de frequência
    if total > 0:
        perfil.taxa_frequencia = round(Decimal((realizadas / total) * 100), 2)
    else:
        perfil.taxa_frequencia = Decimal("100.00")
    
    db.commit()
    
    # Recalcular score
    recalcular_score(db, pregador_id)
