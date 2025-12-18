# Sistema de Gerenciamento de Escalas de Pregação e Louvor

## Documentação Completa - Parte 2: MVP e Wireframes

---

## 8. PRIORIZAÇÃO DE DESENVOLVIMENTO (MVP)

### FASE 1 - MVP Core (2-3 meses)

**Módulos Essenciais:**

1. **Autenticação e gestão de usuários**
   - Login/Logout com JWT
   - Recuperação de senha
   - CRUD de usuários
   - Perfis: Admin, Pastor, Pregador, Cantor, Membro
   - Autogestão de dados pessoais

2. **Estrutura organizacional (Distrito, Igreja)**
   - CRUD de Distritos
   - CRUD de Igrejas
   - Vinculação Pastor ↔ Distrito
   - Dashboard básico por perfil

3. **Cadastro de pregadores e cantores**
   - Formulário de cadastro
   - Campos básicos + score inicial (70)
   - Listagem com filtros
   - Ativação/Desativação

4. **Configuração de horários de cultos**
   - Interface para definir dias/horários por igreja
   - Aplicação em lote (todas as igrejas)
   - Validações básicas

5. **Geração automática de escala (algoritmo básico)**
   - Input: Mês/Ano
   - Algoritmo de distribuição por score
   - Priorização Sábado > Domingo > Quarta
   - Respeito à recorrência máxima (3x/mês)
   - Intervalo mínimo (7 dias)
   - Apresentação em tabela simples

6. **Ajustes manuais na escala**
   - Arrastar e soltar pregadores
   - Trocar entre igrejas
   - Adicionar/Remover manualmente
   - Alertas de validação

7. **Publicação e notificações por email**
   - Botão "Aprovar e Publicar"
   - Envio de email para escalados
   - Template básico de notificação
   - Link para sistema

8. **Visualização de escala (tabela simples)**
   - Listagem por igreja
   - Filtros: mês, igreja, pregador
   - Ordenação por data
   - Status visual (pendente/confirmado)

9. **Score básico (apenas média de avaliações)**
   - Cálculo: média × 20
   - Exibição no perfil
   - Sem bônus/penalidades complexas

**Entregas da Fase 1:**
- ✅ Sistema funcional para gerar e publicar escalas
- ✅ Notificações por email
- ✅ Score básico
- ✅ Interface web responsiva

---

### FASE 2 - Funcionalidades Complementares (1-2 meses)

10. **Sistema de avaliações completo**
    - Formulário de avaliação (5 critérios)
    - Validações de quem pode avaliar
    - Prazo configurável
    - Comentários opcionais
    - Histórico de avaliações

11. **Cálculo avançado de score (bônus/penalidades)**
    - Penalidades automáticas (faltas, atrasos)
    - Bônus por substituição emergencial
    - Streak de avaliações altas
    - Histórico completo de alterações

12. **Sistema de trocas**
    - Solicitação de troca
    - Aprovação do substituto
    - Aprovação do Pastor (se configurado)
    - Notificações de todas as etapas
    - Histórico de trocas

13. **Indisponibilidades**
    - Marcação de períodos
    - Tipos de motivo
    - Alertas ao Pastor (<7 dias)
    - Visualização no calendário

14. **Confirmação de presença**
    - Link único por escalação
    - Prazo configurável
    - Alertas de não confirmação
    - Dashboard de confirmações

15. **Calendário visual**
    - Visualização mensal
    - Cores por igreja
    - Clique para detalhes
    - Navegação entre meses
    - Exportar para PDF

16. **Relatórios básicos (PDF)**
    - Escala distrital completa
    - Escala por igreja
    - Relatório de participações
    - Exportação simples

**Entregas da Fase 2:**
- ✅ Sistema de avaliações funcionando
- ✅ Gerenciamento de trocas e indisponibilidades
- ✅ Score com bônus/penalidades
- ✅ Calendário visual
- ✅ Relatórios em PDF

---

### FASE 3 - Recursos Avançados (1-2 meses)

17. **Temas organizacionais com recorrência**
    - CRUD de temas
    - Tipos de recorrência (semanal, período, anual)
    - Aplicação automática na escala
    - Sobrescrita pelo Pastor

18. **Preferências de igreja**
    - Configuração habilitável
    - Pregador marca 3 preferidas
    - Algoritmo considera preferências
    - Dashboard de preferências

