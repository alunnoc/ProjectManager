@echo off
title Avvio Gestione Progetti
cd /d "%~dp0"

echo Avvio backend (porta 3001)...
start "Backend - Gestione Progetti" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 2 /nobreak >nul

echo Avvio frontend (porta 5173)...
start "Frontend - Gestione Progetti" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Finestre aperte: Backend e Frontend.
echo Quando hai finito, chiudi le due finestre CMD.
echo.
echo Il frontend sara' disponibile su: http://localhost:5173
echo Il backend risponde su: http://localhost:3001
echo.
pause
