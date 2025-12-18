# Sistema de Gerenciamento de Escalas de Pregação e Louvor

## Documentação Completa - Parte 3: Modelo de Dados

---

## MODELO DE DADOS COMPLETO E ATUALIZADO

### Diagrama Entidade-Relacionamento (Textual)

```
ORGANIZACAO (1) ──── (N) DISTRITO
                            │
                            ├── (1) pastor_distrital ─→ USUARIO
                            ├── (0,1) lider_distrital ─→ USUARIO
                            │
                            ├──── (N) IGREJA
                            │        │
                            │        ├──── (N) HORARIO_CULTO
                            │        └──── (N) MEMBRO → USUARIO
                            │
                            ├──── (N) PREGADOR → USUARIO
                            └──── (N) CANTOR → USUARIO

USUARIO (1) ──── (N) PREFERENCIA_IGREJA ──── (1) IGREJA
USUARIO (1) ──── (N) INDISPONIBILIDADE
USUARIO (1) ──── (N) BLOQUEIO_TEMPORARIO
USUARIO (1) ──── (N) HISTORICO_SCORE
USUARIO (1) ──── (N) PENALIDADE
USUARIO (1) ──── (N) HISTORICO_TROCA_ESCALA
USUARIO (1) ──── (N) HISTORICO_SUBSTITUICAO_EMERGENCIAL

ORGANIZACAO (1) ──── (N) TEMA

DISTRITO (1) ──── (N) ESCALA
                        │
                        └──── (N) ITEM_ESCALA
                                    │
                                    ├──── (1) IGREJA
                                    ├──── (0,1) PREGADOR → USUARIO
                                    ├──── (0,1) CANTOR → USUARIO
                                    ├──── (0,1) TEMA
                                    ├──── (N) HISTORICO_ITEM_ESCALA
                                    ├──── (N) SOLICITACAO_TROCA
                                    └──── (N) AVALIACAO
                                                │
                                                ├──── (1) AVALIADO → USUARIO
                                                └──── (1) AVALIADOR → USUARIO

USUARIO (1) ──── (N) NOTIFICACAO ──── (N) LOG_NOTIFICACAO
```

---

## ENTIDADES DETALHADAS

### 1. ORGANIZACAO

**Descrição:** Representa a organização religiosa principal (nível mais alto da hierarquia).

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| nome | VARCHAR(255) | NOT NULL | Nome da organização |
| cnpj | VARCHAR(18) | UNIQUE | CNPJ da organização |
| logo_url | TEXT | - | URL do logo |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de atualização |

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_organizacao_cnpj (cnpj)

---

### 2. DISTRITO

**Descrição:** Representa um distrito da organização, gerenciado por um Pastor Distrital.

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| organizacao_id | INTEGER | NOT NULL, FK → organizacao(id) | Organização pai |
| nome | VARCHAR(255) | NOT NULL | Nome do distrito |
| descricao | TEXT | - | Descrição do distrito |
| pastor_distrital_id | INTEGER | FK → usuario(id) | Pastor responsável |
| lider_distrital_id | INTEGER | FK → usuario(id) | Líder distrital (opcional) |
| config_recorrencia_maxima | INTEGER | DEFAULT 3, CHECK > 0 | Máx. participações/mês |
| config_intervalo_minimo | INTEGER | DEFAULT 7, CHECK >= 0 | Dias mínimos entre participações |
| config_usa_preferencia | BOOLEAN | DEFAULT FALSE | Habilita preferências de igreja |
| config_exige_confirmacao | BOOLEAN | DEFAULT TRUE | Exige confirmação de presença |
| config_prazo_confirmacao_horas | INTEGER | DEFAULT 48, CHECK > 0 | Prazo para confirmar (horas) |
| config_exige_aprovacao_troca | BOOLEAN | DEFAULT TRUE | Exige aprovação do Pastor para trocas |
| config_prazo_avaliacao_dias | INTEGER | DEFAULT 7, CHECK 1-30 | Prazo para avaliar (dias) |
| status | ENUM status_geral | DEFAULT 'ATIVO' | ATIVO ou INATIVO |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de atualização |

