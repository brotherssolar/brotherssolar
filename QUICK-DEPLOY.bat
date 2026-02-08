@echo off
title Brothers Solar - Official Deployment
color 0B

echo ========================================
echo     🚀 BROTHERS SOLAR OFFICIAL DEPLOYMENT
echo ========================================
echo.

echo This script will help you deploy your website officially
echo.
echo 📋 DEPLOYMENT CHECKLIST:
echo.
echo [1] Setup Backend (Render.com)
echo [2] Setup Database (Supabase.com)
echo [3] Setup Email (SendGrid.com)
echo [4] Deploy Frontend (Netlify.com)
echo [5] Setup Domain (Optional)
echo [6] Test Everything
echo [7] View Live Site
echo [8] Exit
echo.

set /p choice="Choose deployment step (1-8): "

if "%choice%"=="1" goto setup_backend
if "%choice%"=="2" goto setup_database
if "%choice%"=="3" goto setup_email
if "%choice%"=="4" goto deploy_frontend
if "%choice%"=="5" goto setup_domain
if "%choice%"=="6" goto test_everything
if "%choice%"=="7" goto view_live
if "%choice%"=="8" goto exit

:setup_backend
echo.
echo 🔧 BACKEND SETUP (Render.com)
echo.
echo 1. Open browser: https://render.com
echo 2. Sign up with GitHub
echo 3. Create new Web Service
echo 4. Connect your GitHub repository
echo 5. Build Command: npm install
echo 6. Start Command: node server.js
echo 7. Set environment variables (see OFFICIAL-DEPLOYMENT-PLAN.md)
echo.
echo Press any key when backend is deployed...
pause >nul
goto menu

:setup_database
echo.
echo 🗄️ DATABASE SETUP (Supabase.com)
echo.
echo 1. Open browser: https://supabase.com
echo 2. Sign up with GitHub
echo 3. Create new project
echo 4. Run SQL commands from OFFICIAL-DEPLOYMENT-PLAN.md
echo 5. Get connection string
echo 6. Update backend environment variables
echo.
echo Press any key when database is ready...
pause >nul
goto menu

:setup_email
echo.
echo 📧 EMAIL SETUP (SendGrid.com)
echo.
echo 1. Open browser: https://sendgrid.com
echo 2. Sign up for free account
echo 3. Verify sender email
echo 4. Create API key
echo 5. Update backend environment variables
echo.
echo Press any key when email is configured...
pause >nul
goto menu

:deploy_frontend
echo.
echo 🌐 FRONTEND DEPLOYMENT (Netlify.com)
echo.
echo 1. Open browser: https://netlify.com
echo 2. Sign up with GitHub
echo 3. New site from Git
echo 4. Choose your repository
echo 5. Deploy settings: No build needed
echo 6. Deploy site
echo.
echo Press any key when frontend is deployed...
pause >nul
goto menu

:setup_domain
echo.
echo 🌍 DOMAIN SETUP (Optional)
echo.
echo 1. Buy domain from GoDaddy/Namecheap
echo 2. Configure DNS records
echo 3. Add custom domain in Netlify
echo 4. Wait for DNS propagation (24-48 hours)
echo.
echo Press any key when domain is configured...
pause >nul
goto menu

:test_everything
echo.
echo 🧪 TESTING EVERYTHING
echo.
echo Testing checklist:
echo.
echo □ Backend accessible: https://your-backend.onrender.com/api/health
echo □ Frontend loads: https://your-site.netlify.app
echo □ Registration works: /register.html
echo □ Admin panel works: /admin.html
echo □ OTP sending works
echo □ Database connected
echo □ Email service working
echo □ Payment gateway functional
echo.
echo Open browser to test all features...
start https://your-site.netlify.app
start https://your-site.netlify.app/admin.html
start https://your-site.netlify.app/register.html
pause
goto menu

:view_live
echo.
echo 🌍 VIEWING LIVE SITE
echo.
echo Opening your live website...
echo.
echo Main Site: https://brotherssolar.netlify.app
echo Admin Panel: https://brotherssolar.netlify.app/admin.html
echo Customer Dashboard: https://brotherssolar.netlify.app/customer.html
echo.
start https://brotherssolar.netlify.app
start https://brotherssolar.netlify.app/admin.html
pause
goto menu

:menu
cls
goto :eof

:exit
echo.
echo 🎉 DEPLOYMENT COMPLETE!
echo.
echo Your Brothers Solar website is now officially live! 🚀
echo.
echo 📋 Next Steps:
echo 1. Test all functionality
echo 2. Monitor performance
echo 3. Collect user feedback
echo 4. Plan improvements
echo.
echo 🌐 Live URLs:
echo - Main Site: https://brotherssolar.netlify.app
echo - Admin Panel: /admin.html
echo - Customer Dashboard: /customer.html
echo.
pause
exit
