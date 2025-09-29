@echo off
title TeamSpeak 3 - Conexao Automatica

echo ============================================
echo  🚀 TEAMSPEAK 3 - CONEXAO AUTOMATICA
echo ============================================
echo  🎯 Conectando ao servidor...
echo  📡 108.181.69.207:2573
echo  👤 Nick: AliBot-Visivel
echo ============================================
echo.

REM Verificar privilégios de administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ Executando como ADMINISTRADOR
) else (
    echo ⚠️ Sem privilégios de administrador
    echo 💡 Para melhor funcionamento, execute como admin
)

echo.
echo 🚀 Abrindo TeamSpeak 3...

REM Tentar diferentes caminhos do TeamSpeak
if exist "C:\Program Files\TeamSpeak 3 Client\ts3client_win64.exe" (
    "C:\Program Files\TeamSpeak 3 Client\ts3client_win64.exe" "ts3server://108.181.69.207:2573?nickname=AliBot-Visivel&channel=4"
    echo ✅ TeamSpeak aberto!
) else if exist "C:\Program Files (x86)\TeamSpeak 3 Client\ts3client_win32.exe" (
    "C:\Program Files (x86)\TeamSpeak 3 Client\ts3client_win32.exe" "ts3server://108.181.69.207:2573?nickname=AliBot-Visivel&channel=4"
    echo ✅ TeamSpeak aberto!
) else (
    echo ❌ TeamSpeak 3 Client não encontrado!
    echo 💡 Instale o TeamSpeak 3 Client oficial
    pause
    exit
)

echo.
echo ✅ TeamSpeak iniciado com sucesso!
echo 🔗 Conectando automaticamente ao servidor...
echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul