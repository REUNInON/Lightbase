@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Lightbase ERP - Güncelleme

echo ===================================================
echo           LIGHTBASE ERP - GÜNCELLEME
echo ===================================================
echo.

:: 1. Node.js ve npm Kontrolü
echo [1/3] Node.js ve npm sürümü kontrol ediliyor...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [HATA] Node.js bulunamadı! Lütfen https://nodejs.org adresinden kurun.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
for /f "tokens=*" %%i in ('npm -v') do set NPM_VER=%%i
echo       Node.js Sürümü: %NODE_VER%
echo       NPM Sürümü:     %NPM_VER%
echo.

:: 2. Paketlerin Güncellenmesi
echo [2/3] Paketler ve bağımlılıklar güncelleniyor (npm update)...
echo.
call npm update
if %ERRORLEVEL% neq 0 (
    echo [UYARI] npm update sırasında uyarılar oluştu, eksik paketler taranıyor...
    call npm install
)

echo.
echo [3/3] Proje yapılandırması kontrol ediliyor...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [UYARI] Build kontrolünde hata oluştu, ancak dev modunda çalışmaya devam edilebilir.
) else (
    echo       TypeScript ve derleme kontrolleri başarılı!
)

echo.
echo ===================================================
echo   GÜNCELLEME BAŞARIYLA TAMAMLANDI!
echo ===================================================
echo.
echo Programı çalıştırmak için "run.bat" dosyasını kullanabilirsiniz.
echo.
pause
