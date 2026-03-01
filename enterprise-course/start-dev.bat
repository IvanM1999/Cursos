@echo off
REM ==============================================================
REM Enterprise Course Platform - Servidor de Desenvolvimento
REM Modo ROBUSTO: Auto-restart, recuperação de erros, watch de arquivos
REM ==============================================================

setlocal enabledelayedexpansion

REM Diretório do projeto
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

REM Cores do console (usando modo ASCII)
set "SUCCESS=[OK]"
set "ERROR=[ERRO]"
set "INFO=[INFO]"
set "WARN=[AVISO]"

REM ====== PRÉ-REQUISITOS ======
cls
echo.
echo ======================================================
echo   ENTERPRISE COURSE PLATFORM v1.0
echo   Servidor de Desenvolvimento - Modo Robusto
echo   Auto-Restart ^| File Watch ^| Error Recovery
echo ======================================================
echo.

REM Verifica Node.js
echo %INFO% Verificando requisitos...
node --version >nul 2>&1
if errorlevel 1 (
    echo %ERROR% Node.js nao esta instalado.
    echo         Baixe em: https://nodejs.org ^(v18+^)
    echo.
    pause
    exit /b 1
)

echo %SUCCESS% Node.js detectado: 
node --version
echo.

REM Verifica npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo %ERROR% npm nao esta instalado.
    pause
    exit /b 1
)

echo %SUCCESS% npm detectado:
npm --version
echo.

REM ====== INSTALAÇÃO DE DEPENDÊNCIAS ======
if not exist "node_modules" (
    echo %INFO% Instalando dependencias npm...
    echo         Isso pode levar alguns minutos...
    echo.
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo %ERROR% Falha ao instalar dependencias.
        echo         Verifique sua conexao com internet.
        pause
        exit /b 1
    )
    echo %SUCCESS% Dependencias instaladas.
    echo.
)

REM ====== CONFIGURAÇÃO ======
if not exist ".env" (
    echo %INFO% Criando arquivo .env...
    copy .env.example .env >nul 2>&1
    echo %SUCCESS% .env criado.
    echo         Revise as variáveis de ambiente se necessário.
    echo.
)

REM ====== LIMPEZA DE PROCESSOS ANTIGOS ======
echo %INFO% Limpando processos anteriores...

REM Mata Node processes no projeto
for /f "tokens=2" %%A in ('tasklist ^| findstr node.exe') do (
    taskkill /PID %%A /F >nul 2>&1
)

REM Mata processo na porta 3000
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%P /F >nul 2>&1
)

echo %SUCCESS% Processos antigos encerrados.
echo.

REM ====== INICIALIZAÇÃO DO SERVIDOR ======
echo %INFO% Iniciando servidor com suporte a:
echo         + Auto-restart ao salvar arquivos
echo         + Recuperação automática de erros
echo         + Monitoramento em tempo real
echo         + Watch de mudanças (15+ arquivos)
echo.

echo %INFO% Aguarde... Servidor iniciando...
echo.

REM Inicia o servidor usando ServerBootstrap
REM Opção 1: Via node direto (mais compatível)
call node backend/src/utils/ServerBootstrap.js

REM Se chegou aqui, servidor foi finalizado
echo.
echo %WARN% Servidor foi encerrado.
echo         Pressione uma tecla para fechar a janela...
pause >nul

endlocal
exit /b 0

