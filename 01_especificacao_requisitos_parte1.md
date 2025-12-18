# Sistema de Gerenciamento de Escalas de Pregação e Louvor

## Documentação Completa - Parte 1: Especificação e Requisitos

---

## 1. VISÃO GERAL DO SISTEMA

Sistema web e mobile para gerenciamento de escalas de pregação e louvor especial em uma organização religiosa com estrutura hierárquica (Organização → Distritos → Igrejas).

**Capacidade:** Suporte para ~100 usuários simultâneos

**Stack Tecnológica:**
- Backend: Python 3.12+ + FastAPI + SQLAlchemy
- Frontend Web: React 18+
- Mobile: React Native 0.72+
- Banco de Dados: PostgreSQL 15+
- Autenticação: JWT

---

## 2. ESTRUTURA ORGANIZACIONAL

```
ORGANIZAÇÃO
└── Administradores da Organização
    └── DISTRITOS (N distritos)
        ├── Pastor Distrital (1 por distrito)
        ├── Líder Distrital (0 ou 1 por distrito - mesmas permissões do Pastor)
        ├── IGREJAS (N igrejas por distrito)
        │   └── Membros (N membros por igreja)
        ├── Pregadores (N pregadores por distrito)
        └── Cantores (N cantores por distrito)
```

---

## 3. REQUISITOS FUNCIONAIS

### 3.1 GESTÃO DE USUÁRIOS E PERFIS

#### RF01 - Cadastro de Usuários

**Tipos de Usuário:**
1. Administrador da Organização
2. Pastor Distrital
3. Líder Distrital
4. Pregador
5. Cantor
6. Membro de Igreja

**Dados Comuns:**
- Nome completo
- Email (único)
- Telefone/WhatsApp
- CPF (único)
- Data de nascimento
- Senha (criptografada)
- Foto de perfil (opcional)
- Status (ativo/inativo)
- Data de cadastro

**Dados Específicos por Perfil:**

**Pregador/Cantor:**
- Score atual (calculado automaticamente)
- Histórico de score
- **Histórico de trocas de escala com outros pregadores/cantores**
- Igreja(s) de preferência (se configurado pelo distrito)
- Contador de participações no mês
- Contador de faltas
- Contador de desmarcações
- Penalidades ativas

**Pastor Distrital/Líder Distrital:**
- Distrito vinculado

**Membro:**
- Igreja vinculada

#### RF02 - Autenticação e Autorização

- Login com email e senha
- Recuperação de senha via email
- Token JWT com refresh token
- Controle de permissões por perfil
- Sessão única ou múltiplas sessões (configurável)
- Logout automático após inatividade (30 minutos)

#### RF03 - Gestão de Perfis

- Usuário pode editar seus próprios dados básicos
- Usuário pode alterar senha (com confirmação da senha atual)
- Pastor pode ativar/inativar pregadores e cantores
- Administrador pode gerenciar todos os usuários

---

### 3.2 ESTRUTURA ORGANIZACIONAL

#### RF04 - Gestão de Distritos

**Ações do Administrador:**
- Criar distrito (nome, descrição)
- Editar distrito
- Desativar distrito
- Atribuir Pastor Distrital
- Atribuir Líder Distrital (opcional)

**Dados do Distrito:**
- Nome
- Descrição
- Pastor Distrital
- Líder Distrital (opcional)
- Data de criação
- Status (ativo/inativo)

#### RF05 - Gestão de Igrejas

**Ações do Pastor Distrital:**
- Criar igreja no seu distrito
- Editar dados da igreja
- Desativar igreja
- Configurar horários de cultos
- Vincular membros à igreja
- **Atribuir Líder Distrital (opcional)**
- **Aprovar membros que realizaram auto cadastro no sistema**

**Dados da Igreja:**
- Nome
- Endereço completo
- Telefone
- Email
- Distrito vinculado
- Status (ativo/inativo)
- Configurações de horários de culto

**Fluxo de Auto Cadastro de Membros:**
1. Membro acessa sistema e se registra
2. Seleciona distrito e igreja
3. Status inicial: PENDENTE_APROVACAO
4. Pastor Distrital recebe notificação
5. Pastor aprova ou recusa
6. Se aprovado: Status → ATIVO e membro pode acessar

#### RF06 - Configuração de Horários de Cultos

**Pastor Distrital configura por igreja:**
- Dias da semana dos cultos (Sábado, Domingo, Quarta)
- Horários específicos por dia
- Múltiplos horários no mesmo dia (se necessário)
- **Pode aplicar configuração para TODAS as igrejas do distrito simultaneamente**

**Exemplo de Configuração:**
```
Igreja Central:
- Sábado: 09:00, 19:00
- Domingo: 19:00
- Quarta: 20:00
```

**Exemplo de Configuração em Lote:**
```
Pastor seleciona: "Aplicar para todas as igrejas"
Configuração:
- Sábado: 09:00
- Domingo: 19:00
- Quarta: 20:00

Sistema aplica para todas as igrejas ativas do distrito
```

---

### 3.3 SISTEMA DE TEMAS E TEMÁTICAS

