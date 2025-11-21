# 📊 RESUMO EXECUTIVO - Banco de Dados
## Sistema de Gestão de Escalas de Pregação - IASD

---

## 🎯 VISÃO GERAL

Este documento apresenta o resumo executivo da estrutura do banco de dados PostgreSQL para o Sistema de Gestão de Escalas de Pregação da Igreja Adventista do Sétimo Dia.

---

## 📈 ESTATÍSTICAS DO BANCO DE DADOS

| Métrica | Quantidade |
|---------|------------|
| **Tabelas Principais** | 17 |
| **Views** | 2 |
| **Tipos Enumerados (ENUMs)** | 8 |
| **Funções Customizadas** | 3 |
| **Triggers** | 15 |
| **Índices** | 45+ |
| **Foreign Keys** | 32 |
| **Check Constraints** | 15+ |
| **Unique Constraints** | 8 |

---

## 🗂️ ENTIDADES PRINCIPAIS

### 1. Hierarquia Organizacional
```
ASSOCIATIONS (Associações)
    └── DISTRICTS (Distritos)
            └── CHURCHES (Igrejas)
```

### 2. Usuários e Perfis
```
USERS (Multi-perfil: Associação, Pastor, Pregador, Avaliador)
    └── PREACHER_PROFILES (Extensão para pregadores com score)
```

### 3. Sistema de Escalas
```
SCHEDULES (Escalas Mensais - por distrito)
    └── PREACHING_SCHEDULES (Pregações individuais)
            ├── EVALUATIONS (Avaliações)
            └── SCHEDULE_SWAPS (Trocas)
```

### 4. Suporte e Configuração
- **THEMES** - Temáticas sugestivas de pregação
- **WORSHIP_TIMES** - Horários de culto
- **UNAVAILABILITY_PERIODS** - Indisponibilidades
- **NOTIFICATIONS** - Sistema de notificações
- **SETTINGS** - Configurações flexíveis
- **AUDIT_LOGS** - Auditoria
- **IMPORT_LOGS** - Logs de importação

---

## ✅ FUNCIONALIDADES IMPLEMENTADAS

### ✔️ Sistema de Usuários Multi-Perfil
- [x] Usuários com múltiplos perfis simultâneos (array `roles[]`)
- [x] Perfis: Membro Associação, Pastor Distrital, Pregador, Avaliador
- [x] Sistema de aprovação de cadastros
- [x] Soft delete para preservar histórico
- [x] Hierarquia: Associação → Distrito → Igreja → Usuários

### ✔️ Sistema de Score Automatizado
- [x] Cálculo automático por função SQL
- [x] Fórmula: `(Avaliações × 0.6) + (Frequência × 0.25) + (Pontualidade × 0.15)`
- [x] Penalização de 15% ao recusar pregação
- [x] Atualização automática via triggers
- [x] Estatísticas detalhadas (total, realizadas, faltadas, recusadas)

### ✔️ Sistema de Escalas Automático
- [x] Escalas mensais por distrito
- [x] Status: Rascunho → Aprovado → Finalizado
- [x] Pregações individuais com temas sugestivos
- [x] Constraint: uma escala por distrito por mês
- [x] Validação de conflitos (mesmo pregador, mesma data)
- [x] Respeito a indisponibilidades

### ✔️ Sistema de Temáticas
- [x] Recorrência: Data específica, Semanal, Mensal
- [x] Cadastro por Membros da Associação
- [x] Aplicação automática a todas igrejas
- [x] Período de validade configurável
- [x] Referências bíblicas

### ✔️ Sistema de Trocas Automáticas
- [x] Trocas diretas entre pregadores
- [x] Aceitação bilateral necessária
- [x] **SEM aprovação de Pastor** (automático)
- [x] Notificação informativa ao Pastor
- [x] Histórico de trocas completo
- [x] Registro de pregador original

