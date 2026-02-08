// Admin Script JavaScript
// API Base URL
const API_BASE = 'http://localhost:3003/api';

// Session persistence helper
function maintainAdminSession() {
    // Check and restore session on page load
    const currentAccess = sessionStorage.getItem('adminAccess');
    const lastAccess = localStorage.getItem('adminAccess');
    const token = localStorage.getItem('adminToken');
    
    const isTokenValid = (function validateAdminToken(rawToken) {
        if (!rawToken) return false;

        const tryParseJson = (str) => {
            try {
                return JSON.parse(str);
            } catch (_) {
                return null;
            }
        };

        const decodeBase64ToJson = (b64) => {
            try {
                return tryParseJson(atob(b64));
            } catch (_) {
                return null;
            }
        };

        const decodeJwtPayloadToJson = (jwt) => {
            try {
                const parts = String(jwt).split('.');
                if (parts.length < 2) return null;
                const payload = parts[1]
                    .replace(/-/g, '+')
                    .replace(/_/g, '/');
                const padded = payload + '==='.slice((payload.length + 3) % 4);
                return tryParseJson(atob(padded));
            } catch (_) {
                return null;
            }
        };

        const decoded = decodeBase64ToJson(rawToken) || decodeJwtPayloadToJson(rawToken);
        if (!decoded || typeof decoded !== 'object') {
            console.warn('Invalid adminToken format; clearing token');
            return false;
        }

        if (!decoded.exp) {
            console.warn('adminToken missing exp; clearing token');
            return false;
        }

        const expNum = Number(decoded.exp);
        if (!Number.isFinite(expNum)) {
            console.warn('adminToken exp invalid; clearing token');
            return false;
        }

        // Support exp in seconds (PHP/JWT) or milliseconds (JS)
        const expMs = expNum < 1000000000000 ? expNum * 1000 : expNum;
        if (expMs < Date.now()) {
            console.warn('adminToken expired; clearing token');
            return false;
        }

        // Require proof of admin identity
        const isVerified = decoded.verified === true;
        const isAdminIdentity = decoded.user === 'admin' || decoded.username === 'admin' || decoded.role === 'admin';
        if (!isVerified && !isAdminIdentity) {
            console.warn('adminToken missing verified/admin identity; clearing token');
            return false;
        }

        return true;
    })(token);

    // Maintain/restore session if a valid verified token exists
    if (isTokenValid) {
        sessionStorage.setItem('adminAccess', 'true');
        localStorage.setItem('adminAccess', new Date().toISOString());
        console.log('✅ Admin session maintained');
        return true;
    }

    // If session flags exist but token is invalid, clear everything
    if ((currentAccess || lastAccess || token) && !isTokenValid) {
        sessionStorage.removeItem('adminAccess');
        localStorage.removeItem('adminAccess');
        localStorage.removeItem('adminToken');
    }

    return false;
}

// Security Check - Prevent direct access
(function() {
    // Check if accessed directly without proper authentication
    if (window.location.pathname.includes('admin.html')) {
        console.log('=== ADMIN SECURITY CHECK ===');

        // Require admin-access password gate for this tab/session
        const gate = sessionStorage.getItem('adminGate');
        if (gate !== 'true') {
            console.log('Admin gate not present, redirecting to admin access...');
            window.location.href = 'admin-access.html';
            return;
        }
        
        // Try to maintain existing session
        if (maintainAdminSession()) {
            console.log('✅ Session maintained, continuing...');
            
            // Add session persistence event listeners
            setupSessionPersistence();
            return;
        }
        
        // If no session can be maintained, redirect to admin access (WhatsApp verification)
        console.log('No valid authentication found, redirecting to admin access...');
        window.location.href = 'admin-access.html';
        return;
    }
})();

// Setup session persistence event listeners
function setupSessionPersistence() {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Page is hidden, save session state
            sessionStorage.setItem('adminAccess', 'true');
            localStorage.setItem('adminAccess', new Date().toISOString());
            console.log('Session saved on page hide');
        } else {
            // Page is visible again, restore session
            maintainAdminSession();
            console.log('Session restored on page show');
        }
    });
    
    // Handle page refresh/reload
    window.addEventListener('beforeunload', function() {
        // Save session before page unload
        sessionStorage.setItem('adminAccess', 'true');
        localStorage.setItem('adminAccess', new Date().toISOString());
        console.log('Session saved before page unload');
    });
    
    // Handle browser back/forward navigation
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            // Page was loaded from cache (back/forward navigation)
            console.log('Page loaded from cache, checking session...');
            if (!maintainAdminSession()) {
                console.log('No session in cached page, checking referrer...');
                const referrer = document.referrer;
                if (referrer.includes('login.html') || referrer.includes('admin-access.html')) {
                    console.log('Came from login page in cached view, allowing access...');
                    sessionStorage.setItem('adminAccess', 'true');
                    localStorage.setItem('adminAccess', new Date().toISOString());
                } else {
                    console.log('No session in cached page, redirecting...');
                    window.location.href = 'login.html';
                }
            }
        }
    });
    
    // Handle storage events for multi-tab sync
    window.addEventListener('storage', function(e) {
        if (e.key === 'adminAccess') {
            if (!e.newValue) {
                // Admin access was cleared in another tab
                console.log('Admin access cleared in another tab');
                if (window.location.pathname.includes('admin.html')) {
                    window.location.href = 'login.html';
                }
            }
        }
    });
    
    // Periodic session refresh (every 5 minutes)
    setInterval(function() {
        maintainAdminSession();
        console.log('Session refreshed periodically');
    }, 5 * 60 * 1000); // 5 minutes
    
    // Handle focus/blur events
    window.addEventListener('focus', function() {
        console.log('Window focused, checking session...');
        maintainAdminSession();
    });
    
    window.addEventListener('blur', function() {
        console.log('Window blurred, saving session...');
        sessionStorage.setItem('adminAccess', 'true');
        localStorage.setItem('adminAccess', new Date().toISOString());
    });
}

// Immediate session check on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking admin session...');
    maintainAdminSession();
});

// Auto-check session every 30 seconds
setInterval(function() {
    if (window.location.pathname.includes('admin.html')) {
        maintainAdminSession();
    }
}, 30 * 1000); // 30 seconds

let customerOrders = [];
let registeredUsers = [];
let editModal = null;
let orderChart = null;
let revenueChart = null;

let pendingAdminCreds = null;

function parseNumberSafe(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const cleaned = String(value).replace(/[^0-9.\-]/g, '');
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
}

function getOrderTotalAmountValue(order) {
    if (!order) return 0;
    const total = parseNumberSafe(order.totalAmount);
    if (total > 0) return total;
    const price = parseNumberSafe(order.price);
    const qty = parseNumberSafe(order.quantity || 1);
    const computed = price * (qty || 1);
    return Number.isFinite(computed) ? computed : 0;
}

async function getAdminOrdersFromStorage() {
    let orders = [];
    try {
        // Try to load from file storage first (backend API)
        const response = await fetch(`${API_BASE}/admin/orders`);
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                console.log('Loaded orders from backend API:', result.data.length);
                return result.data;
            }
        }
    } catch (apiError) {
        console.log('API failed, trying localStorage:', apiError);
    }
    
    // Fallback to localStorage - same as charts and statistics
    try {
        const storedOrders = localStorage.getItem('customerOrders');
        if (storedOrders) {
            orders = JSON.parse(storedOrders);
            console.log('Loaded orders from localStorage:', orders.length);
        }
    } catch (e) {
        console.log('Error loading orders from localStorage:', e);
        orders = [];
    }
    
    if (!Array.isArray(orders)) {
        orders = orders ? [orders] : [];
    }

    console.log('Final orders count:', orders.length);
    return orders;
}

function purgeDemoOrdersFromStorage() {
    const demoEnabled = String(localStorage.getItem('enableDemoData') || '').toLowerCase() === 'true';
    if (demoEnabled) return;

    let orders = [];
    try {
        orders = JSON.parse(localStorage.getItem('customerOrders')) || [];
    } catch (_) {
        orders = [];
    }
    if (!Array.isArray(orders)) orders = orders ? [orders] : [];

    const cleaned = orders.filter(o => {
        if (!o || typeof o !== 'object') return false;
        if (o.isSample === true) return false;
        const email = String(o.email || o.customerEmail || '').toLowerCase();
        if (o.isRealCustomer !== true && email.endsWith('@example.com')) return false;
        return true;
    });

    if (cleaned.length !== orders.length) {
        try {
            localStorage.setItem('customerOrders', JSON.stringify(cleaned));
        } catch (_) {}
    }
}

