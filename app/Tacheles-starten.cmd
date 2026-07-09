@echo off
rem Tacheles ueber http://localhost starten.
rem Vorteil gegenueber Doppelklick auf index.html: Der Browser merkt sich die
rem Mikrofon-Erlaubnis (Sprechen-Modus fragt nur EINMAL statt bei jedem Wort).
title Tacheles
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js wurde nicht gefunden - oeffne die App stattdessen direkt als Datei.
  echo ^(Im Sprechen-Modus fragt der Browser dann bei jedem Wort nach dem Mikrofon.^)
  start "" "%~dp0index.html"
  pause
  exit /b
)

start "" "http://localhost:8017"
node "%~dp0server.js"
pause