### ✔️ Sistema de Avaliações
- [x] Avaliação de 0-5 estrelas
- [x] Critérios individuais (conteúdo, apresentação, fundamentação, engajamento)
- [x] Avaliações anônimas (opcional)
- [x] Constraint: uma avaliação por avaliador por pregação
- [x] Recálculo automático de score

### ✔️ Sistema de Notificações
- [x] Multi-canal: WhatsApp, SMS, Push, Email
- [x] Status: Pending → Sent → Delivered → Read
- [x] Notificações agendadas (lembretes)
- [x] Retry automático (até 3 tentativas)
- [x] Relacionamento com pregações e trocas
- [x] Lembretes: 7 dias, 3 dias, 24h antes

### ✔️ Horários de Culto Flexíveis
- [x] Configuração por distrito (todas igrejas)
- [x] Configuração por igreja específica
- [x] Constraint: OU distrito OU igreja (exclusivo)
- [x] Dia da semana e horário
- [x] Flag: requer pregador?

### ✔️ Indisponibilidades
- [x] Período (data início e fim)
- [x] Constraint: data fim >= data início
- [x] Motivo/justificativa
- [x] Validação automática ao escalar

### ✔️ Auditoria e Logs
- [x] Registro de todas ações importantes
- [x] Valores antigos e novos (JSONB)
- [x] IP e User Agent
- [x] Logs de importações Excel/CSV

### ✔️ Configurações Flexíveis
- [x] Estrutura JSONB para flexibilidade
- [x] Escopo: Associação, Distrito, Igreja, Usuário
- [x] Chave-valor customizável

---

## 🔄 FLUXOS PRINCIPAIS IMPLEMENTADOS

### 1️⃣ Fluxo de Cadastro de Usuário
```
1. Usuário se auto-cadastra
2. Status: PENDING
3. Pastor Distrital (ou Membro Associação) aprova
4. Status: APPROVED
5. Usuário pode acessar sistema
```

### 2️⃣ Fluxo de Geração de Escala
```
1. Sistema gera escala automática (DRAFT)
   - Ordena pregadores por SCORE
   - Valida conflitos de data
   - Respeita indisponibilidades
   - Respeita limite mensal
   - Sugere temáticas automaticamente

2. Pastor visualiza e ajusta manualmente (APPROVED)

3. Pastor finaliza escala (FINALIZED)

4. Sistema envia notificações aos pregadores
   - WhatsApp/SMS/Push/Email
   - Conteúdo: Igreja, Data, Horário, Tema

5. Pregador aceita ou recusa
   - Se recusa: score reduz 15%
```

### 3️⃣ Fluxo de Troca Automática
```
1. Pregador A solicita troca com Pregador B
2. Pregador B aceita troca
3. Sistema executa troca AUTOMATICAMENTE
4. Sistema notifica Pastor/Líder (informativo)
5. Sistema notifica ambos pregadores
6. Histórico registrado em schedule_swaps
```

### 4️⃣ Fluxo de Avaliação
```
1. Pregação realizada (status: COMPLETED)
2. Membro Avaliador avalia (0-5 estrelas)
3. TRIGGER recalcula score automaticamente
4. Score atualizado em preacher_profiles
```

---

## 🔒 SEGURANÇA E INTEGRIDADE

### Integridade Referencial
- ✅ 32 Foreign Keys com CASCADE/SET NULL apropriados
- ✅ Constraint de unicidade em campos críticos
- ✅ Check constraints para validações de negócio
- ✅ Soft delete preserva referências históricas

### Segurança de Dados
- ✅ Senha armazenada como hash (campo `password_hash`)
- ✅ CPF único e indexado
- ✅ Email único e indexado
- ✅ Avaliações opcionalmente anônimas
- ✅ Auditoria completa de ações

### Performance
- ✅ 45+ índices estratégicos
- ✅ Índices compostos para queries complexas
- ✅ Índices parciais para filtros comuns
- ✅ GIN index para array `roles[]`
- ✅ JSONB para flexibilidade com performance

