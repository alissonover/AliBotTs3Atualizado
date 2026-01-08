@echo off
chcp 65001 >nul
title AliBotTS3 - Sistema Hibrido Otimizado

echo.
echo ====================================================
echo   ALIBOT TS3 - SISTEMA HIBRIDO OTIMIZADO
echo ====================================================
echo   [OK] Sistema unificado e otimizado
echo   [>>] Performance maxima com reconexao inteligente
echo   [>>] Suporte completo: Friends, Claimeds, Deathlist
echo   [>>] Linkagem avancada com clientUniqueIdentifier
echo ====================================================
echo.

echo [i] RECURSOS DISPONIVEIS:
echo    [OK] Sistema de Friends automatico
echo    [OK] Sistema de Claimeds com timers
echo    [OK] Sistema de Hunteds com notificacoes
echo    [OK] Deathlist automatica da guild
echo    [OK] Comandos: !help, !status, !friends, !claimeds
echo    [OK] Reconexao automatica em caso de falha
echo.

echo [!] IMPORTANTE: Esta versao presume que:
echo    [OK] TeamSpeak 3 Client ja esta aberto
echo    [OK] Voce ja esta conectado ao servidor
echo    [OK] Configuracoes em config.json estao corretas
echo.

set /p resposta="[?] Iniciar AliBotTS3 Sistema Otimizado? (S/N): "

if /i "%resposta%"=="S" (
    echo.
    echo [>>] Iniciando AliBotTS3 Sistema Hibrido Otimizado...
    echo.
    
    REM Navegar para o diretório do projeto
    cd /d "c:\AliBotTs3Atualizado"
    
    REM Verificar se node_modules existe
    if not exist "node_modules" (
        echo [!] Dependencias nao encontradas!
        echo [>>] Instalando dependencias do projeto...
        echo [>>] Isso pode levar alguns minutos na primeira vez...
        echo.
        npm install
        echo.
        echo [OK] Dependencias instaladas com sucesso!
        echo.
    ) else (
        echo [OK] Dependencias ja instaladas
    )
    
    echo.
    echo [>>] Carregando sistema completo com todas as funcionalidades!
    echo [>>] Aguarde enquanto o bot se conecta ao TeamSpeak...
    echo.
    
    REM Executar o sistema otimizado através do index.ts
    echo [>>] Executando: npm run dev
    npm run dev
    
    echo.
    echo ===============================================
    echo [!] Sistema AliBotTS3 foi finalizado.
    echo [i] Se houve travamento, pressione Ctrl+C na proxima execucao.
    echo [>>] Para reiniciar, execute este .bat novamente.
    echo ===============================================
    echo Pressione qualquer tecla para sair.
    pause >nul
    
) else (
    echo.
    echo [i] Para executar o sistema:
    echo    - Execute este .bat novamente e digite S
    echo    - Ou use: npm run dev (no terminal)
    echo    - Ou use: npm run hibrido-pro (modo direto)
    echo.
    echo [i] Comandos disponiveis no TeamSpeak:
    echo    !help - Lista todos os comandos
    echo    !status - Status do sistema
    echo    !friends - Lista de friends online
    echo    !claimeds - Lista de claimeds ativos
    echo.
    pause
)