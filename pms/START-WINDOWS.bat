@echo off
cd /d "%~dp0"
node -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1)" >nul 2>&1
if not %errorlevel%==0 goto missing
node server/setup.js --check
if %errorlevel%==0 goto run
node server/setup.js
if not %errorlevel%==0 goto end
:run
start "" "http://127.0.0.1:8010/web/"
node server/main.js
goto end
:missing
echo JOVIAN shared mode requires Node.js 24 or newer. See README.md.
:end
pause
