# Migrações de Banco de Dados - Alembic

Esta pasta contém as migrações de banco de dados gerenciadas pelo Alembic.

## Estrutura

```
migrations/
├── env.py              # Configuração do ambiente Alembic
├── script.py.mako      # Template para novas migrações
├── README.md           # Este arquivo
└── versions/           # Pasta com os scripts de migração
    └── 0001_initial.py # Migração inicial com todas as tabelas
```

## 🚀 Deploy em Novo Ambiente (Banco Vazio)

```bash
cd backend

# 1. Configure o .env com DATABASE_URL
cp .env.example .env
# Edite com suas configurações

# 2. Aplique todas as migrações
alembic upgrade head

# 3. Crie o usuário administrador
python -m app.scripts.create_master
```

## 🔄 Ambiente Existente (Banco já tem tabelas)

Se o banco já existe com tabelas criadas via SQLAlchemy direto:

```bash
cd backend

# Marque a migração como já aplicada (sem executar)
alembic stamp 0001
```

## Comandos Principais

### Verificar status das migrações
```bash
alembic current       # Mostra revisão atual
alembic history       # Mostra histórico de migrações
alembic heads         # Mostra última(s) revisão(ões)
```

### Aplicar migrações
```bash
alembic upgrade head     # Aplica todas as migrações pendentes
alembic upgrade +1       # Aplica próxima migração
alembic upgrade <rev>    # Aplica até revisão específica
```

### Reverter migrações
```bash
alembic downgrade -1     # Reverte última migração
alembic downgrade base   # Reverte todas as migrações
alembic downgrade <rev>  # Reverte até revisão específica
```

### Criar nova migração
```bash
# Autogenerate baseado nos models
alembic revision --autogenerate -m "descrição da mudança"

# Migração vazia (manual)
alembic revision -m "descrição da mudança"
```

### Gerar SQL sem executar
```bash
alembic upgrade head --sql > migration.sql
```

## Boas Práticas

1. **Sempre revise** as migrações auto-geradas antes de aplicar
2. **Teste downgrades** - nem todas as operações são reversíveis
3. **Use descrições claras** ao criar migrações
4. **Faça backup** antes de aplicar migrações em produção
5. **Commit migrações** junto com as mudanças de código

## Resolução de Problemas

### Erro "type already exists"
A migração inicial verifica automaticamente se os ENUMs já existem antes de criar.

### Erro "table already exists"
A migração inicial verifica automaticamente se as tabelas já existem antes de criar.

### Sincronizar banco existente
Se o banco já existe mas o Alembic não sabe:
```bash
alembic stamp 0001
```