19. **Bloqueio temporário**
    - Pastor bloqueia pregador/cantor
    - Período definido
    - Invisível ao bloqueado
    - Histórico de bloqueios

20. **Dashboard completo**
    - Gráficos de participação
    - Evolução de score
    - KPIs por distrito
    - Ranking top 50
    - Filtros avançados

21. **Notificações SMS/WhatsApp**
    - Integração com Twilio
    - Mesmos gatilhos do email
    - Formato otimizado
    - Log de envios

22. **App Mobile (React Native)**
    - Login e recuperação de senha
    - Visualização de escala pessoal
    - Calendário
    - Marcar indisponibilidade
    - Solicitar troca
    - Confirmar presença
    - Ver avaliações
    - Push notifications

23. **Relatórios avançados (Excel, gráficos)**
    - Exportação para Excel/CSV
    - Gráficos de participação
    - Análise por período
    - Comparativos entre distritos
    - Detalhamento de avaliações

**Entregas da Fase 3:**
- ✅ Temas automáticos
- ✅ Preferências e bloqueios
- ✅ Dashboard rico
- ✅ App mobile completo
- ✅ Notificações multi-canal
- ✅ Relatórios avançados

---

### FASE 4 - Otimizações e Extras (ongoing)

24. **Performance e caching**
    - Redis para cache
    - Otimização de queries
    - Índices adicionais
    - CDN para assets
    - Compressão de responses

25. **Testes automatizados**
    - Testes unitários (70% cobertura)
    - Testes de integração
    - Testes E2E (Cypress)
    - CI/CD pipeline

26. **Logs de auditoria**
    - Registro de todas ações críticas
    - Quem fez, quando, o quê
    - Visualização de logs
    - Exportação para análise

27. **Backup automático**
    - Backup diário
    - Backup incremental (6h)
    - Retenção 30 dias
    - Testes de restore
    - Documentação de recovery

28. **Monitoramento**
    - APM (Application Performance Monitoring)
    - Alertas de erro
    - Dashboard de saúde
    - Logs centralizados
    - Métricas de uso

**Entregas da Fase 4:**
- ✅ Sistema otimizado
- ✅ Testes automatizados
- ✅ Auditoria completa
- ✅ Backups confiáveis
- ✅ Monitoramento proativo

---

## 9. WIREFRAMES E INTERFACES (Descrição Textual)

### 9.1 Login

```
┌────────────────────────────────────┐
│         [LOGO ORGANIZAÇÃO]         │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ Email                        │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ Senha                        │ │
│  └──────────────────────────────┘ │
│                                    │
│  [ ] Lembrar-me                   │
│                                    │
│  ┌──────────────────────────────┐ │
│  │        ENTRAR                │ │
│  └──────────────────────────────┘ │
│                                    │
│  Esqueceu a senha?                │
│                                    │
│  Novo por aqui? Cadastre-se       │
└────────────────────────────────────┘
```

**Elementos:**
- Logo centralizado no topo
- Campo de email (tipo email, obrigatório)
- Campo de senha (tipo password, obrigatório)
- Checkbox "Lembrar-me"
- Botão "ENTRAR" (primary, full-width)
- Link "Esqueceu a senha?"
- Link "Novo por aqui? Cadastre-se" (auto cadastro de membros)

---

### 9.2 Recuperação de Senha

```
┌────────────────────────────────────┐
│         [LOGO ORGANIZAÇÃO]         │
│                                    │
│  Recuperar Senha                   │
│  Digite seu email para receber     │
│  instruções de recuperação         │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ Email                        │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │    ENVIAR INSTRUÇÕES         │ │
│  └──────────────────────────────┘ │
│                                    │
│  ← Voltar para login              │
└────────────────────────────────────┘
```

---

### 9.3 Auto Cadastro de Membro

