@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Lightbase ERP - İlk Kurulum

echo ===================================================
echo           LIGHTBASE ERP - İLK KURULUM
echo ===================================================
echo.

:: 1. Node.js Kontrolü
echo [1/3] Node.js kontrol ediliyor...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [HATA] Node.js bilgisayarınızda bulunamadı!
    echo Lütfen https://nodejs.org adresinden LTS sürümünü indirip kurun.
    echo Kurulum bittikten sonra bu dosyayı tekrar çalıştırın.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo       Node.js bulundu: %NODE_VER%
echo.

:: 2. Paketlerin Kurulumu (npm install)
echo [2/3] Gerekli paketler ve kütüphaneler yükleniyor (npm install)...
echo       (Bu işlem internet hızınıza bağlı olarak 1-2 dakika sürebilir)
echo.

call npm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo [HATA] Paket yükleme sırasında bir hata oluştu!
    echo Lütfen internet bağlantınızı kontrol edip tekrar deneyin.
    echo.
    pause
    exit /b 1
)
echo.
echo       Paketler başarıyla yüklendi!
echo.

:: 3. Veritabanı ve Hazırlık Kontrolü
echo [3/3] Sistem ve veritabanı kontrol ediliyor...
if exist "lightbase.db" (
    echo       Mevcut veritabanı (lightbase.db) bulundu ve korundu.
) else (
    echo       Yeni veritabanı ilk başlatmada otomatik oluşturulacak.
)

echo.
echo ===================================================
echo   KURULUM BAŞARIYLA TAMAMLANDI!
echo ===================================================
echo.
echo Artık programı başlatmak için "run.bat" dosyasını
echo kullanabilirsiniz. İsterseniz "run.bat" dosyasına
echo sağ tıklayıp Masaüstüne kısayol oluşturabilirsiniz.
echo.
pause
