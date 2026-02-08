// Email Service for Brothers Solar
const nodemailer = require('nodemailer');

// Email transporter configuration
let transporter;

// Initialize email service
function initializeEmailService() {
    try {
        // For development, we'll use a test account
        // In production, you should configure real SMTP settings
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER || 'brotherssolar01@gmail.com',
                pass: process.env.SMTP_PASS || 'qwne avny jyhr wlyq'
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        
        console.log('✅ Email service initialized with Gmail SMTP');
        console.log('📧 Email user:', process.env.SMTP_USER || 'brotherssolar01@gmail.com');
        return true;
    } catch (error) {
        console.error('❌ Email service initialization failed:', error);
        console.log('⚠️ Email service disabled - using fallback');
        return false;
    }
}

// Send user login OTP email
async function sendUserLoginOtpEmail(toEmail, otp) {
    if (!transporter) {
        console.log('Email service not available, skipping user login OTP email');
        return false;
    }

    try {
        const mailOptions = {
            from: '"Brothers Solar" <' + (process.env.SMTP_USER || 'brotherssolar01@gmail.com') + '>',
            to: toEmail,
            subject: 'Login Verification OTP - Brothers Solar',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2 style="margin: 0 0 12px;">Login verification</h2>
                    <p style="margin: 0 0 12px;">Use this OTP to login:</p>
                    <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; padding: 12px 16px; background: #f3f4f6; display: inline-block; border-radius: 8px;">${otp}</div>
                    <p style="margin: 12px 0 0; color: #666;">This OTP will expire in 5 minutes.</p>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ User login OTP email sent:', result.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error sending user login OTP email:', error);
        return false;
    }
}

