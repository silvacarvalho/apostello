# ============================================================
# Apostello - Teste no celular com UM clique (modo producao)
# ============================================================
# O que este script faz:
#   1. Cria 2 enderecos https temporarios (Cloudflare Tunnel): site e API
#   2. Sobe o backend (FastAPI) em modo producao
#   3. Compila (build) e sobe o frontend (Next.js) em modo producao
#   4. Mostra o endereco para abrir no celular e o copia para a area de transferencia
#   5. Ao apertar ENTER, encerra tudo
#
# Nao altera nenhum arquivo do projeto: as configuracoes vao apenas
# como variaveis de ambiente deste teste.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# ---------------- Configuracao ----------------
$build = [System.Environment]::OSVersion.Version.Build
if ($build -ge 22000) { $BACKEND_PORT = 8002 } else { $BACKEND_PORT = 8000 }   # mesmo criterio do start.ps1
$FRONTEND_PORT = 3000
$logDir = Join-Path $root ".teste-celular"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$procs = @()   # processos iniciados (para encerrar no final)

function Write-Step($msg)  { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host "    !!  $msg" -ForegroundColor Yellow }
function Fail($msg)        { Write-Host ""; Write-Host "ERRO: $msg" -ForegroundColor Red; throw $msg }

function Test-PortInUse([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        if ($async.AsyncWaitHandle.WaitOne(400)) { $client.EndConnect($async); return $true }
    } catch { } finally { $client.Close() }
    return $false
}

function Wait-Port([int]$Port, [int]$TimeoutSec, [string]$Name) {
    $limit = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $limit) {
        if (Test-PortInUse $Port) { return }
        Start-Sleep -Seconds 1
    }
    Fail "$Name nao subiu na porta $Port em $TimeoutSec segundos. Veja a janela dele para o erro."
}

