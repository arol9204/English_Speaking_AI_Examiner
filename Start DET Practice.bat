@echo off
rem Double-click this file to start DET Practice. Close this window to stop the app.
title DET Practice
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo The Python environment is missing. Follow step 4 of docs\SETUP_GUIDE.md first.
  pause
  exit /b 1
)
echo Starting DET Practice. Your browser will open in a moment.
echo Keep this window open while you practice. Close it to stop the app.
echo.
".venv\Scripts\python.exe" run.py
echo.
echo The app has stopped. If you see an error above, send it to Claude.
pause