#### RF07 - Cadastro de Temas pela Organização

**Administrador cadastra temas com recorrência:**

**Tipos de Recorrência:**

1. **Semanal Específica do Mês**
   - Ex: "Todo segundo sábado do mês - Mordomia Cristã"
   - Ex: "Toda última quarta do mês - Lar e Família"

2. **Período Específico (Data/Semana)**
   - Ex: "Semana Santa - 13/04/2025 a 20/04/2025"
   - Ex: "Natal - 25/12/2025"

3. **Anual Recorrente**
   - Ex: "Dia das Mães - Segundo domingo de maio"

**Dados do Tema:**
- Título
- Descrição/Sugestão de abordagem
- Tipo de recorrência
- Configuração da recorrência (dia/semana/mês)
- Status (ativo/inativo)
- Ano de aplicação (para temas únicos)

#### RF08 - Visualização de Temas

- Pastor visualiza calendário com temas aplicados
- Temas aparecem automaticamente ao gerar escala
- Pastor pode sobrescrever tema sugerido em casos específicos

---

### 3.4 SISTEMA DE SCORE E AVALIAÇÕES

#### RF09 - Cálculo do Score

**Composição do Score (0 a 100 pontos):**

**Base de Cálculo:**
- Média das avaliações recebidas × 20 (0-100 pontos)
- Exemplo: Média 4.5 estrelas = 90 pontos

**Penalidades (Subtração):**
- Falta sem comunicado prévio: -15 pontos
- Desmarcação sem troca: -10 pontos
- Desmarcação com menos de 48h: -5 pontos
- Atraso não comunicado: -3 pontos

**Bônus (Adição):**
- **Substituição emergencial (menos de 48h): +5 pontos** *(mantém histórico detalhado)*
- Sequência de 5 avaliações 5 estrelas: +3 pontos

**Histórico de Substituições Emergenciais:**
- Data da substituição
- Igreja
- Pregador/Cantor substituído
- Motivo
- Pontos ganhos
- Horário da aceitação (timestamp completo)

**Regras:**
- Score mínimo: 0
- Score máximo: 100
- Score inicial de novos pregadores/cantores: 70 pontos
- Recálculo após cada avaliação ou penalidade
- Histórico de score mantido

**Classificação por Score:**
- **Score Alto:** 80-100 (Prioridade em sábados)
- **Score Intermediário:** 50-79 (Domingos e quartas)
- **Score Baixo:** 0-49 (Suplente, necessita aprovação do Pastor)

#### RF10 - Sistema de Avaliações

**Critérios de Avaliação (Sugestões):**

**Para Pregadores:**

1. **Conteúdo Bíblico** (1-5 estrelas)
   - Fundamentação bíblica
   - Clareza da mensagem
   - Aplicação prática

2. **Comunicação** (1-5 estrelas)
   - Dicção e clareza
   - Gesticulação adequada
   - Contato visual

3. **Tempo** (1-5 estrelas)
   - Respeito ao horário
   - Ritmo adequado
   - Conclusão objetiva

4. **Impacto Espiritual** (1-5 estrelas)
   - Edificação
   - Conexão com o público
   - Ministração efetiva

5. **Avaliação Geral** (1-5 estrelas)
   - Impressão geral da pregação

**Para Cantores:**

1. **Técnica Vocal** (1-5 estrelas)
   - Afinação
   - Controle de voz
   - Projeção

2. **Interpretação** (1-5 estrelas)
   - Expressividade
   - Conexão com a letra
   - Emoção transmitida

3. **Ministração** (1-5 estrelas)
   - Adoração genuína
   - Reverência
   - Impacto espiritual

4. **Apresentação** (1-5 estrelas)
   - Postura
   - Vestuário adequado
   - Presença de palco

5. **Avaliação Geral** (1-5 estrelas)
   - Impressão geral do louvor

**Regras de Avaliação:**
- Membro só avalia pregador/cantor da sua própria igreja
- Membro só avalia após o culto ter ocorrido
- **Prazo para avaliar: CONFIGURÁVEL pelo Pastor Distrital (padrão: 7 dias)**
- Pregador escalado não pode avaliar outros pregadores da mesma data
- Cantor escalado não pode avaliar outros cantores da mesma data
- Pregador pode avaliar cantor da mesma igreja/data e vice-versa
- Não pode autoavaliação
- Uma avaliação por membro por pregador/cantor por culto
- Avaliação é anônima para o avaliado
- Pastor pode visualizar quem avaliou

#### RF11 - Penalidades Manuais

**Pastor Distrital pode aplicar:**
- Penalidade personalizada com motivo
- Valor de subtração do score
- Data de validade da penalidade
- Observações internas

---

### 3.5 CONFIGURAÇÕES DO DISTRITO

#### RF12 - Configurações de Escala

**Pastor Distrital configura:**

**Recorrência Máxima:**
- Quantidade máxima de pregações/louvor por pregador/cantor no mês
- Exemplo: "Máximo 3 pregações por mês"
- Padrão sugerido: 3 vezes/mês

