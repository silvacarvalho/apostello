from app.database import engine
from sqlalchemy import text, inspect

inspector = inspect(engine)

print("=== Constraints da tabela item_escala ===\n")

# Check constraints
constraints = inspector.get_check_constraints('item_escala')
if constraints:
    for c in constraints:
        print(f"CHECK: {c['name']}")
        print(f"  SQL: {c['sqltext']}\n")
else:
    print("Nenhuma CHECK constraint encontrada\n")

# Verificar se a tabela existe e quantos registros tem
with engine.connect() as conn:
    count = conn.execute(text("SELECT COUNT(*) FROM item_escala")).scalar()
    print(f"Total de itens na tabela item_escala: {count}")
    
    # Mostrar últimas escalas
    escalas = conn.execute(text("""
        SELECT e.id, e.distrito_id, e.mes, e.ano, 
               COUNT(i.id) as total_itens
        FROM escala e
        LEFT JOIN item_escala i ON i.escala_id = e.id
        GROUP BY e.id
        ORDER BY e.created_at DESC
        LIMIT 5
    """)).fetchall()
    
    print("\n=== Últimas 5 escalas ===")
    for esc in escalas:
        print(f"Escala #{esc[0]} - Distrito {esc[1]} - {esc[2]}/{esc[3]} - {esc[4]} itens")