**Constraints:**
- CHECK: lider_distrital_id != pastor_distrital_id

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_distrito_organizacao (organizacao_id)
- INDEX idx_distrito_pastor (pastor_distrital_id)
- INDEX idx_distrito_lider (lider_distrital_id)
- INDEX idx_distrito_status (status)

---

### 3. IGREJA

**Descrição:** Representa uma igreja dentro de um distrito.

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| distrito_id | INTEGER | NOT NULL, FK → distrito(id) | Distrito pai |
| nome | VARCHAR(255) | NOT NULL | Nome da igreja |
| endereco_completo | TEXT | - | Endereço completo |
| telefone | VARCHAR(20) | - | Telefone de contato |
| email | VARCHAR(255) | - | Email de contato |
| status | ENUM status_geral | DEFAULT 'ATIVO' | ATIVO ou INATIVO |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de atualização |

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_igreja_distrito (distrito_id)
- INDEX idx_igreja_status (status)
- INDEX idx_igreja_nome_trgm (nome) USING gin (para busca textual)

---

### 4. HORARIO_CULTO

**Descrição:** Define os horários de cultos de cada igreja.

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| igreja_id | INTEGER | NOT NULL, FK → igreja(id) | Igreja |
| dia_semana | ENUM dia_semana | NOT NULL | SABADO, DOMINGO ou QUARTA |
| horario | TIME | NOT NULL | Horário do culto |
| ativo | BOOLEAN | DEFAULT TRUE | Se o horário está ativo |
| aplicado_em_lote | BOOLEAN | DEFAULT FALSE | Se foi aplicado em lote |
| lote_id | UUID | - | Identificador do lote |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |

**Constraints:**
- UNIQUE (igreja_id, dia_semana, horario)

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_horario_igreja (igreja_id)
- INDEX idx_horario_dia (dia_semana)
- INDEX idx_horario_lote (lote_id) WHERE lote_id IS NOT NULL

---

### 5. USUARIO

**Descrição:** Representa todos os usuários do sistema (polimórfico).

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| nome_completo | VARCHAR(255) | NOT NULL | Nome completo |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email (login) |
| senha_hash | VARCHAR(255) | NOT NULL | Senha criptografada (bcrypt) |
| cpf | VARCHAR(14) | UNIQUE, NOT NULL | CPF |
| telefone | VARCHAR(20) | - | Telefone |
| whatsapp | VARCHAR(20) | - | WhatsApp |
| data_nascimento | DATE | - | Data de nascimento |
| foto_url | TEXT | - | URL da foto de perfil |
| tipo | ENUM tipo_usuario | NOT NULL | Tipo de usuário |
| distrito_id | INTEGER | FK → distrito(id) | Distrito (se aplicável) |
| igreja_id | INTEGER | FK → igreja(id) | Igreja (para membros) |
| score_atual | NUMERIC(5,2) | DEFAULT 70.00, CHECK 0-100 | Score atual (pregador/cantor) |
| contador_mes_atual | INTEGER | DEFAULT 0, CHECK >= 0 | Participações no mês |
| contador_total_participacoes | INTEGER | DEFAULT 0, CHECK >= 0 | Total de participações |
| contador_faltas | INTEGER | DEFAULT 0, CHECK >= 0 | Total de faltas |
| contador_desmarcacoes | INTEGER | DEFAULT 0, CHECK >= 0 | Total de desmarcações |
| status | ENUM status_geral | DEFAULT 'ATIVO' | ATIVO ou INATIVO |
| status_aprovacao | ENUM status_aprovacao | DEFAULT 'APROVADO' | Status de aprovação |
| data_solicitacao_cadastro | TIMESTAMP | - | Data de solicitação |
| data_aprovacao | TIMESTAMP | - | Data de aprovação |
| aprovado_por_id | INTEGER | FK → usuario(id) | Quem aprovou |
| motivo_recusa | TEXT | - | Motivo de recusa |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de atualização |
| ultimo_login | TIMESTAMP | - | Último login |