```
┌────────────────────────────────────┐
│    Cadastro de Novo Membro         │
├────────────────────────────────────┤
│                                    │
│  Dados Pessoais:                   │
│  ┌──────────────────────────────┐ │
│  │ Nome Completo *              │ │
│  └──────────────────────────────┘ │
│  ┌──────────────────────────────┐ │
│  │ Email *                      │ │
│  └──────────────────────────────┘ │
│  ┌──────────────────────────────┐ │
│  │ CPF *                        │ │
│  └──────────────────────────────┘ │
│  ┌──────────────────────────────┐ │
│  │ Telefone/WhatsApp *          │ │
│  └──────────────────────────────┘ │
│                                    │
│  Localização:                      │
│  ┌──────────────────────────────┐ │
│  │ Selecione o Distrito *       │ │
│  └──────────────────────────────┘ │
│  ┌──────────────────────────────┐ │
│  │ Selecione a Igreja *         │ │
│  └──────────────────────────────┘ │
│                                    │
│  Senha:                            │
│  ┌──────────────────────────────┐ │
│  │ Senha *                      │ │
│  └──────────────────────────────┘ │
│  ┌──────────────────────────────┐ │
│  │ Confirmar Senha *            │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │    SOLICITAR CADASTRO        │ │
│  └──────────────────────────────┘ │
│                                    │
│  Seu cadastro será analisado pelo │
│  Pastor Distrital                 │
└────────────────────────────────────┘
```

---

### 9.4 Dashboard Administrador

```
┌─────────────────────────────────────────────────────────────────┐
│ LOGO │ Dashboard │ Distritos │ Temas │ Usuários │ Relatórios │👤│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Bem-vindo, Administrador                                      │
│  Visão Geral da Organização                                    │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐│
│  │ Distritos   │ │ Igrejas     │ │ Pregadores  │ │ Cantores ││
│  │     8       │ │     45      │ │    320      │ │   180    ││
│  │  (+2 mês)   │ │  (+3 mês)   │ │  (+15 mês)  │ │ (+8 mês) ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘│
│                                                                 │
│  Escalas do Mês Atual (Janeiro/2025)                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Distrito Sul      ✓ Publicada  │ 18 cultos | 15 pregadores│ │
│  │ Distrito Norte    ✓ Publicada  │ 22 cultos | 18 pregadores│ │
│  │ Distrito Leste    ⚠ Rascunho   │ 15 cultos | 12 pregadores│ │
│  │ Distrito Oeste    ✓ Publicada  │ 20 cultos | 16 pregadores│ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─── Top 50 Pregadores ─────────┐ ┌─── Top 50 Cantores ────┐ │
│  │ 1. João Silva      | 98.5 ⭐  │ │ 1. Ana Costa   | 97.2 ⭐││
│  │ 2. Maria Santos    | 97.2 ⭐  │ │ 2. Carlos Lima | 95.8 ⭐││
│  │ 3. Pedro Costa     | 96.8 ⭐  │ │ 3. Julia Souza | 94.5 ⭐││
│  │ ...                           │ │ ...                     ││
│  │ 50. Marcos Alves   | 85.1 ⭐  │ │ 50. Rita Melo  | 82.3 ⭐││
│  │ [VER RANKING COMPLETO]        │ │ [VER RANKING COMPLETO]  ││
│  └───────────────────────────────┘ └─────────────────────────┘ │
│                                                                 │
│  ┌─── Gráfico: Participações por Distrito (Jan/2025) ────────┐ │
│  │        ████████  Sul (45)                                  │ │
│  │        ███████████  Norte (55)                             │ │
│  │        ██████  Leste (38)                                  │ │
│  │        ████████  Oeste (48)                                │ │
│  └─────────────────────────────────────────────────────────── ┘│
│                                                                 │
│  Taxa de Avaliação: 87% | Taxa de Comparecimento: 96%         │
└─────────────────────────────────────────────────────────────────┘
```

**Elementos:**
- Header com navegação principal
- Cards de métricas gerais
- Listagem de escalas por distrito
- Ranking top 50 (pregadores e cantores)
- Gráfico de participações
- KPIs de avaliação e comparecimento

---

### 9.5 Dashboard Pastor Distrital

