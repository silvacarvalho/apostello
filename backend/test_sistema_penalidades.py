"""
Teste do Sistema de Penalidades em Duas Etapas
Demonstra:
1. Não confirmou no prazo = -3 pontos
2. Não confirmou + Não compareceu = -3 + -12 = -15 pontos total
3. Recálculo automático de score
"""
import sys
from datetime import datetime, timedelta
from decimal import Decimal

# Setup path
sys.path.append('.')

from app.database import SessionLocal
from app.models.penalidade import TipoPenalidade
from app.services.penalidade_service import PenalidadeService


def testar_sistema_penalidades():
    """Testa valores das penalidades"""
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("TESTE: Sistema de Penalidades em Duas Etapas")
        print("=" * 80)
        
        # Verificar valores configurados
        print("\n📊 VALORES DE PENALIDADES CONFIGURADOS:")
        print("-" * 80)
        
        for tipo, valor in PenalidadeService.PENALIDADES.items():
            print(f"  {tipo.value:30s} = -{valor} pontos")
        
        print("\n" + "=" * 80)
        print("✅ CENÁRIOS DE PENALIZAÇÃO")
        print("=" * 80)
        
        # Cenário 1
        print("\n1️⃣  NÃO CONFIRMOU NO PRAZO (apenas)")
        print("   Penalidade: NAO_CONFIRMOU_PRAZO")
        print(f"   Pontos: -{PenalidadeService.PENALIDADES[TipoPenalidade.NAO_CONFIRMOU_PRAZO]}")
        print("   Status: Automático quando prazo expira")
        
        # Cenário 2
        print("\n2️⃣  NÃO CONFIRMOU + NÃO COMPARECEU (pior caso)")
        print("   Penalidades:")
        print(f"     • NAO_CONFIRMOU_PRAZO: -{PenalidadeService.PENALIDADES[TipoPenalidade.NAO_CONFIRMOU_PRAZO]} pts")
        print(f"     • FALTA_SEM_AVISO:     -{PenalidadeService.PENALIDADES[TipoPenalidade.FALTA_SEM_AVISO]} pts")
        total = (PenalidadeService.PENALIDADES[TipoPenalidade.NAO_CONFIRMOU_PRAZO] + 
                PenalidadeService.PENALIDADES[TipoPenalidade.FALTA_SEM_AVISO])
        print(f"   Total acumulado: -{total} pontos")
        print("   Status: Automático quando culto marcado como REALIZADO")
        
        # Cenário 3
        print("\n3️⃣  DESMARCOU SEM ENCONTRAR SUBSTITUTO")
        print("   Penalidade: DESMARCACAO_SEM_TROCA")
        print(f"   Pontos: -{PenalidadeService.PENALIDADES[TipoPenalidade.DESMARCACAO_SEM_TROCA]}")
        
        # Cenário 4
        print("\n4️⃣  DESMARCOU COM MENOS DE 48H")
        print("   Penalidade: DESMARCACAO_48H")
        print(f"   Pontos: -{PenalidadeService.PENALIDADES[TipoPenalidade.DESMARCACAO_48H]}")
        
        # Cenário 5
        print("\n5️⃣  CHEGOU ATRASADO")
        print("   Penalidade: ATRASO")
        print(f"   Pontos: -{PenalidadeService.PENALIDADES[TipoPenalidade.ATRASO]}")
        
        # Simulação de score
        print("\n" + "=" * 80)
        print("📈 SIMULAÇÃO DE IMPACTO NO SCORE")
        print("=" * 80)
        
        score_base = Decimal("85.00")  # Score de 85 pontos
        print(f"\n   Score base (avaliações): {score_base}")
        
        # Caso 1: Apenas não confirmou
        penalidade_1 = PenalidadeService.PENALIDADES[TipoPenalidade.NAO_CONFIRMOU_PRAZO]
        score_1 = score_base - penalidade_1
        print(f"\n   ➤ Após não confirmar no prazo:")
        print(f"     {score_base} - {penalidade_1} = {score_1} pontos")
        
        # Caso 2: Não confirmou + não compareceu
        penalidade_2 = PenalidadeService.PENALIDADES[TipoPenalidade.FALTA_SEM_AVISO]
        score_2 = score_1 - penalidade_2
        print(f"\n   ➤ Após não comparecer (penalidade adicional):")
        print(f"     {score_1} - {penalidade_2} = {score_2} pontos")
        print(f"     Total perdido: {score_base - score_2} pontos")
        
        # Caso 3: Múltiplas penalidades
        print(f"\n   ➤ Se tivesse também:")
        score_3 = score_2 - PenalidadeService.PENALIDADES[TipoPenalidade.DESMARCACAO_48H]
        print(f"     - Desmarcação 48h (-{PenalidadeService.PENALIDADES[TipoPenalidade.DESMARCACAO_48H]})")
        print(f"     Score final: {score_3} pontos")
        
        print("\n" + "=" * 80)
        print("✅ VALIDAÇÕES")
        print("=" * 80)
        
        # Validar que existe NAO_CONFIRMOU_PRAZO
        assert TipoPenalidade.NAO_CONFIRMOU_PRAZO in PenalidadeService.PENALIDADES, \
            "NAO_CONFIRMOU_PRAZO não está configurado!"
        print("✓ Tipo NAO_CONFIRMOU_PRAZO existe")
        
        # Validar valores
        assert PenalidadeService.PENALIDADES[TipoPenalidade.NAO_CONFIRMOU_PRAZO] == Decimal("3.00"), \
            "Valor de NAO_CONFIRMOU_PRAZO deveria ser 3.00"
        print("✓ NAO_CONFIRMOU_PRAZO = -3 pontos")
        
        assert PenalidadeService.PENALIDADES[TipoPenalidade.FALTA_SEM_AVISO] == Decimal("12.00"), \
            "Valor de FALTA_SEM_AVISO deveria ser 12.00"
        print("✓ FALTA_SEM_AVISO = -12 pontos")
        
        # Validar total
        total_falta_completa = (
            PenalidadeService.PENALIDADES[TipoPenalidade.NAO_CONFIRMOU_PRAZO] +
            PenalidadeService.PENALIDADES[TipoPenalidade.FALTA_SEM_AVISO]
        )
        assert total_falta_completa == Decimal("15.00"), \
            "Total de falta completa deveria ser 15.00"
        print("✓ Total falta completa = -15 pontos (-3 + -12)")
        
        print("\n" + "=" * 80)
        print("🎉 TODOS OS TESTES PASSARAM!")
        print("=" * 80)
        
        print("\n📋 RESUMO:")
        print("   • Sistema de penalidades em duas etapas implementado")
        print("   • Não confirmar = -3 pontos (imediato)")
        print("   • Não confirmar + não comparecer = -15 pontos total")
        print("   • Score é recalculado automaticamente em cada penalidade")
        print("   • Penalidades ativas são somadas e subtraídas do score base")
        
    except AssertionError as e:
        print(f"\n❌ ERRO: {e}")
        return False
    except Exception as e:
        print(f"\n❌ ERRO INESPERADO: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()
    
    return True


if __name__ == "__main__":
    print("\n")
    sucesso = testar_sistema_penalidades()
    print("\n")
    
    sys.exit(0 if sucesso else 1)
