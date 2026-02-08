@echo off
echo.
echo ========================================
echo   🚀 Brothers Solar - Quick Start
echo ========================================
echo.

echo [1] Start XAMPP Server
echo [2] Open Admin Access Page
echo [3] Open Admin Panel
echo [4] Test Email Configuration
echo [5] Open Project Directory
echo [6] Check Server Status
echo [7] Exit
echo.

set /p choice="Enter your choice (1-7): "

if "%choice%"=="1" (
    echo.
    echo Starting XAMPP Control Panel...
    start "" "C:\xampp\xampp-control.exe"
    echo XAMPP Control Panel opened!
    echo Please start Apache and MySQL services.
    pause
    goto start
)

if "%choice%"=="2" (
    echo.
    echo Opening Admin Access Page...
    start "" "http://localhost/brothers solar/admin/admin-access.html"
    echo Admin Access Page opened in browser!
    pause
    goto start
)

if "%choice%"=="3" (
    echo.
    echo Opening Admin Panel...
    start "" "http://localhost/brothers solar/admin/admin.html"
    echo Admin Panel opened in browser!
    pause
    goto start
)

if "%choice%"=="4" (
    echo.
    echo Testing Email Configuration...
    start "" "http://localhost/brothers solar/backend/test-email.php"
    echo Email Test Page opened in browser!
    pause
    goto start
)

if "%choice%"=="5" (
    echo.
    echo Opening Project Directory...
    explorer "C:\xampp\htdocs\brothers solar"
    echo Project directory opened!
    pause
    goto start
)

if "%choice%"=="6" (
    echo.
    echo Checking Server Status...
    echo.
    echo Testing Apache...
    start "" "http://localhost"
    echo.
    echo Testing PHP...
    start "" "http://localhost/brothers solar/backend/test-email.php"
    echo.
    echo Testing API...
    start "" "http://localhost/brothers solar/backend/api/admin/verify-otp.php"
    echo.
    echo Server status checks opened in browser tabs!
    pause
    goto start
)

if "%choice%"=="7" (
    echo.
    echo Goodbye! 👋
    exit /b
)

echo.
echo Invalid choice! Please try again.
pause
goto start

:start
cls
goto :eof
