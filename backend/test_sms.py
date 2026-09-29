"""Script para testar o envio de SMS para o telefone atualizado"""
import logging

logging.basicConfig(level=logging.INFO)

from app.database import SessionLocal
from app.models.notificacao import TipoNotificacao
from app.services.notificacao_service import NotificacaoService

db = SessionLocal()

try:
    notificacao_service = NotificacaoService(db)
    print("=" * 60)
    print("  TESTE DE SMS")
    print("=" * 60)
    print()
    # Envio explícito de SMS
    result = notificacao_service.twilio_service.send_sms(
        to_phone='+559492982113',
        message='Este é um teste de SMS para o número +55 94 9298-2113.'
    )
    print()
    if result.get('success'):
        print('✅ SMS enviado com sucesso!')
        print(f"SID: {result.get('sid')}")
    else:
        print('❌ Falha ao enviar SMS!')
        print(f"Erro: {result.get('error')}")
except Exception as e:
    print(f"❌ Erro: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
print("\nFim do teste de SMS.")