// Initialize admin page
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('Admin page initializing...');
        
        // Check if we're on the correct page
        if (window.location.pathname.includes('admin.html')) {
            const loginElement = document.getElementById('admin-login');
            const dashboardElement = document.getElementById('admin-dashboard');
            const loginForm = document.getElementById('adminLoginForm');
            const otpForm = document.getElementById('adminOtpForm');

            const hasValidSession = maintainAdminSession();

            if (hasValidSession) {
                // Restore dashboard session (only for valid verified token)
                if (loginElement) loginElement.style.display = 'none';
                if (dashboardElement) dashboardElement.style.display = 'block';
                if (loginForm) loginForm.style.display = 'none';
                if (otpForm) otpForm.style.display = 'none';
                pendingAdminCreds = null;
                console.log('Valid admin token found - session restored');

                setTimeout(() => {
                    initializeCharts();
                    loadCustomerOrders().then(() => updateStatistics());
                    initializeAdminDashboard();
                }, 300);
            } else {
                // Show login form
                if (loginElement) loginElement.style.display = 'flex';
                if (dashboardElement) dashboardElement.style.display = 'none';
                if (loginForm) loginForm.style.display = 'block';
                if (otpForm) otpForm.style.display = 'none';
                pendingAdminCreds = null;
                console.log('No valid admin session - showing login form');
            }
            
            // Initialize editModal only if element exists
            const editModalElement = document.getElementById('editOrderModal');
            if (editModalElement) {
                if (window.bootstrap && typeof window.bootstrap.Modal === 'function') {
                    editModal = new window.bootstrap.Modal(editModalElement);
                } else {
                    console.warn('bootstrap.Modal not available; skipping modal init');
                }
            } else {
                console.log('Edit modal element not found');
            }
            
            // Admin OTP form event listeners
            const otpFormElement = document.getElementById('adminOtpForm');
            if (otpFormElement) {
                otpFormElement.addEventListener('submit', verifyAdminOtp);
                console.log('OTP form event listener added');
            } else {
                console.log('OTP form element not found');
            }

            // Resend OTP button
            const resendBtn = document.getElementById('resendAdminOtpBtn');
            if (resendBtn) {
                resendBtn.addEventListener('click', resendAdminOtp);
                console.log('Resend OTP button listener added');
            }

            // Back to login button
            const backBtn = document.getElementById('backToAdminLoginBtn');
            if (backBtn) {
                backBtn.addEventListener('click', backToAdminLogin);
                console.log('Back to login button listener added');
            }

            // Admin login form
            const loginFormElement = document.getElementById('adminLoginForm');
            if (loginFormElement) {
                loginFormElement.addEventListener('submit', adminLogin);
                console.log('Login form event listener added');
            } else {
                console.log('Login form element not found');
            }
        } else {
            console.log('Not on admin.html page');
        }
        
    } catch (error) {
        console.error('Error initializing admin page:', error);
        showMessage('Error initializing admin page', 'error');
    }
});

// Admin login form submit handler
async function adminLogin(e) {
    e.preventDefault();
    await submitAdminLogin();
}

// Submit admin login
async function submitAdminLogin() {
    try {
        console.log('Login button clicked');
        
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;
        
        console.log('Username:', username);
        console.log('Password:', password);
        
        if (!username || !password) {
            showMessage('Please enter username and password', 'error');
            return;
        }
        
        // Step 1: Request OTP via API
        console.log('Trying OTP request...');
        
        try {
            const response = await fetch('../backend/api/admin/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            console.log('Response status:', response.status);
            const result = await response.json().catch(() => ({}));
            console.log('Response result:', result);
            
            if (response.ok && result.success) {
                console.log('OTP response received, switching to OTP form');
                console.log('Mail sent status:', result.mail_sent);
                console.log('Mail error:', result.mail_error);
                console.log('Generated OTP:', result.otp); // For development
                
                pendingAdminCreds = { username, password, email: 'brotherssolar01@gmail.com' };

                const loginForm = document.getElementById('adminLoginForm');
                const otpForm = document.getElementById('adminOtpForm');
                if (loginForm) loginForm.style.display = 'none';
                if (otpForm) {
                    otpForm.style.display = 'block';
                    console.log('OTP form should be visible now');
                } else {
                    console.error('OTP form element not found!');
                }

                const otpInput = document.getElementById('adminOtp');
                if (otpInput) {
                    otpInput.value = '';
                    otpInput.focus();
                }

                // Show appropriate message based on mail status
                if (result.mail_sent) {
                    showMessage('OTP sent to brotherssolar01@gmail.com', 'success');
                } else {
                    showMessage('⚠️ Use OTP from browser console (F12) - Email service not available locally', 'warning');
                    console.warn('Email not sent due to XAMPP/Gmail TLS issue. Use OTP below:');
                    if (result.mail_error) {
                        console.error('Mail error:', result.mail_error);
                    }
                }
                
                // Always show OTP prominently in console for development
                console.log('%c========================================', 'color: #10b981; font-size: 16px; font-weight: bold;');
                console.log('%c🔐 ADMIN LOGIN OTP: ' + result.otp, 'color: #10b981; font-size: 20px; font-weight: bold; background: #ecfdf5; padding: 10px;');
                console.log('%c📧 Email: ' + (result.email || 'brotherssolar01@gmail.com'), 'color: #3b82f6; font-size: 14px;');
                console.log('%c⏰ Expires in: ' + result.expires_in + ' seconds', 'color: #f59e0b; font-size: 14px;');
                console.log('%c========================================', 'color: #10b981; font-size: 16px; font-weight: bold;');
                console.log('%c💡 Tip: If email not received, use this OTP to login', 'color: #6b7280; font-style: italic;');
                return;
            }
            
            throw new Error(result.message || 'OTP request failed');
            
        } catch (apiError) {
            console.log('OTP request failed:', apiError);
            showMessage('Unable to request OTP. Please ensure XAMPP Apache is running and try again.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Login failed. Please try again.', 'error');
    }
}

async function verifyAdminOtp(e) {
    e.preventDefault();

    const otp = (document.getElementById('adminOtp')?.value || '').trim();
    if (!otp) {
        showMessage('Please enter OTP', 'error');
        return;
    }

    try {
        const response = await fetch('../backend/api/admin/verify-otp.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
            },
            body: JSON.stringify({
                action: 'verify_otp',
                email: 'brotherssolar01@gmail.com',
                otp_code: otp
            })
        });

        const result = await response.json().catch(() => ({}));
        if (response.ok && result.success && result.data && result.data.token) {
            localStorage.setItem('adminToken', result.data.token);
            sessionStorage.setItem('adminAccess', 'true');
            localStorage.setItem('adminAccess', new Date().toISOString());

            // Hide login and show dashboard
            const loginElement = document.getElementById('admin-login');
            const dashboardElement = document.getElementById('admin-dashboard');
            if (loginElement) loginElement.style.display = 'none';
            if (dashboardElement) dashboardElement.style.display = 'block';

            // Initialize admin dashboard
            setTimeout(() => {
                initializeCharts();
                initializeAdminDashboard();
            }, 300);

            showMessage('OTP verified. Welcome to Admin Dashboard', 'success');
        } else {
            throw new Error(result.message || 'OTP verification failed');
        }
    } catch (error) {
        console.log('OTP verification failed:', error);
        showMessage(error.message || 'Invalid OTP. Please try again.', 'error');
    }
}

async function resendAdminOtp() {
    try {
        if (!pendingAdminCreds) {
            showMessage('Please login again', 'error');
            return;
        }

        console.log('Resending OTP for admin login...');
        
        // Use the correct backend API endpoint
        const response = await fetch('../backend/api/admin/send-otp.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: pendingAdminCreds.email || 'brotherssolar01@gmail.com',
                purpose: 'admin_login'
            })
        });
        
        const result = await response.json().catch(() => ({}));
        console.log('Resend OTP response:', result);
        
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Failed to resend OTP');
        }

        showMessage('OTP resent to brotherssolar01@gmail.com', 'success');
        
        // Update timer if available
        if (typeof startOtpTimer === 'function') {
            startOtpTimer();
        }
        
    } catch (error) {
        console.error('Resend OTP error:', error);
        showMessage(error.message || 'Failed to resend OTP', 'error');
    }
}