```
┌─────────────────────────────────────────────────────────────────┐
│ LOGO │ Dashboard │ Escalas │ Igrejas │ Pregadores │ Membros │👤 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Bem-vindo, Pastor João Silva                                  │
│  Distrito: Distrito Sul                                        │
│                                                                 │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────────┐  │
│  │ Igrejas   │ │ Pregadores│ │ Cantores  │ │ Escala Atual │  │
│  │    15     │ │     42    │ │    28     │ │  ✓ Publicada │  │
│  └───────────┘ └───────────┘ └───────────┘ └──────────────┘  │
│                                                                 │
│  Próximos Cultos (7 dias)                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Sáb 20/12 09:00 │ Igreja Central    │ João Silva    ✓   │  │
│  │ Sáb 20/12 19:00 │ Igreja Norte      │ Maria Santos  ✓   │  │
│  │ Dom 21/12 19:00 │ Igreja Sul        │ Pedro Costa   ⏳  │  │
│  │ Qua 24/12 20:00 │ Igreja Leste      │ Ana Oliveira  ✓   │  │
│  │ [VER CALENDÁRIO COMPLETO]                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ⚠️ Pendências (4)                                             │
│  • 3 confirmações pendentes                                    │
│  • 1 solicitação de troca aguardando aprovação                │
│                                                                 │
│  Pregadores com Score em Queda                                 │
│  • Carlos Lima: 85 → 78 (-7 pontos)                           │
│  • Julia Souza: 92 → 87 (-5 pontos)                           │
│                                                                 │
│  ┌────────────────────────────────────────┐                   │
│  │   [+ GERAR NOVA ESCALA]                │                   │
│  └────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

**Elementos:**
- Header com navegação contextual
- Cards com totais do distrito
- Lista de próximos cultos
- Seção de pendências
- Alertas de score
- Botão destacado para gerar escala

---

### 9.6 Geração de Escala

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Voltar       Gerar Nova Escala - Distrito Sul                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PASSO 1: Selecionar Período                                   │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │ Mês: ▼ Fevereiro │  │ Ano: ▼ 2025     │                   │
│  └──────────────────┘  └──────────────────┘                   │
│                                                                 │
│  PASSO 2: Configurações                                        │
│  ☑ Considerar preferências de igreja                           │
│  ☑ Balancear equitativamente por score                         │
│  ☑ Respeitar intervalo mínimo (7 dias)                         │
│  ☑ Aplicar temas automáticos                                   │
│                                                                 │
│  ┌────────────────────────────────────────┐                   │
│  │   [GERAR ESCALA AUTOMATICAMENTE]       │                   │
│  └────────────────────────────────────────┘                   │
│                                                                 │
│  ─── Prévia da Escala Gerada ───────────────────────────────  │
│  Loading... ⏳                                                  │
│  (Após clicar, aparece a escala abaixo)                        │
│                                                                 │
│  ┌─ Igreja Central ──────────────────────────────────────────┐ │
│  │ Sáb 01/02 09:00 │ João Silva (⭐92)     │ [✏️ Editar]     │ │
│  │ Sáb 08/02 09:00 │ Maria Santos (⭐88)   │ [✏️ Editar]     │ │
│  │ Sáb 15/02 09:00 │ Pedro Costa (⭐85)    │ [✏️ Editar]     │ │
│  │ Sáb 22/02 09:00 │ João Silva (⭐92)     │ [✏️ Editar] 2ª │ │
│  │ Dom 02/02 19:00 │ Ana Oliveira (⭐78)   │ [✏️ Editar]     │ │
│  └─────────────────────────────────────────────────────────── ┘│
│                                                                 │
│  ┌─ Igreja Norte ────────────────────────────────────────────┐ │
│  │ Dom 02/02 19:00 │ Carlos Lima (⭐75)    │ [✏️ Editar]     │ │
│  │ Dom 09/02 19:00 │ Rita Melo (⭐72)      │ [✏️ Editar]     │ │
│  │ ...                                                         │ │
│  └─────────────────────────────────────────────────────────── ┘│
│                                                                 │
│  ⚠️ Alertas (1):                                               │
│  • Igreja Sul (Qua 19/02): Nenhum pregador disponível de      │
│    score alto. Sugestão: Usar Pedro Costa (score 85)          │
│                                                                 │
│  Total: 48 cultos | 15 pregadores escalados                    │
│                                                                 │
│  ┌───────────────────┐  ┌───────────────────────────────────┐ │
│  │ [CANCELAR]        │  │ [AJUSTAR MANUALMENTE]             │ │
│  └───────────────────┘  └───────────────────────────────────┘ │
│                          ┌───────────────────────────────────┐ │
│                          │ [✓ APROVAR E PUBLICAR ESCALA]     │ │
│                          └───────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Elementos:**
- Seleção de mês/ano
- Checkboxes de configurações
- Botão para gerar automaticamente
- Prévia agrupada por igreja
- Indicador de score ao lado de cada pregador
- Botões de ação em cada linha
- Alertas de validação
- Botões finais de cancelar/ajustar/aprovar

---

### 9.7 Ajuste Manual da Escala

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Voltar       Ajustar Escala - Fevereiro/2025                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Modal de Edição]                                             │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Editar Escalação                                        │   │
│  │                                                          │   │
│  │ Igreja: Igreja Central                                   │   │
│  │ Data: Sábado, 01/02/2025 às 09:00                       │   │
│  │ Tema: Mordomia Cristã                                    │   │
│  │                                                          │   │
│  │ Pregador Atual: João Silva (⭐92)                       │   │
│  │                                                          │   │
│  │ ┌──────────────────────────────────────────────────┐   │   │
│  │ │ 🔍 Buscar pregador...                            │   │   │
│  │ └──────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  │ Pregadores Disponíveis:                                 │   │
│  │ ○ Maria Santos (⭐88) - 0 participações no mês         │   │
│  │ ○ Pedro Costa (⭐85) - 1 participação no mês           │   │
│  │ ○ Ana Oliveira (⭐78) - 0 participações no mês         │   │
│  │ ○ [Deixar vaga] ⚠️                                      │   │
│  │                                                          │   │
│  │ Tema Customizado (opcional):                            │   │
│  │ ┌──────────────────────────────────────────────────┐   │   │
│  │ │                                                   │   │   │
│  │ └──────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  │ ┌────────────────┐  ┌────────────────────────────┐    │   │
│  │ │ [CANCELAR]     │  │ [SALVAR ALTERAÇÃO]         │    │   │
│  │ └────────────────┘  └────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Elementos:**
- Modal sobreposto
- Informações do culto
- Campo de busca de pregadores
- Lista de pregadores disponíveis com rádio buttons
- Indicadores de score e participações
- Opção "Deixar vaga" com alerta
- Campo de tema customizado
- Botões de ação

---

### 9.8 Calendário de Escala (Pastor)

```
┌─────────────────────────────────────────────────────────────────┐
│       ← Janeiro 2025 →        [Filtros: ▼ Todas as Igrejas]   │
├─────────────────────────────────────────────────────────────────┤
│ Dom  Seg  Ter  Qua  Qui  Sex  Sáb                              │
│                  1    2    3    4                               │
│                            🔵 Cent-João                          │
│                                                                  │
│  5    6    7    8    9   10   11                               │
│ 🟢                   🔴      🔵 Cent-Maria                       │
│ Norte             Sul                                           │
│ Pedro             Ana                                           │
│                                                                  │
│ 12   13   14   15   16   17   18                               │
│ 🟡                   🟠      🔵 Cent-Pedro                       │
│ Leste             Oeste                                         │
│ Carlos            Rita                                          │
│                                                                  │
│ 19   20   21   22   23   24   25                               │
│...                                                              │
│                                                                  │
│ Legenda:                                                        │
│ 🔵 Igreja Central  🟢 Igreja Norte  🔴 Igreja Sul              │
│ 🟡 Igreja Leste   🟠 Igreja Oeste                              │
│                                                                  │
│ Clique em um culto para ver detalhes ou editar                 │
│                                                                  │
│ ┌──────────────────────────────────────┐                       │
│ │   [📥 EXPORTAR MÊS (PDF)]            │                       │
│ └──────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

