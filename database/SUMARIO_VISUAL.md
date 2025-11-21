# 📊 SUMÁRIO VISUAL - Estrutura do Banco de Dados

## Visão Rápida para Avaliação

---

## 🎯 PONTOS-CHAVE PARA REVISÃO

### ✅ O que foi implementado:

1. **17 Tabelas Principais** organizadas logicamente
2. **Sistema Multi-Perfil** com array `roles[]` na tabela users
3. **Score Automático** com cálculo via função SQL e triggers
4. **Trocas Automáticas** sem necessidade de aprovação
5. **Temáticas com Recorrência** (específica, semanal, mensal)
6. **Sistema de Notificações** multi-canal (WhatsApp/SMS/Push/Email)
7. **Soft Delete** em todas tabelas principais
8. **Auditoria Completa** de ações críticas
9. **Performance** com 45+ índices estratégicos
10. **Validações** via constraints e triggers

---

## 📋 TABELAS POR CATEGORIA

### 🏛️ ORGANIZACIONAL (3 tabelas)
```
1. associations    - Associações da IASD
2. districts       - Distritos por associação
3. churches        - Igrejas por distrito
```

### 👥 USUÁRIOS E PERFIS (2 tabelas)
```
4. users                - Usuários multi-perfil (roles[])
5. preacher_profiles    - Perfil estendido com score
```

### 📅 ESCALAS (3 tabelas)
```
6. schedules             - Escalas mensais (uma por distrito/mês)
7. preaching_schedules   - Pregações individuais
8. schedule_swaps        - Trocas entre pregadores (automáticas)
```

### ⭐ AVALIAÇÃO E SCORE (1 tabela)
```
9. evaluations    - Avaliações 0-5 estrelas
```

### 📖 TEMÁTICAS (1 tabela)
```
10. themes    - Temáticas sugestivas (data/semanal/mensal)
```

### ⚙️ CONFIGURAÇÕES (3 tabelas)
```
11. worship_times             - Horários de culto
12. unavailability_periods    - Indisponibilidades
13. settings                  - Configurações JSONB
```

### 🔔 NOTIFICAÇÕES (1 tabela)
```
14. notifications    - Multi-canal com agendamento
```

### 📊 LOGS E AUDITORIA (3 tabelas)
```
15. audit_logs    - Auditoria completa
16. import_logs   - Logs de importação
17. (tabela auxiliar para controle)
```

---

## 🔗 RELACIONAMENTOS CRÍTICOS

### Hierarquia Organizacional
```
ASSOCIATIONS (1) ──→ (N) DISTRICTS (1) ──→ (N) CHURCHES
                            │
                            └──→ (N) USERS
```

### Sistema de Escalas
```
DISTRICTS (1) ──→ (N) SCHEDULES (1) ──→ (N) PREACHING_SCHEDULES
                                                  │
                                                  ├──→ (N) EVALUATIONS
                                                  └──→ (N) SCHEDULE_SWAPS
```

### Perfil de Pregador
```
USERS (1) ──→ (1) PREACHER_PROFILES
         │
         └──→ (N) UNAVAILABILITY_PERIODS
```

---

## 🎲 FÓRMULA DO SCORE

```sql
SCORE = (Média_Avaliações × 0.6) + (Taxa_Frequência × 0.25) + (Taxa_Pontualidade × 0.15)
```

**Atualização Automática via Triggers:**
- ✅ Após inserir/atualizar avaliação
- ✅ Ao recusar pregação (-15% do score)
- ✅ Ao completar/faltar pregação

---

## 🔄 FLUXOS AUTOMATIZADOS

### 1️⃣ Geração de Escala
```
1. Sistema busca pregadores ORDER BY score_average DESC
2. Valida indisponibilidades (tabela unavailability_periods)
3. Valida conflitos de data (mesmo pregador, mesma data)
4. Valida limite mensal (max_preachings_per_month)
5. Busca tema sugestivo para a data (tabela themes)
6. Cria pregação (tabela preaching_schedules)
7. Status: DRAFT → APPROVED → FINALIZED
```

### 2️⃣ Troca Automática
```
1. Pregador A solicita troca com Pregador B
2. Registro criado em schedule_swaps (status: pending_target)
3. Pregador B aceita (status: accepted)
4. Sistema executa troca AUTOMATICAMENTE:
   - Atualiza preacher_id nas preaching_schedules
   - Marca is_swapped = true
   - Registra original_preacher_id
5. Notificações enviadas (pregadores + pastor informativo)
```

