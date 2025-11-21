# DICIONÁRIO DE DADOS - Sistema de Gestão de Escalas de Pregação

## Visão Geral do Banco de Dados

**SGBD:** PostgreSQL 15+
**Encoding:** UTF8
**Total de Tabelas:** 17
**Total de Views:** 2
**Total de ENUMs:** 8

---

## 📊 DIAGRAMA DE RELACIONAMENTOS (ERD)

```
┌─────────────────┐
│  ASSOCIATIONS   │ (Associação)
│  - id (PK)      │
│  - name         │
│  - acronym      │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐
│   DISTRICTS     │ (Distritos)
│  - id (PK)      │
│  - association_id (FK)
│  - name         │
└────────┬────────┘
         │ 1:N
         ├─────────────────────┐
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│    CHURCHES     │   │     USERS       │ (Usuários Multi-perfil)
│  - id (PK)      │   │  - id (PK)      │
│  - district_id (FK)  │  - district_id (FK)
│  - name         │   │  - church_id (FK)
└────────┬────────┘   │  - roles[]      │ (array)
         │            │  - email        │
         │ 1:N        └────────┬────────┘
         │                     │ 1:1
         │                     ▼
         │            ┌─────────────────┐
         │            │PREACHER_PROFILES│ (Perfil Pregador)
         │            │  - id (PK)      │
         │            │  - user_id (FK) │
         │            │  - score_average│
         │            │  - total_preachings
         │            └────────┬────────┘
         │                     │
         │                     │ 1:N
         │                     ▼
         │            ┌─────────────────┐
         │            │UNAVAILABILITY   │ (Indisponibilidades)
         │            │PERIODS          │
         │            │  - id (PK)      │
         │            │  - preacher_id (FK)
         │            │  - start_date   │
         │            │  - end_date     │
         │            └─────────────────┘
         │
         ▼
┌─────────────────┐
│  WORSHIP_TIMES  │ (Horários de Culto)
│  - id (PK)      │
│  - district_id (FK) OU church_id (FK)
│  - day_of_week  │
│  - time         │
└─────────────────┘

┌─────────────────┐
│     THEMES      │ (Temáticas de Pregação)
│  - id (PK)      │
│  - association_id (FK)
│  - recurrence_type
│  - specific_date│
│  - weekly_day   │
│  - monthly_week │
└─────────────────┘

┌─────────────────┐
│   SCHEDULES     │ (Escalas Mensais)
│  - id (PK)      │
│  - district_id (FK)
│  - reference_month
│  - reference_year
│  - status       │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐
│  PREACHING      │ (Pregações Individuais)
│  SCHEDULES      │
│  - id (PK)      │
│  - schedule_id (FK)
│  - church_id (FK)
│  - preacher_id (FK)
│  - theme_id (FK)│
│  - preaching_date
│  - status       │
└────────┬────────┘
         │ 1:N           │ 1:N
         ├───────────────┤
         ▼               ▼
┌─────────────────┐   ┌─────────────────┐
│  EVALUATIONS    │   │ SCHEDULE_SWAPS  │ (Trocas)
│  - id (PK)      │   │  - id (PK)      │
│  - preaching_schedule_id (FK)   │  - requester_preaching_id (FK)
│  - preacher_id (FK)  │  - target_preaching_id (FK)
│  - evaluator_id (FK) │  - status       │
│  - rating (0-5) │   └─────────────────┘
└─────────────────┘

┌─────────────────┐
│  NOTIFICATIONS  │ (Notificações)
│  - id (PK)      │
│  - user_id (FK) │
│  - type         │ (whatsapp/sms/push/email)
│  - status       │
│  - scheduled_for│
└─────────────────┘
```

---

## 📋 TABELAS PRINCIPAIS

### 1. **ASSOCIATIONS** (Associações)
Armazena as associações da Igreja Adventista.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `name` | VARCHAR(200) | Nome da associação |
| `acronym` | VARCHAR(20) | Sigla (ex: ASP) |
| `address` | TEXT | Endereço completo |
| `city` | VARCHAR(100) | Cidade |
| `state` | VARCHAR(50) | Estado/UF |
| `country` | VARCHAR(50) | País (padrão: Brasil) |
| `phone` | VARCHAR(20) | Telefone |
| `email` | VARCHAR(100) | E-mail |
| `website` | VARCHAR(200) | Site |
| `logo_url` | VARCHAR(500) | URL do logo |
| `is_active` | BOOLEAN | Ativo? (padrão: true) |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |
| `deleted_at` | TIMESTAMP | Soft delete |

