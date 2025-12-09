@echo off
cd /d C:\printer_server
echo Pulling latest updates from Git...
git pull
echo.
echo Starting Print Server...
node server.js
pause
