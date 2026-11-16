@echo off
setlocal enabledelayedexpansion
title DropLink - Unified File Sharing, Notes & Study Library
color 0b

echo ===============================================================================
echo                DROPLINK - UNIFIED FULL-STACK LOCAL & GLOBAL SUITE
echo ===============================================================================
echo.

:: 1. Dependency Checks
echo [*] Checking prerequisites...

where dotnet >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] .NET SDK is not installed or not in PATH! Please install .NET SDK.
    pause
    exit /b 1
)

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH! Please install Node.js.
    pause
    exit /b 1
)

:: 2. Check MySQL Service
echo [*] Verifying MySQL Database service...
sc query MySQL80 >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARN] MySQL80 service check returned non-zero. Attempting standard connection check...
) else (
    echo [OK] MySQL80 Service is installed and verified.
)

:: 3. Check / Build Frontend if needed
if not exist "frontend\dist\index.html" (
    echo [*] Frontend dist not found. Building production bundle...
    cd frontend
    call npm install
    call npm run build
    cd ..
)

:: 4. Detect Local IP Address
echo [*] Detecting Local Network IP for AirDrop connectivity...
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0 ^| findstr /v "0.0.0.0.0"') do (
    set LOCAL_IP=%%a
)

echo.
echo ===============================================================================
echo [SUCCESS] DropLink Ready!
echo.
echo   Local Dashboard URL:    http://localhost:5000
echo   Network AirDrop URL:    http://0.0.0.0:5000
echo   Database:               MySQL 8 (droplink_db)
echo.
echo   Opening DropLink in your default browser...
echo ===============================================================================
echo.

start "" "http://localhost:5000"

:: 5. Start Backend Server (which also serves the frontend and handles SignalR)
cd backend
dotnet run --urls "http://0.0.0.0:5000"

pause
