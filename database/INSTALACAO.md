# 🚀 GUIA DE INSTALAÇÃO - Banco de Dados PostgreSQL

## Sistema de Gestão de Escalas de Pregação - IASD

---

## 📋 PRÉ-REQUISITOS

### 1. PostgreSQL 15 ou superior
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-15 postgresql-contrib-15

# Verificar instalação
psql --version
# Deve exibir: psql (PostgreSQL) 15.x
```

### 2. Extensões Necessárias
- `uuid-ossp` - Geração de UUIDs
- `pgcrypto` - Funções de criptografia

---

## 🛠️ INSTALAÇÃO PASSO A PASSO

### PASSO 1: Criar Banco de Dados

```bash
# Conectar como superusuário
sudo -u postgres psql

# Criar banco de dados
CREATE DATABASE apostello_db;

# Criar usuário
CREATE USER apostello_user WITH PASSWORD 'senha_segura_aqui';

# Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE apostello_db TO apostello_user;

# Sair
\q
```

### PASSO 2: Conectar ao Banco

```bash
# Conectar ao banco criado
psql -U apostello_user -d apostello_db -h localhost

# Ou como postgres (superusuário)
sudo -u postgres psql apostello_db
```

### PASSO 3: Executar Script de Schema

```bash
# Opção 1: Via linha de comando
psql -U apostello_user -d apostello_db -h localhost -f database/schema.sql

# Opção 2: Dentro do psql
\i /caminho/completo/para/database/schema.sql
```

### PASSO 4: Verificar Instalação

```sql
-- Listar tabelas criadas
\dt

-- Deve exibir 17 tabelas:
-- associations, districts, churches, users, preacher_profiles,
-- worship_times, themes, schedules, preaching_schedules,
-- schedule_swaps, unavailability_periods, evaluations,
-- notifications, settings, audit_logs, import_logs

-- Listar ENUMs
\dT

-- Listar funções
\df

-- Listar views
\dv
```

---

## ✅ VALIDAÇÃO DA INSTALAÇÃO

### 1. Verificar Extensões

```sql
SELECT * FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');
```

**Resultado esperado:**
```
   extname    | extversion
--------------+------------
 uuid-ossp    | 1.1
 pgcrypto     | 1.3
```

### 2. Verificar Tabelas

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Resultado esperado: 17 tabelas**

### 3. Verificar ENUMs

```sql
SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname;
```

**Resultado esperado: 8 ENUMs**

### 4. Verificar Funções

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

**Resultado esperado:**
- calculate_preacher_score
- update_preacher_statistics
- update_updated_at_column
- handle_preaching_refusal
- handle_evaluation_change

### 5. Verificar Views

```sql
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Resultado esperado:**
- vw_preachers_full
- vw_upcoming_preachings

### 6. Verificar Triggers

```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;
```

**Resultado esperado: 15+ triggers**

### 7. Verificar Dados Iniciais

```sql
-- Verificar associação padrão criada
SELECT * FROM associations;
```

**Resultado esperado:**
```
id: 00000000-0000-0000-0000-000000000001
name: Associação Exemplo
acronym: AE
```

---

## 🧪 TESTES BÁSICOS

### TESTE 1: Criar Usuário

```sql
-- Inserir usuário de teste
INSERT INTO users (
    email,
    password_hash,
    full_name,
    roles
) VALUES (
    'teste@exemplo.com',
    crypt('senha123', gen_salt('bf')),
    'Usuário Teste',
    ARRAY['preacher']::user_role[]
) RETURNING id;
```

### TESTE 2: Criar Perfil de Pregador

```sql
-- Inserir perfil de pregador (usando UUID retornado acima)
INSERT INTO preacher_profiles (
    user_id,
    ordination_type
) VALUES (
    'USER_UUID_AQUI',
    'Ancião'
);
```

### TESTE 3: Calcular Score

```sql
-- Calcular score do pregador
SELECT calculate_preacher_score('USER_UUID_AQUI');

-- Verificar resultado
SELECT score_average FROM preacher_profiles WHERE user_id = 'USER_UUID_AQUI';
```

### TESTE 4: Criar Distrito e Igreja

```sql
-- Inserir distrito
INSERT INTO districts (
    association_id,
    name,
    code
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Distrito Central',
    'DC001'
) RETURNING id;

-- Inserir igreja
INSERT INTO churches (
    district_id,
    name,
    city
) VALUES (
    'DISTRICT_UUID_AQUI',
    'Igreja Central',
    'São Paulo'
) RETURNING id;
```

### TESTE 5: Criar Escala

```sql
-- Inserir escala mensal
INSERT INTO schedules (
    district_id,
    reference_month,
    reference_year,
    status
) VALUES (
    'DISTRICT_UUID_AQUI',
    12,
    2025,
    'draft'
) RETURNING id;
```

---

## 🔧 CONFIGURAÇÕES ADICIONAIS

### 1. Ajustar Configurações de Performance

```sql
-- Editar postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf

# Ajustar para performance
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 16MB
max_connections = 100
```

### 2. Configurar Autenticação

```bash
# Editar pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Adicionar linha para permitir conexões locais
host    apostello_db    apostello_user    127.0.0.1/32    md5
host    apostello_db    apostello_user    ::1/128         md5
```

### 3. Reiniciar PostgreSQL