### 3️⃣ Recusa de Pregação
```
1. Pregador recusa (status: refused)
2. TRIGGER: handle_preaching_refusal
3. Score reduzido em 15%
4. Estatísticas atualizadas
```

### 4️⃣ Avaliação
```
1. Membro avalia pregação (0-5 estrelas)
2. TRIGGER: handle_evaluation_change
3. FUNCTION: calculate_preacher_score
4. Score recalculado automaticamente
```

---

## 📊 ENUMS (Tipos Enumerados)

### user_role (Perfis de Usuário)
```sql
- association_member    -- Gerencia tudo
- district_pastor       -- Gerencia distrito
- preacher             -- Prega e visualiza escalas
- evaluator            -- Avalia pregadores
```

### schedule_status (Status de Escala)
```sql
- draft        -- Rascunho (editável)
- approved     -- Aprovado (ajustes finais)
- finalized    -- Finalizado (notificações enviadas)
```

### preaching_status (Status de Pregação)
```sql
- scheduled    -- Agendado
- accepted     -- Aceito pelo pregador
- refused      -- Recusado (-15% score)
- completed    -- Realizado
- missed       -- Faltou
```

### theme_recurrence (Recorrência de Tema)
```sql
- specific_date    -- Ex: 31/10/2025 (Reforma)
- weekly          -- Ex: Todo sábado
- monthly         -- Ex: Todo 1º sábado
```

### notification_type (Tipo de Notificação)
```sql
- whatsapp    -- WhatsApp Business API
- sms         -- SMS via Twilio
- push        -- Push Notification (mobile)
- email       -- E-mail
```

---

## 🔐 SEGURANÇA E VALIDAÇÕES

### Check Constraints (15+)
```sql
✅ score_average BETWEEN 0 AND 5
✅ rating BETWEEN 0 AND 5
✅ reference_month BETWEEN 1 AND 12
✅ reference_year >= 2024
✅ end_date >= start_date
✅ Horário de culto: OU distrito OU igreja (XOR)
```

### Unique Constraints (8)
```sql
✅ users.email (único)
✅ users.cpf (único)
✅ preacher_profiles.user_id (1:1)
✅ schedules(district_id, month, year) (uma escala/distrito/mês)
✅ evaluations(preaching_schedule_id, evaluator_id)
```

### Foreign Keys (32)
```sql
✅ Todas com ON DELETE apropriado:
   - CASCADE para dependências obrigatórias
   - SET NULL para referências opcionais
```

---

## 🚀 PERFORMANCE

### Índices Estratégicos (45+)

**Busca de Usuários:**
```sql
idx_users_email, idx_users_cpf, idx_users_roles (GIN)
```

**Geração de Escalas:**
```sql
idx_preacher_score (score_average DESC)
idx_preaching_date_preacher (validar conflitos)
```

**Notificações:**
```sql
idx_notifications_scheduled (envio agendado)
idx_notifications_status
```

**Queries Recorrentes:**
```sql
idx_schedules_reference (year DESC, month DESC)
idx_evaluations_preacher_id
```

---

## 🎯 REGRAS DE NEGÓCIO IMPLEMENTADAS

### ✅ Via Triggers
1. **update_updated_at_column** - Atualiza timestamp automaticamente
2. **handle_preaching_refusal** - Penaliza score em 15%
3. **handle_evaluation_change** - Recalcula score

### ✅ Via Functions
1. **calculate_preacher_score(preacher_id)** - Calcula score
2. **update_preacher_statistics(preacher_id)** - Atualiza estatísticas

### ✅ Via Constraints
1. Uma escala por distrito por mês
2. Uma avaliação por avaliador por pregação
3. Score e ratings entre 0-5
4. Datas válidas
5. Horário de culto: OU distrito OU igreja

---

## 📊 VIEWS OTIMIZADAS (2)

### vw_preachers_full
```sql
-- Pregadores com scores e estatísticas
-- Usado em: Geração de escalas, Relatórios
SELECT user.*, preacher_profile.*, church.name, district.name
FROM users
JOIN preacher_profiles ON ...
ORDER BY score_average DESC
```

