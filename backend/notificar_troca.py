"""
Script para enviar notificações de uma solicitação de troca existente
"""
import sys
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.solicitacao_troca import SolicitacaoTroca
from app.models.item_escala import ItemEscala
from app.models.escala import Escala
from app.models.igreja import Igreja
from app.models.usuario import Usuario
from app.models.enums import TipoUsuario
from app.models.notificacao import TipoNotificacao
from app.services.notificacao_service import NotificacaoService


def notificar_solicitacao_troca(solicitacao_id: int):
    """
    Envia notificações para todos os envolvidos em uma solicitação de troca.
    """
    db: Session = SessionLocal()
    
    try:
        # Buscar solicitação
        solicitacao = db.query(SolicitacaoTroca).filter(
            SolicitacaoTroca.id == solicitacao_id
        ).first()
        
        if not solicitacao:
            print(f"❌ Solicitação ID {solicitacao_id} não encontrada")
            return
        
        # Buscar dados relacionados
        item = db.query(ItemEscala).filter(
            ItemEscala.id == solicitacao.item_escala_id
        ).first()
        
        if not item:
            print(f"❌ Item de escala não encontrado")
            return
        
        escala = db.query(Escala).filter(
            Escala.id == item.escala_id
        ).first()
        
        igreja = db.query(Igreja).filter(
            Igreja.id == item.igreja_id
        ).first()
        
        solicitante = db.query(Usuario).filter(
            Usuario.id == solicitacao.solicitante_id
        ).first()
        
        substituto = db.query(Usuario).filter(
            Usuario.id == solicitacao.substituto_id
        ).first()
        
        # Preparar dados para notificação
        igreja_nome = igreja.nome if igreja else "igreja"
        tipo = solicitacao.tipo.value.lower()
        data_culto = item.data_culto.strftime('%d/%m/%Y')
        horario = item.horario.strftime('%H:%M')
        
        notificacao_service = NotificacaoService(db)
        
        print(f"\n📧 Enviando notificações para Solicitação ID {solicitacao_id}")
        print(f"   Tipo: {solicitacao.tipo.value}")
        print(f"   Status: {solicitacao.status.value}")
        print(f"   Solicitante: {solicitante.nome_completo} (ID {solicitante.id})")
        print(f"   Substituto: {substituto.nome_completo} (ID {substituto.id})")
        print(f"   Local: {igreja_nome}")
        print(f"   Data: {data_culto} às {horario}\n")
        
        # 1. Notificação para o SUBSTITUTO
        # 1. Notificação para o SOLICITANTE (confirmação)
        print(f"✉️  Criando notificação para SOLICITANTE: {solicitante.nome_completo}")
        notificacao_service.create(
            usuario_id=solicitante.id,
            tipo=TipoNotificacao.TROCA,
            titulo=f"Solicitação de Troca Enviada",
            mensagem=f"Sua solicitação de troca de {tipo} com {substituto.nome_completo} para {igreja_nome} no dia {data_culto} foi enviada. Aguardando resposta.",
            link=f"/notificacoes"
        )
        print(f"   ✅ Notificação criada\n")
        
        # 2. Notificação para o SUBSTITUTO
        print(f"✉️  Criando notificação para SUBSTITUTO: {substituto.nome_completo}")
        notificacao_service.create(
            usuario_id=substituto.id,
            tipo=TipoNotificacao.TROCA,
            titulo=f"Solicitação de Troca Recebida",
            mensagem=f"{solicitante.nome_completo} solicitou que você assuma a {tipo} na {igreja_nome} no dia {data_culto} às {horario}. Motivo: {solicitacao.motivo}",
            link=f"/notificacoes?solicitacao_id={solicitacao.id}"
        )
        print(f"   ✅ Notificação criada\n")
        
        # 3. Notificação para o PASTOR
        if solicitacao.pastor_id:
            pastor = db.query(Usuario).filter(
                Usuario.id == solicitacao.pastor_id
            ).first()
            
            if pastor:
                print(f"✉️  Criando notificação para PASTOR: {pastor.nome_completo}")
                notificacao_service.create(
                    usuario_id=pastor.id,
                    tipo=TipoNotificacao.TROCA,
                    titulo=f"Solicitação de Troca Pendente",
                    mensagem=f"{solicitante.nome_completo} solicitou troca de {tipo} com {substituto.nome_completo} para {igreja_nome} no dia {data_culto}. Motivo: {solicitacao.motivo}",
                    link=f"/notificacoes"
                )
                print(f"   ✅ Notificação criada\n")
        
        # 4. Notificações para LÍDERES DISTRITAIS
        if escala and escala.distrito_id:
            lideres = db.query(Usuario).filter(
                Usuario.tipo == TipoUsuario.LIDER_DISTRITAL,
                Usuario.distrito_id == escala.distrito_id
            ).all()
            
            if lideres:
                print(f"✉️  Criando notificações para {len(lideres)} LÍDER(ES) DISTRITAL(IS)")
                for lider in lideres:
                    notificacao_service.create(
                        usuario_id=lider.id,
                        tipo=TipoNotificacao.TROCA,
                        titulo=f"Solicitação de Troca Pendente",
                        mensagem=f"{solicitante.nome_completo} solicitou troca de {tipo} com {substituto.nome_completo} para {igreja_nome} no dia {data_culto}. Motivo: {solicitacao.motivo}",
                        link=f"/notificacoes"
                    )
                    print(f"   ✅ Notificação criada para: {lider.nome_completo}")
                print()
        
        db.commit()
        print("🎉 Todas as notificações foram criadas com sucesso!\n")
        
        # Mostrar resumo
        total_notificacoes = 1  # Solicitante
        total_notificacoes += 1  # Substituto
        
        if solicitacao.pastor_id:
            total_notificacoes += 1  # Pastor
        
        if escala and escala.distrito_id:
            total_notificacoes += db.query(Usuario).filter(
                Usuario.tipo == TipoUsuario.LIDER_DISTRITAL,
                Usuario.distrito_id == escala.distrito_id
            ).count()
        
        print(f"📊 Resumo:")
        print(f"   Total de notificações criadas: {total_notificacoes}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao criar notificações: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    # Pode passar o ID como argumento ou usar o padrão (1)
    solicitacao_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    
    print("=" * 60)
    print("  SCRIPT DE NOTIFICAÇÃO DE SOLICITAÇÃO DE TROCA")
    print("=" * 60)
    
    notificar_solicitacao_troca(solicitacao_id)
