# 🚀 Guia de Implantação - Sistema de Penalidades v2.0

## ✅ Checklist de Implantação

### 1. Banco de Dados

#### 1.1. Executar Migration
```bash
cd backend
alembic upgrade head
```

Ou executar SQL manualmente:
```sql
-- Adicionar novo tipo de penalidade
ALTER TYPE tipopenalidade ADD VALUE IF NOT EXISTS 'NAO_CONFIRMOU_PRAZO';

-- Verificar se foi adicionado
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'tipopenalidade'::regtype
ORDER BY enumlabel;
```

**Resultado esperado:**
```
enumlabel
-------------------
ATRASO
CUSTOM
DESMARCACAO_48H
DESMARCACAO_SEM_TROCA
FALTA_SEM_AVISO
NAO_CONFIRMOU_PRAZO  ← NOVO
```

### 2. Configurar Execução Automática dos Scripts

#### 2.1. Opção 1: Cron Job (Linux)
```bash
# Editar crontab
crontab -e

# Adicionar as seguintes linhas:

# Processar confirmações pendentes (a cada hora)
0 * * * * cd /caminho/apostello/backend && python processar_confirmacoes_penalidades.py --confirmacoes >> /var/log/apostello/confirmacoes.log 2>&1

# Processar faltas (diariamente às 23h)
0 23 * * * cd /caminho/apostello/backend && python processar_confirmacoes_penalidades.py --faltas >> /var/log/apostello/faltas.log 2>&1
```

#### 2.2. Opção 2: Task Scheduler (Windows)
```powershell
# Confirmações (a cada hora)
$action = New-ScheduledTaskAction -Execute "python" -Argument "processar_confirmacoes_penalidades.py --confirmacoes" -WorkingDirectory "C:\apostello\backend"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName "Apostello-Confirmacoes" -Action $action -Trigger $trigger

# Faltas (diariamente às 23h)
$action2 = New-ScheduledTaskAction -Execute "python" -Argument "processar_confirmacoes_penalidades.py --faltas" -WorkingDirectory "C:\apostello\backend"
$trigger2 = New-ScheduledTaskTrigger -Daily -At "23:00"
Register-ScheduledTask -TaskName "Apostello-Faltas" -Action $action2 -Trigger $trigger2
```

#### 2.3. Opção 3: Systemd Timer (Linux - Recomendado)

**Arquivo: /etc/systemd/system/apostello-confirmacoes.service**
```ini
[Unit]
Description=Processar confirmações pendentes - Apostello

[Service]
Type=oneshot
User=apostello
WorkingDirectory=/caminho/apostello/backend
ExecStart=/usr/bin/python3 processar_confirmacoes_penalidades.py --confirmacoes
StandardOutput=journal
StandardError=journal
```

**Arquivo: /etc/systemd/system/apostello-confirmacoes.timer**
```ini
[Unit]
Description=Timer para processar confirmações - Apostello

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```

**Arquivo: /etc/systemd/system/apostello-faltas.service**
```ini
[Unit]
Description=Processar faltas - Apostello

[Service]
Type=oneshot
User=apostello
WorkingDirectory=/caminho/apostello/backend
ExecStart=/usr/bin/python3 processar_confirmacoes_penalidades.py --faltas
StandardOutput=journal
StandardError=journal
```

**Arquivo: /etc/systemd/system/apostello-faltas.timer**
```ini
[Unit]
Description=Timer para processar faltas - Apostello

[Timer]
OnCalendar=daily
OnCalendar=*-*-* 23:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

**Ativar os timers:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable apostello-confirmacoes.timer
sudo systemctl enable apostello-faltas.timer
sudo systemctl start apostello-confirmacoes.timer
sudo systemctl start apostello-faltas.timer

# Verificar status
sudo systemctl status apostello-confirmacoes.timer
sudo systemctl status apostello-faltas.timer
```

### 3. Atualizar Código do Backend

#### 3.1. Registrar Endpoints de Penalidades
**Arquivo: backend/app/api/v1/__init__.py**
```python
from app.api.v1.endpoints import penalidades

# Adicionar ao router
api_router.include_router(
    penalidades.router, 
    prefix="/penalidades", 
    tags=["penalidades"]
)
```

#### 3.2. Reiniciar Servidor
```bash
# Modo desenvolvimento
cd backend
uvicorn app.main:app --reload

# Modo produção (PM2)
pm2 restart apostello-backend

# Modo produção (Systemd)
sudo systemctl restart apostello-backend
```

### 4. Testes Pós-Implantação

#### 4.1. Testar Valores das Penalidades
```bash
cd backend
python test_penalidades_simples.py
```

**Saída esperada:**
```
✅ VALIDAÇÕES
✓ Tipo NAO_CONFIRMOU_PRAZO existe
✓ NAO_CONFIRMOU_PRAZO = -3 pontos
✓ FALTA_SEM_AVISO = -12 pontos
✓ Total falta completa = -15 pontos
🎉 TODOS OS TESTES PASSARAM!
```

