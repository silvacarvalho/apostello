# Geração Automática de Escala - Cobertura Completa do Distrito

## ✅ GARANTIA DE PROCESSAMENTO DE TODAS AS IGREJAS

O algoritmo de geração automática **processa TODAS as igrejas ativas do distrito**, aplicando todas as regras configuradas.

### Como Funciona

#### 1. **Busca de Igrejas** (Linha 103-108)
```python
igrejas = db.query(Igreja).filter(
    Igreja.distrito_id == distrito_id,
    Igreja.ativo == True
).all()
```
- Busca **TODAS** as igrejas ativas do distrito
- Nenhuma igreja é excluída do processo

#### 2. **Iteração sobre Todas as Igrejas** (Linha 147)
```python
for igreja in igrejas:
```
- O algoritmo **itera sobre cada igreja** encontrada
- Para cada igreja, o processo completo é executado

#### 3. **Horários Específicos por Igreja** (Linha 149-153)
```python
horarios_dia = [
    h for h in horarios_cultos
    if h["dia_semana"] == dia_semana_pt and h["igreja_id"] == igreja.id
]
```
- Cada igreja usa seus **horários de culto específicos**
- Se a igreja não tem horários próprios, usa os **horários do distrito** (padrão)

#### 4. **Seleção de Pregador com Todas as Regras** (Linha 155-177)
Para cada horário de cada igreja:
- **1ª tentativa**: Seleciona pregador **evitando semanas consecutivas** na mesma igreja
- **2ª tentativa (fallback)**: Se não houver pregador disponível, **relaxa a regra** de semanas consecutivas
- Aplica **todas as validações**:
  - ✅ Indisponibilidades
  - ✅ Conflito de múltiplas igrejas no mesmo dia
  - ✅ Limite mensal de pregações (configurável por distrito/pregador)
  - ✅ Score efetivo com pesos configuráveis

---

## 📊 RASTREAMENTO E VALIDAÇÃO

### Logging Detalhado

O sistema agora registra:

```python
logger.info(f"Total de igrejas: {len(igrejas)}")
logger.info(f"Total de pregadores disponíveis: {len(pregadores_list)}")

# Para cada pregação criada:
logger.debug(f"Pregação criada: Igreja={igreja.nome}, Data={data_pregacao}, 
              Pregador={usuario.nome}, Horário={horario['horario']}")

# Para horários sem pregador disponível:
logger.warning(f"Nenhum pregador disponível: Igreja={igreja.nome}, 
                Data={data_pregacao}, Horário={horario['horario']}")
```

### Relatório de Geração

Após gerar a escala, o sistema retorna:

```json
{
  "escala": { ... },
  "relatorio": {
    "escala_id": "uuid",
    "total_igrejas": 5,
    "total_pregacoes": 60,
    "total_horarios_sem_pregador": 2,
    "igrejas_sem_pregacao": ["Igreja Central"],
    "estatisticas_por_igreja": [
      {
        "igreja_id": "uuid",
        "igreja_nome": "Igreja do Bairro A",
        "pregacoes_criadas": 12,
        "horarios_sem_pregador": 0
      },
      ...
    ]
  }
}
```

### Validação Automática

O algoritmo identifica automaticamente:

```python
igrejas_sem_pregacao = [
    stats["nome"] for stats in estatisticas_geracao.values()
    if stats["pregacoes_criadas"] == 0
]

if igrejas_sem_pregacao:
    logger.warning(
        f"ATENÇÃO: Igrejas sem nenhuma pregação gerada: {', '.join(igrejas_sem_pregacao)}"
    )
```

---

## 🎯 PRIORIZAÇÃO E REGRAS

### Ordem de Processamento

1. **Prioridade por Dia da Semana**: Sábado → Domingo → Quarta
   - Garante que pregadores com maior score sejam escalados primeiro para os sábados

2. **Prioridade por Score Efetivo**: 
   ```python
   score_efetivo = (
       av * pesos["avaliacoes"] + 
       fr * pesos["frequencia"] + 
       pt * pesos["pontualidade"]
   )
   ```
   - Pesos configuráveis por distrito (padrão: 0.6 / 0.25 / 0.15)

### Regras Aplicadas a TODAS as Igrejas

✅ **Indisponibilidade**: Pregador não pode ser escalado em período de indisponibilidade

✅ **Múltiplas Igrejas no Mesmo Dia**: Pregador não pode pregar em mais de uma igreja no mesmo dia
```python
conflito = db.query(Pregacao).filter(
    Pregacao.pregador_id == usuario.id,
    Pregacao.data_pregacao == data_pregacao,
    Pregacao.igreja_id != igreja_id
).first()
```

