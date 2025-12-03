"""
Service: Notificação
Sistema de notificações WhatsApp/SMS/Push/Email
"""

from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from app.models import Notificacao, Escala, Pregacao, Usuario, TrocaEscala
from app.models.notificacao import TipoNotificacao


def enviar_notificacoes_escala(db: Session, escala_id: str) -> None:
    """
    Envia notificações para todos os pregadores da escala
    Chamado quando escala é finalizada
    """
    escala = db.query(Escala).filter(Escala.id == escala_id).first()
    if not escala:
        return
    
    # Buscar todas pregações da escala
    pregacoes = db.query(Pregacao).filter(
        Pregacao.escala_id == escala_id
    ).all()
    
    for pregacao in pregacoes:
        enviar_notificacao_pregacao(db, pregacao.id)


def enviar_notificacao_pregacao(db: Session, pregacao_id: str) -> None:
    """Envia notificação para um pregador sobre uma pregação"""
    pregacao = db.query(Pregacao).filter(Pregacao.id == pregacao_id).first()
    if not pregacao:
        return
    
    usuario = db.query(Usuario).filter(Usuario.id == pregacao.pregador_id).first()
    if not usuario:
        return
    
    # Montar mensagem
    titulo = "Nova Pregação Agendada"
    mensagem = f"""
Olá {usuario.nome_completo},

Você foi escalado para pregar!

📅 Data: {pregacao.data_pregacao.strftime('%d/%m/%Y')}
🕐 Horário: {pregacao.horario_pregacao.strftime('%H:%M')}
⛪ Igreja: [Nome da Igreja]
📖 Tema sugestivo: {pregacao.tematica.titulo if pregacao.tematica else "Livre"}

Por favor, confirme sua presença pelo app.

Que Deus abençoe sua mensagem! 🙏
""".strip()
    
    # Criar notificações (conforme preferências do usuário)
    if usuario.notif_whatsapp:
        criar_notificacao(db, usuario.id, "whatsapp", titulo, mensagem, pregacao_id=pregacao_id)
    
    if usuario.notif_sms:
        criar_notificacao(db, usuario.id, "sms", titulo, mensagem, pregacao_id=pregacao_id)
    
    if usuario.notif_push:
        criar_notificacao(db, usuario.id, "push", titulo, mensagem, pregacao_id=pregacao_id)
    
    if usuario.notif_email:
        criar_notificacao(db, usuario.id, "email", titulo, mensagem, pregacao_id=pregacao_id)
    
    db.commit()


def enviar_notificacao_troca(db: Session, troca_id: str) -> None:
    """Envia notificação sobre solicitação de troca"""
    troca = db.query(TrocaEscala).filter(TrocaEscala.id == troca_id).first()
    if not troca:
        return
    
    usuario_dest = db.query(Usuario).filter(Usuario.id == troca.usuario_destinatario_id).first()
    if not usuario_dest:
        return
    
    titulo = "Solicitação de Troca de Escala"
    mensagem = f"""
Olá {usuario_dest.nome_completo},

Você recebeu uma solicitação de troca de escala!

Motivo: {troca.motivo_solicitante or "Não informado"}

Por favor, acesse o app para aceitar ou recusar.
""".strip()
    
    if usuario_dest.notif_push:
        criar_notificacao(db, usuario_dest.id, "push", titulo, mensagem, troca_id=troca_id)
    
    db.commit()


def criar_notificacao(
    db: Session,
    usuario_id: str,
    tipo: str,
    titulo: str,
    mensagem: str,
    pregacao_id: str = None,
    troca_id: str = None,
    agendado_para: datetime = None
) -> Notificacao:
    """Cria uma notificação no banco"""
    notificacao = Notificacao(
        usuario_id=usuario_id,
        tipo=tipo,
        status="pendente",
        titulo=titulo,
        mensagem=mensagem,
        pregacao_id=pregacao_id,
        troca_id=troca_id,
        agendado_para=agendado_para or datetime.utcnow()
    )
    db.add(notificacao)
    db.flush()
    
    # TODO: Integrar com Twilio (WhatsApp/SMS), Firebase (Push), SMTP (Email)
    # Por enquanto, apenas salva no banco
    
    return notificacao


def enviar_notificacoes_pendentes(db: Session) -> None:
    """
    Processa notificações pendentes
    Deve ser executado periodicamente (Celery task)
    """
    notificacoes = db.query(Notificacao).filter(
        Notificacao.status == "pendente",
        Notificacao.tentativas < Notificacao.max_tentativas,
        (Notificacao.agendado_para == None) | (Notificacao.agendado_para <= datetime.utcnow())
    ).limit(100).all()
    
    for notif in notificacoes:
        try:
            # TODO: Enviar via integração real
            # processar_envio(notif)
            
            notif.status = "enviado"
            notif.enviado_em = datetime.utcnow()
        except Exception as e:
            notif.tentativas += 1
            if notif.tentativas >= notif.max_tentativas:
                notif.status = "falhou"
                notif.falhou_em = datetime.utcnow()
                notif.motivo_falha = str(e)
    
    db.commit()
