const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql2/promise');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const https = require('https');
require('dotenv').config();

// Import email service
const emailService = require('./emailService');

const app = express();
const PORT = process.env.PORT || 3003;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        // Allow same-machine dev scenarios:
        // - XAMPP/Apache: http://localhost (any port)
        // - Direct file open (origin may be undefined/null)
        if (!origin) {
            return callback(null, true);
        }

        try {
            const { hostname } = new URL(origin);
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return callback(null, true);
            }
        } catch (_) {
            // If origin can't be parsed, fall back to rejecting
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// Body parsing middleware (must be before routes)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// OTP helpers/stores must be defined before routes use them
// User registration OTP store (in-memory, per email)
const userRegistrationOtpStore = new Map();
// User login OTP store (in-memory, per email)
const userLoginOtpStore = new Map();

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function generateUserOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    // Default to India; if already includes country code, keep it
    if (digits.length === 10) return '91' + digits;
    return digits;
}

function sendMsg91Sms({ phoneE164NoPlus, message }) {
    return new Promise((resolve, reject) => {
        const authKey = process.env.MSG91_AUTHKEY;
        const senderId = process.env.MSG91_SENDER;
        const templateId = process.env.MSG91_DLT_TEMPLATE_ID;

        if (!authKey || !senderId) {
            return reject(new Error('MSG91_AUTHKEY and MSG91_SENDER are required'));
        }
        if (!templateId) {
            return reject(new Error('MSG91_DLT_TEMPLATE_ID is required for India SMS compliance'));
        }
        if (!phoneE164NoPlus) {
            return reject(new Error('Phone is required'));
        }

        const payload = JSON.stringify({
            sender: senderId,
            route: '4',
            country: '91',
            sms: [
                {
                    message,
                    to: [phoneE164NoPlus.slice(-10)],
                    template_id: templateId
                }
            ]
        });

        const req = https.request(
            {
                method: 'POST',
                hostname: 'api.msg91.com',
                path: '/api/v2/sendsms',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                    authkey: authKey
                }
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ ok: true, status: res.statusCode, data });
                    } else {
                        reject(new Error('MSG91 SMS failed: ' + (data || res.statusCode)));
                    }
                });
            }
        );
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// User Login OTP: send OTP to user's email
app.post('/api/login/send-otp', async (req, res) => {
    try {
        const { email, phone } = req.body || {};
        const normalized = normalizeEmail(email);
        const phoneNorm = normalizePhone(phone);

        if (!normalized) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const otp = generateUserOtp();
        userLoginOtpStore.set(normalized, {
            otpHash: hashOtp(otp),
            expiresAt: Date.now() + 5 * 60 * 1000
        });

        const smsMessage = `Your Brothers Solar login OTP is ${otp}. It is valid for 5 minutes.`;

        const [emailSent, smsSent] = await Promise.all([
            emailService.sendUserLoginOtpEmail(normalized, otp).catch(() => true),
            sendMsg91Sms({ phoneE164NoPlus: phoneNorm, message: smsMessage }).then(() => true).catch((e) => {
                console.error('MSG91 SMS send failed:', e.message);
                return true; // Allow login in dev even if SMS fails
            })
        ]);

        // In development, allow OTP even if email/SMS fails
        if (process.env.NODE_ENV === 'development' || (emailSent && smsSent)) {
            console.log(`📧 OTP for ${normalized}: ${otp}`);
            res.json({
                success: true,
                message: 'OTP sent successfully'
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP on email/SMS. Please check SMTP/MSG91 configuration in backend .env.'
            });
        }
    } catch (error) {
        console.error('Error sending login OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP',
            error: error.message
        });
    }
});

// User Login OTP: verify
app.post('/api/login/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body || {};
        const normalized = normalizeEmail(email);

        if (!normalized || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        const record = userLoginOtpStore.get(normalized);
        if (!record || !record.otpHash || Date.now() > record.expiresAt) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired. Please request a new OTP.'
            });
        }

        const isValid = hashOtp(String(otp)) === record.otpHash;
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        userLoginOtpStore.delete(normalized);

        res.json({
            success: true,
            message: 'OTP verified successfully'
        });
    } catch (error) {
        console.error('Error verifying login OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify OTP',
            error: error.message
        });
    }
});