**Enums:**

**tipo_usuario:**
- ADMIN
- PASTOR_DISTRITAL
- LIDER_DISTRITAL
- PREGADOR
- CANTOR
- MEMBRO

**status_aprovacao:**
- PENDENTE_APROVACAO
- APROVADO
- RECUSADO

**Constraints:**
- CHECK: tipo = 'MEMBRO' → igreja_id NOT NULL
- CHECK: tipo IN ('PREGADOR', 'CANTOR') → distrito_id NOT NULL
- CHECK: tipo IN ('PASTOR_DISTRITAL', 'LIDER_DISTRITAL') → distrito_id NOT NULL

**Índices:**
- PRIMARY KEY (id)
- UNIQUE INDEX idx_usuario_email (email)
- UNIQUE INDEX idx_usuario_cpf (cpf)
- INDEX idx_usuario_tipo (tipo)
- INDEX idx_usuario_distrito (distrito_id)
- INDEX idx_usuario_igreja (igreja_id)
- INDEX idx_usuario_status (status)
- INDEX idx_usuario_status_aprovacao (status_aprovacao)
- INDEX idx_usuario_score (score_atual) WHERE tipo IN ('PREGADOR', 'CANTOR')
- INDEX idx_usuario_nome_trgm (nome_completo) USING gin

---

### 6. PREFERENCIA_IGREJA

**Descrição:** Preferências de igreja de pregadores/cantores.

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| usuario_id | INTEGER | NOT NULL, FK → usuario(id) | Pregador/Cantor |
| igreja_id | INTEGER | NOT NULL, FK → igreja(id) | Igreja preferida |
| ordem | INTEGER | NOT NULL, CHECK 1-3 | Ordem de preferência (1ª, 2ª, 3ª) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |

**Constraints:**
- UNIQUE (usuario_id, igreja_id)
- UNIQUE (usuario_id, ordem)

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_preferencia_usuario (usuario_id)
- INDEX idx_preferencia_igreja (igreja_id)

---

### 7. INDISPONIBILIDADE

**Descrição:** Períodos de indisponibilidade de pregadores/cantores.

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| usuario_id | INTEGER | NOT NULL, FK → usuario(id) | Pregador/Cantor |
| data_inicio | DATE | NOT NULL | Data inicial |
| data_fim | DATE | NOT NULL | Data final |
| motivo_tipo | ENUM motivo_indisponibilidade | NOT NULL | Tipo de motivo |
| motivo_descricao | TEXT | - | Descrição do motivo |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |

**Enums:**

**motivo_indisponibilidade:**
- FERIAS
- VIAGEM
- COMPROMISSO
- SAUDE
- OUTRO

**Constraints:**
- CHECK: data_fim >= data_inicio

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_indisponibilidade_usuario (usuario_id)
- INDEX idx_indisponibilidade_datas (data_inicio, data_fim)

---

### 8. BLOQUEIO_TEMPORARIO

**Descrição:** Bloqueios temporários aplicados pelo Pastor.

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| usuario_id | INTEGER | NOT NULL, FK → usuario(id) | Pregador/Cantor bloqueado |
| pastor_id | INTEGER | NOT NULL, FK → usuario(id) | Pastor que bloqueou |
| data_inicio | DATE | NOT NULL | Data inicial do bloqueio |
| data_fim | DATE | NOT NULL | Data final do bloqueio |
| motivo | TEXT | NOT NULL | Motivo do bloqueio |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |

**Constraints:**
- CHECK: data_fim >= data_inicio
- CHECK: pastor_id != usuario_id

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_bloqueio_usuario (usuario_id)
- INDEX idx_bloqueio_datas (data_inicio, data_fim)
- INDEX idx_bloqueio_ativo (usuario_id, data_inicio, data_fim) WHERE data_fim >= CURRENT_DATE

