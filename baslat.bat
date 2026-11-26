@echo off
chcp 65001 >nul
title Otomata Lab
cd /d "%~dp0"

if not exist "backend\.venv\Scripts\python.exe" (
  echo [HATA] backend\.venv bulunamadi. Once kurulum yapin:
  echo   cd backend ^&^& python -m venv .venv ^&^& .venv\Scripts\pip install -r requirements.txt
  pause
  exit /b 1
)

if not exist "frontend\node_modules" (
  echo frontend bagimliliklari kuruluyor: npm install
  pushd frontend
  call npm install
  popd
)

echo Backend baslatiliyor  : http://localhost:8000
start "Otomata Lab - Backend" /D "%~dp0backend" cmd /k ".venv\Scripts\python -m uvicorn app.main:app --reload --port 8000"

echo Frontend baslatiliyor : http://localhost:5173
start "Otomata Lab - Frontend" /D "%~dp0frontend" cmd /k "npm run dev"

echo Tarayici birkac saniye icinde acilacak...
ping -n 6 127.0.0.1 >nul
start "" http://localhost:5173
exit /b 0