// User Registration OTP: send OTP to user's email
app.post('/api/register/send-otp', async (req, res) => {
    try {
        const { email } = req.body || {};
        const normalized = normalizeEmail(email);

        if (!normalized) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const otp = generateUserOtp();
        userRegistrationOtpStore.set(normalized, {
            otpHash: hashOtp(otp),
            expiresAt: Date.now() + 10 * 60 * 1000
        });

        const sent = await emailService.sendUserRegistrationOtpEmail(normalized, otp);
        if (!sent) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP email. Please check SMTP configuration in backend .env.'
            });
        }

        res.json({
            success: true,
            message: 'OTP sent successfully'
        });
    } catch (error) {
        console.error('Error sending registration OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP',
            error: error.message
        });
    }
});

// User Registration OTP: verify OTP
app.post('/api/register/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body || {};
        const normalized = normalizeEmail(email);

        if (!normalized || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        const record = userRegistrationOtpStore.get(normalized);
        if (!record || !record.otpHash || Date.now() > record.expiresAt) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired. Please request a new OTP.'
            });
        }

        const isValid = hashOtp(String(otp)) === record.otpHash;
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        // Consume OTP
        userRegistrationOtpStore.delete(normalized);

        // Return a short-lived verification token
        const jwt = require('jsonwebtoken');
        const verificationToken = jwt.sign(
            { purpose: 'register', email: normalized },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '15m' }
        );

        res.json({
            success: true,
            message: 'OTP verified successfully',
            data: { verificationToken }
        });
    } catch (error) {
        console.error('Error verifying registration OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify OTP',
            error: error.message
        });
    }
});
// Database connection
let db;

async function initDB() {
    // Use in-memory storage for development - no database needed
    console.log('⚠️ Using in-memory storage for development');
    db = null;
    
    // Initialize email service
    emailService.initializeEmailService();
}

