module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // Simple test without any environment variables
    return res.status(200).json({
        success: true,
        message: 'API is working!',
        method: req.method,
        timestamp: new Date().toISOString(),
        env_test: {
            has_redis_url: !!process.env.UPSTASH_REDIS_REST_URL,
            has_redis_token: !!process.env.UPSTASH_REDIS_REST_TOKEN,
            node_env: process.env.NODE_ENV || 'undefined'
        }
    });
};
