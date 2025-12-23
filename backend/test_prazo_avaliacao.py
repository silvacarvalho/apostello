"""
Teste de Validação do Prazo de Avaliação
Demonstra como funciona a validação do prazo configurável
"""
from datetime import date, timedelta

# Simular cenários

def teste_cenario_1():
    """
    CENÁRIO 1: Prazo de 2 dias configurado
    - Culto realizado: 20/12/2025
    - Data atual: 21/12/2025
    - Prazo expira: 22/12/2025
    - RESULTADO: Pode avaliar ✅
    """
    print("=" * 60)
    print("CENÁRIO 1: Dentro do prazo")
    print("=" * 60)
    
    prazo_dias = 2
    data_culto = date(2025, 12, 20)
    data_atual = date(2025, 12, 21)
    data_limite = data_culto + timedelta(days=prazo_dias)
    
    print(f"Configuração: Prazo de {prazo_dias} dias")
    print(f"Data do culto: {data_culto.strftime('%d/%m/%Y')}")
    print(f"Data atual: {data_atual.strftime('%d/%m/%Y')}")
    print(f"Prazo expira em: {data_limite.strftime('%d/%m/%Y')}")
    
    if data_atual <= data_limite:
        print("✅ PODE AVALIAR - Está dentro do prazo")
    else:
        print("❌ NÃO PODE AVALIAR - Prazo expirado")
    print()


def teste_cenario_2():
    """
    CENÁRIO 2: Prazo de 2 dias configurado - EXPIRADO
    - Culto realizado: 20/12/2025
    - Data atual: 23/12/2025
    - Prazo expira: 22/12/2025
    - RESULTADO: Não pode avaliar ❌
    """
    print("=" * 60)
    print("CENÁRIO 2: Prazo expirado")
    print("=" * 60)
    
    prazo_dias = 2
    data_culto = date(2025, 12, 20)
    data_atual = date(2025, 12, 23)
    data_limite = data_culto + timedelta(days=prazo_dias)
    
    print(f"Configuração: Prazo de {prazo_dias} dias")
    print(f"Data do culto: {data_culto.strftime('%d/%m/%Y')}")
    print(f"Data atual: {data_atual.strftime('%d/%m/%Y')}")
    print(f"Prazo expira em: {data_limite.strftime('%d/%m/%Y')}")
    
    if data_atual <= data_limite:
        print("✅ PODE AVALIAR - Está dentro do prazo")
    else:
        dias_atrasado = (data_atual - data_limite).days
        print(f"❌ NÃO PODE AVALIAR - Prazo expirado há {dias_atrasado} dia(s)")
        print(f"   Mensagem do sistema: 'Prazo para avaliação expirado. O prazo era de {prazo_dias} dias após o culto (até {data_limite.strftime('%d/%m/%Y')})'")
    print()


def teste_cenario_3():
    """
    CENÁRIO 3: Prazo de 7 dias (padrão)
    - Culto realizado: 16/12/2025
    - Data atual: 23/12/2025
    - Prazo expira: 23/12/2025
    - RESULTADO: Último dia para avaliar ✅
    """
    print("=" * 60)
    print("CENÁRIO 3: Último dia do prazo (7 dias - padrão)")
    print("=" * 60)
    
    prazo_dias = 7
    data_culto = date(2025, 12, 16)
    data_atual = date(2025, 12, 23)
    data_limite = data_culto + timedelta(days=prazo_dias)
    
    print(f"Configuração: Prazo de {prazo_dias} dias (padrão)")
    print(f"Data do culto: {data_culto.strftime('%d/%m/%Y')}")
    print(f"Data atual: {data_atual.strftime('%d/%m/%Y')}")
    print(f"Prazo expira em: {data_limite.strftime('%d/%m/%Y')}")
    
    if data_atual <= data_limite:
        print("✅ PODE AVALIAR - Está dentro do prazo")
        if data_atual == data_limite:
            print("⚠️  ATENÇÃO: Hoje é o último dia para avaliar!")
    else:
        print("❌ NÃO PODE AVALIAR - Prazo expirado")
    print()


def teste_pendentes():
    """
    CENÁRIO 4: Buscar avaliações pendentes
    Apenas mostra cultos realizados dentro do prazo
    """
    print("=" * 60)
    print("CENÁRIO 4: Listar avaliações pendentes (prazo 2 dias)")
    print("=" * 60)
    
    prazo_dias = 2
    data_atual = date(2025, 12, 23)
    data_limite_busca = data_atual - timedelta(days=prazo_dias)
    
    cultos_realizados = [
        {"data": date(2025, 12, 18), "igreja": "Igreja A"},  # 5 dias atrás - FORA
        {"data": date(2025, 12, 21), "igreja": "Igreja B"},  # 2 dias atrás - DENTRO
        {"data": date(2025, 12, 22), "igreja": "Igreja C"},  # 1 dia atrás - DENTRO
    ]
    
    print(f"Data atual: {data_atual.strftime('%d/%m/%Y')}")
    print(f"Prazo configurado: {prazo_dias} dias")
    print(f"Buscando cultos desde: {data_limite_busca.strftime('%d/%m/%Y')}")
    print()
    print("Avaliações pendentes:")
    
    for culto in cultos_realizados:
        dias_passados = (data_atual - culto["data"]).days
        if culto["data"] >= data_limite_busca:
            print(f"✅ {culto['igreja']} - {culto['data'].strftime('%d/%m/%Y')} (há {dias_passados} dia(s))")
        else:
            print(f"❌ {culto['igreja']} - {culto['data'].strftime('%d/%m/%Y')} (há {dias_passados} dia(s) - EXPIRADO)")
    print()


if __name__ == "__main__":
    print("\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 10 + "TESTE DE PRAZO DE AVALIAÇÃO" + " " * 21 + "║")
    print("║" + " " * 8 + "Sistema Apostello - Gestão de Escalas" + " " * 12 + "║")
    print("╚" + "=" * 58 + "╝")
    print()
    
    teste_cenario_1()
    teste_cenario_2()
    teste_cenario_3()
    teste_pendentes()
    
    print("=" * 60)
    print("RESUMO DA IMPLEMENTAÇÃO")
    print("=" * 60)
    print("""
✅ Validações implementadas no backend:

1. Ao criar avaliação:
   - Verifica prazo configurado no distrito
   - Bloqueia se expirou (data_atual > data_culto + prazo_dias)
   - Mensagem clara com data limite

2. Ao listar pendentes:
   - Usa prazo configurado (ou 7 dias padrão)
   - Mostra apenas cultos dentro do prazo
   - Ordenado por data (mais recentes primeiro)

3. Configuração flexível:
   - Cada distrito pode ter seu próprio prazo
   - Valor padrão: 7 dias
   - Range permitido: 1-30 dias
    """)
    print("=" * 60)
