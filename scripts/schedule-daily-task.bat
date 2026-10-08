@echo off
title Schedule Bug Tracker Daily Autonomous Enhancement
echo ======================================================================
echo    CONFIGURING WINDOWS TASK SCHEDULER: DAILY AUTONOMOUS RUNNER
echo ======================================================================
echo.
echo Task Name: BugTrackerDailyEnhance
echo Schedule:  Runs every day at 09:00 AM
echo Target:    %~dp0run-daily-enhance.bat
echo.
schtasks /create /tn "BugTrackerDailyEnhance" /tr "\"%~dp0run-daily-enhance.bat\"" /sc daily /st 09:00 /f
echo.
if %errorlevel% equ 0 (
    echo [SUCCESS] Daily task successfully scheduled in Windows Task Scheduler!
    echo It will execute automatically every morning at 09:00 AM.
) else (
    echo [NOTE] If permission denied, please run this script by Right-Clicking -> Run as Administrator.
)
echo.
pause