### vw_upcoming_preachings
```sql
-- Pregações futuras
-- Usado em: Calendário, Notificações, Lembretes
SELECT preaching.*, preacher.name, church.name, theme.title
FROM preaching_schedules
WHERE preaching_date >= CURRENT_DATE
```

---

## ⚠️ PONTOS PARA VALIDAÇÃO

### 🔍 Por favor, revise:

1. **Estrutura de Perfis Multi-Usuário**
   - ❓ Array `roles[]` atende bem os casos de uso?
   - ❓ Um usuário pode ter múltiplos perfis simultâneos?
   - ✅ Resposta atual: SIM (ex: pregador + avaliador)

2. **Temáticas Mensais**
   - ❓ Recorrência mensal está clara?
   - Estrutura atual: `monthly_week_number` (1-5) + `monthly_day_of_week`
   - Exemplo: "Todo 1º sábado" = week_number=1, day='saturday'

3. **Limite de Pregações**
   - ❓ Limite deve ser por pregador ou também por distrito?
   - ✅ Atual: Campo `max_preachings_per_month` em preacher_profiles
   - ✅ Pode ser sobrescrito via tabela settings

4. **Horários de Culto**
   - ❓ Constraint XOR (distrito OU igreja) está correto?
   - ✅ Permite: Horário padrão do distrito aplicado a todas igrejas
   - ✅ Permite: Horário específico de uma igreja

5. **Trocas Automáticas**
   - ❓ Realmente automáticas (sem aprovação)?
   - ✅ Sim, confirmado nos requisitos
   - ✅ Pastor recebe notificação INFORMATIVA apenas

6. **Score - Pesos**
   - ❓ Fórmula está adequada?
   - Atual: Avaliações 60%, Frequência 25%, Pontualidade 15%
   - ❓ Deve ser configurável?

---

## ✅ CHECKLIST FINAL

### Estrutura
- [x] Todas tabelas criadas
- [x] Relacionamentos definidos
- [x] Constraints implementados
- [x] Índices criados
- [x] Triggers implementados
- [x] Funções criadas
- [x] Views criadas
- [x] ENUMs definidos

### Funcionalidades
- [x] Sistema de score automático
- [x] Trocas automáticas
- [x] Temáticas com recorrência
- [x] Sistema de notificações
- [x] Horários de culto flexíveis
- [x] Indisponibilidades
- [x] Avaliações
- [x] Auditoria
- [x] Soft delete

### Documentação
- [x] Schema SQL completo
- [x] Dicionário de dados
- [x] Diagramas ERD
- [x] Resumo executivo
- [x] Sumário visual

---

## 📝 DECISÕES TÉCNICAS IMPORTANTES

### 1. UUID vs Integer
✅ **Escolha:** UUID
**Motivo:** Escalabilidade, distribuição, segurança

### 2. Soft Delete
✅ **Escolha:** Campo `deleted_at`
**Motivo:** Preservar histórico, integridade referencial

### 3. JSONB para Configurações
✅ **Escolha:** Tabela `settings` com `setting_value JSONB`
**Motivo:** Flexibilidade, extensibilidade

### 4. Array vs Tabela Pivot para Roles
✅ **Escolha:** Array `roles[]`
**Motivo:** Simplicidade, performance, poucos perfis

### 5. Triggers vs Application Logic
✅ **Escolha:** Triggers para cálculos críticos
**Motivo:** Garantia de consistência, performance

---

## 🎯 PRÓXIMO PASSO

**Aguardando sua aprovação para prosseguir com:**

1. ✅ Backend FastAPI
2. ✅ Frontend React
3. ✅ Mobile React Native

**Por favor, revise especialmente:**
- ❓ Estrutura de perfis multi-usuário
- ❓ Sistema de temáticas (recorrência)
- ❓ Fórmula de score e pesos
- ❓ Trocas automáticas sem aprovação
- ❓ Horários de culto (distrito vs igreja)

---

## 📞 FEEDBACK

**Para aprovar:**
"Aprovado! Pode prosseguir com o Backend."

**Para ajustes:**
Indique os pontos específicos que precisam ser revisados.

---

**Status:** ⏳ Aguardando Aprovação
**Versão:** 1.0
**Data:** 2025-11-21