**Relacionamentos:**
- 1:N com `districts`
- 1:N com `themes`

---

### 2. **DISTRICTS** (Distritos)
Distritos pertencentes a uma associação.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `association_id` | UUID (FK) | Associação |
| `name` | VARCHAR(200) | Nome do distrito |
| `code` | VARCHAR(50) | Código único |
| `region` | VARCHAR(100) | Região |
| `is_active` | BOOLEAN | Ativo? |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |
| `deleted_at` | TIMESTAMP | Soft delete |

**Relacionamentos:**
- N:1 com `associations`
- 1:N com `churches`
- 1:N com `users` (pastores distritais e membros)
- 1:N com `schedules`

---

### 3. **CHURCHES** (Igrejas)
Igrejas locais de um distrito.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `district_id` | UUID (FK) | Distrito |
| `name` | VARCHAR(200) | Nome da igreja |
| `address` | TEXT | Endereço |
| `city` | VARCHAR(100) | Cidade |
| `state` | VARCHAR(50) | Estado |
| `zip_code` | VARCHAR(20) | CEP |
| `phone` | VARCHAR(20) | Telefone |
| `email` | VARCHAR(100) | E-mail |
| `capacity` | INTEGER | Capacidade de pessoas |
| `has_sound_system` | BOOLEAN | Tem som? |
| `has_projection` | BOOLEAN | Tem projeção? |
| `notes` | TEXT | Observações |
| `is_active` | BOOLEAN | Ativo? |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |
| `deleted_at` | TIMESTAMP | Soft delete |

**Relacionamentos:**
- N:1 com `districts`
- 1:N com `users` (membros da igreja)
- 1:N com `preaching_schedules`
- 1:N com `worship_times`

---

### 4. **USERS** (Usuários)
Usuários do sistema com múltiplos perfis possíveis.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `association_id` | UUID (FK) | Associação (se membro da associação) |
| `district_id` | UUID (FK) | Distrito |
| `church_id` | UUID (FK) | Igreja |
| `email` | VARCHAR(150) UNIQUE | E-mail (login) |
| `phone` | VARCHAR(20) | Telefone |
| `whatsapp` | VARCHAR(20) | WhatsApp |
| `password_hash` | VARCHAR(255) | Senha criptografada |
| `full_name` | VARCHAR(200) | Nome completo |
| `cpf` | VARCHAR(14) UNIQUE | CPF |
| `birth_date` | DATE | Data de nascimento |
| `gender` | VARCHAR(20) | Gênero |
| `profile_photo_url` | VARCHAR(500) | Foto de perfil |
| **`roles`** | **user_role[]** | **Array de perfis** |
| `approval_status` | approval_status | Status de aprovação |
| `approved_by` | UUID (FK) | Aprovado por (usuário) |
| `approved_at` | TIMESTAMP | Data de aprovação |
| `notification_whatsapp` | BOOLEAN | Recebe WhatsApp? |
| `notification_sms` | BOOLEAN | Recebe SMS? |
| `notification_push` | BOOLEAN | Recebe Push? |
| `notification_email` | BOOLEAN | Recebe E-mail? |
| `is_active` | BOOLEAN | Ativo? |
| `last_login_at` | TIMESTAMP | Último login |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |
| `deleted_at` | TIMESTAMP | Soft delete |

**Perfis Possíveis (roles):**
- `association_member` - Membro da Associação
- `district_pastor` - Pastor Distrital
- `preacher` - Pregador/Membro
- `evaluator` - Membro Avaliador

**Relacionamentos:**
- N:1 com `associations`, `districts`, `churches`
- 1:1 com `preacher_profiles` (se for pregador)
- 1:N com `preaching_schedules` (pregações agendadas)
- 1:N com `evaluations` (avaliações feitas/recebidas)
- 1:N com `notifications`

---

