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
from app.models.igreja import Igreja
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
        from app.models.configuracao_distrito import ConfiguracaoDistrito
        
        distrito = self.distrito_repo.get_by_id(request.distrito_id)
        if not distrito:
            raise NotFoundException("Distrito", request.distrito_id)
        
        # Buscar ou criar configuração do distrito
        config = self.db.query(ConfiguracaoDistrito).filter(
            ConfiguracaoDistrito.distrito_id == request.distrito_id
        ).first()
        
        # Usar valores da configuração ou valores padrão do distrito
        recorrencia_maxima = config.recorrencia_maxima_mes if config else distrito.config_recorrencia_maxima
        intervalo_minimo = config.intervalo_minimo_dias if config else distrito.config_intervalo_minimo
        usa_preferencia = config.sistema_preferencias_habilitado if config else distrito.config_usa_preferencia
        
        logger.info(f"Gerando escala para {distrito.nome} - {request.mes}/{request.ano}")
        logger.info(f"Configurações: Recorrência máxima={recorrencia_maxima}, Intervalo mínimo={intervalo_minimo} dias")
        
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
        
        # Horários padrão para igrejas sem horários cadastrados
        from datetime import time
        horarios_padrao = {
            DiaSemana.SABADO: time(9, 0),    # Sábado 09:00
            DiaSemana.DOMINGO: time(19, 30),  # Domingo 19:30
            DiaSemana.QUARTA: time(19, 30)   # Quarta 19:30
        }
        
        # Coletar todos os cultos do mês
        cultos = []
        for igreja in igrejas:
            horarios = self.db.query(HorarioCulto).filter(
                HorarioCulto.igreja_id == igreja.id,
                HorarioCulto.ativo == True
            ).all()
            
            # Se não houver horários, usa horários padrão
            usar_horarios_padrao = len(horarios) == 0
            
            if usar_horarios_padrao:
                logger.warning(f"Igreja {igreja.nome} (#{igreja.id}) sem horários cadastrados - usando horários padrão")
            
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
                
                # Se tem horários cadastrados, usa eles; senão usa padrão
                if usar_horarios_padrao:
                    # Criar um culto com horário padrão
                    horario_culto = horarios_padrao.get(dia_semana)
                    if horario_culto:
                        # Buscar tema aplicável (se houver)
                        tema = None
                        try:
                            tema = self.tema_repo.get_tema_para_data(data_culto)
                        except Exception:
                            pass
                        
                        cultos.append({
                            "igreja": igreja,
                            "data_culto": data_culto,
                            "horario": horario_culto,
                            "dia_semana": dia_semana,
                            "tema_id": tema.id if tema else None
                        })
                else:
                    # Usa horários cadastrados
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
        
        # Lista para rastrear itens criados (para validação de conflitos)
        itens_criados = []
        
        # Escalar cada culto
        for culto in cultos:
            igreja = culto["igreja"]
            data_culto = culto["data_culto"]
            dia_semana = culto["dia_semana"]
            
            # Filtrar pregadores que já estão escalados no mesmo dia (qualquer igreja)
            # Isso evita conflitos de mesma pessoa em múltiplas igrejas no mesmo dia
            pregadores_disponiveis = [
                p for p in pregadores 
                if not self._ja_escalado_no_mesmo_dia(
                    p.id, data_culto, igreja.id, itens_criados, "pregador"
                )
            ]
            
            # Classificar pregadores disponíveis por score
            pregadores_disponiveis_alto = [p for p in pregadores_disponiveis if float(p.score_atual or 70) >= self.SCORE_ALTO_MIN]
            pregadores_disponiveis_medio = [p for p in pregadores_disponiveis if self.SCORE_INTERMEDIARIO_MIN <= float(p.score_atual or 70) < self.SCORE_ALTO_MIN]
            
            # Selecionar pregador baseado na prioridade do dia
            pregador = None
            if pregadores_disponiveis:
                if dia_semana == DiaSemana.SABADO and request.priorizar_sabado:
                    # Sábados: priorizar score alto
                    pregador = self._selecionar_pessoa(
                        pregadores_disponiveis_alto or pregadores_disponiveis_medio or pregadores_disponiveis,
                        participacoes_pregador,
                        ultima_data_pregador,
                        data_culto,
                        recorrencia_maxima if request.respeitar_recorrencia else 999,
                        intervalo_minimo if request.respeitar_intervalo else 0,
                        request.usar_score,
                        indisponibilidades,
                        bloqueios,
                        preferencias,
                        igreja.id if usa_preferencia else None
                    )
                else:
                    # Domingos e Quartas: score médio ou alto
                    pool = pregadores_disponiveis_medio + pregadores_disponiveis_alto if pregadores_disponiveis_medio else pregadores_disponiveis
                    pregador = self._selecionar_pessoa(
                        pool,
                        participacoes_pregador,
                        ultima_data_pregador,
                        data_culto,
                        recorrencia_maxima if request.respeitar_recorrencia else 999,
                        intervalo_minimo if request.respeitar_intervalo else 0,
                        request.usar_score,
                        indisponibilidades,
                        bloqueios,
                        preferencias,
                        igreja.id if usa_preferencia else None
                    )
                
                # Se não encontrou pregador respeitando regras, flexibiliza completamente
                # Pregador é OBRIGATÓRIO - todas as igrejas devem ter pregador
                if not pregador:
                    pregador = self._selecionar_pregador_forcado(
                        pregadores_disponiveis,
                        participacoes_pregador,
                        data_culto,
                        indisponibilidades,
                        bloqueios
                    )
                    if pregador:
                        logger.info(f"Pregador {pregador.nome_completo} selecionado com flexibilização para {igreja.nome} em {data_culto}")
            else:
                logger.warning(f"Nenhum pregador disponível para {igreja.nome} em {data_culto} - todos já escalados no mesmo dia")
            
            # Selecionar cantor
            cantor = None
            if cantores:
                # Filtrar cantores que já estão escalados no mesmo dia (como pregador OU cantor em qualquer igreja)
                # Isso evita conflitos cruzados (cantor ser pregador em outra igreja no mesmo dia)
                cantores_disponiveis = [
                    c for c in cantores 
                    if not self._ja_escalado_no_mesmo_dia(
                        c.id, data_culto, igreja.id, itens_criados, "cantor"
                    )
                ]
                
                # Classificar cantores disponíveis por score
                cantores_disponiveis_alto = [c for c in cantores_disponiveis if float(c.score_atual or 70) >= self.SCORE_ALTO_MIN]
                cantores_disponiveis_medio = [c for c in cantores_disponiveis if self.SCORE_INTERMEDIARIO_MIN <= float(c.score_atual or 70) < self.SCORE_ALTO_MIN]
                
                if cantores_disponiveis:
                    if dia_semana == DiaSemana.SABADO and request.priorizar_sabado:
                        cantor = self._selecionar_pessoa(
                            cantores_disponiveis_alto or cantores_disponiveis_medio or cantores_disponiveis,
                            participacoes_cantor,
                            ultima_data_cantor,
                            data_culto,
                            recorrencia_maxima if request.respeitar_recorrencia else 999,
                            intervalo_minimo if request.respeitar_intervalo else 0,
                            request.usar_score,
                            indisponibilidades,
                            bloqueios,
                            preferencias,
                            igreja.id if usa_preferencia else None
                        )
                    else:
                        pool = cantores_disponiveis_medio + cantores_disponiveis_alto if cantores_disponiveis_medio else cantores_disponiveis
                        cantor = self._selecionar_pessoa(
                            pool,
                            participacoes_cantor,
                            ultima_data_cantor,
                            data_culto,
                            recorrencia_maxima if request.respeitar_recorrencia else 999,
                            intervalo_minimo if request.respeitar_intervalo else 0,
                            request.usar_score,
                            indisponibilidades,
                            bloqueios,
                            preferencias,
                            igreja.id if usa_preferencia else None
                        )
                else:
                    logger.warning(f"Nenhum cantor disponível para {igreja.nome} em {data_culto} - todos já escalados no mesmo dia")
            
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
            
            # Rastrear item criado para validações de conflito
            itens_criados.append(item_data)
            
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
        """
        Seleciona pessoa para escalar baseado em regras.
        
        IMPORTANTE: A lista 'pessoas' já deve estar pré-filtrada para não incluir
        pessoas que já estão escaladas no mesmo dia em outras igrejas (conflitos).
        Esta função NÃO verifica conflitos de escala, apenas:
        - Recorrência máxima no mês
        - Intervalo mínimo entre participações  
        - Indisponibilidades e bloqueios
        - Preferências de igreja
        """
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
            
            # Verificar disponibilidade (indisponibilidades e bloqueios)
            if not self._esta_disponivel(pessoa.id, data_culto, indisponibilidades, bloqueios):
                continue
            
            candidatos.append(pessoa)
            
            # Verificar preferência de igreja
            if igreja_id and igreja_id in preferencias.get(pessoa.id, []):
                candidatos_preferenciais.append(pessoa)
        
        # Priorizar candidatos preferenciais
        pool = candidatos_preferenciais if candidatos_preferenciais else candidatos
        
        if not pool:
            # Se ninguém disponível com regras estritas, flexibilizar apenas intervalo
            # MAS manter restrição de recorrência para não sobrecarregar
            # IMPORTANTE: Iterar apenas sobre 'pessoas' que já foi filtrada para conflitos
            pool_flexivel = []
            for p in pessoas:
                if not self._esta_disponivel(p.id, data_culto, indisponibilidades, bloqueios):
                    continue
                # Flexibiliza intervalo, mas mantém recorrência máxima
                if participacoes.get(p.id, 0) < max_recorrencia:
                    pool_flexivel.append(p)
            
            # Ordenar por menos participações
            pool = sorted(pool_flexivel, key=lambda p: participacoes.get(p.id, 0))[:3]
        
        if not pool:
            # Não há ninguém disponível mesmo flexibilizando regras
            # Retorna None para que o item seja criado sem pregador/cantor
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
    
    def _selecionar_pregador_forcado(
        self,
        pregadores_disponiveis: List[Usuario],
        participacoes: dict,
        data_culto: date,
        indisponibilidades: dict,
        bloqueios: dict
    ) -> Optional[Usuario]:
        """
        Seleciona pregador FORÇADAMENTE quando não há candidatos respeitando as regras.
        Ignora limites de recorrência e intervalo mínimo, mas:
        - Respeita indisponibilidades e bloqueios
        - Mantém equilíbrio (prioriza quem tem menos participações)
        
        Este método garante que TODAS as igrejas tenham pregador.
        """
        candidatos = []
        
        for pregador in pregadores_disponiveis:
            # Única verificação: está disponível na data (sem indisponibilidades/bloqueios)?
            if self._esta_disponivel(pregador.id, data_culto, indisponibilidades, bloqueios):
                candidatos.append(pregador)
        
        if not candidatos:
            # Se todos estão indisponíveis, pegar qualquer um (último recurso)
            candidatos = list(pregadores_disponiveis)
        
        if not candidatos:
            return None
        
        # Ordenar por menos participações para manter equilíbrio
        candidatos_ordenados = sorted(
            candidatos,
            key=lambda p: (participacoes.get(p.id, 0), -float(p.score_atual or 70))
        )
        
        return candidatos_ordenados[0]

    def _ja_escalado_no_mesmo_dia(
        self, 
        usuario_id: int, 
        data_culto: date, 
        igreja_atual_id: int,
        itens_ja_criados: list,
        tipo_verificar: str = "pregador"
    ) -> bool:
        """
        Verifica se o usuário já foi escalado no mesmo dia em QUALQUER igreja (incluindo a atual).
        Isso evita conflitos onde a pessoa seria escalada em múltiplos cultos no mesmo dia.
        
        Args:
            usuario_id: ID do usuário a verificar
            data_culto: Data do culto
            igreja_atual_id: ID da igreja atual
            itens_ja_criados: Lista de itens já criados na geração atual
            tipo_verificar: "pregador" - verifica campo pregador_id, 
                           "cantor" - verifica campo cantor_id,
                           "ambos" - verifica se escalado como pregador OU cantor em outra igreja
        
        Returns:
            True se já escalado e deve ser evitado, False se disponível
        """
        for item in itens_ja_criados:
            if item["data_culto"] != data_culto:
                continue
            
            # Se é outra igreja, verifica qualquer tipo de escalação (pregador ou cantor)
            if item["igreja_id"] != igreja_atual_id:
                if tipo_verificar == "ambos":
                    # Verifica se está escalado como pregador OU cantor em outra igreja
                    if item.get("pregador_id") == usuario_id or item.get("cantor_id") == usuario_id:
                        return True
                elif tipo_verificar == "pregador":
                    # Verificar se já é pregador em outra igreja
                    if item.get("pregador_id") == usuario_id:
                        return True
                    # Também verificar se já é cantor em outra igreja (conflito cruzado)
                    if item.get("cantor_id") == usuario_id:
                        return True
                elif tipo_verificar == "cantor":
                    # Verificar se já é cantor em outra igreja
                    if item.get("cantor_id") == usuario_id:
                        return True
                    # Também verificar se já é pregador em outra igreja (conflito cruzado)
                    if item.get("pregador_id") == usuario_id:
                        return True
            else:
                # Mesma igreja - verificar se já escalado no mesmo culto
                # (não deve acontecer, mas por segurança)
                if tipo_verificar == "pregador" and item.get("pregador_id") == usuario_id:
                    return True
                if tipo_verificar == "cantor" and item.get("cantor_id") == usuario_id:
                    return True
        
        return False

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

    def archive(self, escala_id: int, current_user: Usuario) -> Escala:
        """Arquiva uma escala publicada"""
        escala = self.get_by_id(escala_id)
        
        if not current_user.is_admin and not current_user.is_pastor:
            raise ForbiddenException("Sem permissão para arquivar escalas")
        
        if escala.status == StatusEscala.ARQUIVADA:
            raise BadRequestException("Escala já está arquivada")
        
        if escala.status == StatusEscala.RASCUNHO:
            raise BadRequestException("Apenas escalas publicadas podem ser arquivadas")
        
        escala.status = StatusEscala.ARQUIVADA
        
        self.db.commit()
        self.db.refresh(escala)
        
        logger.info(f"Escala {escala_id} arquivada por {current_user.nome_completo}")
        
        return escala

    def archive_old_scales(self, months_old: int = 2) -> int:
        """
        Arquiva automaticamente escalas publicadas de meses anteriores.
        Retorna o número de escalas arquivadas.
        """
        from datetime import date
        
        hoje = date.today()
        
        # Calcular o mês limite (mês atual - months_old)
        ano_limite = hoje.year
        mes_limite = hoje.month - months_old
        
        while mes_limite <= 0:
            mes_limite += 12
            ano_limite -= 1
        
        # Buscar escalas publicadas anteriores ao limite
        escalas_para_arquivar = self.db.query(Escala).filter(
            Escala.status == StatusEscala.PUBLICADA,
            ((Escala.ano < ano_limite) | 
             ((Escala.ano == ano_limite) & (Escala.mes < mes_limite)))
        ).all()
        
        count = 0
        for escala in escalas_para_arquivar:
            escala.status = StatusEscala.ARQUIVADA
            count += 1
            logger.info(f"Escala {escala.id} ({escala.mes:02d}/{escala.ano}) arquivada automaticamente")
        
        if count > 0:
            self.db.commit()
        
        return count

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
        
        # Validar se pregador já está escalado em outro culto no mesmo dia (como pregador)
        if pregador_id and pregador_id > 0:
            conflito = self.db.query(ItemEscala).filter(
                ItemEscala.id != item_id,
                ItemEscala.data_culto == item.data_culto,
                ItemEscala.pregador_id == pregador_id
            ).first()
            
            if conflito:
                pregador = self.usuario_repo.get_by_id(pregador_id)
                igreja_conflito = self.db.query(Igreja).filter(Igreja.id == conflito.igreja_id).first()
                raise ConflictException(
                    f"O pregador {pregador.nome_completo if pregador else ''} já está escalado em {igreja_conflito.nome if igreja_conflito else 'outra igreja'} "
                    f"no dia {item.data_culto.strftime('%d/%m/%Y')} às {conflito.horario}"
                )
            
            # Validar se o pregador já está como cantor em OUTRA igreja no mesmo dia
            conflito_cantor = self.db.query(ItemEscala).filter(
                ItemEscala.id != item_id,
                ItemEscala.data_culto == item.data_culto,
                ItemEscala.cantor_id == pregador_id,
                ItemEscala.igreja_id != item.igreja_id
            ).first()
            
            if conflito_cantor:
                pregador = self.usuario_repo.get_by_id(pregador_id)
                igreja_conflito = self.db.query(Igreja).filter(Igreja.id == conflito_cantor.igreja_id).first()
                raise ConflictException(
                    f"{pregador.nome_completo if pregador else ''} já está escalado como CANTOR em {igreja_conflito.nome if igreja_conflito else 'outra igreja'} "
                    f"no dia {item.data_culto.strftime('%d/%m/%Y')} às {conflito_cantor.horario}. "
                    f"Não é possível escalar como pregador em igrejas diferentes no mesmo dia."
                )
        
        if cantor_id and cantor_id > 0:
            conflito = self.db.query(ItemEscala).filter(
                ItemEscala.id != item_id,
                ItemEscala.data_culto == item.data_culto,
                ItemEscala.cantor_id == cantor_id
            ).first()
            
            if conflito:
                cantor = self.usuario_repo.get_by_id(cantor_id)
                igreja_conflito = self.db.query(Igreja).filter(Igreja.id == conflito.igreja_id).first()
                raise ConflictException(
                    f"O cantor {cantor.nome_completo if cantor else ''} já está escalado em {igreja_conflito.nome if igreja_conflito else 'outra igreja'} "
                    f"no dia {item.data_culto.strftime('%d/%m/%Y')} às {conflito.horario}"
                )
            
            # Validar se o cantor já está como pregador em OUTRA igreja no mesmo dia
            conflito_pregador = self.db.query(ItemEscala).filter(
                ItemEscala.id != item_id,
                ItemEscala.data_culto == item.data_culto,
                ItemEscala.pregador_id == cantor_id,
                ItemEscala.igreja_id != item.igreja_id
            ).first()
            
            if conflito_pregador:
                cantor = self.usuario_repo.get_by_id(cantor_id)
                igreja_conflito = self.db.query(Igreja).filter(Igreja.id == conflito_pregador.igreja_id).first()
                raise ConflictException(
                    f"{cantor.nome_completo if cantor else ''} já está escalado como PREGADOR em {igreja_conflito.nome if igreja_conflito else 'outra igreja'} "
                    f"no dia {item.data_culto.strftime('%d/%m/%Y')} às {conflito_pregador.horario}. "
                    f"Não é possível escalar como cantor em igrejas diferentes no mesmo dia."
                )
        
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
        from app.models.configuracao_distrito import ConfiguracaoDistrito
        
        # Buscar item
        item = self.item_repo.get_by_id(item_id)
        if not item:
            raise NotFoundException("Item de escala", item_id)
        
        # Verificar se usuário está escalado
        if item.pregador_id != current_user.id and item.cantor_id != current_user.id:
            raise ForbiddenException("Você não está escalado neste item")
        
        # Buscar configuração do distrito
        escala = self.escala_repo.get_by_id(item.escala_id)
        if escala:
            config = self.db.query(ConfiguracaoDistrito).filter(
                ConfiguracaoDistrito.distrito_id == escala.distrito_id
            ).first()
            
            if config and config.confirmacao_obrigatoria:
                # Calcular prazo de confirmação
                from datetime import datetime, timedelta
                prazo_horas = config.prazo_confirmacao_horas
                
                # Prazo é calculado a partir da data de publicação da escala
                if escala.data_publicacao:
                    data_limite = escala.data_publicacao + timedelta(hours=prazo_horas)
                    
                    if datetime.now(timezone.utc) > data_limite:
                        raise BadRequestException(
                            f"Prazo para confirmação expirado. O prazo era de {prazo_horas} horas após a publicação "
                            f"(até {data_limite.strftime('%d/%m/%Y %H:%M')})"
                        )
        
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
