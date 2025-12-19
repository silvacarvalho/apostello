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

### Backend

```bash
# Entrar na pasta do backend
cd backend

# Criar ambiente virtual
python -m venv venv

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

## 👥 Tipos de Usuário

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

Cada pregador/cantor possui um score (0-100) calculado com base em:
- Média ponderada das avaliações
- Apenas avaliações dos últimos 12 meses
- Peso maior para avaliações recentes

## 📈 Dashboard Integrado

O dashboard foi integrado com a API do backend e apresenta dados dinâmicos baseados no tipo de usuário:

### Dashboard do Administrador
- Total de distritos, igrejas, pregadores e cantores
- Status das escalas do mês atual por distrito
- Ranking dos top pregadores e cantores por score
- Taxa de avaliação e comparecimento

### Dashboard do Pastor Distrital
- Estatísticas do distrito (igrejas, pregadores, cantores)
- Status da escala atual
- Próximos cultos agendados (próximos 7 dias)
- Pendências (confirmações e trocas)
- Pregadores com score em queda

### Dashboard do Pregador/Cantor
- Score atual e evolução
- Próximas pregações/apresentações agendadas
- Média de avaliações por critério
- Estatísticas de participação (mês, ano, total)
- Confirmação de presenças
- Informar indisponibilidades

### Dashboard do Membro
- Próximos cultos da igreja
- Avaliações pendentes
- Histórico de avaliações realizadas
- Informações da igreja e distrito

### Endpoints da API

```
GET /api/v1/dashboard/
```

Retorna o dashboard personalizado baseado no usuário autenticado. Requer autenticação JWT.

**Response:**
```json
{
  "tipo_usuario": "PREGADOR",
  "pregador_cantor": {
    "stats_cards": [...],
    "proximos_eventos": [...],
    "score_atual": 85.5,
    "media_avaliacoes": {
      "geral": 4.3,
      "total_avaliacoes": 42
    },
    "participacoes_mes": 2,
    "participacoes_ano": 18,
    "participacoes_total": 145
  }
}
```

## 🔔 Notificações

O sistema suporta notificações via:
- **Email** (SMTP)
- **WhatsApp** (API WhatsApp Business)
- **In-app** (notificações internas)

## 📝 Licença

Este projeto é privado e de uso exclusivo.

---

Desenvolvido com ❤️ para a Igreja
