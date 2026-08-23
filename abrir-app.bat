@echo off
REM ============================================================
REM  Abrir Pinturitas (dev server) con el Node portatil local.
REM  No modifica el PATH del sistema: solo el de esta ventana.
REM ============================================================
cd /d "%~dp0"
set "PATH=%~dp0.node\node-v24.19.0-win-x64;%PATH%"
echo Iniciando Pinturitas...
echo Cuando veas "Local: http://localhost:3000/" abre esa direccion en tu navegador.
echo (Para cerrar el servidor: cierra esta ventana o pulsa Ctrl+C)
echo.
call npm run dev
echo.
echo El servidor se detuvo. Revisa los mensajes de arriba si hubo algun error.
pause
