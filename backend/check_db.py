import psycopg2

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/apostello')
cur = conn.cursor()

# Verificar tabelas
cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")
tabelas = cur.fetchall()
print(f"Tabelas encontradas: {len(tabelas)}")
for t in tabelas:
    print(f"  - {t[0]}")

# Verificar ENUMs
cur.execute("SELECT typname FROM pg_type WHERE typtype='e' AND typnamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')")
enums = cur.fetchall()
print(f"\nENUMs encontrados: {len(enums)}")
for e in enums:
    print(f"  - {e[0]}")

conn.close()
