const crypto = require('crypto');
const { addUser } = require('../utils/userStorage');

function normalizeEmail(email) {
    if (!email || typeof email !== 'string') return '';
    return email.trim().toLowerCase();
}

function hashOtp(otp) {
    return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

// Use real Upstash Redis
async function upstashGet(key) {
    const base = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!base || !token) {
        throw new Error('Redis environment variables missing');
    }

    const url = `${base}/get/${encodeURIComponent(key)}`;
    console.log('Getting OTP:', { url, key: key.substring(0, 20) + '...' });
    
    const resp = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.error) {
        console.error('Upstash GET error:', data);
        throw new Error(data.error || 'Upstash GET failed');
    }

    return data.result || null;
}

async function upstashDel(key) {
    const base = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!base || !token) {
        throw new Error('Redis environment variables missing');
    }

    const url = `${base}/del/${encodeURIComponent(key)}`;
    console.log('Deleting OTP:', { url, key: key.substring(0, 20) + '...' });
    
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.error) {
        console.error('Upstash DEL error:', data);
        throw new Error(data.error || 'Upstash DEL failed');
    }
    
    console.log('OTP deleted successfully');
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

        console.log('Verifying OTP for:', normalized);

        // Get stored data from Redis
        const storedData = await upstashGet(`otp:register:${normalized}`);
        if (!storedData) {
            return res.status(400).json({ success: false, message: 'OTP expired or not found' });
        }

        let parsedData;
        try {
            parsedData = JSON.parse(storedData);
        } catch {
            return res.status(400).json({ success: false, message: 'Invalid registration data' });
        }

        const { otpHash, userData } = parsedData;
        const incomingHash = hashOtp(otp);
        
        if (incomingHash !== otpHash) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        // Delete OTP after successful verification
        await upstashDel(`otp:register:${normalized}`);

        // Save user to storage
        try {
            const savedUser = await addUser(userData);
            console.log('✅ User saved successfully:', savedUser.email);
        } catch (saveError) {
            console.error('Failed to save user:', saveError);
            return res.status(500).json({ success: false, message: 'Failed to save user data' });
        }

        return res.status(200).json({
            success: true,
            message: 'Registration successful! You can now login.',
            data: { email: normalized, verified: true }
        });
    } catch (err) {
        console.error('register/verify-otp error:', err);
        return res.status(500).json({ 
            success: false, 
            message: err.message || 'Failed to verify OTP' 
        });
    }
};
