from app.core.database import engine
from sqlalchemy import text

# Corrigir a tabela alembic_version removendo o registro antigo incorreto
with engine.connect() as conn:
    # Deletar o registro antigo incorreto
    conn.execute(text("DELETE FROM alembic_version WHERE version_num = 'a1b2c3d4e5f6'"))
    
    # Adicionar o registro correto se não existir
    exists = conn.execute(text("SELECT COUNT(*) FROM alembic_version WHERE version_num = 'add_prioridade_horario'")).scalar()
    if exists == 0:
        # Remover qualquer registro antigo
        conn.execute(text("DELETE FROM alembic_version"))
        # Inserir a versão mais recente
        conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('add_prioridade_horario')"))
    
    conn.commit()
    
    # Verificar resultado
    result = conn.execute(text('SELECT * FROM alembic_version'))
    rows = list(result)
    print(f"Registros após correção: {len(rows)}")
    for row in rows:
        print(row)