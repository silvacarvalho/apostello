# 📸 Sistema de Confirmação Automática de Presença via Avaliações

## 🎯 Objetivo

Quando membros avaliam pregadores/cantores, o sistema **confirma automaticamente** que a pessoa **compareceu ao culto**, eliminando a necessidade de confirmação manual e revertendo penalidades aplicadas por não confirmação.

## 🔄 Fluxo Completo

### 1. Pregador é Escalado
```
Pregador João Silva escalado para 25/12/2024
Status Confirmação: PENDENTE
Prazo confirmação: 48h antes (23/12/2024 10h)
```

### 2. Pregador Não Confirma no Prazo
```
23/12/2024 11h - Script automático:
✓ Status: PENDENTE → NAO_CONFIRMADO
✓ Penalidade: -3 pontos (NAO_CONFIRMOU_PRAZO)
✓ Score: 85 → 82
✓ Pastor notificado
```

### 3. Culto é Realizado
```
25/12/2024 - Culto acontece
Pregador João comparece e prega
Status culto: REALIZADO
```

### 4. Membros Avaliam (CONFIRMAÇÃO AUTOMÁTICA)
```
Membro Maria Silva acessa app:
┌────────────────────────────────────────┐
│ Avaliar Culto - 25/12/2024            │
├────────────────────────────────────────┤
│ 📸 [Foto João Silva]                   │
│                                        │
│ PREGADOR: João Silva                   │
│                                        │
│ ❓ Esta pessoa é realmente quem        │
│    estava escalado para pregar?        │
│                                        │
│    ○ Sim  ○ Não                       │
│                                        │
│ ⭐ Conteúdo Bíblico: ★★★★★            │
│ ⭐ Comunicação: ★★★★☆                 │
│ ⭐ Tempo: ★★★★★                       │
│ ⭐ Impacto Espiritual: ★★★★★          │
│ ⭐ Avaliação Geral: ★★★★★             │
│                                        │
│ 💬 Comentário: (opcional)              │
│                                        │
│ [Enviar Avaliação]                     │
└────────────────────────────────────────┘

Membro confirma: "Sim"
```

### 5. Sistema Processa Automaticamente
```
✓ Avaliação registrada
✓ Status confirmação: NAO_CONFIRMADO → CONFIRMADO
✓ Penalidade revertida: -3 pts removidos
✓ Score recalculado: 82 → 85
✓ Pastor notificado: "Presença confirmada via avaliação"
```

## 📊 Estrutura de Dados

### Modelo Avaliacao (atualizado)

```python
class Avaliacao(Base):
    id: int
    item_escala_id: int
    avaliado_id: int
    avaliador_id: int
    tipo: TipoAvaliado  # PREGADOR | CANTOR
    
    # Critérios de avaliação (1-5 estrelas)
    criterio_1: int
    criterio_2: int
    criterio_3: int
    criterio_4: int
    criterio_5: int
    
    # NOVO: Confirmação de identidade
    confirmou_identidade: bool  # True = É a pessoa escalada
    
    comentario: str
    created_at: datetime
```

### Schema AvaliacaoCreate

```python
{
  "item_escala_id": 123,
  "avaliado_id": 456,
  "tipo": "PREGADOR",
  "criterio_1": 5,  # Conteúdo Bíblico
  "criterio_2": 4,  # Comunicação
  "criterio_3": 5,  # Tempo
  "criterio_4": 5,  # Impacto Espiritual
  "criterio_5": 5,  # Avaliação Geral
  "confirmou_identidade": true,  # 👈 NOVO
  "comentario": "Excelente pregação!"
}
```

## 🎨 Interface do Usuário (Frontend)

### Endpoint: GET /api/v1/avaliacoes/pendentes

**Resposta:**
```json
[
  {
    "item_id": 123,
    "escala_id": 45,
    "data_culto": "2024-12-25T19:00:00",
    "igreja_id": 10,
    "igreja_nome": "Igreja Central",
    "pregador": {
      "id": 456,
      "nome_completo": "João Silva",
      "foto_perfil": "/uploads/perfil/joao_silva.jpg",
      "tipo": "PREGADOR"
    },
    "cantor": {
      "id": 789,
      "nome_completo": "Maria Santos",
      "foto_perfil": "/uploads/perfil/maria_santos.jpg",
      "tipo": "CANTOR"
    }
  }
]
```