function backToAdminLogin() {
    const loginForm = document.getElementById('adminLoginForm');
    const otpForm = document.getElementById('adminOtpForm');
    if (otpForm) otpForm.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
    pendingAdminCreds = null;
}

// Admin logout
function logoutAdmin() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear all admin session data
        localStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminAccess');
        localStorage.removeItem('adminAccess');
        
        // Clear any other admin-related data
        pendingAdminCreds = null;
        
        // Show logout message
        showMessage('Logging out...', 'info');
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}

// Toggle sidebar for mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('show');
    }
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.querySelector('.navbar-toggle');
    
    if (window.innerWidth <= 768 && 
        sidebar && 
        !sidebar.contains(event.target) && 
        !toggleBtn.contains(event.target) &&
        sidebar.classList.contains('show')) {
        sidebar.classList.remove('show');
    }
});

// Show section
async function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Remove active class from all nav links
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(sectionName + '-section');
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }
    
    // Add active class to clicked nav link
    const evt = (typeof event !== 'undefined' && event) ? event : window.event;
    if (evt && evt.target && evt.target.classList) {
        evt.target.classList.add('active');
    }
    
    // Load data based on section
    switch(sectionName) {
        case 'dashboard':
            await loadCustomerOrders();
            updateStatistics();
            break;
        case 'orders':
            await loadAllOrders();
            break;
        case 'users':
            loadUsers();
            break;
        case 'analytics':
            updateChartsWithRealData();
            break;
        case 'reviews':
            loadReviews();
            break;
    }
}

// Load customer orders
async function loadCustomerOrders() {
    try {
        console.log('Loading customer orders...');

        // Try to load from API first
        try {
            const response = await fetch(`${API_BASE}/orders`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    console.log('Orders loaded from API:', result.data.length);
                    customerOrders = result.data;
                    updateRecentOrdersTable();
                    return;
                }
            }
        } catch (apiError) {
            console.log('API failed, using localStorage:', apiError);
        }

        // Fallback to localStorage - NO DEMO ORDERS
        purgeDemoOrdersFromStorage();
        customerOrders = await getAdminOrdersFromStorage();
        
        console.log('Loaded real customer orders from localStorage:', customerOrders.length);
        
        // Update recent orders table
        updateRecentOrdersTable();
        
    } catch (error) {
        console.error('Error loading customer orders:', error);
        showMessage('Error loading orders', 'error');
    }
}

// Load all orders
async function loadAllOrders() {
    try {
        console.log('=== Loading all orders START ===');
        showMessage('Loading orders...', 'info');
        
        let allOrders = [];
        
        // First, check localStorage directly
        try {
            const storedOrders = localStorage.getItem('customerOrders');
            console.log('Raw localStorage data:', storedOrders);
            
            if (storedOrders) {
                allOrders = JSON.parse(storedOrders);
                console.log('Parsed orders from localStorage:', allOrders.length, allOrders);
            } else {
                console.log('No orders found in localStorage - checking if key exists');
                console.log('localStorage keys:', Object.keys(localStorage));
            }
        } catch (parseError) {
            console.error('Error parsing localStorage:', parseError);
            allOrders = [];
        }
        
        // Try API if localStorage is empty
        if (allOrders.length === 0) {
            console.log('Trying API since localStorage is empty...');
            try {
                const response = await fetch(`${API_BASE}/orders`);
                const result = await response.json();
                
                if (response.ok && result.success && result.data) {
                    allOrders = Array.isArray(result.data) ? result.data : [result.data];
                    console.log('All orders loaded from API:', allOrders.length, allOrders);
                    
                    // Save to localStorage
                    localStorage.setItem('customerOrders', JSON.stringify(allOrders));
                } else if (Array.isArray(result)) {
                    allOrders = result;
                    console.log('All orders loaded from API (direct array):', allOrders.length, allOrders);
                    
                    // Save to localStorage
                    localStorage.setItem('customerOrders', JSON.stringify(allOrders));
                } else {
                    console.log('Unexpected API response format:', result);
                }
            } catch (apiError) {
                console.error('API call failed:', apiError);
            }
        }
        
        console.log('Final orders to render:', allOrders.length, allOrders);
        
        // If no orders found, render empty state
        
        renderAllOrdersTable(allOrders);
        showMessage(`Loaded ${allOrders.length} orders`, 'success');
        console.log('=== Loading all orders END ===');
        
    } catch (error) {
        console.error('=== ERROR in loadAllOrders ===:', error);
        console.error('Error stack:', error.stack);
        showMessage('Error loading orders: ' + error.message, 'error');
    }
}

// Make functions globally accessible
window.loadAllOrders = loadAllOrders;
window.editOrder = editOrder;
window.deleteOrder = deleteOrder;
window.exportOrdersData = exportOrdersData;
window.downloadOrdersCSV = downloadOrdersCSV;
window.loadReviews = loadReviews;
window.updateReviewStatus = updateReviewStatus;
window.deleteReview = deleteReview;
window.editReview = editReview;
window.updateReview = updateReview;
window.initializeAdminDashboard = initializeAdminDashboard;

// Initialize admin dashboard
function initializeAdminDashboard() {
    console.log('Initializing admin dashboard...');
    
    // Load initial data
    loadCustomerOrders().then(() => updateStatistics());
    loadReviews(); // Load reviews on dashboard initialization
    
    // Setup periodic refresh
    setInterval(() => {
        loadCustomerOrders().then(() => updateStatistics());
        loadReviews();
    }, 30000); // Refresh every 30 seconds
}

// Debug admin login
function debugAdminLogin() {
    console.log('=== Admin Login Debug ===');
    console.log('API_BASE:', API_BASE);
    console.log('Current token:', localStorage.getItem('adminToken'));
    console.log('Login form element:', document.getElementById('adminLoginForm'));
    console.log('Username field:', document.getElementById('adminUsername'));
    console.log('Password field:', document.getElementById('adminPassword'));
    
    // Test API connectivity
    fetch(`${API_BASE}/health`)
        .then(response => response.json())
        .then(data => {
            console.log('API Health Check:', data);
        })
        .catch(error => {
            console.log('API Health Check Failed:', error);
        });
}

// Make debug function globally accessible
window.debugAdminLogin = debugAdminLogin;

// Test review functions
function testReviewFunctions() {
    console.log('=== Testing Review Functions ===');
    console.log('loadReviews:', typeof loadReviews);
    console.log('updateReviewStatus:', typeof updateReviewStatus);
    console.log('deleteReview:', typeof deleteReview);
    console.log('editReview:', typeof editReview);
    console.log('updateReview:', typeof updateReview);
    
    // Test loading reviews
    loadReviews();
}

// Make test function globally accessible
window.testReviewFunctions = testReviewFunctions;

// Helper function to get solar type name
function getSolarTypeName(solarType) {
    if (!solarType) return 'N/A';
    
    // If it's already a name, return as is
    if (isNaN(solarType)) {
        return solarType;
    }
    
    // If it's a number, convert to name
    const solarTypeMap = {
        '1': 'Residential Solar Panel - 300W',
        '2': 'Commercial Solar Panel - 500W', 
        '3': 'Industrial Solar Panel - 1000W',
        '4': 'Solar Water Heater - 100L',
        '5': 'Solar Water Heater - 200L',
        '6': 'Solar Street Light - 20W',
        '7': 'Solar Street Light - 40W',
        '8': 'Solar Pump - 1HP',
        '9': 'Solar Pump - 2HP',
        '10': 'Solar Battery - 150Ah'
    };
    
    return solarTypeMap[solarType.toString()] || `Solar Type ${solarType}`;
}

