# Modelo de Banco de Dados - Apostello

## 📊 Estrutura do Banco de Dados

### 🔑 Entidades Principais

#### 1. **Usuario** (Tabela: `usuarios`)
Armazena informações de autenticação e contato dos usuários do sistema.

**Campos:**
- `id` (PK): Identificador único
- `username`: Nome de usuário (único)
- `email`: Email (único)
- `senha_hash`: Senha criptografada
- `nome`: Primeiro nome
- `sobrenome`: Sobrenome
- `telefone`: Número de telefone
- `whatsapp`: Número do WhatsApp
- `ativo`: Se o usuário está ativo
- `criado_em`: Data de criação
- `atualizado_em`: Data de atualização

**Relacionamentos:**
- 1:1 com `Membro`
- 1:N com `Notificacao`

---

#### 2. **Distrito** (Tabela: `distritos`)
Representa uma região administrativa que contém várias igrejas.

**Campos:**
- `id` (PK): Identificador único
- `nome`: Nome do distrito
- `codigo`: Código único do distrito
- `descricao`: Descrição do distrito
- `criado_em`: Data de criação
- `atualizado_em`: Data de atualização

**Relacionamentos:**
- 1:N com `Igreja`

---

#### 3. **Igreja** (Tabela: `igrejas`)
Representa uma igreja dentro de um distrito.

**Campos:**
- `id` (PK): Identificador único
- `distrito_id` (FK): Referência ao distrito
- `nome`: Nome da igreja
- `endereco`: Endereço completo
- `cidade`: Cidade
- `estado`: Estado (UF - 2 caracteres)
- `telefone`: Telefone de contato
- `email`: Email da igreja
- `criado_em`: Data de criação
- `atualizado_em`: Data de atualização

**Relacionamentos:**
- N:1 com `Distrito`
- 1:N com `Membro`
- 1:N com `Escala`

---

#### 4. **Membro** (Tabela: `membros`)
Representa um membro de uma igreja.

**Campos:**
- `id` (PK): Identificador único
- `usuario_id` (FK): Referência ao usuário (único)
- `igreja_id` (FK): Referência à igreja
- `cargo`: Cargo do membro (PASTOR, LIDER, PREGADOR, MEMBRO)
- `criado_em`: Data de criação
- `atualizado_em`: Data de atualização

**Relacionamentos:**
- 1:1 com `Usuario`
- N:1 com `Igreja`
- 1:1 com `Pregador` (opcional)

---

#### 5. **Pregador** (Tabela: `pregadores`)
Representa um pregador (membro que prega). **ESSENCIAL PARA GERAÇÃO AUTOMÁTICA**.

**Campos:**
- `id` (PK): Identificador único
- `membro_id` (FK): Referência ao membro (único)
- `score`: **Score do pregador (0-100)** - usado para priorização automática
- `notas_disponibilidade`: Notas sobre disponibilidade
- `ativo`: Se está ativo para pregações
- `total_pregacoes`: Total de pregações realizadas
- `data_ultima_pregacao`: Data da última pregação
- `criado_em`: Data de criação
- `atualizado_em`: Data de atualização

**Relacionamentos:**
- 1:1 com `Membro`
- 1:N com `SlotEscala`

**Regra de Negócio:**
- Score maior = maior prioridade na geração automática
- Score atualizado baseado em: frequência, última pregação, feedback

---

#### 6. **Tema** (Tabela: `temas`)
Temáticas para pregações com sugestões automáticas.

**Campos:**
- `id` (PK): Identificador único
- `titulo`: Título do tema
- `descricao`: Descrição detalhada
- `referencias_biblicas`: Referências bíblicas
- `categoria`: Categoria do tema
- `nivel_dificuldade`: Nível de dificuldade (1-5)
- `ativo`: Se está ativo
- `criado_em`: Data de criação
- `atualizado_em`: Data de atualização

**Relacionamentos:**
- 1:N com `SlotEscala`

---