### Componente React (Exemplo)

```typescript
interface AvaliacaoPendente {
  item_id: number;
  data_culto: string;
  igreja_nome: string;
  pregador?: {
    id: number;
    nome_completo: string;
    foto_perfil: string;
  };
  cantor?: {
    id: number;
    nome_completo: string;
    foto_perfil: string;
  };
}

function FormularioAvaliacao({ item }: { item: AvaliacaoPendente }) {
  const [confirmouIdentidade, setConfirmouIdentidade] = useState(true);
  const [criterios, setCriterios] = useState([5, 5, 5, 5, 5]);
  
  return (
    <form onSubmit={enviarAvaliacao}>
      {/* Foto do Pregador */}
      {item.pregador && (
        <div className="avaliado-card">
          <img 
            src={item.pregador.foto_perfil || '/default-avatar.png'} 
            alt={item.pregador.nome_completo}
            className="foto-perfil-grande"
          />
          <h3>{item.pregador.nome_completo}</h3>
          
          {/* Pergunta de Confirmação */}
          <div className="confirmacao-identidade">
            <p>❓ Esta pessoa é realmente quem estava escalado para pregar?</p>
            <label>
              <input 
                type="radio" 
                checked={confirmouIdentidade}
                onChange={() => setConfirmouIdentidade(true)}
              />
              Sim
            </label>
            <label>
              <input 
                type="radio" 
                checked={!confirmouIdentidade}
                onChange={() => setConfirmouIdentidade(false)}
              />
              Não
            </label>
          </div>
          
          {/* Critérios de Avaliação */}
          <RatingStars 
            label="⭐ Conteúdo Bíblico" 
            value={criterios[0]}
            onChange={(v) => setCriterios([v, ...criterios.slice(1)])}
          />
          {/* ... outros critérios */}
        </div>
      )}
      
      <button type="submit">Enviar Avaliação</button>
    </form>
  );
}
```

## 🔧 Lógica de Processamento

### AvaliacaoService._processar_confirmacao_automatica()

```python
def _processar_confirmacao_automatica(item, tipo, avaliado_id):
    """
    1. Verifica se status é NAO_CONFIRMADO
    2. Atualiza para CONFIRMADO
    3. Busca penalidade NAO_CONFIRMOU_PRAZO ativa
    4. Desativa penalidade
    5. Reverte pontos no score
    6. Notifica pastor
    """
    
    if tipo == PREGADOR and item.pregador_id == avaliado_id:
        if item.status_confirmacao_pregador == NAO_CONFIRMADO:
            # Confirmar presença
            item.status_confirmacao_pregador = CONFIRMADO
            item.data_confirmacao_pregador = now()
            
            # Reverter penalidade
            penalidade = buscar_penalidade_nao_confirmou(avaliado_id, item.id)
            if penalidade:
                penalidade.ativa = False
                penalidade.motivo += " - REVERTIDA: Confirmado via avaliação"
                
                # Recalcular score (+3 pontos de volta)
                score_anterior = usuario.score_atual  # 82
                novo_score = score_anterior + 3        # 85
                atualizar_score(usuario, novo_score)
            
            # Notificar pastor
            notificar_pastor(
                "✅ Presença Confirmada Automaticamente",
                f"{nome} teve presença confirmada através de avaliação"
            )
```

## 📱 Casos de Uso

### Caso 1: Confirmação Positiva (Pessoa Correta)
```
1. Membro avalia pregador
2. Confirma identidade: SIM
3. Sistema:
   ✓ Marca presença como CONFIRMADA
   ✓ Reverte penalidade -3 pts
   ✓ Score: 82 → 85
   ✓ Notifica pastor
```

### Caso 2: Confirmação Negativa (Pessoa Errada)
```
1. Membro avalia
2. Confirma identidade: NÃO
3. Sistema:
   ✓ Registra avaliação normalmente
   ✗ NÃO confirma presença
   ✗ NÃO reverte penalidade
   ✓ Pastor recebe alerta: "Membro indicou pessoa diferente"
```

### Caso 3: Múltiplas Avaliações
```
Pregador João recebe 3 avaliações:
- Membro 1: confirmou_identidade = true
- Membro 2: confirmou_identidade = true  
- Membro 3: confirmou_identidade = true

Sistema:
✓ Primeira avaliação confirma presença
✓ Demais avaliações apenas calculam score
✓ Penalidade revertida apenas uma vez
```

