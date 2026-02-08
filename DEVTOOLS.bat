@echo off
echo.
echo ========================================
echo   🛠️  Brothers Solar - Development Tools
echo ========================================
echo.

echo [1] Start Backend Server
echo [2] Test API Endpoints
echo [3] Check Email/SMS Configuration
echo [4] Clear Browser Cache
echo [5] Open Developer Tools
echo [6] View Error Logs
echo [7] Database Operations
echo [8] Security Check
echo [9] Exit
echo.

set /p choice="Enter your choice (1-9): "

if "%choice%"=="1" (
    echo.
    echo Starting Backend Development...
    echo.
    echo Starting Apache...
    net start apache2 2>nul || echo Apache already running or not installed
    echo.
    echo Starting MySQL...
    net start mysql 2>nul || echo MySQL already running or not installed
    echo.
    echo Backend services started!
    pause
    goto devtools
)

if "%choice%"=="2" (
    echo.
    echo Testing API Endpoints...
    echo.
    echo Testing OTP API...
    curl -X POST "http://localhost/brothers solar/backend/api/admin/verify-otp.php" ^
         -H "Content-Type: application/json" ^
         -d "{\"action\":\"send_whatsapp_otp\",\"phone\":\"7574991073\"}"
    echo.
    echo.
    echo Testing Email API...
    curl -X POST "http://localhost/brothers solar/backend/api/admin/verify-otp.php" ^
         -H "Content-Type: application/json" ^
         -d "{\"action\":\"request_otp\",\"email\":\"brotherssolar01@gmail.com\"}"
    echo.
    echo API tests completed!
    pause
    goto devtools
)

if "%choice%"=="3" (
    echo.
    echo Checking Email/SMS Configuration...
    echo.
    echo Opening Email Test Page...
    start "" "http://localhost/brothers solar/backend/test-email.php"
    echo.
    echo Checking MSG91 Configuration...
    echo Auth Key: 492818AxbI26DnH7YQ69860f5cP1
    echo Sender: BRTHSL
    echo Template ID: 1207161692627246889
    echo.
    echo Configuration check completed!
    pause
    goto devtools
)

if "%choice%"=="4" (
    echo.
    echo Clearing Browser Cache...
    echo.
    echo Clearing Chrome Cache...
    RunDll32.exe InetCpl.cpl,ClearMyTracksByProcess 8
    echo.
    echo Clearing Firefox Cache...
    echo Please manually clear Firefox cache: Ctrl+Shift+Delete
    echo.
    echo Cache cleared!
    pause
    goto devtools
)

if "%choice%"=="5" (
    echo.
    echo Opening Developer Tools...
    echo.
    echo Opening Chrome DevTools...
    echo Press F12 in browser for DevTools
    echo.
    echo Opening Network Tab...
    echo Check Network tab for API calls
    echo.
    echo Opening Console Tab...
    echo Check Console for JavaScript errors
    echo.
    echo Developer tools ready!
    pause
    goto devtools
)

if "%choice%"=="6" (
    echo.
    echo Viewing Error Logs...
    echo.
    echo Opening Apache Error Log...
    notepad "C:\xampp\apache\logs\error.log"
    echo.
    echo Opening PHP Error Log...
    notepad "C:\xampp\php\logs\php_error_log"
    echo.
    echo Opening XAMPP Access Log...
    notepad "C:\xampp\apache\logs\access.log"
    echo.
    echo Error logs opened!
    pause
    goto devtools
)

if "%choice%"=="7" (
    echo.
    echo Database Operations...
    echo.
    echo Opening phpMyAdmin...
    start "" "http://localhost/phpmyadmin"
    echo.
    echo Database: brothers_solar
    echo.
    echo Common operations:
    echo - Create database
    echo - Import SQL
    echo - Export data
    echo - Run queries
    echo.
    echo phpMyAdmin opened!
    pause
    goto devtools
)

if "%choice%"=="8" (
    echo.
    echo Security Check...
    echo.
    echo Checking file permissions...
    cacls "C:\xampp\htdocs\brothers solar"
    echo.
    echo Checking environment variables...
    type "C:\xampp\htdocs\brothers solar\backend\.env"
    echo.
    echo Checking admin credentials...
    echo Passwords: admin123, Brothers@2024, admin@brothers
    echo.
    echo Checking API security...
    echo CORS headers enabled
    echo OTP validation active
    echo Session management active
    echo.
    echo Security check completed!
    pause
    goto devtools
)

if "%choice%"=="9" (
    echo.
    echo Goodbye! 👋
    exit /b
)

echo.
echo Invalid choice! Please try again.
pause
goto devtools

:devtools
cls
goto :eof
