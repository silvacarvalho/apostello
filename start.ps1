# ============================================
# Script de inicialização do Apostello
# ============================================
# Este script inicia o backend (FastAPI) e frontend (Next.js) simultaneamente

# CONFIGURAÇÕES AUTOMÁTICAS POR VERSÃO DO WINDOWS
$windowsVersion = [System.Environment]::OSVersion.Version
$buildNumber = $windowsVersion.Build

# Windows 11 tem build 22000 ou superior, Windows 10 tem build inferior
if ($buildNumber -ge 22000) {
    $BACKEND_PORT = 8002  # Windows 11 (8000 = servico WCF do Windows, 8001 = Laravel/Herd)
    $OS_NAME = "Windows 11"
} else {
    $BACKEND_PORT = 8000  # Windows 10
    $OS_NAME = "Windows 10"
}

$FRONTEND_PORT = 3000

Write-Host "Iniciando Apostello..." -ForegroundColor Green
Write-Host "Sistema detectado: $OS_NAME (Build $buildNumber)" -ForegroundColor Gray
Write-Host "Porta do Backend: $BACKEND_PORT" -ForegroundColor Gray
Write-Host ""

# Verificar se estamos no diretório correto
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# ============================================
# LIMPEZA DE PORTAS
# ============================================
# Encerra qualquer processo que ainda esteja escutando nas portas usadas.
#
# Por que isso e necessario: fechar a janela do terminal NAO mata o worker
# que o uvicorn cria via multiprocessing.spawn. Ele fica orfao segurando a
# porta, e a linha de comando dele nao contem "uvicorn" nem "app.main", o
# que o torna invisivel para buscas por nome. Pior: o Windows deixa um novo
# servidor fazer bind na mesma porta sem erro, mas quem responde continua
# sendo o listener antigo -- ou seja, o servidor novo sobe "com sucesso" e
# serve codigo desatualizado.

function Test-PortInUse {
    param([int]$Port)

    # Sinal principal: alguem aceita conexao nessa porta? Detecta o listener
    # antigo mesmo quando o Windows permite bind duplicado -- e permite: o
    # teste de bind sozinho reporta a porta como livre e engana o script.
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        if ($async.AsyncWaitHandle.WaitOne(400)) {
            $client.EndConnect($async)
            return $true
        }
    } catch {
        # conexao recusada = ninguem escutando
    } finally {
        $client.Close()
    }

    # Sinal secundario: bind exclusivo falha se a porta estiver reservada
    # por um socket que nao chega a aceitar conexoes.
    $listener = $null
    try {
        $listener = New-Object -TypeName System.Net.Sockets.TcpListener -ArgumentList @([System.Net.IPAddress]::Any, $Port)
        $listener.ExclusiveAddressUse = $true
        $listener.Start()
        return $false
    } catch {
        return $true
    } finally {
        if ($listener) { try { $listener.Stop() } catch {} }
    }
}

function Get-ProtectedPids {
    # Nunca encerrar: System Idle (0), System (4), este script e seus ancestrais
    $protected = @(0, 4, $PID)
    $current = $PID
    for ($i = 0; $i -lt 12; $i++) {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$current" -ErrorAction SilentlyContinue
        if (-Not $proc) { break }
        $parent = [int]$proc.ParentProcessId
        if ($parent -le 0) { break }
        $protected += $parent
        $current = $parent
    }
    return $protected
}

function Stop-Listener {
    param([int]$TargetPid, [int[]]$Protected)

    if ($Protected -contains $TargetPid) { return }
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$TargetPid" -ErrorAction SilentlyContinue
    if (-Not $proc) { return }
    Write-Host "   encerrando PID $TargetPid ($($proc.Name))" -ForegroundColor DarkGray
    Stop-Process -Id $TargetPid -Force -ErrorAction SilentlyContinue
}

function Clear-Port {
    param([int]$Port, [string]$Label, [string]$ProjectPath)

    if (-Not (Test-PortInUse -Port $Port)) {
        Write-Host "Porta $Port livre ($Label)" -ForegroundColor DarkGray
        return $true
    }

    Write-Host "Porta $Port ocupada ($Label) - liberando..." -ForegroundColor Yellow
    $protected = Get-ProtectedPids

    # 1) PIDs registrados como donos do listener (podem ja estar mortos)
    $ownerPids = @()
    try {
        $ownerPids = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
                       Select-Object -ExpandProperty OwningProcess -Unique)
    } catch {}
    foreach ($ownerPid in $ownerPids) {
        Stop-Listener -TargetPid ([int]$ownerPid) -Protected $protected
    }

    # 2) Workers orfaos do uvicorn: filhos (multiprocessing.spawn) dos donos acima.
    #    O parent_pid vem na propria linha de comando do worker.
    if ($ownerPids.Count -gt 0) {
        $workers = Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue |
                   Where-Object { $_.CommandLine -and $_.CommandLine -like '*multiprocessing.spawn*' }
        foreach ($w in $workers) {
            if ($w.CommandLine -match 'parent_pid=(\d+)') {
                if ($ownerPids -contains [int]$Matches[1]) {
                    Stop-Listener -TargetPid ([int]$w.ProcessId) -Protected $protected
                }
            }
        }
    }

    # 3) Sobras deste projeto que ainda referenciam a porta. O filtro exige o
    #    caminho do projeto, entao servidores de outros projetos nao sao tocados.
    $leftovers = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
                 Where-Object {
                     $_.CommandLine -and
                     $_.CommandLine -like "*$ProjectPath*" -and
                     $_.CommandLine -like "*$Port*"
                 }
    foreach ($l in $leftovers) {
        Stop-Listener -TargetPid ([int]$l.ProcessId) -Protected $protected
    }

    # Aguardar o Windows liberar o socket
    for ($i = 0; $i -lt 10; $i++) {
        Start-Sleep -Milliseconds 500
        if (-Not (Test-PortInUse -Port $Port)) {
            Write-Host "Porta $Port liberada" -ForegroundColor Green
            return $true
        }
    }

    Write-Host "ERRO: nao foi possivel liberar a porta $Port ($Label)." -ForegroundColor Red
    Write-Host "      Quem esta segurando: Get-NetTCPConnection -LocalPort $Port -State Listen" -ForegroundColor Yellow
    return $false
}