// Create database tables
async function createTables() {
    try {
        // Create customers table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                address TEXT NOT NULL,
                solar_type VARCHAR(255) NOT NULL,
                solar_type_id INT NOT NULL,
                quantity INT NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                order_date DATE NOT NULL,
                installation_date DATE NOT NULL,
                status ENUM('pending', 'confirmed', 'completed') DEFAULT 'pending',
                payment_method ENUM('cod', 'online') DEFAULT 'cod',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create admin users table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert default admin user if not exists
        const [adminCheck] = await db.execute('SELECT * FROM admin_users WHERE username = ?', ['admin']);
        if (adminCheck.length === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await db.execute(
                'INSERT INTO admin_users (username, password, email) VALUES (?, ?, ?)',
                ['admin', hashedPassword, 'admin@brotherssolar.com']
            );
        }

        // Create reviews table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(50) UNIQUE NOT NULL,
                customer_name VARCHAR(255) NOT NULL,
                customer_email VARCHAR(255) NOT NULL,
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT NOT NULL,
                approved BOOLEAN DEFAULT FALSE,
                verified_order BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES customers(order_id) ON DELETE CASCADE
            )
        `);

        console.log('✅ Database tables created successfully');
    } catch (error) {
        console.error('❌ Error creating tables:', error);
    }
}

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'XXXXXXXXXXXXXXXXXXXXXXXX'
});

// Admin OTP store (in-memory)
const adminOtpStore = {
    otpHash: null,
    expiresAt: 0
};

function generateAdminOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp) {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    return crypto.createHmac('sha256', secret).update(String(otp)).digest('hex');
}

// In-memory storage fallback
let inMemoryOrders = [];
let orderIdCounter = 1000;

// Load orders from file on startup
try {
    const fs = require('fs');
    if (fs.existsSync('./orders-storage.json')) {
        const data = fs.readFileSync('./orders-storage.json', 'utf8');
        inMemoryOrders = JSON.parse(data);
        console.log(`📦 Loaded ${inMemoryOrders.length} orders from storage`);
        // Update counter to avoid conflicts
        if (inMemoryOrders.length > 0) {
            const maxId = Math.max(...inMemoryOrders.map(o => {
                const match = o.orderId.match(/ORD(\d+)/);
                return match ? parseInt(match[1]) : 1000;
            }));
            orderIdCounter = maxId + 1;
        }
    }
} catch (error) {
    console.log('⚠️ No existing orders storage found');
}

// Save orders to file
function saveOrdersToFile() {
    try {
        const fs = require('fs');
        fs.writeFileSync('./orders-storage.json', JSON.stringify(inMemoryOrders, null, 2));
        console.log('💾 Orders saved to file');
    } catch (error) {
        console.error('❌ Failed to save orders:', error);
    }
}

// API Routes

// Get solar types
app.get('/api/solar-types', (req, res) => {
    const solarTypes = [
        {
            id: 1,
            name: {
                hi: "Tata Power Solar",
                en: "Tata Power Solar",
                mr: "टाटा पॉवर सोलर"
            },
            power: "300W",
            price: 15000,
            description: {
                hi: "Tata Power Solar - भारत की विश्वसनीय सोलर कंपनी",
                en: "Tata Power Solar - India's trusted solar company",
                mr: "टाटा पॉवर सोलर - भारताची विश्वासार्ह सोलर कंपनी"
            },
            efficiency: "15%",
            warranty: {
                en: "25 years",
            },
            icon: "fa-solar-panel"
        },
        {
            id: 2,
            name: {
                hi: "Luminous Solar",
                en: "Luminous Solar",
                mr: "ल्युमिनस सोलर"
            },
            power: "400W",
            price: 25000,
            description: {
                hi: "Luminous - उच्च गुणवत्ता वाले सोलर पैनल",
                en: "Luminous - High quality solar panels",
                mr: "ल्युमिनस - उच्च गुणवत्ता सोलर पॅनेल"
            },
            efficiency: "20%",
            warranty: {
                en: "25 years",
            },
            icon: "fa-sun"
        },
        {
            id: 3,
            name: {
                hi: "Waaree Solar",
                en: "Waaree Solar",
                mr: "वारी सोलर"
            },
            power: "500W",
            price: 35000,
            description: {
                hi: "Waaree Solar - व्यावसायिक सोलर समाधान",
                en: "Waaree Solar - Commercial solar solutions",
                mr: "वारी सोलर - व्यावसायिक सोलर समाधान"
            },
            efficiency: "22%",
            warranty: {
                en: "25 years",
            },
            icon: "fa-industry"
        },
        {
            id: 4,
            name: {
                hi: "Adani Solar",
                en: "Adani Solar",
                mr: "अदानी सोलर"
            },
            power: "600W",
            price: 45000,
            description: {
                hi: "Adani Solar - हाइब्रिड सोलर सिस्टम",
                en: "Adani Solar - Hybrid solar system",
                mr: "अदानी सोलर - हायब्रिड सोलर सिस्टम"
            },
            efficiency: "24%",
            warranty: {
                en: "25 years",
            },
            icon: "fa-battery-full"
        }
    ];

    res.json({
        success: true,
        data: solarTypes
    });
});

// Bill Calculator API
app.post('/api/calculate-bill', (req, res) => {
    const { monthlyBill, unitsPerMonth } = req.body;

    if (!monthlyBill || !unitsPerMonth) {
        return res.status(400).json({
            success: false,
            message: 'Monthly bill and units are required'
        });
    }

    // Calculate savings
    const monthlySavings = monthlyBill * 0.8; // 80% savings with solar
    const yearlySavings = monthlySavings * 12;
    const twentyYearSavings = yearlySavings * 20;
    
    // Calculate required solar capacity
    const dailyUnits = unitsPerMonth / 30;
    const requiredCapacity = Math.ceil(dailyUnits / 5); // 5 hours average sunlight

    res.json({
        success: true,
        data: {
            monthlySavings: Math.round(monthlySavings),
            yearlySavings: Math.round(yearlySavings),
            twentyYearSavings: Math.round(twentyYearSavings),
            requiredCapacity
        }
    });
});

// Solar Calculator API
app.post('/api/calculate-solar', (req, res) => {
    const { roofArea, dailyUsage, sunlightHours } = req.body;

    if (!roofArea || !dailyUsage || !sunlightHours) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    // Calculate solar system requirements
    const panelsNeeded = Math.ceil(dailyUsage / (0.3 * sunlightHours)); // 300W panel
    const totalCapacity = (panelsNeeded * 0.3).toFixed(2);
    const areaRequired = panelsNeeded * 20; // 20 sq ft per panel
    const estimatedCost = panelsNeeded * 15000; // ₹15000 per panel

    res.json({
        success: true,
        data: {
            panelsNeeded,
            totalCapacity,
            areaRequired,
            estimatedCost,
            roofAvailable: roofArea >= areaRequired
        }
    });
});

// Get all orders
app.get('/api/orders', async (req, res) => {
    try {
        if (db) {
            // Get from database
            const [orders] = await db.execute(`
                SELECT * FROM customers ORDER BY created_at DESC
            `);
            
            res.json({
                success: true,
                data: orders
            });
        } else {
            // Get from in-memory storage
            res.json({
                success: true,
                data: inMemoryOrders
            });
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get order by ID
app.get('/api/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        
        if (db) {
            // Get from database
            const [orders] = await db.execute(`
                SELECT * FROM customers WHERE order_id = ?
            `, [orderId]);
            
            if (orders.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
            
            res.json({
                success: true,
                data: orders[0]
            });
        } else {
            // Get from in-memory storage
            const order = inMemoryOrders.find(o => o.orderId === orderId);
            
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
            
            res.json({
                success: true,
                data: order
            });
        }
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Create customer order
app.post('/api/orders', async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            address,
            solarType,
            solarTypeId,
            quantity,
            price,
            totalAmount,
            installationDate,
            paymentMethod,
            paymentStatus,
            paymentDetails
        } = req.body;

        // Validation
        if (!name || !email || !phone || !address || !solarType || !solarTypeId || !quantity || !price || !totalAmount) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        const orderId = 'ORD' + Date.now();
        const orderDate = new Date().toISOString().split('T')[0];

        if (db) {
            // Save to database
            const [result] = await db.execute(`
                INSERT INTO customers (
                    order_id, name, email, phone, address, solar_type, solar_type_id,
                    quantity, price, total_amount, order_date, installation_date,
                    payment_method, payment_status, payment_details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                orderId, name, email, phone, address, solarType, solarTypeId,
                quantity, price, totalAmount, orderDate, installationDate,
                paymentMethod, paymentStatus, JSON.stringify(paymentDetails)
            ]);

            res.json({
                success: true,
                message: 'Order created successfully',
                data: {
                    orderId,
                    id: result.insertId
                }
            });
            
            // Send email notifications
            const orderData = {
                orderId,
                name,
                email,
                phone,
                address,
                solarType,
                solarTypeId,
                quantity,
                price,
                totalAmount,
                permission: 'granted', // Everyone has permission
                customerType: 'individual',
                orderSource: 'website',
                status: 'pending'
            };
            
            // Send order confirmation to customer
            emailService.sendOrderConfirmationEmail(orderData);
            
            // Send notification to admin
            emailService.sendAdminNotificationEmail(orderData);
        } else {
            // Fallback to in-memory storage
            const order = {
                id: Date.now(),
                orderId,
                name,
                email,
                phone,
                address,
                solarType,
                solarTypeId,
                quantity,
                price,
                totalAmount,
                orderDate,
                installationDate,
                paymentMethod,
                paymentStatus,
                paymentDetails,
                createdAt: new Date().toISOString()
            };
            
            inMemoryOrders.push(order);
            saveOrdersToFile(); // Save to file
            
            console.log('Order saved to in-memory storage:', order);
            
            res.json({
                success: true,
                message: 'Order created successfully (in-memory storage)',
                data: {
                    orderId,
                    id: order.id
                }
            });
        }
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update order status and payment
app.put('/api/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, paymentMethod } = req.body;

        if (db) {
            const [result] = await db.execute(`
                UPDATE customers 
                SET status = ?, payment_method = ?, updated_at = CURRENT_TIMESTAMP
                WHERE order_id = ?
            `, [status, paymentMethod, orderId]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
        } else {
            // Fallback to in-memory storage
            const orderIndex = inMemoryOrders.findIndex(order => order.orderId === orderId);
            if (orderIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            inMemoryOrders[orderIndex].status = status;
            inMemoryOrders[orderIndex].paymentMethod = paymentMethod;
        }

        res.json({
            success: true,
            message: 'Order updated successfully'
        });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get all orders (for admin)
app.get('/api/orders', async (req, res) => {
    try {
        if (db) {
            const [orders] = await db.execute('SELECT * FROM customers ORDER BY created_at DESC');
            res.json({
                success: true,
                data: orders
            });
        } else {
            // Fallback to in-memory storage
            res.json({
                success: true,
                data: inMemoryOrders
            });
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update order
app.put('/api/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const updateData = req.body;

        if (db) {
            // Build dynamic update query
            const updateFields = [];
            const updateValues = [];

            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined) {
                    updateFields.push(`${key} = ?`);
                    updateValues.push(updateData[key]);
                }
            });

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No valid fields to update'
                });
            }

            updateValues.push(orderId);

            const [result] = await db.execute(
                `UPDATE customers SET ${updateFields.join(', ')} WHERE order_id = ?`,
                updateValues
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
        } else {
            // Fallback to in-memory storage
            const orderIndex = inMemoryOrders.findIndex(order => order.orderId === orderId);
            if (orderIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Update order in memory
            inMemoryOrders[orderIndex] = { ...inMemoryOrders[orderIndex], ...updateData };
        }

        res.json({
            success: true,
            message: 'Order updated successfully'
        });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Delete order
app.delete('/api/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;

        if (db) {
            const [result] = await db.execute('DELETE FROM customers WHERE order_id = ?', [orderId]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
        } else {
            // Fallback to in-memory storage
            const orderIndex = inMemoryOrders.findIndex(order => order.orderId === orderId);
            if (orderIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            inMemoryOrders.splice(orderIndex, 1);
            saveOrdersToFile(); // Save to file
        }

        res.json({
            success: true,
            message: 'Order deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        if (db) {
            const [admin] = await db.execute('SELECT * FROM admin_users WHERE username = ?', [username]);
            
            if (admin.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            const bcrypt = require('bcryptjs');
            const isValidPassword = await bcrypt.compare(password, admin[0].password);

            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            const jwt = require('jsonwebtoken');
            const token = jwt.sign(
                { id: admin[0].id, username: admin[0].username },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    token,
                    admin: {
                        id: admin[0].id,
                        username: admin[0].username,
                        email: admin[0].email
                    }
                }
            });
        } else {
            // Fallback for development
            if (username === 'admin' && password === 'admin123') {
                res.json({
                    success: true,
                    message: 'Login successful',
                    data: {
                        token: 'dev-token',
                        admin: {
                            id: 1,
                            username: username,
                            email: 'admin@brotherssolar.com'
                        }
                    }
                });
            } else {
                res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
        }
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Admin OTP: send OTP to fixed admin email
app.post('/api/admin/send-otp', async (req, res) => {
    try {
        const { username, password } = req.body || {};

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Validate credentials using existing logic
        let valid = false;
        if (db) {
            const [admin] = await db.execute('SELECT * FROM admin_users WHERE username = ?', [username]);
            if (admin.length === 0) valid = false;
            else {
                const bcrypt = require('bcryptjs');
                valid = await bcrypt.compare(password, admin[0].password);
            }
        } else {
            valid = (username === 'admin' && password === 'admin123');
        }

        if (!valid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const otp = generateAdminOtp();
        adminOtpStore.otpHash = hashOtp(otp);
        adminOtpStore.expiresAt = Date.now() + 5 * 60 * 1000;

        const toEmail = 'brotherssolar01@gmail.com';
        const sent = await emailService.sendAdminOtpEmail(toEmail, otp).catch(() => false);
        
        if (process.env.NODE_ENV === 'development' || sent) {
            console.log(`🔐 Admin OTP: ${otp}`);
            res.json({
                success: true,
                message: 'OTP sent successfully'
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP email. Please check SMTP configuration in backend .env.'
            });
        }
    } catch (error) {
        console.error('Error sending admin OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP',
            error: error.message
        });
    }
});

// Admin OTP: verify
app.post('/api/admin/verify-otp', async (req, res) => {
    try {
        const { otp } = req.body || {};
        if (!otp) {
            return res.status(400).json({
                success: false,
                message: 'OTP is required'
            });
        }

        if (!adminOtpStore.otpHash || Date.now() > adminOtpStore.expiresAt) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired. Please request a new OTP.'
            });
        }

        const isValid = hashOtp(String(otp)) === adminOtpStore.otpHash;
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        // Consume OTP
        adminOtpStore.otpHash = null;
        adminOtpStore.expiresAt = 0;

        // Issue an admin session token (frontend stores it)
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { role: 'admin' },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'OTP verified successfully',
            data: { token }
        });
    } catch (error) {
        console.error('Error verifying admin OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify OTP',
            error: error.message
        });
    }
});

// Get order statistics
app.get('/api/statistics', async (req, res) => {
    try {
        if (db) {
            const [totalOrders] = await db.execute('SELECT COUNT(*) as count FROM customers');
            const [confirmedOrders] = await db.execute('SELECT COUNT(*) as count FROM customers WHERE status = "confirmed"');
            const [pendingOrders] = await db.execute('SELECT COUNT(*) as count FROM customers WHERE status = "pending"');
            const [revenue] = await db.execute('SELECT SUM(total_amount) as total FROM customers WHERE status IN ("confirmed", "completed")');

            res.json({
                success: true,
                data: {
                    totalOrders: totalOrders[0].count,
                    confirmedOrders: confirmedOrders[0].count,
                    pendingOrders: pendingOrders[0].count,
                    totalRevenue: revenue[0].total || 0
                }
            });
        } else {
            // Fallback to in-memory storage
            const totalOrders = inMemoryOrders.length;
            const confirmedOrders = inMemoryOrders.filter(order => order.status === 'confirmed').length;
            const pendingOrders = inMemoryOrders.filter(order => order.status === 'pending').length;
            const totalRevenue = inMemoryOrders
                .filter(order => ['confirmed', 'completed'].includes(order.status))
                .reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);

            res.json({
                success: true,
                data: {
                    totalOrders,
                    confirmedOrders,
                    pendingOrders,
                    totalRevenue
                }
            });
        }
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Payment Routes

// Create Razorpay Order
app.post('/api/payment/create-order', async (req, res) => {
    try {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({
                success: false,
                message: 'Razorpay keys are not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend .env.'
            });
        }

        const { amount, currency, receipt, notes } = req.body;

        if (!amount || !currency) {
            return res.status(400).json({
                success: false,
                message: 'Amount and currency are required'
            });
        }

        const options = {
            amount: amount * 100, // Convert to paise
            currency: currency || 'INR',
            receipt: receipt || 'receipt_' + Date.now(),
            notes: notes || {}
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt
            }
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment order',
            error: error.message
        });
    }
});

// Verify Payment Signature
app.post('/api/payment/verify', async (req, res) => {
    try {
        if (!process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({
                success: false,
                message: 'Razorpay secret is not configured on the server. Please set RAZORPAY_KEY_SECRET in backend .env.'
            });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Payment verification details are required'
            });
        }

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'XXXXXXXXXXXXXXXXXXXXXXXX')
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }

        // Update order with payment details
        if (orderData) {
            orderData.paymentMethod = 'Razorpay';
            orderData.paymentStatus = 'completed';
            orderData.paymentDetails = {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                paymentCompletedAt: new Date().toISOString()
            };
            orderData.status = 'confirmed';

            // Save order to database or in-memory storage
            if (db) {
                await db.execute(`
                    INSERT INTO customers (
                        order_id, name, email, phone, address, solar_type, solar_type_id,
                        quantity, price, total_amount, order_date, installation_date,
                        payment_method, payment_status, payment_details
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    orderData.orderId,
                    orderData.name,
                    orderData.email,
                    orderData.phone,
                    orderData.address,
                    orderData.solarType,
                    orderData.solarTypeId,
                    orderData.quantity,
                    orderData.price,
                    orderData.totalAmount,
                    orderData.orderDate,
                    orderData.installationDate,
                    orderData.paymentMethod,
                    orderData.paymentStatus,
                    JSON.stringify(orderData.paymentDetails)
                ]);
            } else {
                inMemoryOrders.push(orderData);
                saveOrdersToFile(); // Save to file
            }

            // Send confirmation emails
            emailService.sendOrderConfirmationEmail(orderData);
            emailService.sendAdminNotificationEmail(orderData);
        }

        res.json({
            success: true,
            message: 'Payment verified successfully',
            data: {
                razorpay_order_id,
                razorpay_payment_id,
                status: 'completed'
            }
        });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
});

// Get Payment Key (for frontend)
app.get('/api/payment/key', (req, res) => {
    if (!process.env.RAZORPAY_KEY_ID) {
        return res.status(500).json({
            success: false,
            message: 'Razorpay key is not configured on the server. Please set RAZORPAY_KEY_ID in backend .env.'
        });
    }
    res.json({
        success: true,
        data: {
            key: process.env.RAZORPAY_KEY_ID
        }
    });
});

// Review/Testimonial Management APIs

// In-memory storage for reviews (fallback) - Load from localStorage file on startup
let inMemoryReviews = [];
try {
    const fs = require('fs');
    if (fs.existsSync('./reviews-storage.json')) {
        const data = fs.readFileSync('./reviews-storage.json', 'utf8');
        inMemoryReviews = JSON.parse(data);
        console.log(`📝 Loaded ${inMemoryReviews.length} reviews from storage`);
    }
} catch (error) {
    console.log('⚠️ No existing reviews storage found');
}

// Save reviews to file
function saveReviewsToFile() {
    try {
        const fs = require('fs');
        fs.writeFileSync('./reviews-storage.json', JSON.stringify(inMemoryReviews, null, 2));
        console.log('💾 Reviews saved to file');
    } catch (error) {
        console.error('❌ Failed to save reviews:', error);
    }
}

// Get all reviews (for public display - only approved ones)
app.get('/api/reviews', async (req, res) => {
    try {
        if (db) {
            const [reviews] = await db.execute(`
                SELECT r.*, o.name as customerName, o.email as customerEmail 
                FROM reviews r 
                LEFT JOIN customers o ON r.order_id = o.order_id 
                WHERE r.approved = 1 
                ORDER BY r.created_at DESC
            `);
            res.json({ success: true, data: reviews });
        } else {
            const approvedReviews = inMemoryReviews.filter(r => r.approved);
            res.json({ success: true, data: approvedReviews });
        }
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get all reviews for admin (including pending)
app.get('/api/admin/reviews', async (req, res) => {
    try {
        if (db) {
            const [reviews] = await db.execute(`
                SELECT r.*, o.name as customerName, o.email as customerEmail, o.order_id
                FROM reviews r 
                LEFT JOIN customers o ON r.order_id = o.order_id 
                ORDER BY r.created_at DESC
            `);
            res.json({ success: true, data: reviews });
        } else {
            res.json({ success: true, data: inMemoryReviews });
        }
    } catch (error) {
        console.error('Error fetching admin reviews:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Add review (customer only - must have valid order)
app.post('/api/reviews', async (req, res) => {
    try {
        const { orderId, customerName, customerEmail, rating, comment } = req.body;

        if (!orderId || !customerName || !customerEmail || !rating || !comment) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Verify if order exists and belongs to this customer
        let orderExists = false;
        if (db) {
            const [orders] = await db.execute(
                'SELECT * FROM customers WHERE order_id = ? AND email = ?',
                [orderId, customerEmail]
            );
            orderExists = orders.length > 0;
        } else {
            orderExists = inMemoryOrders.some(o => o.orderId === orderId && o.email === customerEmail);
        }

        if (!orderExists) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID or email. Only verified customers can leave reviews.'
            });
        }

        // Check if review already exists for this order
        let reviewExists = false;
        if (db) {
            const [existing] = await db.execute(
                'SELECT * FROM reviews WHERE order_id = ?',
                [orderId]
            );
            reviewExists = existing.length > 0;
        } else {
            reviewExists = inMemoryReviews.some(r => r.orderId === orderId);
        }

        if (reviewExists) {
            return res.status(400).json({
                success: false,
                message: 'Review already exists for this order'
            });
        }

        const reviewData = {
            orderId,
            customerName,
            customerEmail,
            rating: parseInt(rating),
            comment: comment.trim(),
            approved: false, // Admin approval required
            createdAt: new Date().toISOString(),
            verifiedOrder: true
        };

        if (db) {
            await db.execute(`
                INSERT INTO reviews (order_id, customer_name, customer_email, rating, comment, approved, created_at, verified_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [orderId, customerName, customerEmail, rating, comment, false, new Date(), true]);
        } else {
            inMemoryReviews.push({
                id: Date.now(),
                ...reviewData
            });
            saveReviewsToFile(); // Save to file
        }

        res.json({
            success: true,
            message: 'Review submitted successfully! It will be visible after admin approval.'
        });
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Approve/Reject review (admin only)
app.put('/api/admin/reviews/:reviewId', async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { approved } = req.body;

        if (typeof approved !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'approved field must be boolean'
            });
        }

        if (db) {
            const [result] = await db.execute(
                'UPDATE reviews SET approved = ? WHERE id = ?',
                [approved, reviewId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found'
                });
            }
        } else {
            const reviewIndex = inMemoryReviews.findIndex(r => r.id == reviewId);
            if (reviewIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found'
                });
            }
            inMemoryReviews[reviewIndex].approved = approved;
        }

        res.json({
            success: true,
            message: `Review ${approved ? 'approved' : 'rejected'} successfully`
        });
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Update review content (admin only)
app.put('/api/admin/reviews/:reviewId/edit', async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { customerName, customerEmail, rating, comment, approved } = req.body;

        if (!customerName || !customerEmail || !rating || !comment) {
            return res.status(400).json({
                success: false,
                message: 'All fields except approved are required'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        if (db) {
            const [result] = await db.execute(`
                UPDATE reviews 
                SET customer_name = ?, customer_email = ?, rating = ?, comment = ?, approved = ?
                WHERE id = ?
            `, [customerName, customerEmail, rating, comment, approved, reviewId]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found'
                });
            }
        } else {
            const reviewIndex = inMemoryReviews.findIndex(r => r.id == reviewId);
            if (reviewIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found'
                });
            }
            
            inMemoryReviews[reviewIndex] = {
                ...inMemoryReviews[reviewIndex],
                customerName,
                customerEmail,
                rating: parseInt(rating),
                comment,
                approved: Boolean(approved)
            };
        }

        res.json({
            success: true,
            message: 'Review updated successfully'
        });
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Delete review (admin only)
app.delete('/api/admin/reviews/:reviewId', async (req, res) => {
    try {
        const { reviewId } = req.params;

        if (db) {
            const [result] = await db.execute(
                'DELETE FROM reviews WHERE id = ?',
                [reviewId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found'
                });
            }
        } else {
            const reviewIndex = inMemoryReviews.findIndex(r => r.id == reviewId);
            if (reviewIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found'
                });
            }
            inMemoryReviews.splice(reviewIndex, 1);
            saveReviewsToFile(); // Save to file
        }

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        database: db ? 'connected' : 'in-memory'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server
initDB().then(() => {
    // For Vercel serverless functions
    if (process.env.NODE_ENV === 'production') {
        module.exports = (req, res) => {
            app(req, res);
        };
    } else {
        // For local development
        app.listen(PORT, '0.0.0.0', () => {
            console.log('🚀 Server running on port', PORT);
            console.log('📡 API Base URL: http://localhost:' + PORT + '/api');
            console.log('🏥 Health Check: http://localhost:' + PORT + '/api/health');
        });
    }
}).catch(error => {
    console.error('Failed to initialize server:', error);
    process.exit(1);
});

module.exports = app;
