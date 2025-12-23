# 📡 API de Penalidades - Exemplos de Uso

## 🔐 Autenticação

Todos os endpoints requerem autenticação via Bearer Token.

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pastor@exemplo.com",
    "password": "senha123"
  }'

# Resposta
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

## 📋 Endpoints Disponíveis

### 1. Marcar Falta de Pregador (Manual)

**POST** `/api/v1/penalidades/itens/{item_id}/marcar-falta-pregador`

Permite ao pastor marcar manualmente que um pregador faltou.

**Parâmetros:**
- `item_id` (path): ID do item de escala

**Body:**
```json
{
  "motivo": "Faltou sem avisar"
}
```

**Exemplo:**
```bash
curl -X POST http://localhost:8000/api/v1/penalidades/itens/123/marcar-falta-pregador \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "motivo": "Não compareceu e não avisou"
  }'
```

**Resposta de Sucesso (200):**
```json
{
  "message": "Falta registrada e penalidade aplicada",
  "penalidade_id": 456,
  "pontos_subtraidos": 12.0
}
```

**Erros Possíveis:**

**404 - Item não encontrado:**
```json
{
  "detail": "Item de escala não encontrado"
}
```

**400 - Item sem pregador:**
```json
{
  "detail": "Este item não tem pregador escalado"
}
```

**400 - Culto não realizado:**
```json
{
  "detail": "O culto ainda não foi marcado como realizado"
}
```

### 2. Marcar Falta de Cantor (Manual)

**POST** `/api/v1/penalidades/itens/{item_id}/marcar-falta-cantor`

Similar ao endpoint de pregador, mas para cantores.

**Exemplo:**
```bash
curl -X POST http://localhost:8000/api/v1/penalidades/itens/123/marcar-falta-cantor \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "motivo": "Falta sem justificativa"
  }'
```

**Resposta:**
```json
{
  "message": "Falta registrada e penalidade aplicada",
  "penalidade_id": 457,
  "pontos_subtraidos": 12.0
}
```

## 🤖 Processamento Automático

### Script: processar_confirmacoes_penalidades.py

#### Modo 1: Processar Confirmações Pendentes

Marca confirmações expiradas e aplica -3 pontos.

**Execução:**
```bash
python processar_confirmacoes_penalidades.py --confirmacoes
```

**O que faz:**
1. Busca itens com confirmação PENDENTE
2. Verifica se prazo expirou (baseado em `prazo_confirmacao_horas`)
3. Marca como NAO_CONFIRMADO
4. Aplica penalidade de -3 pontos
5. Recalcula score
6. Envia notificação ao pastor

**Saída esperada:**
```
Processadas 5 confirmações pendentes
- Pregador João Silva: -3 pontos (Igreja Central)
- Cantor Maria Santos: -3 pontos (Igreja Norte)
...
Notificações enviadas aos pastores
```

#### Modo 2: Processar Faltas

Detecta quem não compareceu e aplica -12 pontos adicionais.

**Execução:**
```bash
python processar_confirmacoes_penalidades.py --faltas
```

**O que faz:**
1. Busca itens com culto REALIZADO + status NAO_CONFIRMADO
2. Verifica se já tem penalidade FALTA_SEM_AVISO
3. Se não tiver, aplica -12 pontos
4. Recalcula score
5. Notifica pastor

**Saída esperada:**
```
Processadas 3 faltas sem aviso
- Pregador Pedro Costa: -12 pontos (total -15)
- Cantor Ana Lima: -12 pontos (total -15)
...
Penalidades aplicadas e pastores notificados
```

## 📊 Consultas Úteis

### Listar Penalidades de um Usuário

**GET** `/api/v1/usuarios/{usuario_id}/penalidades`

```bash
curl -X GET http://localhost:8000/api/v1/usuarios/123/penalidades \
  -H "Authorization: Bearer TOKEN"
```

**Resposta:**
```json
{
  "total": 2,
  "penalidades": [
    {
      "id": 456,
      "tipo": "NAO_CONFIRMOU_PRAZO",
      "valor_subtracao": 3.0,
      "motivo": "Não confirmou presença no prazo em Igreja Central (15/01/2024)",
      "data_aplicacao": "2024-01-15",
      "ativa": true,
      "aplicado_por": "Pastor José"
    },
    {
      "id": 457,
      "tipo": "FALTA_SEM_AVISO",
      "valor_subtracao": 12.0,
      "motivo": "Não confirmou e não compareceu em Igreja Central (15/01/2024)",
      "data_aplicacao": "2024-01-16",
      "ativa": true,
      "aplicado_por": "Sistema Automático"
    }
  ],
  "total_pontos_perdidos": 15.0
}
```

### Ver Score Atual

**GET** `/api/v1/usuarios/{usuario_id}/score`

```bash
curl -X GET http://localhost:8000/api/v1/usuarios/123/score \
  -H "Authorization: Bearer TOKEN"
```

**Resposta:**
```json
{
  "usuario_id": 123,
  "nome": "João Silva",
  "score_base": 85.0,
  "penalidades_ativas": 15.0,
  "score_final": 70.0,
  "ultima_atualizacao": "2024-01-16T10:30:00Z"
}
```

### Histórico de Score