#### 4.2. Testar Script Manual
```bash
cd backend

# Testar processamento de confirmações
python processar_confirmacoes_penalidades.py --confirmacoes

# Testar processamento de faltas
python processar_confirmacoes_penalidades.py --faltas
```

#### 4.3. Testar Endpoints
```bash
# Obter token de pastor
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "pastor@exemplo.com", "password": "senha123"}'

# Marcar falta de pregador
curl -X POST http://localhost:8000/api/v1/penalidades/itens/123/marcar-falta-pregador \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"motivo": "Teste de falta"}'
```

### 5. Monitoramento

#### 5.1. Logs
```bash
# Ver logs do cron
tail -f /var/log/apostello/confirmacoes.log
tail -f /var/log/apostello/faltas.log

# Ver logs do systemd
journalctl -u apostello-confirmacoes.service -f
journalctl -u apostello-faltas.service -f
```

#### 5.2. Verificar Penalidades no Banco
```sql
-- Ver penalidades aplicadas hoje
SELECT 
    p.id, 
    p.tipo, 
    p.valor_subtracao, 
    u.nome_completo as usuario,
    p.motivo,
    p.created_at
FROM penalidade p
JOIN usuario u ON p.usuario_id = u.id
WHERE DATE(p.created_at) = CURRENT_DATE
ORDER BY p.created_at DESC;

-- Contar penalidades por tipo (últimos 30 dias)
SELECT 
    tipo, 
    COUNT(*) as quantidade,
    SUM(valor_subtracao) as pontos_totais
FROM penalidade
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY tipo
ORDER BY quantidade DESC;

-- Ver scores recalculados hoje
SELECT 
    hs.usuario_id,
    u.nome_completo,
    hs.score_anterior,
    hs.score_novo,
    hs.motivo,
    hs.created_at
FROM historico_score hs
JOIN usuario u ON hs.usuario_id = u.id
WHERE DATE(hs.created_at) = CURRENT_DATE
AND hs.motivo = 'PENALIDADE_APLICADA'
ORDER BY hs.created_at DESC;
```

### 6. Rollback (Se Necessário)

#### 6.1. Desativar Scripts Automáticos
```bash
# Cron
crontab -e  # Comentar as linhas

# Systemd
sudo systemctl stop apostello-confirmacoes.timer
sudo systemctl stop apostello-faltas.timer
sudo systemctl disable apostello-confirmacoes.timer
sudo systemctl disable apostello-faltas.timer
```

#### 6.2. Reverter Penalidades Aplicadas (Opcional)
```sql
-- Ver penalidades NAO_CONFIRMOU_PRAZO aplicadas hoje
SELECT * FROM penalidade 
WHERE tipo = 'NAO_CONFIRMOU_PRAZO' 
AND DATE(created_at) = CURRENT_DATE;

-- Desativar penalidades (se necessário)
UPDATE penalidade 
SET ativa = false 
WHERE tipo = 'NAO_CONFIRMOU_PRAZO' 
AND DATE(created_at) = CURRENT_DATE;

-- Recalcular scores manualmente
-- (Executar script de recalculo ou chamar API)
```

## 📋 Checklist Final

- [ ] Migration executada com sucesso
- [ ] Enum `NAO_CONFIRMOU_PRAZO` existe no banco
- [ ] Scripts automáticos configurados (cron/systemd)
- [ ] Endpoints registrados no router
- [ ] Backend reiniciado
- [ ] Teste de valores passou
- [ ] Teste manual dos scripts funcionou
- [ ] Logs configurados e funcionando
- [ ] Monitoramento implementado
- [ ] Documentação atualizada no repositório

## 🆘 Troubleshooting

### Problema: Enum não aceita novo valor
**Solução:**
```sql
-- Verificar versão do PostgreSQL
SELECT version();

-- PostgreSQL < 9.1 não suporta ADD VALUE
-- Solução: Recriar o enum (mais complexo)
```

### Problema: Script não executa automaticamente
**Solução:**
```bash
# Verificar permissões
ls -la processar_confirmacoes_penalidades.py
chmod +x processar_confirmacoes_penalidades.py

# Verificar interpretador Python
which python3
head -1 processar_confirmacoes_penalidades.py  # Shebang correto?

# Testar manualmente
python3 processar_confirmacoes_penalidades.py --confirmacoes
```

### Problema: Penalidades não sendo aplicadas
**Solução:**
```python
# Verificar configuração do distrito
SELECT * FROM configuracao_distrito WHERE id = X;

# confirmacao_obrigatoria deve ser TRUE
# prazo_confirmacao_horas deve estar configurado

# Verificar status das escalas
SELECT status FROM escala WHERE id = X;
# Deve ser PUBLICADA

# Verificar data_publicacao
SELECT data_publicacao FROM escala WHERE id = X;
# Não pode ser NULL
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs em `/var/log/apostello/`
2. Consultar documentação em `SISTEMA_PENALIDADES.md`
3. Executar diagnóstico: `python diagnostico_penalidades.py` (criar se necessário)
4. Contatar equipe de desenvolvimento

---

**Versão:** 2.0  
**Data:** 23/12/2024  
**Responsável:** Backend Team
