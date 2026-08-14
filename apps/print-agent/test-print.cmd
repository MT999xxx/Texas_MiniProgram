@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows\stop-agent.ps1"
echo.
node "%~dp0src\index.js" --test
echo.
echo The first line above must contain version: 20260810-v9 and label: 40x30mm
pause
