#!/usr/bin/env python3
"""
Script para identificar e remover duplicatas antes de aplicar a constraint única.
"""

import psycopg2
from app.core.config import settings

def fix_duplicates():
    """Remove duplicatas mantendo sempre o registro mais recente."""
    
    try:
        conn = psycopg2.connect(settings.DATABASE_URL.replace('+psycopg2', ''))
        cursor = conn.cursor()
        
        print("=== VERIFICANDO DUPLICATAS ANTES DA LIMPEZA ===")
        
        # Verificar duplicatas existentes
        cursor.execute("""
            SELECT igreja_id, data_pregacao, horario_pregacao, COUNT(*) as total
            FROM pregacoes 
            GROUP BY igreja_id, data_pregacao, horario_pregacao 
            HAVING COUNT(*) > 1
            ORDER BY total DESC
        """)
        
        duplicates = cursor.fetchall()
        print(f"Encontradas {len(duplicates)} combinações duplicadas:")
        
        total_duplicados = 0
        for dup in duplicates:
            print(f"  Igreja: {dup[0]}, Data: {dup[1]}, Horário: {dup[2]} - {dup[3]} registros")
            total_duplicados += dup[3] - 1  # -1 porque vamos manter um
        
        if not duplicates:
            print("✅ Nenhuma duplicata encontrada!")
            return
            
        print(f"Total de registros duplicados a serem removidos: {total_duplicados}")
        
        # Para cada grupo de duplicatas, manter apenas o mais recente
        registros_removidos = 0
        
        for dup in duplicates:
            igreja_id, data_pregacao, horario_pregacao = dup[0], dup[1], dup[2]
            
            print(f"\n--- Processando: Igreja {igreja_id}, {data_pregacao} {horario_pregacao} ---")
            
            # Buscar todos os IDs para esta combinação, ordenados por criado_em DESC
            cursor.execute("""
                SELECT id, criado_em, pregador_id, status
                FROM pregacoes 
                WHERE igreja_id = %s AND data_pregacao = %s AND horario_pregacao = %s
                ORDER BY criado_em DESC
            """, (igreja_id, data_pregacao, horario_pregacao))
            
            registros = cursor.fetchall()
            
            # Manter o primeiro (mais recente), remover os outros
            manter_id = registros[0][0]
            print(f"  Mantendo: ID {manter_id} (criado em {registros[0][1]})")
            
            for registro in registros[1:]:
                print(f"  Removendo: ID {registro[0]} (criado em {registro[1]})")
                cursor.execute("DELETE FROM pregacoes WHERE id = %s", (registro[0],))
                registros_removidos += 1
        
        conn.commit()
        print(f"\n✅ {registros_removidos} registros duplicados removidos com sucesso!")
        
        # Verificação final
        print("\n=== VERIFICAÇÃO FINAL ===")
        cursor.execute("""
            SELECT igreja_id, data_pregacao, horario_pregacao, COUNT(*) as total
            FROM pregacoes 
            GROUP BY igreja_id, data_pregacao, horario_pregacao 
            HAVING COUNT(*) > 1
        """)
        
        duplicates_after = cursor.fetchall()
        if duplicates_after:
            print(f"❌ Ainda existem {len(duplicates_after)} duplicatas:")
            for dup in duplicates_after:
                print(f"  {dup}")
        else:
            print("✅ Nenhuma duplicata restante! Pronto para aplicar a constraint.")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        if conn:
            conn.rollback()
            conn.close()

if __name__ == "__main__":
    fix_duplicates()