#### 7. **Escala** (Tabela: `escalas`)
Escala de pregação mensal. **NÚCLEO DO SISTEMA**.

**Campos:**
- `id` (PK): Identificador único
- `igreja_id` (FK): Referência à igreja
- `titulo`: Título da escala
- `mes`: Mês (1-12)
- `ano`: Ano
- `status`: Status (RASCUNHO, PUBLICADO, ENVIADO, CONCLUIDO)
- `gerada_automaticamente`: **Se foi gerada pelo algoritmo**
- `criado_em`: Data de criação
- `atualizado_em`: Data de atualização
- `publicado_em`: Data de publicação

**Relacionamentos:**
- N:1 com `Igreja`
- 1:N com `SlotEscala`
- 1:N com `GeracaoEscala`
- 1:N com `Notificacao`

**Constraint:**
- Unique: (igreja_id, mes, ano) - Uma escala por mês por igreja

---

#### 8. **SlotEscala** (Tabela: `slots_escala`)
Slot/vaga individual na escala (cada domingo).

**Campos:**
- `id` (PK): Identificador único
- `escala_id` (FK): Referência à escala
- `data`: Data da pregação
- `tipo_slot`: Tipo (PREGACAO, LOUVOR)
- `pregador_id` (FK): Referência ao pregador designado
- `tema_id` (FK): Referência ao tema sugerido
- `observacoes`: Observações
- `confirmado`: Se o pregador confirmou
- `criado_em`: Data de criação
- `atualizado_em`: Data de atualização

**Relacionamentos:**
- N:1 com `Escala`
- N:1 com `Pregador`
- N:1 com `Tema`
- 1:N com `Conflito`
- 1:N com `Notificacao`

**Constraint:**
- Unique: (escala_id, data, tipo_slot) - Um slot por data por tipo

---

#### 9. **Conflito** (Tabela: `conflitos`)
Conflitos detectados automaticamente durante a geração.

**Campos:**
- `id` (PK): Identificador único
- `slot_id` (FK): Referência ao slot
- `tipo_conflito`: Tipo (DATA_INDISPONIVEL, DUPLA_MARCACAO, PREGADOR_INATIVO, OUTRO)
- `descricao`: Descrição do conflito
- `resolvido`: Se foi resolvido
- `criado_em`: Data de criação
- `resolvido_em`: Data de resolução

**Relacionamentos:**
- N:1 com `SlotEscala`

---

#### 10. **GeracaoEscala** (Tabela: `geracoes_escala`)
Histórico de gerações automáticas. **RASTREABILIDADE E MÉTRICAS**.

**Campos:**
- `id` (PK): Identificador único
- `escala_id` (FK): Referência à escala
- `versao_algoritmo`: Versão do algoritmo usado
- `parametros`: JSON com parâmetros usados
- `conflitos_encontrados`: Número de conflitos
- `tempo_economizado_estimado`: **Tempo economizado em horas (vs manual)**
- `criado_em`: Data de geração

**Relacionamentos:**
- N:1 com `Escala`

**Regra de Negócio:**
- Calcula economia: tempo_manual (16h) - tempo_automatico (~1h) = ~15h (94%)

---

#### 11. **Notificacao** (Tabela: `notificacoes`)
Notificações enviadas aos usuários.

**Campos:**
- `id` (PK): Identificador único
- `usuario_id` (FK): Referência ao usuário
- `tipo_notificacao`: Tipo (ESCALA_PUBLICADA, SLOT_DESIGNADO, SLOT_ALTERADO, LEMBRETE, SUGESTAO_TEMA)
- `canal`: Canal (WHATSAPP, EMAIL, PUSH)
- `titulo`: Título da notificação
- `mensagem`: Texto da mensagem
- `status`: Status (PENDENTE, ENVIADA, FALHOU, LIDA)
- `escala_id` (FK): Referência à escala (opcional)
- `slot_id` (FK): Referência ao slot (opcional)
- `mensagem_erro`: Erro se falhou
- `criado_em`: Data de criação
- `enviado_em`: Data de envio
- `lido_em`: Data de leitura