### 5. **PREACHER_PROFILES** (Perfil de Pregador)
Informações estendidas para usuários pregadores.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID (FK) UNIQUE | Usuário (1:1) |
| `ordination_type` | VARCHAR(50) | Tipo de ordenação |
| `ordination_date` | DATE | Data de ordenação |
| `years_of_experience` | INTEGER | Anos de experiência |
| **`score_average`** | **DECIMAL(3,2)** | **Score médio (0-5)** |
| `score_evaluations` | DECIMAL(3,2) | Score de avaliações |
| `score_attendance` | DECIMAL(3,2) | Score de frequência |
| `score_punctuality` | DECIMAL(3,2) | Score de pontualidade |
| `total_preachings` | INTEGER | Total de pregações |
| `completed_preachings` | INTEGER | Pregações realizadas |
| `missed_preachings` | INTEGER | Pregações faltadas |
| `refused_preachings` | INTEGER | Pregações recusadas |
| `attendance_rate` | DECIMAL(5,2) | Taxa de frequência (%) |
| `punctuality_rate` | DECIMAL(5,2) | Taxa de pontualidade (%) |
| `max_preachings_per_month` | INTEGER | Limite mensal (padrão: 4) |
| `preferred_service_times` | TEXT[] | Horários preferidos |
| `notes` | TEXT | Observações |
| `is_active` | BOOLEAN | Ativo? |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

**Cálculo do Score:**
```
SCORE = (Média_Avaliações × 0.6) + (Taxa_Frequência × 0.25) + (Taxa_Pontualidade × 0.15)
```

**Relacionamentos:**
- 1:1 com `users`
- 1:N com `unavailability_periods`

---

### 6. **WORSHIP_TIMES** (Horários de Culto)
Horários de cultos por distrito ou igreja.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `district_id` | UUID (FK) | Distrito (se aplicável a todas igrejas) |
| `church_id` | UUID (FK) | Igreja específica |
| `day_of_week` | day_of_week | Dia da semana |
| `time` | TIME | Horário |
| `service_name` | VARCHAR(100) | Nome do culto |
| `duration_minutes` | INTEGER | Duração (minutos) |
| `requires_preacher` | BOOLEAN | Requer pregador? |
| `is_active` | BOOLEAN | Ativo? |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

**Constraint:** Um horário pertence OU ao distrito OU à igreja específica (não ambos).

---

### 7. **THEMES** (Temáticas de Pregação)
Temáticas sugestivas cadastradas pela associação.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `association_id` | UUID (FK) | Associação |
| `created_by` | UUID (FK) | Criado por (usuário) |
| `title` | VARCHAR(300) | Título do tema |
| `description` | TEXT | Descrição |
| `bible_reference` | VARCHAR(200) | Referência bíblica |
| **`recurrence_type`** | **theme_recurrence** | **Tipo de recorrência** |
| `specific_date` | DATE | Data específica (se aplicável) |
| `weekly_day_of_week` | day_of_week | Dia da semana (se semanal) |
| `monthly_week_number` | INTEGER | Semana do mês (1-5) |
| `monthly_day_of_week` | day_of_week | Dia da semana (se mensal) |
| `valid_from` | DATE | Válido de |
| `valid_until` | DATE | Válido até |
| `is_active` | BOOLEAN | Ativo? |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

**Tipos de Recorrência:**
- `specific_date` - Data específica (ex: 15/03/2025)
- `weekly` - Semanal (ex: Todo sábado)
- `monthly` - Mensal (ex: Todo 1º sábado do mês)

**Relacionamentos:**
- N:1 com `associations`
- 1:N com `preaching_schedules`

---

### 8. **SCHEDULES** (Escalas Mensais)
Escalas mensais de pregação por distrito.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `district_id` | UUID (FK) | Distrito |
| `reference_month` | INTEGER | Mês de referência (1-12) |
| `reference_year` | INTEGER | Ano de referência |
| `status` | schedule_status | Status da escala |
| `created_by` | UUID (FK) | Criado por |
| `approved_by` | UUID (FK) | Aprovado por |
| `finalized_by` | UUID (FK) | Finalizado por |
| `created_at` | TIMESTAMP | Data de criação |
| `approved_at` | TIMESTAMP | Data de aprovação |
| `finalized_at` | TIMESTAMP | Data de finalização |
| `updated_at` | TIMESTAMP | Data de atualização |
| `notes` | TEXT | Observações |

**Status:**
- `draft` - Rascunho (editável)
- `approved` - Aprovado (ajustes manuais)
- `finalized` - Finalizado (notificações enviadas)

**Constraint:** Uma escala por distrito por mês.

**Relacionamentos:**
- N:1 com `districts`
- 1:N com `preaching_schedules`

---