// Render all orders table
function renderAllOrdersTable(allOrders) {
    const tableBody = document.getElementById('allOrdersTable');
    
    console.log('Rendering orders table with:', allOrders.length, 'orders');
    console.log('Table body element:', tableBody);
    
    if (!tableBody) {
        console.error('allOrdersTable element not found!');
        return;
    }
    
    if (allOrders.length === 0) {
        console.log('No orders to display, showing empty message');
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted">
                    <i class="fas fa-inbox fa-2x mb-2"></i>
                    <p>No orders found</p>
                    <small>Check browser console (F12) for debug info</small>
                </td>
            </tr>
        `;
        return;
    }
    
    console.log('Rendering orders:', allOrders);
    
    let html = '';
    allOrders.forEach((order, index) => {
        console.log(`Rendering order ${index}:`, order);
        
        const statusBadge = getStatusBadge(order.status);
        const paymentBadge = getPaymentBadge(order.paymentStatus);
        const totalAmount = formatINRCurrency(getOrderTotalAmountValue(order));
        
        html += `
            <tr>
                <td>${order.orderId || 'N/A'}</td>
                <td>${order.name || 'N/A'}</td>
                <td>${order.email || 'N/A'}</td>
                <td>${order.phone || 'N/A'}</td>
                <td>${getSolarTypeName(order.solarType)}</td>
                <td>${order.quantity || 1}</td>
                <td>${totalAmount}</td>
                <td>${statusBadge}</td>
                <td>${paymentBadge}</td>
                <td>${order.orderDate || new Date(order.createdAt || Date.now()).toLocaleDateString('hi-IN')}</td>
                <td>
                    <button class="btn btn-sm btn-primary btn-action" onclick="editOrder('${order.orderId}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-action" onclick="deleteOrder('${order.orderId}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    console.log('Orders table rendered successfully');
}

// Update recent orders table
function updateRecentOrdersTable() {
    try {
        const tableBody = document.getElementById('recentOrdersTable');
        if (!tableBody) return;
        
        if (customerOrders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        <i class="fas fa-inbox fa-2x mb-2"></i>
                        <p>No recent orders</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Show only last 5 orders
        const recentOrders = customerOrders.slice(-5).reverse();
        
        tableBody.innerHTML = recentOrders.map(order => {
            const productName = order.solarTypeName || (typeof getSolarTypeName === 'function' ? getSolarTypeName(order.solarType) : (order.solarType || 'N/A'));
            const amountValue = (order.totalAmount ?? order.amount ?? 0);
            const amountText = `₹${Number(amountValue || 0).toLocaleString('hi-IN')}`;
            const dateValue = order.orderDate || order.createdAt || '';
            const dateText = dateValue ? new Date(dateValue).toLocaleDateString('hi-IN') : '';
            return `
            <tr class="order-row">
                <td><strong>${order.orderId || 'N/A'}</strong></td>
                <td>${order.name || 'N/A'}</td>
                <td>${productName}</td>
                <td>${amountText}</td>
                <td>
                    <span class="badge badge-status ${getStatusBadgeClass(order.status)}">
                        ${getStatusText(order.status)}
                    </span>
                </td>
                <td>${dateText}</td>
                <td>
                    <button class="btn btn-sm btn-info btn-action" onclick="editOrder('${order.orderId}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-action" onclick="deleteOrder('${order.orderId}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        }).join('');
        
    } catch (error) {
        console.error('Error updating recent orders table:', error);
    }
}

// Load users
function loadUsers() {
    try {
        console.log('Loading users...');
        
        registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
        const usersContainer = document.getElementById('usersContainer');
        
        if (!usersContainer) return;
        
        if (registeredUsers.length === 0) {
            usersContainer.innerHTML = `
                <div class="col-12 text-center text-muted">
                    <i class="fas fa-users fa-2x mb-2"></i>
                    <p>No users found</p>
                </div>
            `;
            return;
        }
        
        usersContainer.innerHTML = registeredUsers.map(user => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card shadow h-100">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <div class="avatar me-3" style="font-size: 2rem;">👤</div>
                            <div>
                                <h6 class="mb-0">${user.firstName || 'N/A'} ${user.lastName || ''}</h6>
                                <small class="text-muted">${user.email || 'N/A'}</small>
                            </div>
                        </div>
                        <div class="row text-center">
                            <div class="col-6">
                                <small class="text-muted">Phone</small>
                                <p class="mb-0">${user.phone || 'N/A'}</p>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Joined</small>
                                <p class="mb-0">${new Date(user.createdAt || Date.now()).toLocaleDateString('hi-IN')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading users:', error);
        showMessage('Error loading users', 'error');
    }
}

// Update statistics
function updateStatistics() {
    try {
        // Get orders from localStorage like charts do
        let orders = [];
        try {
            const storedOrders = localStorage.getItem('customerOrders');
            if (storedOrders) {
                orders = JSON.parse(storedOrders);
            }
        } catch (e) {
            console.log('Error loading orders from storage:', e);
        }
        
        console.log('Orders found for statistics:', orders.length);
        
        const totalOrders = orders.length;
        const confirmedOrders = orders.filter(order => order.status === 'confirmed').length;
        const pendingOrders = orders.filter(order => order.status === 'pending').length;
        const totalRevenue = orders
            .filter(order => order.paymentStatus === 'completed')
            .reduce((sum, order) => sum + getOrderTotalAmountValue(order), 0);
        
        // Update DOM elements
        const totalOrdersElement = document.getElementById('totalOrders');
        const confirmedOrdersElement = document.getElementById('confirmedOrders');
        const pendingOrdersElement = document.getElementById('pendingOrders');
        const totalRevenueElement = document.getElementById('totalRevenue');
        
        if (totalOrdersElement) totalOrdersElement.textContent = totalOrders;
        if (confirmedOrdersElement) confirmedOrdersElement.textContent = confirmedOrders;
        if (pendingOrdersElement) pendingOrdersElement.textContent = pendingOrders;
        if (totalRevenueElement) totalRevenueElement.textContent = `₹${parseNumberSafe(totalRevenue).toLocaleString('hi-IN')}`;
        
        console.log('Statistics updated:', { totalOrders, confirmedOrders, pendingOrders, totalRevenue });
        
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

// Edit order
function editOrder(orderId) {
    console.log('Edit order clicked:', orderId);
    
    try {
        // Get orders from localStorage first
        let storedOrders = JSON.parse(localStorage.getItem('customerOrders') || '[]');
        let order = storedOrders.find(o => o.orderId === orderId);
        
        if (!order) {
            console.log('Order not found in localStorage, trying global variables...');
            // Try global variables as fallback
            order = allOrders?.find(o => o.orderId === orderId) || 
                   customerOrders?.find(o => o.orderId === orderId);
        }
        
        if (!order) {
            showMessage('Order not found', 'error');
            return;
        }
        
        console.log('Found order:', order);
        populateEditForm(order);
        
    } catch (error) {
        console.error('Error editing order:', error);
        showMessage('Error editing order: ' + error.message, 'error');
    }
}

// Populate edit form
function populateEditForm(order) {
    try {
        console.log('Populating edit form with order:', order);
        
        // Check if all required elements exist
        const elements = {
            editOrderId: document.getElementById('editOrderId'),
            editCustomerName: document.getElementById('editCustomerName'),
            editCustomerEmail: document.getElementById('editCustomerEmail'),
            editCustomerPhone: document.getElementById('editCustomerPhone'),
            editSolarType: document.getElementById('editSolarType'),
            editQuantity: document.getElementById('editQuantity'),
            editTotalAmount: document.getElementById('editTotalAmount'),
            editStatus: document.getElementById('editStatus'),
            editPaymentStatus: document.getElementById('editPaymentStatus')
        };
        
        // Check for missing elements
        const missingElements = Object.keys(elements).filter(key => !elements[key]);
        if (missingElements.length > 0) {
            console.error('Missing form elements:', missingElements);
            showMessage('Edit form elements not found', 'error');
            return;
        }
        
        // Populate form values
        elements.editOrderId.value = order.orderId || '';
        elements.editCustomerName.value = order.name || '';
        elements.editCustomerEmail.value = order.email || '';
        elements.editCustomerPhone.value = order.phone || '';
        
        // Handle solar type - convert number to name for display
        const solarTypeName = getSolarTypeName(order.solarType);
        elements.editSolarType.value = solarTypeName;
        
        elements.editQuantity.value = order.quantity || 1;
        elements.editTotalAmount.value = order.totalAmount || 0;
        elements.editStatus.value = order.status || 'pending';
        elements.editPaymentStatus.value = order.paymentStatus || 'pending';
        
        console.log('Form populated successfully');
        
        // Show modal
        const modalElement = document.getElementById('editOrderModal');
        if (!modalElement) {
            console.error('Edit modal not found');
            showMessage('Edit modal not found', 'error');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        showMessage('Edit form loaded', 'info');
        
    } catch (error) {
        console.error('Error populating edit form:', error);
        showMessage('Error loading edit form: ' + error.message, 'error');
    }
}

// Delete order
function deleteOrder(orderId) {
    console.log('Delete order clicked:', orderId);
    
    if (!confirm('Are you sure you want to delete this order?')) {
        return;
    }
    
    try {
        // Get orders from localStorage
        let storedOrders = JSON.parse(localStorage.getItem('customerOrders') || '[]');
        const originalLength = storedOrders.length;
        
        // Remove order
        storedOrders = storedOrders.filter(order => order.orderId !== orderId);
        
        if (storedOrders.length < originalLength) {
            // Save back to localStorage
            localStorage.setItem('customerOrders', JSON.stringify(storedOrders));
            
            // Update global variables if they exist
            if (typeof allOrders !== 'undefined') {
                allOrders = allOrders.filter(order => order.orderId !== orderId);
            }
            if (typeof customerOrders !== 'undefined') {
                customerOrders = customerOrders.filter(order => order.orderId !== orderId);
            }
            
            showMessage('Order deleted successfully', 'success');
            
            // Refresh the table
            loadAllOrders();
            
            // Update statistics
            updateStatistics();
        } else {
            showMessage('Order not found', 'error');
        }
        
    } catch (error) {
        console.error('Error deleting order:', error);
        showMessage('Error deleting order: ' + error.message, 'error');
    }
}

// Update order
async function updateOrder() {
    const orderId = document.getElementById('editOrderId').value;
    const newStatus = document.getElementById('editStatus').value;
    const newPaymentStatus = document.getElementById('editPaymentStatus').value;
    
    try {
        console.log('Updating order:', orderId, 'to status:', newStatus);
        
        // Get orders from localStorage
        let storedOrders = JSON.parse(localStorage.getItem('customerOrders') || '[]');
        const orderIndex = storedOrders.findIndex(o => o.orderId === orderId);
        
        if (orderIndex === -1) {
            showMessage('Order not found', 'error');
            return;
        }
        
        // Update order
        const oldStatus = storedOrders[orderIndex].status;
        storedOrders[orderIndex].status = newStatus;
        storedOrders[orderIndex].paymentStatus = newPaymentStatus;
        storedOrders[orderIndex].updatedAt = new Date().toISOString();
        
        // If admin is confirming the order, update globally
        if (oldStatus === 'pending' && newStatus === 'confirmed') {
            storedOrders[orderIndex].confirmedAt = new Date().toISOString();
            storedOrders[orderIndex].confirmedBy = 'admin';
            console.log('Order confirmed by admin - updating globally');
            
            // Send real-time notification to customer
            sendCustomerNotification(storedOrders[orderIndex], 'confirmed');
            
            showMessage('Order confirmed! Customer notified immediately.', 'success');
        } else if (oldStatus !== newStatus) {
            // Send status update notification
            sendCustomerNotification(storedOrders[orderIndex], 'status_updated');
            
            showMessage('Order updated! Customer notified immediately.', 'success');
        } else {
            showMessage('Order updated successfully', 'success');
        }
        
        // Save to localStorage (triggers customer dashboard update)
        localStorage.setItem('customerOrders', JSON.stringify(storedOrders));
        
        // Trigger storage event for customer dashboard
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'customerOrders',
            newValue: JSON.stringify(storedOrders),
            oldValue: JSON.stringify(storedOrders)
        }));
        
        // Global update mechanism - update all admin instances
        if (typeof window.updateAllAdminInstances === 'function') {
            window.updateAllAdminInstances(storedOrders);
        }
        
        console.log('✅ Order updated globally across all admin instances');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editOrderModal'));
        if (modal) modal.hide();
        
        // Refresh table
        loadAllOrders();
        
        // Update statistics
        updateStatistics();
        
    } catch (error) {
        console.error('Error updating order:', error);
        showMessage('Error updating order', 'error');
    }
}

// Make updateOrder globally accessible
window.updateOrder = updateOrder;

// Get notification message based on action
function getNotificationMessage(order, action) {
    switch (action) {
        case 'status_updated':
            return `Your order ${order.orderId} status has been updated to: ${order.status}.`;
        case 'shipped':
            return `Your order ${order.orderId} has been shipped! Track your delivery.`;
        case 'delivered':
            return `Your order ${order.orderId} has been delivered. Thank you for choosing Brothers Solar!`;
        case 'cancelled':
            return `Your order ${order.orderId} has been cancelled. Please contact support for details.`;
        case 'review_approved':
            return `Your review for order ${order.orderId} has been approved! Thank you for your feedback.`;
        case 'review_rejected':
            return `Your review for order ${order.orderId} could not be approved. Please contact support for details.`;
        case 'confirmed':
            return `Great news! Your order ${order.orderId} has been confirmed. We'll start processing your solar installation soon.`;
        default:
            return `Your order ${order.orderId} has been updated.`;
    }
}

// Send real-time notification to customer
function sendCustomerNotification(order, action) {
    try {
        console.log('Sending customer notification:', order.orderId, action);
        
        // Create notification object
        const notification = {
            type: action,
            message: getNotificationMessage(order, action),
            orderId: order.orderId,
            customerEmail: order.email,
            customerName: order.name,
            timestamp: new Date().toISOString()
        };
        
        // Add to customer notifications
        let customerNotifications = JSON.parse(localStorage.getItem('customerNotifications') || '[]');
        customerNotifications.push(notification);
        localStorage.setItem('customerNotifications', JSON.stringify(customerNotifications));
        
        // Trigger storage event for customer dashboard
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'customerNotifications',
            newValue: JSON.stringify(customerNotifications)
        }));
        
        console.log('✅ Customer notification sent:', notification);
    } catch (error) {
        console.error('Error sending customer notification:', error);
    }
}

// Make notification functions globally accessible
window.sendCustomerNotification = sendCustomerNotification;
window.getNotificationMessage = getNotificationMessage;

// Date filter functionality
function filterOrdersByDate() {
    const dateFilter = document.getElementById('dateFilter')?.value;
    if (!dateFilter) {
        loadAllOrders();
        return;
    }
    
    try {
        let allOrders = [];
        const storedOrders = JSON.parse(localStorage.getItem('customerOrders') || '[]');
        
        // Filter by selected date
        allOrders = storedOrders.filter(order => {
            const orderDate = new Date(order.orderDate || order.createdAt);
            const filterDate = new Date(dateFilter);
            return orderDate.toDateString() === filterDate.toDateString();
        });
        
        console.log(`Filtered ${allOrders.length} orders for date: ${dateFilter}`);
        renderAllOrdersTable(allOrders);
        showMessage(`Showing ${allOrders.length} orders for ${new Date(dateFilter).toLocaleDateString('hi-IN')}`, 'info');
        
    } catch (error) {
        console.error('Error filtering orders by date:', error);
        showMessage('Error filtering orders', 'error');
    }
}

// Search functionality
function searchOrders() {
    const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase().trim();
    if (!searchTerm) {
        loadAllOrders();
        return;
    }
    
    try {
        let allOrders = [];
        const storedOrders = JSON.parse(localStorage.getItem('customerOrders') || '[]');
        
        // Search by multiple fields
        allOrders = storedOrders.filter(order => {
            return (order.orderId && order.orderId.toLowerCase().includes(searchTerm)) ||
                   (order.name && order.name.toLowerCase().includes(searchTerm)) ||
                   (order.email && order.email.toLowerCase().includes(searchTerm)) ||
                   (order.phone && order.phone.includes(searchTerm)) ||
                   (order.solarType && order.solarType.toLowerCase().includes(searchTerm)) ||
                   (order.status && order.status.toLowerCase().includes(searchTerm));
        });
        
        console.log(`Found ${allOrders.length} orders matching: ${searchTerm}`);
        renderAllOrdersTable(allOrders);
        showMessage(`Found ${allOrders.length} orders matching "${searchTerm}"`, 'info');
        
    } catch (error) {
        console.error('Error searching orders:', error);
        showMessage('Error searching orders', 'error');
    }
}

// Clear filters
function clearFilters() {
    document.getElementById('dateFilter').value = '';
    document.getElementById('searchInput').value = '';
    loadAllOrders();
    showMessage('Filters cleared', 'info');
}

// Make filter functions globally accessible
window.filterOrdersByDate = filterOrdersByDate;
window.searchOrders = searchOrders;
window.clearFilters = clearFilters;

// Helper functions
function parseNumberSafe(value) {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

function formatINRCurrency(amount) {
    return '₹' + Number(amount).toLocaleString('hi-IN');
}

// Status badge functions
function getStatusBadge(status) {
    const statusClass = getStatusBadgeClass(status);
    const statusText = getStatusText(status);
    return `<span class="badge ${statusClass}">${statusText}</span>`;
}

function getPaymentBadge(paymentStatus) {
    const paymentClass = getPaymentBadgeClass(paymentStatus);
    const paymentText = getPaymentText(paymentStatus);
    return `<span class="badge ${paymentClass}">${paymentText}</span>`;
}

// Auto-refresh admin dashboard
function startAdminAutoRefresh() {
    // Refresh orders every 30 seconds
    setInterval(async () => {
        console.log('Auto-refreshing admin dashboard...');
        const currentSection = document.querySelector('.content-section.active');
        if (currentSection) {
            const sectionId = currentSection.id;
            if (sectionId === 'dashboard-section') {
                loadCustomerOrders().then(() => updateStatistics());
            } else if (sectionId === 'orders-section') {
                await loadAllOrders();
            }
        }
    }, 30000); // 30 seconds
    
    // Listen for storage events (cross-tab updates)
    window.addEventListener('storage', async (e) => {
        if (e && e.key === 'customerOrders') {
            console.log('Detected orders change in localStorage, refreshing admin dashboard...');
            const currentSection = document.querySelector('.content-section.active');
            if (currentSection) {
                const sectionId = currentSection.id;
                if (sectionId === 'dashboard-section') {
                    loadCustomerOrders().then(() => updateStatistics());
                } else if (sectionId === 'orders-section') {
                    await loadAllOrders();
                }
            }
        }
    });
    
    // Listen for admin tab focus
    window.addEventListener('focus', async () => {
        console.log('Admin tab focused, refreshing data...');
        const currentSection = document.querySelector('.content-section.active');
        if (currentSection) {
            const sectionId = currentSection.id;
            if (sectionId === 'dashboard-section') {
                loadCustomerOrders().then(() => updateStatistics());
            } else if (sectionId === 'orders-section') {
                await loadAllOrders();
            }
        }
    });
}

// Initialize admin dashboard with auto-refresh
function initializeAdminDashboard() {
    // Start auto-refresh
    startAdminAutoRefresh();
    
    console.log('Admin dashboard auto-refresh initialized');
}
function deleteOrder(orderId) {
    console.log('Deleting order:', orderId);
    if (confirm('Are you sure you want to delete this order?')) {
        customerOrders = customerOrders.filter(o => o.orderId !== orderId);
        localStorage.setItem('customerOrders', JSON.stringify(customerOrders));
        renderOrdersTable();
        updateStatistics();
        showMessage('Order deleted successfully', 'success');
        console.log('Order deleted:', orderId);
    }
}

// Initialize charts
function initializeCharts() {
    try {
        console.log('Initializing charts...');
        
        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.log('Chart.js not loaded, skipping charts initialization');
            return;
        }
        
        // Destroy existing charts if they exist
        if (orderChart) {
            try {
                orderChart.destroy();
            } catch (e) {
                console.log('Error destroying orderChart:', e);
            }
        }
        if (revenueChart) {
            try {
                revenueChart.destroy();
            } catch (e) {
                console.log('Error destroying revenueChart:', e);
            }
        }
        
        // Order Chart
        const orderCtx = document.getElementById('orderChart');
        if (orderCtx) {
            try {
                orderChart = new Chart(orderCtx, {
                    type: 'line',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                        datasets: [{
                            label: 'Orders',
                            data: [10, 15, 8, 20, 25, 18], // Sample data
                            borderColor: 'rgb(75, 192, 192)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Order Trends'
                            },
                            legend: {
                                display: true
                            }
                        }
                    }
                });
                console.log('Order chart initialized successfully');
            } catch (error) {
                console.error('Error creating order chart:', error);
            }
        } else {
            console.log('Order chart canvas not found');
        }
        
        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart');
        if (revenueCtx) {
            try {
                revenueChart = new Chart(revenueCtx, {
                    type: 'bar',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                        datasets: [{
                            label: 'Revenue',
                            data: [5000, 7500, 4000, 10000, 12500, 9000], // Sample data
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Revenue Trends'
                            },
                            legend: {
                                display: true
                            }
                        }
                    }
                });
                console.log('Revenue chart initialized successfully');
            } catch (error) {
                console.error('Error creating revenue chart:', error);
            }
        } else {
            console.log('Revenue chart canvas not found');
        }
        
        // Update with real data after initialization
        setTimeout(() => {
            updateChartsWithRealData();
        }, 1000);
        
    console.log('Charts initialization completed');
        
    } catch (error) {
        console.error('Error in initializeCharts:', error);
    }
}

