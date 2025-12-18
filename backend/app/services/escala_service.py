"""
Serviço de Escala - Inclui geração automática
"""
from typing import List, Optional
from datetime import date, datetime, timedelta, timezone
from calendar import monthrange
from sqlalchemy.orm import Session
import random

from app.core.exceptions import (
    NotFoundException, BadRequestException, 
    ConflictException, ForbiddenException
)
from app.repositories.escala_repository import EscalaRepository, ItemEscalaRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.repositories.igreja_repository import IgrejaRepository
from app.repositories.distrito_repository import DistritoRepository
from app.models.escala import Escala, StatusEscala
from app.models.item_escala import ItemEscala, StatusConfirmacao
from app.models.horario_culto import HorarioCulto, DiaSemana
from app.models.usuario import Usuario, TipoUsuario
from app.schemas.escala import EscalaCreate, EscalaGenerateRequest


class EscalaService:
    """Serviço de escalas"""

    def __init__(self, db: Session):
        self.db = db
        self.escala_repo = EscalaRepository(db)
        self.item_repo = ItemEscalaRepository(db)
        self.usuario_repo = UsuarioRepository(db)
        self.igreja_repo = IgrejaRepository(db)
        self.distrito_repo = DistritoRepository(db)

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
    ) -> List[Escala]:
        """Lista escalas de um distrito"""
        return self.escala_repo.get_by_distrito(distrito_id, skip, limit)

    def generate(
        self, 
        request: EscalaGenerateRequest, 
        current_user: Usuario
    ) -> Escala:
        """Gera escala automaticamente"""
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
        
        # Criar escala
        escala = self.escala_repo.create({
            "distrito_id": request.distrito_id,
            "mes": request.mes,
            "ano": request.ano,
            "pastor_id": current_user.id
        })
        
        # Buscar igrejas e horários
        igrejas = self.igreja_repo.get_ativas(request.distrito_id)
        
        # Buscar pregadores e cantores ordenados por score
        pregadores = self.usuario_repo.get_pregadores(request.distrito_id)
        cantores = self.usuario_repo.get_cantores(request.distrito_id)
        
        if not pregadores:
            raise BadRequestException("Nenhum pregador ativo no distrito")
        
        # Gerar datas do mês
        _, ultimo_dia = monthrange(request.ano, request.mes)
        
        # Contadores de participação
        participacoes_pregador = {p.id: 0 for p in pregadores}
        participacoes_cantor = {c.id: 0 for c in cantores} if cantores else {}
        ultima_data_pregador = {p.id: None for p in pregadores}
        ultima_data_cantor = {c.id: None for c in cantores} if cantores else {}
        
        # Prioridade: Sábado (1), Domingo (2), Quarta (3)
        prioridade_dia = {
            DiaSemana.SABADO: 1,
            DiaSemana.DOMINGO: 2,
            DiaSemana.QUARTA: 3
        }
        
        # Gerar itens para cada igreja
        for igreja in igrejas:
            # Buscar horários da igreja
            horarios = self.db.query(HorarioCulto).filter(
                HorarioCulto.igreja_id == igreja.id,
                HorarioCulto.ativo == True
            ).all()
            
            if not horarios:
                continue
            
            # Para cada dia do mês
            for dia in range(1, ultimo_dia + 1):
                data_culto = date(request.ano, request.mes, dia)
                dia_semana_num = data_culto.weekday()  # 0=Segunda, 5=Sábado, 6=Domingo
                
                # Mapear para nosso enum
                dia_semana_map = {
                    5: DiaSemana.SABADO,
                    6: DiaSemana.DOMINGO,
                    2: DiaSemana.QUARTA
                }
                
                if dia_semana_num not in dia_semana_map:
                    continue
                
                dia_semana = dia_semana_map[dia_semana_num]
                
                # Verificar se há horário neste dia
                horarios_dia = [h for h in horarios if h.dia_semana == dia_semana]
                
                for horario in horarios_dia:
                    # Selecionar pregador
                    pregador = self._selecionar_pessoa(
                        pregadores,
                        participacoes_pregador,
                        ultima_data_pregador,
                        data_culto,
                        distrito.config_recorrencia_maxima,
                        distrito.config_intervalo_minimo,
                        request.usar_score
                    )
                    
                    # Selecionar cantor
                    cantor = None
                    if cantores:
                        cantor = self._selecionar_pessoa(
                            cantores,
                            participacoes_cantor,
                            ultima_data_cantor,
                            data_culto,
                            distrito.config_recorrencia_maxima,
                            distrito.config_intervalo_minimo,
                            request.usar_score
                        )
                    
                    # Criar item da escala
                    item_data = {
                        "escala_id": escala.id,
                        "igreja_id": igreja.id,
                        "data_culto": data_culto,
                        "horario": horario.horario,
                        "pregador_id": pregador.id if pregador else None,
                        "cantor_id": cantor.id if cantor else None
                    }
                    
                    self.item_repo.create(item_data)
                    
                    # Atualizar contadores
                    if pregador:
                        participacoes_pregador[pregador.id] += 1
                        ultima_data_pregador[pregador.id] = data_culto
                    
                    if cantor:
                        participacoes_cantor[cantor.id] += 1
                        ultima_data_cantor[cantor.id] = data_culto
        
        return escala

    def _selecionar_pessoa(
        self,
        pessoas: List[Usuario],
        participacoes: dict,
        ultima_data: dict,
        data_culto: date,
        max_recorrencia: int,
        intervalo_minimo: int,
        usar_score: bool
    ) -> Optional[Usuario]:
        """Seleciona pessoa para escalar baseado em regras"""
        candidatos = []
        
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
            
            # TODO: Verificar indisponibilidades
            # TODO: Verificar bloqueios
            
            candidatos.append(pessoa)
        
        if not candidatos:
            # Se ninguém disponível, escolher quem tem menos participações
            candidatos = sorted(
                pessoas, 
                key=lambda p: participacoes.get(p.id, 0)
            )[:3]
        
        if not candidatos:
            return None
        
        if usar_score:
            # Ordenar por score (maior primeiro) com alguma aleatoriedade
            candidatos = sorted(
                candidatos,
                key=lambda p: float(p.score_atual or 70) + random.uniform(-5, 5),
                reverse=True
            )
        else:
            random.shuffle(candidatos)
        
        return candidatos[0] if candidatos else None

    def publish(self, escala_id: int, current_user: Usuario) -> Escala:
        """Publica escala"""
        escala = self.get_by_id(escala_id)
        
        if not current_user.is_admin and not current_user.is_pastor:
            raise ForbiddenException("Sem permissão para publicar escalas")
        
        if escala.status == StatusEscala.PUBLICADA:
            raise BadRequestException("Escala já está publicada")
        
        escala.status = StatusEscala.PUBLICADA
        escala.data_publicacao = datetime.now(timezone.utc)
        
        self.db.commit()
        self.db.refresh(escala)
        
        # TODO: Enviar notificações
        
        return escala

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
            update_data["pregador_id"] = pregador_id
            update_data["status_confirmacao_pregador"] = StatusConfirmacao.PENDENTE
        
        if cantor_id is not None:
            update_data["cantor_id"] = cantor_id
            update_data["status_confirmacao_cantor"] = StatusConfirmacao.PENDENTE
        
        return self.item_repo.update(item_id, update_data)

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
