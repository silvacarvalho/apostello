# Sistema de Penalidades - Confirmação de Presença

## 📋 Regras de Negócio

### Sistema de Penalidades em Duas Etapas

#### Etapa 1: Não Confirmação no Prazo
Quando um pregador/cantor **não confirma presença** dentro do prazo configurado:
1. O sistema marca o status como `NAO_CONFIRMADO`
2. Aplica **penalidade de -3 pontos** automaticamente
3. Envia **alerta** para o pastor do distrito
4. Atualiza o score do usuário (recalcula automaticamente)

#### Etapa 2: Não Confirmou E Não Compareceu
Se após não confirmar, a pessoa **também não comparece** ao culto:
1. O pastor marca o culto como `REALIZADO`
2. Sistema detecta status `NAO_CONFIRMADO` + culto `REALIZADO`
3. Aplica **penalidade adicional de -12 pontos**
4. **Total acumulado: -15 pontos** (-3 + -12)
5. Atualiza o score novamente
6. Notifica o pastor sobre a penalidade adicional

### Tabela de Penalidades

| Situação | Penalidade | Total Acumulado |
|----------|------------|-----------------|
| Não confirmou no prazo | -3 pontos | -3 pts |
| Não confirmou + Compareceu | -3 pontos | -3 pts (pastor remove manualmente) |
| Não confirmou + Não compareceu | -3 pts + -12 pts | **-15 pts** |
| Desmarcou sem troca | -10 pontos | -10 pts |
| Desmarcou com menos de 48h | -5 pontos | -5 pts |
| Atraso | -3 pontos | -3 pts |

## 🔄 Fluxo de Processamento

### Etapa 1: Processamento de Confirmações Pendentes
**Arquivo:** `processar_confirmacoes_penalidades.py`  
**Função:** `processar_confirmacoes_pendentes()`

```python
# Executa a cada hora
# Busca itens com confirmação pendente onde prazo expirou
# Para cada item:
#   1. Atualiza status para NAO_CONFIRMADO
#   2. Aplica penalidade de -3 pontos
#   3. Recalcula score do usuário
#   4. Envia notificação ao pastor
```

### Etapa 2: Processamento de Faltas Reais
**Arquivo:** `processar_confirmacoes_penalidades.py`  
**Função:** `processar_faltas_nao_avisadas()`

```python
# Executa diariamente após cultos
# Busca itens com:
#   - status_realizacao = REALIZADO
#   - status_confirmacao = NAO_CONFIRMADO
#   - sem penalidade FALTA_SEM_AVISO aplicada
# Para cada item:
#   1. Aplica penalidade adicional de -12 pontos
#   2. Total: -3 (etapa 1) + -12 (etapa 2) = -15 pts
#   3. Recalcula score novamente
#   4. Notifica o pastor
```

## 🎯 Endpoints da API

### Marcar Falta de Pregador
```http
POST /api/v1/penalidades/itens/{item_id}/marcar-falta-pregador
Authorization: Bearer {token_pastor}
Content-Type: application/json

{
  "motivo": "Faltou sem avisar"
}
```

**Resposta:**
```json
{
  "message": "Falta registrada e penalidade aplicada",
  "penalidade_id": 123,
  "pontos_subtraidos": 15.0
}
```

### Marcar Falta de Cantor
```http
POST /api/v1/penalidades/itens/{item_id}/marcar-falta-cantor
Authorization: Bearer {token_pastor}
Content-Type: application/json

{
  "motivo": "Faltou sem avisar"
}
```

## 📊 Tipos de Penalidade

| Tipo | Pontos | Quando Aplicar |
|------|--------|----------------|
| NAO_CONFIRMOU_PRAZO | -3 | Não confirmou no prazo (automático) |
| FALTA_SEM_AVISO | -12 | Não confirmou E não compareceu (automático) |
| DESMARCACAO_SEM_TROCA | -10 | Desmarcou sem encontrar substituto |
| DESMARCACAO_48H | -5 | Desmarcou com menos de 48h |
| ATRASO | -3 | Chegou atrasado ao culto |

**💡 Nota:** Para faltas completas (não confirmou + não compareceu), o total é -15 pontos (-3 + -12)

## 🔧 Configuração

