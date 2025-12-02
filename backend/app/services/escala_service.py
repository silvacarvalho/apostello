"""
Service: Escala
Lógica de negócio para escalas - ALGORITMO DE GERAÇÃO AUTOMÁTICA
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime, date, timedelta
from typing import List, Optional
from app.models import (
    Escala, Pregacao, PerfilPregador, Usuario, Igreja, HorarioCulto,
    Tematica, PeriodoIndisponibilidade, TrocaEscala
)


def gerar_escala_automatica(
    db: Session,
    distrito_id: str,
    mes: int,
    ano: int,
    criado_por_id: str
) -> Escala:
    """
    ALGORITMO DE GERAÇÃO AUTOMÁTICA DE ESCALAS
    Baseado em SCORE dos pregadores
    """
    
    # 1. Verificar se já existe escala para este mês
    escala_existente = db.query(Escala).filter(
        Escala.distrito_id == distrito_id,
        Escala.mes_referencia == mes,
        Escala.ano_referencia == ano
    ).first()
    
    if escala_existente:
        raise ValueError("Já existe uma escala para este período")
    
    # 2. Criar escala (status: rascunho)
    nova_escala = Escala(
        distrito_id=distrito_id,
        mes_referencia=mes,
        ano_referencia=ano,
        status="rascunho",
        criado_por=criado_por_id
    )
    db.add(nova_escala)
    db.flush()  # Obter ID sem commit
    
    # 3. Buscar pregadores do distrito ordenados por SCORE (DESC)
    pregadores = db.query(Usuario, PerfilPregador).join(
        PerfilPregador, Usuario.id == PerfilPregador.usuario_id
    ).filter(
        Usuario.distrito_id == distrito_id,
        Usuario.ativo == True,
        Usuario.status_aprovacao == "aprovado",
        PerfilPregador.ativo == True,
        Usuario.perfis.contains(["pregador"])
    ).order_by(PerfilPregador.score_medio.desc()).all()
    
    if not pregadores:
        raise ValueError("Nenhum pregador disponível no distrito")
    
    # 4. Buscar igrejas do distrito
    igrejas = db.query(Igreja).filter(
        Igreja.distrito_id == distrito_id,
        Igreja.ativo == True
    ).all()
    
    if not igrejas:
        raise ValueError("Nenhuma igreja cadastrada no distrito")
    
    # 5. Buscar horários de culto
    horarios_cultos = buscar_horarios_culto(db, distrito_id, igrejas)
    
    # 6. Gerar datas do mês
    primeiro_dia = date(ano, mes, 1)
    if mes == 12:
        ultimo_dia = date(ano + 1, 1, 1) - timedelta(days=1)
    else:
        ultimo_dia = date(ano, mes + 1, 1) - timedelta(days=1)

    # 7. Coletar todas as datas do mês separadas por dia da semana
    datas_por_dia = {
        "sabado": [],
        "domingo": [],
        "quarta": []
    }

    data_atual = primeiro_dia
    while data_atual <= ultimo_dia:
        dia_semana = data_atual.strftime("%A").lower()
        dia_semana_pt = mapear_dia_semana(dia_semana)

        if dia_semana_pt in datas_por_dia:
            datas_por_dia[dia_semana_pt].append(data_atual)

        data_atual += timedelta(days=1)

    # 8. Processar por PRIORIDADE: Sábado > Domingo > Quarta
    # Isso garante que pregadores com maior score sejam escalados primeiro para os sábados
    contador_pregacoes_mes = {}  # Controlar limite mensal por pregador

    dias_prioridade = ["sabado", "domingo", "quarta"]

    for dia_semana_pt in dias_prioridade:
        datas_deste_dia = datas_por_dia.get(dia_semana_pt, [])

        for data_pregacao in datas_deste_dia:
            # Para cada igreja
            for igreja in igrejas:
                # Buscar horários de culto deste dia
                horarios_dia = [
                    h for h in horarios_cultos
                    if h["dia_semana"] == dia_semana_pt and h["igreja_id"] == igreja.id
                ]

                for horario in horarios_dia:
                    # Buscar pregador disponível com maior score
                    pregador_selecionado = selecionar_pregador_disponivel(
                        db,
                        pregadores,
                        data_pregacao,
                        contador_pregacoes_mes
                    )

                    if pregador_selecionado:
                        usuario, perfil_pregador = pregador_selecionado

                        # Buscar temática sugestiva
                        tematica = buscar_tematica_para_data(
                            db, distrito_id, data_pregacao, dia_semana_pt
                        )

                        # Criar pregação
                        pregacao = Pregacao(
                            escala_id=nova_escala.id,
                            igreja_id=igreja.id,
                            pregador_id=usuario.id,
                            tematica_id=tematica.id if tematica else None,
                            data_pregacao=data_pregacao,
                            horario_pregacao=horario["horario"],
                            nome_culto=horario["nome_culto"],
                            status="agendado"
                        )
                        db.add(pregacao)

                        # Incrementar contador
                        contador_pregacoes_mes[usuario.id] = contador_pregacoes_mes.get(usuario.id, 0) + 1
    
    db.commit()
    db.refresh(nova_escala)
    
    return nova_escala


def buscar_horarios_culto(db: Session, distrito_id: str, igrejas: List[Igreja]) -> List[dict]:
    """Busca horários de culto do distrito e igrejas"""
    horarios = []
    
    # Horários do distrito (aplicados a todas igrejas)
    horarios_distrito = db.query(HorarioCulto).filter(
        HorarioCulto.distrito_id == distrito_id,
        HorarioCulto.ativo == True,
        HorarioCulto.requer_pregador == True
    ).all()
    
    for igreja in igrejas:
        # Horários específicos da igreja
        horarios_igreja = db.query(HorarioCulto).filter(
            HorarioCulto.igreja_id == igreja.id,
            HorarioCulto.ativo == True,
            HorarioCulto.requer_pregador == True
        ).all()
        
        if horarios_igreja:
            for h in horarios_igreja:
                horarios.append({
                    "igreja_id": igreja.id,
                    "dia_semana": h.dia_semana.value,
                    "horario": h.horario,
                    "nome_culto": h.nome_culto
                })
        else:
            # Usar horários do distrito
            for h in horarios_distrito:
                horarios.append({
                    "igreja_id": igreja.id,
                    "dia_semana": h.dia_semana.value,
                    "horario": h.horario,
                    "nome_culto": h.nome_culto
                })
    
    return horarios


def selecionar_pregador_disponivel(
    db: Session,
    pregadores: List[tuple],
    data: date,
    contador_mes: dict
) -> Optional[tuple]:
    """
    Seleciona pregador com maior score disponível
    Valida: indisponibilidade, conflitos, limite mensal
    """
    for usuario, perfil in pregadores:
        # 1. Verificar indisponibilidade
        indisponivel = db.query(PeriodoIndisponibilidade).filter(
            PeriodoIndisponibilidade.pregador_id == usuario.id,
            PeriodoIndisponibilidade.ativo == True,
            PeriodoIndisponibilidade.data_inicio <= data,
            PeriodoIndisponibilidade.data_fim >= data
        ).first()
        
        if indisponivel:
            continue
        
        # 2. Verificar conflito (já escalado no mesmo dia)
        conflito = db.query(Pregacao).filter(
            Pregacao.pregador_id == usuario.id,
            Pregacao.data_pregacao == data,
            Pregacao.status.in_(["agendado", "aceito"])
        ).first()
        
        if conflito:
            continue
        
        # 3. Verificar limite mensal
        pregacoes_mes = contador_mes.get(usuario.id, 0)
        if pregacoes_mes >= perfil.max_pregacoes_mes:
            continue
        
        # Pregador disponível!
        return (usuario, perfil)
    
    return None


def buscar_tematica_para_data(db: Session, distrito_id: str, data: date, dia_semana: str) -> Optional[Tematica]:
    """Busca temática sugestiva para uma data"""
    from app.models import Distrito
    
    # Buscar associação do distrito
    distrito = db.query(Distrito).filter(Distrito.id == distrito_id).first()
    if not distrito:
        return None
    
    # Buscar temática
    tematica = db.query(Tematica).filter(
        Tematica.associacao_id == distrito.associacao_id,
        Tematica.ativo == True,
        and_(
            # Data específica
            (Tematica.tipo_recorrencia == "data_especifica") & (Tematica.data_especifica == data) |
            # Semanal
            (Tematica.tipo_recorrencia == "semanal") & (Tematica.dia_semana_semanal == dia_semana) |
            # Mensal (simplificado)
            (Tematica.tipo_recorrencia == "mensal") & (Tematica.dia_semana_mensal == dia_semana)
        )
    ).first()
    
    return tematica


def mapear_dia_semana(dia_en: str) -> str:
    """Mapeia dia da semana EN -> PT"""
    mapa = {
        "monday": "segunda",
        "tuesday": "terca",
        "wednesday": "quarta",
        "thursday": "quinta",
        "friday": "sexta",
        "saturday": "sabado",
        "sunday": "domingo"
    }
    return mapa.get(dia_en, "sabado")


def executar_troca_automatica(db: Session, troca_id: str) -> None:
    """Executa troca automática entre pregadores"""
    troca = db.query(TrocaEscala).filter(TrocaEscala.id == troca_id).first()
    if not troca:
        return
    
    # Buscar pregações
    pregacao_sol = db.query(Pregacao).filter(Pregacao.id == troca.pregacao_solicitante_id).first()
    pregacao_dest = db.query(Pregacao).filter(Pregacao.id == troca.pregacao_destinatario_id).first()
    
    if not pregacao_sol or not pregacao_dest:
        return
    
    # Guardar pregadores originais
    pregador_original_sol = pregacao_sol.pregador_id
    pregador_original_dest = pregacao_dest.pregacao_id
    
    # TROCAR pregadores
    pregacao_sol.pregador_id = troca.usuario_destinatario_id
    pregacao_sol.foi_trocado = True
    pregacao_sol.pregador_original_id = pregador_original_sol
    
    pregacao_dest.pregador_id = troca.usuario_solicitante_id
    pregacao_dest.foi_trocado = True
    pregacao_dest.pregador_original_id = pregador_original_dest
    
    db.commit()


def sugerir_pregador_substituto(db: Session, pregacao_id: str) -> Optional[Usuario]:
    """
    Sugere um pregador substituto quando uma pregação é recusada.
    Notifica o pastor distrital com a sugestão.
    """
    from app.models import Distrito, Notificacao
    
    pregacao = db.query(Pregacao).filter(Pregacao.id == pregacao_id).first()
    if not pregacao:
        return None
    
    # Buscar escala para obter distrito
    escala = db.query(Escala).filter(Escala.id == pregacao.escala_id).first()
    if not escala:
        return None
    
    # Buscar pregadores do distrito ordenados por score
    pregadores = db.query(Usuario, PerfilPregador).join(
        PerfilPregador, Usuario.id == PerfilPregador.usuario_id
    ).filter(
        Usuario.distrito_id == escala.distrito_id,
        Usuario.ativo == True,
        Usuario.status_aprovacao == "aprovado",
        PerfilPregador.ativo == True,
        Usuario.perfis.contains(["pregador"]),
        Usuario.id != pregacao.pregador_id  # Excluir o pregador que recusou
    ).order_by(PerfilPregador.score_medio.desc()).all()
    
    # Encontrar pregador disponível
    for usuario, perfil in pregadores:
        # Verificar indisponibilidade
        indisponivel = db.query(PeriodoIndisponibilidade).filter(
            PeriodoIndisponibilidade.pregador_id == usuario.id,
            PeriodoIndisponibilidade.ativo == True,
            PeriodoIndisponibilidade.data_inicio <= pregacao.data_pregacao,
            PeriodoIndisponibilidade.data_fim >= pregacao.data_pregacao
        ).first()
        
        if indisponivel:
            continue
        
        # Verificar conflito no mesmo dia
        conflito = db.query(Pregacao).filter(
            Pregacao.pregador_id == usuario.id,
            Pregacao.data_pregacao == pregacao.data_pregacao,
            Pregacao.status.in_(["agendado", "aceito"])
        ).first()
        
        if conflito:
            continue
        
        # Verificar limite mensal
        pregacoes_mes = db.query(Pregacao).filter(
            Pregacao.pregador_id == usuario.id,
            Pregacao.data_pregacao >= pregacao.data_pregacao.replace(day=1),
            Pregacao.status.in_(["agendado", "aceito", "realizado"])
        ).count()
        
        if pregacoes_mes >= perfil.max_pregacoes_mes:
            continue
        
        # Encontrou pregador disponível! Criar notificação para o pastor
        # Buscar pastor distrital do distrito
        pastor = db.query(Usuario).filter(
            Usuario.distrito_id == escala.distrito_id,
            Usuario.perfis.contains(["pastor_distrital"]),
            Usuario.ativo == True
        ).first()
        
        if pastor:
            from app.models import Igreja
            igreja = db.query(Igreja).filter(Igreja.id == pregacao.igreja_id).first()
            pregador_recusou = db.query(Usuario).filter(Usuario.id == pregacao.pregador_id).first()
            
            notificacao = Notificacao(
                usuario_id=pastor.id,
                pregacao_id=pregacao.id,
                tipo="push",  # Usando push como notificação interna do sistema
                titulo="Pregação Recusada - Sugestão de Substituto",
                mensagem=f"O pregador {pregador_recusou.nome_completo if pregador_recusou else 'Desconhecido'} recusou a pregação do dia {pregacao.data_pregacao.strftime('%d/%m/%Y')} na {igreja.nome if igreja else 'igreja'}. "
                        f"Sugestão: {usuario.nome_completo} (Score: {perfil.score_medio:.1f})",
                dados_extra={
                    "pregacao_id": str(pregacao.id),
                    "pregador_sugerido_id": str(usuario.id),
                    "pregador_sugerido_nome": usuario.nome_completo,
                    "pregador_sugerido_score": float(perfil.score_medio) if perfil.score_medio else 0
                }
            )
            db.add(notificacao)
            db.commit()
        
        return usuario
    
    # Não encontrou substituto, notificar pastor mesmo assim
    pastor = db.query(Usuario).filter(
        Usuario.distrito_id == escala.distrito_id,
        Usuario.perfis.contains(["pastor_distrital"]),
        Usuario.ativo == True
    ).first()
    
    if pastor:
        from app.models import Igreja
        igreja = db.query(Igreja).filter(Igreja.id == pregacao.igreja_id).first()
        pregador_recusou = db.query(Usuario).filter(Usuario.id == pregacao.pregador_id).first()
        
        notificacao = Notificacao(
            usuario_id=pastor.id,
            pregacao_id=pregacao.id,
            tipo="push",  # Usando push como notificação interna do sistema
            titulo="Pregação Recusada - SEM Substituto Disponível",
            mensagem=f"O pregador {pregador_recusou.nome_completo if pregador_recusou else 'Desconhecido'} recusou a pregação do dia {pregacao.data_pregacao.strftime('%d/%m/%Y')} na {igreja.nome if igreja else 'igreja'}. "
                    f"Nenhum pregador disponível foi encontrado. Ação manual necessária.",
            dados_extra={
                "pregacao_id": str(pregacao.id),
                "sem_substituto": True
            }
        )
        db.add(notificacao)
        db.commit()
    
    return None
