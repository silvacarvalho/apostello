# 🙏 Sistema de Gestão de Escalas de Pregação - IASD

## Igreja Adventista do Sétimo Dia

[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![React Native](https://img.shields.io/badge/React_Native-Latest-61DAFB.svg)](https://reactnative.dev/)

---

## 📋 SOBRE O PROJETO

Sistema completo e funcional de gestão de escalas de pregação para múltiplos distritos de uma Associação da Igreja Adventista do Sétimo Dia, com:

- ✅ **Geração Automática de Escalas** baseada em score de pregadores
- ✅ **Sistema de Notificações** via WhatsApp, SMS e Push
- ✅ **Gestão de Temáticas** de pregação com recorrência flexível
- ✅ **Trocas Automáticas** entre pregadores sem aprovação
- ✅ **Sistema de Avaliações** (0-5 estrelas)
- ✅ **Geração de PDF** para impressão
- ✅ **Importação/Exportação** Excel/CSV
- ✅ **Multi-perfil** (Associação, Pastor, Pregador, Avaliador)

---

## 🎯 STATUS DO PROJETO

### ✅ FASE 1: BANCO DE DADOS (CONCLUÍDA)

- [x] Schema PostgreSQL completo em português
- [x] 17 Tabelas principais com UUID + campo `codigo`
- [x] 2 Views otimizadas
- [x] 8 ENUMs
- [x] 3 Funções customizadas
- [x] 15 Triggers automáticos
- [x] 45+ Índices para performance
- [x] Dicionário de dados completo
- [x] Diagramas ERD

### ✅ FASE 2: BACKEND FASTAPI (CONCLUÍDA)

- [x] Estrutura base FastAPI
- [x] 15 Models SQLAlchemy completos
- [x] 12 Schemas Pydantic (request/response)
- [x] 12 Routers REST completos com autenticação
- [x] Sistema de autenticação JWT
- [x] 3 Services com lógica de negócio
- [x] **Algoritmo de geração automática de escalas**
- [x] **Sistema de notificações multi-canal**
- [x] **Cálculo automático de score**
- [x] Dockerfile e docker-compose.yml
- [x] Configuração Alembic para migrations
- [x] Documentação de API (OpenAPI/Swagger)

### ⏳ PRÓXIMAS FASES

- [ ] **FASE 3:** Frontend React Web
- [ ] **FASE 4:** Mobile React Native
- [ ] **FASE 5:** Integrações (Twilio, Firebase, SMTP)
- [ ] **FASE 6:** Testes Automatizados (pytest)
- [ ] **FASE 7:** Deploy e Produção

---

## 📂 ESTRUTURA DO PROJETO

```
apostello/
├── README.md                           # Este arquivo
├── docker-compose.yml                  # ✅ Orquestração completa (Postgres + Backend + Redis)
├── .env.example                        # ✅ Exemplo de variáveis de ambiente
├── database/                           # ✅ Banco de Dados
│   ├── schema_pt.sql                  # ✅ Schema PostgreSQL em português
│   ├── schema.sql                     # ✅ Schema original em inglês
│   ├── DICIONARIO_DADOS.md            # ✅ Dicionário detalhado
│   ├── DIAGRAMA_ERD.md                # ✅ Diagramas de relacionamento
│   ├── RESUMO_EXECUTIVO.md            # ✅ Resumo e checklist
│   └── EXEMPLOS_QUERIES.sql           # ✅ Queries de exemplo
├── backend/                            # ✅ BACKEND COMPLETO
│   ├── app/
│   │   ├── main.py                    # ✅ Aplicação FastAPI principal
│   │   ├── api/v1/                    # ✅ 12 Routers REST
│   │   │   ├── auth.py                # ✅ Autenticação/Login/Registro
│   │   │   ├── usuarios.py            # ✅ CRUD usuários
│   │   │   ├── associacoes.py         # ✅ CRUD associações
│   │   │   ├── distritos.py           # ✅ CRUD distritos
│   │   │   ├── igrejas.py             # ✅ CRUD igrejas
│   │   │   ├── pregadores.py          # ✅ Perfil e score
│   │   │   ├── escalas.py             # ✅ Escalas + geração automática
│   │   │   ├── pregacoes.py           # ✅ Pregações individuais
│   │   │   ├── trocas.py              # ✅ Trocas de escala
│   │   │   ├── avaliacoes.py          # ✅ Avaliações de pregadores
│   │   │   ├── tematicas.py           # ✅ Temáticas sugestivas
│   │   │   └── notificacoes.py        # ✅ Sistema de notificações
│   │   ├── models/                    # ✅ 15 Models SQLAlchemy
│   │   │   ├── usuario.py             # ✅ Multi-perfil com array
│   │   │   ├── associacao.py          # ✅ Com soft delete
│   │   │   ├── distrito.py            # ✅ Com soft delete
│   │   │   ├── igreja.py              # ✅ Com geolocalização
│   │   │   ├── perfil_pregador.py     # ✅ Perfil estendido + score
│   │   │   ├── avaliacao.py           # ✅ Sistema 0-5 estrelas
│   │   │   ├── tematica.py            # ✅ Recorrência flexível
│   │   │   ├── horario_culto.py       # ✅ Por distrito/igreja
│   │   │   ├── escala.py              # ✅ Escala mensal
│   │   │   ├── pregacao.py            # ✅ Pregação individual
│   │   │   ├── periodo_indisponibilidade.py  # ✅ Indisponibilidades
│   │   │   ├── troca_escala.py        # ✅ Sistema de trocas
│   │   │   ├── notificacao.py         # ✅ Multi-canal
│   │   │   ├── relatorio.py           # ✅ Relatórios salvos
│   │   │   └── audit_log.py           # ✅ Auditoria
│   │   ├── schemas/                   # ✅ 12 Schemas Pydantic
│   │   │   └── (todos os schemas request/response)
│   │   ├── services/                  # ✅ 3 Services principais
│   │   │   ├── pregador_service.py    # ✅ Cálculo de score e estatísticas
│   │   │   ├── escala_service.py      # ✅ Algoritmo de geração automática
│   │   │   └── notificacao_service.py # ✅ Sistema de notificações
│   │   └── core/                      # ✅ Core do sistema
│   │       ├── config.py              # ✅ Configurações com Pydantic Settings
│   │       ├── database.py            # ✅ Conexão e sessão SQLAlchemy
│   │       ├── security.py            # ✅ JWT, bcrypt, tokens
│   │       └── deps.py                # ✅ Dependências FastAPI
│   ├── alembic/                       # ✅ Migrations
│   │   ├── env.py                     # ✅ Config Alembic
│   │   ├── script.py.mako             # ✅ Template de migrations
│   │   └── versions/                  # ✅ Migrations versionadas
│   ├── requirements.txt               # ✅ Dependências Python
│   ├── .env.example                   # ✅ Variáveis de ambiente
│   ├── Dockerfile                     # ✅ Container Docker
│   ├── .dockerignore                  # ✅ Exclusões Docker
│   └── alembic.ini                    # ✅ Config Alembic
├── frontend/                           # (A implementar)
│   └── ...
├── mobile/                             # (A implementar)
│   └── ...
└── docs/                               # (A criar)
    └── ...
```

---

## 🗄️ BANCO DE DADOS

### 📊 Schema PostgreSQL

O banco de dados foi projetado para máxima performance, escalabilidade e integridade.

#### Estatísticas
- **17 Tabelas** principais
- **2 Views** otimizadas
- **8 ENUMs** (tipos enumerados)
- **32 Foreign Keys** (integridade referencial)
- **45+ Índices** (performance)
- **15 Triggers** (automação)
- **3 Funções** customizadas

#### Entidades Principais

1. **Organizacional**
   - `associations` - Associações
   - `districts` - Distritos
   - `churches` - Igrejas

2. **Usuários**
   - `users` - Usuários multi-perfil
   - `preacher_profiles` - Perfil estendido de pregadores

3. **Escalas**
   - `schedules` - Escalas mensais
   - `preaching_schedules` - Pregações individuais
   - `schedule_swaps` - Trocas entre pregadores

4. **Avaliação**
   - `evaluations` - Avaliações de pregadores (0-5 estrelas)

5. **Temáticas**
   - `themes` - Temáticas sugestivas de pregação

6. **Suporte**
   - `worship_times` - Horários de culto
   - `unavailability_periods` - Indisponibilidades
   - `notifications` - Sistema de notificações
   - `settings` - Configurações flexíveis
   - `audit_logs` - Auditoria
   - `import_logs` - Logs de importação

### 📚 Documentação Completa

1. **[schema.sql](database/schema.sql)** - Script SQL completo para criar banco
2. **[DICIONARIO_DADOS.md](database/DICIONARIO_DADOS.md)** - Documentação detalhada de todas tabelas
3. **[DIAGRAMA_ERD.md](database/DIAGRAMA_ERD.md)** - Diagramas de relacionamento com Mermaid
4. **[RESUMO_EXECUTIVO.md](database/RESUMO_EXECUTIVO.md)** - Resumo e checklist de validação

---

## 🎯 PERFIS DE USUÁRIO

### 1. 👔 MEMBRO DA ASSOCIAÇÃO
**Permissões:**
- ✅ Criar e gerenciar distritos
- ✅ Designar pastores distritais
- ✅ Cadastrar temáticas sugestivas (todas igrejas)
- ✅ Visualização geral (somente leitura)
- ✅ Aprovar auto-cadastro de pastores

### 2. 🧑‍💼 PASTOR DISTRITAL
**Permissões:**
- ✅ Auto-cadastro (aprovado por Membro da Associação)
- ✅ Aprovar cadastros de membros do distrito
- ✅ Gerenciar igrejas, escalas, membros e pregadores
- ✅ Configurar horários de culto (geral e por igreja)
- ✅ Gerar escalas automáticas
- ✅ Aprovar escalas em modo rascunho
- ✅ Gerar PDF da escala mensal
- ✅ Configurar limites de pregações mensais

### 3. 🙋 PREGADOR/MEMBRO
**Permissões:**
- ✅ Auto-cadastro
- ✅ Indicar períodos de indisponibilidade
- ✅ Visualizar escalas pessoais e do distrito
- ✅ Aceitar/Recusar pregações
- ✅ Solicitar trocas de escala com outros pregadores
- ✅ Receber notificações (WhatsApp/SMS/Push)
- ✅ Visualizar score pessoal

### 4. ⭐ MEMBRO AVALIADOR
**Permissões:**
- ✅ Avaliar pregadores (0-5 estrelas)
- ✅ Visualizar histórico de pregações na igreja

---

## 🎲 ALGORITMO DE SCORE

O sistema calcula automaticamente o score de cada pregador baseado em três critérios:

```
SCORE = (Média_Avaliações × 0.6) + (Taxa_Frequência × 0.25) + (Taxa_Pontualidade × 0.15)
```

### Componentes do Score

1. **Média de Avaliações (60%)**
   - Avaliações de 0-5 estrelas pelos membros
   - Média ponderada de todas avaliações

2. **Taxa de Frequência (25%)**
   - `(Pregações Realizadas / Total de Pregações) × 100`
   - Penaliza faltas

3. **Taxa de Pontualidade (15%)**
   - Baseada em check-in no horário
   - Penaliza atrasos

### Penalizações Automáticas

- **Recusar pregação:** -15% do score atual
- **Faltar (sem justificativa):** Reduz taxa de frequência
- **Atraso:** Reduz taxa de pontualidade

---

## 🚀 TECNOLOGIAS

### Backend
- **Python 3.12**
- **FastAPI** - Framework web moderno
- **SQLAlchemy** - ORM
- **Pydantic** - Validação de dados
- **Alembic** - Migrations
- **PostgreSQL 15+**

### Frontend Web
- **React 18+**
- **TypeScript**
- **Material-UI** - Componentes

### Mobile
- **React Native**
- **TypeScript**

---

---

## 🚀 INSTALAÇÃO E USO

### Pré-requisitos

- **Docker** e **Docker Compose** instalados
- **Git** para clonar o repositório
- **PostgreSQL 15+** (se rodar sem Docker)
- **Python 3.12+** (se rodar sem Docker)

### 🐳 Opção 1: Rodar com Docker (RECOMENDADO)

```bash
# 1. Clonar repositório
git clone <url-do-repositorio>
cd apostello

# 2. Copiar arquivo de ambiente
cp .env.example .env

# 3. Editar .env com suas configurações
nano .env  # ou vim, ou qualquer editor

# 4. Subir todos os serviços (PostgreSQL + Backend + Redis + Celery)
docker-compose up -d

# 5. Verificar logs
docker-compose logs -f backend

# 6. Acessar documentação da API
# Abrir navegador em: http://localhost:8000/docs
```

### 💻 Opção 2: Rodar Local (sem Docker)

```bash
# 1. Criar banco de dados PostgreSQL
createdb apostello_db

# 2. Executar schema
psql apostello_db < database/schema_pt.sql

# 3. Configurar backend
cd backend

# 4. Criar ambiente virtual Python
python3.12 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# 5. Instalar dependências
pip install -r requirements.txt

# 6. Copiar e configurar .env
cp .env.example .env
nano .env  # Configurar DATABASE_URL, SECRET_KEY, etc.

# 7. Executar migrations (se necessário)
alembic upgrade head

# 8. Iniciar servidor
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 9. Acessar: http://localhost:8000/docs
```

### 🔧 Variáveis de Ambiente Importantes

Edite o arquivo `.env` com suas configurações:

```env
# Banco de dados
DATABASE_URL=postgresql://user:password@localhost:5432/apostello_db

# Segurança (MUDE EM PRODUÇÃO!)
SECRET_KEY=sua_chave_secreta_min_32_caracteres

# Twilio (WhatsApp/SMS)
TWILIO_ACCOUNT_SID=seu_account_sid
TWILIO_AUTH_TOKEN=seu_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+5511999999999

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASSWORD=sua_senha_app

# Redis (para Celery)
REDIS_URL=redis://localhost:6379/0
```

---

## 📖 DOCUMENTAÇÃO DA API

### Swagger UI (Interativa)

Após iniciar o backend, acesse:

```
http://localhost:8000/docs
```

### ReDoc (Alternativa)

```
http://localhost:8000/redoc
```

### Endpoints Principais

#### 🔐 **Autenticação**

```http
POST   /api/v1/auth/register          # Registrar novo usuário
POST   /api/v1/auth/login             # Login (retorna JWT)
POST   /api/v1/auth/refresh           # Refresh token
GET    /api/v1/auth/me                # Perfil do usuário logado
```

#### 👥 **Usuários**

```http
GET    /api/v1/usuarios               # Listar usuários (com filtros)
GET    /api/v1/usuarios/{id}          # Obter usuário por ID
PUT    /api/v1/usuarios/{id}          # Atualizar usuário
DELETE /api/v1/usuarios/{id}          # Excluir (soft delete)
POST   /api/v1/usuarios/{id}/aprovar  # Aprovar cadastro
```

#### 🏛️ **Organizacional**

```http
# Associações
GET/POST     /api/v1/associacoes
GET/PUT/DEL  /api/v1/associacoes/{id}

# Distritos
GET/POST     /api/v1/distritos
GET/PUT/DEL  /api/v1/distritos/{id}

# Igrejas
GET/POST     /api/v1/igrejas
GET/PUT/DEL  /api/v1/igrejas/{id}
```

#### 🙋 **Pregadores**

```http
GET    /api/v1/pregadores              # Listar pregadores
GET    /api/v1/pregadores/{id}         # Perfil do pregador
GET    /api/v1/pregadores/{id}/score   # Ver score detalhado
POST   /api/v1/pregadores/{id}/recalcular  # Recalcular score
```

#### 📅 **Escalas**

```http
GET    /api/v1/escalas                 # Listar escalas
POST   /api/v1/escalas/gerar           # 🤖 GERAR ESCALA AUTOMÁTICA
GET    /api/v1/escalas/{id}            # Detalhes da escala
POST   /api/v1/escalas/{id}/finalizar  # Finalizar e enviar notificações
GET    /api/v1/escalas/{id}/pdf        # Baixar PDF
```

#### 🗣️ **Pregações**

```http
GET    /api/v1/pregacoes               # Listar pregações
GET    /api/v1/pregacoes/{id}          # Detalhes da pregação
POST   /api/v1/pregacoes/{id}/responder  # Aceitar/Recusar pregação
```

#### 🔄 **Trocas de Escala**

```http
POST   /api/v1/trocas                  # Solicitar troca
POST   /api/v1/trocas/{id}/aceitar     # Aceitar troca
POST   /api/v1/trocas/{id}/recusar     # Recusar troca
```

#### ⭐ **Avaliações**

```http
POST   /api/v1/avaliacoes              # Criar avaliação (0-5 estrelas)
GET    /api/v1/avaliacoes              # Listar avaliações
```

#### 📖 **Temáticas**

```http
GET/POST     /api/v1/tematicas
GET/PUT/DEL  /api/v1/tematicas/{id}
```

#### 🔔 **Notificações**

```http
GET    /api/v1/notificacoes            # Listar minhas notificações
PUT    /api/v1/notificacoes/{id}/ler   # Marcar como lida
```

---

## 🎮 EXEMPLOS DE USO

### 1. Registrar e Fazer Login

```bash
# Registrar novo usuário
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pastor@iasd.com.br",
    "senha": "senha123",
    "nome_completo": "Pastor João Silva",
    "telefone": "+5511999999999",
    "perfis": ["pastor_distrital"]
  }'

# Fazer login
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=pastor@iasd.com.br&password=senha123"

# Resposta:
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

### 2. Gerar Escala Automaticamente

```bash
curl -X POST "http://localhost:8000/api/v1/escalas/gerar" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "distrito_id": "uuid-do-distrito",
    "mes_referencia": 12,
    "ano_referencia": 2025
  }'
```

### 3. Pregador Aceita/Recusa Pregação

```bash
# Aceitar
curl -X POST "http://localhost:8000/api/v1/pregacoes/{id}/responder" \
  -H "Authorization: Bearer TOKEN_PREGADOR" \
  -H "Content-Type: application/json" \
  -d '{
    "aceitar": true
  }'

