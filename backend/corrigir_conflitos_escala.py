"""
Script para corrigir conflitos de escalas existentes no banco de dados
Remove o segundo item em caso de conflito (mantém o primeiro)
"""
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("=== Correção de Conflitos de Escalas ===\n")
    
    # Iniciar transação
    trans = conn.begin()
    
    try:
        # Buscar IDs dos itens conflitantes (PREGADORES)
        conflitos_pregador = conn.execute(text("""
            SELECT DISTINCT i2.id
            FROM item_escala i1
            JOIN item_escala i2 ON 
                i1.data_culto = i2.data_culto AND 
                i1.pregador_id = i2.pregador_id AND 
                i1.id < i2.id AND
                i1.pregador_id IS NOT NULL
        """)).fetchall()
        
        if conflitos_pregador:
            ids_remover = [str(c[0]) for c in conflitos_pregador]
            print(f"Removendo pregadores duplicados de {len(ids_remover)} itens...")
            
            # Remover pregadores dos itens conflitantes
            conn.execute(text(f"""
                UPDATE item_escala 
                SET pregador_id = NULL,
                    status_confirmacao_pregador = 'PENDENTE'
                WHERE id IN ({','.join(ids_remover)})
            """))
            print(f"✅ {len(ids_remover)} pregadores duplicados removidos\n")
        else:
            print("✅ Nenhum conflito de pregadores para corrigir\n")
        
        # Buscar IDs dos itens conflitantes (CANTORES)
        conflitos_cantor = conn.execute(text("""
            SELECT DISTINCT i2.id
            FROM item_escala i1
            JOIN item_escala i2 ON 
                i1.data_culto = i2.data_culto AND 
                i1.cantor_id = i2.cantor_id AND 
                i1.id < i2.id AND
                i1.cantor_id IS NOT NULL
        """)).fetchall()
        
        if conflitos_cantor:
            ids_remover = [str(c[0]) for c in conflitos_cantor]
            print(f"Removendo cantores duplicados de {len(ids_remover)} itens...")
            
            # Remover cantores dos itens conflitantes
            conn.execute(text(f"""
                UPDATE item_escala 
                SET cantor_id = NULL,
                    status_confirmacao_cantor = 'PENDENTE'
                WHERE id IN ({','.join(ids_remover)})
            """))
            print(f"✅ {len(ids_remover)} cantores duplicados removidos\n")
        else:
            print("✅ Nenhum conflito de cantores para corrigir\n")
        
        # Commit da transação
        trans.commit()
        print("\n✅ Todos os conflitos foram corrigidos com sucesso!")
        print("⚠️  Os itens afetados ficaram sem pregador/cantor atribuído.")
        print("   Você pode reatribuí-los manualmente através da interface.")
        
    except Exception as e:
        trans.rollback()
        print(f"\n❌ Erro ao corrigir conflitos: {str(e)}")
        print("Nenhuma alteração foi realizada no banco de dados.")
