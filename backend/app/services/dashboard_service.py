"""
Serviço de Dashboard
"""
from typing import List, Optional
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from app.models.usuario import Usuario, TipoUsuario, StatusGeral, StatusAprovacao
from app.models.escala import Escala, StatusEscala
from app.models.item_escala import ItemEscala, StatusConfirmacao, StatusRealizacao
from app.models.distrito import Distrito
from app.models.igreja import Igreja
from app.models.avaliacao import Avaliacao
from app.schemas.dashboard import (
    DashboardResponse, DashboardAdmin, DashboardPastor,
    DashboardPregadorCantor, DashboardMembro,
    StatCard, ProximoEvento, TopPregador, EscalaDistritoSummary
)


class DashboardService:
    """Serviço para gerar dados do dashboard"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_dashboard(self, current_user: Usuario) -> DashboardResponse:
        """Retorna dashboard baseado no tipo de usuário"""
        
        if current_user.tipo == TipoUsuario.ADMIN:
            return DashboardResponse(
                tipo_usuario="ADMIN",
                admin=self._get_admin_dashboard(current_user)
            )
        elif current_user.tipo == TipoUsuario.PASTOR_DISTRITAL:
            return DashboardResponse(
                tipo_usuario="PASTOR_DISTRITAL",
                pastor=self._get_pastor_dashboard(current_user)
            )
        elif current_user.tipo in [TipoUsuario.PREGADOR, TipoUsuario.CANTOR]:
            return DashboardResponse(
                tipo_usuario=current_user.tipo.value,
                pregador_cantor=self._get_pregador_cantor_dashboard(current_user)
            )
        else:  # MEMBRO
            return DashboardResponse(
                tipo_usuario="MEMBRO",
                membro=self._get_membro_dashboard(current_user)
            )
    
    def _get_admin_dashboard(self, user: Usuario) -> DashboardAdmin:
        """Dashboard para administrador"""
        hoje = date.today()
        mes_atual = hoje.month
        ano_atual = hoje.year
        
        # Contar totais
        total_distritos = self.db.query(func.count(Distrito.id)).filter(
            Distrito.ativo == True
        ).scalar() or 0
        
        total_igrejas = self.db.query(func.count(Igreja.id)).filter(
            Igreja.ativo == True
        ).scalar() or 0
        
        total_pregadores = self.db.query(func.count(Usuario.id)).filter(
            Usuario.tipo == TipoUsuario.PREGADOR,
            Usuario.status == StatusGeral.ATIVO,
            Usuario.status_aprovacao == StatusAprovacao.APROVADO
        ).scalar() or 0
        
        total_cantores = self.db.query(func.count(Usuario.id)).filter(
            Usuario.tipo == TipoUsuario.CANTOR,
            Usuario.status == StatusGeral.ATIVO,
            Usuario.status_aprovacao == StatusAprovacao.APROVADO
        ).scalar() or 0
        
        # Stats cards
        stats_cards = [
            StatCard(
                title="Total de Distritos",
                value=str(total_distritos),
                change="Ativos",
                icon="building"
            ),
            StatCard(
                title="Igrejas Ativas",
                value=str(total_igrejas),
                change=f"{total_distritos} distritos",
                icon="church"
            ),
            StatCard(
                title="Total de Pregadores",
                value=str(total_pregadores),
                change="Ativos",
                icon="users"
            ),
            StatCard(
                title="Total de Cantores",
                value=str(total_cantores),
                change="Ativos",
                icon="music"
            ),
        ]
        
        # Escalas do mês atual
        escalas_mes = self.db.query(Escala).filter(
            Escala.mes == mes_atual,
            Escala.ano == ano_atual
        ).all()
        
        escalas_summary = []
        for escala in escalas_mes:
            distrito = self.db.query(Distrito).filter(Distrito.id == escala.distrito_id).first()
            if distrito:
                total_cultos = self.db.query(func.count(ItemEscala.id)).filter(
                    ItemEscala.escala_id == escala.id
                ).scalar() or 0
                
                pregadores_unicos = self.db.query(func.count(func.distinct(ItemEscala.pregador_id))).filter(
                    ItemEscala.escala_id == escala.id,
                    ItemEscala.pregador_id.isnot(None)
                ).scalar() or 0
                
                escalas_summary.append(EscalaDistritoSummary(
                    distrito_id=distrito.id,
                    distrito_nome=distrito.nome,
                    status=escala.status.value,
                    total_cultos=total_cultos,
                    total_pregadores=pregadores_unicos
                ))
        
        # Top pregadores
        top_pregadores_query = self.db.query(Usuario).filter(
            Usuario.tipo == TipoUsuario.PREGADOR,
            Usuario.status == StatusGeral.ATIVO,
            Usuario.status_aprovacao == StatusAprovacao.APROVADO
        ).order_by(desc(Usuario.score_atual)).limit(10)
        
        top_pregadores = [
            TopPregador(
                id=u.id,
                nome=u.nome_completo,
                score=u.score_atual,
                participacoes=u.contador_total_participacoes
            ) for u in top_pregadores_query
        ]
        
        # Top cantores
        top_cantores_query = self.db.query(Usuario).filter(
            Usuario.tipo == TipoUsuario.CANTOR,
            Usuario.status == StatusGeral.ATIVO,
            Usuario.status_aprovacao == StatusAprovacao.APROVADO
        ).order_by(desc(Usuario.score_atual)).limit(10)
        
        top_cantores = [
            TopPregador(
                id=u.id,
                nome=u.nome_completo,
                score=u.score_atual,
                participacoes=u.contador_total_participacoes
            ) for u in top_cantores_query
        ]
        
        # Calcular taxas
        total_itens_realizados = self.db.query(func.count(ItemEscala.id)).filter(
            ItemEscala.status_realizacao == StatusRealizacao.REALIZADO
        ).scalar() or 0
        
        total_avaliacoes = self.db.query(func.count(Avaliacao.id)).scalar() or 0
        taxa_avaliacao = (total_avaliacoes / total_itens_realizados * 100) if total_itens_realizados > 0 else 0
        
        total_itens_agendados = self.db.query(func.count(ItemEscala.id)).filter(
            ItemEscala.data_culto < hoje
        ).scalar() or 0
        
        taxa_comparecimento = (total_itens_realizados / total_itens_agendados * 100) if total_itens_agendados > 0 else 0
        
        return DashboardAdmin(
            stats_cards=stats_cards,
            escalas_mes_atual=escalas_summary,
            top_pregadores=top_pregadores,
            top_cantores=top_cantores,
            taxa_avaliacao=round(taxa_avaliacao, 1),
            taxa_comparecimento=round(taxa_comparecimento, 1)
        )
    
    def _get_pastor_dashboard(self, user: Usuario) -> DashboardPastor:
        """Dashboard para pastor distrital"""
        hoje = date.today()
        
        # Contar entidades do distrito
        total_igrejas = self.db.query(func.count(Igreja.id)).filter(
            Igreja.distrito_id == user.distrito_id,
            Igreja.ativo == True
        ).scalar() or 0
        
        total_pregadores = self.db.query(func.count(Usuario.id)).filter(
            Usuario.distrito_id == user.distrito_id,
            Usuario.tipo == TipoUsuario.PREGADOR,
            Usuario.status == StatusGeral.ATIVO,
            Usuario.status_aprovacao == StatusAprovacao.APROVADO
        ).scalar() or 0
        
        total_cantores = self.db.query(func.count(Usuario.id)).filter(
            Usuario.distrito_id == user.distrito_id,
            Usuario.tipo == TipoUsuario.CANTOR,
            Usuario.status == StatusGeral.ATIVO,
            Usuario.status_aprovacao == StatusAprovacao.APROVADO
        ).scalar() or 0
        
        # Escala atual
        escala_atual = self.db.query(Escala).filter(
            Escala.distrito_id == user.distrito_id,
            Escala.mes == hoje.month,
            Escala.ano == hoje.year
        ).first()
        
        escala_status = escala_atual.status.value if escala_atual else "SEM_ESCALA"
        
        stats_cards = [
            StatCard(
                title="Igrejas",
                value=str(total_igrejas),
                change="No distrito",
                icon="church"
            ),
            StatCard(
                title="Pregadores",
                value=str(total_pregadores),
                change="Ativos",
                icon="users"
            ),
            StatCard(
                title="Cantores",
                value=str(total_cantores),
                change="Ativos",
                icon="music"
            ),
            StatCard(
                title="Escala Atual",
                value=escala_status,
                change=f"{hoje.strftime('%B %Y')}",
                icon="calendar"
            ),
        ]
        
        # Próximos cultos (próximos 7 dias)
        data_fim = hoje + timedelta(days=7)
        proximos_itens = self.db.query(ItemEscala).join(
            Escala, ItemEscala.escala_id == Escala.id
        ).join(
            Igreja, ItemEscala.igreja_id == Igreja.id
        ).filter(
            Escala.distrito_id == user.distrito_id,
            ItemEscala.data_culto >= hoje,
            ItemEscala.data_culto <= data_fim
        ).order_by(ItemEscala.data_culto, ItemEscala.horario).limit(10).all()
        
        proximos_cultos = []
        for item in proximos_itens:
            igreja = self.db.query(Igreja).filter(Igreja.id == item.igreja_id).first()
            pregador = None
            if item.pregador_id:
                pregador = self.db.query(Usuario).filter(Usuario.id == item.pregador_id).first()
            
            status = "confirmed" if item.status_confirmacao == StatusConfirmacao.CONFIRMADO else "pending"
            tipo = "Pregação" if pregador else "Culto"
            
            proximos_cultos.append(ProximoEvento(
                id=item.id,
                date=item.data_culto.strftime("%d/%m/%Y"),
                time=item.horario,
                church=igreja.nome if igreja else "Igreja",
                type=tipo,
                status=status,
                confirmado=item.status_confirmacao == StatusConfirmacao.CONFIRMADO
            ))
        
        # Pendências
        confirmacoes_pendentes = self.db.query(func.count(ItemEscala.id)).join(
            Escala, ItemEscala.escala_id == Escala.id
        ).filter(
            Escala.distrito_id == user.distrito_id,
            ItemEscala.data_culto >= hoje,
            ItemEscala.status_confirmacao == StatusConfirmacao.PENDENTE
        ).scalar() or 0
        
        pendencias = {
            "confirmacoes_pendentes": confirmacoes_pendentes,
            "trocas_pendentes": 0  # TODO: implementar quando tiver tabela de trocas
        }
        
        # Pregadores com score em queda (simplificado)
        pregadores_score_queda = []
        
        return DashboardPastor(
            stats_cards=stats_cards,
            proximos_cultos=proximos_cultos,
            pendencias=pendencias,
            pregadores_score_queda=pregadores_score_queda
        )
    
    def _get_pregador_cantor_dashboard(self, user: Usuario) -> DashboardPregadorCantor:
        """Dashboard para pregador/cantor"""
        hoje = date.today()
        
        # Próximas pregações
        coluna_usuario = ItemEscala.pregador_id if user.tipo == TipoUsuario.PREGADOR else ItemEscala.cantor_id
        
        proximos_itens = self.db.query(ItemEscala).join(
            Igreja, ItemEscala.igreja_id == Igreja.id
        ).filter(
            coluna_usuario == user.id,
            ItemEscala.data_culto >= hoje
        ).order_by(ItemEscala.data_culto, ItemEscala.horario).limit(10).all()
        
        proximos_eventos = []
        for item in proximos_itens:
            igreja = self.db.query(Igreja).filter(Igreja.id == item.igreja_id).first()
            status = "confirmed" if item.status_confirmacao == StatusConfirmacao.CONFIRMADO else "pending"
            tipo = "Pregação" if user.tipo == TipoUsuario.PREGADOR else "Louvor Especial"
            
            proximos_eventos.append(ProximoEvento(
                id=item.id,
                date=item.data_culto.strftime("%d/%m/%Y"),
                time=item.horario,
                church=igreja.nome if igreja else "Igreja",
                type=tipo,
                status=status,
                confirmado=item.status_confirmacao == StatusConfirmacao.CONFIRMADO
            ))
        
        # Participações
        inicio_mes = date(hoje.year, hoje.month, 1)
        participacoes_mes = user.contador_mes_atual
        
        inicio_ano = date(hoje.year, 1, 1)
        participacoes_ano = self.db.query(func.count(ItemEscala.id)).filter(
            coluna_usuario == user.id,
            ItemEscala.data_culto >= inicio_ano,
            ItemEscala.data_culto <= hoje,
            ItemEscala.status_realizacao == StatusRealizacao.REALIZADO
        ).scalar() or 0
        
        participacoes_total = user.contador_total_participacoes
        
        # Calcular média de avaliações
        avaliacoes = self.db.query(Avaliacao).filter(
            Avaliacao.avaliado_id == user.id
        ).all()
        
        media_avaliacoes = None
        if avaliacoes:
            notas = [a.nota for a in avaliacoes]
            media_avaliacoes = {
                "geral": round(sum(notas) / len(notas), 1) if notas else 0,
                "total_avaliacoes": len(notas)
            }
        
        stats_cards = [
            StatCard(
                title=f"Próximas {'Pregações' if user.tipo == TipoUsuario.PREGADOR else 'Apresentações'}",
                value=str(len(proximos_eventos)),
                change="Agendadas",
                icon="calendar"
            ),
            StatCard(
                title="Score Atual",
                value=f"{user.score_atual:.1f}",
                change="de 100 pontos",
                icon="star"
            ),
            StatCard(
                title=f"{'Pregações' if user.tipo == TipoUsuario.PREGADOR else 'Apresentações'} Realizadas",
                value=str(participacoes_total),
                change="Total",
                icon="check"
            ),
            StatCard(
                title="Avaliação Média",
                value=f"{media_avaliacoes['geral']}" if media_avaliacoes else "N/A",
                change=f"{media_avaliacoes['total_avaliacoes']} avaliações" if media_avaliacoes else "Sem avaliações",
                icon="star"
            ),
        ]
        
        return DashboardPregadorCantor(
            stats_cards=stats_cards,
            proximos_eventos=proximos_eventos,
            score_atual=user.score_atual,
            media_avaliacoes=media_avaliacoes,
            participacoes_mes=participacoes_mes,
            participacoes_ano=participacoes_ano,
            participacoes_total=participacoes_total
        )
    
    def _get_membro_dashboard(self, user: Usuario) -> DashboardMembro:
        """Dashboard para membro"""
        hoje = date.today()
        
        # Informações da igreja e distrito
        igreja = None
        distrito = None
        
        if user.igreja_id:
            igreja = self.db.query(Igreja).filter(Igreja.id == user.igreja_id).first()
            if igreja:
                distrito = self.db.query(Distrito).filter(Distrito.id == igreja.distrito_id).first()
        
        # Avaliações feitas este mês
        inicio_mes = date(hoje.year, hoje.month, 1)
        avaliacoes_mes = self.db.query(func.count(Avaliacao.id)).filter(
            Avaliacao.avaliador_id == user.id,
            Avaliacao.criado_em >= inicio_mes
        ).scalar() or 0
        
        # Próximos cultos da igreja
        data_fim = hoje + timedelta(days=7)
        proximos_itens = []
        
        if user.igreja_id:
            proximos_itens = self.db.query(ItemEscala).filter(
                ItemEscala.igreja_id == user.igreja_id,
                ItemEscala.data_culto >= hoje,
                ItemEscala.data_culto <= data_fim
            ).order_by(ItemEscala.data_culto, ItemEscala.horario).limit(10).all()
        
        proximos_cultos = []
        for item in proximos_itens:
            igreja_item = self.db.query(Igreja).filter(Igreja.id == item.igreja_id).first()
            pregador = None
            if item.pregador_id:
                pregador = self.db.query(Usuario).filter(Usuario.id == item.pregador_id).first()
            
            proximos_cultos.append(ProximoEvento(
                id=item.id,
                date=item.data_culto.strftime("%d/%m/%Y"),
                time=item.horario,
                church=igreja_item.nome if igreja_item else "Igreja",
                type="Culto",
                status="scheduled",
                confirmado=True
            ))
        
        # Avaliações pendentes (cultos já realizados sem avaliação)
        itens_realizados = self.db.query(ItemEscala).filter(
            ItemEscala.igreja_id == user.igreja_id,
            ItemEscala.data_culto < hoje,
            ItemEscala.status_realizacao == StatusRealizacao.REALIZADO
        ).all()
        
        avaliacoes_pendentes = 0
        for item in itens_realizados:
            avaliacao_existe = self.db.query(Avaliacao).filter(
                Avaliacao.item_escala_id == item.id,
                Avaliacao.avaliador_id == user.id
            ).first()
            if not avaliacao_existe and item.pregador_id:
                avaliacoes_pendentes += 1
        
        stats_cards = [
            StatCard(
                title="Cultos Avaliados",
                value=str(avaliacoes_mes),
                change="Este mês",
                icon="star"
            ),
            StatCard(
                title="Próximos Cultos",
                value=str(len(proximos_cultos)),
                change="Esta semana",
                icon="calendar"
            ),
            StatCard(
                title="Avaliações Pendentes",
                value=str(avaliacoes_pendentes),
                change="Aguardando feedback",
                icon="clock"
            ),
            StatCard(
                title="Igreja",
                value=igreja.nome[:15] + "..." if igreja and len(igreja.nome) > 15 else (igreja.nome if igreja else "N/A"),
                change=distrito.nome if distrito else "Sem distrito",
                icon="church"
            ),
        ]
        
        return DashboardMembro(
            stats_cards=stats_cards,
            proximos_cultos=proximos_cultos,
            avaliacoes_pendentes=avaliacoes_pendentes,
            igreja_nome=igreja.nome if igreja else None,
            distrito_nome=distrito.nome if distrito else None
        )
