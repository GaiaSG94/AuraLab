@echo off
REM Double-click to serve the LabKit labs. KEEP THIS WINDOW OPEN while browsing.
title LabKit server - leave this window open
cd /d "%~dp0"
echo.
echo  == LabKit ==
echo  Folder: %CD%
where python >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [ERROR] 'python' was not found.
  echo  Install Python 3 from https://www.python.org/downloads/
  echo  ^(tick "Add python.exe to PATH"^), then double-click this file again.
  echo.
  pause
  exit /b 1
)
echo  Python OK. Starting server - leave this window OPEN.
echo.
echo    Portal:     http://localhost:8080/
echo    Space:      http://localhost:8080/app-space/
echo    Eco:        http://localhost:8080/app-eco/
echo    Chemistry:  http://localhost:8080/app-chimie/
echo    Bridge:     http://localhost:8080/app-ponts/
echo.
python -m http.server 8080
echo.
echo  [Server stopped. If "Address already in use" appears above,]
echo  [another program already uses port 8080 - close it and retry.]
echo.
pause