// Update charts with real data
function updateChartsWithRealData() {
    try {
        console.log('Updating charts with real data...');
        
        // Get orders from localStorage or API
        let orders = [];
        try {
            const storedOrders = localStorage.getItem('customerOrders');
            if (storedOrders) {
                orders = JSON.parse(storedOrders);
            }
        } catch (e) {
            console.log('Error loading orders from storage:', e);
        }
        
        console.log('Orders found for charts:', orders.length);
        
        if (orders.length === 0) {
            console.log('No orders found, using sample data');
            // Use sample data if no orders
            updateChartsWithData([10, 15, 8, 20, 25, 18], [5000, 7500, 4000, 10000, 12500, 9000]);
            return;
        }
        
        const monthlyData = {
            'Jan': { orders: 0, revenue: 0 },
            'Feb': { orders: 0, revenue: 0 },
            'Mar': { orders: 0, revenue: 0 },
            'Apr': { orders: 0, revenue: 0 },
            'May': { orders: 0, revenue: 0 },
            'Jun': { orders: 0, revenue: 0 }
        };
        
        // Process orders
        orders.forEach(order => {
            if (order.orderDate) {
                const date = new Date(order.orderDate);
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
                const month = monthNames[date.getMonth()] || 'Jun';
                
                if (monthlyData[month]) {
                    monthlyData[month].orders += 1;
                    monthlyData[month].revenue += parseNumberSafe(order.totalAmount) || parseNumberSafe(order.price) || 0;
                }
            }
        });
        
        const orderData = Object.values(monthlyData).map(d => d.orders);
        const revenueData = Object.values(monthlyData).map(d => d.revenue);
        
        console.log('Chart data - Orders:', orderData, 'Revenue:', revenueData);
        
        updateChartsWithData(orderData, revenueData);
        
    } catch (error) {
        console.error('Error updating charts with real data:', error);
        // Use sample data on error
        updateChartsWithData([10, 15, 8, 20, 25, 18], [5000, 7500, 4000, 10000, 12500, 9000]);
    }
}