# ============================================
# BACKEND (FastAPI)
# ============================================
Write-Host "Iniciando Backend (FastAPI)..." -ForegroundColor Cyan

$backendPath = Join-Path $scriptPath "backend"

# Verificar se o ambiente virtual existe
$venvPath = Join-Path $backendPath "venv"
if (-Not (Test-Path $venvPath)) {
    Write-Host "ERRO: Ambiente virtual nao encontrado em $venvPath" -ForegroundColor Red
    Write-Host "Execute: cd backend; python -m venv venv" -ForegroundColor Yellow
    exit 1
}

# Verificar se o .env existe
$envPath = Join-Path $backendPath ".env"
if (-Not (Test-Path $envPath)) {
    Write-Host "ERRO: Arquivo .env nao encontrado em $backendPath" -ForegroundColor Red
    Write-Host "Execute: cd backend; cp .env.example .env" -ForegroundColor Yellow
    exit 1
}

# Iniciar backend em novo terminal
$backendCommand = @"
Set-Location '$backendPath'
.\venv\Scripts\Activate.ps1
Write-Host 'Backend iniciado em http://localhost:$BACKEND_PORT' -ForegroundColor Green
Write-Host 'Documentacao em http://localhost:$BACKEND_PORT/docs' -ForegroundColor Green
Write-Host ''
uvicorn app.main:app --reload --port $BACKEND_PORT
"@

if (-Not (Clear-Port -Port $BACKEND_PORT -Label "Backend" -ProjectPath $scriptPath)) { exit 1 }

Start-Process powershell -ArgumentList @("-NoExit", "-Command", $backendCommand)

# ============================================
# FRONTEND (Next.js)
# ============================================
Write-Host "Iniciando Frontend (Next.js)..." -ForegroundColor Cyan

$frontendPath = Join-Path $scriptPath "frontend"

# Verificar se node_modules existe
$nodeModulesPath = Join-Path $frontendPath "node_modules"
if (-Not (Test-Path $nodeModulesPath)) {
    Write-Host "ERRO: node_modules nao encontrado em $frontendPath" -ForegroundColor Red
    Write-Host "Execute: cd frontend; npm install" -ForegroundColor Yellow
    exit 1
}

# Verificar se .env.local existe
$envLocalPath = Join-Path $frontendPath ".env.local"
if (-Not (Test-Path $envLocalPath)) {
    Write-Host "AVISO: Arquivo .env.local nao encontrado em $frontendPath" -ForegroundColor Yellow
    Write-Host "Copiando de .env.example..." -ForegroundColor Yellow
    
    $envExamplePath = Join-Path $frontendPath ".env.example"
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envLocalPath
        Write-Host ".env.local criado" -ForegroundColor Green
    }
}

# Atualizar .env.local com a porta correta do backend
if (Test-Path $envLocalPath) {
    $envContent = Get-Content $envLocalPath -Raw
    $envContent = $envContent -replace 'NEXT_PUBLIC_API_URL=http://localhost:\d+', "NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT"
    Set-Content $envLocalPath -Value $envContent -NoNewline
    Write-Host "Configurado frontend para usar backend na porta $BACKEND_PORT" -ForegroundColor Green
}

# Aguardar 2 segundos para o backend iniciar primeiro
Start-Sleep -Seconds 2

# Iniciar frontend em novo terminal
$frontendCommand = @"
Set-Location '$frontendPath'
Write-Host 'Frontend iniciado em http://localhost:$FRONTEND_PORT' -ForegroundColor Green
Write-Host ''
`$env:PORT='$FRONTEND_PORT'; npm run dev
"@

if (-Not (Clear-Port -Port $FRONTEND_PORT -Label "Frontend" -ProjectPath $scriptPath)) { exit 1 }

Start-Process powershell -ArgumentList @("-NoExit", "-Command", $frontendCommand)

# ============================================
# FINALIZAÇÃO
# ============================================
Write-Host ""
Write-Host "Aplicacao iniciada com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "URLs de acesso:" -ForegroundColor White
Write-Host "   Frontend: http://localhost:$FRONTEND_PORT" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:$BACKEND_PORT" -ForegroundColor Cyan
Write-Host "   API Docs: http://localhost:$BACKEND_PORT/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para parar os servidores, use Ctrl+C em cada janela." -ForegroundColor Yellow
Write-Host "Fechar a janela no X deixa o worker do uvicorn orfao segurando a porta" -ForegroundColor DarkGray
Write-Host "(o start.ps1 limpa isso sozinho no proximo arranque)." -ForegroundColor DarkGray
Write-Host ""