---

### 9. TEMA

**Descrição:** Temas de cultos definidos pela organização.

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| organizacao_id | INTEGER | NOT NULL, FK → organizacao(id) | Organização |
| titulo | VARCHAR(255) | NOT NULL | Título do tema |
| descricao | TEXT | - | Descrição/sugestão |
| tipo_recorrencia | ENUM tipo_recorrencia_tema | NOT NULL | Tipo de recorrência |
| config_recorrencia | JSONB | NOT NULL | Configuração JSON |
| ano_aplicacao | INTEGER | - | Ano (para temas únicos) |
| status | ENUM status_geral | DEFAULT 'ATIVO' | ATIVO ou INATIVO |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de atualização |

**Enums:**

**tipo_recorrencia_tema:**
- SEMANAL_MES (ex: todo 2º sábado do mês)
- PERIODO_ESPECIFICO (ex: Semana Santa)
- ANUAL (ex: Dia das Mães)

**Exemplos de config_recorrencia (JSONB):**
```json
// Semanal do mês
{"tipo": "semanal_mes", "semana": 2, "dia": "SABADO"}

// Período específico
{"tipo": "periodo", "data_inicio": "2025-04-13", "data_fim": "2025-04-20"}

// Anual recorrente
{"tipo": "anual", "mes": 5, "semana": 2, "dia": "DOMINGO"}
```

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_tema_organizacao (organizacao_id)
- INDEX idx_tema_tipo_recorrencia (tipo_recorrencia)
- INDEX idx_tema_status (status)
- INDEX idx_tema_config (config_recorrencia) USING gin

---

### 10. ESCALA

**Descrição:** Representa uma escala mensal de um distrito.

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| distrito_id | INTEGER | NOT NULL, FK → distrito(id) | Distrito |
| mes | INTEGER | NOT NULL, CHECK 1-12 | Mês da escala |
| ano | INTEGER | NOT NULL, CHECK >= 2024 | Ano da escala |
| status | ENUM status_escala | DEFAULT 'RASCUNHO' | Status da escala |
| data_publicacao | TIMESTAMP | - | Data de publicação |
| pastor_id | INTEGER | NOT NULL, FK → usuario(id) | Pastor que criou |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de atualização |

**Enums:**

**status_escala:**
- RASCUNHO
- PUBLICADA
- ARQUIVADA

**Constraints:**
- UNIQUE (distrito_id, mes, ano)

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_escala_distrito (distrito_id)
- INDEX idx_escala_mes_ano (mes, ano)
- INDEX idx_escala_status (status)
- INDEX idx_escala_pastor (pastor_id)

---

### 11. ITEM_ESCALA

**Descrição:** Representa cada item individual da escala (um culto).

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| escala_id | INTEGER | NOT NULL, FK → escala(id) | Escala pai |
| igreja_id | INTEGER | NOT NULL, FK → igreja(id) | Igreja |
| data_culto | DATE | NOT NULL | Data do culto |
| horario | TIME | NOT NULL | Horário do culto |
| pregador_id | INTEGER | FK → usuario(id) | Pregador escalado |
| cantor_id | INTEGER | FK → usuario(id) | Cantor escalado |
| tema_id | INTEGER | FK → tema(id) | Tema do culto |
| tema_customizado | TEXT | - | Tema customizado |
| status_confirmacao_pregador | ENUM status_confirmacao | DEFAULT 'PENDENTE' | Status confirmação |
| status_confirmacao_cantor | ENUM status_confirmacao | DEFAULT 'PENDENTE' | Status confirmação |
| data_confirmacao_pregador | TIMESTAMP | - | Data de confirmação |
| data_confirmacao_cantor | TIMESTAMP | - | Data de confirmação |
| status_realizacao | ENUM status_realizacao | DEFAULT 'PENDENTE' | Status de realização |
| observacoes | TEXT | - | Observações |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de atualização |

**Enums:**

