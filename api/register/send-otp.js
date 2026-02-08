const crypto = require('crypto');
const nodemailer = require('nodemailer');

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

function getRedisKey(email) {
    return `otp:register:${email}`;
}

async function upstashSet(key, value, ttlSeconds) {
    const base = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!base || !token) throw new Error('Upstash env vars missing');

    const url = `${base}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?EX=${ttlSeconds}`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.error) {
        throw new Error(data.error || 'Upstash SET failed');
    }
}

function getTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        throw new Error('SMTP env vars missing');
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

    await transporter.sendMail({
        from,
        to,
        subject: 'Your Registration OTP - Brothers Solar',
        text: `Your OTP is: ${otp}. It will expire in 10 minutes.`
    });
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

        await upstashSet(getRedisKey(normalized), otpHash, ttlSeconds);
        await sendOtpEmail(normalized, otp);

        return res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            data: { email: normalized, expiresIn: ttlSeconds }
        });
    } catch (err) {
        console.error('register/send-otp error:', err);
        return res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
};
