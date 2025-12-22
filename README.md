# Apostello - Sistema de Gerenciamento de Escalas

Sistema completo para gerenciamento de escalas de pregação e louvor especial em organizações religiosas.

## 📋 Estrutura do Projeto

```
apostello/
├── backend/              # API FastAPI (Python)
│   ├── app/
│   │   ├── api/          # Endpoints da API
│   │   ├── core/         # Configurações e utilitários
│   │   ├── models/       # Modelos SQLAlchemy
│   │   ├── repositories/ # Camada de acesso a dados
│   │   ├── schemas/      # Schemas Pydantic
│   │   └── services/     # Lógica de negócio
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/             # Next.js + Tailwind + Shadcn/ui
│   ├── src/
│   │   ├── app/          # App Router (páginas)
│   │   ├── components/   # Componentes React
│   │   ├── hooks/        # Custom hooks
│   │   ├── lib/          # Utilitários
│   │   ├── stores/       # Zustand stores
│   │   └── types/        # TypeScript types
│   ├── package.json
│   └── .env.example
│
└── README.md
```

## 🚀 Tecnologias

### Backend
- **Python 3.12+**
- **FastAPI** - Framework web moderno e rápido
- **SQLAlchemy 2.0** - ORM para banco de dados
- **Pydantic 2.5** - Validação de dados
- **JWT** - Autenticação com tokens
- **PostgreSQL 15+** - Banco de dados

### Frontend
- **Next.js 14** - Framework React com App Router
- **React 18** - Biblioteca UI
- **Tailwind CSS** - Estilização utilitária
- **Shadcn/ui** - Componentes acessíveis
- **Zustand** - Gerenciamento de estado
- **React Hook Form + Zod** - Formulários com validação

## 🛠️ Instalação

### Pré-requisitos
- Python 3.12+
- Node.js 18+
- PostgreSQL 15+

### ⚡ Início Rápido

Após configurar backend e frontend pela primeira vez, use o script de inicialização:

```bash
# Windows (duplo clique ou via terminal)
.\start.bat

# Ou diretamente no PowerShell
.\start.ps1
```

Isso irá:
- ✅ Abrir o backend em http://localhost:8000
- ✅ Abrir o frontend em http://localhost:3000
- ✅ Abrir a documentação da API em http://localhost:8000/docs

### Backend

```bash
# Entrar na pasta do backend
cd backend

# Criar ambiente virtual
python -3.12 -m venv venv

# Ativar ambiente (Windows)
.\venv\Scripts\activate

# Ativar ambiente (Linux/Mac)
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Copiar arquivo de configuração
cp .env.example .env

# Editar .env com suas configurações
# DATABASE_URL, JWT_SECRET, etc.

# Executar migrações do banco de dados
alembic upgrade head

# Criar usuário admin inicial
python -m app.scripts.create_master

# Rodar servidor
uvicorn app.main:app --reload
```

### Frontend

```bash
# Entrar na pasta do frontend
cd frontend

# Instalar dependências
npm install

# Copiar arquivo de configuração
cp .env.example .env.local

# Rodar servidor de desenvolvimento
npm run dev
```

## 📚 Documentação da API

Com o backend rodando, acesse:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## �️ Migrações de Banco de Dados (Alembic)

O sistema usa **Alembic** para gerenciamento de migrações de banco de dados, facilitando a implantação em novos ambientes.

### Comandos Principais

```bash
cd backend

# Verificar status das migrações
alembic current          # Mostra revisão atual
alembic history          # Mostra histórico de migrações

# Aplicar todas as migrações pendentes (usar no deploy!)
alembic upgrade head

# Aplicar próxima migração apenas
alembic upgrade +1

# Reverter última migração
alembic downgrade -1

# Reverter todas as migrações (CUIDADO!)
alembic downgrade base

# Gerar SQL sem executar (útil para validar)
alembic upgrade head --sql > migration.sql
```

### Criar Nova Migração

Após modificar os models SQLAlchemy:

```bash
# Gerar migração automaticamente baseada nas mudanças
alembic revision --autogenerate -m "descrição da mudança"

# Criar migração vazia (para alterações manuais)
alembic revision -m "descrição da mudança"
```

> ⚠️ **Importante**: Sempre revise as migrações auto-geradas antes de aplicar!

### Deploy em Novo Ambiente

1. Configure o `.env` com a `DATABASE_URL` correta
2. Execute `alembic upgrade head` para criar todas as tabelas
3. Execute `python -m app.scripts.create_master` para criar o usuário admin

## �👥 Tipos de Usuário

| Tipo | Descrição |
|------|-----------|
| ADMIN | Administrador geral do sistema |
| PASTOR_DISTRITAL | Pastor responsável por um distrito |
| LIDER_DISTRITAL | Líder auxiliar do distrito |
| PREGADOR | Pregador escalável |
| CANTOR | Cantor/músico escalável |
| MEMBRO | Membro que avalia cultos |

## 🔐 Autenticação

O sistema usa JWT (JSON Web Tokens) com:
- **Access Token**: 30 minutos de validade
- **Refresh Token**: 7 dias de validade

## 📅 Algoritmo de Geração de Escalas

O sistema gera escalas automaticamente considerando:
- Score atual de cada pregador/cantor
- Intervalo mínimo entre escalas (14 dias)
- Limite de recorrência por mês (máx. 3x)
- Indisponibilidades cadastradas
- Bloqueios temporários
- Distribuição equilibrada entre igrejas

## 📊 Sistema de Score

Cada pregador/cantor possui um score (0-10) calculado com base em:
- Média ponderada das avaliações
- Apenas avaliações dos últimos 12 meses
- Peso maior para avaliações recentes

## 🔔 Notificações

O sistema suporta notificações via:
- **Email** (SMTP)
- **WhatsApp** (API WhatsApp Business)
- **In-app** (notificações internas)

## 📝 Licença

Este projeto é privado e de uso exclusivo.

---

Desenvolvido com ❤️ para a Igreja
