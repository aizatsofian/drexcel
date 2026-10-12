@echo off
cd /d "%~dp0"
echo Menjalankan server...
start "" http://localhost:8000
python py/server.py
if errorlevel 1 (
  echo Cuba dengan py...
  py py/server.py
)
pause
