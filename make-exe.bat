@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Генератор наклеек 4K — сборка установщика .exe

echo ============================================================
echo   Генератор наклеек 4K — сборка установщика Windows (.exe)
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ОШИБКА] Node.js не установлен.
    echo Скачайте LTS-версию: https://nodejs.org — и запустите файл заново.
    pause
    exit /b 1
)

echo [1/5] Устанавливаю зависимости npm...
call npm install
if errorlevel 1 goto :fail

echo [2/5] Собираю приложение (npm run build)...
call npm run build
if errorlevel 1 goto :fail

echo [3/5] Устанавливаю Electron и electron-builder...
call npm install -D electron electron-builder
if errorlevel 1 goto :fail

echo [4/5] Собираю установщик ^(нужен интернет: качаются NSIS и Electron^)...
call npx electron-builder --config electron-builder.yml --win
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo   ГОТОВО! Файлы в папке release\:
echo     Nakleyki4K-1.0.0-x64.exe   — установщик ^(ярлыки, «Пуск»^)
echo     Nakleyki4K-Portable-*.exe  — portable ^(без установки^)
echo ============================================================
echo.
pause
goto :eof

:fail
echo.
echo [ОШИБКА] Не удалось выполнить шаг. Подробности выше.
echo Самые частые причины:
echo   - нет интернета ^(electron-builder качает NSIS и Electron^);
echo   - антивирус заблокировал скачивание Electron;
echo   - не выполнен npm run build ^(папка dist отсутствует^).
pause
exit /b 1
