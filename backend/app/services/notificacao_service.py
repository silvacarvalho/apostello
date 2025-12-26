"""
Serviço de Notificação - Email, WhatsApp, SMS, In-App
"""
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import httpx
import logging

from app.core.config import settings
from app.models.notificacao import Notificacao, TipoNotificacao
from app.models.log_notificacao import LogNotificacao, CanalNotificacao, StatusEnvio
from app.models.usuario import Usuario
from app.models.preferencia_notificacao import PreferenciaNotificacao
from app.services.twilio_service import TwilioService

logger = logging.getLogger(__name__)


class NotificacaoService:
    """Serviço de notificações"""

    def __init__(self, db: Session):
        self.db = db
        self.twilio_service = TwilioService(db)

    def create(
        self,
        usuario_id: int,
        tipo: TipoNotificacao,
        titulo: str,
        mensagem: str,
        link: Optional[str] = None,
        enviar_canais_externos: bool = True
    ) -> Notificacao:
        """
        Cria notificação in-app e opcionalmente envia via canais externos (WhatsApp/SMS)
        
        Args:
            usuario_id: ID do usuário
            tipo: Tipo da notificação
            titulo: Título da notificação
            mensagem: Mensagem da notificação
            link: Link opcional
            enviar_canais_externos: Se True, envia via WhatsApp/SMS baseado nas preferências
        """
        notificacao = Notificacao(
            usuario_id=usuario_id,
            tipo=tipo,
            titulo=titulo,
            mensagem=mensagem,
            link=link
        )
        
        self.db.add(notificacao)
        self.db.commit()
        self.db.refresh(notificacao)
        
        # Enviar via canais externos se configurado
        if enviar_canais_externos:
            self._enviar_por_canais_preferidos(notificacao, tipo)
        
        return notificacao

    def _enviar_por_canais_preferidos(self, notificacao: Notificacao, tipo: TipoNotificacao):
        """
        Envia notificação via WhatsApp e/ou SMS baseado nas preferências do usuário
        """
        # Buscar usuário e suas preferências
        usuario = self.db.query(Usuario).filter(Usuario.id == notificacao.usuario_id).first()
        if not usuario:
            logger.warning(f"Usuário {notificacao.usuario_id} não encontrado para envio de notificação")
            return
        
        preferencias = self.db.query(PreferenciaNotificacao).filter(
            PreferenciaNotificacao.usuario_id == notificacao.usuario_id
        ).first()
        
        if not preferencias:
            logger.info(f"Usuário {usuario.nome_completo} não tem preferências de notificação configuradas")
            return
        
        # Verificar se o tipo de notificação está habilitado nas preferências
        tipo_habilitado = self._verificar_tipo_habilitado(preferencias, tipo)
        if not tipo_habilitado:
            logger.info(f"Tipo {tipo.value} não habilitado para usuário {usuario.nome_completo}")
            return
        
        # Montar mensagem para envio externo
        mensagem_externa = f"📢 {notificacao.titulo}\n\n{notificacao.mensagem}"
        
        # Obter número de telefone/WhatsApp do usuário
        numero_whatsapp = usuario.whatsapp or usuario.telefone
        numero_sms = usuario.telefone
        
        # Enviar via WhatsApp se habilitado
        if preferencias.whatsapp and numero_whatsapp:
            logger.info(f"Enviando WhatsApp para {usuario.nome_completo} ({numero_whatsapp})")
            result = self.twilio_service.send_whatsapp(
                numero_whatsapp, 
                mensagem_externa,
                notificacao.id
            )
            if result["success"]:
                logger.info(f"✅ WhatsApp enviado com sucesso para {usuario.nome_completo}")
            else:
                logger.warning(f"❌ Falha ao enviar WhatsApp: {result.get('error')}")
        
        # Enviar via SMS se habilitado
        if preferencias.sms and numero_sms:
            logger.info(f"Enviando SMS para {usuario.nome_completo} ({numero_sms})")
            result = self.twilio_service.send_sms(
                numero_sms, 
                mensagem_externa,
                notificacao.id
            )
            if result["success"]:
                logger.info(f"✅ SMS enviado com sucesso para {usuario.nome_completo}")
            else:
                logger.warning(f"❌ Falha ao enviar SMS: {result.get('error')}")

    def _verificar_tipo_habilitado(self, preferencias: PreferenciaNotificacao, tipo: TipoNotificacao) -> bool:
        """
        Verifica se o tipo de notificação está habilitado nas preferências do usuário
        """
        mapeamento = {
            TipoNotificacao.ESCALA_PUBLICADA: preferencias.novas_escalas,
            TipoNotificacao.LEMBRETE_7D: preferencias.lembretes,
            TipoNotificacao.LEMBRETE_3D: preferencias.lembretes,
            TipoNotificacao.LEMBRETE_24H: preferencias.lembretes,
            TipoNotificacao.AVALIACAO: preferencias.avaliacoes,
            TipoNotificacao.TROCA: preferencias.trocas_escalas,
            TipoNotificacao.PENALIDADE: True,  # Sempre enviar penalidades
            TipoNotificacao.CONFIRMACAO: preferencias.lembretes,
            TipoNotificacao.AUTO_CADASTRO_APROVADO: True,
            TipoNotificacao.AUTO_CADASTRO_RECUSADO: True,
            TipoNotificacao.AUTO_CADASTRO_PENDENTE: True,
            TipoNotificacao.SISTEMA: True,  # Sempre enviar notificações de sistema
        }
        
        return mapeamento.get(tipo, True)

    def mark_as_read(self, notificacao_id: int, usuario_id: int) -> bool:
        """Marca notificação como lida"""
        notificacao = self.db.query(Notificacao).filter(
            Notificacao.id == notificacao_id,
            Notificacao.usuario_id == usuario_id
        ).first()
        
        if notificacao:
            notificacao.lida = True
            self.db.commit()
            return True
        
        return False

    def mark_all_as_read(self, usuario_id: int) -> int:
        """Marca todas as notificações como lidas"""
        count = self.db.query(Notificacao).filter(
            Notificacao.usuario_id == usuario_id,
            Notificacao.lida == False
        ).update({"lida": True})
        
        self.db.commit()
        return count

    def get_unread(self, usuario_id: int) -> List[Notificacao]:
        """Lista notificações não lidas"""
        return self.db.query(Notificacao).filter(
            Notificacao.usuario_id == usuario_id,
            Notificacao.lida == False
        ).order_by(Notificacao.created_at.desc()).all()

    def get_all(
        self, 
        usuario_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> List[Notificacao]:
        """Lista todas as notificações"""
        return self.db.query(Notificacao).filter(
            Notificacao.usuario_id == usuario_id
        ).order_by(Notificacao.created_at.desc()).offset(skip).limit(limit).all()

    def count_unread(self, usuario_id: int) -> int:
        """Conta notificações não lidas"""
        return self.db.query(Notificacao).filter(
            Notificacao.usuario_id == usuario_id,
            Notificacao.lida == False
        ).count()

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        notificacao_id: Optional[int] = None
    ) -> bool:
        """Envia email"""
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM}>"
            message["To"] = to_email
            
            html_part = MIMEText(body_html, "html")
            message.attach(html_part)
            
            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=True
            )
            
            # Registrar log de sucesso
            if notificacao_id:
                self._log_envio(notificacao_id, CanalNotificacao.EMAIL, StatusEnvio.ENVIADO)
                
                # Atualizar notificação
                notificacao = self.db.query(Notificacao).filter(
                    Notificacao.id == notificacao_id
                ).first()
                if notificacao:
                    notificacao.enviada_email = True
                    notificacao.data_envio_email = datetime.now(timezone.utc)
                    self.db.commit()
            
            return True
            
        except Exception as e:
            # Registrar log de falha
            if notificacao_id:
                self._log_envio(
                    notificacao_id, 
                    CanalNotificacao.EMAIL, 
                    StatusEnvio.FALHA,
                    str(e)
                )
            return False

    def send_sms(
        self,
        phone: str,
        message: str,
        notificacao_id: Optional[int] = None
    ) -> bool:
        """
        Envia SMS via Twilio
        
        Args:
            phone: Número de telefone do destinatário
            message: Mensagem a ser enviada
            notificacao_id: ID da notificação para log
        
        Returns:
            True se enviado com sucesso, False caso contrário
        """
        result = self.twilio_service.send_sms(phone, message, notificacao_id)
        
        if result["success"] and notificacao_id:
            # Atualizar notificação
            notificacao = self.db.query(Notificacao).filter(
                Notificacao.id == notificacao_id
            ).first()
            if notificacao:
                notificacao.enviada_sms = True
                notificacao.data_envio_sms = datetime.now(timezone.utc)
                self.db.commit()
        
        return result["success"]

    def send_whatsapp_twilio(
        self,
        phone: str,
        message: str,
        notificacao_id: Optional[int] = None
    ) -> bool:
        """
        Envia WhatsApp via Twilio
        
        Args:
            phone: Número de telefone do destinatário
            message: Mensagem a ser enviada
            notificacao_id: ID da notificação para log
        
        Returns:
            True se enviado com sucesso, False caso contrário
        """
        result = self.twilio_service.send_whatsapp(phone, message, notificacao_id)
        
        if result["success"] and notificacao_id:
            # Atualizar notificação
            notificacao = self.db.query(Notificacao).filter(
                Notificacao.id == notificacao_id
            ).first()
            if notificacao:
                notificacao.enviada_whatsapp = True
                notificacao.data_envio_whatsapp = datetime.now(timezone.utc)
                self.db.commit()
        
        return result["success"]

    async def send_whatsapp(
        self,
        phone: str,
        message: str,
        notificacao_id: Optional[int] = None
    ) -> bool:
        """
        Envia mensagem via WhatsApp
        Tenta Twilio primeiro, depois API genérica como fallback
        """
        # Tentar Twilio primeiro
        if self.twilio_service.whatsapp_configured:
            return self.send_whatsapp_twilio(phone, message, notificacao_id)
        
        # Fallback para API genérica (Evolution API, etc)
        if not settings.WHATSAPP_API_URL or not settings.WHATSAPP_API_TOKEN:
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.WHATSAPP_API_URL}/message/sendText",
                    headers={
                        "Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "number": phone,
                        "text": message
                    }
                )
                
                if response.status_code == 200:
                    if notificacao_id:
                        self._log_envio(notificacao_id, CanalNotificacao.WHATSAPP, StatusEnvio.ENVIADO)
                        
                        notificacao = self.db.query(Notificacao).filter(
                            Notificacao.id == notificacao_id
                        ).first()
                        if notificacao:
                            notificacao.enviada_whatsapp = True
                            notificacao.data_envio_whatsapp = datetime.now(timezone.utc)
                            self.db.commit()
                    
                    return True
                else:
                    if notificacao_id:
                        self._log_envio(
                            notificacao_id, 
                            CanalNotificacao.WHATSAPP, 
                            StatusEnvio.FALHA,
                            response.text
                        )
                    return False
                    
        except Exception as e:
            if notificacao_id:
                self._log_envio(
                    notificacao_id, 
                    CanalNotificacao.WHATSAPP, 
                    StatusEnvio.FALHA,
                    str(e)
                )
            return False

    def _log_envio(
        self,
        notificacao_id: int,
        canal: CanalNotificacao,
        status: StatusEnvio,
        erro: Optional[str] = None
    ):
        """Registra log de envio"""
        log = LogNotificacao(
            notificacao_id=notificacao_id,
            canal=canal,
            status=status,
            erro_mensagem=erro
        )
        self.db.add(log)
        self.db.commit()

    def notify_escala_publicada(self, escala_id: int):
        """Notifica todos os escalados sobre publicação"""
        from app.models.escala import Escala
        from app.models.item_escala import ItemEscala
        
        escala = self.db.query(Escala).filter(Escala.id == escala_id).first()
        if not escala:
            return
        
        # Buscar todos os escalados únicos
        itens = self.db.query(ItemEscala).filter(
            ItemEscala.escala_id == escala_id
        ).all()
        
        usuarios_notificados = set()
        
        for item in itens:
            # Notificar pregador
            if item.pregador_id and item.pregador_id not in usuarios_notificados:
                self.create(
                    usuario_id=item.pregador_id,
                    tipo=TipoNotificacao.ESCALA_PUBLICADA,
                    titulo=f"Escala de {escala.mes}/{escala.ano} publicada",
                    mensagem="A escala do mês foi publicada. Confira seus horários.",
                    link=f"/escalas/{escala.id}"
                )
                usuarios_notificados.add(item.pregador_id)
            
            # Notificar cantor
            if item.cantor_id and item.cantor_id not in usuarios_notificados:
                self.create(
                    usuario_id=item.cantor_id,
                    tipo=TipoNotificacao.ESCALA_PUBLICADA,
                    titulo=f"Escala de {escala.mes}/{escala.ano} publicada",
                    mensagem="A escala do mês foi publicada. Confira seus horários.",
                    link=f"/escalas/{escala.id}"
                )
                usuarios_notificados.add(item.cantor_id)
