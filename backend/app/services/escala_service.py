"""
Service: Escala
Lógica de negócio para escalas - ALGORITMO DE GERAÇÃO AUTOMÁTICA
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, func, or_
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Tuple
import logging
from app.models import (
    Escala, Pregacao, PerfilPregador, Usuario, Igreja, HorarioCulto,
    Tematica, PeriodoIndisponibilidade, TrocaEscala
)
from app.models.notificacao import TipoNotificacao
from app.services.config_service import (
    get_score_weights,
    get_max_pregacoes_mes_default,
    get_limite_forcado_extra_max,
)

logger = logging.getLogger(__name__)


def gerar_escala_automatica(
    db: Session,
    distrito_id: str,
    mes: int,
    ano: int,
    criado_por_id: str
) -> Tuple[Escala, Dict]:
    """
    ALGORITMO DE GERAÇÃO AUTOMÁTICA DE ESCALAS
    Baseado em SCORE dos pregadores
    
    Retorna: (escala, relatorio_geracao)
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
    from app.models.escala import StatusEscala
    
    nova_escala = Escala(
        distrito_id=distrito_id,
        mes_referencia=mes,
        ano_referencia=ano,
        status=StatusEscala.RASCUNHO.value,
        criado_por=criado_por_id
    )
    db.add(nova_escala)
    db.flush()  # Obter ID sem commit
    
    # 3. Buscar igrejas do distrito
    igrejas = db.query(Igreja).filter(
        Igreja.distrito_id == distrito_id,
        Igreja.ativo == True
    ).all()
    
    if not igrejas:
        raise ValueError("Nenhuma igreja cadastrada no distrito")
    
    # 4. Buscar pregadores do distrito (serão ordenados por score efetivo)
    # Primeiro, buscar IDs das igrejas do distrito
    igrejas_ids = [str(i.id) for i in igrejas]
    
    # Buscar usuários com perfil de pregador vinculados ao distrito OU suas igrejas
    usuarios_pregadores = db.query(Usuario).filter(
        or_(
            Usuario.distrito_id == distrito_id,
            Usuario.igreja_id.in_(igrejas_ids)
        ),
        Usuario.ativo == True,
        Usuario.status_aprovacao == "aprovado"
    ).all()
    
    print(f"[DEBUG] Total de usuários ativos e aprovados: {len(usuarios_pregadores)}")
    
    # Criar lista de pregadores com seus perfis (criar PerfilPregador se não existir)
    pregadores_list = []
    for usuario in usuarios_pregadores:
        print(f"[DEBUG] Usuário: {usuario.nome_completo}")
        print(f"[DEBUG]   - Perfis raw: {usuario.perfis}")
        print(f"[DEBUG]   - Tipo perfis: {type(usuario.perfis)}")
        
        # Verificar se tem perfil de pregador no array
        tem_perfil_pregador = False
        if usuario.perfis:
            # Converter enums para seus valores (strings)
            perfis_valores = []
            for p in usuario.perfis:
                if hasattr(p, 'value'):
                    perfis_valores.append(p.value)
                else:
                    perfis_valores.append(str(p))
            
            print(f"[DEBUG]   - Perfis valores: {perfis_valores}")
            
            # Verificar se 'pregador' está nos valores
            if 'pregador' in perfis_valores:
                tem_perfil_pregador = True
                print(f"[DEBUG]   - Encontrou 'pregador' nos perfis")
        
        if tem_perfil_pregador:
            # Buscar ou criar PerfilPregador
            perfil_pregador = db.query(PerfilPregador).filter(
                PerfilPregador.usuario_id == usuario.id
            ).first()
            
            if not perfil_pregador:
                # Criar perfil pregador se não existir
                print(f"[DEBUG] Criando PerfilPregador para usuário {usuario.nome_completo}")
                perfil_pregador = PerfilPregador(
                    usuario_id=usuario.id,
                    ativo=True,
                    max_pregacoes_mes=4,  # Valor padrão
                    score_medio=0.0
                )
                db.add(perfil_pregador)
                db.flush()
            
            if perfil_pregador.ativo:
                pregadores_list.append((usuario, perfil_pregador))
                print(f"[DEBUG]   - Adicionado à lista de pregadores")
    
    print(f"[DEBUG] Pregadores finais com perfil ativo: {len(pregadores_list)}")
    
    # Converter para o formato esperado pelo resto do código
    pregadores_query = pregadores_list

    # Normalizar como lista de tuplas puras (Usuario, PerfilPregador)
    pregadores_list = [(u, p) for (u, p) in pregadores_query]

    if not pregadores_list:
        raise ValueError("Nenhum pregador disponível no distrito")

    # 3.1 Carregar configurações de pesos e limite mensal padrão por distrito
    pesos = get_score_weights(db, distrito_id)
    limite_default = get_max_pregacoes_mes_default(db, distrito_id)
    limite_forcado_extra_max = get_limite_forcado_extra_max(db, distrito_id)

    # 3.2 Preparar estruturas auxiliares
    # - score efetivo por usuário
    # - limite mensal efetivo por usuário
    score_por_usuario: Dict[str, float] = {}
    limite_por_usuario: Dict[str, int] = {}
    for usuario, perfil in pregadores_list:
        try:
            av = float(perfil.score_avaliacoes or 0)
            fr = float(perfil.score_frequencia or 0)
            pt = float(perfil.score_pontualidade or 0)
        except Exception:
            av = fr = pt = 0.0

        score_efetivo = (
            av * pesos["avaliacoes"] + fr * pesos["frequencia"] + pt * pesos["pontualidade"]
        )
        score_por_usuario[str(usuario.id)] = score_efetivo

        limite = perfil.max_pregacoes_mes if getattr(perfil, "max_pregacoes_mes", None) else None
        try:
            limite_por_usuario[str(usuario.id)] = int(limite) if limite is not None else int(limite_default)
        except Exception:
            limite_por_usuario[str(usuario.id)] = int(limite_default)

    # 3.3 Ordenar pregadores por score efetivo (DESC)
    pregadores_list.sort(key=lambda up: score_por_usuario.get(str(up[0].id), 0.0), reverse=True)
    
    # 5. Buscar horários de culto
    horarios_cultos = buscar_horarios_culto(db, distrito_id, igrejas)
    print(f"[DEBUG] Total de horários de culto encontrados: {len(horarios_cultos)}")
    
    # Permitir criar escala mesmo sem horários - apenas avisar no relatório
    if not horarios_cultos:
        logger.warning("Nenhum horário de culto cadastrado. Escala será criada sem pregações.")
    
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
        # Usar weekday() para evitar dependência de locale
        # 0=segunda ... 2=quarta ... 5=sabado, 6=domingo
        wd = data_atual.weekday()
        if wd == 5:  # sábado
            datas_por_dia["sabado"].append(data_atual)
        elif wd == 6:  # domingo
            datas_por_dia["domingo"].append(data_atual)
        elif wd == 2:  # quarta
            datas_por_dia["quarta"].append(data_atual)

        data_atual += timedelta(days=1)

    # 8. Processar por PRIORIDADE: Sábado > Domingo > Quarta
    # Isso garante que pregadores com maior score sejam escalados primeiro para os sábados
    contador_pregacoes_mes: Dict[str, int] = {}  # Controlar limite mensal por pregador (apenas desta geração)
    ocupacao_por_dia: Dict[str, set] = {}        # Controlar ocupação por dia nesta geração: uid -> set(datas)
    estatisticas_geracao: Dict[str, Dict] = {}  # Rastrear pregações por igreja

    dias_prioridade = ["sabado", "domingo", "quarta"]

    logger.info(f"Iniciando geração de escala para distrito {distrito_id}, mês {mes}/{ano}")
    logger.info(f"Total de igrejas: {len(igrejas)}")
    logger.info(f"Total de pregadores disponíveis: {len(pregadores_list)}")
    print(f"[DEBUG] Total de horários de culto: {len(horarios_cultos)}")
    print(f"[DEBUG] Horários por dia: {[(k, len(v)) for k, v in datas_por_dia.items()]}")

    for dia_semana_pt in dias_prioridade:
        datas_deste_dia = datas_por_dia.get(dia_semana_pt, [])
        print(f"[DEBUG] Processando {dia_semana_pt}: {len(datas_deste_dia)} datas")

        for data_pregacao in datas_deste_dia:
            # Para cada igreja
            for igreja in igrejas:
                igreja_id_str = str(igreja.id)
                
                # Inicializar estatísticas desta igreja se necessário
                if igreja_id_str not in estatisticas_geracao:
                    estatisticas_geracao[igreja_id_str] = {
                        "nome": igreja.nome,
                        "pregacoes_criadas": 0,
                        "horarios_sem_pregador": 0
                    }

                # Buscar horários de culto deste dia
                horarios_dia = [
                    h for h in horarios_cultos
                    if h["dia_semana"] == dia_semana_pt and h["igreja_id"] == igreja.id
                ]
                
                print(f"[DEBUG]   Igreja {igreja.nome} em {data_pregacao}: {len(horarios_dia)} horários encontrados")

                for horario in horarios_dia:
                    # Evitar duplicidade: já existe pregação para este horário nesta escala?
                    # Verificação robusta com flush para garantir consistência
                    db.flush()
                    existe = db.query(Pregacao).filter(
                        Pregacao.escala_id == nova_escala.id,
                        Pregacao.igreja_id == str(igreja.id),
                        Pregacao.data_pregacao == data_pregacao,
                        Pregacao.horario_pregacao == horario["horario"]
                    ).first()
                    if existe:
                        logger.warning(
                            f"Duplicidade evitada: já existe pregação para Igreja={igreja.nome}, Data={data_pregacao}, Horário={horario['horario']}"
                        )
                        continue

                    # Buscar pregador disponível com maior score
                    pregador_selecionado = selecionar_pregador_disponivel(
                        db,
                        pregadores_list,
                        data_pregacao,
                        contador_pregacoes_mes,
                        limite_por_usuario,
                        igreja_id_str,
                        distrito_id,
                        ocupacao_por_dia,
                        evitar_consecutivo=True,
                    )

                    # Se ninguém encontrado respeitando o critério de evitar sequência na mesma igreja,
                    # relaxar regra e aceitar sequência (quando não houver alternativa)
                    if not pregador_selecionado:
                        pregador_selecionado = selecionar_pregador_disponivel(
                            db,
                            pregadores_list,
                            data_pregacao,
                            contador_pregacoes_mes,
                            limite_por_usuario,
                            igreja_id_str,
                            distrito_id,
                            ocupacao_por_dia,
                            evitar_consecutivo=False,
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
                            igreja_id=str(igreja.id),
                            pregador_id=str(usuario.id),
                            tematica_id=str(tematica.id) if tematica else None,
                            data_pregacao=data_pregacao,
                            horario_pregacao=horario["horario"],
                            nome_culto=horario["nome_culto"],
                            status="agendado"
                        )
                        db.add(pregacao)
                        db.flush()  # Força commit imediato para evitar duplicatas

                        # Incrementar contador mensal e marcar ocupação no dia
                        uid = str(usuario.id)
                        contador_pregacoes_mes[uid] = contador_pregacoes_mes.get(uid, 0) + 1
                        if uid not in ocupacao_por_dia:
                            ocupacao_por_dia[uid] = set()
                        ocupacao_por_dia[uid].add(data_pregacao)

                        # Atualizar estatísticas
                        estatisticas_geracao[igreja_id_str]["pregacoes_criadas"] += 1
                        
                        logger.debug(
                            f"Pregação criada: Igreja={igreja.nome}, Data={data_pregacao}, "
                            f"Pregador={usuario.nome_completo}, Horário={horario['horario']}"
                        )
                    else:
                        # Nenhum pregador disponível
                        estatisticas_geracao[igreja_id_str]["horarios_sem_pregador"] += 1
                        logger.warning(
                            f"Nenhum pregador disponível: Igreja={igreja.nome}, "
                            f"Data={data_pregacao}, Horário={horario['horario']}"
                        )
    
    # 9. Etapa de preenchimento forçado: cobrir lacunas remanescentes
    # Buscar horários que ficaram sem pregador
    lacunas = []
    for dia_semana_pt in dias_prioridade:
        datas_deste_dia = datas_por_dia.get(dia_semana_pt, [])
        for data_pregacao in datas_deste_dia:
            for igreja in igrejas:
                horarios_dia = [
                    h for h in horarios_cultos
                    if h["dia_semana"] == dia_semana_pt and h["igreja_id"] == igreja.id
                ]
                for horario in horarios_dia:
                    # Verificar se já existe pregação para este horário
                    existe = db.query(Pregacao).filter(
                        Pregacao.escala_id == nova_escala.id,
                        Pregacao.igreja_id == igreja.id,
                        Pregacao.data_pregacao == data_pregacao,
                        Pregacao.horario_pregacao == horario["horario"]
                    ).first()
                    
                    if not existe:
                        lacunas.append({
                            "igreja": igreja,
                            "data": data_pregacao,
                            "dia_semana": dia_semana_pt,
                            "horario": horario
                        })
    
    if lacunas:
        logger.warning(f"Encontradas {len(lacunas)} lacunas. Iniciando preenchimento forçado...")
        
        # Tentar preencher lacunas aumentando progressivamente o limite mensal,
        # SEM permitir duas pregações no mesmo dia e SEM desrespeitar indisponibilidade.
        for lacuna in lacunas:
            igreja = lacuna["igreja"]
            data_pregacao = lacuna["data"]
            dia_semana_pt = lacuna["dia_semana"]
            horario = lacuna["horario"]
            igreja_id_str = str(igreja.id)

            pregador_selecionado = None
            # Aumentar limite em +1, +2, ... até configuração distrital (padrão 5)
            for extra_limite in range(1, int(limite_forcado_extra_max) + 1):
                limite_flexivel = {uid: limite + extra_limite for uid, limite in limite_por_usuario.items()}
                pregador_selecionado = selecionar_pregador_disponivel(
                    db,
                    pregadores_list,
                    data_pregacao,
                    contador_pregacoes_mes,
                    limite_flexivel,
                    igreja_id_str,
                    distrito_id,
                    ocupacao_por_dia,
                    evitar_consecutivo=False,
                )
                if pregador_selecionado:
                    break
            
            if pregador_selecionado:
                usuario, perfil_pregador = pregador_selecionado
                
                # Buscar temática
                tematica = buscar_tematica_para_data(
                    db, distrito_id, data_pregacao, dia_semana_pt
                )
                
                # Evitar duplicidade também no preenchimento forçado
                # Verificação robusta com flush para garantir consistência
                db.flush()
                existe = db.query(Pregacao).filter(
                    Pregacao.escala_id == nova_escala.id,
                    Pregacao.igreja_id == str(igreja.id),
                    Pregacao.data_pregacao == data_pregacao,
                    Pregacao.horario_pregacao == horario["horario"]
                ).first()
                if existe:
                    logger.warning(
                        f"Duplicidade evitada (forçado): já existe pregação para Igreja={igreja.nome}, Data={data_pregacao}, Horário={horario['horario']}"
                    )
                    continue

                # Criar pregação
                pregacao = Pregacao(
                    escala_id=nova_escala.id,
                    igreja_id=str(igreja.id),
                    pregador_id=str(usuario.id),
                    tematica_id=str(tematica.id) if tematica else None,
                    data_pregacao=data_pregacao,
                    horario_pregacao=horario["horario"],
                    nome_culto=horario["nome_culto"],
                    status="agendado"
                )
                db.add(pregacao)
                db.flush()  # Força commit imediato para evitar duplicatas
                
                # Atualizar contadores
                uid = str(usuario.id)
                contador_pregacoes_mes[uid] = contador_pregacoes_mes.get(uid, 0) + 1
                if uid not in ocupacao_por_dia:
                    ocupacao_por_dia[uid] = set()
                ocupacao_por_dia[uid].add(data_pregacao)
                
                # Atualizar estatísticas
                estatisticas_geracao[igreja_id_str]["pregacoes_criadas"] += 1
                if estatisticas_geracao[igreja_id_str]["horarios_sem_pregador"] > 0:
                    estatisticas_geracao[igreja_id_str]["horarios_sem_pregador"] -= 1
                
                logger.info(
                    f"Lacuna preenchida (forçado): Igreja={igreja.nome}, Data={data_pregacao}, "
                    f"Pregador={usuario.nome_completo}, Horário={horario['horario']}"
                )
            else:
                logger.error(
                    f"CRÍTICO: Impossível preencher lacuna mesmo com relaxamento: "
                    f"Igreja={igreja.nome}, Data={data_pregacao}, Horário={horario['horario']}"
                )
    
    # 10. Commit e log final
    db.commit()
    db.refresh(nova_escala)
    
    # Log de estatísticas finais
    total_pregacoes = sum(e["pregacoes_criadas"] for e in estatisticas_geracao.values())
    total_sem_pregador = sum(e["horarios_sem_pregador"] for e in estatisticas_geracao.values())
    
    logger.info(f"Geração concluída: {total_pregacoes} pregações criadas")
    logger.info(f"Horários sem pregador: {total_sem_pregador}")
    
    for igreja_id_str, stats in estatisticas_geracao.items():
        logger.info(
            f"Igreja: {stats['nome']} - "
            f"Pregações: {stats['pregacoes_criadas']}, "
            f"Sem pregador: {stats['horarios_sem_pregador']}"
        )
    
    # Validação: verificar se todas igrejas receberam pelo menos 1 pregação
    igrejas_sem_pregacao = [
        stats["nome"] for stats in estatisticas_geracao.values()
        if stats["pregacoes_criadas"] == 0
    ]
    
    if igrejas_sem_pregacao:
        logger.warning(
            f"ATENÇÃO: Igrejas sem nenhuma pregação gerada: {', '.join(igrejas_sem_pregacao)}"
        )
    
    # Preparar relatório de geração
    relatorio = {
        "escala_id": str(nova_escala.id),
        "total_igrejas": len(igrejas),
        "total_pregacoes": total_pregacoes,
        "total_horarios_sem_pregador": total_sem_pregador,
        "igrejas_sem_pregacao": igrejas_sem_pregacao,
        "estatisticas_por_igreja": [
            {
                "igreja_id": igreja_id_str,
                "igreja_nome": stats["nome"],
                "pregacoes_criadas": stats["pregacoes_criadas"],
                "horarios_sem_pregador": stats["horarios_sem_pregador"]
            }
            for igreja_id_str, stats in estatisticas_geracao.items()
        ]
    }
    
    return nova_escala, relatorio


