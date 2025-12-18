"""
Serviço de Notificação - Email, WhatsApp, In-App
"""
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import httpx

from app.core.config import settings
from app.models.notificacao import Notificacao, TipoNotificacao
from app.models.log_notificacao import LogNotificacao, CanalNotificacao, StatusEnvio
from app.models.usuario import Usuario


class NotificacaoService:
    """Serviço de notificações"""

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        usuario_id: int,
        tipo: TipoNotificacao,
        titulo: str,
        mensagem: str,
        link: Optional[str] = None
    ) -> Notificacao:
        """Cria notificação in-app"""
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
        
        return notificacao

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

    async def send_whatsapp(
        self,
        phone: str,
        message: str,
        notificacao_id: Optional[int] = None
    ) -> bool:
        """Envia mensagem via WhatsApp"""
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