**Intervalo Mínimo:**
- Dias mínimos entre pregações do mesmo pregador
- Exemplo: "Mínimo 7 dias entre pregações"
- Padrão sugerido: 7 dias

**Sistema de Preferências:**
- Habilitar/Desabilitar preferência por igreja
- Se habilitado: pregadores marcam até 3 igrejas preferidas
- **Sistema prioriza preferências quando habilitado E possível** (não obrigatório)

**Prazo de Avaliação:**
- Configurável por distrito
- Padrão sugerido: 7 dias após o culto
- Pode ser ajustado conforme necessidade (1-30 dias)

**Confirmação Obrigatória:**
- Exigir confirmação do pregador/cantor (Sim/Não)
- Prazo para confirmação (padrão: 48h)

**Substituições:**
- Permitir troca entre pregadores/cantores
- Exigir aprovação do Pastor para trocas (Sim/Não)

---

### 3.6 GERAÇÃO AUTOMÁTICA DE ESCALA

#### RF13 - Algoritmo de Geração de Escala

**Input:**
- Mês/Ano selecionado
- **Distrito: automaticamente do usuário logado (Pastor Distrital ou Líder Distrital)**

**Processo:**

**PASSO 1: Levantamento de Cultos**
- Listar todas as igrejas ativas do distrito
- Para cada igreja, identificar dias de culto no mês
- Aplicar temas automaticamente conforme recorrência
- Gerar lista de [Data, Horário, Igreja, Tema]

**PASSO 2: Levantamento de Disponibilidade**
- Listar pregadores ativos do distrito
- Listar cantores ativos do distrito
- Remover indisponibilidades marcadas
- Verificar contador de participações no mês

**PASSO 3: Ordenação e Priorização**

**Para Pregadores:**
```
SÁBADOS (maior prioridade):
1. Filtrar pregadores com score ALTO (80-100)
2. Ordenar por: score DESC, participações no mês ASC, última participação ASC
3. Atribuir aos sábados

DOMINGOS (média prioridade):
1. Se sobrarem pregadores de score ALTO, usar
2. Senão, usar pregadores de score INTERMEDIÁRIO (50-79)
3. Ordenar por: score DESC, participações no mês ASC, última participação ASC
4. Atribuir aos domingos

QUARTAS (menor prioridade):
1. Mesmo critério dos domingos
2. Atribuir às quartas
```

**Para Cantores:**
```
MESMA LÓGICA dos pregadores
Diferença: Nem todas as igrejas precisam ter cantor
Priorizar igrejas maiores ou conforme configuração do Pastor
```

**PASSO 4: Validações e Ajustes**
- Verificar se alguma igreja ficou sem pregador (OBRIGATÓRIO ter pregador)
- Respeitar recorrência máxima configurada
- Respeitar intervalo mínimo entre participações
- Priorizar preferências de igreja (se habilitado)
- Distribuir equitativamente ao longo do mês

**PASSO 5: Apresentação para Aprovação**
- Gerar escala completa
- Exibir para Pastor Distrital
- Permitir ajustes manuais

#### RF14 - Ajustes Manuais na Escala

**Pastor pode:**
- Mover pregador/cantor para outra data
- Trocar pregador/cantor entre igrejas
- **Remover pregador/cantor (deixar vago) - PERMITIDO com confirmação**
- Adicionar pregador/cantor manualmente
- Alterar tema do culto

**Validações:**
- Sistema alerta se pregador ultrapassar recorrência máxima
- Sistema alerta se intervalo mínimo não for respeitado
- Sistema alerta se pregador estiver indisponível
- **Sistema impede deixar igreja sem pregador, EXCETO se Pastor explicitamente removeu pregador/cantor (deixou vago intencionalmente)**

**Fluxo de Remoção Intencional:**
```
Pastor clica em "Remover Pregador"
↓
Sistema exibe modal de confirmação:
"⚠️ Atenção: Esta igreja ficará sem pregador escalado.
Tem certeza que deseja remover?
□ Confirmo que quero deixar esta posição vaga"
↓
Pastor confirma
↓
Pregador removido, posição fica vaga
↓
Sistema NÃO bloqueia publicação da escala
```

#### RF15 - Aprovação e Publicação da Escala

**Após ajustes:**
- Pastor clica em "Aprovar e Publicar Escala"
- Sistema valida todas as regras
- Se válida, salva escala
- Dispara notificações imediatas para todos escalados
- Altera status da escala para "PUBLICADA"

---

### 3.7 GESTÃO DE INDISPONIBILIDADES

#### RF16 - Marcação de Indisponibilidade

**Pregador/Cantor pode:**
- Marcar datas específicas como indisponível
- Marcar período (data início - data fim)
- Informar motivo (opcional)
- Marcar como "Férias", "Viagem", "Compromisso", "Saúde", "Outro"

**Regras:**
- Pode marcar indisponibilidade futura a qualquer momento
- Para datas próximas (menos de 7 dias), notifica Pastor automaticamente
- Indisponibilidade não conta como penalidade

#### RF17 - Bloqueio Temporário pelo Pastor

**Pastor pode:**
- Bloquear pregador/cantor temporariamente
- Definir período do bloqueio
- Informar motivo (obrigatório)
- Bloqueio não aparece para o pregador/cantor (confidencial)

