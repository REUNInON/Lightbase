@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Lightbase ERP

echo ===================================================
echo               LIGHTBASE ERP BAŞLATILIYOR
echo ===================================================
echo.

:: 1. Kurulum yapılmış mı kontrol et
if not exist "node_modules\" (
    echo [UYARI] Henüz kurulum yapılmamış!
    echo Lütfen önce "setup.bat" dosyasını çalıştırarak kurulumu tamamlayın.
    echo.
    pause
    exit /b 1
)

:: 2. 2 saniye sonra varsayılan tarayıcıda localhost:3000 açan arka plan görevi
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: 3. Full-stack Node.js + Express + SQLite + Vite dev sunucusunu başlat
echo [BİLGİ] Sunucu başlatılıyor...
echo [BİLGİ] Tarayıcınız birkaç saniye içinde otomatik olarak açılacaktır.
echo [BİLGİ] (Açılmazsa tarayıcınızdan http://localhost:3000 adresine gidebilirsiniz)
echo.
echo Bu pencereyi programı kullandığınız sürece AÇIK tutun.
echo Programı kapatmak için bu pencereyi kapatabilirsiniz.
echo ===================================================
echo.

call npm run dev

if %ERRORLEVEL% neq 0 (
    echo.
    echo [HATA] Sunucu beklenmedik bir şekilde durdu!
    pause
)