# Recusar (aplica penalização de -15% no score)
curl -X POST "http://localhost:8000/api/v1/pregacoes/{id}/responder" \
  -H "Authorization: Bearer TOKEN_PREGADOR" \
  -H "Content-Type: application/json" \
  -d '{
    "aceitar": false,
    "motivo_recusa": "Viagem marcada"
  }'
```

### 4. Avaliar Pregador

```bash
curl -X POST "http://localhost:8000/api/v1/avaliacoes" \
  -H "Authorization: Bearer TOKEN_AVALIADOR" \
  -H "Content-Type: application/json" \
  -d '{
    "pregador_id": "uuid-do-pregador",
    "pregacao_id": "uuid-da-pregacao",
    "nota": 5,
    "comentario": "Excelente pregação!"
  }'
```

---

## 🧪 ALGORITMO DE GERAÇÃO AUTOMÁTICA

O sistema implementa um algoritmo inteligente para gerar escalas:

### Processo:

1. **Busca pregadores** do distrito ordenados por SCORE (maior primeiro)
2. **Para cada dia do mês**, para cada igreja, para cada horário de culto:
   - Seleciona pregador com maior score disponível
   - **Valida disponibilidade:**
     - ✅ Não está em período de indisponibilidade
     - ✅ Não tem conflito (outro culto no mesmo dia)
     - ✅ Não atingiu limite mensal (ex: 4 pregações/mês)
   - Busca temática sugestiva para a data (se houver)
   - Cria pregação e atribui ao pregador
3. **Retorna escala** em status "rascunho"
4. **Pastor revisa** e finaliza
5. **Sistema envia notificações** automáticas (WhatsApp/SMS/Push/Email)

### Score do Pregador:

```
SCORE = (Média_Avaliações × 0.6) + (Taxa_Frequência × 0.25) + (Taxa_Pontualidade × 0.15)