### 9. **PREACHING_SCHEDULES** (Pregações Individuais)
Pregações individuais dentro de uma escala.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `schedule_id` | UUID (FK) | Escala mensal |
| `church_id` | UUID (FK) | Igreja |
| `preacher_id` | UUID (FK) | Pregador |
| `theme_id` | UUID (FK) | Tema sugestivo |
| `preaching_date` | DATE | Data da pregação |
| `preaching_time` | TIME | Horário |
| `service_name` | VARCHAR(100) | Nome do culto |
| **`status`** | **preaching_status** | **Status da pregação** |
| `accepted_at` | TIMESTAMP | Aceito em |
| `refused_at` | TIMESTAMP | Recusado em |
| `refusal_reason` | TEXT | Motivo da recusa |
| `completed_at` | TIMESTAMP | Realizado em |
| `completed_by` | UUID (FK) | Confirmado por |
| `notes` | TEXT | Observações |
| `special_instructions` | TEXT | Instruções especiais |
| `is_swapped` | BOOLEAN | Foi trocado? |
| `original_preacher_id` | UUID (FK) | Pregador original (antes da troca) |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

**Status:**
- `scheduled` - Agendado (aguardando resposta)
- `accepted` - Aceito pelo pregador
- `refused` - Recusado pelo pregador (**desconta 15% do score**)
- `completed` - Realizado
- `missed` - Faltou

**Relacionamentos:**
- N:1 com `schedules`, `churches`, `users` (pregador), `themes`
- 1:N com `evaluations`
- 1:N com `schedule_swaps`

---

### 10. **SCHEDULE_SWAPS** (Trocas de Escala)
Solicitações de troca entre pregadores.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `requester_preaching_id` | UUID (FK) | Pregação do solicitante |
| `requester_user_id` | UUID (FK) | Solicitante |
| `target_preaching_id` | UUID (FK) | Pregação do destinatário |
| `target_user_id` | UUID (FK) | Destinatário |
| `status` | swap_status | Status da troca |
| `requester_reason` | TEXT | Justificativa |
| `requester_accepted_at` | TIMESTAMP | Aceito pelo solicitante em |
| `target_accepted_at` | TIMESTAMP | Aceito pelo destinatário em |
| `rejected_at` | TIMESTAMP | Rejeitado em |
| `rejection_reason` | TEXT | Motivo da rejeição |
| `rejected_by` | UUID (FK) | Rejeitado por |
| `completed_at` | TIMESTAMP | Concluído em |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

**Status:**
- `pending_requester` - Aguardando solicitante
- `pending_target` - Aguardando destinatário
- `accepted` - Aceita por ambos (troca realizada)
- `rejected` - Rejeitada
- `cancelled` - Cancelada

**Fluxo:**
1. Solicitante cria troca
2. Destinatário aceita/rejeita
3. Se aceita, **troca automática** (sem necessidade de aprovação)
4. Notificação ao Pastor/Líder sobre a troca realizada

---

### 11. **UNAVAILABILITY_PERIODS** (Períodos de Indisponibilidade)
Períodos em que pregadores não estão disponíveis.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `preacher_id` | UUID (FK) | Pregador |
| `start_date` | DATE | Data inicial |
| `end_date` | DATE | Data final |
| `reason` | TEXT | Motivo |
| `is_active` | BOOLEAN | Ativo? |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

**Constraint:** `end_date >= start_date`

**Uso:** Sistema impede escalar pregador em datas dentro do período.

---

### 12. **EVALUATIONS** (Avaliações de Pregadores)
Avaliações de pregações pelos membros.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `preaching_schedule_id` | UUID (FK) | Pregação avaliada |
| `preacher_id` | UUID (FK) | Pregador avaliado |
| `evaluator_id` | UUID (FK) | Avaliador |
| **`rating`** | **DECIMAL(2,1)** | **Nota geral (0-5)** |
| `content_quality` | DECIMAL(2,1) | Qualidade do conteúdo (0-5) |
| `presentation` | DECIMAL(2,1) | Apresentação (0-5) |
| `biblical_foundation` | DECIMAL(2,1) | Fundamentação bíblica (0-5) |
| `engagement` | DECIMAL(2,1) | Engajamento (0-5) |
| `comments` | TEXT | Comentários |
| `is_anonymous` | BOOLEAN | Anônimo? |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

**Constraint:** Um avaliador não pode avaliar a mesma pregação duas vezes.

**Trigger:** Ao inserir/atualizar avaliação, recalcula automaticamente o score do pregador.

---

