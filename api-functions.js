// API Functions - Separated from main api.js
// This file contains all API endpoint functions

// Solar Types API
async function getSolarTypes() {
    try {
        const response = await api.get('/solar-types');
        return response.data;
    } catch (error) {
        console.error('Error fetching solar types:', error);
        // Fallback solar types if API fails
        const fallbackSolarTypes = [
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
        return fallbackSolarTypes;
    }
}

// Bill Calculator API
async function calculateBill(monthlyBill, unitsPerMonth) {
    try {
        const response = await api.post('/calculate-bill', {
            monthlyBill: parseFloat(monthlyBill),
            unitsPerMonth: parseFloat(unitsPerMonth)
        });
        return response.data;
    } catch (error) {
        console.error('Error calculating bill:', error);
        // Fallback calculation
        const monthlySavings = monthlyBill * 0.8;
        const yearlySavings = monthlySavings * 12;
        const twentyYearSavings = yearlySavings * 20;
        const dailyUnits = unitsPerMonth / 30;
        const requiredCapacity = Math.ceil(dailyUnits / 5);
        
        return {
            monthlySavings: Math.round(monthlySavings),
            yearlySavings: Math.round(yearlySavings),
            twentyYearSavings: Math.round(twentyYearSavings),
            requiredCapacity
        };
    }
}

// Solar Calculator API
async function calculateSolar(roofArea, dailyUsage, sunlightHours) {
    try {
        const response = await api.post('/calculate-solar', {
            roofArea: parseFloat(roofArea),
            dailyUsage: parseFloat(dailyUsage),
            sunlightHours: parseFloat(sunlightHours)
        });
        return response.data;
    } catch (error) {
        console.error('Error calculating solar:', error);
        // Fallback calculation
        const panelsNeeded = Math.ceil(dailyUsage / (0.3 * sunlightHours));
        const totalCapacity = (panelsNeeded * 0.3).toFixed(2);
        const areaRequired = panelsNeeded * 20;
        const estimatedCost = panelsNeeded * 15000;
        
        return {
            panelsNeeded,
            totalCapacity,
            areaRequired,
            estimatedCost,
            roofAvailable: roofArea >= areaRequired
        };
    }
}

// Create Order API
async function createOrder(orderData) {
    try {
        const response = await api.post('/orders', orderData);
        return response.data;
    } catch (error) {
        console.error('Error creating order:', error);
        // Fallback to localStorage
        const orderId = 'ORD' + Date.now();
        const order = {
            ...orderData,
            orderId,
            id: Date.now(),
            orderDate: new Date().toLocaleDateString('hi-IN'),
            status: 'pending',
            paymentMethod: 'cod',
            createdAt: new Date().toISOString()
        };
        
        let orders = JSON.parse(localStorage.getItem('customerOrders')) || [];
        orders.push(order);
        localStorage.setItem('customerOrders', JSON.stringify(orders));
        
        return { orderId, id: order.id };
    }
}

// Update Order API
async function updateOrder(orderId, updateData) {
    try {
        const response = await api.put(`/orders/${orderId}`, updateData);
        return response.data;
    } catch (error) {
        console.error('Error updating order:', error);
        // Fallback to localStorage
        let orders = JSON.parse(localStorage.getItem('customerOrders')) || [];
        const orderIndex = orders.findIndex(order => order.orderId === orderId);
        
        if (orderIndex !== -1) {
            orders[orderIndex] = { ...orders[orderIndex], ...updateData };
            localStorage.setItem('customerOrders', JSON.stringify(orders));
        }
        
        return { success: true };
    }
}

// Get All Orders API (Admin)
async function getAllOrders() {
    try {
        const response = await api.get('/orders');
        return response.data;
    } catch (error) {
        console.error('Error fetching orders:', error);
        // Fallback to localStorage
        return JSON.parse(localStorage.getItem('customerOrders')) || [];
    }
}

// Delete Order API (Admin)
async function deleteOrder(orderId) {
    try {
        const response = await api.delete(`/orders/${orderId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting order:', error);
        // Fallback to localStorage
        let orders = JSON.parse(localStorage.getItem('customerOrders')) || [];
        orders = orders.filter(order => order.orderId !== orderId);
        localStorage.setItem('customerOrders', JSON.stringify(orders));
        
        return { success: true };
    }
}

// Admin Login API
async function adminLogin(username, password) {
    try {
        const response = await api.post('/admin/login', {
            username,
            password
        });
        return response;
    } catch (error) {
        console.error('Error during admin login:', error);
        // Fallback for development
        if (username === 'admin' && password === 'admin123') {
            return {
                success: true,
                data: {
                    token: 'dev-token',
                    admin: {
                        id: 1,
                        username: 'admin',
                        email: 'admin@brotherssolar.com'
                    }
                }
            };
        }
        throw error;
    }
}

// Get Statistics API (Admin)
async function getStatistics() {
    try {
        const response = await api.get('/statistics');
        return response.data;
    } catch (error) {
        console.error('Error fetching statistics:', error);
        // Fallback calculation from localStorage
        const orders = JSON.parse(localStorage.getItem('customerOrders')) || [];
        const totalOrders = orders.length;
        const confirmedOrders = orders.filter(order => order.status === 'confirmed').length;
        const pendingOrders = orders.filter(order => order.status === 'pending').length;
        const totalRevenue = orders
            .filter(order => ['confirmed', 'completed'].includes(order.status))
            .reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
        
        return {
            totalOrders,
            confirmedOrders,
            pendingOrders,
            totalRevenue
        };
    }
}

// Health Check API
async function healthCheck() {
    try {
        const response = await api.get('/health');
        return response.data;
    } catch (error) {
        console.error('Health check failed:', error);
        return {
            success: false,
            message: 'API server is not responding'
        };
    }
}

// Export all API functions
window.BrothersSolarAPI = {
    getSolarTypes,
    calculateBill,
    calculateSolar,
    createOrder,
    updateOrder,
    getAllOrders,
    deleteOrder,
    adminLogin,
    getStatistics,
    healthCheck
};
