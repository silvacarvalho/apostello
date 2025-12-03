#!/usr/bin/env python3
"""
Script para validar a geração de escalas
Testa a geração automática e verifica:
- Cobertura por sábado/domingo/quarta
- Duplicidades por igreja+data+horário
- Estatísticas por igreja
"""

import sys
import os
from collections import Counter, defaultdict
from datetime import date, datetime

# Adicionar o diretório atual ao path para importar os módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models import Distrito, Escala, Pregacao, Igreja, HorarioCulto
from app.services.escala_service import gerar_escala_automatica

def main():
    print("=== VALIDAÇÃO DA GERAÇÃO DE ESCALAS ===\n")
    
    session = SessionLocal()
    try:
        # 1. Buscar distrito ativo
        distrito = session.query(Distrito).filter(Distrito.ativo == True).first()
        if not distrito:
            print("❌ Nenhum distrito ativo encontrado")
            return
        
        print(f"🏛️  Distrito: {distrito.nome} (ID: {distrito.id})")
        
        # 2. Buscar igrejas do distrito
        igrejas = session.query(Igreja).filter(
            Igreja.distrito_id == distrito.id, 
            Igreja.ativo == True
        ).all()
        print(f"⛪ Igrejas ativas: {len(igrejas)}")
        for igreja in igrejas:
            print(f"   - {igreja.nome}")
        
        # 3. Buscar horários de culto
        horarios = session.query(HorarioCulto).filter(
            HorarioCulto.igreja_id.in_([str(i.id) for i in igrejas])
        ).all()
        print(f"🕐 Horários de culto: {len(horarios)}")
        dias_culto = Counter()
        for h in horarios:
            dias_culto[h.dia_semana] += 1
        print(f"   - Por dia: {dict(dias_culto)}")
        
        # 4. Limpar escalas anteriores para o mesmo período (teste)
        escala_existente = session.query(Escala).filter(
            Escala.distrito_id == distrito.id,
            Escala.mes_referencia == 12,
            Escala.ano_referencia == 2025
        ).first()
        if escala_existente:
            print(f"🗑️  Removendo escala existente: {escala_existente.codigo}")
            session.delete(escala_existente)
            session.commit()
        
        # 5. Gerar escala para dezembro/2025
        print(f"\n📅 Gerando escala para dezembro/2025...")
        try:
            escala, relatorio = gerar_escala_automatica(
                session, str(distrito.id), 12, 2025, None
            )
            print(f"✅ Escala criada: {escala.codigo} (ID: {escala.id})")
            print(f"📊 Relatório: {relatorio}")
        except Exception as e:
            print(f"❌ Erro na geração: {str(e)}")
            import traceback
            traceback.print_exc()
            return
        
        # 5. Validar pregações geradas
        pregacoes = session.query(Pregacao).filter(
            Pregacao.escala_id == escala.id
        ).all()
        print(f"\n🎯 Total de pregações geradas: {len(pregacoes)}")
        
        # 6. Análise por dia da semana
        print(f"\n📈 ANÁLISE POR DIA DA SEMANA:")
        by_weekday = Counter()
        for p in pregacoes:
            wd = p.data_pregacao.weekday()  # 0=Mon ... 6=Sun
            by_weekday[wd] += 1
        
        dias_nomes = {
            0: "Segunda", 1: "Terça", 2: "Quarta", 
            3: "Quinta", 4: "Sexta", 5: "Sábado", 6: "Domingo"
        }
        
        for wd, count in sorted(by_weekday.items()):
            print(f"   {dias_nomes[wd]}: {count} pregações")
        
        # Verificar se quartas estão presentes
        quartas_count = by_weekday.get(2, 0)  # 2 = quarta-feira
        print(f"🔍 Quartas-feiras: {'✅' if quartas_count > 0 else '❌'} ({quartas_count} pregações)")
        
        # 7. Verificar duplicidades por igreja+data+horário
        print(f"\n🔍 VERIFICAÇÃO DE DUPLICIDADES:")
        dup_check = set()
        duplicates = []
        
        for p in pregacoes:
            key = (str(p.igreja_id), p.data_pregacao.isoformat(), p.horario_pregacao.isoformat())
            if key in dup_check:
                duplicates.append({
                    'igreja_id': str(p.igreja_id),
                    'data': p.data_pregacao.isoformat(),
                    'horario': p.horario_pregacao.isoformat(),
                    'pregacao_id': str(p.id)
                })
            else:
                dup_check.add(key)
        
        if duplicates:
            print(f"❌ {len(duplicates)} duplicidades encontradas:")
            for dup in duplicates:
                print(f"   - Igreja {dup['igreja_id']} em {dup['data']} às {dup['horario']}")
        else:
            print("✅ Nenhuma duplicidade encontrada")
        
        # 8. Cobertura por igreja
        print(f"\n🏛️ COBERTURA POR IGREJA:")
        coverage = defaultdict(int)
        for p in pregacoes:
            coverage[str(p.igreja_id)] += 1
        
        igrejas_sem_pregacao = []
        for igreja in igrejas:
            count = coverage.get(str(igreja.id), 0)
            status = "✅" if count > 0 else "❌"
            print(f"   {status} {igreja.nome}: {count} pregações")
            if count == 0:
                igrejas_sem_pregacao.append(igreja.nome)
        
        if igrejas_sem_pregacao:
            print(f"❌ Igrejas sem pregação: {', '.join(igrejas_sem_pregacao)}")
        else:
            print("✅ Todas as igrejas têm pelo menos uma pregação")
        
        # 9. Resumo final
        print(f"\n📋 RESUMO FINAL:")
        print(f"   • Total de pregações: {len(pregacoes)}")
        print(f"   • Igrejas atendidas: {len([i for i in coverage.values() if i > 0])}/{len(igrejas)}")
        print(f"   • Quartas incluídas: {'Sim' if quartas_count > 0 else 'Não'}")
        print(f"   • Duplicidades: {'Não' if len(duplicates) == 0 else f'{len(duplicates)} encontradas'}")
        
        # 10. Análise detalhada de datas
        print(f"\n📅 ANÁLISE DETALHADA DE DATAS (Dezembro/2025):")
        datas_pregacao = sorted(set(p.data_pregacao for p in pregacoes))
        for data in datas_pregacao[:10]:  # Mostrar primeiras 10 datas
            wd = data.weekday()
            count = len([p for p in pregacoes if p.data_pregacao == data])
            print(f"   {data.strftime('%d/%m/%Y')} ({dias_nomes[wd]}): {count} pregações")
        
        if len(datas_pregacao) > 10:
            print(f"   ... e mais {len(datas_pregacao) - 10} datas")
        
    except Exception as e:
        print(f"❌ Erro na validação: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        session.close()

if __name__ == "__main__":
    main()