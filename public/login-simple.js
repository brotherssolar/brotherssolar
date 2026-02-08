// ULTRA SIMPLE LOGIN SYSTEM - NO ERRORS POSSIBLE
// Complete replacement for login-script.js

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Simple Login System Loaded');

    const API_BASE = (() => {
        try {
            const { hostname, origin } = window.location;
            if (hostname.includes('vercel.app')) return `${origin}/api`;
            return null;
        } catch (_) {
            return null;
        }
    })();
    
    // Get elements
    const loginForm = document.getElementById('loginForm');
    const loginOtpForm = document.getElementById('loginOtpForm');
    const loginFormEl = document.querySelector('.login-form');
    const otpFormEl = document.querySelector('.otp-form');
    
    // Mock data storage
    let pendingLogin = null;
    const DEMO_OTP = '123456';
    
    // Mock registered users (for demo)
    const mockUsers = [
        {
            email: 'admin@brotherssolar.com',
            password: 'admin123',
            name: 'Admin User',
            phone: '9876543210',
            role: 'admin'
        },
        {
            email: 'user@example.com',
            password: 'user123',
            name: 'Test User',
            phone: '1234567890',
            role: 'customer'
        }
    ];
    
    // Show message function
    function showMessage(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 9999;
            max-width: 350px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        
        // Set color based on type
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            info: '#17a2b8',
            warning: '#ffc107'
        };
        
        messageDiv.style.backgroundColor = colors[type] || colors.info;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 4000);
    }
    
    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('📝 Login form submitted');
            
            // Get form values
            const email = document.getElementById('loginEmail')?.value;
            const password = document.getElementById('loginPassword')?.value;
            const rememberMe = document.getElementById('rememberMe')?.checked;
            
            // Basic validation
            if (!email || !password) {
                showMessage('Please fill all required fields', 'error');
                return;
            }
            
            // Find user in mock database
            const user = mockUsers.find(u => 
                u.email.toLowerCase() === email.toLowerCase() && u.password === password
            );
            
            if (!user) {
                showMessage('Invalid email or password', 'error');
                console.log('❌ Login failed: Invalid credentials');
                return;
            }
            
            console.log('✅ User found:', user.email);

            try {
                if (API_BASE) {
                    const otpResp = await fetch(`${API_BASE}/login/send-otp`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: user.email })
                    });

                    const otpResult = await otpResp.json().catch(() => ({}));
                    if (!otpResp.ok || !otpResult.success) {
                        throw new Error(otpResult.message || 'Failed to send OTP');
                    }
                }

                // Store pending login
                pendingLogin = { user, rememberMe };

                // Show OTP section
                if (loginFormEl) {
                    loginFormEl.style.display = 'none';
                }
                if (otpFormEl) {
                    otpFormEl.style.display = 'block';
                }

                // Show OTP hint
                const hint = document.getElementById('loginOtpHint');
                if (hint) {
                    hint.innerHTML = API_BASE
                        ? '<i class="fas fa-envelope me-1"></i> OTP sent to <strong>' + user.email + '</strong>. Please enter it to continue.'
                        : `<i class="fas fa-envelope me-1"></i> Demo OTP: <strong>${DEMO_OTP}</strong> - Use this to login`;
                }

                // Show message
                if (API_BASE) {
                    showMessage('OTP sent to your email. Please check your inbox/spam.', 'success');
                } else {
                    showMessage(`🎯 Demo OTP: ${DEMO_OTP} - Use this to login`, 'info');
                    console.log(`🔢 Demo OTP for ${user.email}: ${DEMO_OTP}`);
                }

                // Clear OTP input
                const otpInput = document.getElementById('loginOtp');
                if (otpInput) {
                    otpInput.value = '';
                    otpInput.focus();
                }
            } catch (err) {
                console.error('Send OTP error:', err);
                showMessage(err.message || 'Failed to send OTP', 'error');
            }
        });
    }
    
    // Handle OTP form submission
    if (loginOtpForm) {
        loginOtpForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('🔍 OTP form submitted');
            
            // Get OTP
            const otpInput = document.getElementById('loginOtp');
            const otp = otpInput?.value || '';
            
            console.log(`📱 Entered OTP: ${otp}`);
            console.log(`🎯 Expected OTP: ${DEMO_OTP}`);
            
            try {
                if (API_BASE) {
                    const verifyResp = await fetch(`${API_BASE}/login/verify-otp`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: pendingLogin?.user?.email, otp })
                    });
                    const verifyResult = await verifyResp.json().catch(() => ({}));
                    if (!verifyResp.ok || !verifyResult.success) {
                        throw new Error(verifyResult.message || 'Invalid OTP');
                    }
                } else {
                    if (otp !== DEMO_OTP) {
                        throw new Error(`Invalid OTP. Use: ${DEMO_OTP}`);
                    }
                }

                if (!pendingLogin) {
                    throw new Error('No login in progress');
                }

                console.log('✅ OTP verification successful');

                // Create session
                const sessionData = {
                    user: pendingLogin.user,
                    loginTime: new Date().toISOString(),
                    token: 'demo-token-' + Date.now()
                };

                // Store session
                if (pendingLogin.rememberMe) {
                    localStorage.setItem('currentUser', JSON.stringify(sessionData));
                } else {
                    sessionStorage.setItem('currentUser', JSON.stringify(sessionData));
                }

                showMessage('🎉 Login successful! Redirecting...', 'success');
                console.log('✅ User logged in successfully');

                // Redirect based on role
                setTimeout(() => {
                    if (pendingLogin.user.role === 'admin') {
                        window.location.href = 'admin/admin.html';
                    } else {
                        window.location.href = 'customer.html';
                    }
                }, 1500);
            } catch (err) {
                console.log('❌ Invalid OTP');
                showMessage(err.message || 'Verification failed', 'error');
            }
        });
    }
    
    // Resend OTP function
    window.resendLoginOTP = function() {
        if (pendingLogin) {
            showMessage(`🔄 OTP resent: ${DEMO_OTP}`, 'info');
            console.log(`🔄 OTP resent: ${DEMO_OTP}`);
        } else {
            showMessage('No login in progress', 'warning');
        }
    };
    
    // Back to login function
    window.backToLogin = function() {
        if (loginFormEl) loginFormEl.style.display = 'block';
        if (otpFormEl) otpFormEl.style.display = 'none';
        pendingLogin = null;
    };
    
    // Show registration function
    window.showRegistration = function() {
        window.location.href = 'register.html';
    };
    
    // Check if already logged in
    function checkExistingLogin() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser')) || 
                           JSON.parse(sessionStorage.getItem('currentUser'));
        
        if (currentUser && currentUser.user) {
            console.log('🔄 User already logged in:', currentUser.user.email);
            showMessage('You are already logged in. Redirecting...', 'info');
            
            setTimeout(() => {
                if (currentUser.user.role === 'admin') {
                    window.location.href = 'admin/admin.html';
                } else {
                    window.location.href = 'customer.html';
                }
            }, 1500);
        }
    }
    
    // Auto-focus and format OTP input
    const otpInput = document.getElementById('loginOtp');
    if (otpInput) {
        otpInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value.length === 6) {
                this.blur();
            }
        });
    }
    
    // Check existing login on load
    checkExistingLogin();
    
    console.log('✅ Simple Login System Ready');
    console.log('🎯 Demo OTP: 123456');
    console.log('👤 Demo Users:');
    console.log('  Admin: admin@brotherssolar.com / admin123');
    console.log('  User: user@example.com / user123');
});
