import sys
sys.path.insert(0, 'C:\\Users\\Rafael\\apostello\\backend')

# Testar conversão de enum
test_data = {
    "titulo": "Mordomia Cristã",
    "tipo_recorrencia": "mensal",
    "descricao": "Um tema",
    "referencia_biblica": "Malaquias 3:10",
    "ativa": True,
    "numero_semana_mes": 2,
    "dia_semana_mensal": "sabado",
    "valido_de": "2026-01-01",
    "valido_ate": "2026-12-31"
}

try:
    from app.models.horario_culto import DiaSemana
    from app.models.tematica import TipoRecorrencia
    
    print("Convertendo tipo_recorrencia:", test_data['tipo_recorrencia'])
    tipo = TipoRecorrencia(test_data['tipo_recorrencia'])
    print("Sucesso:", tipo)
    
    print("\nConvertendo dia_semana_mensal:", test_data['dia_semana_mensal'])
    dia = DiaSemana(test_data['dia_semana_mensal'])
    print("Sucesso:", dia)
    
    print("\n✓ Todas as conversões funcionaram!")
    
except Exception as e:
    print(f"\n✗ Erro: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