**Relacionamentos:**
- N:1 com `Usuario`
- N:1 com `Escala` (opcional)
- N:1 com `SlotEscala` (opcional)
- 1:1 com `MensagemWhatsApp` (opcional)

---

#### 12. **MensagemWhatsApp** (Tabela: `mensagens_whatsapp`)
Rastreamento de mensagens WhatsApp via Twilio.

**Campos:**
- `id` (PK): Identificador único
- `notificacao_id` (FK): Referência à notificação (único)
- `numero_destino`: Número do destinatário
- `message_sid`: ID da mensagem no Twilio
- `status_twilio`: Status no Twilio
- `criado_em`: Data de criação
- `entregue_em`: Data de entrega

**Relacionamentos:**
- 1:1 com `Notificacao`

---

## 🔄 Fluxo do Sistema

### Geração Automática de Escala (Funcionalidade Principal)

```
1. POST /api/escalas/gerar
   ├─ Parâmetros: igreja_id, mes, ano, tipo_slot
   ├─ Busca pregadores ativos da igreja (ordenados por score DESC)
   ├─ Identifica todos os domingos do mês
   ├─ Distribui pregadores por score (maior score = prioridade)
   ├─ Atribui temas aleatoriamente/por preferência
   ├─ Detecta conflitos (dupla marcação, pregador inativo)
   ├─ Cria Escala + SlotEscala + GeracaoEscala
   └─ Retorna escala completa com tempo economizado (94%)

2. POST /api/escalas/{id}/publicar
   ├─ Atualiza status para PUBLICADO
   ├─ Para cada SlotEscala:
   │  ├─ Cria Notificacao (tipo: ESCALA_PUBLICADA, canal: WHATSAPP)
   │  ├─ Cria MensagemWhatsApp
   │  └─ Envia via Twilio API
   └─ Retorna escala publicada

3. GET /api/escalas/{id}/pdf
   ├─ Gera PDF com ReportLab
   ├─ Tabela de pregações
   ├─ Estatísticas
   └─ Retorna arquivo PDF
```

---

## 📈 Índices e Performance

**Índices criados automaticamente:**
- `usuarios.username` (unique)
- `usuarios.email` (unique)
- `distritos.codigo` (unique)
- `pregadores.score` (para ordenação rápida)
- `slots_escala.data` (para consultas por período)

---

## 🔒 Constraints

1. **Usuario**: username e email únicos
2. **Distrito**: codigo único
3. **Membro**: usuario_id único (1:1)
4. **Pregador**: membro_id único (1:1)
5. **Escala**: (igreja_id, mes, ano) únicos
6. **SlotEscala**: (escala_id, data, tipo_slot) únicos
7. **MensagemWhatsApp**: notificacao_id único (1:1)

---

## 💾 Exemplo de Dados

### Pregador
```json
{
  "id": 1,
  "score": 85,
  "total_pregacoes": 24,
  "data_ultima_pregacao": "2024-11-15",
  "ativo": true
}
```

### Escala Gerada
```json
{
  "id": 1,
  "titulo": "Escala de Dezembro 2024",
  "mes": 12,
  "ano": 2024,
  "gerada_automaticamente": true,
  "status": "PUBLICADO"
}
```

### Geração
```json
{
  "versao_algoritmo": "1.0",
  "conflitos_encontrados": 0,
  "tempo_economizado_estimado": 15.0
}
```

---

## ✅ Aprovação

Este modelo está pronto para aprovação. Ele suporta:

✅ Geração automática baseada em score  
✅ Notificações WhatsApp  
✅ PDF reports  
✅ Gestão de temas  
✅ Detecção de conflitos  
✅ Rastreamento de economia de tempo (94%)  
✅ Relacionamentos bem definidos  
✅ Constraints para integridade  

**Aguardando sua aprovação para prosseguir!**