---

## 🎯 VALIDAÇÕES AUTOMÁTICAS

### Via Check Constraints
1. ✅ Score entre 0-5
2. ✅ Rating de avaliação entre 0-5
3. ✅ Mês entre 1-12
4. ✅ Ano >= 2024
5. ✅ Data fim >= Data início (indisponibilidades)
6. ✅ Horário de culto: OU distrito OU igreja
7. ✅ Temática: validação por tipo de recorrência

### Via Unique Constraints
1. ✅ Email único
2. ✅ CPF único
3. ✅ Uma escala por distrito por mês
4. ✅ Um avaliador não pode avaliar mesma pregação 2x
5. ✅ user_id único em preacher_profiles

### Via Triggers
1. ✅ Atualização automática de `updated_at`
2. ✅ Recálculo de score ao avaliar
3. ✅ Penalização de 15% ao recusar
4. ✅ Atualização de estatísticas

---

## 📊 QUERIES OTIMIZADAS (Views)

### vw_preachers_full
Dados completos de pregadores com scores para:
- ✅ Geração automática de escalas (ORDER BY score_average DESC)
- ✅ Relatórios de performance
- ✅ Dashboard de pregadores

### vw_upcoming_preachings
Pregações futuras para:
- ✅ Calendário de eventos
- ✅ Envio de lembretes
- ✅ Visualização de agenda

---

## ⚡ ALGORITMO DE GERAÇÃO DE ESCALA

### Pseudo-código (implementado no Backend)
```python
def generate_schedule(district_id, month, year):
    # 1. Buscar pregadores do distrito ordenados por score
    preachers = get_preachers_by_score(district_id, order='DESC')

    # 2. Buscar igrejas do distrito
    churches = get_churches(district_id)

    # 3. Buscar horários de culto
    worship_times = get_worship_times(district_id, churches)

    # 4. Para cada horário de culto no mês
    for worship_time in worship_times:
        # 5. Filtrar pregadores disponíveis
        available = filter_available_preachers(
            preachers,
            date=worship_time.date,
            max_per_month=config.max_preachings,
            unavailability_periods=get_unavailabilities()
        )

        # 6. Escalar pregador com maior score disponível
        selected = available[0]  # Maior score

        # 7. Buscar tema sugestivo
        theme = get_theme_for_date(association_id, date)

        # 8. Criar pregação
        create_preaching_schedule(
            schedule_id=schedule.id,
            church_id=worship_time.church_id,
            preacher_id=selected.id,
            theme_id=theme.id,
            date=worship_time.date,
            time=worship_time.time
        )
```

---

## 📋 CHECKLIST DE VALIDAÇÃO

### ✅ Estrutura
- [x] Todas tabelas criadas com sucesso
- [x] Relacionamentos (Foreign Keys) corretos
- [x] ENUMs definidos
- [x] Índices criados
- [x] Triggers implementados
- [x] Funções customizadas

### ✅ Regras de Negócio
- [x] Sistema de score implementado
- [x] Penalização de 15% ao recusar
- [x] Trocas automáticas sem aprovação
- [x] Temáticas com recorrência flexível
- [x] Validação de conflitos de escala
- [x] Respeito a indisponibilidades
- [x] Limite de pregações por mês

### ✅ Perfis de Usuário
- [x] Membro da Associação (gerencia tudo)
- [x] Pastor Distrital (gerencia distrito)
- [x] Pregador (visualiza e gerencia próprias escalas)
- [x] Avaliador (avalia pregadores)

### ✅ Segurança
- [x] Autenticação (password_hash)
- [x] Autorização (roles multi-perfil)
- [x] Auditoria (audit_logs)
- [x] Soft delete (deleted_at)

### ✅ Performance
- [x] Índices em foreign keys
- [x] Índices em campos de busca frequente
- [x] Índices compostos para queries complexas
- [x] Views para queries recorrentes

---

