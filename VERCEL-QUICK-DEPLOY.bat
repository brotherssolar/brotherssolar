@echo off
title Brothers Solar - Vercel Deployment
color 0E

echo ========================================
echo     🚀 BROTHERS SOLAR VERCEL DEPLOYMENT
echo ========================================
echo.

echo This script will help you deploy your website on Vercel
echo.
echo 📋 DEPLOYMENT STEPS:
echo.
echo [1] Setup GitHub Repository
echo [2] Install Vercel CLI
echo [3] Login to Vercel
echo [4] Deploy to Vercel
echo [5] Setup Environment Variables
echo [6] Test Deployment
echo [7] View Live Site
echo [8] Exit
echo.

set /p choice="Choose deployment step (1-8): "

if "%choice%"=="1" goto setup_github
if "%choice%"=="2" goto install_vercel
if "%choice%"=="3" goto login_vercel
if "%choice%"=="4" goto deploy_vercel
if "%choice%"=="5" goto setup_env
if "%choice%"=="6" goto test_deployment
if "%choice%"=="7" goto view_live
if "%choice%"=="8" goto exit

:setup_github
echo.
echo 🔧 GITHUB REPOSITORY SETUP
echo.
echo 1. Open browser: https://github.com
echo 2. Create new repository: brothers-solar
echo 3. Run these commands in terminal:
echo.
echo    git init
echo    git add .
echo    git commit -m "Ready for Vercel deployment"
echo    git branch -M main
echo    git remote add origin https://github.com/yourusername/brothers-solar.git
echo    git push -u origin main
echo.
echo Press any key when repository is ready...
pause >nul
goto menu

:install_vercel
echo.
echo 📦 INSTALL VERCEL CLI
echo.
echo Installing Vercel CLI globally...
npm install -g vercel
echo.
echo ✅ Vercel CLI installed successfully!
echo.
pause
goto menu

:login_vercel
echo.
echo 🔑 LOGIN TO VERCEL
echo.
echo 1. Open browser: https://vercel.com
echo 2. Sign up with GitHub
echo 3. Run login command:
echo.
echo    vercel login
echo.
echo Opening terminal for login...
start cmd /k "vercel login"
pause
goto menu

:deploy_vercel
echo.
echo 🚀 DEPLOY TO VERCEL
echo.
echo Deploying your project to Vercel...
echo.
echo This will:
echo 1. Build your project
echo 2. Deploy to Vercel
echo 3. Provide live URL
echo.
echo Running deployment command...
start cmd /k "vercel --prod"
echo.
echo ⏳ Deployment in progress...
echo Check the terminal for progress.
echo.
pause
goto menu

:setup_env
echo.
echo ⚙️ SETUP ENVIRONMENT VARIABLES
echo.
echo 1. Go to your Vercel project dashboard
echo 2. Go to Settings → Environment Variables
echo 3. Add these variables:
echo.
echo    NODE_ENV=production
echo    DB_HOST=your-database-host
echo    DB_PASSWORD=your-database-password
echo    JWT_SECRET=your-jwt-secret
echo    SMTP_HOST=smtp.gmail.com
echo    SMTP_PORT=587
echo    SMTP_USER=your-email@gmail.com
echo    SMTP_PASS=your-app-password
echo    RAZORPAY_KEY_ID=your-razorpay-key
echo    RAZORPAY_KEY_SECRET=your-razorpay-secret
echo.
echo Opening Vercel dashboard...
start https://vercel.com/dashboard
pause
goto menu

:test_deployment
echo.
echo 🧪 TEST DEPLOYMENT
echo.
echo Testing your deployed website...
echo.
echo Opening test URLs:
echo - Main website
echo - API health check
echo - Registration page
echo - Admin panel
echo.
echo 🌐 Test URLs:
echo - https://brothers-solar.vercel.app
echo - https://brothers-solar.vercel.app/api/health
echo - https://brothers-solar.vercel.app/register.html
echo - https://brothers-solar.vercel.app/admin.html
echo.
start https://brothers-solar.vercel.app
start https://brothers-solar.vercel.app/api/health
start https://brothers-solar.vercel.app/register.html
start https://brothers-solar.vercel.app/admin.html
pause
goto menu

:view_live
echo.
echo 🌍 VIEW LIVE SITE
echo.
echo Opening your live Vercel website...
echo.
echo 🌐 Live URLs:
echo - Main Site: https://brothers-solar.vercel.app
echo - Register: https://brothers-solar.vercel.app/register.html
echo - Admin: https://brothers-solar.vercel.app/admin.html
echo - Customer: https://brothers-solar.vercel.app/customer.html
echo.
start https://brothers-solar.vercel.app
start https://brothers-solar.vercel.app/admin.html
pause
goto menu

:menu
cls
goto :eof

:exit
echo.
echo 🎉 VERCEL DEPLOYMENT COMPLETE!
echo.
echo Your Brothers Solar website is now live on Vercel! 🚀
echo.
echo 📋 Next Steps:
echo 1. Test all functionality
echo 2. Setup custom domain (optional)
echo 3. Configure analytics
echo 4. Monitor performance
echo.
echo 🌐 Live URLs:
echo - Main Site: https://brothers-solar.vercel.app
echo - Admin Panel: /admin.html
echo - Customer Dashboard: /customer.html
echo - API Endpoints: /api/*
echo.
echo 📚 Documentation:
echo - Read VERCEL-DEPLOYMENT-GUIDE.md for detailed instructions
echo - Check Vercel dashboard for analytics and logs
echo.
pause
exit
