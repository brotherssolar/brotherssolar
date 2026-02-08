const crypto = require('crypto');

function normalizeEmail(email) {
    if (!email || typeof email !== 'string') return '';
    return email.trim().toLowerCase();
}

function hashOtp(otp) {
    return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function getRedisKey(email) {
    return `otp:register:${email}`;
}

async function upstashGet(key) {
    const base = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!base || !token) throw new Error('Upstash env vars missing');

    const url = `${base}/get/${encodeURIComponent(key)}`;
    const resp = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.error) {
        throw new Error(data.error || 'Upstash GET failed');
    }

    return data.result || null;
}

async function upstashDel(key) {
    const base = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!base || !token) throw new Error('Upstash env vars missing');

    const url = `${base}/del/${encodeURIComponent(key)}`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.error) {
        throw new Error(data.error || 'Upstash DEL failed');
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
        const { email, otp } = req.body || {};
        const normalized = normalizeEmail(email);
        if (!normalized || !normalized.includes('@') || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        }

        const storedHash = await upstashGet(getRedisKey(normalized));
        if (!storedHash) {
            return res.status(400).json({ success: false, message: 'OTP expired or not found' });
        }

        const incomingHash = hashOtp(otp);
        if (incomingHash !== storedHash) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        await upstashDel(getRedisKey(normalized));

        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            data: { email: normalized, verified: true }
        });
    } catch (err) {
        console.error('register/verify-otp error:', err);
        return res.status(500).json({ success: false, message: 'Failed to verify OTP' });
    }
};