**status_confirmacao:**
- PENDENTE
- CONFIRMADO
- NAO_CONFIRMADO

**status_realizacao:**
- PENDENTE
- REALIZADO
- CANCELADO
- FALTA_PREGADOR
- FALTA_CANTOR

**Constraints:**
- CHECK: tema_id IS NOT NULL OR tema_customizado IS NOT NULL

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_item_escala_escala (escala_id)
- INDEX idx_item_escala_igreja (igreja_id)
- INDEX idx_item_escala_data (data_culto)
- INDEX idx_item_escala_pregador (pregador_id)
- INDEX idx_item_escala_cantor (cantor_id)
- INDEX idx_item_escala_status_realizacao (status_realizacao)
- INDEX idx_item_escala_confirmacao_pregador (status_confirmacao_pregador) WHERE pregador_id IS NOT NULL
- INDEX idx_item_escala_confirmacao_cantor (status_confirmacao_cantor) WHERE cantor_id IS NOT NULL
- INDEX idx_item_escala_distrito_periodo (igreja_id, data_culto) INCLUDE (pregador_id, cantor_id, status_realizacao)

---

### 12. HISTORICO_ITEM_ESCALA

**Descrição:** Histórico de alterações em itens da escala.

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| item_escala_id | INTEGER | NOT NULL, FK → item_escala(id) | Item da escala |
| usuario_id | INTEGER | NOT NULL, FK → usuario(id) | Usuário que fez a ação |
| acao | ENUM acao_item_escala | NOT NULL | Tipo de ação |
| descricao | TEXT | NOT NULL | Descrição da ação |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data da ação |

**Enums:**

**acao_item_escala:**
- CRIACAO
- EDICAO
- TROCA
- CANCELAMENTO
- SUBSTITUICAO

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_historico_item (item_escala_id)
- INDEX idx_historico_usuario (usuario_id)
- INDEX idx_historico_data (created_at)

---

### 13. SOLICITACAO_TROCA

**Descrição:** Solicitações de troca de escala.

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| item_escala_id | INTEGER | NOT NULL, FK → item_escala(id) | Item da escala |
| tipo | ENUM tipo_avaliado | NOT NULL | PREGADOR ou CANTOR |
| solicitante_id | INTEGER | NOT NULL, FK → usuario(id) | Quem solicitou |
| substituto_id | INTEGER | NOT NULL, FK → usuario(id) | Substituto proposto |
| motivo | TEXT | NOT NULL | Motivo da troca |
| status | ENUM status_solicitacao_troca | DEFAULT 'PENDENTE_SUBSTITUTO' | Status |
| data_resposta_substituto | TIMESTAMP | - | Data resposta substituto |
| data_resposta_pastor | TIMESTAMP | - | Data resposta pastor |
| pastor_id | INTEGER | FK → usuario(id) | Pastor que aprovou/recusou |
| observacao_pastor | TEXT | - | Observação do pastor |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de atualização |

**Enums:**

**status_solicitacao_troca:**
- PENDENTE_SUBSTITUTO
- PENDENTE_PASTOR
- APROVADA
- RECUSADA

**Constraints:**
- CHECK: solicitante_id != substituto_id

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_solicitacao_item (item_escala_id)
- INDEX idx_solicitacao_solicitante (solicitante_id)
- INDEX idx_solicitacao_substituto (substituto_id)
- INDEX idx_solicitacao_status (status)

---

### 14. AVALIACAO

