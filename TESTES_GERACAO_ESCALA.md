# Testes de Geração de Escala - Cobertura de Distrito

## 🧪 CENÁRIOS DE TESTE

### Teste 1: Geração Normal (Cenário Ideal)

**Configuração**:
- Distrito com 3 igrejas ativas
- 10 pregadores disponíveis
- Horários cadastrados para todas igrejas
- Mês de fevereiro/2025 (4 semanas)

**Dados**:
```sql
-- Igrejas
Igreja A: Sábado 09:00, Sábado 19:00, Quarta 19:30
Igreja B: Sábado 09:00, Domingo 09:00
Igreja C: Domingo 19:00

-- Pregadores (score efetivo)
Pr. João: 9.5
Pr. Maria: 8.8
Pr. Pedro: 8.2
Pr. Ana: 7.9
Pr. Lucas: 7.5
... (mais 5 pregadores)

-- Limite mensal: 4 pregações/pregador
```

**Resultado Esperado**:
```
✅ Escala gerada com sucesso!

📊 RESUMO:
• Total de igrejas: 3
• Pregações criadas: 30
• Horários sem pregador: 0

📋 DETALHES POR IGREJA:
  • Igreja A: 12 pregações (4 sáb manhã + 4 sáb tarde + 4 qua)
  • Igreja B: 8 pregações (4 sáb + 4 dom)
  • Igreja C: 4 pregações (4 dom tarde)
```

**Validações**:
- ✅ Todas as igrejas receberam pregações
- ✅ Nenhum pregador excedeu limite de 4 pregações/mês
- ✅ Nenhum pregador em múltiplas igrejas no mesmo dia
- ✅ Pregadores com maior score nos sábados pela manhã

---

### Teste 2: Igreja Sem Horários Cadastrados

**Configuração**:
- Distrito com 2 igrejas
- Igreja A: COM horários cadastrados
- Igreja B: SEM horários cadastrados

**Resultado Esperado**:
```
✅ Escala gerada com sucesso!

📊 RESUMO:
• Total de igrejas: 2
• Pregações criadas: 8
• Horários sem pregador: 0

⚠️ IGREJAS SEM PREGAÇÃO:
  • Igreja B

📋 DETALHES POR IGREJA:
  • Igreja A: 8 pregações
  • Igreja B: 0 pregações
```

**Ação Corretiva**:
```sql
-- Opção 1: Cadastrar horário específico da igreja
INSERT INTO horarios_cultos (igreja_id, dia_semana, horario, nome_culto, requer_pregador)
VALUES ('uuid-igreja-b', 'sabado', '09:00', 'Culto Divino', true);

-- Opção 2: Cadastrar horário padrão do distrito (aplica a todas)
INSERT INTO horarios_cultos (distrito_id, dia_semana, horario, nome_culto, requer_pregador)
VALUES ('uuid-distrito', 'sabado', '09:00', 'Culto Divino', true);
```

---

### Teste 3: Poucos Pregadores Disponíveis

**Configuração**:
- Distrito com 3 igrejas
- Total de horários: 20/mês
- Apenas 3 pregadores disponíveis
- Limite: 4 pregações/pregador
- Capacidade máxima: 3 × 4 = 12 pregações

**Resultado Esperado**:
```
⚠️ Escala gerada com sucesso (com restrições)

📊 RESUMO:
• Total de igrejas: 3
• Pregações criadas: 12
• ⚠️ Horários sem pregador: 8

📋 DETALHES POR IGREJA:
  • Igreja A: 6 pregações (2 horários não preenchidos)
  • Igreja B: 4 pregações (2 horários não preenchidos)
  • Igreja C: 2 pregações (4 horários não preenchidos)
```

**Ação Corretiva**:
```sql
-- Opção 1: Recrutar mais pregadores
-- Opção 2: Aumentar limite mensal
UPDATE configuracoes 
SET valor = '6' 
WHERE distrito_id = 'uuid-distrito' 
  AND chave = 'max_pregacoes_mes_default';

-- Opção 3: Editar manualmente em rascunho
POST /api/v1/escalas/{escala_id}/pregacoes
{
  "igreja_id": "uuid",
  "pregador_id": "uuid",
  "data_pregacao": "2025-02-15",
  "horario_pregacao": "09:00",
  "nome_culto": "Culto Divino"
}
```

