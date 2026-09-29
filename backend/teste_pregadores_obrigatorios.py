"""
Teste para verificar se todas as igrejas têm pregador na escala gerada
"""
import sys
sys.path.insert(0, '.')

from app.database import SessionLocal
from app.services.escala_service import EscalaService
from app.schemas.escala import EscalaGenerateRequest
from app.models.usuario import Usuario, TipoUsuario
from sqlalchemy import text

db = SessionLocal()

# Buscar um pastor para gerar a escala
pastor = db.query(Usuario).filter(Usuario.tipo == TipoUsuario.PASTOR_DISTRITAL).first()
if not pastor:
    print("Nenhum pastor encontrado!")
    sys.exit(1)

print(f"Gerando escala como: {pastor.nome_completo} (Distrito ID: {pastor.distrito_id})")

# Criar request para gerar escala de maio/2026
request = EscalaGenerateRequest(
    distrito_id=pastor.distrito_id,
    mes=5,  # Maio
    ano=2026,
    priorizar_sabado=True,
    usar_score=True,
    respeitar_recorrencia=True,
    respeitar_intervalo=True
)

try:
    service = EscalaService(db)
    escala = service.generate(request, pastor)
    print(f"\nEscala gerada com sucesso! ID: {escala.id}")
    print(f"Status: {escala.status}")
    
    # Verificar itens sem pregador
    result = db.execute(text("""
        SELECT COUNT(*) as total,
               SUM(CASE WHEN pregador_id IS NULL THEN 1 ELSE 0 END) as sem_pregador,
               SUM(CASE WHEN cantor_id IS NULL THEN 1 ELSE 0 END) as sem_cantor
        FROM item_escala 
        WHERE escala_id = :escala_id
    """), {"escala_id": escala.id})
    
    row = result.fetchone()
    total = row[0]
    sem_pregador = row[1]
    sem_cantor = row[2]
    
    print(f"\n=== RESULTADO ===")
    print(f"Total de itens: {total}")
    print(f"Itens sem pregador: {sem_pregador}")
    print(f"Itens sem cantor: {sem_cantor}")
    
    if sem_pregador == 0:
        print("\n✅ SUCESSO! Todas as igrejas têm pregador!")
    else:
        print(f"\n❌ PROBLEMA: {sem_pregador} cultos sem pregador")
        
        # Listar quais igrejas ficaram sem pregador
        result2 = db.execute(text("""
            SELECT i.nome, ie.data_culto, ie.horario
            FROM item_escala ie
            JOIN igreja i ON ie.igreja_id = i.id
            WHERE ie.escala_id = :escala_id AND ie.pregador_id IS NULL
            ORDER BY ie.data_culto, ie.horario
        """), {"escala_id": escala.id})
        
        print("\nCultos sem pregador:")
        for row in result2:
            print(f"  - {row[0]}: {row[1]} às {row[2]}")
    
    # Verificar conflitos
    result_conflitos_preg = db.execute(text("""
        SELECT COUNT(*) FROM (
            SELECT i1.id
            FROM item_escala i1
            JOIN item_escala i2 ON
                i1.data_culto = i2.data_culto AND
                i1.pregador_id = i2.pregador_id AND
                i1.id < i2.id AND
                i1.igreja_id != i2.igreja_id AND
                i1.escala_id = :escala_id
            WHERE i1.pregador_id IS NOT NULL
        ) as sub
    """), {"escala_id": escala.id})
    
    result_conflitos_cant = db.execute(text("""
        SELECT COUNT(*) FROM (
            SELECT i1.id
            FROM item_escala i1
            JOIN item_escala i2 ON
                i1.data_culto = i2.data_culto AND
                i1.cantor_id = i2.cantor_id AND
                i1.id < i2.id AND
                i1.igreja_id != i2.igreja_id AND
                i1.escala_id = :escala_id
            WHERE i1.cantor_id IS NOT NULL
        ) as sub
    """), {"escala_id": escala.id})
    
    conflitos_preg = result_conflitos_preg.scalar()
    conflitos_cant = result_conflitos_cant.scalar()
    
    print(f"\nConflitos de pregadores: {conflitos_preg}")
    print(f"Conflitos de cantores: {conflitos_cant}")
    
    if conflitos_preg == 0 and conflitos_cant == 0:
        print("✅ Sem conflitos!")
    else:
        print("❌ Há conflitos na escala!")

except Exception as e:
    print(f"Erro: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
