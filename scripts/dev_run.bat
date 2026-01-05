@echo off
cd /d "%~dp0.."

if not exist ".venv\Scripts\activate.bat" (
  echo No existe .venv. Crealo con: py -m venv .venv
  exit /b 1
)

call .venv\Scripts\activate.bat
pip install -r requirements.txt

uvicorn app.main:app --reload