**Descrição:** Avaliações de pregadores e cantores.

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| item_escala_id | INTEGER | NOT NULL, FK → item_escala(id) | Item da escala |
| avaliado_id | INTEGER | NOT NULL, FK → usuario(id) | Quem foi avaliado |
| avaliador_id | INTEGER | NOT NULL, FK → usuario(id) | Quem avaliou |
| tipo | ENUM tipo_avaliado | NOT NULL | PREGADOR ou CANTOR |
| criterio_1 | INTEGER | NOT NULL, CHECK 1-5 | Critério 1 (estrelas) |
| criterio_2 | INTEGER | NOT NULL, CHECK 1-5 | Critério 2 (estrelas) |
| criterio_3 | INTEGER | NOT NULL, CHECK 1-5 | Critério 3 (estrelas) |
| criterio_4 | INTEGER | NOT NULL, CHECK 1-5 | Critério 4 (estrelas) |
| criterio_5 | INTEGER | NOT NULL, CHECK 1-5 | Critério 5 - Geral (estrelas) |
| comentario | TEXT | - | Comentário opcional |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de atualização |

**Enums:**

**tipo_avaliado:**
- PREGADOR
- CANTOR

**Mapeamento de Critérios:**

**Para PREGADOR:**
1. Conteúdo Bíblico
2. Comunicação
3. Tempo
4. Impacto Espiritual
5. Avaliação Geral

**Para CANTOR:**
1. Técnica Vocal
2. Interpretação
3. Ministração
4. Apresentação
5. Avaliação Geral

**Constraints:**
- UNIQUE (item_escala_id, avaliado_id, avaliador_id)
- CHECK: avaliado_id != avaliador_id

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_avaliacao_item (item_escala_id)
- INDEX idx_avaliacao_avaliado (avaliado_id)
- INDEX idx_avaliacao_avaliador (avaliador_id)
- INDEX idx_avaliacao_tipo (tipo)

---

### 15. HISTORICO_SCORE

**Descrição:** Histórico de alterações de score.

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| usuario_id | INTEGER | NOT NULL, FK → usuario(id) | Pregador/Cantor |
| score_anterior | NUMERIC(5,2) | NOT NULL | Score antes da alteração |
| score_novo | NUMERIC(5,2) | NOT NULL | Score após a alteração |
| delta | NUMERIC(5,2) | NOT NULL | Diferença (score_novo - score_anterior) |
| motivo_tipo | ENUM motivo_score | NOT NULL | Tipo de motivo |
| referencia_id | INTEGER | - | ID de referência (avaliacao_id, penalidade_id, etc) |
| descricao | TEXT | NOT NULL | Descrição da alteração |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data da alteração |

**Enums:**

**motivo_score:**
- AVALIACAO
- PENALIDADE
- BONUS
- AJUSTE_MANUAL

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_historico_score_usuario (usuario_id)
- INDEX idx_historico_score_data (created_at)
- INDEX idx_historico_score_motivo (motivo_tipo)
- INDEX idx_historico_score_recente (usuario_id, created_at DESC) INCLUDE (score_novo, delta)

---

### 16. PENALIDADE

**Descrição:** Penalidades aplicadas a pregadores/cantores.

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| usuario_id | INTEGER | NOT NULL, FK → usuario(id) | Pregador/Cantor |
| pastor_id | INTEGER | NOT NULL, FK → usuario(id) | Pastor que aplicou |
| tipo | ENUM tipo_penalidade | NOT NULL | Tipo de penalidade |
| valor_subtracao | NUMERIC(5,2) | NOT NULL, CHECK > 0 | Pontos a subtrair |
| motivo | TEXT | NOT NULL | Motivo da penalidade |
| data_aplicacao | DATE | NOT NULL, DEFAULT CURRENT_DATE | Data de aplicação |
| data_validade | DATE | - | Data de validade (opcional) |
| item_escala_id | INTEGER | FK → item_escala(id) | Item relacionado |
| ativa | BOOLEAN | DEFAULT TRUE | Se está ativa |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |

**Enums:**

**tipo_penalidade:**
- FALTA_SEM_AVISO
- DESMARCACAO_SEM_TROCA
- DESMARCACAO_48H
- ATRASO
- CUSTOM

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_penalidade_usuario (usuario_id)
- INDEX idx_penalidade_pastor (pastor_id)
- INDEX idx_penalidade_ativa (usuario_id, ativa) WHERE ativa = TRUE
- INDEX idx_penalidade_item (item_escala_id)

