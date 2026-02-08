const crypto = require('crypto');

function normalizeEmail(email) {
    if (!email || typeof email !== 'string') return '';
    return email.trim().toLowerCase();
}

function hashOtp(otp) {
    return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

// Mock storage for testing
const mockStorage = {};

async function upstashGet(key) {
    // For testing without Upstash - get from memory
    const item = mockStorage[key];
    if (!item) return null;
    
    // Check if expired
    if (Date.now() > item.expires) {
        delete mockStorage[key];
        return null;
    }
    
    return item.value;
}

async function upstashDel(key) {
    // For testing without Upstash - delete from memory
    delete mockStorage[key];
    console.log('Mock OTP deleted:', key);
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
        const { email, otp } = req.body || {};
        const normalized = normalizeEmail(email);
        if (!normalized || !normalized.includes('@') || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        }

        const storedHash = await upstashGet(`otp:register:${normalized}`);
        if (!storedHash) {
            return res.status(400).json({ success: false, message: 'OTP expired or not found' });
        }

        const incomingHash = hashOtp(otp);
        if (incomingHash !== storedHash) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        await upstashDel(`otp:register:${normalized}`);

        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully (MOCK MODE)',
            data: { email: normalized, verified: true }
        });
    } catch (err) {
        console.error('register/verify-otp error:', err);
        return res.status(500).json({ success: false, message: 'Failed to verify OTP' });
    }
};
