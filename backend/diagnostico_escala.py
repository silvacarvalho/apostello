from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("=== Diagnóstico de Dados para Geração de Escalas ===\n")
    
    # Distritos
    distritos = conn.execute(text("SELECT id, nome FROM distrito WHERE status = 'ATIVO'")).fetchall()
    print(f"Distritos ativos: {len(distritos)}")
    for d in distritos:
        print(f"  - #{d[0]}: {d[1]}")
    
    print()
    
    # Igrejas por distrito
    for d in distritos:
        igrejas = conn.execute(text("""
            SELECT id, nome FROM igreja 
            WHERE distrito_id = :distrito_id AND status = 'ATIVO'
        """), {"distrito_id": d[0]}).fetchall()
        
        print(f"Distrito #{d[0]} ({d[1]}):")
        print(f"  Igrejas ativas: {len(igrejas)}")
        
        for igreja in igrejas:
            print(f"    - #{igreja[0]}: {igreja[1]}")
            
            # Horários de culto
            horarios = conn.execute(text("""
                SELECT dia_semana, horario FROM horario_culto
                WHERE igreja_id = :igreja_id AND ativo = true
                ORDER BY dia_semana, horario
            """), {"igreja_id": igreja[0]}).fetchall()
            
            if horarios:
                print(f"      Horários: {len(horarios)}")
                for h in horarios:
                    print(f"        - {h[0]}: {h[1]}")
            else:
                print(f"      ⚠️ SEM HORÁRIOS DE CULTO!")
        
        print()
        
        # Pregadores
        pregadores = conn.execute(text("""
            SELECT COUNT(*) FROM usuario
            WHERE distrito_id = :distrito_id 
            AND tipo = 'PREGADOR' 
            AND status = 'ATIVO'
            AND email != 'master@iasd.com'
        """), {"distrito_id": d[0]}).scalar()
        
        print(f"  Pregadores ativos: {pregadores}")
        
        # Cantores
        cantores = conn.execute(text("""
            SELECT COUNT(*) FROM usuario
            WHERE distrito_id = :distrito_id 
            AND tipo = 'CANTOR' 
            AND status = 'ATIVO'
            AND email != 'master@iasd.com'
        """), {"distrito_id": d[0]}).scalar()
        
        print(f"  Cantores ativos: {cantores}")
        print()
