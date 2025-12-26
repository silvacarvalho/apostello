"""
Serviço de Lembretes Agendados
Envia lembretes automáticos 7d, 3d, 24h antes dos cultos
"""
from typing import List, Optional
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
import logging

from app.database import SessionLocal
from app.models.item_escala import ItemEscala, StatusConfirmacao
from app.models.escala import Escala, StatusEscala
from app.models.usuario import Usuario
from app.models.notificacao import TipoNotificacao
from app.services.notificacao_service import NotificacaoService

logger = logging.getLogger(__name__)


class LembreteService:
    """Serviço para envio de lembretes automáticos"""

    def __init__(self, db: Session):
        self.db = db
        self.notificacao_service = NotificacaoService(db)

    def processar_lembretes_7_dias(self) -> int:
        """Processa lembretes para cultos em 7 dias"""
        return self._processar_lembretes(
            dias_antecedencia=7,
            tipo_notificacao=TipoNotificacao.LEMBRETE_7D,
            titulo="Lembrete: Culto em 7 dias",
            template_mensagem="Você está escalado(a) para {funcao} na {igreja} no dia {data} às {horario}. Confirme sua participação."
        )

    def processar_lembretes_3_dias(self) -> int:
        """Processa lembretes para cultos em 3 dias"""
        return self._processar_lembretes(
            dias_antecedencia=3,
            tipo_notificacao=TipoNotificacao.LEMBRETE_3D,
            titulo="Lembrete: Culto em 3 dias",
            template_mensagem="Atenção! Você está escalado(a) para {funcao} na {igreja} no dia {data} às {horario}. Confirme sua participação."
        )

    def processar_lembretes_24_horas(self) -> int:
        """Processa lembretes para cultos em 24 horas"""
        return self._processar_lembretes(
            dias_antecedencia=1,
            tipo_notificacao=TipoNotificacao.LEMBRETE_24H,
            titulo="Lembrete: Culto AMANHÃ!",
            template_mensagem="AMANHÃ você está escalado(a) para {funcao} na {igreja} às {horario}. Não se esqueça!"
        )

    def _processar_lembretes(
        self,
        dias_antecedencia: int,
        tipo_notificacao: TipoNotificacao,
        titulo: str,
        template_mensagem: str
    ) -> int:
        """Processa lembretes genéricos"""
        data_alvo = date.today() + timedelta(days=dias_antecedencia)
        
        # Buscar itens de escala para a data alvo
        # Apenas escalas publicadas
        itens = self.db.query(ItemEscala).join(
            Escala, ItemEscala.escala_id == Escala.id
        ).filter(
            ItemEscala.data_culto == data_alvo,
            Escala.status == StatusEscala.PUBLICADA
        ).all()
        
        enviados = 0
        
        for item in itens:
            # Enviar para pregador
            if item.pregador_id and item.pregador:
                # Verificar se já não foi enviado este tipo de lembrete
                if not self._ja_enviou_lembrete(item.pregador_id, item.id, tipo_notificacao):
                    self._enviar_lembrete(
                        usuario=item.pregador,
                        item=item,
                        funcao="pregar",
                        tipo_notificacao=tipo_notificacao,
                        titulo=titulo,
                        template_mensagem=template_mensagem
                    )
                    enviados += 1
            
            # Enviar para cantor
            if item.cantor_id and item.cantor:
                if not self._ja_enviou_lembrete(item.cantor_id, item.id, tipo_notificacao):
                    self._enviar_lembrete(
                        usuario=item.cantor,
                        item=item,
                        funcao="cantar",
                        tipo_notificacao=tipo_notificacao,
                        titulo=titulo,
                        template_mensagem=template_mensagem
                    )
                    enviados += 1
        
        logger.info(f"Lembretes {dias_antecedencia}d: {enviados} enviados para data {data_alvo}")
        return enviados

    def _enviar_lembrete(
        self,
        usuario: Usuario,
        item: ItemEscala,
        funcao: str,
        tipo_notificacao: TipoNotificacao,
        titulo: str,
        template_mensagem: str
    ):
        """Envia lembrete para um usuário"""
        igreja_nome = item.igreja.nome if item.igreja else "Igreja"
        data_formatada = item.data_culto.strftime("%d/%m/%Y")
        horario_formatado = item.horario.strftime("%H:%M") if item.horario else "Horário não definido"
        
        mensagem = template_mensagem.format(
            funcao=funcao,
            igreja=igreja_nome,
            data=data_formatada,
            horario=horario_formatado
        )
        
        # Criar notificação in-app
        notificacao = self.notificacao_service.create(
            usuario_id=usuario.id,
            tipo=tipo_notificacao,
            titulo=titulo,
            mensagem=mensagem,
            link=f"/escalas"
        )
        
        # Enviar por canais externos conforme preferência do usuário
        self._enviar_por_canais_preferidos(usuario, titulo, mensagem, notificacao.id)
        
        logger.debug(f"Lembrete enviado para {usuario.nome_completo}: {titulo}")

    def _enviar_por_canais_preferidos(
        self,
        usuario: Usuario,
        titulo: str,
        mensagem: str,
        notificacao_id: int
    ):
        """Envia notificação pelos canais preferidos do usuário (SMS, WhatsApp, Email)"""
        # Verificar preferências do usuário
        preferencia = usuario.preferencia_notificacao
        
        if not preferencia:
            # Se não tem preferências, não envia por canais externos
            return
        
        # Verificar se lembretes estão habilitados
        if not preferencia.lembretes:
            return
        
        # Enviar por SMS se habilitado e telefone disponível
        if preferencia.sms and usuario.telefone:
            try:
                mensagem_sms = f"{titulo}\n{mensagem}"
                self.notificacao_service.send_sms(
                    usuario.telefone,
                    mensagem_sms,
                    notificacao_id
                )
                logger.info(f"SMS enviado para {usuario.nome_completo}")
            except Exception as e:
                logger.error(f"Erro ao enviar SMS para {usuario.nome_completo}: {e}")
        
        # Enviar por WhatsApp se habilitado e número disponível
        if preferencia.whatsapp and usuario.whatsapp:
            try:
                mensagem_whatsapp = f"*{titulo}*\n\n{mensagem}"
                self.notificacao_service.send_whatsapp_twilio(
                    usuario.whatsapp,
                    mensagem_whatsapp,
                    notificacao_id
                )
                logger.info(f"WhatsApp enviado para {usuario.nome_completo}")
            except Exception as e:
                logger.error(f"Erro ao enviar WhatsApp para {usuario.nome_completo}: {e}")
        
        # Enviar por Email se habilitado
        # if preferencia.email and usuario.email:
        #     TODO: Implementar envio de email assíncrono

    def _ja_enviou_lembrete(
        self, 
        usuario_id: int, 
        item_escala_id: int, 
        tipo: TipoNotificacao
    ) -> bool:
        """Verifica se já enviou este tipo de lembrete para este item"""
        from app.models.notificacao import Notificacao
        
        # Verificar se existe notificação do mesmo tipo nas últimas 24h
        # que mencione o mesmo item de escala
        ontem = datetime.now() - timedelta(days=1)
        
        existe = self.db.query(Notificacao).filter(
            Notificacao.usuario_id == usuario_id,
            Notificacao.tipo == tipo,
            Notificacao.created_at >= ontem
        ).first()
        
        return existe is not None