### Script Automatizado
**Arquivo:** `processar_confirmacoes_penalidades.py`

**Executar via cron:**
```bash
# A cada hora - processar confirmações pendentes
0 * * * * cd /app/backend && python processar_confirmacoes_penalidades.py --confirmacoes

# Diariamente às 23h - processar faltas
0 23 * * * cd /app/backend && python processar_confirmacoes_penalidades.py --faltas
```

**Executar via systemd timer:**
```ini
# /etc/systemd/system/apostello-confirmacoes.timer
[Unit]
Description=Processar confirmações pendentes

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```

## 📱 Integração Frontend

### Dashboard Pastor - Alertas
```typescript
// Exibir alertas de não confirmação
interface AlertaNaoConfirmacao {
  item_id: number;
  nome_pessoa: string;
  tipo: "PREGADOR" | "CANTOR";
  data_culto: string;
  horas_vencidas: number;
}

// GET /api/v1/alertas/confirmacoes-pendentes
// Retorna lista de AlertaNaoConfirmacao
```

### Marcar Culto como Realizado
```typescript
// Quando pastor marca culto como REALIZADO
// Sistema verifica itens NAO_CONFIRMADO
// Apresenta modal: "Marcar como falta?"

async function marcarCultoRealizado(escalaId: number) {
  // 1. Marcar escala como realizada
  await api.put(`/escalas/${escalaId}/marcar-realizado`);
  
  // 2. Buscar itens não confirmados
  const itensNaoConfirmados = await api.get(
    `/escalas/${escalaId}/itens-nao-confirmados`
  );
  
  // 3. Para cada item, perguntar se pessoa compareceu
  for (const item of itensNaoConfirmados) {
    const faltou = await confirmarFalta(item);
    if (faltou) {
      await api.post(`/penalidades/itens/${item.id}/marcar-falta-${item.tipo}`);
    }
  }
}
```

## 🧪 Testes

### Teste 1: Confirmação Expirada (-3 pontos)
```python
# 1. Criar item de escala
# 2. Configurar prazo_confirmacao_horas = 48
# 3. Avançar tempo 49 horas
# 4. Executar processar_confirmacoes_pendentes()
# 5. Verificar: status = NAO_CONFIRMADO
# 6. Verificar: penalidade NAO_CONFIRMOU_PRAZO criada (-3 pts)
# 7. Verificar: score recalculado
# 8. Verificar: notificação enviada ao pastor
```

### Teste 2: Aplicação de Penalidade Adicional (-12 pontos)
```python
# 1. Item com status NAO_CONFIRMADO e penalidade -3 pts aplicada
# 2. Marcar culto como REALIZADO
# 3. Executar processar_faltas_nao_avisadas()
# 4. Verificar: penalidade FALTA_SEM_AVISO criada (-12 pts)
# 5. Verificar: score recalculado (total -15 pontos)
# 6. Verificar: notificação enviada
```

### Teste 3: Confirmou mas Não Compareceu
```python
# 1. Item confirmado (status CONFIRMADO)
# 2. Marcar culto como REALIZADO
# 3. Pastor marca falta manual
# 4. Verificar: apenas penalidade manual aplicada
# 5. Verificar: NÃO aplica as -3 pts automáticas
```

## 📈 Cálculo de Score

### Fórmula
```python
score_base = (soma_avaliacoes / total_avaliacoes) * 20  # 0-100

penalidades_ativas = sum(p.valor_subtracao for p in penalidades 
                         where p.ativa == True)

score_final = max(0, score_base - penalidades_ativas)
```

### Exemplo
```
Pregador com:
- 10 avaliações, média 4.5/5
- score_base = (4.5/5) * 100 = 90
- 1 falta completa: -3 (não confirmou) + -12 (não compareceu) = -15
- 1 desmarcação 48h (-5)
- score_final = 90 - 15 - 5 = 70
```

### Penalidades Ativas vs Inativas
```python
# Apenas penalidades ativas são subtraídas do score
# Penalidades podem ser desativadas por:
#   - Pastor (perdão/justificativa aceita)
#   - Data de validade expirada
#   - Recurso aceito pelo administrador

score_final = max(0, score_base - sum(penalidades_ativas))
```

## 🚨 Notificações

