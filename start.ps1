Write-Host "Starting FaceAttend Backend and Frontend..." -ForegroundColor Green
Write-Host ""

Write-Host "Starting Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd backend; npm run dev`"" -WindowStyle Normal

Write-Host "Starting Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd frontend; npm run dev`"" -WindowStyle Normal

Write-Host ""
Write-Host "Both servers are starting in separate windows." -ForegroundColor Yellow
Write-Host "- Backend will run on http://localhost:5000"
Write-Host "- Frontend will run on http://localhost:3000 (or 3001)"
Write-Host ""