---

### 17. HISTORICO_TROCA_ESCALA (NOVO)

**Descrição:** Histórico completo de trocas de escala.

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| usuario_id | INTEGER | NOT NULL, FK → usuario(id) | Usuário que executou ação |
| item_escala_original_id | INTEGER | FK → item_escala(id) | Item original |
| item_escala_novo_id | INTEGER | FK → item_escala(id) | Novo item (se troca) |
| tipo_acao | ENUM tipo_acao_troca | NOT NULL | Tipo de ação |
| outro_usuario_id | INTEGER | FK → usuario(id) | Outro usuário envolvido |
| timestamp | TIMESTAMP | NOT NULL, DEFAULT NOW() | Timestamp da ação |
| motivo | TEXT | - | Motivo da troca |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |

**Enums:**

**tipo_acao_troca:**
- SOLICITOU_TROCA
- ACEITOU_TROCA
- RECUSOU_TROCA
- SUBSTITUICAO_EMERGENCIAL

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_historico_troca_usuario (usuario_id)
- INDEX idx_historico_troca_outro_usuario (outro_usuario_id)
- INDEX idx_historico_troca_data (timestamp)
- INDEX idx_historico_troca_tipo (tipo_acao)

---

### 18. HISTORICO_SUBSTITUICAO_EMERGENCIAL (NOVO)

**Descrição:** Histórico detalhado de substituições emergenciais (para bônus de +5 pontos).

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| usuario_id | INTEGER | NOT NULL, FK → usuario(id) | Quem aceitou substituir |
| item_escala_id | INTEGER | NOT NULL, FK → item_escala(id) | Item da escala |
| usuario_substituido_id | INTEGER | NOT NULL, FK → usuario(id) | Quem foi substituído |
| igreja_id | INTEGER | NOT NULL, FK → igreja(id) | Igreja |
| data_culto | DATE | NOT NULL | Data do culto |
| horario_aceitacao | TIMESTAMP | NOT NULL, DEFAULT NOW() | Horário exato da aceitação |
| motivo_emergencia | TEXT | NOT NULL | Motivo da emergência |
| pontos_ganhos | NUMERIC(5,2) | DEFAULT 5.00 | Pontos de bônus |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_subst_emerg_usuario (usuario_id)
- INDEX idx_subst_emerg_substituido (usuario_substituido_id)
- INDEX idx_subst_emerg_item (item_escala_id)
- INDEX idx_subst_emerg_data (data_culto)

---

### 19. NOTIFICACAO

**Descrição:** Notificações enviadas aos usuários.

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| usuario_id | INTEGER | NOT NULL, FK → usuario(id) | Destinatário |
| tipo | ENUM tipo_notificacao | NOT NULL | Tipo de notificação |
| titulo | VARCHAR(255) | NOT NULL | Título da notificação |
| mensagem | TEXT | NOT NULL | Mensagem |
| link | TEXT | - | Link relacionado |
| lida | BOOLEAN | DEFAULT FALSE | Se foi lida |
| enviada_email | BOOLEAN | DEFAULT FALSE | Se foi enviada por email |
| enviada_sms | BOOLEAN | DEFAULT FALSE | Se foi enviada por SMS |
| enviada_whatsapp | BOOLEAN | DEFAULT FALSE | Se foi enviada por WhatsApp |
| data_envio_email | TIMESTAMP | - | Data de envio email |
| data_envio_sms | TIMESTAMP | - | Data de envio SMS |
| data_envio_whatsapp | TIMESTAMP | - | Data de envio WhatsApp |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data de criação |

**Enums:**

**tipo_notificacao:**
- ESCALA_PUBLICADA
- LEMBRETE_7D
- LEMBRETE_3D
- LEMBRETE_24H
- CONFIRMACAO
- TROCA
- AVALIACAO
- PENALIDADE (não enviada - apenas registro)
- AUTO_CADASTRO_APROVADO
- AUTO_CADASTRO_RECUSADO

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_notificacao_usuario (usuario_id)
- INDEX idx_notificacao_tipo (tipo)
- INDEX idx_notificacao_lida (usuario_id, lida) WHERE lida = FALSE
- INDEX idx_notificacao_data (created_at)