---

### 3.8 SISTEMA DE NOTIFICAÇÕES

#### RF18 - Notificações por Email

**Gatilhos:**
1. Escala publicada (imediato)
2. Lembrete 7 dias antes
3. Lembrete 3 dias antes
4. Lembrete 24 horas antes
5. Confirmação de presença recebida
6. Solicitação de troca recebida
7. Avaliação recebida
8. **Penalidade aplicada - CONFIDENCIAL (pregador NÃO é notificado por email)**

**Sobre Penalidades:**
- Penalidades são registradas no sistema
- Pregador vê impacto no score através do dashboard
- Não há notificação explícita "Você foi penalizado"
- Pastor pode adicionar observação interna (não visível ao pregador)

**Conteúdo do Email (Escala Publicada):**
```
Assunto: Você foi escalado para [Pregar/Cantar] - [Data]

Olá [Nome],

Você foi escalado para [PREGAR/LOUVOR ESPECIAL]:

📅 Data: [Dia da semana], [DD/MM/AAAA]
🕐 Horário: [HH:MM]
⛪ Igreja: [Nome da Igreja]
📍 Endereço: [Endereço completo]
📖 Tema Sugerido: [Tema] (se houver)

[Se houver confirmação obrigatória]
⚠️ Por favor, confirme sua presença até [data] através do link:
[Link de confirmação]

Em caso de impossibilidade, solicite uma troca com urgência através do sistema.

Acesse o sistema: [Link]

Deus abençoe!
```

#### RF19 - Notificações por SMS

**Gatilhos:**
- Escala publicada (imediato)
- **Lembrete 7 dias antes**
- **Lembrete 3 dias antes**
- Lembrete 24 horas antes
- Troca aprovada

**Formato SMS:**
```
[ORGANIZAÇÃO] Você foi escalado para [PREGAR/CANTAR] em [DATA] às [HORA] na [IGREJA]. Confirme em: [link curto]
```

#### RF20 - Notificações por WhatsApp

**Integração sugerida:**
- WhatsApp Business API (oficial, pago)
- Alternativa: Twilio WhatsApp API
- Alternativa: Notificações apenas para grupos (não individual)

**Gatilhos:**
- **Mesmos do E-mail (exceto penalidade)**
- Escala publicada (imediato)
- Lembrete 7 dias antes
- Lembrete 3 dias antes
- Lembrete 24 horas antes
- Confirmação de presença recebida
- Solicitação de troca recebida
- Avaliação recebida

#### RF21 - Central de Notificações no Sistema

**Inbox interno:**
- Todas as notificações ficam registradas
- Status: Lida/Não lida
- Acesso via ícone de sino
- Histórico completo

---

### 3.9 GESTÃO DE TROCAS E SUBSTITUIÇÕES

#### RF22 - Solicitação de Troca

**Pregador/Cantor escalado pode:**
- Solicitar troca com outro pregador/cantor disponível
- Sistema mostra lista de pregadores/cantores disponíveis na data
- Pregador/Cantor seleciona com quem quer trocar
- Informa motivo da troca
- Envia solicitação

**Fluxo:**
1. Pregador A solicita troca com Pregador B
2. Sistema notifica Pregador B
3. Pregador B aceita ou recusa
4. Se aceitar:
   - Se configurado "Exige aprovação do Pastor": notifica Pastor
   - Se não exige: efetua troca automaticamente
5. Pastor aprova ou recusa
6. Se aprovado: efetua troca e notifica ambos

**Regras:**
- Troca com menos de 48h aplica penalidade leve (-5 pontos) se não for emergência
- Troca emergencial (motivo de saúde/força maior) não penaliza

#### RF23 - Substituição de Última Hora

**Pastor pode:**
- Substituir pregador/cantor mesmo após publicação
- Sistema mostra pregadores/cantores disponíveis por score
- Notifica ambos (substituído e substituto)
- Registra motivo

**Bônus:**
- Substituto que aceita com menos de 48h ganha +5 pontos

---

### 3.10 RELATÓRIOS E DASHBOARDS

#### RF24 - Dashboard do Administrador

**Visão Consolidada:**
- Total de distritos, igrejas, pregadores, cantores
- Escalas do mês por distrito
- Gráfico de participações por distrito
- **Top 50 pregadores por score (organizacional)**
- **Top 50 cantores por score (organizacional)**
- Taxa de avaliação (% de cultos avaliados)
- Taxa de comparecimento (% sem faltas)

**Visualização Top 50:**
```
Ranking de Pregadores (Top 50)
Pos | Nome              | Distrito      | Score | Participações
1   | João Silva        | Distrito Sul  | 98.5  | 145
2   | Maria Santos      | Distrito Norte| 97.2  | 132
...
50  | Pedro Costa       | Distrito Leste| 85.1  | 89
```

**Filtros:**
- Período (mês/ano)
- Distrito específico

#### RF25 - Dashboard do Pastor Distrital

