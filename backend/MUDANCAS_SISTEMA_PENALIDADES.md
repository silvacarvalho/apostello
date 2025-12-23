# ✅ Sistema de Penalidades Atualizado - Resumo das Mudanças

## 🎯 Novas Regras Implementadas

### Sistema de Penalidades em Duas Etapas

#### **Etapa 1: Não Confirmou no Prazo**
- **Penalidade:** -3 pontos (NAO_CONFIRMOU_PRAZO)
- **Quando:** Prazo de confirmação expira automaticamente
- **Processo:** 
  1. Script `processar_confirmacoes_penalidades.py` detecta confirmações expiradas
  2. Marca status como `NAO_CONFIRMADO`
  3. Aplica penalidade de -3 pontos
  4. Recalcula score automaticamente
  5. Notifica pastor com alerta

#### **Etapa 2: Não Confirmou + Não Compareceu**
- **Penalidade adicional:** -12 pontos (FALTA_SEM_AVISO)
- **Total acumulado:** -15 pontos (-3 + -12)
- **Quando:** Pastor marca culto como REALIZADO e pessoa não compareceu
- **Processo:**
  1. Script detecta itens com `NAO_CONFIRMADO` + `REALIZADO`
  2. Aplica penalidade adicional de -12 pontos
  3. Recalcula score novamente
  4. Notifica pastor sobre penalidade adicional

## 📊 Tabela Completa de Penalidades

| Tipo | Pontos | Quando Aplicar | Automático? |
|------|--------|----------------|-------------|
| NAO_CONFIRMOU_PRAZO | -3 | Não confirmou no prazo | ✅ Sim |
| FALTA_SEM_AVISO | -12 | Não confirmou + não compareceu | ✅ Sim |
| **Total Falta Completa** | **-15** | **Soma das duas acima** | **✅ Sim** |
| DESMARCACAO_SEM_TROCA | -10 | Desmarcou sem substituto | ❌ Manual |
| DESMARCACAO_48H | -5 | Desmarcou < 48h | ❌ Manual |
| ATRASO | -3 | Chegou atrasado | ❌ Manual |

## 🔧 Arquivos Modificados

### 1. **backend/app/models/penalidade.py**
```python
# Adicionado novo tipo de penalidade
class TipoPenalidade(str, enum.Enum):
    NAO_CONFIRMOU_PRAZO = "NAO_CONFIRMOU_PRAZO"  # -3 pontos
    FALTA_SEM_AVISO = "FALTA_SEM_AVISO"         # -12 pontos
    # ... outros tipos
```

### 2. **backend/app/services/penalidade_service.py**
```python
# Valores atualizados
PENALIDADES = {
    TipoPenalidade.NAO_CONFIRMOU_PRAZO: Decimal("3.00"),   # NOVO
    TipoPenalidade.FALTA_SEM_AVISO: Decimal("12.00"),      # Atualizado (era 15.00)
    # ... outros valores
}

# Novo método
def aplicar_penalidade_nao_confirmou(...):
    """Aplica -3 pontos por não confirmar no prazo"""
```

### 3. **backend/processar_confirmacoes_penalidades.py**
**Modificações em `processar_confirmacoes_pendentes()`:**
- Agora aplica penalidade de -3 pontos automaticamente
- Notifica pastor informando sobre a penalidade aplicada

**Modificações em `processar_faltas_nao_avisadas()`:**
- Aplica penalidade adicional de -12 pontos
- Mensagem atualizada: "Total: -3 (não confirmou) + -12 (não compareceu) = -15 pts"

### 4. **backend/SISTEMA_PENALIDADES.md**
- Documentação completa atualizada
- Novos cenários de uso
- Fluxo em duas etapas documentado
- Exemplos de cálculo de score

### 5. **backend/app/api/v1/endpoints/penalidades.py**
- Endpoints para pastor marcar faltas manualmente (já existente)

## 🧪 Testes

### **test_penalidades_simples.py** ✅
Valida:
- ✓ Tipo NAO_CONFIRMOU_PRAZO existe
- ✓ NAO_CONFIRMOU_PRAZO = -3 pontos
- ✓ FALTA_SEM_AVISO = -12 pontos
- ✓ Total falta completa = -15 pontos

**Resultado:** Todos os testes passaram!

## 📈 Exemplo de Impacto no Score

```
Pregador com score base de 85 pontos:

1. Não confirmou no prazo:
   85 - 3 = 82 pontos

2. Não compareceu ao culto:
   82 - 12 = 70 pontos
   
Total perdido: 15 pontos
```

## 🔄 Fluxo Automático Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Pregador escalado, escala publicada                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Prazo de confirmação (ex: 48h antes)                     │
└─────────────────────────────┬───────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
        ┌─────────────┐           ┌─────────────────┐
        │ CONFIRMOU   │           │ NÃO CONFIRMOU   │
        └──────┬──────┘           └────────┬────────┘
               │                           │
               │                  ┌────────▼─────────┐
               │                  │ Script automático│
               │                  │ • -3 pontos      │
               │                  │ • Alerta pastor  │
               │                  └────────┬─────────┘
               │                           │
               └──────────┬────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ Dia do culto chega    │
              └───────────┬───────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌─────────────────┐              ┌─────────────────────┐
│ COMPARECEU      │              │ NÃO COMPARECEU      │
│ (pastor marca)  │              │ (culto REALIZADO)   │
└────────┬────────┘              └──────────┬──────────┘
         │                                  │
         ▼                       ┌──────────▼──────────┐
┌─────────────────┐              │ Script automático   │
│ Sem penalidade  │              │ • -12 pontos mais   │
│ adicional       │              │ • Total: -15 pts    │
└─────────────────┘              │ • Notifica pastor   │
                                 └─────────────────────┘
```

## 🚀 Próximos Passos

### Para Produção:
1. ✅ Criar migration do banco de dados para adicionar `NAO_CONFIRMOU_PRAZO` ao enum
2. ⏳ Configurar cron job para executar scripts:
   - **A cada hora:** `processar_confirmacoes_pendentes()`
   - **Diariamente:** `processar_faltas_nao_avisadas()`
3. ⏳ Integrar endpoints no router principal
4. ⏳ Implementar interface no frontend para:
   - Exibir alertas de não confirmação
   - Mostrar penalidades aplicadas
   - Permitir pastor marcar manualmente faltas/comparecimentos

### Migration SQL Necessária:
```sql
-- Adicionar novo valor ao enum TipoPenalidade
ALTER TYPE tipopenalidade ADD VALUE IF NOT EXISTS 'NAO_CONFIRMOU_PRAZO';

-- Verificar se existe
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'tipopenalidade'::regtype;
```

## ✨ Benefícios da Implementação

1. **Justiça:** Penalidades graduais (leve por não confirmar, pesada por faltar)
2. **Automação:** Sistema processa tudo automaticamente
3. **Transparência:** Pastores recebem notificações em cada etapa
4. **Rastreabilidade:** Todas as penalidades ficam registradas
5. **Flexibilidade:** Pastor pode revisar e perdoar penalidades se justificado

## 📝 Notas Importantes

- ✅ Score é recalculado **automaticamente** a cada penalidade aplicada
- ✅ Penalidades são **cumulativas** (não substituem, somam)
- ✅ Sistema só aplica penalidade adicional se ainda não foi aplicada
- ✅ Pastores podem desativar penalidades injustas (campo `ativa=False`)
- ✅ Histórico completo mantido em `HistoricoScore`

---

**Data de Implementação:** 23/12/2024  
**Versão:** 2.0 - Sistema de Penalidades em Duas Etapas
