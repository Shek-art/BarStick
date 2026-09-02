@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Генератор наклеек 4K — запуск

echo ============================================================
echo   Генератор наклеек 4K — запуск приложения для Windows
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ОШИБКА] Node.js не установлен.
    echo Скачайте LTS-версию: https://nodejs.org  — и запустите файл заново.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [1/4] Устанавливаю зависимости npm...
    call npm install
    if errorlevel 1 goto :fail
)

if not exist "node_modules\electron\" (
    echo [2/4] Устанавливаю Electron...
    call npm install -D electron
    if errorlevel 1 goto :fail
)

if not exist "dist\index.html" (
    echo [3/4] Собираю приложение (npm run build)...
    call npm run build
    if errorlevel 1 goto :fail
)

echo [4/4] Запускаю окно приложения...
echo.
call npx electron electron/main.cjs
goto :eof

:fail
echo.
echo [ОШИБКА] Не удалось выполнить шаг. Подробности выше.
pause
exit /b 1