def executar_lembretes_7d():
    """Função para ser chamada pelo scheduler - 7 dias"""
    logger.info("Iniciando processamento de lembretes 7 dias...")
    db = SessionLocal()
    try:
        service = LembreteService(db)
        total = service.processar_lembretes_7_dias()
        logger.info(f"Lembretes 7d finalizados. Total: {total}")
    except Exception as e:
        logger.error(f"Erro ao processar lembretes 7d: {e}")
    finally:
        db.close()


def executar_lembretes_3d():
    """Função para ser chamada pelo scheduler - 3 dias"""
    logger.info("Iniciando processamento de lembretes 3 dias...")
    db = SessionLocal()
    try:
        service = LembreteService(db)
        total = service.processar_lembretes_3_dias()
        logger.info(f"Lembretes 3d finalizados. Total: {total}")
    except Exception as e:
        logger.error(f"Erro ao processar lembretes 3d: {e}")
    finally:
        db.close()


def executar_lembretes_24h():
    """Função para ser chamada pelo scheduler - 24 horas"""
    logger.info("Iniciando processamento de lembretes 24 horas...")
    db = SessionLocal()
    try:
        service = LembreteService(db)
        total = service.processar_lembretes_24_horas()
        logger.info(f"Lembretes 24h finalizados. Total: {total}")
    except Exception as e:
        logger.error(f"Erro ao processar lembretes 24h: {e}")
    finally:
        db.close()