## 🚨 Prevenção de Fraudes

### Validações Implementadas

1. **Apenas membros da igreja podem avaliar**
   ```python
   if avaliador.tipo != MEMBRO:
       raise ForbiddenException("Apenas membros podem avaliar")
   
   if avaliador.igreja_id != item.igreja_id:
       raise ForbiddenException("Só pode avaliar cultos da sua igreja")
   ```

2. **Não pode avaliar duas vezes**
   ```python
   existing = db.query(Avaliacao).filter(
       item_escala_id == item_id,
       avaliado_id == avaliado_id,
       avaliador_id == current_user.id
   ).first()
   
   if existing:
       raise BadRequestException("Você já avaliou esta pessoa")
   ```

3. **Só pode avaliar cultos realizados**
   ```python
   if item.status_realizacao != REALIZADO:
       raise BadRequestException("Só pode avaliar cultos realizados")
   ```

4. **Prazo de avaliação limitado**
   ```python
   prazo_dias = config.prazo_avaliacao_dias  # ex: 7 dias
   data_limite = item.data_culto + timedelta(days=prazo_dias)
   
   if date.today() > data_limite:
       raise BadRequestException("Prazo de avaliação expirado")
   ```

## 📊 Relatórios e Métricas

### Taxa de Confirmação via Avaliação
```sql
SELECT 
    COUNT(DISTINCT a.item_escala_id) as cultos_avaliados,
    COUNT(DISTINCT CASE WHEN a.confirmou_identidade = true 
                        THEN a.item_escala_id END) as confirmacoes_positivas,
    ROUND(
        COUNT(DISTINCT CASE WHEN a.confirmou_identidade = true 
                            THEN a.item_escala_id END)::numeric / 
        COUNT(DISTINCT a.item_escala_id) * 100, 
        2
    ) as taxa_confirmacao
FROM avaliacao a
WHERE a.created_at >= NOW() - INTERVAL '30 days';
```

### Penalidades Revertidas
```sql
SELECT 
    u.nome_completo,
    COUNT(*) as penalidades_revertidas,
    SUM(p.valor_subtracao) as pontos_recuperados
FROM penalidade p
JOIN usuario u ON p.usuario_id = u.id
WHERE p.tipo = 'NAO_CONFIRMOU_PRAZO'
AND p.ativa = false
AND p.motivo LIKE '%REVERTIDA%'
GROUP BY u.id, u.nome_completo
ORDER BY pontos_recuperados DESC;
```

## 🎓 Benefícios do Sistema

1. **✅ Automação Total**
   - Elimina confirmação manual
   - Pastores não precisam marcar presença
   - Processo natural através das avaliações

2. **✅ Justiça**
   - Penalidades revertidas automaticamente
   - Apenas quem realmente faltou é penalizado
   - Transparência total

3. **✅ Engajamento**
   - Membros participam ativamente
   - Avaliações têm duplo propósito:
     * Feedback de qualidade
     * Confirmação de presença

4. **✅ Segurança**
   - Foto do perfil previne confusões
   - Pergunta explícita de confirmação
   - Múltiplas validações

5. **✅ Rastreabilidade**
   - Todas as confirmações registradas
   - Histórico completo de score
   - Auditoria de penalidades

## 📝 Migrations Necessárias

```sql
-- 1. Adicionar enum NAO_CONFIRMOU_PRAZO
ALTER TYPE tipopenalidade ADD VALUE IF NOT EXISTS 'NAO_CONFIRMOU_PRAZO';

-- 2. Adicionar campo confirmou_identidade
ALTER TABLE avaliacao 
ADD COLUMN confirmou_identidade BOOLEAN NOT NULL DEFAULT true;
```

## 🚀 Próximos Passos

1. ✅ Executar migrations no banco
2. ⏳ Implementar interface no frontend
3. ⏳ Criar componente de foto de perfil
4. ⏳ Adicionar validação de foto obrigatória para pregadores/cantores
5. ⏳ Criar dashboard de métricas de confirmação

---

**Versão:** 3.0 - Confirmação Automática via Avaliações  
**Data:** 23/12/2024
