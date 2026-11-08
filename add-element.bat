@echo off
REM Assistant guidé : ajouter une loi au catalogue (questions en français).
title AuraLab - ajouter une loi
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [ERREUR] Node.js est introuvable. Installez Node LTS depuis
  echo  https://nodejs.org/ puis relancez ce fichier.
  echo.
  pause
  exit /b 1
)
node scripts/add-element.mjs
echo.
pause