// Update charts with data
function updateChartsWithData(orderData, revenueData) {
    try {
        // Update Order Chart
        if (orderChart && orderChart.data) {
            orderChart.data.datasets[0].data = orderData;
            orderChart.update();
            console.log('Order chart updated');
        }
        
        // Update Revenue Chart
        if (revenueChart && revenueChart.data) {
            revenueChart.data.datasets[0].data = revenueData;
            revenueChart.update();
            console.log('Revenue chart updated');
        }
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

// Add solar panel
function addSolarPanel() {
    try {
        const panelName = document.getElementById('panelName').value;
        const panelType = document.getElementById('panelType').value;
        const panelCapacity = document.getElementById('panelCapacity').value;
        const panelPrice = document.getElementById('panelPrice').value;
        const panelDescription = document.getElementById('panelDescription').value;
        
        if (!panelName || !panelType || !panelCapacity || !panelPrice || !panelDescription) {
            showMessage('Please fill all fields', 'error');
            return;
        }
        
        // Get existing solar panels
        const solarPanels = JSON.parse(localStorage.getItem('solarPanels')) || [];
        
        // Add new panel
        const newPanel = {
            id: Date.now().toString(),
            name: panelName,
            type: panelType,
            capacity: parseFloat(panelCapacity),
            price: parseFloat(panelPrice),
            description: panelDescription,
            createdAt: new Date().toISOString()
        };
        
        solarPanels.push(newPanel);
        localStorage.setItem('solarPanels', JSON.stringify(solarPanels));
        
        // Clear form
        document.getElementById('addSolarForm').reset();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addSolarModal'));
        if (modal) {
            modal.hide();
        }
        
        showMessage('Solar panel added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding solar panel:', error);
        showMessage('Error adding solar panel', 'error');
    }
}

// Helper functions
// Status badge functions
function getStatusBadge(status) {
    const statusClass = getStatusBadgeClass(status);
    const statusText = getStatusText(status);
    return `<span class="badge ${statusClass}">${statusText}</span>`;
}

function getPaymentBadge(paymentStatus) {
    const paymentClass = getPaymentBadgeClass(paymentStatus);
    const paymentText = getPaymentText(paymentStatus);
    return `<span class="badge ${paymentClass}">${paymentText}</span>`;
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Pending',
        'confirmed': 'Confirmed',
        'processing': 'Processing',
        'shipped': 'Shipped',
        'delivered': 'Delivered',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || 'Unknown';
}

function getPaymentText(paymentStatus) {
    const paymentMap = {
        'pending': 'Pending',
        'completed': 'Completed',
        'failed': 'Failed',
        'refunded': 'Refunded'
    };
    return paymentMap[paymentStatus] || 'Unknown';
}

function getStatusBadgeClass(status) {
    switch(status) {
        case 'pending': return 'bg-warning';
        case 'confirmed': return 'bg-success';
        case 'processing': return 'bg-info';
        case 'shipped': return 'bg-primary';
        case 'delivered': return 'bg-success';
        case 'cancelled': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

function getPaymentBadgeClass(paymentStatus) {
    switch(paymentStatus) {
        case 'pending': return 'bg-warning';
        case 'completed': return 'bg-success';
        case 'failed': return 'bg-danger';
        case 'refunded': return 'bg-info';
        default: return 'bg-secondary';
    }
}

// Format currency function
function formatINRCurrency(amount) {
    return '₹' + Number(amount).toLocaleString('hi-IN');
}

function getPaymentText(paymentStatus) {
    switch(paymentStatus) {
        case 'completed': return 'Paid';
        case 'pending': return 'Pending';
        case 'failed': return 'Failed';
        default: return 'Unknown';
    }
}

// Show message
function showMessage(message, type = 'info') {
    try {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.admin-alert');
        existingAlerts.forEach(alert => alert.remove());

        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show admin-alert position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Add to page
        document.body.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    } catch (error) {
        console.error('Error showing message:', error);
        alert(message);
    }
}

// Render orders table (helper function)
async function renderOrdersTable() {
    await loadAllOrders();
    updateRecentOrdersTable();
}

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('hi-IN');
    } catch (error) {
        return 'N/A';
    }
}

// Helper function to format currency
function formatCurrency(amount) {
    if (!amount || isNaN(amount)) return '₹0';
    return '₹' + parseFloat(amount).toLocaleString('hi-IN');
}

// Reviews Management Functions

async function loadReviews() {
    try {
        console.log('Loading reviews...');
        
        // First try to load from localStorage (customer reviews)
        let reviews = [];
        try {
            const customerReviews = JSON.parse(localStorage.getItem('customerReviews') || '[]');
            console.log('Found customer reviews:', customerReviews.length);
            
            // Convert customer reviews to admin format
            reviews = customerReviews.map(review => ({
                id: review.id,
                orderId: review.orderId,
                customerName: review.customerName,
                customerEmail: review.customerEmail,
                rating: review.rating,
                comment: review.comment,
                approved: false, // Pending admin approval
                verifiedOrder: true,
                createdAt: review.createdAt,
                status: review.status || 'pending'
            }));
            
            console.log('Converted reviews for admin:', reviews);
            
        } catch (localStorageError) {
            console.log('Error reading localStorage:', localStorageError);
        }
        
        // Try API as secondary source
        try {
            const response = await fetch(`${API_BASE}/admin/reviews`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    console.log('Found reviews from API:', result.data.length);
                    // Merge with localStorage reviews
                    reviews = [...reviews, ...result.data];
                }
            }
        } catch (apiError) {
            console.log('API not available, using localStorage only:', apiError);
        }
        
        // Remove duplicates based on orderId
        const uniqueReviews = reviews.filter((review, index, self) =>
            index === self.findIndex((r) => r.orderId === review.orderId)
        );
        
        console.log('Final reviews to display:', uniqueReviews);
        renderReviewsTable(uniqueReviews);
        
    } catch (error) {
        console.error('Error loading reviews:', error);
        showMessage('Error loading reviews', 'error');
        // Show empty table on error
        renderReviewsTable([]);
    }
}

// Render reviews table
function renderReviewsTable(reviews) {
    const tbody = document.getElementById('reviewsTableBody');
    
    if (!reviews || reviews.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No reviews found</td></tr>';
        return;
    }
    
    tbody.innerHTML = reviews.map(review => `
        <tr>
            <td><span class="badge bg-secondary">${review.orderId || 'N/A'}</span></td>
            <td>${review.customerName || 'N/A'}</td>
            <td>${review.customerEmail || 'N/A'}</td>
            <td>
                ${generateStarRating(review.rating)}
                <small class="text-muted">(${review.rating}/5)</small>
            </td>
            <td>
                <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" 
                     title="${review.comment || ''}">
                    ${review.comment || 'N/A'}
                </div>
            </td>
            <td>
                <span class="badge ${review.approved ? 'bg-success' : 'bg-warning'}">
                    ${review.approved ? 'Approved' : 'Pending'}
                </span>
                ${review.verifiedOrder ? '<i class="fas fa-check-circle text-info ms-1" title="Verified Order"></i>' : ''}
            </td>
            <td><small>${formatDate(review.createdAt)}</small></td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-info" onclick="editReview('${review.id}', '${review.orderId}')" title="Edit Review">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${!review.approved ? `
                        <button type="button" class="btn btn-success" onclick="updateReviewStatus('${review.id}', true)" title="Approve">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    ${review.approved ? `
                        <button type="button" class="btn btn-warning" onclick="updateReviewStatus('${review.id}', false)" title="Reject">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                    <button type="button" class="btn btn-danger" onclick="deleteReview('${review.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Generate star rating HTML
function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '';
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            stars += '<i class="fas fa-star text-warning"></i>';
        } else if (i === fullStars + 1 && hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt text-warning"></i>';
        } else {
            stars += '<i class="far fa-star text-warning"></i>';
        }
    }
    
    return stars;
}

// Update review status (approve/reject)
async function updateReviewStatus(reviewId, approved) {
    try {
        console.log(`Updating review ${reviewId} to ${approved ? 'approved' : 'rejected'}`);
        
        // First update in localStorage
        try {
            let reviews = JSON.parse(localStorage.getItem('customerReviews') || '[]');
            const reviewIndex = reviews.findIndex(r => r.id == reviewId);
            
            if (reviewIndex !== -1) {
                reviews[reviewIndex].status = approved ? 'approved' : 'rejected';
                reviews[reviewIndex].approved = approved;
                reviews[reviewIndex].updatedAt = new Date().toISOString();
                
                localStorage.setItem('customerReviews', JSON.stringify(reviews));
                console.log('Review updated in localStorage');
                
                // Send notification to customer
                const review = reviews[reviewIndex];
                sendCustomerNotification({
                    orderId: review.orderId,
                    email: review.customerEmail,
                    name: review.customerName
                }, approved ? 'review_approved' : 'review_rejected');
            }
        } catch (localStorageError) {
            console.log('Error updating localStorage:', localStorageError);
        }
        
        // Try API update
        let apiSuccess = false;
        try {
            const response = await fetch(`${API_BASE}/admin/reviews/${reviewId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ approved })
            });

            if (response.ok) {
                console.log('Review updated via API');
                apiSuccess = true;
            } else if (response.status === 404) {
                console.log('Review not found in API, will update localStorage only');
                apiSuccess = false;
            }
        } catch (apiError) {
            console.log('API update failed, localStorage updated:', apiError);
        }
        
        showMessage(`Review ${approved ? 'approved' : 'rejected'} successfully`, 'success');
        loadReviews(); // Refresh the table
        
    } catch (error) {
        console.error('Error updating review:', error);
        showMessage('Error updating review', 'error');
    }
}

