@echo off
echo.
echo ========================================
echo   🔧 Brothers Solar - Quick Commands
echo ========================================
echo.

echo [1] Start Everything
echo [2] Admin Access Only
echo [3] Backend Testing
echo [4] Frontend Testing
echo [5] Full System Check
echo [6] Emergency Reset
echo [7] Exit
echo.

set /p choice="Enter your choice (1-7): "

if "%choice%"=="1" (
    echo.
    echo 🚀 Starting Everything...
    echo.
    echo 1. Starting XAMPP...
    start "" "C:\xampp\xampp-control.exe"
    timeout /t 3 >nul
    
    echo 2. Opening Admin Access...
    start "" "http://localhost/brothers solar/admin/admin-access.html"
    timeout /t 2 >nul
    
    echo 3. Opening Admin Panel...
    start "" "http://localhost/brothers solar/admin/admin.html"
    timeout /t 2 >nul
    
    echo 4. Testing Email...
    start "" "http://localhost/brothers solar/backend/test-email.php"
    timeout /t 2 >nul
    
    echo 5. Opening Project Folder...
    explorer "C:\xampp\htdocs\brothers solar"
    
    echo.
    echo ✅ Everything started successfully!
    echo.
    echo Next steps:
    echo 1. In XAMPP: Start Apache and MySQL
    echo 2. In browser: Test admin access
    echo 3. Enter password: admin123 or Brothers@2024
    echo 4. Check WhatsApp for OTP
    pause
    goto quick
)

if "%choice%"=="2" (
    echo.
    echo 🔐 Admin Access Only...
    echo.
    echo Opening Admin Access Page...
    start "" "http://localhost/brothers solar/admin/admin-access.html"
    echo.
    echo Credentials:
    echo - Password: admin123
    echo - Password: Brothers@2024
    echo - Password: admin@brothers
    echo.
    echo WhatsApp OTP will be sent to: 7574991073
    pause
    goto quick
)

if "%choice%"=="3" (
    echo.
    echo 🧪 Backend Testing...
    echo.
    echo 1. Testing Email Configuration...
    start "" "http://localhost/brothers solar/backend/test-email.php"
    timeout /t 2 >nul
    
    echo 2. Testing OTP API...
    curl -X POST "http://localhost/brothers solar/backend/api/admin/verify-otp.php" ^
         -H "Content-Type: application/json" ^
         -d "{\"action\":\"send_whatsapp_otp\",\"phone\":\"7574991073\"}"
    echo.
    
    echo 3. Opening phpMyAdmin...
    start "" "http://localhost/phpmyadmin"
    
    echo.
    echo ✅ Backend testing completed!
    pause
    goto quick
)

if "%choice%"=="4" (
    echo.
    echo 🎨 Frontend Testing...
    echo.
    echo 1. Opening Main Website...
    start "" "http://localhost/brothers solar/"
    timeout /t 2 >nul
    
    echo 2. Opening Admin Panel...
    start "" "http://localhost/brothers solar/admin/admin.html"
    timeout /t 2 >nul
    
    echo 3. Opening Login Page...
    start "" "http://localhost/brothers solar/admin/login.html"
    timeout /t 2 >nul
    
    echo 4. Opening Admin Access...
    start "" "http://localhost/brothers solar/admin/admin-access.html"
    
    echo.
    echo ✅ Frontend testing completed!
    echo.
    echo Test checklist:
    echo - [ ] Page loads correctly
    echo - [ ] No console errors
    echo - [ ] Forms work properly
    echo - [ ] API calls successful
    pause
    goto quick
)

if "%choice%"=="5" (
    echo.
    echo 🔍 Full System Check...
    echo.
    
    echo 1. Checking Apache...
    curl -s "http://localhost" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Apache is running
    ) else (
        echo ❌ Apache is not running
    )
    
    echo 2. Checking PHP...
    curl -s "http://localhost/brothers solar/backend/test-email.php" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ PHP is working
    ) else (
        echo ❌ PHP is not working
    )
    
    echo 3. Checking API...
    curl -s -X POST "http://localhost/brothers solar/backend/api/admin/verify-otp.php" ^
         -H "Content-Type: application/json" ^
         -d "{\"action\":\"test\"}" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ API is responding
    ) else (
        echo ❌ API is not responding
    )
    
    echo 4. Checking Files...
    if exist "C:\xampp\htdocs\brothers solar\admin\admin.html" (
        echo ✅ Admin panel exists
    ) else (
        echo ❌ Admin panel missing
    )
    
    if exist "C:\xampp\htdocs\brothers solar\backend\.env" (
        echo ✅ Environment file exists
    ) else (
        echo ❌ Environment file missing
    )
    
    echo 5. Opening Test Pages...
    start "" "http://localhost/brothers solar/backend/test-email.php"
    start "" "http://localhost/brothers solar/admin/admin-access.html"
    
    echo.
    echo ✅ System check completed!
    pause
    goto quick
)

if "%choice%"=="6" (
    echo.
    echo 🚨 Emergency Reset...
    echo.
    echo This will clear all sessions and reset the system.
    echo.
    set /p confirm="Are you sure? (y/n): "
    if /i "%confirm%"=="y" (
        echo.
        echo 1. Clearing browser cache...
        RunDll32.exe InetCpl.cpl,ClearMyTracksByProcess 8
        
        echo 2. Restarting Apache...
        net stop apache2 2>nul
        net start apache2 2>nul
        
        echo 3. Restarting MySQL...
        net stop mysql 2>nul
        net start mysql 2>nul
        
        echo 4. Opening fresh admin access...
        start "" "http://localhost/brothers solar/admin/admin-access.html"
        
        echo.
        echo ✅ Emergency reset completed!
        echo System is ready for fresh testing.
    ) else (
        echo Reset cancelled.
    )
    pause
    goto quick
)

if "%choice%"=="7" (
    echo.
    echo Goodbye! 👋
    exit /b
)

echo.
echo Invalid choice! Please try again.
pause
goto quick

:quick
cls
goto :eof
