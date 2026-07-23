@echo off
cd /d "%~dp0"

if "%~1"=="--after-pull" goto :main

echo Pulling latest updates from Git...
git pull
echo.
REM Jalankan ulang dari disk supaya START.bat versi baru (setelah pull) ikut terpakai
call "%~f0" --after-pull
exit /b

:main
REM Cek dan buat config.local.js jika tidak ada
if not exist "config.local.js" (
    echo config.local.js tidak ditemukan, membuat dari template...
    copy "config.local.example.js" "config.local.js"
    echo.
    echo ========================================
    echo config.local.js telah dibuat!
    echo Silakan edit file tersebut untuk mengubah
    echo pengaturan COM port sesuai kebutuhan.
    echo ========================================
    echo.
)

echo Starting Print Server...
npm start
pause
