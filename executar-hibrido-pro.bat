@echo off
title AliBotTS3 - Sistema Hibrido PRO

echo.
echo ============================================
echo  🚀 ALIBOT TS3 - SISTEMA HIBRIDO PRO
echo ============================================
echo  💡 Versão otimizada para TeamSpeak aberto
echo  ⚡ Performance máxima e simplicidade total
echo  🎯 Foco na comunicação ServerQuery ↔ Cliente
echo ============================================
echo.

echo ℹ️ IMPORTANTE: Esta versão presume que:
echo    ✅ TeamSpeak 3 Client já está aberto
echo    ✅ Você já está conectado ao servidor
echo    ✅ Você pode receber mensagens no TeamSpeak
echo.
echo 💡 Se o TeamSpeak não estiver aberto, use:
echo    executar-hibrido-funcional.bat
echo.

set /p resposta="🚀 Continuar com sistema otimizado? (S/N): "

if /i "%resposta%"=="S" (
    echo.
    echo 🎯 Iniciando sistema híbrido PRO...
    echo ⚡ Máxima performance e responsividade!
    echo.
    
    REM Navegar para o diretório do projeto
    cd /d "c:\AliBotTs3Atualizado"
    
    REM Executar a versão otimizada
    npm run hibrido-pro
    
    echo.
    echo ===============================================
    echo Sistema PRO finalizado. Pressione qualquer tecla para sair.
    pause >nul
    
) else (
    echo.
    echo 💡 Para usar com abertura automática do TeamSpeak:
    echo    Clique duplo em: executar-hibrido-funcional.bat
    echo.
    pause
)