**Visão do Distrito:**
- Total de igrejas, pregadores, cantores do distrito
- Escala do mês (calendário visual)
- Participações por pregador no mês
- Participações por cantor no mês
- Pregadores/Cantores com score em queda
- Cultos pendentes de aprovação
- Solicitações de troca pendentes
- Próximas indisponibilidades

**Gráficos:**
- Evolução do score médio do distrito
- Distribuição de participações por pregador
- Taxa de avaliação por igreja

#### RF26 - Dashboard do Pregador/Cantor

**Visão Pessoal:**
- Score atual e histórico (gráfico de linha)
- Próximas pregações/louvor
- Histórico de participações (lista)
- Média de avaliações recebidas
- Breakdown de avaliações por critério
- Contador de participações no mês/ano
- Penalidades ativas (se houver)

**Indicadores:**
- Total de pregações/louvor (geral)
- Streak de avaliações altas
- Igrejas em que já pregou/cantou

#### RF27 - Relatórios Exportáveis

**1. Escala Distrital Completa (PDF)**
- Todas as igrejas do distrito
- Mês completo
- Formato tabela ou calendário

**2. Escala Individual por Igreja (PDF)**
- Uma igreja específica
- Período selecionável
- Dados de contato de pregadores/cantores

**3. Relatório de Participações (Excel/CSV)**
- Lista de pregadores/cantores
- Quantidade de participações
- Score atual
- Média de avaliações
- Filtros: período, distrito, igreja

**4. Relatório de Avaliações (Excel/CSV)**
- Detalhamento de avaliações
- Por pregador/cantor
- Por igreja
- Por critério
- Filtros: período, score mínimo

**5. Relatório de Faltas e Penalidades (PDF/Excel)**
- Pregadores/Cantores com faltas
- Penalidades aplicadas
- Motivos
- Impacto no score

---

### 3.11 VISUALIZAÇÃO EM CALENDÁRIO

#### RF28 - Calendário para Pastor Distrital

**Visualização:**
- Calendário mensal completo
- Cada dia mostra cultos de todas as igrejas
- Código de cores por igreja
- Informações ao clicar:
  - Igreja
  - Horário
  - Pregador escalado
  - Cantor escalado (se houver)
  - Tema
  - Status (pendente/confirmado/realizado)

**Funcionalidades:**
- Navegação entre meses
- Filtro por igreja
- Legenda de cores
- Exportar mês como PDF

#### RF29 - Calendário para Pregador/Cantor

**Visualização:**
- Calendário mensal pessoal
- Dias escalados destacados
- Dias indisponíveis marcados
- Informações ao clicar:
  - Igreja
  - Horário
  - Tema
  - Status de confirmação
  - Botão "Solicitar Troca"

**Funcionalidades:**
- Marcar indisponibilidade direto do calendário
- Confirmar presença
- Ver rotas no Google Maps

---

### 3.12 CONFIRMAÇÃO DE PRESENÇA

#### RF30 - Sistema de Confirmação

**Se habilitado pelo Pastor:**
- Pregador/Cantor recebe notificação com prazo
- Prazo padrão: 48h após publicação da escala
- Status: Pendente / Confirmado / Não Confirmado

**Fluxo:**
1. Escala publicada
2. Notificação enviada com link de confirmação
3. Pregador/Cantor clica e confirma
4. Status atualizado
5. Pastor visualiza quem confirmou

**Alertas:**
- Pastor recebe alerta de não confirmações próximas ao prazo
- Após prazo vencido sem confirmação: alerta crítico
- Pastor pode substituir se não confirmar

---

## 4. REQUISITOS NÃO FUNCIONAIS

### RNF01 - Performance

- Tempo de resposta das APIs: < 500ms (95% das requisições)
- Geração de escala automática: < 5 segundos para distrito com 20 igrejas
- Suporte a 100 usuários simultâneos
- Caching de dados estáticos (temas, igrejas, usuários)

### RNF02 - Segurança

- Senhas criptografadas com bcrypt (salt rounds: 12)
- Tokens JWT com expiração (access: 1h, refresh: 7 dias)
- HTTPS obrigatório em produção
- Rate limiting nas APIs (100 req/min por IP)
- Logs de auditoria para ações críticas
- Proteção contra SQL Injection (via ORM)
- Proteção contra XSS
- **CORS configurado adequadamente para funcionar dinamicamente em ambiente local e de produção**

**Configuração CORS:**
```python
# Exemplo de configuração dinâmica
CORS_ORIGINS = {
    "development": [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000"
    ],
    "production": [
        "https://app.organizacao.com.br",
        "https://www.organizacao.com.br"
    ]
}
```

### RNF03 - Disponibilidade

- Uptime mínimo: 99.5%
- Backup diário automático do banco
- Backup incremental a cada 6 horas
- Retenção de backups: 30 dias

### RNF04 - Usabilidade

- Interface responsiva (mobile-first)
- Suporte a navegadores: Chrome, Firefox, Safari, Edge (2 últimas versões)
- Acessibilidade WCAG 2.1 nível AA
- Mensagens de erro claras e em português
- Loading indicators em operações longas

### RNF05 - Escalabilidade

