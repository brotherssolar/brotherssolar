# 🚀 Brothers Solar - Setup & Run Commands

## 📋 Prerequisites
- XAMPP Server installed
- Node.js (optional for frontend development)
- Git (optional)

## 🗂️ Project Structure
```
c:\xampp\htdocs\brothers solar\
├── admin\
│   ├── admin.html
│   ├── admin-access.html
│   ├── login.html
│   └── admin-script.js
├── backend\
│   ├── .env
│   └── api\
│       └── admin\
│           └── verify-otp.php
├── index.html
├── register.html
└── login.html
```

## 🎯 Quick Start Commands

### 1️⃣ Start XAMPP Server
```bash
# Start Apache & MySQL
# Open XAMPP Control Panel
# Click "Start" on Apache
# Click "Start" on MySQL
```

### 2️⃣ Start Backend (Node.js API)
```bash
# Open PowerShell / CMD

# Go to backend folder
cd "c:\xampp\htdocs\brothers solar\backend"

# Install dependencies (run once)
npm install

# Start backend server
npm start

# If you want auto-reload during development
# npm run dev
```

### 3️⃣ Frontend (Apache) + Pages
```bash
# Main website
http://localhost/brothers%20solar/

# Admin access (WhatsApp code page)
http://localhost/brothers%20solar/admin/admin-access.html

# Admin panel
http://localhost/brothers%20solar/admin/admin.html
```

### 4️⃣ Database Setup
```bash
# Open phpMyAdmin
# URL: http://localhost/phpmyadmin
# Create database: brothers_solar
# Import SQL file (if available)
```

## 🔧 Development Commands

### Backend Testing
```bash
# Test email configuration
http://localhost/brothers%20solar/backend/test-email.php

# Test OTP API
curl -X POST http://localhost/brothers%20solar/backend/api/admin/verify-otp.php \
  -H "Content-Type: application/json" \
  -d '{"action":"send_whatsapp_otp","phone":"7574991073"}'
```

### Frontend Testing
```bash
# Open browser developer tools
# Press F12 or Ctrl+Shift+I
# Check Console for errors
# Check Network tab for API calls
```

## 📱 Admin Access Flow

### Step 1: Admin Access Page
```bash
# Open: http://localhost/brothers%20solar/admin/admin-access.html
# Enter admin password: admin123 or Brothers@2024 or admin@brothers
# Click "Send Code via WhatsApp"
```

### Step 2: WhatsApp OTP
```bash
# Check WhatsApp for OTP
# Enter 6-digit code
# Click "Verify Code"
```

### Step 3: Admin Panel
```bash
# Access: http://localhost/brothers%20solar/admin/admin.html
# Session persists on refresh
# Full admin functionality
```

## 🛠️ Configuration Files

### Environment Variables (.env)
```bash
# Location: c:\xampp\htdocs\brothers solar\backend\.env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=brotherssolar01@gmail.com
SMTP_PASS=qwne avny jyhr wlyq

# MSG91 Configuration
MSG91_AUTHKEY=492818AxbI26DnH7YQ69860f5cP1
MSG91_SENDER=BRTHSL
MSG91_DLT_TEMPLATE_ID=1207161692627246889
```

### XAMPP Configuration
```bash
# Apache Config: C:\xampp\apache\conf\httpd.conf
# Enable mod_rewrite
# AllowOverride All

# PHP Config: C:\xampp\php\php.ini
# Enable extensions: curl, openssl, mbstring
# Set error_reporting = E_ALL
# Set display_errors = On
```

## 🐛 Troubleshooting Commands

### Check Server Status
```bash
# Check Apache
http://localhost

# Check PHP
http://localhost/brothers%20solar/backend/test-email.php

# Check API
http://localhost/brothers%20solar/backend/api/admin/verify-otp.php
```

### Common Issues
```bash
# 404 Error: Check file paths and .htaccess
# 500 Error: Check PHP error logs
# CORS Error: Check API headers
# Email not sending: Check SMTP configuration
# WhatsApp not working: Check MSG91 configuration
```

### Log Files
```bash
# Apache Error Log: C:\xampp\apache\logs\error.log
# PHP Error Log: C:\xampp\php\logs\php_error_log
# XAMPP Log: C:\xampp\apache\logs\access.log
```

## 🚀 Production Deployment

### 1. Backup
```bash
# Backup database
# Backup files
# Export configurations
```

### 2. Update Config
```bash
# Update .env with production values
# Update database credentials
# Update domain URLs
```

### 3. Security
```bash
# Change default passwords
# Enable HTTPS
# Set up firewall rules
# Update file permissions
```

## 📞 Support Commands

### Quick Test
```bash
# Test everything works
curl http://localhost/brothers%20solar/
curl http://localhost/brothers%20solar/admin/admin-access.html
curl -X POST http://localhost/brothers%20solar/backend/api/admin/verify-otp.php
```

### Debug Mode
```bash
# Enable PHP errors
ini_set('display_errors', 1);
error_reporting(E_ALL);

# Check browser console
# Check network requests
# Check server logs
```

## 🎯 Daily Workflow

### Morning Setup
```bash
# 1. Start XAMPP
# 2. Open browser
# 3. Test admin access
# 4. Check email/SMS
```

### Development
```bash
# 1. Make changes
# 2. Test in browser
# 3. Check console
# 4. Deploy changes
```

### End of Day
```bash
# 1. Backup changes
# 2. Stop XAMPP
# 3. Save logs
# 4. Document issues
```

---

## 📱 Quick Access URLs

| Page | URL | Purpose |
|------|-----|---------|
| Main Site | http://localhost/brothers%20solar/ | Customer website |
| Admin Access | http://localhost/brothers%20solar/admin/admin-access.html | WhatsApp OTP login |
| Admin Panel | http://localhost/brothers%20solar/admin/admin.html | Admin dashboard |
| Login | http://localhost/brothers%20solar/admin/login.html | Alternative login |
| Email Test | http://localhost/brothers%20solar/backend/test-email.php | Test email config |

## 🔑 Admin Credentials

| Username | Password | Purpose |
|----------|----------|---------|
| admin123 | admin123 | Admin access |
| Brothers@2024 | Brothers@2024 | Admin access |
| admin@brothers | admin@brothers | Admin access |

---

**🎉 Happy Coding! 🚀**

*For any issues, check the troubleshooting section or contact support.*
