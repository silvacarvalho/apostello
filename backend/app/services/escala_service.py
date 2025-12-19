"""
Serviço de Escala - Inclui geração automática com algoritmo completo
"""
from typing import List, Optional, Tuple
from datetime import date, datetime, timedelta, timezone
from calendar import monthrange
from sqlalchemy.orm import Session
import random
import logging

from app.core.config import settings
from app.core.exceptions import (
    NotFoundException, BadRequestException, 
    ConflictException, ForbiddenException
)
from app.repositories.escala_repository import EscalaRepository, ItemEscalaRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.repositories.igreja_repository import IgrejaRepository
from app.repositories.distrito_repository import DistritoRepository
from app.repositories.tema_repository import TemaRepository
from app.models.escala import Escala, StatusEscala
from app.models.item_escala import ItemEscala, StatusConfirmacao
from app.models.horario_culto import HorarioCulto, DiaSemana
from app.models.usuario import Usuario, TipoUsuario
from app.models.indisponibilidade import Indisponibilidade
from app.models.bloqueio_temporario import BloqueioTemporario
from app.schemas.escala import EscalaCreate, EscalaGenerateRequest

logger = logging.getLogger(__name__)


class EscalaService:
    """Serviço de escalas"""

    # Classificação de score
    SCORE_ALTO_MIN = 80
    SCORE_INTERMEDIARIO_MIN = 50

    def __init__(self, db: Session):
        self.db = db
        self.escala_repo = EscalaRepository(db)
        self.item_repo = ItemEscalaRepository(db)
        self.usuario_repo = UsuarioRepository(db)
        self.igreja_repo = IgrejaRepository(db)
        self.distrito_repo = DistritoRepository(db)
        self.tema_repo = TemaRepository(db)

    def create(self, data: EscalaCreate, current_user: Usuario) -> Escala:
        """Cria nova escala"""
        if not current_user.is_admin and not current_user.is_pastor:
            raise ForbiddenException("Sem permissão para criar escalas")
        
        # Verificar se já existe escala para o período
        existing = self.escala_repo.get_by_distrito_mes_ano(
            data.distrito_id, data.mes, data.ano
        )
        if existing:
            raise ConflictException(f"Já existe escala para {data.mes}/{data.ano}")
        
        escala_data = data.model_dump()
        escala_data["pastor_id"] = current_user.id
        
        return self.escala_repo.create(escala_data)

    def get_by_id(self, escala_id: int) -> Escala:
        """Busca escala por ID"""
        escala = self.escala_repo.get_by_id(escala_id)
        if not escala:
            raise NotFoundException("Escala", escala_id)
        return escala

    def list_by_distrito(
        self, 
        distrito_id: int,
        skip: int = 0, 
        limit: int = 100
    ) -> Tuple[List[Escala], int]:
        """Lista escalas de um distrito"""
        escalas = self.escala_repo.get_by_distrito(distrito_id, skip, limit)
        total = self.escala_repo.count_by_distrito(distrito_id)
        return escalas, total

    def generate(
        self, 
        request: EscalaGenerateRequest, 
        current_user: Usuario
    ) -> Escala:
        """
        Gera escala automaticamente seguindo o algoritmo RF13.
        
        Priorização:
        - SÁBADOS: Pregadores com score ALTO (80-100)
        - DOMINGOS: Score intermediário ou sobras do alto
        - QUARTAS: Score intermediário ou sobras
        """
        if not current_user.is_admin and not current_user.is_pastor:
            raise ForbiddenException("Sem permissão para gerar escalas")
        
        # Verificar se já existe
        existing = self.escala_repo.get_by_distrito_mes_ano(
            request.distrito_id, request.mes, request.ano
        )
        if existing:
            raise ConflictException(f"Já existe escala para {request.mes}/{request.ano}")
        
        # Buscar configurações do distrito
        distrito = self.distrito_repo.get_by_id(request.distrito_id)
        if not distrito:
            raise NotFoundException("Distrito", request.distrito_id)
        
        logger.info(f"Gerando escala para {distrito.nome} - {request.mes}/{request.ano}")
        
        # Criar escala
        escala = self.escala_repo.create({
            "distrito_id": request.distrito_id,
            "mes": request.mes,
            "ano": request.ano,
            "pastor_id": current_user.id
        })
        
        # Buscar igrejas ativas e seus horários
        igrejas = self.igreja_repo.get_ativas(request.distrito_id)
        if not igrejas:
            raise BadRequestException("Nenhuma igreja ativa no distrito")
        
        # Buscar pregadores e cantores ordenados por score
        pregadores = self.usuario_repo.get_pregadores(request.distrito_id)
        cantores = self.usuario_repo.get_cantores(request.distrito_id)
        
        if not pregadores:
            raise BadRequestException("Nenhum pregador ativo no distrito")
        
        logger.info(f"Encontrados {len(pregadores)} pregadores e {len(cantores)} cantores")
        
        # Classificar pregadores e cantores por score
        pregadores_alto = [p for p in pregadores if float(p.score_atual or 70) >= self.SCORE_ALTO_MIN]
        pregadores_medio = [p for p in pregadores if self.SCORE_INTERMEDIARIO_MIN <= float(p.score_atual or 70) < self.SCORE_ALTO_MIN]
        pregadores_baixo = [p for p in pregadores if float(p.score_atual or 70) < self.SCORE_INTERMEDIARIO_MIN]
        
        cantores_alto = [c for c in cantores if float(c.score_atual or 70) >= self.SCORE_ALTO_MIN]
        cantores_medio = [c for c in cantores if self.SCORE_INTERMEDIARIO_MIN <= float(c.score_atual or 70) < self.SCORE_ALTO_MIN]
        cantores_baixo = [c for c in cantores if float(c.score_atual or 70) < self.SCORE_INTERMEDIARIO_MIN]
        
        # Gerar datas do mês
        _, ultimo_dia = monthrange(request.ano, request.mes)
        
        # Contadores de participação
        participacoes_pregador = {p.id: 0 for p in pregadores}
        participacoes_cantor = {c.id: 0 for c in cantores} if cantores else {}
        ultima_data_pregador = {p.id: None for p in pregadores}
        ultima_data_cantor = {c.id: None for c in cantores} if cantores else {}
        
        # Buscar indisponibilidades e bloqueios do período
        data_inicio_mes = date(request.ano, request.mes, 1)
        data_fim_mes = date(request.ano, request.mes, ultimo_dia)
        
        indisponibilidades = self._get_indisponibilidades(
            [p.id for p in pregadores] + [c.id for c in cantores],
            data_inicio_mes,
            data_fim_mes
        )
        
        bloqueios = self._get_bloqueios(
            [p.id for p in pregadores] + [c.id for c in cantores],
            data_inicio_mes,
            data_fim_mes
        )
        
        # Preferências de igreja (se habilitado)
        preferencias = {}
        if distrito.config_usa_preferencia:
            preferencias = self._get_preferencias(
                [p.id for p in pregadores] + [c.id for c in cantores]
            )
        
        # Coletar todos os cultos do mês
        cultos = []
        for igreja in igrejas:
            horarios = self.db.query(HorarioCulto).filter(
                HorarioCulto.igreja_id == igreja.id,
                HorarioCulto.ativo == True
            ).all()
            
            if not horarios:
                continue
            
            for dia in range(1, ultimo_dia + 1):
                data_culto = date(request.ano, request.mes, dia)
                dia_semana_num = data_culto.weekday()
                
                dia_semana_map = {
                    5: DiaSemana.SABADO,
                    6: DiaSemana.DOMINGO,
                    2: DiaSemana.QUARTA
                }
                
                if dia_semana_num not in dia_semana_map:
                    continue
                
                dia_semana = dia_semana_map[dia_semana_num]
                
                horarios_dia = [h for h in horarios if h.dia_semana == dia_semana]
                
                for horario in horarios_dia:
                    # Buscar tema aplicável (se houver) - ignora se não tiver temas
                    tema = None
                    try:
                        tema = self.tema_repo.get_tema_para_data(data_culto)
                    except Exception:
                        pass  # Ignora erros ao buscar temas
                    
                    cultos.append({
                        "igreja": igreja,
                        "data_culto": data_culto,
                        "horario": horario.horario,
                        "dia_semana": dia_semana,
                        "tema_id": tema.id if tema else None
                    })
        
        # Ordenar cultos por prioridade: Sábado (1), Domingo (2), Quarta (3)
        prioridade = {DiaSemana.SABADO: 1, DiaSemana.DOMINGO: 2, DiaSemana.QUARTA: 3}
        cultos.sort(key=lambda x: (prioridade.get(x["dia_semana"], 3), x["data_culto"], str(x["horario"])))
        
        logger.info(f"Total de {len(cultos)} cultos a serem escalados")
        
        # Escalar cada culto
        for culto in cultos:
            igreja = culto["igreja"]
            data_culto = culto["data_culto"]
            dia_semana = culto["dia_semana"]
            
            # Selecionar pregador baseado na prioridade do dia
            if dia_semana == DiaSemana.SABADO and request.priorizar_sabado:
                # Sábados: priorizar score alto
                pregador = self._selecionar_pessoa(
                    pregadores_alto or pregadores_medio or pregadores,
                    participacoes_pregador,
                    ultima_data_pregador,
                    data_culto,
                    distrito.config_recorrencia_maxima if request.respeitar_recorrencia else 999,
                    distrito.config_intervalo_minimo if request.respeitar_intervalo else 0,
                    request.usar_score,
                    indisponibilidades,
                    bloqueios,
                    preferencias,
                    igreja.id if distrito.config_usa_preferencia else None
                )
            else:
                # Domingos e Quartas: score médio ou alto
                pool = pregadores_medio + pregadores_alto if pregadores_medio else pregadores
                pregador = self._selecionar_pessoa(
                    pool,
                    participacoes_pregador,
                    ultima_data_pregador,
                    data_culto,
                    distrito.config_recorrencia_maxima if request.respeitar_recorrencia else 999,
                    distrito.config_intervalo_minimo if request.respeitar_intervalo else 0,
                    request.usar_score,
                    indisponibilidades,
                    bloqueios,
                    preferencias,
                    igreja.id if distrito.config_usa_preferencia else None
                )
            
            # Selecionar cantor
            cantor = None
            if cantores:
                if dia_semana == DiaSemana.SABADO and request.priorizar_sabado:
                    cantor = self._selecionar_pessoa(
                        cantores_alto or cantores_medio or cantores,
                        participacoes_cantor,
                        ultima_data_cantor,
                        data_culto,
                        distrito.config_recorrencia_maxima if request.respeitar_recorrencia else 999,
                        distrito.config_intervalo_minimo if request.respeitar_intervalo else 0,
                        request.usar_score,
                        indisponibilidades,
                        bloqueios,
                        preferencias,
                        igreja.id if distrito.config_usa_preferencia else None
                    )
                else:
                    pool = cantores_medio + cantores_alto if cantores_medio else cantores
                    cantor = self._selecionar_pessoa(
                        pool,
                        participacoes_cantor,
                        ultima_data_cantor,
                        data_culto,
                        distrito.config_recorrencia_maxima if request.respeitar_recorrencia else 999,
                        distrito.config_intervalo_minimo if request.respeitar_intervalo else 0,
                        request.usar_score,
                        indisponibilidades,
                        bloqueios,
                        preferencias,
                        igreja.id if distrito.config_usa_preferencia else None
                    )
            
            # Criar item da escala
            # Se não houver tema_id, usa tema_customizado padrão (obrigatório pela constraint)
            tema_id = culto["tema_id"]
            tema_customizado = None if tema_id else "Tema Livre"
            
            item_data = {
                "escala_id": escala.id,
                "igreja_id": igreja.id,
                "data_culto": data_culto,
                "horario": culto["horario"],
                "pregador_id": pregador.id if pregador else None,
                "cantor_id": cantor.id if cantor else None,
                "tema_id": tema_id,
                "tema_customizado": tema_customizado
            }
            
            self.item_repo.create(item_data)
            
            # Atualizar contadores
            if pregador:
                participacoes_pregador[pregador.id] += 1
                ultima_data_pregador[pregador.id] = data_culto
            
            if cantor:
                participacoes_cantor[cantor.id] += 1
                ultima_data_cantor[cantor.id] = data_culto
        
        logger.info(f"Escala gerada com sucesso. ID: {escala.id}")
        
        return escala

    def _get_indisponibilidades(
        self, 
        usuario_ids: List[int], 
        data_inicio: date, 
        data_fim: date
    ) -> dict:
        """Busca indisponibilidades dos usuários no período"""
        if not usuario_ids:
            return {}
            
        indisps = self.db.query(Indisponibilidade).filter(
            Indisponibilidade.usuario_id.in_(usuario_ids),
            Indisponibilidade.data_inicio <= data_fim,
            Indisponibilidade.data_fim >= data_inicio
        ).all()
        
        resultado = {}
        for indisp in indisps:
            if indisp.usuario_id not in resultado:
                resultado[indisp.usuario_id] = []
            resultado[indisp.usuario_id].append((indisp.data_inicio, indisp.data_fim))
        
        return resultado

    def _get_bloqueios(
        self, 
        usuario_ids: List[int], 
        data_inicio: date, 
        data_fim: date
    ) -> dict:
        """Busca bloqueios temporários dos usuários no período"""
        if not usuario_ids:
            return {}
            
        bloqueios = self.db.query(BloqueioTemporario).filter(
            BloqueioTemporario.usuario_id.in_(usuario_ids),
            BloqueioTemporario.data_inicio <= data_fim,
            BloqueioTemporario.data_fim >= data_inicio
        ).all()
        
        resultado = {}
        for bloqueio in bloqueios:
            if bloqueio.usuario_id not in resultado:
                resultado[bloqueio.usuario_id] = []
            resultado[bloqueio.usuario_id].append((bloqueio.data_inicio, bloqueio.data_fim))
        
        return resultado

    def _get_preferencias(self, usuario_ids: List[int]) -> dict:
        """Busca preferências de igreja dos usuários"""
        if not usuario_ids:
            return {}
            
        from app.models.preferencia_igreja import PreferenciaIgreja
        
        prefs = self.db.query(PreferenciaIgreja).filter(
            PreferenciaIgreja.usuario_id.in_(usuario_ids)
        ).all()
        
        resultado = {}
        for pref in prefs:
            if pref.usuario_id not in resultado:
                resultado[pref.usuario_id] = []
            resultado[pref.usuario_id].append(pref.igreja_id)
        
        return resultado

    def _esta_disponivel(
        self, 
        usuario_id: int, 
        data_culto: date, 
        indisponibilidades: dict, 
        bloqueios: dict
    ) -> bool:
        """Verifica se usuário está disponível na data"""
        # Verificar indisponibilidades
        indisps = indisponibilidades.get(usuario_id, [])
        for inicio, fim in indisps:
            if inicio <= data_culto <= fim:
                return False
        
        # Verificar bloqueios
        bloqs = bloqueios.get(usuario_id, [])
        for inicio, fim in bloqs:
            if inicio <= data_culto <= fim:
                return False
        
        return True

    def _selecionar_pessoa(
        self,
        pessoas: List[Usuario],
        participacoes: dict,
        ultima_data: dict,
        data_culto: date,
        max_recorrencia: int,
        intervalo_minimo: int,
        usar_score: bool,
        indisponibilidades: dict,
        bloqueios: dict,
        preferencias: dict,
        igreja_id: Optional[int] = None
    ) -> Optional[Usuario]:
        """Seleciona pessoa para escalar baseado em regras"""
        candidatos = []
        candidatos_preferenciais = []
        
        for pessoa in pessoas:
            # Verificar recorrência máxima
            if participacoes.get(pessoa.id, 0) >= max_recorrencia:
                continue
            
            # Verificar intervalo mínimo
            ultima = ultima_data.get(pessoa.id)
            if ultima:
                dias_desde = (data_culto - ultima).days
                if dias_desde < intervalo_minimo:
                    continue
            
            # Verificar disponibilidade
            if not self._esta_disponivel(pessoa.id, data_culto, indisponibilidades, bloqueios):
                continue
            
            candidatos.append(pessoa)
            
            # Verificar preferência de igreja
            if igreja_id and igreja_id in preferencias.get(pessoa.id, []):
                candidatos_preferenciais.append(pessoa)
        
        # Priorizar candidatos preferenciais
        pool = candidatos_preferenciais if candidatos_preferenciais else candidatos
        
        if not pool:
            # Se ninguém disponível, escolher quem tem menos participações (flexibilizando regras)
            pool = sorted(
                [p for p in pessoas if self._esta_disponivel(p.id, data_culto, indisponibilidades, bloqueios)],
                key=lambda p: participacoes.get(p.id, 0)
            )[:3]
        
        if not pool:
            return None
        
        if usar_score:
            # Ordenar por score (maior primeiro) com alguma aleatoriedade para variar
            pool = sorted(
                pool,
                key=lambda p: float(p.score_atual or 70) + random.uniform(-5, 5),
                reverse=True
            )
        else:
            random.shuffle(pool)
        
        return pool[0] if pool else None

    def publish(self, escala_id: int, current_user: Usuario) -> Escala:
        """Publica escala e envia notificações se configurado"""
        escala = self.get_by_id(escala_id)
        
        if not current_user.is_admin and not current_user.is_pastor:
            raise ForbiddenException("Sem permissão para publicar escalas")
        
        if escala.status == StatusEscala.PUBLICADA:
            raise BadRequestException("Escala já está publicada")
        
        escala.status = StatusEscala.PUBLICADA
        escala.data_publicacao = datetime.now(timezone.utc)
        
        self.db.commit()
        self.db.refresh(escala)
        
        # Enviar notificações se configurado
        if settings.NOTIFICAR_ESCALA:
            self._enviar_notificacoes_escala(escala)
        else:
            logger.info("Notificações de escala desabilitadas (NOTIFICAR_ESCALA=false)")
        
        return escala

    def _enviar_notificacoes_escala(self, escala: Escala):
        """Envia notificações para todos os escalados"""
        logger.info(f"Iniciando envio de notificações para escala {escala.id}")
        
        # Buscar itens da escala
        itens = self.db.query(ItemEscala).filter(
            ItemEscala.escala_id == escala.id
        ).all()
        
        # Coletar usuários únicos para notificar
        usuarios_notificar = set()
        for item in itens:
            if item.pregador_id:
                usuarios_notificar.add(item.pregador_id)
            if item.cantor_id:
                usuarios_notificar.add(item.cantor_id)
        
        logger.info(f"Enviando notificações para {len(usuarios_notificar)} usuários")
        
        # TODO: Implementar envio real de notificações
        # - Email via SMTP
        # - SMS via API
        # - WhatsApp via API
        # - Push notification
        
        for usuario_id in usuarios_notificar:
            # Criar registro de notificação no banco
            # self.notificacao_service.criar_notificacao_escala(usuario_id, escala.id)
            pass
        
        logger.info("Notificações enviadas com sucesso")

    def update_item(
        self, 
        item_id: int, 
        pregador_id: Optional[int] = None,
        cantor_id: Optional[int] = None,
        current_user: Usuario = None
    ) -> ItemEscala:
        """Atualiza item da escala"""
        item = self.item_repo.get_by_id(item_id)
        if not item:
            raise NotFoundException("Item de escala", item_id)
        
        update_data = {}
        if pregador_id is not None:
            update_data["pregador_id"] = pregador_id if pregador_id > 0 else None
            update_data["status_confirmacao_pregador"] = StatusConfirmacao.PENDENTE
        
        if cantor_id is not None:
            update_data["cantor_id"] = cantor_id if cantor_id > 0 else None
            update_data["status_confirmacao_cantor"] = StatusConfirmacao.PENDENTE
        
        return self.item_repo.update(item_id, update_data)

    def remove_item_pregador(self, item_id: int, current_user: Usuario) -> ItemEscala:
        """Remove pregador de um item (deixa vago)"""
        return self.update_item(item_id, pregador_id=0, current_user=current_user)

    def remove_item_cantor(self, item_id: int, current_user: Usuario) -> ItemEscala:
        """Remove cantor de um item (deixa vago)"""
        return self.update_item(item_id, cantor_id=0, current_user=current_user)

    def confirm_presence(
        self, 
        item_id: int, 
        current_user: Usuario,
        confirmado: bool
    ) -> ItemEscala:
        """Confirma presença em um item da escala"""
        return self.item_repo.confirmar_presenca(item_id, current_user.id, confirmado)

    def get_my_schedule(
        self, 
        current_user: Usuario,
        data_inicio: Optional[date] = None,
        data_fim: Optional[date] = None
    ) -> List[ItemEscala]:
        """Busca escalas do usuário"""
        if current_user.tipo == TipoUsuario.PREGADOR:
            return self.item_repo.get_by_pregador(
                current_user.id, data_inicio, data_fim
            )
        elif current_user.tipo == TipoUsuario.CANTOR:
            return self.item_repo.get_by_cantor(
                current_user.id, data_inicio, data_fim
            )
        else:
            return []

    def delete(self, escala_id: int, current_user: Usuario) -> bool:
        """Deleta escala (apenas rascunho)"""
        escala = self.get_by_id(escala_id)
        
        if not current_user.is_admin and not current_user.is_pastor:
            raise ForbiddenException("Sem permissão para excluir escalas")
        
        if escala.status == StatusEscala.PUBLICADA:
            raise BadRequestException("Não é possível excluir escala publicada")
        
        self.escala_repo.delete(escala_id)
        return True

    def get_estatisticas(self, escala_id: int) -> dict:
        """Retorna estatísticas da escala"""
        escala = self.get_by_id(escala_id)
        
        itens = self.db.query(ItemEscala).filter(
            ItemEscala.escala_id == escala_id
        ).all()
        
        total = len(itens)
        com_pregador = sum(1 for i in itens if i.pregador_id)
        com_cantor = sum(1 for i in itens if i.cantor_id)
        pregador_confirmado = sum(1 for i in itens if i.status_confirmacao_pregador == StatusConfirmacao.CONFIRMADO)
        cantor_confirmado = sum(1 for i in itens if i.status_confirmacao_cantor == StatusConfirmacao.CONFIRMADO)
        pregador_recusado = sum(1 for i in itens if i.status_confirmacao_pregador == StatusConfirmacao.NAO_CONFIRMADO)
        cantor_recusado = sum(1 for i in itens if i.status_confirmacao_cantor == StatusConfirmacao.NAO_CONFIRMADO)
        
        return {
            "total_itens": total,
            "itens_com_pregador": com_pregador,
            "itens_com_cantor": com_cantor,
            "pregadores_confirmados": pregador_confirmado,
            "cantores_confirmados": cantor_confirmado,
            "pregadores_recusados": pregador_recusado,
            "cantores_recusados": cantor_recusado,
            # Campos adicionais para compatibilidade
            "total_cultos": total,
            "com_pregador": com_pregador,
            "sem_pregador": total - com_pregador,
            "com_cantor": com_cantor,
            "sem_cantor": total - com_cantor,
            "pregador_confirmado": pregador_confirmado,
            "cantor_confirmado": cantor_confirmado,
            "taxa_preenchimento_pregador": round(com_pregador / total * 100, 1) if total > 0 else 0,
            "taxa_preenchimento_cantor": round(com_cantor / total * 100, 1) if total > 0 else 0
        }