- Arquitetura preparada para crescimento horizontal
- Banco de dados otimizado com índices adequados
- Paginação em listagens (20 itens por página)
- Lazy loading de imagens

### RNF06 - Manutenibilidade

- Código documentado (docstrings)
- Testes unitários (cobertura mínima: 70%)
- Testes de integração para fluxos críticos
- Versionamento semântico
- CI/CD configurado

### RNF07 - Compatibilidade

- App mobile: iOS 12+ e Android 8+
- Banco de dados: **PostgreSQL 15+**
- Python: **3.12+**
- Node.js (frontend): 18+
- React: 18+
- React Native: 0.72+

---

## 5. FLUXOS DO SISTEMA

### 5.1 Fluxo de Cadastro Inicial

```
1. Administrador cria Organização
2. Administrador cria Distrito
3. Administrador cria usuário Pastor Distrital
4. Administrador vincula Pastor ao Distrito
5. Pastor Distrital faz login
6. Pastor cadastra Igrejas do distrito
7. Pastor configura horários de culto por igreja
8. Pastor define configurações do distrito (recorrência, preferências, etc)
9. Pastor cadastra Pregadores
10. Pastor cadastra Cantores
11. Pastor cadastra Membros e vincula às igrejas
12. (Opcional) Pastor atribui Líder Distrital
13. Administrador cadastra Temas globais
```

### 5.2 Fluxo de Geração de Escala

```
┌─────────────────────────────────────────────────┐
│  PASTOR ACESSA MÓDULO DE ESCALAS                │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  SELECIONA: "GERAR NOVA ESCALA"                 │
│  - Escolhe Mês/Ano                              │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  SISTEMA EXECUTA ALGORITMO                      │
│  1. Levanta todos os cultos do mês              │
│  2. Aplica temas automaticamente                │
│  3. Levanta pregadores/cantores disponíveis     │
│  4. Calcula scores e ordenação                  │
│  5. Distribui por prioridade (Sáb>Dom>Qua)      │
│  6. Valida regras (recorrência, intervalo)      │
│  7. Considera preferências (se habilitado)      │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  APRESENTA ESCALA GERADA                        │
│  - Tabela/Calendário com todas as igrejas       │
│  - Status: RASCUNHO                             │
│  - Alertas de validação (se houver)             │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  PASTOR REVISA E AJUSTA                         │
│  - Move pregador/cantor                         │
│  - Troca entre igrejas                          │
│  - Altera tema                                  │
│  - Remove/Adiciona manualmente                  │
│  (Sistema valida cada ação)                     │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  PASTOR CLICA: "APROVAR E PUBLICAR"             │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  VALIDAÇÃO FINAL                                │
│  - Todas igrejas têm pregador? ✓                │
│  - Regras respeitadas? ✓                        │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  PUBLICAÇÃO                                     │
│  1. Status → PUBLICADA                          │
│  2. Gera notificações para todos escalados      │
│  3. Envia emails imediatamente                  │
│  4. Agenda lembretes (7d, 3d, 24h)              │
│  5. (Se configurado) Aguarda confirmações       │
└─────────────────────────────────────────────────┘
```

### 5.3 Fluxo de Avaliação

```
┌─────────────────────────────────────────────────┐
│  CULTO É REALIZADO                              │
│  - Data/hora do culto passa                     │
│  - Status do item_escala → REALIZADO            │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  NOTIFICAÇÃO PARA MEMBROS DA IGREJA             │
│  "Avalie a pregação/louvor de hoje"             │
│  (Email/Push no app)                            │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  MEMBRO ACESSA SISTEMA                          │
│  - Vê lista de cultos realizados (últimos Nd)   │
│  - Clica em "Avaliar"                           │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  VALIDAÇÕES                                     │
│  ✓ Membro pertence à igreja do culto?           │
│  ✓ Culto foi realizado?                         │
│  ✓ Está dentro do prazo? (config. dias)        │
│  ✓ Membro já avaliou este culto?                │
│  ✓ Membro estava escalado? (se sim, restrições)│
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  TELA DE AVALIAÇÃO                              │
│  - Nome do pregador/cantor                      │
│  - Data/Igreja                                  │
│  - 5 critérios (estrelas 1-5)                   │
│  - Campo de comentário opcional                 │
│  - Botão "Enviar Avaliação"                     │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  SALVA AVALIAÇÃO                                │
│  - Insere registro em AVALIACAO                 │
│  - Marca como avaliado                          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  RECALCULA SCORE                                │
│  1. Busca todas avaliações do usuário           │
│  2. Calcula média geral                         │
│  3. Aplica fórmula: média × 20                  │
│  4. Adiciona bônus (se aplicável)               │
│  5. Subtrai penalidades ativas                  │
│  6. Atualiza score_atual                        │
│  7. Registra em HISTORICO_SCORE                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  NOTIFICA AVALIADO                              │
│  "Você recebeu uma nova avaliação"              │
│  - Não mostra quem avaliou                      │
│  - Mostra média atualizada                      │
│  - Mostra novo score                            │
└─────────────────────────────────────────────────┘
```

### 5.4 Fluxo de Solicitação de Troca

