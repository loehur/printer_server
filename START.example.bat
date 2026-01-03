@echo off
cd /d %~dp0
echo Pulling latest updates from Git...
git pull
echo.
echo Restarting with updated files...
call printer.bat
