// Mock Registration Script for Vercel Testing
// This bypasses OTP for demo purposes

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const otpSection = document.getElementById('otpSection');
    const otpForm = document.getElementById('otpForm');
    const successSection = document.getElementById('successSection');

    // Mock OTP storage
    let mockOTP = null;
    let mockEmail = null;

    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Validation
            if (password !== confirmPassword) {
                showMessage('Passwords do not match', 'error');
                return;
            }

            if (password.length < 6) {
                showMessage('Password must be at least 6 characters', 'error');
                return;
            }

            try {
                // Generate mock OTP
                mockOTP = '123456'; // Fixed OTP for demo
                mockEmail = email;

                // Show OTP section with demo message
                showMessage(`Demo OTP: ${mockOTP} (Check console)`, 'info');
                console.log('🔢 DEMO OTP for', email + ':', mockOTP);
                
                // Hide registration form, show OTP section
                registerForm.parentElement.style.display = 'none';
                otpSection.style.display = 'block';

            } catch (error) {
                console.error('Registration error:', error);
                showMessage('Registration failed. Please try again.', 'error');
            }
        });
    }

    if (otpForm) {
        otpForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const otp1 = document.getElementById('otp1').value;
            const otp2 = document.getElementById('otp2').value;
            const otp3 = document.getElementById('otp3').value;
            const otp4 = document.getElementById('otp4').value;
            const otp5 = document.getElementById('otp5').value;
            const otp6 = document.getElementById('otp6').value;
            
            const enteredOTP = otp1 + otp2 + otp3 + otp4 + otp5 + otp6;

            // Verify mock OTP
            if (enteredOTP === mockOTP) {
                showMessage('Registration successful!', 'success');
                
                // Hide OTP section, show success
                otpSection.style.display = 'none';
                successSection.style.display = 'block';

                // Store mock user data
                const userData = {
                    email: mockEmail,
                    registered: true,
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem('mockUser', JSON.stringify(userData));

            } else {
                showMessage('Invalid OTP. Use 123456 for demo', 'error');
            }
        });
    }

    // Mock resend OTP
    window.resendOTP = function() {
        if (mockEmail) {
            mockOTP = '123456';
            showMessage(`New Demo OTP: ${mockOTP}`, 'info');
            console.log('🔢 RESENT DEMO OTP:', mockOTP);
        }
    };

    // Mock redirect to login
    window.redirectToLogin = function() {
        window.location.href = 'login.html';
    };

    // Show message function
    function showMessage(message, type) {
        // Create or update message element
        let messageDiv = document.getElementById('messageDiv');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'messageDiv';
            messageDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                color: white;
                font-weight: bold;
                z-index: 9999;
                max-width: 300px;
            `;
            document.body.appendChild(messageDiv);
        }

        // Set message and style
        messageDiv.textContent = message;
        messageDiv.style.backgroundColor = type === 'error' ? '#dc3545' : 
                                      type === 'success' ? '#28a745' : 
                                      type === 'info' ? '#17a2b8' : '#6c757d';

        // Auto hide after 5 seconds
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
});
