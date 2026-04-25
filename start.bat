@echo off
title FaceAttend Startup
echo Starting FaceAttend Backend and Frontend...
echo.

echo Starting Backend...
start "FaceAttend Backend" cmd /k "cd backend && npm run dev"

echo Starting Frontend...
start "FaceAttend Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo - Backend will run on http://localhost:5000
echo - Frontend will run on http://localhost:3000 (or 3001)
echo.
pause
