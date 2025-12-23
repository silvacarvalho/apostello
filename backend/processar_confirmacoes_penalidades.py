"""
Script para processar confirmações não respondidas e aplicar penalidades por faltas
Deve ser executado via cron job (ex: a cada 1 hora)
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.item_escala import ItemEscala, StatusConfirmacao, StatusRealizacao
from app.models.escala import Escala, StatusEscala
from app.models.configuracao_distrito import ConfiguracaoDistrito
from app.models.notificacao import TipoNotificacao
from app.services.notificacao_service import NotificacaoService
from app.services.penalidade_service import PenalidadeService


def processar_confirmacoes_pendentes(db: Session):
    """
    Processa confirmações pendentes que ultrapassaram o prazo
    Marca como NAO_CONFIRMADO, aplica penalidade de -3 pontos e notifica pastores
    """
    agora = datetime.now(timezone.utc)
    
    # Buscar itens pendentes de confirmação em escalas publicadas
    itens_pendentes = db.query(ItemEscala, Escala).join(
        Escala, ItemEscala.escala_id == Escala.id
    ).filter(
        Escala.status == StatusEscala.PUBLICADA,
        Escala.data_publicacao.isnot(None),
        ItemEscala.data_culto >= datetime.now().date(),  # Cultos futuros
        (
            (ItemEscala.pregador_id.isnot(None) & 
             (ItemEscala.status_confirmacao_pregador == StatusConfirmacao.PENDENTE)) |
            (ItemEscala.cantor_id.isnot(None) & 
             (ItemEscala.status_confirmacao_cantor == StatusConfirmacao.PENDENTE))
        )
    ).all()
    
    notificacao_service = NotificacaoService(db)
    penalidade_service = PenalidadeService(db)
    confirmacoes_expiradas = []
    
    for item, escala in itens_pendentes:
        # Buscar configuração do distrito
        config = db.query(ConfiguracaoDistrito).filter(
            ConfiguracaoDistrito.distrito_id == escala.distrito_id
        ).first()
        
        if not config or not config.confirmacao_obrigatoria:
            continue
        
        # Calcular prazo
        prazo_horas = config.prazo_confirmacao_horas
        data_limite = escala.data_publicacao + timedelta(hours=prazo_horas)
        
        # Verificar se expirou
        if agora > data_limite:
            from app.models.igreja import Igreja
            igreja = db.query(Igreja).filter(Igreja.id == item.igreja_id).first()
            igreja_nome = igreja.nome if igreja else "igreja"
            
            # Marcar pregador como não confirmado e aplicar penalidade -3 pts
            if item.pregador_id and item.status_confirmacao_pregador == StatusConfirmacao.PENDENTE:
                item.status_confirmacao_pregador = StatusConfirmacao.NAO_CONFIRMADO
                item.data_confirmacao_pregador = agora
                
                # Aplicar penalidade de -3 pontos
                penalidade_service.aplicar_penalidade_nao_confirmou(
                    usuario_id=item.pregador_id,
                    pastor_id=escala.pastor_id,
                    item_escala_id=item.id,
                    motivo=f"Não confirmou presença no prazo em {igreja_nome} ({item.data_culto.strftime('%d/%m/%Y')})"
                )
                
                confirmacoes_expiradas.append({
                    "item_id": item.id,
                    "tipo": "PREGADOR",
                    "usuario_id": item.pregador_id,
                    "igreja_id": item.igreja_id,
                    "data_culto": item.data_culto,
                    "pastor_id": escala.pastor_id
                })
            
            # Marcar cantor como não confirmado e aplicar penalidade -3 pts
            if item.cantor_id and item.status_confirmacao_cantor == StatusConfirmacao.PENDENTE:
                item.status_confirmacao_cantor = StatusConfirmacao.NAO_CONFIRMADO
                item.data_confirmacao_cantor = agora
                
                # Aplicar penalidade de -3 pontos
                penalidade_service.aplicar_penalidade_nao_confirmou(
                    usuario_id=item.cantor_id,
                    pastor_id=escala.pastor_id,
                    item_escala_id=item.id,
                    motivo=f"Não confirmou presença no prazo em {igreja_nome} ({item.data_culto.strftime('%d/%m/%Y')})"
                )
                
                confirmacoes_expiradas.append({
                    "item_id": item.id,
                    "tipo": "CANTOR",
                    "usuario_id": item.cantor_id,
                    "igreja_id": item.igreja_id,
                    "data_culto": item.data_culto,
                    "pastor_id": escala.pastor_id
                })
    
    db.commit()
    
    # Enviar alertas aos pastores
    pastor_alertas = {}
    for conf in confirmacoes_expiradas:
        pastor_id = conf["pastor_id"]
        if pastor_id not in pastor_alertas:
            pastor_alertas[pastor_id] = []
        pastor_alertas[pastor_id].append(conf)
    
    for pastor_id, lista_conf in pastor_alertas.items():
        # Buscar nome da igreja
        from app.models.igreja import Igreja
        from app.models.usuario import Usuario
        
        usuarios_nao_confirmaram = []
        for conf in lista_conf:
            igreja = db.query(Igreja).filter(Igreja.id == conf["igreja_id"]).first()
            usuario = db.query(Usuario).filter(Usuario.id == conf["usuario_id"]).first()
            
            usuarios_nao_confirmaram.append(
                f"- {usuario.nome_completo if usuario else 'Desconhecido'} "
                f"({conf['tipo']}) em {igreja.nome if igreja else 'igreja'} "
                f"no dia {conf['data_culto'].strftime('%d/%m/%Y')}"
            )
        
        mensagem = (
            f"⚠️ ALERTA: {len(lista_conf)} pregador(es)/cantor(es) "
            f"NÃO confirmaram presença no prazo:\n\n" +
            "\n".join(usuarios_nao_confirmaram) +
            "\n\n✅ Penalidade de -3 pontos já foi aplicada automaticamente." +
            "\n⚠️ Se não comparecerem, será aplicada penalidade adicional de -12 pontos."
        )
        
        notificacao_service.create(
            usuario_id=pastor_id,
            tipo=TipoNotificacao.ALERTA,
            titulo=f"❌ {len(lista_conf)} Confirmação(ões) NÃO Respondida(s)",
            mensagem=mensagem,
            link="/escalas/pendentes-confirmacao"
        )
    
    return len(confirmacoes_expiradas)


def processar_faltas_nao_avisadas(db: Session):
    """
    Detecta cultos realizados onde pregador/cantor não confirmou E não compareceu
    e aplica penalidade adicional de -12 pontos
    
    Critério: 
    - Culto foi marcado como REALIZADO
    - Pregador/Cantor não confirmou presença (NAO_CONFIRMADO)
    - Não há registro de falta justificada
    
    Total de penalidade: -3 (não confirmar) + -12 (não comparecer) = -15 pontos
    """
    from app.models.usuario import Usuario
    from app.models.igreja import Igreja
    
    penalidade_service = PenalidadeService(db)
    notificacao_service = NotificacaoService(db)
    
    # Buscar itens realizados com não confirmação
    itens_falta = db.query(ItemEscala, Escala).join(
        Escala, ItemEscala.escala_id == Escala.id
    ).filter(
        ItemEscala.status_realizacao == StatusRealizacao.REALIZADO,
        (
            (ItemEscala.status_confirmacao_pregador == StatusConfirmacao.NAO_CONFIRMADO) |
            (ItemEscala.status_confirmacao_cantor == StatusConfirmacao.NAO_CONFIRMADO)
        )
    ).all()
    
    penalidades_aplicadas = []
    
    for item, escala in itens_falta:
        # Verificar se já tem penalidade FALTA_SEM_AVISO para este item
        from app.models.penalidade import Penalidade, TipoPenalidade
        
        # Processar pregador
        if (item.pregador_id and 
            item.status_confirmacao_pregador == StatusConfirmacao.NAO_CONFIRMADO):
            
            # Verificar se já foi penalizado por FALTA
            penalidade_existente = db.query(Penalidade).filter(
                Penalidade.item_escala_id == item.id,
                Penalidade.usuario_id == item.pregador_id,
                Penalidade.tipo == TipoPenalidade.FALTA_SEM_AVISO
            ).first()
            
            if not penalidade_existente:
                igreja = db.query(Igreja).filter(Igreja.id == item.igreja_id).first()
                igreja_nome = igreja.nome if igreja else "igreja"
                
                # Aplicar penalidade adicional de -12 pontos
                penalidade = penalidade_service.aplicar_penalidade_falta_sem_aviso(
                    usuario_id=item.pregador_id,
                    pastor_id=escala.pastor_id,
                    item_escala_id=item.id,
                    motivo=f"Não confirmou e não compareceu em {igreja_nome} ({item.data_culto.strftime('%d/%m/%Y')})"
                )
                
                penalidades_aplicadas.append({
                    "usuario_id": item.pregador_id,
                    "tipo": "PREGADOR",
                    "igreja": igreja_nome,
                    "data": item.data_culto,
                    "penalidade_id": penalidade.id
                })
        
        # Processar cantor
        if (item.cantor_id and 
            item.status_confirmacao_cantor == StatusConfirmacao.NAO_CONFIRMADO):
            
            penalidade_existente = db.query(Penalidade).filter(
                Penalidade.item_escala_id == item.id,
                Penalidade.usuario_id == item.cantor_id,
                Penalidade.tipo == TipoPenalidade.FALTA_SEM_AVISO
            ).first()
            
            if not penalidade_existente:
                igreja = db.query(Igreja).filter(Igreja.id == item.igreja_id).first()
                igreja_nome = igreja.nome if igreja else "igreja"
                
                # Aplicar penalidade adicional de -12 pontos
                penalidade = penalidade_service.aplicar_penalidade_falta_sem_aviso(
                    usuario_id=item.cantor_id,
                    pastor_id=escala.pastor_id,
                    item_escala_id=item.id,
                    motivo=f"Não confirmou e não compareceu em {igreja_nome} ({item.data_culto.strftime('%d/%m/%Y')})"
                )
                
                penalidades_aplicadas.append({
                    "usuario_id": item.cantor_id,
                    "tipo": "CANTOR",
                    "igreja": igreja_nome,
                    "data": item.data_culto,
                    "penalidade_id": penalidade.id
                })
    
    # Notificar pastores sobre penalidades aplicadas
    pastor_penalidades = {}
    for pen in penalidades_aplicadas:
        pastor_id = escala.pastor_id
        if pastor_id not in pastor_penalidades:
            pastor_penalidades[pastor_id] = []
        pastor_penalidades[pastor_id].append(pen)
    
    for pastor_id, lista_pen in pastor_penalidades.items():
        mensagem = (
            f"ℹ️ {len(lista_pen)} penalidade(s) adicionais por falta foram aplicadas:\n\n" +
            "\n".join([
                f"- {p['tipo']} em {p['igreja']} ({p['data'].strftime('%d/%m/%Y')})"
                for p in lista_pen
            ]) +
            "\n\n💡 Total: -3 pontos (não confirmou) + -12 pontos (não compareceu) = -15 pontos por falta."
        )
        
        notificacao_service.create(
            usuario_id=pastor_id,
            tipo=TipoNotificacao.SISTEMA,
            titulo=f"Penalidades por Falta Aplicadas ({len(lista_pen)})",
            mensagem=mensagem,
            link="/relatorios/penalidades"
        )
    
    return len(penalidades_aplicadas)


if __name__ == "__main__":
    """
    Executar manualmente para testes ou via cron job
    """
    db = next(get_db())
    
    try:
        print("Processando confirmações pendentes...")
        confirmacoes = processar_confirmacoes_pendentes(db)
        print(f"✅ {confirmacoes} confirmação(ões) expirada(s) processada(s)")
        
        print("\nProcessando faltas não avisadas...")
        penalidades = processar_faltas_nao_avisadas(db)
        print(f"✅ {penalidades} penalidade(s) aplicada(s)")
        
    finally:
        db.close()