### Alerta de Não Confirmação
```
Título: "❌ X Confirmação(ões) NÃO Respondida(s)"
Mensagem: "⚠️ X pregador(es)/cantor(es) NÃO confirmaram presença no prazo:
- [Nome] (PREGADOR/CANTOR) em [Igreja] no dia DD/MM/AAAA

✅ Penalidade de -3 pontos já foi aplicada automaticamente.
⚠️ Se não comparecerem, será aplicada penalidade adicional de -12 pontos."

Tipo: ALERTA
Prioridade: ALTA
Destinatário: Pastor do distrito
```

### Alerta de Penalidade Adicional Aplicada
```
Título: "Penalidades por Falta Aplicadas (X)"
Mensagem: "ℹ️ X penalidade(s) adicionais por falta foram aplicadas:
- [TIPO] em [Igreja] (DD/MM/AAAA)

💡 Total: -3 pontos (não confirmou) + -12 pontos (não compareceu) = -15 pontos por falta."

Tipo: SISTEMA
Prioridade: MEDIA
Destinatário: Pastor do distrito
```

## 🔒 Permissões

| Ação | PREGADOR | CANTOR | PASTOR | ADMIN |
|------|----------|--------|--------|-------|
| Confirmar própria presença | ✅ | ✅ | ✅ | ✅ |
| Ver próprias penalidades | ✅ | ✅ | ✅ | ✅ |
| Marcar falta de outros | ❌ | ❌ | ✅ | ✅ |
| Remover penalidade | ❌ | ❌ | ❌ | ✅ |
| Ver penalidades de outros | ❌ | ❌ | ✅ (distrito) | ✅ |

## 📝 Logs e Auditoria

Todos os eventos são registrados em:
- **Penalidade**: aplicar_penalidade, reverter_penalidade
- **HistoricoScore**: variações de pontuação
- **LogNotificacao**: alertas enviados
- **HistoricoItemEscala**: alterações de status

```sql
-- Buscar histórico de penalidades de um usuário
SELECT p.*, u.nome as pastor_nome, ie.data as data_culto
FROM penalidades p
JOIN usuarios u ON p.aplicado_por_id = u.id
JOIN itens_escala ie ON p.item_escala_id = ie.id
WHERE p.usuario_id = 123
ORDER BY p.created_at DESC;
```

## 🎓 Casos de Uso

### Caso 1: Pregador Confirma no Prazo
1. Pregador recebe escala (7 dias antes)
2. Confirma presença (2 dias antes)
3. Comparece ao culto
4. **Nenhuma penalidade**

### Caso 2: Pregador Não Confirma mas Comparece
1. Pregador recebe escala
2. **NÃO confirma** no prazo
3. Sistema aplica **-3 pontos** automaticamente
4. Pastor recebe alerta
5. Pregador **comparece** ao culto
6. **Total: -3 pontos** (pastor pode remover se justificado)

### Caso 3: Pregador Não Confirma e Falta (Pior Cenário)
1. Pregador recebe escala
2. **NÃO confirma** no prazo
3. Sistema aplica **-3 pontos** + envia alerta ao pastor
4. Pregador **NÃO comparece**
5. Pastor marca culto como REALIZADO
6. Sistema aplica **-12 pontos** adicionais
7. **Total: -15 pontos** (-3 + -12)
8. Pastor recebe notificação da penalidade adicional

### Caso 4: Pregador Desiste com Antecedência
1. Pregador confirma presença
2. Depois **desiste** (3 dias antes)
3. Solicita troca
4. Encontra substituto
5. **Nenhuma penalidade**

### Caso 5: Pregador Desiste em Cima da Hora
1. Pregador confirma presença
2. **Desiste** (1 dia antes)
3. NÃO encontra substituto
4. Penalidade: **-10 pontos** (DESMARCACAO_SEM_TROCA)

## ⚙️ Configurações do Distrito

```python
# ConfiguracaoDistrito
prazo_confirmacao_horas: int = 48  # 2 dias antes
permitir_trocas: bool = True
```

## 📞 Suporte

Para dúvidas sobre o sistema de penalidades:
1. Consultar esta documentação
2. Verificar logs em `/backend/logs/`
3. Executar diagnóstico: `python diagnostico_penalidades.py`
