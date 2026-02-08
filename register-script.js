// Registration Page JavaScript
let registrationData = {};
let currentStep = 1;

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

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || 
                        JSON.parse(sessionStorage.getItem('currentUser'));
    
    if (currentUser && currentUser.token) {
        showMessage('You are already logged in. Redirecting to dashboard...', 'info');
        setTimeout(() => {
            window.location.href = 'customer.html';
        }, 2000);
        return;
    }

    // Registration form submission
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;
        
        // Validation
        if (password !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 6) {
            showMessage('Password must be at least 6 characters', 'error');
            return;
        }
        
        if (!terms) {
            showMessage('Please accept the terms and conditions', 'error');
            return;
        }
        
        try {
            // Show loading state
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating Account...';
            
            // Get existing users
            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
            
            // Check if email already exists
            const existingUser = registeredUsers.find(u => u.email === email);
            if (existingUser) {
                showMessage('An account with this email already exists. Please login instead.', 'warning');
                // Redirect to login after 2 seconds
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                return;
            }
            
            // Check if phone already exists
            if (registeredUsers.find(u => u.phone === phone)) {
                showMessage('An account with this phone number already exists. Please login instead.', 'warning');
                // Redirect to login after 2 seconds
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                return;
            }
            
            // Store registration data
            registrationData = {
                id: generateUserId(),
                firstName,
                lastName,
                email,
                phone,
                password, // In real app, this would be hashed
                registrationDate: new Date().toISOString(),
                isVerified: false
            };

            // Send OTP to user's email via backend
            const otpResp = await fetch(`${API_BASE}/register/send-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const otpResult = await otpResp.json().catch(() => ({}));
            if (!otpResp.ok || !otpResult.success) {
                throw new Error(otpResult.message || 'Failed to send OTP');
            }
            
            // Show OTP section
            showOTPSection();
            
            showMessage(`Verification code sent to ${email}`, 'success');
            
        } catch (error) {
            console.error('Registration error:', error);
            showMessage(error.message || 'Registration failed. Please try again.', 'error');
        } finally {
            // Reset button
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Create Account';
        }
    });

    // OTP form submission
    document.getElementById('otpForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const otp = 
            document.getElementById('otp1').value +
            document.getElementById('otp2').value +
            document.getElementById('otp3').value +
            document.getElementById('otp4').value +
            document.getElementById('otp5').value +
            document.getElementById('otp6').value;
        
        if (otp.length !== 6) {
            showMessage('Please enter complete 6-digit code', 'error');
            return;
        }
        
        try {
            // Show loading state
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Verifying...';
            
            const verifyResp = await fetch(`${API_BASE}/register/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: registrationData.email, otp })
            });

            const verifyResult = await verifyResp.json().catch(() => ({}));
            if (!verifyResp.ok || !verifyResult.success) {
                throw new Error(verifyResult.message || 'Invalid verification code');
            }
            
            // Mark as verified and save user
            registrationData.isVerified = true;
            
            // Save to registered users
            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
            registeredUsers.push(registrationData);
            localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
            
            // Show success section
            showSuccessSection();
            
            showMessage('Account verified successfully!', 'success');
            
        } catch (error) {
            console.error('OTP verification error:', error);
            showMessage(error.message || 'Verification failed. Please try again.', 'error');
        } finally {
            // Reset button
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check me-2"></i>Verify Account';
        }
    });

    // OTP input auto-focus
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', function() {
            if (this.value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value.length === 0 && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });
});

// Show OTP section
function showOTPSection() {
    currentStep = 2;
    updateProgressSteps();
    
    document.getElementById('registrationForm').style.display = 'none';
    document.getElementById('otpSection').style.display = 'block';
    document.getElementById('successSection').style.display = 'none';
    
    // Focus first OTP input
    document.getElementById('otp1').focus();
}

// Show success section
function showSuccessSection() {
    currentStep = 3;
    updateProgressSteps();
    
    document.getElementById('registrationForm').style.display = 'none';
    document.getElementById('otpSection').style.display = 'none';
    document.getElementById('successSection').style.display = 'block';
}

// Update progress steps
function updateProgressSteps() {
    document.querySelectorAll('.step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index < currentStep - 1) {
            step.classList.add('completed');
        } else if (index === currentStep - 1) {
            step.classList.add('active');
        }
    });
}

// Resend OTP
function resendOTP() {
    if (!registrationData.email) return;

    fetch(`${API_BASE}/register/send-otp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: registrationData.email })
    })
        .then(r => r.json().catch(() => ({})).then(data => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
            if (!ok || !data.success) {
                throw new Error(data.message || 'Failed to resend OTP');
            }

            showMessage('New verification code sent to your email', 'success');
            document.querySelectorAll('.otp-input').forEach(input => input.value = '');
            document.getElementById('otp1').focus();
        })
        .catch((err) => {
            console.error('Resend OTP error:', err);
            showMessage(err.message || 'Failed to resend code', 'error');
        });
}

// Redirect to login
function redirectToLogin() {
    window.location.href = 'login.html';
}

// Generate user ID
function generateUserId() {
    return 'USR' + Date.now();
}

// Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