// Send user registration OTP email
async function sendUserRegistrationOtpEmail(toEmail, otp) {
    if (!transporter) {
        console.log('Email service not available, skipping user registration OTP email');
        return false;
    }

    try {
        const mailOptions = {
            from: '"Brothers Solar" <' + (process.env.SMTP_USER || 'brotherssolar01@gmail.com') + '>',
            to: toEmail,
            subject: 'Verify Your Account - Brothers Solar OTP',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2 style="margin: 0 0 12px;">Verify your Brothers Solar account</h2>
                    <p style="margin: 0 0 12px;">Use this OTP to complete your registration:</p>
                    <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; padding: 12px 16px; background: #f3f4f6; display: inline-block; border-radius: 8px;">${otp}</div>
                    <p style="margin: 12px 0 0; color: #666;">This OTP will expire in 10 minutes.</p>
                </div>
            `
        };

        // Verify transporter connection first
        await transporter.verify();
        
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ User registration OTP email sent:', result.messageId);
        console.log('📧 Sent to:', toEmail);
        return true;
    } catch (error) {
        console.error('❌ Error sending user registration OTP email:', error);
        console.error('🔍 Error details:', error.message);
        return false;
    }
}

// Send admin login OTP email
async function sendAdminOtpEmail(toEmail, otp) {
    if (!transporter) {
        console.log('Email service not available, skipping admin OTP email');
        return false;
    }

    try {
        const mailOptions = {
            from: '"Brothers Solar" <' + (process.env.SMTP_USER || 'nikhilsunilpstil01@gmail.com') + '>',
            to: toEmail,
            subject: 'Admin Login OTP - Brothers Solar',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2 style="margin: 0 0 12px;">Admin Login Verification</h2>
                    <p style="margin: 0 0 12px;">Your OTP for admin login is:</p>
                    <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; padding: 12px 16px; background: #f3f4f6; display: inline-block; border-radius: 8px;">${otp}</div>
                    <p style="margin: 12px 0 0; color: #666;">This OTP will expire in 5 minutes.</p>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Admin OTP email sent:', result.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error sending admin OTP email:', error);
        return false;
    }
}

// Send order confirmation email
async function sendOrderConfirmationEmail(orderData) {
    if (!transporter) {
        console.log('Email service not available, skipping confirmation email');
        return false;
    }

    try {
        const mailOptions = {
            from: '"Brothers Solar" <nikhilsunilpstil01@gmail.com>',
            to: orderData.email,
            subject: `Order Confirmation - ${orderData.orderId}`,
            html: generateOrderConfirmationHTML(orderData)
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Order confirmation email sent:', result.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error sending order confirmation email:', error);
        return false;
    }
}

// Send installation reminder email
async function sendInstallationReminderEmail(orderData) {
    if (!transporter) {
        console.log('Email service not available, skipping reminder email');
        return false;
    }

    try {
        const mailOptions = {
            from: '"Brothers Solar" <nikhilsunilpstil01@gmail.com>',
            to: orderData.email,
            subject: `Installation Reminder - ${orderData.orderId}`,
            html: generateInstallationReminderHTML(orderData)
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Installation reminder email sent:', result.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error sending installation reminder email:', error);
        return false;
    }
}

// Send admin notification for new order
async function sendAdminNotificationEmail(orderData) {
    if (!transporter) {
        console.log('Email service not available, skipping admin notification');
        return false;
    }

    try {
        const mailOptions = {
            from: '"Brothers Solar System" <nikhilsunilpstil01@gmail.com>',
            to: 'nikhilsunilpstil01@gmail.com',
            subject: `New Order Received - ${orderData.orderId}`,
            html: generateAdminNotificationHTML(orderData)
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Admin notification email sent:', result.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error sending admin notification email:', error);
        return false;
    }
}

// Generate HTML for order confirmation email
function generateOrderConfirmationHTML(orderData) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Order Confirmation - Brothers Solar</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: linear-gradient(135deg, #1e5128, #4e9f3d); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #333; color: white; padding: 20px; text-align: center; }
            .btn { display: inline-block; padding: 12px 24px; background: #4e9f3d; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🌞 Brothers Solar</h1>
            <h2>Order Confirmation</h2>
        </div>
        
        <div class="content">
            <p>Dear ${orderData.name},</p>
            <p>Thank you for choosing Brothers Solar! Your order has been confirmed and we're excited to help you switch to clean energy.</p>
            
            <div class="order-details">
                <h3>Order Details</h3>
                <p><strong>Order ID:</strong> ${orderData.orderId}</p>
                <p><strong>Solar Type:</strong> ${orderData.solarType}</p>
                <p><strong>Quantity:</strong> ${orderData.quantity}</p>
                <p><strong>Total Amount:</strong> ₹${orderData.totalAmount.toLocaleString('hi-IN')}</p>
                <p><strong>Installation Date:</strong> ${orderData.installationDate}</p>
                <p><strong>Payment Method:</strong> ${orderData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
            </div>
            
            <h3>What's Next?</h3>
            <ul>
                <li>Our installation team will contact you 24 hours before the scheduled date</li>
                <li>Please ensure the installation area is clean and accessible</li>
                <li>Keep the necessary documents ready (ID proof, address proof)</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost/brothers%20solar/" class="btn">Track Your Order</a>
            </div>
            
            <p>If you have any questions, feel free to contact us:</p>
            <p>📞 Phone: +91 98765 43210<br>
            📧 Email: support@brotherssolar.com<br>
            💬 WhatsApp: <a href="https://wa.me/919876543210">Chat with us</a></p>
        </div>
        
        <div class="footer">
            <p>© 2024 Brothers Solar. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </body>
    </html>
    `;
}

// Generate HTML for installation reminder email
function generateInstallationReminderHTML(orderData) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Installation Reminder - Brothers Solar</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: linear-gradient(135deg, #1e5128, #4e9f3d); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .reminder-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #333; color: white; padding: 20px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🌞 Brothers Solar</h1>
            <h2>Installation Reminder</h2>
        </div>
        
        <div class="content">
            <p>Dear ${orderData.name},</p>
            
            <div class="reminder-box">
                <h3>⏰ Installation Scheduled Tomorrow!</h3>
                <p><strong>Date:</strong> ${orderData.installationDate}</p>
                <p><strong>Time:</strong> 9:00 AM - 5:00 PM</p>
                <p><strong>Order ID:</strong> ${orderData.orderId}</p>
            </div>
            
            <h3>Installation Preparation Checklist:</h3>
            <ul>
                <li>✅ Clear the installation area (roof/ground space)</li>
                <li>✅ Ensure electrical connection is accessible</li>
                <li>✅ Keep original documents ready</li>
                <li>✅ Arrange for payment (if COD)</li>
                <li>✅ Make sure someone is available during installation</li>
            </ul>
            
            <h3>Contact Information:</h3>
            <p><strong>Installation Team Lead:</strong> +91 98765 43211<br>
            <strong>Customer Support:</strong> +91 98765 43210</p>
            
            <p>We look forward to providing you with clean, renewable energy!</p>
        </div>
        
        <div class="footer">
            <p>© 2024 Brothers Solar. All rights reserved.</p>
        </div>
    </body>
    </html>
    `;
}

// Generate HTML for admin notification email
function generateAdminNotificationHTML(orderData) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>New Order Alert - Brothers Solar</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .order-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .urgent { background: #ffebee; border: 1px solid #ffcdd2; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .footer { background: #333; color: white; padding: 20px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🔔 New Order Alert</h1>
            <h2>Brothers Solar Admin Dashboard</h2>
        </div>
        
        <div class="content">
            <div class="urgent">
                <h3>🚨 New Order Received</h3>
                <p>A new customer order has been placed and requires your attention.</p>
            </div>
            
            <div class="order-info">
                <h3>Order Information</h3>
                <p><strong>Order ID:</strong> ${orderData.orderId}</p>
                <p><strong>Customer:</strong> ${orderData.name}</p>
                <p><strong>Email:</strong> ${orderData.email}</p>
                <p><strong>Phone:</strong> ${orderData.phone}</p>
                <p><strong>Address:</strong> ${orderData.address}</p>
                <p><strong>Solar Type:</strong> ${orderData.solarType}</p>
                <p><strong>Quantity:</strong> ${orderData.quantity}</p>
                <p><strong>Tot,
    sendAdminOtpEmailal Amount:</strong> ₹${orderData.totalAmount.toLocaleString('hi-IN')}</p>
                <p><strong>Installation Date:</strong> ${orderData.installationDate}</p>
                <p><strong>Payment Method:</strong> ${orderData.paymentMethod}</p>
                <p><strong>Order Date:</strong> ${new Date().toLocaleDateString('hi-IN')}</p>
            </div>
            
            <h3>Required Actions:</h3>
            <ul>
                <li>Review order details in admin dashboard</li>
                <li>Contact customer to confirm installation schedule</li>
                <li>Assign installation team</li>
                <li>Prepare necessary equipment</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost/brothers%20solar/admin.html" style="display: inline-block; padding: 12px 24px; background: #e74c3c; color: white; text-decoration: none; border-radius: 4px;">View in Admin Dashboard</a>
            </div>
        </div>
        
        <div class="footer">
            <p>© 2024 Brothers Solar Admin System</p>
        </div>
    </body>
    </html>
    `;
}
module.exports = {
    initializeEmailService,
    sendOrderConfirmationEmail,
    sendInstallationReminderEmail,
    sendAdminNotificationEmail,
    sendAdminOtpEmail,
    sendUserRegistrationOtpEmail,
    sendUserLoginOtpEmail
};