---

### 20. LOG_NOTIFICACAO

**Descrição:** Log de tentativas de envio de notificações.

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|------------|-----------|
| id | SERIAL | PK, NOT NULL | ID autoincremental |
| notificacao_id | INTEGER | NOT NULL, FK → notificacao(id) | Notificação |
| canal | ENUM canal_notificacao | NOT NULL | Canal de envio |
| status | ENUM status_envio | NOT NULL | Status do envio |
| erro_mensagem | TEXT | - | Mensagem de erro |
| tentativas | INTEGER | DEFAULT 1 | Número de tentativas |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data da tentativa |

**Enums:**

**canal_notificacao:**
- EMAIL
- SMS
- WHATSAPP

**status_envio:**
- ENVIADO
- FALHA
- PENDENTE

**Índices:**
- PRIMARY KEY (id)
- INDEX idx_log_notificacao (notificacao_id)
- INDEX idx_log_canal (canal)
- INDEX idx_log_status (status)

---

## RELACIONAMENTOS PRINCIPAIS

### 1. Hierarquia Organizacional
```
ORGANIZACAO (1:N) DISTRITO (1:N) IGREJA (1:N) MEMBRO
```

### 2. Gestão de Usuários
```
DISTRITO (1:1) PASTOR_DISTRITAL
DISTRITO (0:1) LIDER_DISTRITAL
DISTRITO (1:N) PREGADOR
DISTRITO (1:N) CANTOR
IGREJA (1:N) MEMBRO
```

### 3. Escala e Itens
```
DISTRITO (1:N) ESCALA (1:N) ITEM_ESCALA
ITEM_ESCALA (N:1) IGREJA
ITEM_ESCALA (N:0..1) PREGADOR
ITEM_ESCALA (N:0..1) CANTOR
ITEM_ESCALA (N:0..1) TEMA
```

### 4. Avaliações
```
ITEM_ESCALA (1:N) AVALIACAO
AVALIACAO (N:1) AVALIADO (USUARIO)
AVALIACAO (N:1) AVALIADOR (USUARIO)
AVALIACAO → recalcula SCORE do AVALIADO
```

### 5. Trocas e Substituições
```
ITEM_ESCALA (1:N) SOLICITACAO_TROCA
SOLICITACAO_TROCA → gera HISTORICO_TROCA_ESCALA
SUBSTITUICAO_EMERGENCIAL → gera HISTORICO_SUBSTITUICAO_EMERGENCIAL → bônus no SCORE
```

---

## REGRAS DE INTEGRIDADE

### 1. Validações de Domínio
- Email: formato válido
- CPF: 11 dígitos, formato XXX.XXX.XXX-XX
- Score: entre 0 e 100
- Datas: data_fim >= data_inicio
- Avaliações: critérios entre 1 e 5

### 2. Cascatas
- DELETE organizacao → CASCADE distrito
- DELETE distrito → CASCADE igreja, escala
- DELETE igreja → CASCADE horario_culto, item_escala
- DELETE escala → CASCADE item_escala
- DELETE item_escala → CASCADE avaliacao, historico_item_escala
- DELETE usuario → SET NULL em referências (pregador_id, cantor_id)
- DELETE usuario → CASCADE em tabelas próprias (indisponibilidade, historico_score)

### 3. Restrições de Negócio
- Pastor Distrital e Líder Distrital devem ser diferentes
- Membro deve ter igreja vinculada
- Pregador/Cantor deve ter distrito vinculado
- Avaliador não pode avaliar a si mesmo
- Solicitante e substituto devem ser diferentes
- Item de escala deve ter tema_id OU tema_customizado
- Penalidade deve ter valor > 0

---

**FIM DA PARTE 3 - MODELO DE DADOS**