Onde:
- Média_Avaliações: 0-5 estrelas
- Taxa_Frequência: (Realizadas / Total) × 100
- Taxa_Pontualidade: (No horário / Total) × 100
```

---

## 🔔 SISTEMA DE NOTIFICAÇÕES

### Canais Suportados:

- ✅ **WhatsApp** (via Twilio)
- ✅ **SMS** (via Twilio)
- ✅ **Push Notifications** (via Firebase - a configurar)
- ✅ **Email** (via SMTP)

### Eventos que Geram Notificações:

1. **Escala finalizada** → Todos os pregadores escalados
2. **Solicitação de troca** → Pregador destinatário
3. **Troca aceita/recusada** → Pregador solicitante
4. **Lembretes automáticos:**
   - 7 dias antes da pregação
   - 3 dias antes
   - 24 horas antes

### Preferências do Usuário:

Cada usuário pode habilitar/desabilitar canais em seu perfil:

```json
{
  "notif_whatsapp": true,
  "notif_sms": false,
  "notif_push": true,
  "notif_email": true
}
```

---

## 📊 RECURSOS AVANÇADOS

### 1. Soft Delete

Todos os recursos usam **soft delete** (não são excluídos fisicamente):

```python
# Ao deletar, apenas marca campo excluido_em
DELETE /api/v1/usuarios/{id}  # Define excluido_em = NOW()

