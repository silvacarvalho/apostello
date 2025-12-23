"""
Serviço de Penalidades
"""
from typing import Optional
from datetime import datetime, timezone, date
from decimal import Decimal
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ForbiddenException
from app.models.penalidade import Penalidade, TipoPenalidade
from app.models.item_escala import ItemEscala
from app.models.usuario import Usuario
from app.models.historico_score import HistoricoScore, MotivoScore
from app.repositories.usuario_repository import UsuarioRepository


class PenalidadeService:
    """Serviço de penalidades"""

    # Valores de penalidade conforme RF09
    PENALIDADES = {
        TipoPenalidade.NAO_CONFIRMOU_PRAZO: Decimal("3.00"),  # Não confirmou no prazo
        TipoPenalidade.FALTA_SEM_AVISO: Decimal("12.00"),  # Não confirmou E não apareceu
        TipoPenalidade.DESMARCACAO_SEM_TROCA: Decimal("10.00"),
        TipoPenalidade.DESMARCACAO_48H: Decimal("5.00"),
        TipoPenalidade.ATRASO: Decimal("3.00"),
    }

    def __init__(self, db: Session):
        self.db = db
        self.usuario_repo = UsuarioRepository(db)

    def aplicar_penalidade(
        self,
        usuario_id: int,
        pastor_id: int,
        tipo: TipoPenalidade,
        motivo: str,
        item_escala_id: Optional[int] = None,
        data_validade: Optional[date] = None,
        valor_customizado: Optional[Decimal] = None
    ) -> Penalidade:
        """
        Aplica penalidade a um usuário e atualiza seu score
        """
        # Determinar valor da penalidade
        if tipo == TipoPenalidade.CUSTOM:
            if valor_customizado is None:
                raise ValueError("Penalidade customizada requer valor_customizado")
            valor = valor_customizado
        else:
            valor = self.PENALIDADES.get(tipo, Decimal("0.00"))

        # Criar penalidade
        penalidade = Penalidade(
            usuario_id=usuario_id,
            pastor_id=pastor_id,
            tipo=tipo,
            valor_subtracao=valor,
            motivo=motivo,
            data_aplicacao=date.today(),
            data_validade=data_validade,
            item_escala_id=item_escala_id,
            ativa=True
        )

        self.db.add(penalidade)
        self.db.flush()

        # Atualizar score do usuário
        self._recalcular_score_com_penalidade(usuario_id, penalidade)

        self.db.commit()
        self.db.refresh(penalidade)

        return penalidade

    def aplicar_penalidade_nao_confirmou(
        self,
        usuario_id: int,
        pastor_id: int,
        item_escala_id: int,
        motivo: str = "Não confirmou presença no prazo"
    ) -> Penalidade:
        """
        Aplica penalidade de -3 pontos por não confirmar no prazo
        """
        return self.aplicar_penalidade(
            usuario_id=usuario_id,
            pastor_id=pastor_id,
            tipo=TipoPenalidade.NAO_CONFIRMOU_PRAZO,
            motivo=motivo,
            item_escala_id=item_escala_id
        )

    def aplicar_penalidade_falta_sem_aviso(
        self,
        usuario_id: int,
        pastor_id: int,
        item_escala_id: int,
        motivo: str = "Não confirmou e não compareceu"
    ) -> Penalidade:
        """
        Aplica penalidade de -12 pontos por não confirmar E não comparecer
        """
        return self.aplicar_penalidade(
            usuario_id=usuario_id,
            pastor_id=pastor_id,
            tipo=TipoPenalidade.FALTA_SEM_AVISO,
            motivo=motivo,
            item_escala_id=item_escala_id
        )

    def _recalcular_score_com_penalidade(
        self, 
        usuario_id: int, 
        penalidade: Penalidade
    ):
        """
        Recalcula score do usuário após aplicar penalidade
        """
        usuario = self.usuario_repo.get_by_id(usuario_id)
        if not usuario:
            return

        score_anterior = float(usuario.score_atual or 70)
        
        # Calcular soma de penalidades ativas
        penalidades_ativas = self.db.query(Penalidade).filter(
            Penalidade.usuario_id == usuario_id,
            Penalidade.ativa == True
        ).all()

        total_penalidades = sum(float(p.valor_subtracao) for p in penalidades_ativas)

        # Score base (das avaliações)
        from app.models.avaliacao import Avaliacao
        avaliacoes = self.db.query(Avaliacao).filter(
            Avaliacao.avaliado_id == usuario_id
        ).all()

        if avaliacoes:
            medias = []
            for av in avaliacoes:
                media = (av.criterio_1 + av.criterio_2 + av.criterio_3 + 
                        av.criterio_4 + av.criterio_5) / 5
                medias.append(media)
            media_geral = sum(medias) / len(medias)
            score_base = media_geral * 20
        else:
            score_base = 70  # Score inicial

        # Calcular score final
        novo_score = score_base - total_penalidades
        novo_score = max(0, min(100, novo_score))  # Limitar entre 0 e 100

        # Atualizar score
        delta = novo_score - score_anterior
        self.usuario_repo.update_score(usuario_id, novo_score)

        # Registrar histórico
        historico = HistoricoScore(
            usuario_id=usuario_id,
            score_anterior=Decimal(str(score_anterior)),
            score_novo=Decimal(str(novo_score)),
            delta=Decimal(str(delta)),
            motivo_tipo=MotivoScore.PENALIDADE,
            referencia_id=penalidade.id,
            descricao=f"Penalidade aplicada: {penalidade.tipo.value} (-{penalidade.valor_subtracao} pontos)"
        )

        self.db.add(historico)
    
    def _recalcular_score_reverter_penalidade(
        self,
        usuario_id: int,
        penalidade: Penalidade
    ):
        """
        Recalcula score do usuário após reverter uma penalidade
        Remove o valor da penalidade do score
        """
        usuario = self.usuario_repo.get_by_id(usuario_id)
        if not usuario:
            return
        
        score_anterior = float(usuario.score_atual or 70)
        
        # Adicionar de volta os pontos da penalidade revertida
        novo_score = score_anterior + float(penalidade.valor_subtracao)
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
            motivo_tipo=MotivoScore.PENALIDADE,
            descricao=f"Penalidade revertida: {penalidade.tipo.value} (+{penalidade.valor_subtracao} pts)"
        )
        
        self.db.add(historico)
        self.db.commit()

    def desativar_penalidades_expiradas(self):
        """
        Desativa penalidades que passaram da data de validade
        """
        hoje = date.today()
        
        penalidades_expiradas = self.db.query(Penalidade).filter(
            Penalidade.ativa == True,
            Penalidade.data_validade.isnot(None),
            Penalidade.data_validade < hoje
        ).all()

        usuarios_afetados = set()
        
        for penalidade in penalidades_expiradas:
            penalidade.ativa = False
            usuarios_afetados.add(penalidade.usuario_id)

        # Recalcular score dos usuários afetados
        for usuario_id in usuarios_afetados:
            self._recalcular_score_usuario(usuario_id)

        self.db.commit()

        return len(penalidades_expiradas)

    def _recalcular_score_usuario(self, usuario_id: int):
        """
        Recalcula score completo do usuário
        """
        usuario = self.usuario_repo.get_by_id(usuario_id)
        if not usuario:
            return

        score_anterior = float(usuario.score_atual or 70)

        # Cálculo base (avaliações)
        from app.models.avaliacao import Avaliacao
        avaliacoes = self.db.query(Avaliacao).filter(
            Avaliacao.avaliado_id == usuario_id
        ).all()

        if avaliacoes:
            medias = []
            for av in avaliacoes:
                media = (av.criterio_1 + av.criterio_2 + av.criterio_3 + 
                        av.criterio_4 + av.criterio_5) / 5
                medias.append(media)
            media_geral = sum(medias) / len(medias)
            score_base = media_geral * 20
        else:
            score_base = 70

        # Subtrair penalidades ativas
        penalidades_ativas = self.db.query(Penalidade).filter(
            Penalidade.usuario_id == usuario_id,
            Penalidade.ativa == True
        ).all()

        total_penalidades = sum(float(p.valor_subtracao) for p in penalidades_ativas)

        # Score final
        novo_score = score_base - total_penalidades
        novo_score = max(0, min(100, novo_score))

        # Atualizar
        delta = novo_score - score_anterior
        self.usuario_repo.update_score(usuario_id, novo_score)

        # Registrar histórico
        historico = HistoricoScore(
            usuario_id=usuario_id,
            score_anterior=Decimal(str(score_anterior)),
            score_novo=Decimal(str(novo_score)),
            delta=Decimal(str(delta)),
            motivo_tipo=MotivoScore.RECALCULO,
            descricao=f"Recalculação de score - {len(penalidades_ativas)} penalidades ativas"
        )

        self.db.add(historico)