**Elementos:**
- Navegação de meses (setas)
- Filtro por igreja (dropdown)
- Grade de calendário
- Eventos com cores por igreja
- Legenda de cores
- Botão de exportação

---

### 9.9 Calendário de Escala (Pregador/Cantor)

```
┌─────────────────────────────────────────────────────────────────┐
│       ← Janeiro 2025 →                         Olá, João Silva │
├─────────────────────────────────────────────────────────────────┤
│ Dom  Seg  Ter  Qua  Qui  Sex  Sáb                              │
│                  1    2    3    4                               │
│                            ⭐ PREGAR                             │
│                               Igreja Central                     │
│                               09:00                              │
│                                                                  │
│  5    6    7    8    9   10   11                               │
│                                  ⛔ Indisponível                 │
│                                                                  │
│ 12   13   14   15   16   17   18                               │
│                                  ⭐ PREGAR                       │
│                                     Igreja Norte                 │
│                                     19:00                        │
│                                                                  │
│ 19   20   21   22   23   24   25                               │
│...                                                              │
│                                                                  │
│ Legenda:                                                        │
│ ⭐ Escalado    ⛔ Indisponível    ✓ Confirmado    ⏳ Pendente    │
│                                                                  │
│ [Clique em uma data para marcar indisponibilidade]             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Elementos:**
- Navegação de meses
- Identificação do usuário
- Destaques visuais para:
  - Dias escalados
  - Dias indisponíveis
  - Status de confirmação
- Interação: clicar para marcar indisponibilidade

---

### 9.10 Detalhes do Culto (Modal ao clicar no calendário)

```
┌─────────────────────────────────────────────────────────────────┐
│  Detalhes do Culto                                         [✕]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📅 Sábado, 04 de Janeiro de 2025                              │
│  🕐 09:00                                                       │
│  ⛪ Igreja Central                                              │
│  📍 Rua das Flores, 123 - Centro                               │
│  📖 Tema: Mordomia Cristã                                       │
│                                                                 │
│  👤 Pregador: João Silva (⭐92)                                 │
│     Status: ✓ Confirmado                                       │
│     Telefone: (11) 98765-4321                                   │
│                                                                 │
│  🎵 Cantor: Ana Costa (⭐87)                                    │
│     Status: ⏳ Pendente confirmação                             │
│     Telefone: (11) 91234-5678                                   │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  [Ações do Pastor]                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐ │
│  │ [✏️ EDITAR]    │  │ [↔️ SUBSTITUIR]│  │ [🗑️ CANCELAR]  │ │
│  └────────────────┘  └────────────────┘  └─────────────────┘ │
│                                                                 │
│  [Ações do Pregador/Cantor]                                    │
│  ┌────────────────┐  ┌────────────────────────────────────┐  │
│  │ [✓ CONFIRMAR]  │  │ [↔️ SOLICITAR TROCA]               │  │
│  └────────────────┘  └────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────┐                     │
│  │ [🗺️ VER ROTA NO GOOGLE MAPS]         │                     │
│  └──────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

