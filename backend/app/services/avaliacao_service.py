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
from app.models.configuracao_distrito import ConfiguracaoDistrito
from app.models.escala import Escala
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
        
        # Buscar configuração do distrito para verificar prazo
        escala = self.db.query(Escala).filter(Escala.id == item.escala_id).first()
        if escala:
            config = self.db.query(ConfiguracaoDistrito).filter(
                ConfiguracaoDistrito.distrito_id == escala.distrito_id
            ).first()
            
            if config:
                prazo_dias = config.prazo_avaliacao_dias
                data_limite = item.data_culto + timedelta(days=prazo_dias)
                
                from datetime import date
                if date.today() > data_limite:
                    raise BadRequestException(
                        f"Prazo para avaliação expirado. O prazo era de {prazo_dias} dias após o culto "
                        f"(até {data_limite.strftime('%d/%m/%Y')})"
                    )
        
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
            confirmou_identidade=data.confirmou_identidade,
            comentario=data.comentario
        )
        
        self.db.add(avaliacao)
        self.db.flush()
        
        # Confirmação automática de presença através da avaliação
        if data.confirmou_identidade:
            self._processar_confirmacao_automatica(item, data.tipo, data.avaliado_id)
        
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
        from datetime import date
        from app.models.igreja import Igreja
        
        # Buscar distrito da igreja para obter configuração
        igreja = self.db.query(Igreja).filter(Igreja.id == igreja_id).first()
        if not igreja:
            return []
        
        # Buscar configuração do distrito
        config = self.db.query(ConfiguracaoDistrito).filter(
            ConfiguracaoDistrito.distrito_id == igreja.distrito_id
        ).first()
        
        # Usar prazo configurado ou padrão de 7 dias
        prazo_dias = config.prazo_avaliacao_dias if config else 7
        data_limite = date.today() - timedelta(days=prazo_dias)
        
        # Subquery de itens já avaliados pelo usuário
        avaliados_ids = self.db.query(Avaliacao.item_escala_id).filter(
            Avaliacao.avaliador_id == avaliador_id
        ).subquery()
        
        # Buscar itens pendentes dentro do prazo
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
            observacao=f"Nova avaliação recebida (média {media_geral:.2f}/5)"
        )
        
        self.db.add(historico)
        self.db.commit()
    
    def _processar_confirmacao_automatica(
        self, 
        item: ItemEscala, 
        tipo: TipoAvaliado,
        avaliado_id: int
    ):
        """
        Processa confirmação automática de presença através da avaliação
        Quando um membro avalia confirmando a identidade, marca automaticamente como CONFIRMADO
        """
        from app.models.item_escala import StatusConfirmacao
        from app.models.notificacao import TipoNotificacao
        from app.services.notificacao_service import NotificacaoService
        
        confirmacao_realizada = False
        
        if tipo == TipoAvaliado.PREGADOR and item.pregador_id == avaliado_id:
            if item.status_confirmacao_pregador != StatusConfirmacao.CONFIRMADO:
                item.status_confirmacao_pregador = StatusConfirmacao.CONFIRMADO
                item.data_confirmacao_pregador = datetime.now()
                confirmacao_realizada = True
        
        elif tipo == TipoAvaliado.CANTOR and item.cantor_id == avaliado_id:
            if item.status_confirmacao_cantor != StatusConfirmacao.CONFIRMADO:
                item.status_confirmacao_cantor = StatusConfirmacao.CONFIRMADO
                item.data_confirmacao_cantor = datetime.now()
                confirmacao_realizada = True
        
        if confirmacao_realizada:
            # Reverter penalidade NAO_CONFIRMOU_PRAZO se existir
            from app.models.penalidade import Penalidade, TipoPenalidade
            
            penalidade_nao_confirmou = self.db.query(Penalidade).filter(
                Penalidade.item_escala_id == item.id,
                Penalidade.usuario_id == avaliado_id,
                Penalidade.tipo == TipoPenalidade.NAO_CONFIRMOU_PRAZO,
                Penalidade.ativa == True
            ).first()
            
            if penalidade_nao_confirmou:
                # Desativar penalidade pois a pessoa compareceu
                penalidade_nao_confirmou.ativa = False
                penalidade_nao_confirmou.motivo += " - REVERTIDA: Confirmado comparecimento via avaliação"
                
                # Recalcular score removendo a penalidade
                from app.services.penalidade_service import PenalidadeService
                penalidade_service = PenalidadeService(self.db)
                penalidade_service._recalcular_score_reverter_penalidade(
                    avaliado_id, 
                    penalidade_nao_confirmou
                )
            
            # Notificar pastor sobre confirmação automática
            escala = self.db.query(Escala).filter(Escala.id == item.escala_id).first()
            if escala and escala.pastor_id:
                notificacao_service = NotificacaoService(self.db)
                usuario = self.db.query(Usuario).filter(Usuario.id == avaliado_id).first()
                
                from app.models.igreja import Igreja
                igreja = self.db.query(Igreja).filter(Igreja.id == item.igreja_id).first()
                
                notificacao_service.create(
                    usuario_id=escala.pastor_id,
                    tipo=TipoNotificacao.CONFIRMACAO,
                    titulo=f"✅ Presença Confirmada Automaticamente",
                    mensagem=f"{usuario.nome_completo if usuario else 'Usuário'} ({tipo.value}) "
                            f"teve presença confirmada através de avaliação dos membros em "
                            f"{igreja.nome if igreja else 'igreja'} no dia {item.data_culto.strftime('%d/%m/%Y')}.",
                    link=f"/escalas/{escala.id}/detalhes"
                )
        
        self.db.commit()