### 13. **NOTIFICATIONS** (Notificações)
Sistema de notificações multi-canal.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID (FK) | Usuário destinatário |
| `type` | notification_type | Tipo de notificação |
| `status` | notification_status | Status |
| `title` | VARCHAR(200) | Título |
| `message` | TEXT | Mensagem |
| `whatsapp_message_id` | VARCHAR(100) | ID WhatsApp |
| `sms_message_id` | VARCHAR(100) | ID SMS |
| `push_message_id` | VARCHAR(100) | ID Push |
| `email_message_id` | VARCHAR(100) | ID E-mail |
| `preaching_schedule_id` | UUID (FK) | Pregação relacionada |
| `schedule_swap_id` | UUID (FK) | Troca relacionada |
| `scheduled_for` | TIMESTAMP | Agendar para |
| `sent_at` | TIMESTAMP | Enviado em |
| `delivered_at` | TIMESTAMP | Entregue em |
| `read_at` | TIMESTAMP | Lido em |
| `failed_at` | TIMESTAMP | Falhou em |
| `failure_reason` | TEXT | Motivo da falha |
| `retry_count` | INTEGER | Tentativas |
| `max_retries` | INTEGER | Máximo de tentativas |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

**Tipos:**
- `whatsapp` - WhatsApp Business API
- `sms` - SMS
- `push` - Notificação Push (mobile)
- `email` - E-mail

**Status:**
- `pending` - Pendente
- `sent` - Enviado
- `failed` - Falhou
- `delivered` - Entregue
- `read` - Lido

**Lembretes Automáticos:**
- 7 dias antes
- 3 dias antes
- 24 horas antes

---

### 14. **SETTINGS** (Configurações)
Configurações flexíveis em JSON.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `association_id` | UUID (FK) | Associação |
| `district_id` | UUID (FK) | Distrito |
| `church_id` | UUID (FK) | Igreja |
| `user_id` | UUID (FK) | Usuário |
| `setting_key` | VARCHAR(100) | Chave da configuração |
| `setting_value` | JSONB | Valor em JSON |
| `description` | TEXT | Descrição |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

**Exemplos de Configurações:**
```json
{
  "key": "max_preachings_per_month",
  "value": 4
}

{
  "key": "notification_preferences",
  "value": {
    "whatsapp": true,
    "sms": false,
    "push": true,
    "email": true
  }
}
```

---

### 15. **AUDIT_LOGS** (Logs de Auditoria)
Registro de todas as ações importantes.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID (FK) | Usuário que executou |
| `action` | VARCHAR(100) | Ação realizada |
| `entity_type` | VARCHAR(100) | Tipo de entidade |
| `entity_id` | UUID | ID da entidade |
| `old_values` | JSONB | Valores antigos |
| `new_values` | JSONB | Valores novos |
| `ip_address` | INET | Endereço IP |
| `user_agent` | TEXT | User Agent |
| `created_at` | TIMESTAMP | Data/hora |

**Uso:** Rastreabilidade de todas as operações críticas.

---

### 16. **IMPORT_LOGS** (Logs de Importação)
Logs de importações Excel/CSV.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID (FK) | Usuário que importou |
| `import_type` | VARCHAR(50) | Tipo de importação |
| `file_name` | VARCHAR(255) | Nome do arquivo |
| `file_size` | INTEGER | Tamanho do arquivo |
| `total_rows` | INTEGER | Total de linhas |
| `successful_rows` | INTEGER | Linhas bem-sucedidas |
| `failed_rows` | INTEGER | Linhas com erro |
| `errors` | JSONB | Erros detalhados |
| `status` | VARCHAR(50) | Status |
| `started_at` | TIMESTAMP | Iniciado em |
| `completed_at` | TIMESTAMP | Concluído em |

---

## 🔄 TIPOS ENUMERADOS (ENUMs)

### user_role
```sql
'association_member' | 'district_pastor' | 'preacher' | 'evaluator'
```

### approval_status
```sql
'pending' | 'approved' | 'rejected'
```

### schedule_status
```sql
'draft' | 'approved' | 'finalized'
```

### preaching_status
```sql
'scheduled' | 'accepted' | 'refused' | 'completed' | 'missed'
```

### theme_recurrence
```sql
'specific_date' | 'weekly' | 'monthly'
```

### notification_type
```sql
'whatsapp' | 'sms' | 'push' | 'email'
```

### notification_status
```sql
'pending' | 'sent' | 'failed' | 'delivered' | 'read'
```

### day_of_week
```sql
'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'
```

### swap_status
```sql
'pending_requester' | 'pending_target' | 'accepted' | 'rejected' | 'cancelled'
```

---

## 📊 VIEWS

### vw_preachers_full
View completa de pregadores com scores e estatísticas.

