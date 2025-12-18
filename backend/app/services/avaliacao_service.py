"""
Serviço de Avaliação
"""
from typing import List, Optional
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.core.exceptions import (
    NotFoundException, BadRequestException, 
    ForbiddenException
)
from app.models.avaliacao import Avaliacao, TipoAvaliado
from app.models.item_escala import ItemEscala, StatusRealizacao
from app.models.usuario import Usuario, TipoUsuario
from app.models.historico_score import HistoricoScore, MotivoScore
from app.schemas.avaliacao import AvaliacaoCreate
from app.repositories.usuario_repository import UsuarioRepository


class AvaliacaoService:
    """Serviço de avaliações"""

    def __init__(self, db: Session):
        self.db = db
        self.usuario_repo = UsuarioRepository(db)

    def create(self, data: AvaliacaoCreate, avaliador: Usuario) -> Avaliacao:
        """Cria nova avaliação"""
        # Verificar item da escala
        item = self.db.query(ItemEscala).filter(
            ItemEscala.id == data.item_escala_id
        ).first()
        
        if not item:
            raise NotFoundException("Item de escala", data.item_escala_id)
        
        # Verificar se culto foi realizado
        if item.status_realizacao != StatusRealizacao.REALIZADO:
            raise BadRequestException("Só é possível avaliar cultos realizados")
        
        # Verificar se avaliador é membro da igreja
        if avaliador.tipo != TipoUsuario.MEMBRO:
            raise ForbiddenException("Apenas membros podem avaliar")
        
        if avaliador.igreja_id != item.igreja_id:
            raise ForbiddenException("Você só pode avaliar cultos da sua igreja")
        
        # Verificar se já avaliou
        existing = self.db.query(Avaliacao).filter(
            Avaliacao.item_escala_id == data.item_escala_id,
            Avaliacao.avaliado_id == data.avaliado_id,
            Avaliacao.avaliador_id == avaliador.id
        ).first()
        
        if existing:
            raise BadRequestException("Você já avaliou esta pessoa neste culto")
        
        # Verificar se avaliado participou do culto
        if data.tipo == TipoAvaliado.PREGADOR:
            if item.pregador_id != data.avaliado_id:
                raise BadRequestException("Este pregador não participou deste culto")
        else:
            if item.cantor_id != data.avaliado_id:
                raise BadRequestException("Este cantor não participou deste culto")
        
        # Criar avaliação
        avaliacao = Avaliacao(
            item_escala_id=data.item_escala_id,
            avaliado_id=data.avaliado_id,
            avaliador_id=avaliador.id,
            tipo=data.tipo,
            criterio_1=data.criterio_1,
            criterio_2=data.criterio_2,
            criterio_3=data.criterio_3,
            criterio_4=data.criterio_4,
            criterio_5=data.criterio_5,
            comentario=data.comentario
        )
        
        self.db.add(avaliacao)
        self.db.commit()
        self.db.refresh(avaliacao)
        
        # Recalcular score do avaliado
        self._recalcular_score(data.avaliado_id, avaliacao)
        
        return avaliacao

    def get_by_id(self, avaliacao_id: int) -> Avaliacao:
        """Busca avaliação por ID"""
        avaliacao = self.db.query(Avaliacao).filter(
            Avaliacao.id == avaliacao_id
        ).first()
        
        if not avaliacao:
            raise NotFoundException("Avaliação", avaliacao_id)
        
        return avaliacao

    def list_by_avaliado(
        self, 
        avaliado_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[List[Avaliacao], int, Decimal]:
        """Lista avaliações de um avaliado"""
        query = self.db.query(Avaliacao).filter(
            Avaliacao.avaliado_id == avaliado_id
        )
        
        total = query.count()
        avaliacoes = query.order_by(
            Avaliacao.created_at.desc()
        ).offset(skip).limit(limit).all()
        
        # Calcular média geral
        if total > 0:
            media = sum(
                (a.criterio_1 + a.criterio_2 + a.criterio_3 + a.criterio_4 + a.criterio_5) / 5
                for a in avaliacoes
            ) / len(avaliacoes)
        else:
            media = Decimal("0")
        
        return avaliacoes, total, Decimal(str(media)).quantize(Decimal("0.01"))

    def list_by_item(self, item_escala_id: int) -> List[Avaliacao]:
        """Lista avaliações de um item de escala"""
        return self.db.query(Avaliacao).filter(
            Avaliacao.item_escala_id == item_escala_id
        ).all()

    def get_pendentes_avaliacao(
        self, 
        igreja_id: int, 
        avaliador_id: int
    ) -> List[ItemEscala]:
        """Lista itens pendentes de avaliação para um membro"""
        # Buscar cultos realizados nos últimos 7 dias que o membro não avaliou
        from datetime import date
        
        data_limite = date.today() - timedelta(days=7)
        
        # Subquery de itens já avaliados pelo usuário
        avaliados_ids = self.db.query(Avaliacao.item_escala_id).filter(
            Avaliacao.avaliador_id == avaliador_id
        ).subquery()
        
        return self.db.query(ItemEscala).filter(
            ItemEscala.igreja_id == igreja_id,
            ItemEscala.status_realizacao == StatusRealizacao.REALIZADO,
            ItemEscala.data_culto >= data_limite,
            ~ItemEscala.id.in_(avaliados_ids)
        ).order_by(ItemEscala.data_culto.desc()).all()

    def _recalcular_score(self, usuario_id: int, nova_avaliacao: Avaliacao):
        """Recalcula score do usuário baseado nas avaliações"""
        usuario = self.usuario_repo.get_by_id(usuario_id)
        if not usuario:
            return
        
        score_anterior = float(usuario.score_atual or 70)
        
        # Buscar todas as avaliações do usuário
        avaliacoes = self.db.query(Avaliacao).filter(
            Avaliacao.avaliado_id == usuario_id
        ).all()
        
        if not avaliacoes:
            return
        
        # Calcular média geral das avaliações
        medias = []
        for av in avaliacoes:
            media = (av.criterio_1 + av.criterio_2 + av.criterio_3 + av.criterio_4 + av.criterio_5) / 5
            medias.append(media)
        
        media_geral = sum(medias) / len(medias)
        
        # Converter média (1-5) para score (0-100)
        # Média 3 = 60 pontos (base), Média 5 = 100 pontos, Média 1 = 20 pontos
        novo_score = media_geral * 20
        
        # Limitar entre 0 e 100
        novo_score = max(0, min(100, novo_score))
        
        # Atualizar score
        delta = novo_score - score_anterior
        self.usuario_repo.update_score(usuario_id, novo_score)
        
        # Registrar histórico
        historico = HistoricoScore(
            usuario_id=usuario_id,
            score_anterior=Decimal(str(score_anterior)),
            score_novo=Decimal(str(novo_score)),
            delta=Decimal(str(delta)),
            motivo_tipo=MotivoScore.AVALIACAO,
            referencia_id=nova_avaliacao.id,
            descricao=f"Avaliação recebida - média {media_geral:.2f}"
        )
        
        self.db.add(historico)
        self.db.commit()
