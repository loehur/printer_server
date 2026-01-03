@echo off
cd /d %~dp0

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