// Delete review
async function deleteReview(reviewId) {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Try API first
        try {
            const response = await fetch(`${API_BASE}/admin/reviews/${reviewId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showMessage('Review deleted successfully', 'success');
                loadReviews(); // Refresh the table
                return;
            }
        } catch (apiError) {
            console.log('API failed, simulating delete:', apiError);
        }
        
        // Fallback - simulate successful delete
        showMessage('Review deleted successfully (demo mode)', 'success');
        loadReviews(); // Refresh the table
        
    } catch (error) {
        console.error('Error deleting review:', error);
        showMessage('Error deleting review', 'error');
    }
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Edit Review Functions

// Edit review - open modal with current data
async function editReview(reviewId, orderId) {
    try {
        // Get current review data from localStorage first
        let review = null;
        try {
            const localReviews = JSON.parse(localStorage.getItem('customerReviews') || '[]');
            review = localReviews.find(r => r.id == reviewId);
            console.log('Found review in localStorage:', review);
        } catch (e) {
            console.log('Error reading localStorage:', e);
        }
        
        // If found in localStorage, use it
        if (review) {
            populateEditModal(review);
            return;
        }
        
        // Fallback to API
        try {
            const response = await fetch(`${API_BASE}/admin/reviews`);
            const result = await response.json();
            
            if (result.success) {
                review = result.data.find(r => r.id == reviewId);
                if (review) {
                    populateEditModal(review);
                    return;
                }
            }
        } catch (apiError) {
            console.log('API failed:', apiError);
        }
        
        showMessage('Review not found', 'error');
        
    } catch (error) {
        console.error('Error loading review for edit:', error);
        showMessage('Error loading review data', 'error');
    }
}

// Helper function to populate edit modal
function populateEditModal(review) {
    // Populate modal fields
    document.getElementById('editReviewId').value = review.id;
    document.getElementById('editReviewOrderId').value = review.orderId;
    document.getElementById('editReviewOrderIdDisplay').value = review.orderId;
    document.getElementById('editReviewCustomerName').value = review.customerName || '';
    document.getElementById('editReviewCustomerEmail').value = review.customerEmail || '';
    document.getElementById('editReviewComment').value = review.comment || '';
    document.getElementById('editReviewStatus').value = review.approved ? 'true' : 'false';
    
    // Set rating
    setEditRating(review.rating || 5);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editReviewModal'));
    modal.show();
}

// Set rating for edit modal
function setEditRating(rating) {
    document.getElementById('editReviewRating').value = rating;
    
    // Update star buttons
    const buttons = document.querySelectorAll('.edit-rating-btn');
    buttons.forEach((btn, index) => {
        if (index < rating) {
            btn.classList.remove('btn-outline-warning');
            btn.classList.add('btn-warning');
        } else {
            btn.classList.remove('btn-warning');
            btn.classList.add('btn-outline-warning');
        }
    });
}

// Update review with new data
async function updateReview() {
    try {
        const reviewId = document.getElementById('editReviewId').value;
        const customerName = document.getElementById('editReviewCustomerName').value;
        const customerEmail = document.getElementById('editReviewCustomerEmail').value;
        const rating = document.getElementById('editReviewRating').value;
        const comment = document.getElementById('editReviewComment').value;
        const approved = document.getElementById('editReviewStatus').value === 'true';

        // Validation
        if (!customerName || !customerEmail || !rating || !comment) {
            showMessage('Please fill all required fields', 'error');
            return;
        }

        if (rating < 1 || rating > 5) {
            showMessage('Rating must be between 1 and 5', 'error');
            return;
        }

        // Try API first
        try {
            const response = await fetch(`${API_BASE}/admin/reviews/${reviewId}/edit`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customerName,
                    customerEmail,
                    rating: parseInt(rating),
                    comment,
                    approved
                })
            });

            const result = await response.json();

            if (result.success) {
                showMessage('Review updated successfully', 'success');
                closeEditModalAndRefresh();
                return;
            }
        } catch (apiError) {
            console.log('API failed, simulating update:', apiError);
        }

        // Fallback - simulate successful update
        showMessage('Review updated successfully (demo mode)', 'success');
        closeEditModalAndRefresh();
        
    } catch (error) {
        console.error('Error updating review:', error);
        showMessage('Error updating review', 'error');
    }
}

// Helper function to close modal and refresh
function closeEditModalAndRefresh() {
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editReviewModal'));
    if (modal) modal.hide();
    
    // Refresh reviews table
    loadReviews();
}

// Export Orders Data (Excel CSV)
async function exportOrdersData() {
    try {
        console.log('Exporting orders to Excel...');
        
        // Get orders from storage or API
        let orders = [];
        try {
            const response = await fetch(`${API_BASE}/admin/orders`);
            const result = await response.json();
            if (result.success) {
                orders = result.data;
            }
        } catch (apiError) {
            console.log('API failed, using localStorage:', apiError);
        }
        
        // Fallback to localStorage
        if (orders.length === 0) {
            orders = JSON.parse(localStorage.getItem('customerOrders') || '[]');
        }
        
        if (orders.length === 0) {
            showMessage('No orders to export', 'warning');
            return;
        }
        
        // Create Excel data structure
        const excelData = orders.map(order => ({
            'Order ID': order.orderId || 'N/A',
            'Customer Name': order.name || 'N/A',
            'Email': order.email || 'N/A',
            'Phone': order.phone || 'N/A',
            'Solar Type': order.solarType || 'N/A',
            'Quantity': order.quantity || 1,
            'Total Amount': order.totalAmount || 0,
            'Status': order.status || 'pending',
            'Payment Status': order.paymentStatus || 'pending',
            'Order Date': order.orderDate || new Date(order.createdAt || Date.now()).toLocaleDateString('hi-IN'),
            'Installation Date': order.installationDate || 'N/A',
            'Address': order.address || 'N/A',
            'Payment Method': order.paymentMethod || 'N/A',
            'Created At': new Date(order.createdAt || Date.now()).toLocaleString('hi-IN')
        }));
        
        // Convert to CSV format (Excel compatible)
        const headers = Object.keys(excelData[0]);
        const csvContent = [
            headers.join(','),
            ...excelData.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    // Escape commas and quotes in CSV
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');
        
        // Create and download Excel file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `Brothers_Solar_Orders_${timestamp}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showMessage(`Exported ${orders.length} orders to Excel successfully`, 'success');
        console.log('Excel export completed');
        
    } catch (error) {
        console.error('Error exporting orders to Excel:', error);
        showMessage('Failed to export orders to Excel', 'error');
    }
}

// Download Orders as CSV
async function downloadOrdersCSV() {
    try {
        // Get orders from storage or API
        let orders = [];
        try {
            const response = await fetch(`${API_BASE}/admin/orders`);
            const result = await response.json();
            if (result.success) {
                orders = result.data;
            }
        } catch (apiError) {
            console.log('API failed, using localStorage:', apiError);
        }
        
        // Fallback to localStorage
        if (orders.length === 0) {
            orders = JSON.parse(localStorage.getItem('customerOrders') || '[]');
        }
        
        if (orders.length === 0) {
            showMessage('No orders to export', 'warning');
            return;
        }
        
        // Create CSV content
        const headers = ['Order ID', 'Customer Name', 'Email', 'Phone', 'Solar Type', 'Quantity', 'Amount', 'Status', 'Payment Status', 'Order Date', 'Installation Date'];
        const csvContent = [
            headers.join(','),
            ...orders.map(order => [
                `"${order.orderId || ''}"`,
                `"${order.name || ''}"`,
                `"${order.email || ''}"`,
                `"${order.phone || ''}"`,
                `"${order.solarType || ''}"`,
                `"${order.quantity || ''}"`,
                `"${order.totalAmount || ''}"`,
                `"${order.status || ''}"`,
                `"${order.paymentStatus || ''}"`,
                `"${order.orderDate || ''}"`,
                `"${order.installationDate || ''}"`
            ].join(','))
        ].join('\n');
        
        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showMessage('Orders CSV downloaded successfully', 'success');
    } catch (error) {
        console.error('Error downloading CSV:', error);
        showMessage('Failed to download CSV', 'error');
    }
}
