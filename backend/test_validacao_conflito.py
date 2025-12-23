"""
Teste para validar que não é possível escalar o mesmo pregador/cantor
em dois cultos diferentes na mesma data
"""
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("=== Teste de Validação de Conflito de Escalas ===\n")
    
    # Buscar itens com pregadores escalados no mesmo dia
    conflitos_pregador = conn.execute(text("""
        SELECT 
            i1.id as item1_id,
            i1.data_culto,
            i1.horario as horario1,
            i1.pregador_id,
            u.nome_completo as pregador_nome,
            ig1.nome as igreja1,
            i2.id as item2_id,
            i2.horario as horario2,
            ig2.nome as igreja2
        FROM item_escala i1
        JOIN item_escala i2 ON 
            i1.data_culto = i2.data_culto AND 
            i1.pregador_id = i2.pregador_id AND 
            i1.id < i2.id AND
            i1.pregador_id IS NOT NULL
        JOIN usuario u ON u.id = i1.pregador_id
        JOIN igreja ig1 ON ig1.id = i1.igreja_id
        JOIN igreja ig2 ON ig2.id = i2.igreja_id
        ORDER BY i1.data_culto, u.nome_completo
    """)).fetchall()
    
    if conflitos_pregador:
        print(f"⚠️  ATENÇÃO: Encontrados {len(conflitos_pregador)} conflitos de PREGADORES:\n")
        for c in conflitos_pregador:
            print(f"Data: {c[1]}")
            print(f"Pregador: {c[4]}")
            print(f"  - Item #{c[0]}: {c[5]} às {c[2]}")
            print(f"  - Item #{c[6]}: {c[8]} às {c[7]}")
            print()
    else:
        print("✅ Nenhum conflito de pregadores encontrado\n")
    
    # Buscar itens com cantores escalados no mesmo dia
    conflitos_cantor = conn.execute(text("""
        SELECT 
            i1.id as item1_id,
            i1.data_culto,
            i1.horario as horario1,
            i1.cantor_id,
            u.nome_completo as cantor_nome,
            ig1.nome as igreja1,
            i2.id as item2_id,
            i2.horario as horario2,
            ig2.nome as igreja2
        FROM item_escala i1
        JOIN item_escala i2 ON 
            i1.data_culto = i2.data_culto AND 
            i1.cantor_id = i2.cantor_id AND 
            i1.id < i2.id AND
            i1.cantor_id IS NOT NULL
        JOIN usuario u ON u.id = i1.cantor_id
        JOIN igreja ig1 ON ig1.id = i1.igreja_id
        JOIN igreja ig2 ON ig2.id = i2.igreja_id
        ORDER BY i1.data_culto, u.nome_completo
    """)).fetchall()
    
    if conflitos_cantor:
        print(f"⚠️  ATENÇÃO: Encontrados {len(conflitos_cantor)} conflitos de CANTORES:\n")
        for c in conflitos_cantor:
            print(f"Data: {c[1]}")
            print(f"Cantor: {c[4]}")
            print(f"  - Item #{c[0]}: {c[5]} às {c[2]}")
            print(f"  - Item #{c[6]}: {c[8]} às {c[7]}")
            print()
    else:
        print("✅ Nenhum conflito de cantores encontrado\n")
    
    print("\n=== Resumo ===")
    print(f"Total de conflitos encontrados: {len(conflitos_pregador) + len(conflitos_cantor)}")
    
    if len(conflitos_pregador) + len(conflitos_cantor) == 0:
        print("\n✅ Sistema está íntegro! Nenhum conflito detectado.")
    else:
        print("\n⚠️  Sistema possui conflitos que precisam ser corrigidos!")
