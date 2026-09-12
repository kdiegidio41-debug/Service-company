@echo off
REM Start Jarvis with a working microphone.
REM The wake word needs https or localhost; a double-clicked file:// page
REM cannot use the mic. This serves the folder on localhost and opens it.
cd /d "%~dp0"
set PORT=8420
echo Jarvis  ^>  http://localhost:%PORT%/index.html
echo Leave this window open. Ctrl-C to stop.
start "" "http://localhost:%PORT%/index.html"
python -m http.server %PORT% --bind 127.0.0.1
