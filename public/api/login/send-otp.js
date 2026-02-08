const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { getUser } = require('../utils/userStorage');

function normalizeEmail(email) {
    if (!email || typeof email !== 'string') return '';
    return email.trim().toLowerCase();
}

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(otp) {
    return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

// Use real Upstash Redis
async function upstashSet(key, value, ttlSeconds) {
    const base = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!base || !token) {
        throw new Error('Redis environment variables missing');
    }

    const url = `${base}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?EX=${ttlSeconds}`;
    console.log('Storing Login OTP:', { url, key: key.substring(0, 20) + '...' });
    
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.error) {
        console.error('Upstash SET error:', data);
        throw new Error(data.error || 'Upstash SET failed');
    }
    
    console.log('Login OTP stored successfully');
}

// Use real Nodemailer
function getTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        throw new Error('SMTP environment variables missing');
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
    });
}

async function sendOtpEmail(to, otp) {
    const transporter = getTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    try {
        await transporter.sendMail({
            from,
            to,
            subject: 'Your Login OTP - Brothers Solar',
            text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
            html: `<h2>Your Login OTP: ${otp}</h2><p>This OTP will expire in 10 minutes.</p><p>Welcome back to Brothers Solar!</p>`
        });
        
        console.log(`✅ Real Login OTP ${otp} sent to ${to}`);
        return true;
    } catch (error) {
        console.error('Login email send error:', error);
        throw error;
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { email } = req.body || {};
        const normalized = normalizeEmail(email);
        if (!normalized || !normalized.includes('@')) {
            return res.status(400).json({ success: false, message: 'Valid email is required' });
        }

        console.log('Processing login OTP for:', normalized);

        // Check if user exists
        const user = await getUser(normalized);
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found. Please register first.' });
        }

        const otp = generateOtp();
        const otpHash = hashOtp(otp);
        const ttlSeconds = 10 * 60;

        // Store in Redis
        await upstashSet(`otp:login:${normalized}`, otpHash, ttlSeconds);
        
        // Send real email
        await sendOtpEmail(normalized, otp);

        return res.status(200).json({
            success: true,
            message: 'Login OTP sent successfully to your email',
            data: { 
                email: normalized, 
                expiresIn: ttlSeconds
            }
        });
    } catch (err) {
        console.error('login/send-otp error:', err);
        return res.status(500).json({ 
            success: false, 
            message: err.message || 'Failed to send OTP' 
        });
    }
};
