// Backend API Configuration Only
// This file contains only backend configuration and client setup

const API_BASE_URL = (() => {
    try {
        const { protocol, hostname, port, origin } = window.location;

        // Vercel deployment
        if (hostname.includes('vercel.app')) {
            return `${origin}/api`;
        }
        
        // Netlify deployment (fallback)
        if (hostname.includes('netlify.app')) {
            return 'https://brothers-solar-backend.onrender.com/api';
        }
        
        // Local dev default: frontend may be on Apache/XAMPP (any port), backend on :3003
        const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
        if (isLocalHost && port !== '3003') {
            return `${protocol}//${hostname}:3003/api`;
        }

        // If frontend is on the same port as backend (or production behind proxy), use same origin
        return `${origin}/api`;
    } catch (_) {
        // Fallback
        return 'http://localhost:3003/api';
    }
})();

// API Helper Functions
class ApiClient {
    constructor() {
        this.baseURL = window.API_BASE_URL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            
            // Use enhanced error handler if available
            if (window.handleAPIError) {
                window.handleAPIError(error, `API ${endpoint}`);
            }
            
            throw error;
        }
    }

    // GET request
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    // POST request
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// Create API client instance
const api = new ApiClient();

// Export API configuration and client
window.API_BASE_URL = API_BASE_URL;
window.api = api;