---

### Teste 4: Pregador com Indisponibilidade

**Configuração**:
- Pr. João (score 9.5) indisponível de 08/02 a 15/02
- Igreja A precisa pregador para 08/02 e 15/02

**Comportamento**:
```python
# Pr. João é o mais qualificado, mas está indisponível
# Sistema automaticamente seleciona próximo disponível:
# Pr. Maria (score 8.8) → Escalada para 08/02 e 15/02
```

**Resultado Esperado**:
- ✅ Pr. João NÃO escalado nas datas de indisponibilidade
- ✅ Pr. Maria escalada automaticamente
- ✅ Pr. João escalado normalmente em outras datas

**SQL para Criar Indisponibilidade**:
```sql
INSERT INTO periodos_indisponibilidade (pregador_id, data_inicio, data_fim, motivo)
VALUES ('uuid-pr-joao', '2025-02-08', '2025-02-15', 'Férias');
```

---

### Teste 5: Evitar Semanas Consecutivas

**Configuração**:
- Igreja A: Sábados de fevereiro (1, 8, 15, 22)
- Pr. João (score 9.5) disponível

**Comportamento (1ª Tentativa - Evitar Consecutivo)**:
```
Sáb 01/02: Pr. João ✅
Sáb 08/02: Pr. Maria ✅ (evita João da semana anterior)
Sáb 15/02: Pr. Pedro ✅ (evita Maria da semana anterior)
Sáb 22/02: Pr. Ana ✅ (evita Pedro da semana anterior)
```

**Comportamento (Fallback - Sem Pregadores Disponíveis)**:
Se todos os pregadores atingiram limite mensal ou estão indisponíveis:
```
Sáb 01/02: Pr. João ✅
Sáb 08/02: Pr. João ✅ (sem alternativa, permite consecutivo)
Sáb 15/02: Pr. João ✅
Sáb 22/02: Pr. João ✅
```

---

### Teste 6: Múltiplas Igrejas no Mesmo Dia (BLOQUEIO)

**Configuração**:
- Igreja A: Sábado 09:00
- Igreja B: Sábado 19:00
- Pr. João escalado para Igreja A às 09:00

**Comportamento**:
```python
# Sistema verifica conflito para Igreja B às 19:00
conflito = db.query(Pregacao).filter(
    Pregacao.pregador_id == 'pr-joao',
    Pregacao.data_pregacao == '2025-02-01',
    Pregacao.igreja_id != 'igreja-b'  # Igreja A
).first()

# conflito encontrado → Pr. João NÃO pode ser escalado
# Sistema seleciona Pr. Maria para Igreja B
```

**Resultado Esperado**:
- ✅ Sáb 01/02 09:00 Igreja A: Pr. João
- ✅ Sáb 01/02 19:00 Igreja B: Pr. Maria (outro pregador)

**Tentativa de Edição Manual**:
```bash
PUT /api/v1/escalas/{escala_id}/pregacoes/{pregacao_id}
{
  "pregador_id": "pr-joao"  # Já escalado em Igreja A no mesmo dia
}

# Resposta: 400 Bad Request
# "Pregador já escalado em outra igreja neste dia"
```

---

### Teste 7: Limite Mensal Individual vs. Padrão

**Configuração**:
- Limite padrão do distrito: 4 pregações/mês
- Pr. João: Limite individual de 6 pregações/mês
- Pr. Maria: Sem limite individual (usa padrão de 4)

**SQL**:
```sql
-- Configuração de distrito
INSERT INTO configuracoes (distrito_id, chave, valor)
VALUES ('uuid-distrito', 'max_pregacoes_mes_default', '4');

-- Limite individual de Pr. João
UPDATE perfil_pregador 
SET max_pregacoes_mes = 6 
WHERE usuario_id = 'uuid-pr-joao';
```

**Resultado Esperado**:
```
Pr. João: até 6 pregações no mês ✅
Pr. Maria: até 4 pregações no mês ✅
Outros pregadores: até 4 pregações (padrão) ✅
```

---

## 🔍 COMO TESTAR MANUALMENTE

### 1. Preparar Ambiente de Teste

