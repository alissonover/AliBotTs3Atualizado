
# Script para abrir TeamSpeak como Administrador
Write-Host "🚀 Abrindo TeamSpeak 3 Client..." -ForegroundColor Green

$teamSpeakPath = @(
    "C:\Program Files\TeamSpeak 3 Client\ts3client_win64.exe",
    "C:\Program Files (x86)\TeamSpeak 3 Client\ts3client_win32.exe"
)

$tsPath = $null
foreach ($path in $teamSpeakPath) {
    if (Test-Path $path) {
        $tsPath = $path
        break
    }
}

if ($tsPath) {
    Write-Host "✅ TeamSpeak encontrado: $tsPath" -ForegroundColor Green
    
    # Tentar abrir como administrador
    try {
        Start-Process $tsPath -ArgumentList "ts3server://108.181.69.207:2573?nickname=AliBot-Visivel&channel=4" -Verb RunAs
        Write-Host "✅ TeamSpeak iniciado com privilégios de administrador!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Falha ao abrir como admin, tentando modo normal..." -ForegroundColor Yellow
        Start-Process $tsPath -ArgumentList "ts3server://108.181.69.207:2573?nickname=AliBot-Visivel&channel=4"
    }
} else {
    Write-Host "❌ TeamSpeak não encontrado!" -ForegroundColor Red
}

Write-Host "Pressione qualquer tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