**GET** `/api/v1/usuarios/{usuario_id}/historico-score`

```bash
curl -X GET http://localhost:8000/api/v1/usuarios/123/historico-score?limit=10 \
  -H "Authorization: Bearer TOKEN"
```

**Resposta:**
```json
{
  "historico": [
    {
      "id": 789,
      "score_anterior": 82.0,
      "score_novo": 70.0,
      "motivo": "PENALIDADE_APLICADA",
      "observacao": "Penalidade FALTA_SEM_AVISO (-12 pts)",
      "data": "2024-01-16T10:30:00Z"
    },
    {
      "id": 788,
      "score_anterior": 85.0,
      "score_novo": 82.0,
      "motivo": "PENALIDADE_APLICADA",
      "observacao": "Penalidade NAO_CONFIRMOU_PRAZO (-3 pts)",
      "data": "2024-01-15T08:00:00Z"
    }
  ]
}
```

## 🔄 Fluxo Completo - Exemplo Real

### Cenário: Pregador não confirma e falta

#### 1. Escala Publicada
```bash
# Pastor publica escala
POST /api/v1/escalas/456/publicar
```

**Resultado:**
- Pregador João Silva escalado para 20/01/2024
- Status confirmação: PENDENTE
- Prazo: 48h antes (18/01/2024 às 10h)

#### 2. Prazo Expira (Automático)

**18/01/2024 às 11h - Script executa:**
```bash
python processar_confirmacoes_penalidades.py --confirmacoes
```

**Ações:**
- Status: PENDENTE → NAO_CONFIRMADO
- Penalidade: -3 pontos (NAO_CONFIRMOU_PRAZO)
- Score: 85 → 82
- Notificação enviada ao pastor

**Notificação ao Pastor:**
```
⚠️ ALERTA: 1 pregador(es)/cantor(es) NÃO confirmaram presença no prazo:
- João Silva (PREGADOR) em Igreja Central no dia 20/01/2024

✅ Penalidade de -3 pontos já foi aplicada automaticamente.
⚠️ Se não comparecerem, será aplicada penalidade adicional de -12 pontos.
```

#### 3. Dia do Culto - Pregador Falta

**20/01/2024 - Pastor marca culto como REALIZADO:**
```bash
POST /api/v1/escalas/456/marcar-realizado
```

#### 4. Script Detecta Falta (Automático)

**20/01/2024 às 23h - Script executa:**
```bash
python processar_confirmacoes_penalidades.py --faltas
```

**Ações:**
- Detecta: status=NAO_CONFIRMADO + culto=REALIZADO
- Penalidade: -12 pontos (FALTA_SEM_AVISO)
- Score: 82 → 70
- Total perdido: 15 pontos
- Notificação enviada ao pastor

**Notificação ao Pastor:**
```
ℹ️ 1 penalidade(s) adicionais por falta foram aplicadas:
- PREGADOR em Igreja Central (20/01/2024)

💡 Total: -3 pontos (não confirmou) + -12 pontos (não compareceu) = -15 pontos por falta.
```

#### 5. Consultar Resultado

```bash
# Ver penalidades do João
GET /api/v1/usuarios/123/penalidades
```

**Resposta:**
```json
{
  "total": 2,
  "penalidades": [
    {
      "id": 501,
      "tipo": "NAO_CONFIRMOU_PRAZO",
      "valor_subtracao": 3.0,
      "data_aplicacao": "2024-01-18"
    },
    {
      "id": 502,
      "tipo": "FALTA_SEM_AVISO",
      "valor_subtracao": 12.0,
      "data_aplicacao": "2024-01-20"
    }
  ],
  "total_pontos_perdidos": 15.0
}
```

## 🛡️ Permissões

| Endpoint | PREGADOR | CANTOR | PASTOR | ADMIN |
|----------|----------|--------|--------|-------|
| Marcar falta (manual) | ❌ | ❌ | ✅ | ✅ |
| Ver próprias penalidades | ✅ | ✅ | ✅ | ✅ |
| Ver penalidades de outros | ❌ | ❌ | ✅ (distrito) | ✅ |
| Desativar penalidade | ❌ | ❌ | ❌ | ✅ |
| Ver histórico score | ✅ (próprio) | ✅ (próprio) | ✅ (distrito) | ✅ |

## 🐛 Debug

### Ativar Logs Detalhados

**Arquivo: backend/app/core/config.py**
```python
LOG_LEVEL = "DEBUG"
```

**Ver logs em tempo real:**
```bash
tail -f logs/apostello.log | grep -i "penalidade"
```

### Testar Script Sem Aplicar Penalidades

```python
# Modificar temporariamente o script
# Adicionar flag --dry-run

if __name__ == "__main__":
    import sys
    dry_run = "--dry-run" in sys.argv
    
    if dry_run:
        print("MODO DRY-RUN - Nenhuma penalidade será aplicada")
    
    # No código, antes de db.commit():
    if dry_run:
        db.rollback()
        print("Rollback executado (dry-run)")
    else:
        db.commit()
```

**Executar:**
```bash
python processar_confirmacoes_penalidades.py --confirmacoes --dry-run
```

---

**Documentação:** v2.0  
**Última atualização:** 23/12/2024