```sql
-- Criar distrito de teste
INSERT INTO distritos (id, nome, associacao_id, ativo)
VALUES (gen_random_uuid(), 'Distrito Teste', 'uuid-associacao', true);

-- Criar 3 igrejas
INSERT INTO igrejas (id, nome, distrito_id, ativo)
VALUES 
  (gen_random_uuid(), 'Igreja A', 'uuid-distrito-teste', true),
  (gen_random_uuid(), 'Igreja B', 'uuid-distrito-teste', true),
  (gen_random_uuid(), 'Igreja C', 'uuid-distrito-teste', true);

-- Criar horários de culto
INSERT INTO horarios_cultos (igreja_id, dia_semana, horario, nome_culto, requer_pregador, ativo)
VALUES
  ('uuid-igreja-a', 'sabado', '09:00', 'Culto Divino', true, true),
  ('uuid-igreja-a', 'quarta', '19:30', 'Culto de Oração', true, true),
  ('uuid-igreja-b', 'sabado', '09:00', 'Culto Divino', true, true),
  ('uuid-igreja-c', 'domingo', '19:00', 'Culto Jovem', true, true);

-- Criar pregadores de teste
-- (requer criação de usuários + perfil_pregador com scores)
```

### 2. Executar Geração

```bash
# Via API
curl -X POST http://localhost:8000/api/v1/escalas/gerar \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "distrito_id": "uuid-distrito-teste",
    "mes_referencia": 2,
    "ano_referencia": 2025
  }'
```

### 3. Verificar Relatório

```bash
# Consultar relatório
curl http://localhost:8000/api/v1/escalas/{escala_id}/relatorio \
  -H "Authorization: Bearer <token>"
```

### 4. Analisar Logs do Backend

```bash
# PowerShell
Get-Content backend/logs/app.log | Select-String "Geração concluída"
Get-Content backend/logs/app.log | Select-String "Igreja:"
Get-Content backend/logs/app.log | Select-String "ATENÇÃO"
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Após gerar a escala, verificar:

- [ ] **Todas as igrejas processadas**: `total_igrejas` = número de igrejas ativas
- [ ] **Pregações criadas**: `total_pregacoes` > 0
- [ ] **Cobertura completa**: `igrejas_sem_pregacao` = []
- [ ] **Nenhum conflito de dia**: Nenhum pregador em múltiplas igrejas no mesmo dia
- [ ] **Limites respeitados**: Nenhum pregador excede seu limite mensal
- [ ] **Indisponibilidades**: Pregadores não escalados em períodos de indisponibilidade
- [ ] **Priorização**: Pregadores com maior score nos sábados
- [ ] **Horários corretos**: Cada pregação criada no horário cadastrado da igreja

---

## 🐛 TROUBLESHOOTING

### Problema: Igreja sem pregações

**Possíveis causas**:
1. Igreja sem horários cadastrados
2. Todos pregadores atingiram limite mensal
3. Todos pregadores indisponíveis nas datas

**Diagnóstico**:
```sql
-- Verificar horários da igreja
SELECT * FROM horarios_cultos 
WHERE igreja_id = 'uuid-igreja' 
  AND ativo = true 
  AND requer_pregador = true;

-- Verificar pregadores disponíveis
SELECT u.nome_completo, pp.max_pregacoes_mes
FROM usuarios u
JOIN perfil_pregador pp ON u.id = pp.usuario_id
WHERE u.distrito_id = 'uuid-distrito'
  AND u.ativo = true
  AND pp.ativo = true;
```

### Problema: Muitos horários sem pregador

**Possíveis causas**:
1. Poucos pregadores no distrito
2. Limite mensal muito baixo
3. Muitas indisponibilidades

**Solução**:
```sql
-- Aumentar limite mensal padrão
UPDATE configuracoes 
SET valor = '6' 
WHERE distrito_id = 'uuid-distrito' 
  AND chave = 'max_pregacoes_mes_default';

-- Aumentar limite de pregador específico
UPDATE perfil_pregador 
SET max_pregacoes_mes = 8 
WHERE usuario_id = 'uuid-pregador';
```

### Problema: Pregador escalado em semanas consecutivas

**Comportamento esperado**: 
- Sistema TENTA evitar, mas permite se não houver alternativa (fallback)

**Se indesejado**:
- Recrutar mais pregadores
- Aumentar limites mensais
- Editar manualmente em rascunho
