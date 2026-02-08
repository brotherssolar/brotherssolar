// Login Page JavaScript
const API_BASE = (() => {
    try {
        const { protocol, hostname, port, origin } = window.location;
        const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
        if (isLocalHost && port !== '3003') {
            return `${protocol}//${hostname}:3003/api`;
        }
        return `${origin}/api`;
    } catch (_) {
        return 'http://localhost:3003/api';
    }
})();

let pendingLogin = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && currentUser.token) {
        window.location.href = 'index.html';
        return;
    }

    const loginFormEl = document.getElementById('loginForm');
    const otpFormEl = document.getElementById('loginOtpForm');
    const resendBtn = document.getElementById('resendLoginOtpBtn');
    const backBtn = document.getElementById('backToLoginBtn');

    if (otpFormEl) {
        otpFormEl.addEventListener('submit', verifyLoginOtp);
    }
    if (resendBtn) {
        resendBtn.addEventListener('click', resendLoginOtp);
    }
    if (backBtn) {
        backBtn.addEventListener('click', backToLogin);
    }

    // Login form submission (Step 1)
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        try {
            // Show loading state
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Logging in...';
            
            // Get registered users from localStorage
            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
            
            // Find user by email
            const user = registeredUsers.find(u => u.email === email);
            
            if (!user) {
                showMessage('No account found with this email address', 'error');
                return;
            }
            
            // Check if account is verified
            if (!user.isVerified) {
                showMessage('Please verify your email address first', 'warning');
                return;
            }
            
            // Check password (in real app, this would be hashed)
            if (user.password !== password) {
                showMessage('Invalid password', 'error');
                return;
            }
            
            // Step 2: Send OTP via backend
            const otpResp = await fetch(`${API_BASE}/login/send-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: user.email, phone: user.phone })
            });
            const otpResult = await otpResp.json().catch(() => ({}));
            if (!otpResp.ok || !otpResult.success) {
                throw new Error(otpResult.message || 'Failed to send OTP');
            }

            pendingLogin = { user, rememberMe };

            const hint = document.getElementById('loginOtpHint');
            if (hint) {
                hint.innerHTML = '<i class="fas fa-envelope me-1"></i> OTP sent to <strong>' + user.email + '</strong>. Please enter it to continue.';
            }

            if (loginFormEl) loginFormEl.style.display = 'none';
            if (otpFormEl) otpFormEl.style.display = 'block';
            const otpInput = document.getElementById('loginOtp');
            if (otpInput) {
                otpInput.value = '';
                otpInput.focus();
            }

            showMessage('OTP sent to your registered email and mobile', 'success');
            
        } catch (error) {
            console.error('Login error:', error);
            showMessage(error.message || 'Login failed. Please try again.', 'error');
        } finally {
            // Reset button
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Login';
        }
    });

    // Forgot password form
    document.getElementById('forgotPasswordForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('resetEmail').value;
        
        try {
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
            
            // Get registered users
            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
            
            // Find user
            const user = registeredUsers.find(u => u.email === email);
            
            if (!user) {
                showMessage('No account found with this email address', 'error');
                return;
            }
            
            // Generate new password (in real app, send reset link)
            const newPassword = generateRandomPassword();
            user.password = newPassword; // In real app, this would be hashed
            user.passwordResetAt = new Date().toISOString();
            
            localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
            
            // Show new password (in real app, this would be sent via email)
            alert(`Your password has been reset!\n\nYour new password is: ${newPassword}\n\nPlease save this password and login.`);
            
            showMessage(`Password reset successful for ${email}`, 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
            modal.hide();
            
            // Reset form
            e.target.reset();
            
        } catch (error) {
            console.error('Forgot password error:', error);
            showMessage('Failed to reset password', 'error');
        } finally {
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send Reset Link';
        }
    });
});

async function verifyLoginOtp(e) {
    e.preventDefault();

    const otp = (document.getElementById('loginOtp')?.value || '').trim();
    if (!otp || otp.length !== 6) {
        showMessage('Please enter 6-digit OTP', 'error');
        return;
    }

    if (!pendingLogin || !pendingLogin.user) {
        showMessage('Please login again', 'error');
        return;
    }

    try {
        const resp = await fetch(`${API_BASE}/login/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: pendingLogin.user.email, otp })
        });
        const result = await resp.json().catch(() => ({}));
        if (!resp.ok || !result.success) {
            throw new Error(result.message || 'Invalid OTP');
        }

        const user = pendingLogin.user;
        const rememberMe = !!pendingLogin.rememberMe;

        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
        const idx = registeredUsers.findIndex(u => u.email === user.email);
        if (idx >= 0) {
            registeredUsers[idx].lastLogin = new Date().toISOString();
            localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
        }

        const userSession = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            token: generateToken(),
            loginTime: new Date().toISOString(),
            rememberMe: rememberMe
        };

        if (rememberMe) {
            localStorage.setItem('currentUser', JSON.stringify(userSession));
        } else {
            sessionStorage.setItem('currentUser', JSON.stringify(userSession));
        }

        showMessage('Login successful! Redirecting...', 'success');

        setTimeout(() => {
            try {
                const pending = localStorage.getItem('pendingOrderIntent');
                if (pending) {
                    window.location.href = 'index.html';
                    return;
                }
            } catch (_) {}
            try {
                const redirectTo = localStorage.getItem('postLoginRedirect');
                if (redirectTo) {
                    localStorage.removeItem('postLoginRedirect');
                    window.location.href = redirectTo;
                    return;
                }
            } catch (_) {}
            window.location.href = 'customer.html';
        }, 1200);
    } catch (error) {
        console.error('OTP verify error:', error);
        showMessage(error.message || 'OTP verification failed', 'error');
    }
}

async function resendLoginOtp() {
    try {
        if (!pendingLogin || !pendingLogin.user) {
            showMessage('Please login again', 'error');
            return;
        }

        const resp = await fetch(`${API_BASE}/login/send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: pendingLogin.user.email, phone: pendingLogin.user.phone })
        });
        const result = await resp.json().catch(() => ({}));
        if (!resp.ok || !result.success) {
            throw new Error(result.message || 'Failed to resend OTP');
        }

        showMessage('OTP resent to your email and mobile', 'success');
        const otpInput = document.getElementById('loginOtp');
        if (otpInput) {
            otpInput.value = '';
            otpInput.focus();
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        showMessage(error.message || 'Failed to resend OTP', 'error');
    }
}

function backToLogin() {
    const loginFormEl = document.getElementById('loginForm');
    const otpFormEl = document.getElementById('loginOtpForm');
    if (otpFormEl) otpFormEl.style.display = 'none';
    if (loginFormEl) loginFormEl.style.display = 'block';
    pendingLogin = null;
}

// Show forgot password modal
function showForgotPassword() {
    const modal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
    modal.show();
}

// Show registration page
function showRegistration() {
    window.location.href = 'register.html';
}

// Generate random token
function generateToken() {
    return Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
}

// Generate random password
function generateRandomPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Show message function
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    messageDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    messageDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}
