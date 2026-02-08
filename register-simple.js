// ULTRA SIMPLE REGISTRATION - NO ERRORS POSSIBLE
// Complete replacement for register-script.js

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Simple Registration System Loaded');
    
    // Get elements
    const registerForm = document.getElementById('registerForm');
    const registrationSection = document.querySelector('.registration-section');
    const otpSection = document.getElementById('otpSection');
    const successSection = document.getElementById('successSection');
    
    // Mock data storage
    let currentRegistration = null;
    const DEMO_OTP = '123456';
    
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
    
    // Handle registration form submission
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('📝 Registration form submitted');
            
            // Get form values
            const firstName = document.getElementById('firstName')?.value;
            const lastName = document.getElementById('lastName')?.value;
            const email = document.getElementById('email')?.value;
            const phone = document.getElementById('phone')?.value;
            const password = document.getElementById('password')?.value;
            const confirmPassword = document.getElementById('confirmPassword')?.value;
            
            // Basic validation
            if (!firstName || !lastName || !email || !phone || !password) {
                showMessage('Please fill all required fields', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showMessage('Passwords do not match', 'error');
                return;
            }
            
            if (password.length < 6) {
                showMessage('Password must be at least 6 characters', 'error');
                return;
            }
            
            // Store registration data
            currentRegistration = {
                firstName,
                lastName,
                email: email.toLowerCase(),
                phone,
                password,
                registrationDate: new Date().toISOString(),
                demoOTP: DEMO_OTP
            };
            
            // Show OTP section
            if (registrationSection) {
                registrationSection.style.display = 'none';
            }
            if (otpSection) {
                otpSection.style.display = 'block';
            }
            
            // Show OTP to user
            showMessage(`🎯 Demo OTP: ${DEMO_OTP} - Use this to verify your account`, 'info');
            console.log(`🔢 DEMO OTP for ${email}: ${DEMO_OTP}`);
            
            // Clear OTP inputs
            const otpInputs = document.querySelectorAll('.otp-input');
            otpInputs.forEach(input => input.value = '');
            
        });
    }
    
    // Handle OTP form submission
    const otpForm = document.getElementById('otpForm');
    if (otpForm) {
        otpForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('🔍 OTP form submitted');
            
            // Get OTP from inputs
            const otpInputs = document.querySelectorAll('.otp-input');
            let otp = '';
            otpInputs.forEach(input => {
                otp += input.value;
            });
            
            console.log(`📱 Entered OTP: ${otp}`);
            console.log(`🎯 Expected OTP: ${currentRegistration?.demoOTP}`);
            
            // Verify OTP
            if (otp === currentRegistration?.demoOTP) {
                console.log('✅ OTP verification successful');
                
                // Save to localStorage
                const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
                const userToSave = {
                    ...currentRegistration,
                    id: Date.now(),
                    isVerified: true,
                    verifiedAt: new Date().toISOString()
                };
                
                registeredUsers.push(userToSave);
                localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
                
                // Show success section
                if (otpSection) {
                    otpSection.style.display = 'none';
                }
                if (successSection) {
                    successSection.style.display = 'block';
                }
                
                showMessage('🎉 Registration completed successfully!', 'success');
                console.log('✅ User registered successfully');
                
            } else {
                console.log('❌ Invalid OTP');
                showMessage(`❌ Invalid OTP. Please use: ${DEMO_OTP}`, 'error');
            }
        });
    }
    
    // Resend OTP function
    window.resendOTP = function() {
        if (currentRegistration) {
            showMessage(`🔄 OTP resent: ${DEMO_OTP}`, 'info');
            console.log(`🔄 OTP resent: ${DEMO_OTP}`);
        } else {
            showMessage('No registration in progress', 'warning');
        }
    };
    
    // Redirect to login function
    window.redirectToLogin = function() {
        console.log('🔄 Redirecting to login...');
        window.location.href = 'login.html';
    };
    
    // Auto-focus OTP inputs
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', function() {
            if (this.value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value === '' && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });
    
    console.log('✅ Simple Registration System Ready');
    console.log('🎯 Demo OTP: 123456');
});
