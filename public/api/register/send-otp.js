const crypto = require('crypto');

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

// Mock storage for testing
const mockStorage = {};

async function upstashSet(key, value, ttlSeconds) {
    // For testing without Upstash - store in memory
    mockStorage[key] = { value, expires: Date.now() + (ttlSeconds * 1000) };
    console.log('Mock OTP stored:', { key, value, ttlSeconds });
}

function getTransporter() {
    // For testing without SMTP - just log the OTP
    return {
        sendMail: async (options) => {
            console.log('Mock email:', options);
        }
    };
}

async function sendOtpEmail(to, otp) {
    const transporter = getTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'test@brotherssolar.com';

    await transporter.sendMail({
        from,
        to,
        subject: 'Your Registration OTP - Brothers Solar',
        text: `Your OTP is: ${otp}. It will expire in 10 minutes.`
    });
    
    console.log(`MOCK: OTP ${otp} sent to ${to}`);
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

        const otp = generateOtp();
        const otpHash = hashOtp(otp);
        const ttlSeconds = 10 * 60;

        await upstashSet(`otp:register:${normalized}`, otpHash, ttlSeconds);
        await sendOtpEmail(normalized, otp);

        return res.status(200).json({
            success: true,
            message: 'OTP sent successfully (MOCK MODE)',
            data: { 
                email: normalized, 
                expiresIn: ttlSeconds,
                mockOtp: otp, // Only for testing
                note: 'This is mock mode - check console for OTP'
            }
        });
    } catch (err) {
        console.error('register/send-otp error:', err);
        return res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
};
