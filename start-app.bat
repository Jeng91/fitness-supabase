@echo off
:: Batch script สำหรับรันแอป React ด้วย port ต่างๆ

set DEFAULT_PORT=3001

if "%1"=="" (
    set PORT=%DEFAULT_PORT%
) else (
    set PORT=%1
)

echo กำลังรันแอป PJ Fitness บน port %PORT%...
echo.

:: รันแอป
npm start