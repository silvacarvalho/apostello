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

- [x] Schema PostgreSQL completo
- [x] 17 Tabelas principais
- [x] 2 Views otimizadas
- [x] 8 ENUMs
- [x] 3 Funções customizadas
- [x] 15 Triggers automáticos
- [x] 45+ Índices para performance
- [x] Dicionário de dados completo
- [x] Diagramas ERD

### ⏳ PRÓXIMAS FASES

- [ ] **FASE 2:** Backend FastAPI
- [ ] **FASE 3:** Frontend React
- [ ] **FASE 4:** Mobile React Native
- [ ] **FASE 5:** Documentação Completa
- [ ] **FASE 6:** Testes Automatizados
- [ ] **FASE 7:** Deploy e Produção

---

## 📂 ESTRUTURA DO PROJETO

```
apostello/
├── README.md                           # Este arquivo
├── database/                           # Banco de Dados
│   ├── schema.sql                     # ✅ Schema PostgreSQL completo
│   ├── DICIONARIO_DADOS.md            # ✅ Dicionário detalhado
│   ├── DIAGRAMA_ERD.md                # ✅ Diagramas de relacionamento
│   └── RESUMO_EXECUTIVO.md            # ✅ Resumo e checklist
├── backend/                            # (A implementar)
│   ├── app/
│   │   ├── api/                       # Endpoints REST
│   │   ├── models/                    # Modelos SQLAlchemy
│   │   ├── schemas/                   # Schemas Pydantic
│   │   ├── services/                  # Lógica de negócio
│   │   ├── core/                      # Configurações
│   │   └── utils/                     # Utilitários
│   ├── tests/                         # Testes
│   ├── requirements.txt               # Dependências Python
│   └── Dockerfile                     # Container Docker
├── frontend/                           # (A implementar)
│   ├── src/
│   │   ├── components/                # Componentes React
│   │   ├── pages/                     # Páginas
│   │   ├── services/                  # API calls
│   │   ├── store/                     # Redux/Context
│   │   └── utils/                     # Utilitários
│   ├── package.json
│   └── Dockerfile
├── mobile/                             # (A implementar)
│   ├── src/
│   │   ├── screens/                   # Telas
│   │   ├── components/                # Componentes
│   │   ├── services/                  # API calls
│   │   ├── navigation/                # Navegação
│   │   └── utils/                     # Utilitários
│   └── package.json
├── docs/                               # (A implementar)
│   ├── manual-instalacao.md
│   ├── guia-usuario.md
│   ├── api-docs.md
│   └── manual-administrativo.md
└── docker-compose.yml                  # Orquestração completa
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

## 📈 ROADMAP

### ✅ FASE 1: Banco de Dados (CONCLUÍDA)
- [x] Design do schema
- [x] Implementação SQL
- [x] Documentação completa

### ⏳ FASE 2: Backend (Próxima)
- [ ] Setup FastAPI
- [ ] Modelos SQLAlchemy
- [ ] Endpoints REST
- [ ] Algoritmo de escalas

### 🔜 FASE 3: Frontend
- [ ] Setup React
- [ ] Dashboard
- [ ] Gestão de escalas

### 🔜 FASE 4: Mobile
- [ ] Setup React Native
- [ ] App para pregadores

---

**Versão:** 1.0.0
**Data:** 2025-11-21
**Status:** 🚧 Fase 1 Concluída - Aguardando Aprovação