✅ **Semanas Consecutivas**: Pregador evita pregar na mesma igreja em semanas consecutivas
```python
data_semana_anterior = data_pregacao - timedelta(days=7)
ultima_pregacao = db.query(Pregacao).filter(
    Pregacao.pregador_id == usuario.id,
    Pregacao.igreja_id == igreja_id,
    Pregacao.data_pregacao == data_semana_anterior
).first()
```
- **Com fallback**: Se não houver alternativa, permite semanas consecutivas

✅ **Limite Mensal**: Respeita limite de pregações por mês
```python
limite_efetivo = perfil.max_pregacoes_mes OR limite_default_distrito
```

---

## 🔍 CENÁRIOS POSSÍVEIS

### ✅ Cenário Ideal
- **Todas as igrejas** têm horários cadastrados
- **Pregadores suficientes** disponíveis
- **Resultado**: 100% de cobertura

### ⚠️ Cenário com Limitações
- Igreja sem horários cadastrados → **Nenhuma pregação criada**
  - Solução: Cadastrar horários de culto específicos ou usar horários do distrito
  
- Poucos pregadores disponíveis → **Alguns horários não preenchidos**
  - Solução: Recrutar mais pregadores ou ajustar limites mensais
  
- Todos pregadores atingiram limite mensal → **Horários não preenchidos**
  - Solução: Aumentar limite mensal configurável

### 🎯 O Que o Pastor/Líder Vê

Ao gerar a escala, aparece um **relatório completo**:

```
✅ Escala gerada com sucesso!

📊 RESUMO:
• Total de igrejas: 5
• Pregações criadas: 60

📋 DETALHES POR IGREJA:
  • Igreja Central: 15 pregações
  • Igreja Bairro A: 12 pregações
  • Igreja Bairro B: 12 pregações
  • Capela Rural: 8 pregações
  • Congregação: 13 pregações
```

---

## 🚀 COMO USAR

### 1. Configurar o Distrito

```sql
-- Pesos do Score (opcional - padrão já aplicado)
INSERT INTO configuracoes (distrito_id, chave, valor)
VALUES ('uuid-distrito', 'peso_score_avaliacoes', '0.6');

INSERT INTO configuracoes (distrito_id, chave, valor)
VALUES ('uuid-distrito', 'peso_score_frequencia', '0.25');

INSERT INTO configuracoes (distrito_id, chave, valor)
VALUES ('uuid-distrito', 'peso_score_pontualidade', '0.15');

-- Limite mensal padrão (opcional - padrão 4)
INSERT INTO configuracoes (distrito_id, chave, valor)
VALUES ('uuid-distrito', 'max_pregacoes_mes_default', '5');
```

### 2. Cadastrar Horários de Culto

**Por Distrito** (aplica a todas igrejas):
```sql
INSERT INTO horarios_cultos (distrito_id, dia_semana, horario, nome_culto, requer_pregador)
VALUES ('uuid-distrito', 'sabado', '09:00', 'Escola Sabatina', true);
```

**Por Igreja** (sobrescreve padrão do distrito):
```sql
INSERT INTO horarios_cultos (igreja_id, dia_semana, horario, nome_culto, requer_pregador)
VALUES ('uuid-igreja', 'sabado', '10:00', 'Culto Divino', true);
```

### 3. Gerar Escala

**Frontend**:
1. Acessar "Escalas"
2. Clicar em "Gerar Escala"
3. Selecionar Distrito, Mês e Ano
4. Clicar em "Gerar"
5. Visualizar relatório completo

**API**:
```bash
POST /api/v1/escalas/gerar
{
  "distrito_id": "uuid",
  "mes_referencia": 2,
  "ano_referencia": 2025
}
```

### 4. Consultar Relatório (depois)

```bash
GET /api/v1/escalas/{escala_id}/relatorio
```

---

## 📝 CONCLUSÃO

✅ **O sistema JÁ PROCESSA todas as igrejas do distrito**

✅ **Aplica TODAS as regras configuradas**

✅ **Fornece RASTREAMENTO COMPLETO** da geração

✅ **Identifica AUTOMATICAMENTE** igrejas sem cobertura

✅ **Permite AJUSTES MANUAIS** em escala rascunho

O Pastor Distrital ou Líder Distrital tem **total controle e visibilidade** sobre o processo de geração de escala para todo o distrito.
