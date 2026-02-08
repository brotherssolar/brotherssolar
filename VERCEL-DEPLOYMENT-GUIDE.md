========================================
     🚀 BROTHERS SOLAR VERCEL DEPLOYMENT
     Complete Step-by-Step Guide
========================================

आपका Brothers Solar project को Vercel पर deploy करने के लिए complete guide.

========================================
     🎯 VERCEL DEPLOYMENT ADVANTAGES
========================================

✅ **Benefits of Vercel:**
- Frontend + Backend together (Full-stack)
- Serverless functions included
- Global CDN
- Automatic HTTPS
- Custom domains
- Git integration
- Free tier available

========================================
     📋 DEPLOYMENT REQUIREMENTS
========================================

### **Prerequisites:**
1. GitHub repository
2. Vercel account
3. Node.js backend ready
4. Environment variables ready

### **Files Created for Vercel:**
- `vercel.json` - Deployment configuration
- `package.json` - Build settings
- Updated API configurations

========================================
     🚀 STEP-BY-STEP DEPLOYMENT
========================================

### **Step 1: Prepare GitHub Repository**

1.1 **Create/Update Repository:**
```bash
git init
git add .
git commit -m "Ready for Vercel deployment"
git branch -M main
git remote add origin https://github.com/yourusername/brothers-solar.git
git push -u origin main
```

1.2 **Repository Structure:**
```
brothers-solar/
├── index.html
├── register.html
├── admin.html
├── customer.html
├── api.js
├── api-functions.js
├── script.js
├── register-script.js
├── style.css
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env
├── vercel.json
├── package.json
└── favicon.ico
```

### **Step 2: Vercel Account Setup**

2.1 **Create Vercel Account:**
- Go to https://vercel.com
- Sign up with GitHub
- Verify email

2.2 **Install Vercel CLI (Optional):**
```bash
npm i -g vercel
```

### **Step 3: Deploy to Vercel**

3.1 **Method 1: Web Dashboard (Easiest)**
1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import GitHub repository
4. Vercel will auto-detect settings
5. Click "Deploy"

3.2 **Method 2: Vercel CLI**
```bash
vercel --prod
```

### **Step 4: Configure Environment Variables**

4.1 **In Vercel Dashboard:**
1. Go to Project → Settings → Environment Variables
2. Add these variables:

```
NODE_ENV=production
DB_HOST=your-database-host
DB_PASSWORD=your-database-password
DB_NAME=brothers_solar
JWT_SECRET=your-jwt-secret-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

### **Step 5: Backend Configuration for Vercel**

5.1 **Update backend/server.js:**
```javascript
// Add at the top
const express = require('express');
const cors = require('cors');
const app = express();

// For Vercel serverless functions
module.exports = (req, res) => {
    app(req, res);
};

// For local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3003;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
```

5.2 **Backend Package.json:**
```json
{
  "name": "brothers-solar-backend",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "mysql2": "^3.6.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "nodemailer": "^6.9.4",
    "dotenv": "^16.3.1"
  }
}
```

========================================
     🌐 VERCEL URLS AFTER DEPLOYMENT
========================================

### **Your Live URLs:**
- **Main Website:** `https://brothers-solar.vercel.app`
- **Register Page:** `https://brothers-solar.vercel.app/register.html`
- **Admin Panel:** `https://brothers-solar.vercel.app/admin.html`
- **Customer Dashboard:** `https://brothers-solar.vercel.app/customer.html`
- **API Endpoints:** `https://brothers-solar.vercel.app/api/*`

### **API Endpoints Examples:**
- `GET /api/health`
- `POST /api/register/send-otp`
- `POST /api/register/verify-otp`
- `GET /api/solar-types`
- `POST /api/orders`

========================================
     🔧 VERCEL.JSON CONFIGURATION
========================================

### **Current Configuration:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "."
      }
    },
    {
      "src": "backend/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/backend/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

### **What This Does:**
- Static files served from root
- API routes go to backend/server.js
- All other routes serve static files

========================================
     📧 EMAIL SERVICE ON VERCEL
========================================

### **SendGrid Integration (Recommended):**
```javascript
// In backend/emailService.js
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendOTP = async (email, otp) => {
    const msg = {
        to: email,
        from: 'noreply@brotherssolar.com',
        subject: 'Verify Your Account - Brothers Solar',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2c3e50;">Brothers Solar - Email Verification</h2>
                <p>Your verification code is:</p>
                <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
                    ${otp}
                </div>
                <p>This code will expire in 10 minutes.</p>
            </div>
        `
    };
    
    await sgMail.send(msg);
};
```

### **Environment Variables for SendGrid:**
```
SENDGRID_API_KEY=your-sendgrid-api-key
```

========================================
     🗄️ DATABASE OPTIONS FOR VERCEL
========================================

### **Option 1: Supabase (Recommended)**
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);
```

