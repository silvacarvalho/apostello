# ============================================
# Script de inicialização do Apostello
# ============================================
# Este script inicia o backend (FastAPI) e frontend (Next.js) simultaneamente

# CONFIGURAÇÕES AUTOMÁTICAS POR VERSÃO DO WINDOWS
$windowsVersion = [System.Environment]::OSVersion.Version
$buildNumber = $windowsVersion.Build

# Windows 11 tem build 22000 ou superior, Windows 10 tem build inferior
if ($buildNumber -ge 22000) {
    $BACKEND_PORT = 8001  # Windows 11
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
Write-Host "Para parar os servidores, feche as janelas do terminal abertas." -ForegroundColor Yellow
Write-Host ""