**Elementos:**
- Informações completas do culto
- Dados de pregador e cantor
- Status de confirmação
- Botões de ação contextuais (variam por perfil)
- Link para Google Maps

---

### 9.11 Formulário de Avaliação

```
┌─────────────────────────────────────────────────────────────────┐
│  Avaliar Pregação                                          [✕]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Pregador: João Silva                                          │
│  Data: Sábado, 20 de Janeiro de 2025 - 09:00                  │
│  Igreja: Central                                               │
│                                                                 │
│  ───────────────────────────────────────────────────────────   │
│                                                                 │
│  1. Conteúdo Bíblico                                           │
│     Fundamentação bíblica, clareza e aplicação prática         │
│     ⭐ ⭐ ⭐ ⭐ ⭐                                            │
│                                                                 │
│  2. Comunicação                                                │
│     Dicção, gesticulação e contato visual                      │
│     ⭐ ⭐ ⭐ ⭐ ☆                                            │
│                                                                 │
│  3. Tempo                                                      │
│     Respeito ao horário e ritmo adequado                       │
│     ⭐ ⭐ ⭐ ⭐ ⭐                                            │
│                                                                 │
│  4. Impacto Espiritual                                         │
│     Edificação e ministração efetiva                           │
│     ⭐ ⭐ ⭐ ⭐ ⭐                                            │
│                                                                 │
│  5. Avaliação Geral                                            │
│     Sua impressão geral da pregação                            │
│     ⭐ ⭐ ⭐ ⭐ ⭐                                            │
│                                                                 │
│  Comentário (opcional):                                        │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ A mensagem foi edificante e clara. O pregador           │  │
│  │ demonstrou profundo conhecimento bíblico...             │  │
│  │                                                          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  💡 Sua avaliação é anônima e ajuda a melhorar o ministério    │
│                                                                 │
│  ┌────────────────┐  ┌────────────────────────────────────┐  │
│  │ [CANCELAR]     │  │ [ENVIAR AVALIAÇÃO]                 │  │
│  └────────────────┘  └────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Elementos:**
- Informações do culto
- 5 critérios com estrelas clicáveis
- Descrição de cada critério
- Campo de comentário (textarea)
- Nota sobre anonimato
- Botões de ação

---

### 9.12 Dashboard Pregador/Cantor

```
┌─────────────────────────────────────────────────────────────────┐
│ LOGO │ Minha Escala │ Minhas Avaliações │ Meu Score │ Perfil │👤│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Olá, João Silva                                               │
│  Pregador - Distrito Sul                                       │
│                                                                 │
│  ┌─── Score Atual ───────┐  ┌─── Participações ─────────────┐ │
│  │                        │  │ Este mês:  2 de 3 máximo     │ │
│  │        92.5            │  │ Este ano:  18                │ │
│  │      ⭐⭐⭐⭐⭐       │  │ Total:     145               │ │
│  │   Score: ALTO          │  │                              │ │
│  │                        │  │ Próxima pregação:            │ │
│  │  [VER HISTÓRICO]       │  │ 27/01 - Igreja Central       │ │
│  └────────────────────────┘  └──────────────────────────────┘ │
│                                                                 │
│  ┌─── Média de Avaliações ─────────────────────────────────┐  │
│  │ Conteúdo Bíblico:    ⭐⭐⭐⭐⭐ 4.8                     │  │
│  │ Comunicação:         ⭐⭐⭐⭐☆ 4.5                     │  │
│  │ Tempo:               ⭐⭐⭐⭐⭐ 4.9                     │  │
│  │ Impacto Espiritual:  ⭐⭐⭐⭐⭐ 4.7                     │  │
│  │ Geral:               ⭐⭐⭐⭐⭐ 4.7                     │  │
│  │                                                           │  │
│  │ Total de avaliações: 42                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─── Evolução do Score (últimos 6 meses) ─────────────────┐  │
│  │                                                           │  │
│  │  95 ┤                                           ●         │  │
│  │  90 ┤                                 ●       ●           │  │
│  │  85 ┤                       ●       ●                     │  │
│  │  80 ┤             ●       ●                               │  │
│  │     └───┬───┬───┬───┬───┬───┬                           │  │
│  │        Ago Set Out Nov Dez Jan                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Próximas Pregações (3)                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 27/01 Sáb 09:00 │ Igreja Central    │ ✓ Confirmado      │  │
│  │ 10/02 Sáb 19:00 │ Igreja Norte      │ ⏳ Pendente       │  │
│  │ 24/02 Sáb 09:00 │ Igreja Central    │ ⏳ Pendente       │  │
│  │ [VER CALENDÁRIO COMPLETO]                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Igrejas onde já preguei: 8 igrejas                            │
│  Streak atual: 3 pregações com 5⭐                             │
└─────────────────────────────────────────────────────────────────┘
```

**Elementos:**
- Header personalizado
- Card de score atual com classificação
- Card de participações
- Breakdown de avaliações por critério
- Gráfico de evolução
- Lista de próximas pregações
- Indicadores de conquistas

---

### 9.13 Solicitação de Troca

```
┌─────────────────────────────────────────────────────────────────┐
│  Solicitar Troca de Escala                                 [✕]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Sua Escalação:                                                │
│  📅 Sábado, 27 de Janeiro de 2025 - 09:00                     │
│  ⛪ Igreja Central                                              │
│  📖 Tema: Mordomia Cristã                                      │
│                                                                 │
│  ───────────────────────────────────────────────────────────   │
│                                                                 │
│  Selecione com quem deseja trocar:                             │
│                                                                 │
│  🔍 ┌──────────────────────────────────────────────────────┐  │
│     │ Buscar pregador...                                    │  │
│     └──────────────────────────────────────────────────────┘  │
│                                                                 │
│  Pregadores Disponíveis:                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ○ Maria Santos (⭐88) - 1 participação no mês            │  │
│  │   Última pregação: 13/01 (14 dias atrás)                 │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ ○ Pedro Costa (⭐85) - 2 participações no mês            │  │
│  │   Última pregação: 20/01 (7 dias atrás)                  │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ ○ Ana Oliveira (⭐78) - 0 participações no mês           │  │
│  │   Última pregação: 16/12 (42 dias atrás)                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Motivo da troca: *                                            │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Tenho um compromisso familiar inadiável nesta data      │  │
│  │                                                          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ⚠️ Atenção:                                                   │
│  • A troca precisa ser aceita pelo pregador substituto         │
│  • O Pastor Distrital pode precisar aprovar                    │
│  • Trocas com menos de 48h podem gerar penalização            │
│                                                                 │
│  ┌────────────────┐  ┌────────────────────────────────────┐  │
│  │ [CANCELAR]     │  │ [ENVIAR SOLICITAÇÃO]               │  │
│  └────────────────┘  └────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Elementos:**
- Detalhes da escalação atual
- Campo de busca
- Lista de pregadores disponíveis com rádio buttons
- Informações de cada candidato (score, participações)
- Campo obrigatório de motivo
- Alertas sobre o processo
- Botões de ação

