@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ==============================================================
REM Enterprise Course Platform - Local Dev Bootstrap (Windows)
REM Flow: deps -> docker postgres -> wait -> migrate -> start app
REM ==============================================================

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

set "SUCCESS=[OK]"
set "ERROR=[ERRO]"
set "INFO=[INFO]"
set "WARN=[AVISO]"
set "DOCKER_CMD=docker"

cls
echo.
echo ======================================================
echo   ENTERPRISE COURSE PLATFORM - LOCAL DEV BOOTSTRAP
echo   Auto setup: Postgres (Docker) + migration + server
echo ======================================================
echo.

echo %INFO% Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo %ERROR% Node.js not found. Install Node.js 18+ first.
    echo.
    pause
    exit /b 1
)
echo %SUCCESS% Node.js detected:
node --version

echo %INFO% Checking npm...
call npm --version >nul 2>&1
if errorlevel 1 (
    echo %ERROR% npm not found.
    echo.
    pause
    exit /b 1
)
echo %SUCCESS% npm detected:
call npm --version

if not exist "node_modules" (
    echo.
    echo %INFO% Installing dependencies...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo %ERROR% npm install failed.
        pause
        exit /b 1
    )
    echo %SUCCESS% Dependencies installed.
)

if not exist ".env" (
    echo.
    echo %INFO% Creating .env from .env.example...
    copy .env.example .env >nul 2>&1
    if errorlevel 1 (
        echo %ERROR% Could not create .env.
        pause
        exit /b 1
    )
    echo %SUCCESS% .env created.
)

echo.
echo %INFO% Checking Docker...
"%DOCKER_CMD%" --version >nul 2>&1
if errorlevel 1 (
    if exist "C:\Program Files\Docker\Docker\resources\bin\docker.exe" (
        set "DOCKER_CMD=C:\Program Files\Docker\Docker\resources\bin\docker.exe"
    )
)

"%DOCKER_CMD%" --version >nul 2>&1
if errorlevel 1 (
    echo %ERROR% Docker CLI not found.
    echo         Install Docker Desktop and open it before running this script.
    echo.
    pause
    exit /b 1
)

echo %INFO% Ensuring Docker engine is running...
"%DOCKER_CMD%" version --format "{{.Server.Version}}" >nul 2>&1
if errorlevel 1 (
    echo %WARN% Docker engine is not ready. Trying to start it...

    net start com.docker.service >nul 2>&1

    if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    )

    set /a DOCKER_WAIT=0
    :wait_docker
    set /a DOCKER_WAIT+=1
    echo %INFO% Waiting for Docker engine... attempt !DOCKER_WAIT!/60
    timeout /t 2 >nul
    "%DOCKER_CMD%" version --format "{{.Server.Version}}" >nul 2>&1
    if errorlevel 1 (
        if !DOCKER_WAIT! geq 60 (
            echo %ERROR% Docker engine is not running.
            echo         Open Docker Desktop and wait until status is "Engine running".
            echo.
            pause
            exit /b 1
        )
        goto wait_docker
    )
)
echo %SUCCESS% Docker engine is running.

REM Local DB defaults for Docker postgres service.
REM dotenv will not override variables already defined in process env.
set "NODE_ENV=development"
set "DB_HOST=localhost"
set "DB_PORT=5432"
set "DB_NAME=enterprise_course"
set "DB_USER=postgres"
set "DB_PASSWORD=postgres_password"

if not "%DATABASE_URL%"=="" (
    echo %WARN% DATABASE_URL is set in the environment. Clearing it for local DB mode.
    set "DATABASE_URL="
)

echo %INFO% Starting PostgreSQL container (docker compose)...
"%DOCKER_CMD%" compose up -d postgres >nul 2>&1
if errorlevel 1 (
    echo %ERROR% Could not start postgres via docker compose.
    echo         Run manually: docker compose up -d postgres
    echo.
    pause
    exit /b 1
)

echo %INFO% Waiting for PostgreSQL on localhost:5432...
set /a WAIT_COUNT=0
:wait_pg
set /a WAIT_COUNT+=1
powershell -NoProfile -Command "$c = New-Object Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1',5432); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    if !WAIT_COUNT! geq 60 (
        echo %ERROR% PostgreSQL did not become reachable within 60 seconds.
        echo         Check Docker Desktop and run: docker compose logs postgres
        echo.
        pause
        exit /b 1
    )
    timeout /t 1 >nul
    goto wait_pg
)
echo %SUCCESS% PostgreSQL is reachable.

echo %INFO% Running database migration...
call npm run db:migrate
if errorlevel 1 (
    echo %ERROR% Migration failed.
    echo         Inspect logs with: docker compose logs postgres
    echo.
    pause
    exit /b 1
)
echo %SUCCESS% Migration completed.

echo.
echo %INFO% Releasing port 3000 (if needed)...
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%P /F >nul 2>&1
)
echo %SUCCESS% Port 3000 ready.

echo.
echo %INFO% Starting robust development server...
echo.
call node backend/src/utils/ServerBootstrap.js

echo.
echo %WARN% Server process has exited.
echo        Press any key to close this window...
pause >nul

endlocal
exit /b 0