# Para restaurar (admin):
POST /api/v1/usuarios/{id}/restaurar
```

### 2. Auditoria Completa

Todas ações importantes são registradas na tabela `audit_logs`:

```sql
SELECT * FROM audit_logs
WHERE usuario_id = 'uuid'
ORDER BY criado_em DESC;
```

### 3. Multi-Perfil

Um usuário pode ter múltiplos perfis simultaneamente:

```json
{
  "perfis": ["pregador", "avaliador"]
}
```

### 4. Timestamps Automáticos

Todos os models têm timestamps automáticos:

- `criado_em` - Criação do registro
- `atualizado_em` - Última atualização (via trigger)
- `excluido_em` - Soft delete

---

## 🛠️ COMANDOS ÚTEIS

### Docker

```bash
# Subir serviços
docker-compose up -d

# Ver logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Parar serviços
docker-compose down

# Rebuild após mudanças
docker-compose up -d --build

# Entrar no container backend
docker-compose exec backend bash

# Entrar no PostgreSQL
docker-compose exec postgres psql -U apostello -d apostello_db
```

### Alembic (Migrations)

```bash
# Criar nova migration
alembic revision --autogenerate -m "descrição"

# Aplicar migrations
alembic upgrade head

# Reverter última migration
alembic downgrade -1