def buscar_horarios_culto(db: Session, distrito_id: str, igrejas: List[Igreja]) -> List[dict]:
    """Busca horários de culto do distrito e igrejas"""
    horarios = []
    dias_validos = {"sabado", "domingo", "quarta"}
    
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
                dia = h.dia_semana if isinstance(h.dia_semana, str) else h.dia_semana.value
                if dia in dias_validos:
                    horarios.append({
                        "igreja_id": igreja.id,
                        "dia_semana": dia,
                        "horario": h.horario,
                        "nome_culto": h.nome_culto
                    })
        else:
            # Usar horários do distrito
            for h in horarios_distrito:
                dia = h.dia_semana if isinstance(h.dia_semana, str) else h.dia_semana.value
                if dia in dias_validos:
                    horarios.append({
                        "igreja_id": igreja.id,
                        "dia_semana": dia,
                        "horario": h.horario,
                        "nome_culto": h.nome_culto
                    })
    
    return horarios


def selecionar_pregador_disponivel(
    db: Session,
    pregadores: List[tuple],
    data: date,
    contador_mes: Dict[str, int],
    limite_por_usuario: Dict[str, int],
    igreja_id: str,
    distrito_id: str,
    ocupacao_por_dia: Dict[str, set],
    *,
    evitar_consecutivo: bool = True,
) -> Optional[tuple]:
    """
    Seleciona pregador com maior score disponível
    Valida: indisponibilidade, conflitos, limite mensal
    """
    # Limites do mês (para contar pregações existentes no mês)
    primeiro_dia_mes = date(data.year, data.month, 1)
    if data.month == 12:
        ultimo_dia_mes = date(data.year + 1, 1, 1) - timedelta(days=1)
    else:
        ultimo_dia_mes = date(data.year, data.month + 1, 1) - timedelta(days=1)

    for usuario, perfil in pregadores:
        uid = str(usuario.id)
        # 0. Verificar ocupação nesta geração (mesmo dia em outra igreja)
        if uid in ocupacao_por_dia and data in ocupacao_por_dia[uid]:
            continue
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
        
        # 2.1 Evitar semanas consecutivas na MESMA igreja (quando habilitado)
        if evitar_consecutivo:
            data_anterior = data - timedelta(days=7)
            consec = db.query(Pregacao).filter(
                Pregacao.pregador_id == usuario.id,
                Pregacao.igreja_id == igreja_id,
                Pregacao.data_pregacao == data_anterior,
                Pregacao.status.in_(["agendado", "aceito", "realizado"]),
            ).first()
            if consec:
                continue

        # 3. Verificar limite mensal (considerando já escaladas no BD + desta geração)
        total_mes_existente = db.query(Pregacao).filter(
            Pregacao.pregador_id == usuario.id,
            Pregacao.data_pregacao >= primeiro_dia_mes,
            Pregacao.data_pregacao <= ultimo_dia_mes,
            Pregacao.status.in_(["agendado", "aceito", "realizado"]),
        ).count()

        pregacoes_mes_nesta_geracao = contador_mes.get(uid, 0)
        limite = limite_por_usuario.get(uid, 4)
        if (total_mes_existente + pregacoes_mes_nesta_geracao) >= limite:
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
    setattr(pregacao_sol, "foi_trocado", True)
    pregacao_sol.pregador_original_id = pregador_original_sol
    
    pregacao_dest.pregador_id = troca.usuario_solicitante_id
    setattr(pregacao_dest, "foi_trocado", True)
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
    from sqlalchemy import text
    pregadores = db.query(Usuario, PerfilPregador).join(
        PerfilPregador, Usuario.id == PerfilPregador.usuario_id
    ).filter(
        Usuario.distrito_id == escala.distrito_id,
        Usuario.ativo == True,
        Usuario.status_aprovacao == "aprovado",
        PerfilPregador.ativo == True,
        text("'pregador' = ANY(perfis)"),
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
        from sqlalchemy import text
        pastor = db.query(Usuario).filter(
            Usuario.distrito_id == escala.distrito_id,
            text("'pastor_distrital' = ANY(perfis)"),
            Usuario.ativo == True
        ).first()
        
        if pastor:
            from app.models import Igreja
            igreja = db.query(Igreja).filter(Igreja.id == pregacao.igreja_id).first()
            pregador_recusou = db.query(Usuario).filter(Usuario.id == pregacao.pregador_id).first()
            
            notificacao = Notificacao(
                usuario_id=pastor.id,
                pregacao_id=pregacao.id,
                tipo="push",  # String direta por compatibilidade
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
    from sqlalchemy import text
    pastor = db.query(Usuario).filter(
        Usuario.distrito_id == escala.distrito_id,
        text("'pastor_distrital' = ANY(perfis)"),
        Usuario.ativo == True
    ).first()
    
    if pastor:
        from app.models import Igreja
        igreja = db.query(Igreja).filter(Igreja.id == pregacao.igreja_id).first()
        pregador_recusou = db.query(Usuario).filter(Usuario.id == pregacao.pregador_id).first()
        
        notificacao = Notificacao(
            usuario_id=pastor.id,
            pregacao_id=pregacao.id,
            tipo="push",  # String direta por compatibilidade
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
