"""
Script para inicializar o banco de dados
Cria todas as tabelas baseadas nos modelos
"""
from app.core.database import engine
from app.models import Base

def init_db():
    """Cria todas as tabelas do banco de dados"""
    print("🔧 Criando tabelas do banco de dados...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tabelas criadas com sucesso!")
    print("\n📊 Tabelas criadas:")
    for table in Base.metadata.sorted_tables:
        print(f"  - {table.name}")

if __name__ == "__main__":
    init_db()