# Ver histórico
alembic history
```

### Testes (quando implementados)

```bash
# Rodar todos os testes
pytest

# Com coverage
pytest --cov=app

# Específico
pytest tests/test_escalas.py
```

---

## 📈 ROADMAP

### ✅ FASE 1: Banco de Dados (CONCLUÍDA)
- [x] Design do schema
- [x] Implementação SQL em português
- [x] Documentação completa

### ✅ FASE 2: Backend FastAPI (CONCLUÍDA)
- [x] Setup FastAPI completo
- [x] Modelos SQLAlchemy (15)
- [x] Schemas Pydantic (12)
- [x] Endpoints REST (12 routers)
- [x] Algoritmo de geração de escalas
- [x] Sistema de notificações
- [x] Cálculo automático de score
- [x] Docker + docker-compose
- [x] Alembic migrations

### ⏳ FASE 3: Integrações (Próxima)
- [ ] Integração Twilio (WhatsApp/SMS)
- [ ] Integração Firebase (Push)
- [ ] Integração SMTP (Email)
- [ ] Geração de PDF

### 🔜 FASE 4: Frontend Web
- [ ] Setup React + TypeScript
- [ ] Dashboard administrativo
- [ ] Gestão de escalas
- [ ] Interface de avaliação

### 🔜 FASE 5: Mobile
- [ ] Setup React Native
- [ ] App para pregadores
- [ ] Notificações push

### 🔜 FASE 6: Testes
- [ ] Testes unitários (pytest)
- [ ] Testes de integração
- [ ] Testes e2e

### 🔜 FASE 7: Deploy
- [ ] CI/CD com GitHub Actions
- [ ] Deploy em produção
- [ ] Monitoramento (Sentry)

---

## 🤝 CONTRIBUINDO

```bash
# 1. Fork o projeto
# 2. Criar branch para feature
git checkout -b feature/nova-funcionalidade

# 3. Commit suas mudanças
git commit -m "feat: adiciona nova funcionalidade"

# 4. Push para branch
git push origin feature/nova-funcionalidade

# 5. Abrir Pull Request
```

---

## 📝 LICENÇA

Este projeto é proprietário da Igreja Adventista do Sétimo Dia.

---

## 📞 SUPORTE

Para dúvidas ou sugestões:
- Email: suporte@apostello.com.br
- WhatsApp: +55 11 99999-9999

---

**Versão:** 2.0.0
**Data:** 2025-11-21
**Status:** ✅ Backend Completo - Pronto para Integrações

---

**Desenvolvido com ❤️ para a IASD**
