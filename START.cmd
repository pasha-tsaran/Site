@echo off
cd /d "%~dp0"
echo Open http://127.0.0.1:4180 in your browser.
node scripts/serve.mjs
pause
