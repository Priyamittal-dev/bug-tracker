@echo off
title Deploy Bug Tracker Full-Stack Production Container
echo ======================================================================
echo    BUG TRACKER: 1-CLICK DOCKER FULL-STACK DEPLOYMENT
echo ======================================================================
echo.
echo Building and spinning up:
echo   - Next.js Web App (Port 3000)
echo   - PostgreSQL Database (Port 5432)
echo   - Redis In-Memory Cache (Port 6379)
echo   - MinIO Object Storage (Port 9000/9001)
echo.
docker compose up -d --build
echo.
if %errorlevel% equ 0 (
    echo [SUCCESS] Full-stack Bug Tracker deployed!
    echo Access application at: http://localhost:3000
    echo Database at: localhost:5432
) else (
    echo [NOTE] Please ensure Docker Desktop is started before running this script.
)
echo.
pause