function Start-Tunnel([int]$Port, [string]$Name) {
    $log = Join-Path $logDir "tunnel-$Name.log"
    $logOut = Join-Path $logDir "tunnel-$Name.out.log"
    Remove-Item $log, $logOut -ErrorAction SilentlyContinue
    $p = Start-Process -FilePath "cloudflared" `
        -ArgumentList @("tunnel", "--no-autoupdate", "--url", "http://localhost:$Port") `
        -RedirectStandardError $log -RedirectStandardOutput $logOut `
        -WindowStyle Hidden -PassThru
    $script:procs += $p
    $limit = (Get-Date).AddSeconds(60)
    while ((Get-Date) -lt $limit) {
        Start-Sleep -Milliseconds 800
        try {
            $text = Get-Content $log -Raw -ErrorAction Stop
            if ($text -match "https://[a-z0-9-]+\.trycloudflare\.com") { return $Matches[0] }
        } catch { }
    }
    Fail "Nao consegui criar o endereco https ($Name). Confira sua internet. Log: $log"
}

try {
    Clear-Host
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "  Apostello - Teste no celular (producao)" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green

    # ---------------- 1. Verificacoes ----------------
    Write-Step "Verificando programas necessarios"

    if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
        Write-Warn2 "cloudflared nao encontrado."
        $r = Read-Host "    Instalar agora com winget? (S/N)"
        if ($r -match "^[sSyY]") {
            winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
            # atualiza o PATH desta janela
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        }
        if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
            Fail "Instale o cloudflared (winget install --id Cloudflare.cloudflared), feche e abra este script de novo."
        }
    }
    Write-Ok "cloudflared"

    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Fail "Node.js/npm nao encontrado. Instale em https://nodejs.org" }
    Write-Ok "npm"

    # Python do backend: usa a venv do projeto se existir; senao cria
    $backendDir = Join-Path $root "backend"
    $frontendDir = Join-Path $root "frontend"
    $venvPython = $null
    foreach ($name in @("venv", ".venv", "env")) {
        $cand = Join-Path $backendDir "$name\Scripts\python.exe"
        if (Test-Path $cand) { $venvPython = $cand; break }
    }
    if (-not $venvPython) {
        if (-not (Get-Command python -ErrorAction SilentlyContinue)) { Fail "Python nao encontrado. Instale o Python 3.12+ em https://python.org" }
        Write-Warn2 "Ambiente virtual do backend nao encontrado. Criando (venv)..."
        Push-Location $backendDir
        python -m venv venv
        $venvPython = Join-Path $backendDir "venv\Scripts\python.exe"
        & $venvPython -m pip install -r requirements.txt
        Pop-Location
    }
    Write-Ok "python: $venvPython"

    if (-not (Test-Path (Join-Path $backendDir ".env"))) {
        if (Test-Path (Join-Path $backendDir ".env.example")) {
            Copy-Item (Join-Path $backendDir ".env.example") (Join-Path $backendDir ".env")
            Write-Warn2 "backend\.env nao existia: copiei do .env.example. Confira DATABASE_URL e SECRET_KEY."
        } else { Fail "backend\.env nao encontrado." }
    }

    foreach ($port in @($BACKEND_PORT, $FRONTEND_PORT)) {
        if (Test-PortInUse $port) {
            Fail "A porta $port ja esta em uso. Feche o programa que a usa (ou o start.ps1 em execucao) e tente de novo."
        }
    }
    Write-Ok "portas $BACKEND_PORT e $FRONTEND_PORT livres"

    # ---------------- 2. Enderecos https ----------------
    Write-Step "Criando enderecos https temporarios (pode levar alguns segundos)"
    $apiUrl  = Start-Tunnel $BACKEND_PORT  "api"
    $siteUrl = Start-Tunnel $FRONTEND_PORT "site"
    Write-Ok "API : $apiUrl"
    Write-Ok "Site: $siteUrl"

    # ---------------- 3. Variaveis de ambiente (so deste teste) ----------------
    $env:ENVIRONMENT         = "production"
    $env:DEBUG               = "false"
    $env:CORS_ORIGINS        = '["' + $siteUrl + '","http://localhost:' + $FRONTEND_PORT + '"]'
    $env:NEXT_PUBLIC_API_URL = $apiUrl
    $env:FRONTEND_URL        = $siteUrl   # endereco que vai dentro dos QR Codes dos PDFs

    # ---------------- 4. Backend ----------------
    Write-Step "Preparando o banco de dados (alembic upgrade head)"
    Push-Location $backendDir
    & $venvPython -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { Pop-Location; Fail "Falha nas migracoes do banco. Confira DATABASE_URL em backend\.env e se o PostgreSQL esta ligado." }
    Pop-Location
    Write-Ok "banco atualizado"

    Write-Step "Subindo o backend (janela separada)"
    $backendArgs = "-NoExit -Command `"Set-Location '$backendDir'; Write-Host 'BACKEND (producao) - porta $BACKEND_PORT' -ForegroundColor Green; & '$venvPython' -m uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT`""
    $procs += Start-Process powershell -ArgumentList $backendArgs -PassThru
    Wait-Port $BACKEND_PORT 90 "O backend"
    Write-Ok "backend no ar"

    # ---------------- 5. Frontend ----------------
    Write-Step "Compilando o frontend (npm run build) - pode demorar alguns minutos"
    Push-Location $frontendDir
    if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
        Write-Warn2 "Instalando dependencias (npm install)..."
        npm install
    }
    npm run build
    if ($LASTEXITCODE -ne 0) { Pop-Location; Fail "O build do frontend falhou. Veja as mensagens acima." }
    Pop-Location
    Write-Ok "build concluido"

    Write-Step "Subindo o frontend (janela separada)"
    $frontArgs = "-NoExit -Command `"Set-Location '$frontendDir'; Write-Host 'FRONTEND (producao) - porta $FRONTEND_PORT' -ForegroundColor Green; npm start -- -p $FRONTEND_PORT`""
    $procs += Start-Process powershell -ArgumentList $frontArgs -PassThru
    Wait-Port $FRONTEND_PORT 60 "O frontend"
    Write-Ok "frontend no ar"

    # ---------------- 6. Pronto ----------------
    try { Set-Clipboard -Value $siteUrl } catch { }
    Write-Host ""
    Write-Host "=============================================================" -ForegroundColor Green
    Write-Host "  PRONTO! Abra este endereco no navegador do celular:" -ForegroundColor Green
    Write-Host ""
    Write-Host "  $siteUrl" -ForegroundColor White
    Write-Host ""
    Write-Host "  (o endereco ja foi copiado para a area de transferencia)" -ForegroundColor Gray
    Write-Host "=============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Instalar como app:" -ForegroundColor Cyan
    Write-Host "   - Android (Chrome): menu ... > 'Instalar app'  (ou botao Mais > Instalar aplicativo)"
    Write-Host "   - iPhone (Safari): Compartilhar > 'Adicionar a Tela de Inicio'"
    Write-Host ""
    Write-Host "  Deixe esta janela e o computador ligados durante o teste." -ForegroundColor Yellow
    Write-Host "  Os enderecos mudam toda vez que este script e executado." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "  Pressione ENTER para ENCERRAR tudo"
}
catch {
    Write-Host ""
    Write-Host "O teste foi interrompido: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Pressione ENTER para encerrar e limpar"
}
finally {
    Write-Host ""
    Write-Host "Encerrando processos..." -ForegroundColor Cyan
    foreach ($p in $procs) {
        try { if ($p -and -not $p.HasExited) { & taskkill /PID $p.Id /T /F | Out-Null } } catch { }
    }
    Write-Host "Tudo encerrado. Ate a proxima!" -ForegroundColor Green
}
