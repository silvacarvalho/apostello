# 📚 Exemplos de Uso - API de Configurações

## Guia prático de uso das validações implementadas

---

## 1️⃣ Configurar Distrito

### Obter Configuração Atual

```http
GET /api/v1/configuracoes/distritos/1/configuracoes
Authorization: Bearer {token}
```

**Resposta:**
```json
{
  "id": 1,
  "distrito_id": 1,
  "recorrencia_maxima_mes": 3,
  "intervalo_minimo_dias": 7,
  "sistema_preferencias_habilitado": true,
  "prazo_avaliacao_dias": 7,
  "confirmacao_obrigatoria": true,
  "prazo_confirmacao_horas": 48,
  "permitir_trocas": true,
  "aprovar_trocas_obrigatorio": true,
  "created_at": "2025-12-23T10:00:00Z",
  "updated_at": "2025-12-23T10:00:00Z"
}
```

---

### Atualizar Configuração

```http
PUT /api/v1/configuracoes/distritos/1/configuracoes
Authorization: Bearer {token}
Content-Type: application/json

{
  "recorrencia_maxima_mes": 4,
  "intervalo_minimo_dias": 10,
  "prazo_avaliacao_dias": 5,
  "prazo_confirmacao_horas": 72,
  "permitir_trocas": true,
  "aprovar_trocas_obrigatorio": false
}
```

**Resposta:** 200 OK
```json
{
  "id": 1,
  "distrito_id": 1,
  "recorrencia_maxima_mes": 4,
  "intervalo_minimo_dias": 10,
  "prazo_avaliacao_dias": 5,
  "prazo_confirmacao_horas": 72,
  "permitir_trocas": true,
  "aprovar_trocas_obrigatorio": false,
  ...
}
```

---

## 2️⃣ Gerar Escala com Validações

### Gerar Escala Respeitando Configurações

```http
POST /api/v1/escalas/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "distrito_id": 1,
  "mes": 1,
  "ano": 2026,
  "respeitar_recorrencia": true,    // ← Usa recorrencia_maxima_mes
  "respeitar_intervalo": true,      // ← Usa intervalo_minimo_dias
  "usar_score": true,
  "priorizar_sabado": true
}
```

**Comportamento:**
- ✅ Respeita `recorrencia_maxima_mes = 4`
- ✅ Respeita `intervalo_minimo_dias = 10`
- ✅ Pregador não será escalado mais de 4 vezes no mês
- ✅ Pregador não será escalado com menos de 10 dias de intervalo

**Exemplo de Log:**
```
[INFO] Gerando escala para Distrito Sul - 01/2026
[INFO] Configurações: Recorrência máxima=4, Intervalo mínimo=10 dias
[INFO] Pregador João Silva: 3 participações (dentro do limite)
[WARN] Pregador Pedro Santos: 4 participações (limite atingido - pulando)
[INFO] Total de 25 cultos escalados
```

---

## 3️⃣ Confirmar Presença

### Confirmar Dentro do Prazo

```http
POST /api/v1/escalas/itens/123/confirmar
Authorization: Bearer {token}
Content-Type: application/json

{
  "confirmado": true
}
```

**Cenário 1: Dentro do Prazo (✅ Sucesso)**
```
Publicação: 20/12/2025 14:00
Prazo: 48 horas (até 22/12/2025 14:00)
Tentativa: 21/12/2025 10:00
```

**Resposta:** 200 OK
```json
{
  "message": "Presença confirmada",
  "item_id": 123
}
```

---

**Cenário 2: Fora do Prazo (❌ Erro)**
```
Publicação: 20/12/2025 14:00
Prazo: 48 horas (até 22/12/2025 14:00)
Tentativa: 23/12/2025 10:00
```

**Resposta:** 400 Bad Request
```json
{
  "detail": "Prazo para confirmação expirado. O prazo era de 48 horas após a publicação (até 22/12/2025 14:00)"
}
```

---

### Recusar Presença

```http
POST /api/v1/escalas/itens/123/confirmar
Authorization: Bearer {token}
Content-Type: application/json

{
  "confirmado": false
}
```