**Campos:**
- Dados pessoais (nome, email, phone, whatsapp)
- Igreja e distrito
- Scores detalhados
- Estatísticas de pregações
- Taxas de frequência e pontualidade

### vw_upcoming_preachings
Pregações futuras com informações completas.

**Campos:**
- Data e horário
- Pregador (nome, contatos)
- Igreja e distrito
- Tema sugestivo
- Status

---

## ⚙️ FUNÇÕES E TRIGGERS

### calculate_preacher_score(preacher_id)
Calcula e atualiza o score de um pregador.

**Fórmula:**
```
SCORE = (Média_Avaliações × 0.6) + (Taxa_Frequência × 0.25) + (Taxa_Pontualidade × 0.15)
```

### update_preacher_statistics(preacher_id)
Atualiza estatísticas e recalcula score do pregador.

### Triggers Automáticos

1. **update_updated_at_column**
   - Atualiza automaticamente o campo `updated_at` em todas as tabelas

2. **handle_preaching_refusal**
   - Quando pregador recusa escala: **desconta 15% do score**
   - Atualiza estatísticas

3. **handle_evaluation_change**
   - Quando avaliação é inserida/atualizada: recalcula score

---

## 🔐 ÍNDICES PRINCIPAIS

### Performance Crítica
- `idx_users_email` - Login rápido
- `idx_preacher_score` - Ordenação por score
- `idx_preaching_date_preacher` - Evitar conflitos de escala
- `idx_schedules_reference` - Busca por mês/ano
- `idx_notifications_scheduled` - Envio de lembretes

### Integridade Referencial
- Todos os relacionamentos têm índices em foreign keys
- GIN index em `users.roles` para busca em array

---

## 📈 ESTRATÉGIAS DE OTIMIZAÇÃO

1. **Índices Compostos**
   - `(preaching_date, preacher_id)` - Evitar conflitos
   - `(reference_year, reference_month)` - Busca de escalas

2. **Índices Parciais**
   - `WHERE is_active = true` - Registros ativos
   - `WHERE scheduled_for IS NOT NULL` - Notificações agendadas

3. **JSONB**
   - Configurações flexíveis
   - Logs estruturados
   - Suporte a GIN index

4. **Soft Delete**
   - Campo `deleted_at` em todas as tabelas principais
   - Preserva histórico e integridade referencial

---

## 🔒 SEGURANÇA

1. **Autenticação**
   - Password hash (bcrypt/argon2)
   - JWT tokens

2. **Autorização**
   - Controle por `roles` (array multi-perfil)
   - Aprovação de cadastros

3. **Auditoria**
   - Tabela `audit_logs` para todas operações críticas
   - IP e User Agent registrados

4. **Proteção de Dados**
   - CPF único e protegido
   - Avaliações opcionalmente anônimas

---

## 📦 EXTENSÕES POSTGRESQL

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- Geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- Criptografia
```

---

## 🎯 REGRAS DE NEGÓCIO IMPLEMENTADAS NO BANCO

1. **Score de Pregador**
   - Calculado automaticamente por função
   - Atualizado a cada avaliação
   - Penalização de 15% ao recusar pregação

2. **Escalas Únicas**
   - Constraint: uma escala por distrito por mês
   - Índice composto previne conflitos

3. **Trocas Automáticas**
   - Sem aprovação de pastor
   - Notificação informativa apenas

4. **Indisponibilidades**
   - Check constraint: `end_date >= start_date`
   - Sistema verifica antes de escalar

5. **Temáticas Flexíveis**
   - Recorrência específica, semanal ou mensal
   - Aplicadas a todas igrejas da associação

6. **Horários de Culto**
   - Por distrito (todas igrejas) OU por igreja específica
   - Check constraint garante exclusividade

7. **Avaliações Únicas**
   - Constraint: um avaliador não pode avaliar mesma pregação 2x

---

## 📝 DADOS INICIAIS (SEEDS)

Associação padrão criada:
```sql
id: '00000000-0000-0000-0000-000000000001'
name: 'Associação Exemplo'
acronym: 'AE'
```

---

## 🚀 PRÓXIMOS PASSOS

Após aprovação do schema:
1. ✅ **Backend FastAPI** - APIs REST completas
2. ✅ **Frontend React** - Dashboard e gestão
3. ✅ **Mobile React Native** - App para pregadores
4. ✅ **Documentação** - Manuais e guias
5. ✅ **Testes** - Unitários e integração

---

**Versão:** 1.0
**Data:** 2025-11-21
**Autor:** Sistema de Gestão de Escalas de Pregação - IASD