```bash
sudo systemctl restart postgresql
```

---

## 🐳 INSTALAÇÃO COM DOCKER

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: apostello_db
    restart: always
    environment:
      POSTGRES_DB: apostello_db
      POSTGRES_USER: apostello_user
      POSTGRES_PASSWORD: senha_segura_aqui
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U apostello_user -d apostello_db"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Comandos Docker

```bash
# Subir banco de dados
docker-compose up -d postgres

# Verificar logs
docker-compose logs -f postgres

# Conectar ao banco
docker exec -it apostello_db psql -U apostello_user -d apostello_db

# Parar banco
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados)
docker-compose down -v
```

---

## 📊 BACKUP E RESTORE

### Backup Completo

```bash
# Backup do banco inteiro
pg_dump -U apostello_user -d apostello_db -F c -f backup_apostello_$(date +%Y%m%d).dump

# Backup apenas do schema
pg_dump -U apostello_user -d apostello_db --schema-only -f backup_schema_$(date +%Y%m%d).sql

# Backup apenas dos dados
pg_dump -U apostello_user -d apostello_db --data-only -f backup_data_$(date +%Y%m%d).sql
```

### Restore

```bash
# Restore completo
pg_restore -U apostello_user -d apostello_db -c backup_apostello_20251121.dump

# Restore de SQL
psql -U apostello_user -d apostello_db -f backup_schema_20251121.sql
```

### Backup Automático (Cron)

```bash
# Editar crontab
crontab -e

# Adicionar backup diário às 2h da manhã
0 2 * * * pg_dump -U apostello_user -d apostello_db -F c -f /backups/apostello_$(date +\%Y\%m\%d).dump

# Manter apenas últimos 7 dias
0 3 * * * find /backups -name "apostello_*.dump" -mtime +7 -delete
```

---

## 🔍 TROUBLESHOOTING

### Problema: "Extension not found"

```sql
-- Instalar extensões como superusuário
sudo -u postgres psql apostello_db

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Problema: "Permission denied"

```sql
-- Conceder permissões adicionais
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO apostello_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO apostello_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO apostello_user;
```

### Problema: "Function does not exist"

```bash
# Verificar se schema.sql foi executado completamente
psql -U apostello_user -d apostello_db -f database/schema.sql
```

### Problema: "Trigger not firing"

```sql
-- Verificar se triggers foram criados
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Recriar triggers se necessário
DROP TRIGGER IF EXISTS trigger_name ON table_name;
-- Re-executar script de schema
```

---

## 📝 MANUTENÇÃO

### Vacuum e Analyze (Performance)

```sql
-- Vacuum completo (recomendado semanalmente)
VACUUM ANALYZE;

-- Vacuum em tabela específica
VACUUM ANALYZE users;

-- Vacuum full (bloqueia tabela, usar com cuidado)
VACUUM FULL;
```

### Reindexar (se necessário)

```sql
-- Reindexar banco inteiro
REINDEX DATABASE apostello_db;

-- Reindexar tabela específica
REINDEX TABLE users;
```

### Verificar Tamanho das Tabelas

```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Verificar Conexões Ativas

```sql
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query
FROM pg_stat_activity
WHERE datname = 'apostello_db';
```

---

## 🔐 SEGURANÇA

### 1. Senha Forte

```bash
# Gerar senha aleatória
openssl rand -base64 32
```

### 2. SSL/TLS (Produção)

```bash
# Editar postgresql.conf
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'
```

### 3. Firewall

```bash
# Permitir apenas localhost
sudo ufw allow from 127.0.0.1 to any port 5432

# Ou permitir IPs específicos
sudo ufw allow from 192.168.1.100 to any port 5432
```

### 4. Auditoria

```sql
-- Ativar log de conexões
log_connections = on
log_disconnections = on

-- Log de queries lentas (>1s)
log_min_duration_statement = 1000
```

---

## ✅ CHECKLIST DE INSTALAÇÃO

- [ ] PostgreSQL 15+ instalado
- [ ] Banco `apostello_db` criado
- [ ] Usuário `apostello_user` criado
- [ ] Script `schema.sql` executado com sucesso
- [ ] Extensões instaladas (`uuid-ossp`, `pgcrypto`)
- [ ] 17 tabelas criadas
- [ ] 8 ENUMs criados
- [ ] 3 funções criadas
- [ ] 15+ triggers criados
- [ ] 2 views criadas
- [ ] Dados iniciais inseridos (associação padrão)
- [ ] Testes básicos executados
- [ ] Backup configurado
- [ ] Configurações de segurança aplicadas

---

## 📞 SUPORTE

Em caso de problemas, consulte:

1. **Logs do PostgreSQL:**
   ```bash
   sudo tail -f /var/log/postgresql/postgresql-15-main.log
   ```

2. **Documentação oficial:**
   - PostgreSQL: https://www.postgresql.org/docs/15/
   - UUID: https://www.postgresql.org/docs/15/uuid-ossp.html

3. **Arquivos do projeto:**
   - `schema.sql` - Script de criação
   - `DICIONARIO_DADOS.md` - Documentação detalhada
   - `EXEMPLOS_QUERIES.sql` - Exemplos de uso

---

**Versão:** 1.0
**Data:** 2025-11-21
**Status:** Pronto para uso