**Resposta:** 200 OK
```json
{
  "message": "Presença recusada",
  "item_id": 123
}
```

---

## 4️⃣ Solicitar Troca

### Cenário 1: Trocas Habilitadas (✅ Sucesso)

```
Configuração:
- permitir_trocas = true
- aprovar_trocas_obrigatorio = true
```

```http
POST /api/v1/escalas/itens/123/solicitar-troca?substituto_id=45&tipo=PREGADOR&motivo=Viagem
Authorization: Bearer {token}
```

**Resposta:** 201 Created
```json
{
  "message": "Solicitação de troca criada com sucesso",
  "solicitacao_id": 789,
  "status": "PENDENTE_SUBSTITUTO"
}
```

**Fluxo:**
1. Status: `PENDENTE_SUBSTITUTO`
2. Substituto aceita → `PENDENTE_PASTOR`
3. Pastor aprova → `APROVADA`

---

### Cenário 2: Trocas Desabilitadas (❌ Erro)

```
Configuração:
- permitir_trocas = false
```

```http
POST /api/v1/escalas/itens/123/solicitar-troca?substituto_id=45&tipo=PREGADOR&motivo=Viagem
Authorization: Bearer {token}
```

**Resposta:** 403 Forbidden
```json
{
  "detail": "Trocas de pregadores/cantores estão desabilitadas para este distrito. Entre em contato com o pastor distrital."
}
```

---

### Cenário 3: Aprovação Não Obrigatória

```
Configuração:
- permitir_trocas = true
- aprovar_trocas_obrigatorio = false
```

**Fluxo Simplificado:**
1. Solicitante cria solicitação → `PENDENTE_SUBSTITUTO`
2. Substituto aceita → **`APROVADA` (automático)**
3. Pastor recebe apenas notificação

---

## 5️⃣ Criar Avaliação

### Avaliar Dentro do Prazo (✅ Sucesso)

```
Configuração:
- prazo_avaliacao_dias = 7

Culto: 16/12/2025
Prazo até: 23/12/2025
```

```http
POST /api/v1/avaliacoes/
Authorization: Bearer {token}
Content-Type: application/json

{
  "item_escala_id": 123,
  "avaliado_id": 45,
  "tipo": "PREGADOR",
  "criterio_1": 5,
  "criterio_2": 4,
  "criterio_3": 5,
  "criterio_4": 5,
  "criterio_5": 4,
  "comentario": "Excelente pregação!"
}
```

**Tentativa em 20/12/2025 (4 dias depois)**

**Resposta:** 201 Created
```json
{
  "id": 456,
  "item_escala_id": 123,
  "avaliado_id": 45,
  "tipo": "PREGADOR",
  "media": 4.6,
  "created_at": "2025-12-20T15:30:00Z"
}
```

---

### Avaliar Fora do Prazo (❌ Erro)

**Tentativa em 24/12/2025 (8 dias depois)**

**Resposta:** 400 Bad Request
```json
{
  "detail": "Prazo para avaliação expirado. O prazo era de 7 dias após o culto (até 23/12/2025)"
}
```

---

## 6️⃣ Listar Avaliações Pendentes

### Com Prazo de 7 Dias

```http
GET /api/v1/avaliacoes/pendentes
Authorization: Bearer {token}
```

**Configuração:** `prazo_avaliacao_dias = 7`
**Data Atual:** 23/12/2025

**Resposta:**
```json
[
  {
    "id": 123,
    "data_culto": "2025-12-22",  // 1 dia atrás ✅
    "igreja_nome": "Igreja Central",
    "pregador_nome": "João Silva"
  },
  {
    "id": 124,
    "data_culto": "2025-12-21",  // 2 dias atrás ✅
    "igreja_nome": "Igreja Norte",
    "pregador_nome": "Maria Santos"
  }
  // Culto de 15/12 (8 dias) NÃO aparece ❌
]
```

---

## 📊 Cenários de Uso Comum

