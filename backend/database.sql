-- Brothers Solar Database Schema
-- Create database
CREATE DATABASE IF NOT EXISTS brothers_solar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE brothers_solar;

-- Customers table
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_id (order_id),
    INDEX idx_status (status),
    INDEX idx_order_date (order_date)
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username)
);

-- Insert default admin user (password: admin123)
INSERT INTO admin_users (username, password, email) 
VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@brotherssolar.com')
ON DUPLICATE KEY UPDATE username = username;

-- Solar types table (optional, for future use)
CREATE TABLE IF NOT EXISTS solar_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_hi VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_mr VARCHAR(255) NOT NULL,
    power VARCHAR(20) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description_hi TEXT,
    description_en TEXT,
    description_mr TEXT,
    efficiency VARCHAR(10) NOT NULL,
    warranty_hi VARCHAR(50),
    warranty_en VARCHAR(50),
    warranty_mr VARCHAR(50),
    icon VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default solar types
INSERT INTO solar_types (id, name_hi, name_en, name_mr, power, price, description_hi, description_en, description_mr, efficiency, warranty_hi, warranty_en, warranty_mr, icon) VALUES
(1, 'बेसिक सोलर पैनल', 'Basic Solar Panel', 'बेसिक सोलर पॅनेल', '300W', 15000.00, 'घरेलू उपयोग के लिए बेसिक सोलर पैनल', 'Basic solar panel for domestic use', 'घरगुती वापरासाठी बेसिक सोलर पॅनेल', '15%', '25 वर्ष', '25 years', '25 वर्षे', 'fa-solar-panel'),
(2, 'प्रीमियम सोलर पैनल', 'Premium Solar Panel', 'प्रीमियम सोलर पॅनेल', '400W', 25000.00, 'उच्च दक्षता वाला प्रीमियम सोलर पैनल', 'High efficiency premium solar panel', 'उच्च कार्यक्षमता असलेले प्रीमियम सोलर पॅनेल', '20%', '25 वर्ष', '25 years', '25 वर्षे', 'fa-sun'),
(3, 'कमर्शियल सोलर पैनल', 'Commercial Solar Panel', 'व्यावसायिक सोलर पॅनेल', '500W', 35000.00, 'व्यावसायिक उपयोग के लिए शक्तिशाली सोलर पैनल', 'Powerful solar panel for commercial use', 'व्यावसायिक वापरासाठी शक्तिशाली सोलर पॅनेल', '22%', '25 वर्ष', '25 years', '25 वर्षे', 'fa-industry'),
(4, 'हाइब्रिड सोलर सिस्टम', 'Hybrid Solar System', 'हायब्रिड सोलर सिस्टम', '600W', 45000.00, 'ग्रिड और ऑफ-ग्रिड दोनों के लिए हाइब्रिड सिस्टम', 'Hybrid system for both grid and off-grid', 'ग्रिड आणि ऑफ-ग्रिड दोन्हीसाठी हायब्रिड सिस्टम', '24%', '25 वर्ष', '25 years', '25 वर्षे', 'fa-battery-full')
ON DUPLICATE KEY UPDATE id = id;

-- Create view for order statistics
CREATE OR REPLACE VIEW order_statistics AS
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
    SUM(CASE WHEN status IN ('confirmed', 'completed') THEN total_amount ELSE 0 END) as total_revenue,
    AVG(total_amount) as average_order_value
FROM customers;

-- Sample data for testing (optional)
-- INSERT INTO customers (order_id, name, email, phone, address, solar_type, solar_type_id, quantity, price, total_amount, order_date, installation_date, status) VALUES
-- ('ORD1640995200000', 'टेस्ट ग्राहक', 'test@example.com', '9876543210', '123 टेस्ट स्ट्रीट, मुंबई', 'बेसिक सोलर पैनल', 1, 2, 15000.00, 30000.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 10 DAY), 'pending');
