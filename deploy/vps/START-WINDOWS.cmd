@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Wymagany Node.js 24 LTS. Zainstaluj go i uruchom ten plik ponownie.
  pause
  exit /b 1
)
set HOST=127.0.0.1
set PORT=18080
echo Otworz http://127.0.0.1:18080 w przegladarce.
echo Nie zamykaj tego okna podczas korzystania z demo.
node server.mjs
pause