### Cenário 1: Distrito Rigoroso
```json
{
  "recorrencia_maxima_mes": 2,
  "intervalo_minimo_dias": 14,
  "confirmacao_obrigatoria": true,
  "prazo_confirmacao_horas": 24,
  "permitir_trocas": false,
  "prazo_avaliacao_dias": 3
}
```
**Características:**
- Máximo 2 pregações/mês
- 14 dias entre pregações
- 24h para confirmar
- Trocas bloqueadas
- 3 dias para avaliar

---

### Cenário 2: Distrito Flexível
```json
{
  "recorrencia_maxima_mes": 5,
  "intervalo_minimo_dias": 3,
  "confirmacao_obrigatoria": false,
  "permitir_trocas": true,
  "aprovar_trocas_obrigatorio": false,
  "prazo_avaliacao_dias": 14
}
```
**Características:**
- Até 5 pregações/mês
- 3 dias entre pregações
- Confirmação não obrigatória
- Trocas livres (sem aprovação)
- 14 dias para avaliar

---

### Cenário 3: Distrito Balanceado (Recomendado)
```json
{
  "recorrencia_maxima_mes": 3,
  "intervalo_minimo_dias": 7,
  "confirmacao_obrigatoria": true,
  "prazo_confirmacao_horas": 48,
  "permitir_trocas": true,
  "aprovar_trocas_obrigatorio": true,
  "prazo_avaliacao_dias": 7
}
```
**Características:**
- 3 pregações/mês (padrão)
- 7 dias entre pregações
- 48h para confirmar
- Trocas com aprovação pastor
- 7 dias para avaliar

---

## 🔍 Testando as Validações

### Teste 1: Recorrência Máxima

1. Configure `recorrencia_maxima_mes = 2`
2. Gere escala com `respeitar_recorrencia = true`
3. Verifique que nenhum pregador aparece mais de 2 vezes

---

### Teste 2: Intervalo Mínimo

1. Configure `intervalo_minimo_dias = 10`
2. Gere escala com `respeitar_intervalo = true`
3. Verifique que há pelo menos 10 dias entre pregações do mesmo pregador

---

### Teste 3: Confirmação

1. Configure `prazo_confirmacao_horas = 48`
2. Publique escala
3. Tente confirmar após 48h → Deve bloquear

---

### Teste 4: Trocas

1. Configure `permitir_trocas = false`
2. Tente solicitar troca → Deve bloquear
3. Mude para `permitir_trocas = true`
4. Solicite troca → Deve criar solicitação

---

### Teste 5: Avaliação

1. Configure `prazo_avaliacao_dias = 5`
2. Marque culto como REALIZADO
3. Tente avaliar após 5 dias → Deve bloquear
4. Liste pendentes → Não deve mostrar cultos > 5 dias

---

## 🎯 Dicas de Implementação no Frontend

### Exibir Prazos para Usuário

```javascript
// Calcular prazo de confirmação
const dataPublicacao = new Date('2025-12-20T14:00:00Z');
const prazoHoras = 48;
const dataLimite = new Date(dataPublicacao.getTime() + prazoHoras * 60 * 60 * 1000);

// Mostrar countdown
<Countdown targetDate={dataLimite} />
```

---

### Validar antes de Submeter

```javascript
// Verificar se pode solicitar troca
if (!config.permitir_trocas) {
  showError('Trocas desabilitadas neste distrito');
  return;
}

// Verificar se pode avaliar
const diasDesde = (new Date() - dataCulto) / (1000 * 60 * 60 * 24);
if (diasDesde > config.prazo_avaliacao_dias) {
  showError(`Prazo de ${config.prazo_avaliacao_dias} dias expirado`);
  return;
}
```

---

## ✅ Checklist de Validações

- ✅ Recorrência máxima respeitada na geração
- ✅ Intervalo mínimo respeitado na geração
- ✅ Confirmação bloqueada após prazo
- ✅ Trocas bloqueadas se desabilitado
- ✅ Avaliação bloqueada após prazo
- ✅ Pendentes filtrados por prazo
- ✅ Mensagens de erro claras
- ✅ Configurações por distrito

---

**Desenvolvido por:** Tech Lead AI  
**Data:** 23 de dezembro de 2025  
**Sistema:** Apostello v1.0