```
┌─────────────────────────────────────────────────┐
│  PREGADOR/CANTOR ACESSA SUA ESCALA              │
│  - Visualiza pregações/louvor futuros           │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  CLICA EM "SOLICITAR TROCA"                     │
│  - Item específico da escala                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  SISTEMA MOSTRA CANDIDATOS                      │
│  - Pregadores/Cantores disponíveis na data      │
│  - Ordenados por score                          │
│  - Exclui bloqueados e indisponíveis            │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  SOLICITANTE SELECIONA SUBSTITUTO               │
│  - Informa motivo da troca                      │
│  - Clica em "Enviar Solicitação"                │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  CRIA SOLICITACAO_TROCA                         │
│  - Status: PENDENTE_SUBSTITUTO                  │
│  - Notifica substituto                          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  SUBSTITUTO VISUALIZA SOLICITAÇÃO               │
│  - Vê detalhes (data, igreja, horário)          │
│  - Pode ACEITAR ou RECUSAR                      │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
    RECUSA              ACEITA
        │                   │
        ▼                   ▼
┌───────────────┐   ┌───────────────────────┐
│ Notifica      │   │ Verifica configuração │
│ solicitante   │   │ do distrito           │
│ Status:       │   └───────┬───────────────┘
│ RECUSADA      │           │
└───────────────┘           │
                  ┌─────────┴─────────┐
                  │                   │
                  ▼                   ▼
        Exige Aprovação?     Não Exige?
                  │                   │
                  ▼                   ▼
        ┌──────────────────┐  ┌──────────────┐
        │ Status:          │  │ EFETUA TROCA │
        │ PENDENTE_PASTOR  │  │ Status:      │
        │ Notifica Pastor  │  │ APROVADA     │
        └────────┬─────────┘  │ Atualiza     │
                 │            │ item_escala  │
                 ▼            │ Notifica     │
        ┌──────────────────┐  │ ambos        │
        │ Pastor Analisa   │  └──────────────┘
        │ APROVAR/RECUSAR  │
        └────────┬─────────┘
                 │
       ┌─────────┴─────────┐
       │                   │
       ▼                   ▼
    APROVA             RECUSA
       │                   │
       ▼                   ▼
┌──────────────┐   ┌───────────────┐
│ EFETUA TROCA │   │ Status:       │
│ (igual acima)│   │ RECUSADA      │
└──────────────┘   │ Notifica ambos│
                   └───────────────┘
```

### 5.5 Fluxo de Confirmação de Presença

```
┌─────────────────────────────────────────────────┐
│  ESCALA É PUBLICADA                             │
│  (Se config_exige_confirmacao = true)           │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  NOTIFICAÇÃO COM LINK DE CONFIRMAÇÃO            │
│  - Email/SMS/WhatsApp                           │
│  - Prazo: config_prazo_confirmacao_horas        │
│  - Link único por item_escala                   │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  PREGADOR/CANTOR CLICA NO LINK                  │
│  - Redirecionado para tela de confirmação       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  TELA MOSTRA DETALHES                           │
│  - Data, horário, igreja                        │
│  - Botão: "CONFIRMAR PRESENÇA"                  │
│  - Botão: "NÃO POSSO COMPARECER"                │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
    CONFIRMA          NÃO CONFIRMA
        │                   │
        ▼                   ▼
┌───────────────┐   ┌───────────────────┐
│ Atualiza:     │   │ Abre fluxo de     │
│ status →      │   │ solicitação de    │
│ CONFIRMADO    │   │ troca             │
│               │   │ OU                │
│ data_         │   │ Notifica Pastor   │
│ confirmacao   │   │ (urgência)        │
└───────────────┘   └───────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────┐
│  NOTIFICA PASTOR                                │
│  - Status de confirmação atualizado             │
└─────────────────────────────────────────────────┘
```

**Monitoramento de Prazo:**
```
Job Agendado (executa a cada hora):
1. Busca itens_escala com status_confirmacao = PENDENTE
2. Verifica se prazo expirou
3. Se expirou:
   - Atualiza status → NAO_CONFIRMADO
   - Envia alerta CRÍTICO ao Pastor
   - Sugere pregadores/cantores disponíveis
4. Se faltam 6h para expirar:
   - Envia lembrete urgente
```

### 5.6 Fluxo de Penalidade por Falta

```
┌─────────────────────────────────────────────────┐
│  CULTO ACONTECE                                 │
│  - Pastor ou sistema marca presença             │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  PREGADOR/CANTOR FALTOU?                        │
└─────────────────┬───────────────────────────────┘
                  │
            SIM   │
                  ▼
┌─────────────────────────────────────────────────┐
│  PASTOR MARCA: "FALTA"                          │
│  - Seleciona tipo de falta                      │
│    □ Com aviso prévio (>48h)                    │
│    □ Sem aviso prévio                           │
│    □ Emergência/Força maior                     │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
   COM AVISO         SEM AVISO
   (não penaliza)    OU EMERGÊNCIA
        │                   │
        │                   ▼
        │         ┌─────────────────────┐
        │         │ APLICA PENALIDADE   │
        │         │ - Cria registro em  │
        │         │   PENALIDADE        │
        │         │ - Tipo: FALTA_SEM_  │
        │         │   AVISO             │
        │         │ - Valor: -15 pontos │
        │         └─────────┬───────────┘
        │                   │
        └─────────┬─────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  RECALCULA SCORE                                │
│  - score_atual -= valor_penalidade              │
│  - Registra em HISTORICO_SCORE                  │
│  - contador_faltas++                            │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  NÃO NOTIFICA PREGADOR/CANTOR                   │
│  - Penalidade é confidencial                    │
│  - Pregador vê apenas mudança no score          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  ATUALIZA STATUS item_escala                    │
│  - status_realizacao → FALTA_PREGADOR/CANTOR    │
└─────────────────────────────────────────────────┘
```

