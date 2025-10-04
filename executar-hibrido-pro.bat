@echo off
title AliBotTS3 - Sistema Híbrido Otimizado

echo.
echo ====================================================
echo  🤖 ALIBOT TS3 - SISTEMA HÍBRIDO OTIMIZADO
echo ====================================================
echo  ✅ Sistema unificado e otimizado
echo  ⚡ Performance máxima com reconexão inteligente
echo  🎯 Suporte completo: Friends, Claimeds, Deathlist
echo  🔗 Linkagem avançada com clientUniqueIdentifier
echo ====================================================
echo.

echo ℹ️ RECURSOS DISPONÍVEIS:
echo    ✅ Sistema de Friends automático
echo    ✅ Sistema de Claimeds com timers
echo    ✅ Sistema de Hunteds com notificações
echo    ✅ Deathlist automática da guild
echo    ✅ Comandos: !help, !status, !friends, !claimeds
echo    ✅ Reconexão automática em caso de falha
echo.

echo 💡 IMPORTANTE: Esta versão presume que:
echo    ✅ TeamSpeak 3 Client já está aberto
echo    ✅ Você já está conectado ao servidor
echo    ✅ Configurações em config.json estão corretas
echo.

set /p resposta="🚀 Iniciar AliBotTS3 Sistema Otimizado? (S/N): "

if /i "%resposta%"=="S" (
    echo.
    echo 🎯 Iniciando AliBotTS3 Sistema Híbrido Otimizado...
    echo ⚡ Carregando sistema completo com todas as funcionalidades!
    echo 🔄 Aguarde enquanto o bot se conecta ao TeamSpeak...
    echo.
    
    REM Navegar para o diretório do projeto
    cd /d "c:\AliBotTs3Atualizado"
    
    REM Executar o sistema otimizado através do index.ts
    echo 🚀 Executando: npm run dev
    npm run dev
    
    echo.
    echo ===============================================
    echo ⚠️ Sistema AliBotTS3 foi finalizado.
    echo 💡 Se houve travamento, pressione Ctrl+C na próxima execução.
    echo 🔄 Para reiniciar, execute este .bat novamente.
    echo ===============================================
    echo Pressione qualquer tecla para sair.
    pause >nul
    
) else (
    echo.
    echo 💡 Para executar o sistema:
    echo    • Execute este .bat novamente e digite S
    echo    • Ou use: npm run dev (no terminal)
    echo    • Ou use: npm run hibrido-pro (modo direto)
    echo.
    echo 📋 Comandos disponíveis no TeamSpeak:
    echo    !help - Lista todos os comandos
    echo    !status - Status do sistema
    echo    !friends - Lista de friends online
    echo    !claimeds - Lista de claimeds ativos
    echo.
    pause
)