### **Option 2: MongoDB Atlas**
```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGODB_URI);
```

### **Option 3: PlanetScale (MySQL)**
```javascript
const mysql = require('mysql2/promise');
const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});
```

========================================
     💳 PAYMENT GATEWAY ON VERCEL
========================================

### **Razorpay Integration:**
```javascript
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

app.post('/api/payment/create-order', async (req, res) => {
    const options = {
        amount: req.body.amount * 100, // in paise
        currency: 'INR',
        receipt: 'order_' + Date.now()
    };
    
    const order = await razorpay.orders.create(options);
    res.json(order);
});
```

========================================
     🧪 TESTING AFTER DEPLOYMENT
========================================

### **Checklist:**
□ Website loads: `https://brothers-solar.vercel.app`
□ API health check: `/api/health`
□ Registration page works: `/register.html`
□ OTP sending works
□ Email delivery works
□ Admin panel loads: `/admin.html`
□ Customer dashboard works: `/customer.html`
□ Payment gateway functions
□ Mobile responsive design

### **Test Commands:**
```bash
# Test API health
curl https://brothers-solar.vercel.app/api/health

# Test registration
curl -X POST https://brothers-solar.vercel.app/api/register/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

========================================
     🔒 CUSTOM DOMAIN SETUP
========================================

### **Add Custom Domain:**
1. Go to Vercel Project → Settings → Domains
2. Add your domain: `brotherssolar.com`
3. Update DNS records:
   ```
   A record: @ -> 76.76.21.21
   CNAME: www -> cname.vercel-dns.com
   ```

### **SSL Certificate:**
- Automatically provided by Vercel
- HTTPS enabled by default

========================================
     📊 MONITORING & ANALYTICS
========================================

### **Vercel Analytics:**
- Built-in analytics
- Performance metrics
- Error tracking

### **Speed Insights:**
- Core Web Vitals
- Performance monitoring
- User experience metrics

### **Logs:**
- Function logs
- Error logs
- Request logs

========================================
     💰 VERCEL PRICING
========================================

### **Hobby Tier (Free):**
- 100GB bandwidth/month
- 100 function invocations/day
- 1 serverless function
- Community support

### **Pro Tier ($20/month):**
- Unlimited bandwidth
- Unlimited function invocations
- Unlimited serverless functions
- Priority support
- Advanced analytics

========================================
     🚀 DEPLOYMENT COMMANDS
========================================

### **Quick Deploy Commands:**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Deploy to preview
vercel

# View deployment logs
vercel logs

# Remove deployment
vercel rm <deployment-url>
```

========================================
     🎓 FOR COLLEGE DEMO
========================================

### **Demo URLs:**
- **Live Site:** `https://brothers-solar.vercel.app`
- **Admin:** `/admin.html` (admin/admin123)
- **Register:** `/register.html`
- **API Docs:** `/api/health`

### **Demo Features:**
- Real registration with OTP
- Working payment gateway
- Live admin panel
- Email notifications
- Mobile responsive

========================================
     🔧 TROUBLESHOOTING
========================================

### **Common Issues:**

**Issue 1: Function Timeout**
- Solution: Increase timeout in vercel.json
```json
"functions": {
  "backend/server.js": {
    "maxDuration": 30
  }
}
```

**Issue 2: Environment Variables Not Loading**
- Solution: Check variable names in Vercel dashboard
- Ensure no spaces in variable values

**Issue 3: Database Connection Failed**
- Solution: Check database URL format
- Verify firewall settings

**Issue 4: CORS Errors**
- Solution: Update CORS configuration in backend
```javascript
app.use(cors({
    origin: ['https://brothers-solar.vercel.app', 'http://localhost:3000']
}));
```

========================================
END OF VERCEL DEPLOYMENT GUIDE
========================================

अब आपका project Vercel पर deploy करने के लिए completely ready है! 🚀

========================================
