const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'brothers_solar',
    port: process.env.DB_PORT || 3306
};

// OTP Storage (in memory for now)
const otpStore = {};

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
}

// Email configuration
function getTransporter() {
    return nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER || 'brotherssolar01@gmail.com',
            pass: process.env.SMTP_PASS || 'lmrv ceos sgpt wmqn'
        }
    });
}

async function sendOtpEmail(to, otp, type) {
    const transporter = getTransporter();
    const subject = type === 'register' ? 'Your Registration OTP - Brothers Solar' : 'Your Login OTP - Brothers Solar';
    const html = `
        <h2>Your OTP: ${otp}</h2>
        <p>This OTP will expire in 10 minutes.</p>
        <p>${type === 'register' ? 'Thank you for registering' : 'Welcome back'} to Brothers Solar!</p>
    `;
    
    await transporter.sendMail({
        from: process.env.SMTP_USER || 'brotherssolar01@gmail.com',
        to,
        subject,
        text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
        html
    });
    
    console.log(`✅ ${type} OTP ${otp} sent to ${to}`);
}

// Check if user exists
async function userExists(email) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
        await connection.end();
        return rows.length > 0;
    } catch (error) {
        console.error('Error checking user existence:', error);
        return false;
    }
}

// Add new user
async function addUser(userData) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute(
            'INSERT INTO users (email, password, firstName, lastName, phone) VALUES (?, ?, ?, ?, ?)',
            [userData.email.toLowerCase(), userData.password, userData.firstName, userData.lastName, userData.phone]
        );
        await connection.end();
        return { id: result.insertId, ...userData };
    } catch (error) {
        console.error('Error adding user:', error);
        throw error;
    }
}

// Get user by email
async function getUser(email) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
        await connection.end();
        return rows[0] || null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

// Register Send OTP - sends to user's registered email
app.post('/api/register/send-otp', async (req, res) => {
    try {
        const { email, firstName, lastName, phone, password } = req.body;
        
        if (!email || !firstName || !lastName || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        
        // Check if user already exists
        if (await userExists(normalizedEmail)) {
            return res.status(400).json({ success: false, message: 'User already exists with this email' });
        }

        // Generate new OTP every time
        const otp = generateOtp();
        const otpHash = hashOtp(otp);
        
        // Store OTP and user data
        otpStore[normalizedEmail] = {
            otpHash,
            userData: { email: normalizedEmail, firstName, lastName, phone, password },
            expires: Date.now() + 10 * 60 * 1000 // 10 minutes
        };

        // Send email to the same email user provided
        try {
            await sendOtpEmail(normalizedEmail, otp, 'register');
            console.log(`📧 Registration OTP ${otp} sent to user's email: ${normalizedEmail}`);
        } catch (emailError) {
            console.error('Email send failed:', emailError);
            // Still continue even if email fails
        }

        res.json({
            success: true,
            message: `OTP sent to your email: ${normalizedEmail}`,
            data: { email: normalizedEmail, expiresIn: 600 }
        });
    } catch (error) {
        console.error('Register send OTP error:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
});

// Register Verify OTP
app.post('/api/register/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const storedData = otpStore[normalizedEmail];

        if (!storedData || Date.now() > storedData.expires) {
            return res.status(400).json({ success: false, message: 'OTP expired or not found' });
        }

        const incomingHash = hashOtp(otp);
        if (incomingHash !== storedData.otpHash) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        // Save user to database
        try {
            const savedUser = await addUser(storedData.userData);
            delete otpStore[normalizedEmail]; // Clean up
            
            console.log(`✅ User registered successfully: ${savedUser.email}`);
            
            res.json({
                success: true,
                message: 'Registration successful! You can now login.',
                data: { email: normalizedEmail, userId: savedUser.id }
            });
        } catch (saveError) {
            console.error('Failed to save user:', saveError);
            res.status(500).json({ success: false, message: 'Failed to save user data' });
        }
    } catch (error) {
        console.error('Register verify OTP error:', error);
        res.status(500).json({ success: false, message: 'Failed to verify OTP' });
    }
});

// Login Send OTP - sends to registered user's email only
app.post('/api/login/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        
        // Check if user exists in database
        const user = await getUser(normalizedEmail);
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found. Please register first.' });
        }

        // Generate new OTP every time
        const otp = generateOtp();
        const otpHash = hashOtp(otp);
        
        // Store OTP
        otpStore[normalizedEmail] = {
            otpHash,
            userId: user.id,
            expires: Date.now() + 10 * 60 * 1000 // 10 minutes
        };

        // Send email to registered user's email
        try {
            await sendOtpEmail(normalizedEmail, otp, 'login');
            console.log(`📧 Login OTP ${otp} sent to registered user: ${normalizedEmail}`);
        } catch (emailError) {
            console.error('Email send failed:', emailError);
            // Continue even if email fails
        }

        res.json({
            success: true,
            message: `Login OTP sent to your registered email: ${normalizedEmail}`,
            data: { email: normalizedEmail, expiresIn: 600 }
        });
    } catch (error) {
        console.error('Login send OTP error:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
});

// Login Verify OTP
app.post('/api/login/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const storedData = otpStore[normalizedEmail];

        if (!storedData || Date.now() > storedData.expires) {
            return res.status(400).json({ success: false, message: 'OTP expired or not found' });
        }

        const incomingHash = hashOtp(otp);
        if (incomingHash !== storedData.otpHash) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        // Get user data from database
        const user = await getUser(normalizedEmail);
        delete otpStore[normalizedEmail]; // Clean up

        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }

        console.log(`✅ User logged in successfully: ${user.email}`);

        res.json({
            success: true,
            message: 'Login successful! Redirecting to dashboard...',
            data: { 
                email: normalizedEmail, 
                userId: user.id,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        console.error('Login verify OTP error:', error);
        res.status(500).json({ success: false, message: 'Failed to verify OTP' });
    }
});

// Get all users (for admin)
app.get('/api/users', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT id, email, firstName, lastName, phone, status, createdAt FROM users ORDER BY createdAt DESC');
        await connection.end();
        
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ success: false, message: 'Failed to get users' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'OTP Backend Server is running',
        timestamp: new Date().toISOString(),
        database: 'MySQL',
        email: 'Gmail SMTP'
    });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 OTP Backend Server running on port ${PORT}`);
    console.log(`📧 Email OTP system ready`);
    console.log(`🗄️  Database: MySQL`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
});

module.exports = app;
