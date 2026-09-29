"""
Serviço de integração com Twilio para SMS e WhatsApp
"""
from typing import Optional
from datetime import datetime, timezone

# Importação condicional do Twilio
try:
    from twilio.rest import Client
    from twilio.base.exceptions import TwilioRestException
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    Client = None
    TwilioRestException = Exception

from app.core.config import settings
from app.models.log_notificacao import LogNotificacao, CanalNotificacao, StatusEnvio


class TwilioService:
    """Serviço para envio de SMS e WhatsApp via Twilio"""
    
    def __init__(self, db=None):
        self.db = db
        self._client = None
    
    @property
    def client(self) -> Optional[Client]:
        """Retorna o cliente Twilio (lazy loading)"""
        if not TWILIO_AVAILABLE:
            return None
        if self._client is None:
            if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
                self._client = Client(
                    settings.TWILIO_ACCOUNT_SID,
                    settings.TWILIO_AUTH_TOKEN
                )
        return self._client
    
    @property
    def is_configured(self) -> bool:
        """Verifica se o Twilio está configurado"""
        return bool(
            TWILIO_AVAILABLE and
            settings.TWILIO_ACCOUNT_SID and 
            settings.TWILIO_AUTH_TOKEN and
            settings.TWILIO_PHONE_NUMBER
        )
    
    @property
    def whatsapp_configured(self) -> bool:
        """Verifica se o WhatsApp está configurado"""
        return bool(
            self.is_configured and
            settings.TWILIO_WHATSAPP_NUMBER
        )
    
    def _format_phone(self, phone: str, add_country_code: bool = True) -> str:
        """
        Formata número de telefone para o padrão E.164
        - Se já começa com '+', retorna como está (internacional)
        - Se começa com 55 e tem 12-13 dígitos, retorna +55...
        - Se tem 10-11 dígitos, adiciona +55
        """
        phone = phone.strip()
        if phone.startswith('+'):
            # Já está no formato internacional
            return phone
        digits_only = ''.join(filter(str.isdigit, phone))
        if digits_only.startswith('55') and len(digits_only) >= 12:
            return f"+{digits_only}"
        if add_country_code and not digits_only.startswith('55'):
            if len(digits_only) in [10, 11]:
                digits_only = f"55{digits_only}"
        return f"+{digits_only}"
    
    def send_sms(
        self,
        to_phone: str,
        message: str,
        notificacao_id: Optional[int] = None
    ) -> dict:
        """
        Envia SMS via Twilio
        
        Args:
            to_phone: Número de telefone do destinatário
            message: Mensagem a ser enviada
            notificacao_id: ID da notificação para log (opcional)
        
        Returns:
            dict com status, message_sid (se sucesso) e error (se falha)
        """
        if not self.is_configured:
            return {
                "success": False,
                "error": "Twilio não está configurado"
            }
        
        try:
            formatted_phone = self._format_phone(to_phone)
            
            # Enviar SMS
            twilio_message = self.client.messages.create(
                body=message,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=formatted_phone
            )
            
            # Log de sucesso
            if self.db and notificacao_id:
                self._log_envio(
                    notificacao_id,
                    CanalNotificacao.SMS,
                    StatusEnvio.ENVIADO,
                    None,
                    twilio_message.sid
                )
            
            print(f"[TWILIO SMS] Enviado para {formatted_phone} | SID: {twilio_message.sid}")
            
            return {
                "success": True,
                "message_sid": twilio_message.sid,
                "status": twilio_message.status
            }
            
        except TwilioRestException as e:
            error_msg = f"Erro Twilio: {e.code} - {e.msg}"
            
            if self.db and notificacao_id:
                self._log_envio(
                    notificacao_id,
                    CanalNotificacao.SMS,
                    StatusEnvio.FALHA,
                    error_msg
                )
            
            print(f"[TWILIO SMS ERROR] {error_msg}")
            
            return {
                "success": False,
                "error": error_msg,
                "error_code": e.code
            }
            
        except Exception as e:
            error_msg = f"Erro inesperado: {str(e)}"
            
            if self.db and notificacao_id:
                self._log_envio(
                    notificacao_id,
                    CanalNotificacao.SMS,
                    StatusEnvio.FALHA,
                    error_msg
                )
            
            print(f"[TWILIO SMS ERROR] {error_msg}")
            
            return {
                "success": False,
                "error": error_msg
            }
    
    def send_whatsapp(
        self,
        to_phone: str,
        message: str,
        notificacao_id: Optional[int] = None
    ) -> dict:
        """
        Envia mensagem via WhatsApp usando Twilio
        
        Args:
            to_phone: Número de telefone do destinatário (com ou sem whatsapp:)
            message: Mensagem a ser enviada
            notificacao_id: ID da notificação para log (opcional)
        
        Returns:
            dict com status, message_sid (se sucesso) e error (se falha)
        """
        if not self.whatsapp_configured:
            return {
                "success": False,
                "error": "Twilio WhatsApp não está configurado"
            }
        
        try:
            # Formatar número
            formatted_phone = self._format_phone(to_phone)
            
            # Adicionar prefixo whatsapp: se não tiver
            if not formatted_phone.startswith("whatsapp:"):
                formatted_phone = f"whatsapp:{formatted_phone}"
            
            # Formatar número de origem
            from_whatsapp = settings.TWILIO_WHATSAPP_NUMBER
            if not from_whatsapp.startswith("whatsapp:"):
                from_whatsapp = f"whatsapp:{from_whatsapp}"
            
            # Enviar WhatsApp
            twilio_message = self.client.messages.create(
                body=message,
                from_=from_whatsapp,
                to=formatted_phone
            )
            
            # Log de sucesso
            if self.db and notificacao_id:
                self._log_envio(
                    notificacao_id,
                    CanalNotificacao.WHATSAPP,
                    StatusEnvio.ENVIADO,
                    None,
                    twilio_message.sid
                )
            
            print(f"[TWILIO WHATSAPP] Enviado para {formatted_phone} | SID: {twilio_message.sid}")
            
            return {
                "success": True,
                "message_sid": twilio_message.sid,
                "status": twilio_message.status
            }
            
        except TwilioRestException as e:
            error_msg = f"Erro Twilio: {e.code} - {e.msg}"
            
            if self.db and notificacao_id:
                self._log_envio(
                    notificacao_id,
                    CanalNotificacao.WHATSAPP,
                    StatusEnvio.FALHA,
                    error_msg
                )
            
            print(f"[TWILIO WHATSAPP ERROR] {error_msg}")
            
            return {
                "success": False,
                "error": error_msg,
                "error_code": e.code
            }
            
        except Exception as e:
            error_msg = f"Erro inesperado: {str(e)}"
            
            if self.db and notificacao_id:
                self._log_envio(
                    notificacao_id,
                    CanalNotificacao.WHATSAPP,
                    StatusEnvio.FALHA,
                    error_msg
                )
            
            print(f"[TWILIO WHATSAPP ERROR] {error_msg}")
            
            return {
                "success": False,
                "error": error_msg
            }
    
    def _log_envio(
        self,
        notificacao_id: int,
        canal: CanalNotificacao,
        status: StatusEnvio,
        erro: Optional[str] = None,
        external_id: Optional[str] = None
    ):
        """Registra log de envio no banco"""
        if not self.db:
            return
            
        log = LogNotificacao(
            notificacao_id=notificacao_id,
            canal=canal,
            status=status,
            erro_mensagem=erro
        )
        self.db.add(log)
        self.db.commit()
    
    def get_status(self) -> dict:
        """Retorna status da configuração do Twilio"""
        return {
            "twilio_sdk_installed": TWILIO_AVAILABLE,
            "sms_configured": self.is_configured,
            "whatsapp_configured": self.whatsapp_configured,
            "phone_number": settings.TWILIO_PHONE_NUMBER if self.is_configured else None,
            "whatsapp_number": settings.TWILIO_WHATSAPP_NUMBER if self.whatsapp_configured else None
        }


# Instância singleton para uso fácil
_twilio_service = None

def get_twilio_service(db=None) -> TwilioService:
    """Retorna instância do serviço Twilio"""
    global _twilio_service
    if _twilio_service is None or db is not None:
        _twilio_service = TwilioService(db)
    return _twilio_service