---

### 9.14 Relatório de Escala (PDF Preview)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESCALA DE PREGAÇÃO                           │
│              Distrito Sul - Janeiro/2025                        │
│                                                                 │
│  Pastor Distrital: João Silva                                  │
│  Data de Publicação: 20/12/2024                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  IGREJA CENTRAL                                                │
│  ┌──────────────┬──────────┬─────────────────┬──────────────┐ │
│  │ Data         │ Horário  │ Pregador        │ Tema         │ │
│  ├──────────────┼──────────┼─────────────────┼──────────────┤ │
│  │ Sáb 04/01/25 │ 09:00    │ João Silva      │ Mordomia     │ │
│  │ Sáb 11/01/25 │ 09:00    │ Maria Santos    │ Família      │ │
│  │ Sáb 18/01/25 │ 09:00    │ Pedro Costa     │ Evangelismo  │ │
│  │ Sáb 25/01/25 │ 09:00    │ João Silva      │ Oração       │ │
│  │ Dom 05/01/25 │ 19:00    │ Ana Oliveira    │ Esperança    │ │
│  └──────────────┴──────────┴─────────────────┴──────────────┘ │
│                                                                 │
│  IGREJA NORTE                                                  │
│  ┌──────────────┬──────────┬─────────────────┬──────────────┐ │
│  │ Data         │ Horário  │ Pregador        │ Tema         │ │
│  ├──────────────┼──────────┼─────────────────┼──────────────┤ │
│  │ Dom 05/01/25 │ 19:00    │ Carlos Lima     │ Fé           │ │
│  │ Dom 12/01/25 │ 19:00    │ Rita Melo       │ Amor         │ │
│  │ ...          │          │                 │              │ │
│  └──────────────┴──────────┴─────────────────┴──────────────┘ │
│                                                                 │
│  [Continua para todas as igrejas...]                           │
│                                                                 │
│  ───────────────────────────────────────────────────────────   │
│  Total de Cultos: 48                                           │
│  Total de Pregadores: 15                                       │
│                                                                 │
│  Gerado em: 20/12/2024 às 14:35                               │
└─────────────────────────────────────────────────────────────────┘
```

**Elementos:**
- Cabeçalho com título e período
- Informações do distrito e pastor
- Tabelas agrupadas por igreja
- Rodapé com totais
- Data de geração

---

### 9.15 Tela Mobile - Home do Pregador

```
┌──────────────────────┐
│  ☰  Minha Escala  🔔 │
├──────────────────────┤
│                      │
│  Olá, João Silva     │
│  Score: 92.5 ⭐      │
│                      │
│  ┌────────────────┐  │
│  │ Próxima        │  │
│  │ Pregação:      │  │
│  │                │  │
│  │ 27/01 Sáb 09h  │  │
│  │ Igreja Central │  │
│  │                │  │
│  │ [✓ CONFIRMAR]  │  │
│  └────────────────┘  │
│                      │
│  Minhas Escalas (3)  │
│  ┌────────────────┐  │
│  │ 27/01 Sáb 09h  │  │
│  │ Central    ✓   │  │
│  └────────────────┘  │
│  ┌────────────────┐  │
│  │ 10/02 Sáb 19h  │  │
│  │ Norte      ⏳  │  │
│  └────────────────┘  │
│  ┌────────────────┐  │
│  │ 24/02 Sáb 09h  │  │
│  │ Central    ⏳  │  │
│  └────────────────┘  │
│                      │
│  [VER CALENDÁRIO]    │
│                      │
│  Quick Actions:      │
│  [📅] [↔️] [⭐] [👤] │
│  Escala Trocar Aval. Perfil│
└──────────────────────┘
```

**Elementos:**
- Header com menu hamburguer e notificações
- Card destacado com próxima pregação
- Lista de escalas futuras
- Botões de ação rápida na parte inferior
- Design otimizado para toque

---

**FIM DA PARTE 2 - MVP E WIREFRAMES**
