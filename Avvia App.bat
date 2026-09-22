@echo off
title App Lavori Falegnameria
cd /d "%~dp0"
echo Avvio il programma...
start /min "App Lavori Falegnameria - server locale" cmd /c "python -m http.server 8735 --bind 127.0.0.1"
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8735/index.html
echo.
echo Il programma e' stato aperto nel browser (su questo PC).
echo Questa finestra puoi lasciarla cosi' com'e' mentre lavori.
echo.
echo Quando hai finito, chiudi il browser e poi premi un tasto qui
echo per spegnere il programma.
pause >nul
for /f "tokens=5" %%p in ('netstat -aon ^| findstr :8735 ^| findstr LISTENING') do taskkill /f /pid %%p >nul 2>&1
echo Programma chiuso. Puoi chiudere anche questa finestra.
pause >nul
