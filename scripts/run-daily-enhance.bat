@echo off
title Bug Tracker - Autonomous Daily Enhancer
cd /d "%~dp0\.."
echo ======================================================================
echo    BUG TRACKER: DAILY AUTONOMOUS ENHANCEMENT ^& UNIT TESTING RUNNER
echo ======================================================================
echo.
node scripts\daily-enhancer.js
echo.
echo Press any key to exit...
pause >nul