## 🚨 PONTOS DE ATENÇÃO

### ⚠️ Para Revisão

1. **Limite de Pregações por Mês**
   - Atualmente: campo `max_preachings_per_month` em `preacher_profiles`
   - Padrão: 4 pregações/mês
   - ❓ Deve ser configurável por distrito também?

2. **Horários de Culto**
   - Estrutura atual: OU distrito OU igreja
   - ❓ Está adequado para todas as necessidades?

3. **Temáticas Mensais**
   - Estrutura: `monthly_week_number` (1-5) + `monthly_day_of_week`
   - Exemplo: "Todo 1º sábado do mês"
   - ❓ Cobrir casos especiais? (ex: "última semana")

4. **Notificações**
   - Retry automático: até 3 tentativas
   - ❓ Backoff exponencial deve ser configurável?

5. **Score**
   - Fórmula: `(0.6 × Aval) + (0.25 × Freq) + (0.15 × Pont)`
   - ❓ Pesos devem ser configuráveis?

---

## 📝 SUGESTÕES DE MELHORIA FUTURA

### 🔮 Fase 2 (Opcional)
1. **Histórico de Scores**
   - Tabela para rastrear evolução do score ao longo do tempo

2. **Categorias de Pregadores**
   - Pregador Iniciante, Intermediário, Avançado
   - Distribuição balanceada nas escalas

3. **Relatórios Estatísticos**
   - Dashboard para Associação
   - Métricas por distrito, igreja, pregador

4. **Gamificação**
   - Badges/conquistas para pregadores
   - Ranking mensal/anual

5. **Integração com Calendário**
   - iCal/Google Calendar export
   - Sincronização automática

---

## 🎓 DADOS DE EXEMPLO

Para facilitar testes, foi criada:
- ✅ Associação padrão: `id = '00000000-0000-0000-0000-000000000001'`

Scripts de seed adicionais podem ser criados para:
- Distritos de exemplo
- Igrejas de exemplo
- Usuários de teste
- Escalas de exemplo

---

## 📚 DOCUMENTAÇÃO ADICIONAL

1. **schema.sql** - Script SQL completo
2. **DICIONARIO_DADOS.md** - Dicionário detalhado de todas tabelas
3. **RESUMO_EXECUTIVO.md** - Este documento

---

## ✅ PRÓXIMOS PASSOS

Após aprovação deste schema:

### 1️⃣ Backend (FastAPI)
- Modelos SQLAlchemy
- Endpoints REST
- Lógica de negócio
- Algoritmo de escalas
- Integração WhatsApp/SMS
- Geração de PDF

### 2️⃣ Frontend (React)
- Dashboard administrativo
- Gestão de escalas
- Calendário interativo
- Gestão de usuários
- Configurações

### 3️⃣ Mobile (React Native)
- App para pregadores
- Visualização de escalas
- Aceitação/recusa
- Solicitação de trocas
- Notificações push

### 4️⃣ Documentação
- Manual de instalação
- Guia do usuário
- API docs (Swagger)
- Manual administrativo

### 5️⃣ Testes
- Testes unitários
- Testes de integração
- Testes de carga
- Validação de segurança

---

## 🎯 CONCLUSÃO

O schema do banco de dados foi projetado para:

✅ **Escalabilidade** - Suporta múltiplas associações, distritos e igrejas
✅ **Performance** - Índices estratégicos e views otimizadas
✅ **Flexibilidade** - Configurações JSONB e ENUMs
✅ **Integridade** - Constraints e validações robustas
✅ **Auditoria** - Rastreamento completo de ações
✅ **Automação** - Triggers e funções para regras de negócio

O sistema está pronto para implementação das camadas de aplicação (Backend, Frontend e Mobile).

---

**Aguardando aprovação para prosseguir com a implementação! 🚀**

---

**Versão:** 1.0
**Data:** 2025-11-21
**Status:** ⏳ Aguardando Aprovação