---

## 6. EXEMPLOS DE USO

### Exemplo 1: Geração Automática de Escala

**Cenário:**
- Distrito Sul com 5 igrejas
- 15 pregadores ativos
- Mês: Janeiro/2025
- Configuração: Máx 3 pregações/mês, intervalo 7 dias

**Resultado Esperado:**
```
Igreja Central:
- Sáb 04/01 09:00 - João Silva (Score: 95)
- Sáb 11/01 09:00 - Maria Santos (Score: 92)
- Sáb 18/01 09:00 - Pedro Costa (Score: 88)
- Sáb 25/01 09:00 - João Silva (Score: 95) [2ª vez]

Igreja Norte:
- Dom 05/01 19:00 - Ana Oliveira (Score: 85)
- Dom 12/01 19:00 - Carlos Lima (Score: 78)
...
```

### Exemplo 2: Solicitação de Troca Aprovada

**Cenário:**
- João escalado para 20/01 na Igreja Central
- João solicita troca com Maria (emergência familiar)
- Maria aceita
- Pastor aprova

**Timeline:**
```
18/01 10:00 - João solicita troca
18/01 11:30 - Maria aceita
18/01 14:00 - Pastor aprova
18/01 14:05 - Sistema atualiza escala
18/01 14:06 - João e Maria notificados
18/01 14:07 - João recebe +5 pontos (substituição emergencial)
```

---

## 7. REGRAS DE NEGÓCIO CONSOLIDADAS

### RN01 - Hierarquia de Scores em Dias
- **Sábados:** Apenas pregadores/cantores com score ALTO (80-100)
- **Domingos:** Score ALTO se disponível, senão INTERMEDIÁRIO (50-79)
- **Quartas:** Mesma lógica dos domingos

### RN02 - Obrigatoriedade de Pregador
- **Toda igreja DEVE ter pregador escalado**
- **Cantor é opcional**
- **Exceção:** Pastor pode deixar vaga intencionalmente

### RN03 - Recorrência Máxima
- Configurável por distrito
- Padrão: 3 participações/mês
- Sistema prioriza distribuição equitativa

### RN04 - Intervalo Mínimo
- Configurável por distrito
- Padrão: 7 dias entre participações da mesma pessoa
- Sistema evita escalar mesma pessoa em datas próximas

### RN05 - Cálculo de Score
```
Score Base = Média de Avaliações × 20
Score Final = Score Base + Bônus - Penalidades
Limite: 0 ≤ Score ≤ 100
```

### RN06 - Penalidades
| Tipo | Subtração |
|------|-----------|
| Falta sem aviso | -15 |
| Desmarcação sem troca | -10 |
| Desmarcação <48h | -5 |
| Atraso não comunicado | -3 |

### RN07 - Bônus
| Tipo | Adição |
|------|--------|
| Substituição emergencial (<48h) | +5 |
| 5 avaliações consecutivas 5★ | +3 |

### RN08 - Restrições de Avaliação
- Membro só avalia pregador/cantor da SUA igreja
- Apenas cultos JÁ realizados
- Prazo: configurável pelo Pastor (padrão 7 dias)
- Pregador escalado NÃO avalia outros pregadores da mesma data
- Cantor escalado NÃO avalia outros cantores da mesma data
- Pregador PODE avaliar cantor da mesma igreja/data (vice-versa)
- Proibida autoavaliação

### RN09 - Preferências de Igreja
- Recurso habilitável por distrito
- Pregador/Cantor marca até 3 igrejas preferidas
- Sistema prioriza quando possível, mas não garante

### RN10 - Indisponibilidade
- Não gera penalidade
- Pode ser marcada a qualquer momento
- Solicitação com <7 dias notifica Pastor automaticamente

### RN11 - Bloqueio Temporário
- Apenas Pastor pode aplicar
- Invisível para o bloqueado
- Impede escalação automática e manual

### RN12 - Trocas
- Permitidas entre pregadores ou cantores
- Substituto deve aceitar
- Pastor aprova (se configurado)
- Troca <48h pode gerar penalidade (-5) exceto emergências

### RN13 - Confirmação de Presença
- Obrigatória se habilitada pelo distrito
- Prazo configurável (padrão: 48h)
- Não confirmação no prazo = alerta crítico ao Pastor

---

**FIM DA PARTE 1 - ESPECIFICAÇÃO E REQUISITOS**
