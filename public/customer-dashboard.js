// Show message function
function showMessage(message, type) {
    try {
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        messageDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        messageDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    } catch (error) {
        console.error('Error showing message:', error);
        alert(message); // Fallback to alert
    }
}

// API Configuration
const API_BASE = 'http://localhost:3003/api';

// Customer Dashboard JavaScript
let currentUser = null;
let customerOrders = [];
let notifications = [];

function normalizeText(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim().toLowerCase();
}

function getUserEmailSafe(user) {
    if (!user) return '';
    return normalizeText(user.email || user.userEmail || user.customerEmail);
}

function getUserPhoneSafe(user) {
    if (!user) return '';
    return normalizeText(user.phone || user.mobile || user.customerPhone);
}

function getOrderEmailSafe(order) {
    if (!order) return '';
    return normalizeText(order.email || order.customerEmail || order.userEmail);
}

function getOrderPhoneSafe(order) {
    if (!order) return '';
    return normalizeText(order.phone || order.customerPhone || order.mobile);
}

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

function formatINRCurrency(value) {
    const num = parseNumberSafe(value);
    return `₹${num.toLocaleString('hi-IN')}`;
}

// Initialize customer dashboard
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('Customer dashboard loading...');
        
        // Check authentication
        currentUser = JSON.parse(localStorage.getItem('currentUser')) || 
                      JSON.parse(sessionStorage.getItem('currentUser'));
        
        console.log('Current user from localStorage:', JSON.parse(localStorage.getItem('currentUser')));
        console.log('Current user from sessionStorage:', JSON.parse(sessionStorage.getItem('currentUser')));
        console.log('Final currentUser:', currentUser);
        console.log('CurrentUser properties:', {
            firstName: currentUser?.firstName,
            lastName: currentUser?.lastName,
            name: currentUser?.name,
            email: currentUser?.email,
            phone: currentUser?.phone,
            id: currentUser?.id,
            token: currentUser?.token
        });
        
        if (!currentUser || !currentUser.token) {
            console.log('No user found, redirecting to login');
            window.location.href = 'login.html';
            return;
        }
        
        // Initialize dashboard
        initializeDashboard();
        loadCustomerOrders(false);
        setupEventListeners();
        
        // Start auto-refresh with better error handling
        startAutoRefresh();
        
        // Start admin sync
        syncWithAdminChanges();

        // Auto-refresh when admin updates localStorage in another tab/window
        window.addEventListener('storage', (e) => {
            try {
                if (e && e.key === 'customerOrders') {
                    console.log('Detected customerOrders change in localStorage; refreshing dashboard');
                    loadCustomerOrders(true).then(() => {
                        updateDashboard();
                        showLastUpdateTime();
                    });
                }
            } catch (err) {
                console.error('Error handling storage event:', err);
            }
        });

        // Listen for real-time notifications from admin
        window.addEventListener('customerNotification', (e) => {
            try {
                const notification = e.detail;
                console.log('Received real-time notification:', notification);
                
                // Show notification to customer
                showNotificationToUser(notification);
                
                // Refresh orders to get latest status
                loadCustomerOrders(true).then(() => {
                    updateDashboard();
                    renderOrdersTable();
                });
                
            } catch (err) {
                console.error('Error handling customer notification:', err);
            }
        });

        // Listen for storage events (cross-tab sync)
        window.addEventListener('storage', (e) => {
            try {
                if (e && e.key === 'customerNotifications') {
                    console.log('New notifications detected, refreshing...');
                    loadNotifications();
                }
            } catch (err) {
                console.error('Error handling notification storage event:', err);
            }
        });

        // Refresh when user comes back to this tab (common case: admin edit in same browser)
        window.addEventListener('focus', () => {
            console.log('Tab focused, refreshing orders...');
            loadCustomerOrders(true).then(() => {
                updateDashboard();
                showLastUpdateTime();
            });
        });
        
        // Load notifications on page load
        loadNotifications();
        
        // Show initial update time
        showLastUpdateTime();
        
        console.log('Customer dashboard initialized successfully');
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        document.body.innerHTML = `
            <div class="container mt-5">
                <div class="alert alert-danger">
                    <h4>Error Loading Dashboard</h4>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">Reload Page</button>
                </div>
            </div>
        `;
    }
});

// Initialize dashboard with user data
function initializeDashboard() {
    try {
        console.log('Initializing dashboard for user:', currentUser);
        
        // Check if currentUser exists
        if (!currentUser) {
            console.error('No current user found in initializeDashboard');
            return;
        }
        
        // Update customer info with null checks
        const customerNameElement = document.getElementById('customerName');
        const customerEmailElement = document.getElementById('customerEmail');
        
        console.log('Updating user display with registered user:', currentUser);
        
        if (customerNameElement) {
            customerNameElement.textContent = currentUser.name || 'Customer';
        }
        if (customerEmailElement) {
            customerEmailElement.textContent = currentUser.email || 'No email';
        }
        
        // Load real orders immediately with force refresh
        console.log('Loading real orders for dashboard initialization...');
        loadCustomerOrders(false).then(() => {
            console.log('Orders loaded, updating dashboard...');
            updateDashboard();
            renderOrdersTable();
            
            // If still no orders, check localStorage directly
            if (customerOrders.length === 0) {
                console.log('No orders from API, checking localStorage directly...');
                checkLocalStorageDirectly();
            }
        }).catch(error => {
            console.error('Error loading orders during initialization:', error);
            // Fallback to direct localStorage check
            checkLocalStorageDirectly();
        });
        
    } catch (error) {
        console.error('Error in initializeDashboard:', error);
        showMessage('Error initializing dashboard', 'error');
    }
}

// Direct localStorage check
function checkLocalStorageDirectly() {
    try {
        console.log('=== Direct localStorage Check ===');
        const storedOrders = localStorage.getItem('customerOrders');
        console.log('Raw localStorage data:', storedOrders);
        
        if (storedOrders) {
            const allOrders = JSON.parse(storedOrders);
            console.log('Parsed orders:', allOrders);
            console.log('Current user email:', currentUser?.email);
            
            // Filter for current user
            const userOrders = allOrders.filter(order => {
                const match = order.email === currentUser.email;
                console.log(`Order email: ${order.email}, User email: ${currentUser.email}, Match: ${match}`);
                return match;
            });
            
            console.log('Filtered user orders:', userOrders);
            
            if (userOrders.length > 0) {
                customerOrders = userOrders;
                updateDashboard();
                renderOrdersTable();
                showMessage(`Found ${userOrders.length} orders in localStorage`, 'success');
            } else {
                showMessage('No orders found for your account. Place an order first.', 'info');
                // Show empty state
                showEmptyOrdersState();
            }
        } else {
            showMessage('No orders in system. Place an order first.', 'info');
            showEmptyOrdersState();
        }
        
    } catch (error) {
        console.error('Error in direct localStorage check:', error);
        showMessage('Error loading orders', 'error');
    }
}

// Show empty orders state
function showEmptyOrdersState() {
    const tableBody = document.getElementById('ordersTable');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4">
                    <div class="text-muted">
                        <i class="fas fa-shopping-cart fa-3x mb-3"></i>
                        <h5>No Orders Found</h5>
                        <p>You haven't placed any orders yet.</p>
                        <a href="index.html" class="btn btn-primary">
                            <i class="fas fa-plus me-2"></i>Place Your First Order
                        </a>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Load and display real customer data
function loadRealCustomerData() {
    console.log('Loading real customer data...');
    
    // Check if user has real orders
    const storedOrders = localStorage.getItem('customerOrders');
    if (storedOrders) {
        const allOrders = JSON.parse(storedOrders);
        console.log('Total orders in system:', allOrders.length);
        
        // Filter for current user's orders
        const userOrders = allOrders.filter(order => {
            return order.email === currentUser.email;
        });
        
        console.log('Orders for current user:', userOrders.length);
        
        if (userOrders.length > 0) {
            customerOrders = userOrders;
            updateDashboard();
            renderOrdersTable();
            showMessage(`Loaded ${userOrders.length} orders`, 'success');
        } else {
            showMessage('No orders found. Place an order to see them here.', 'info');
        }
    } else {
        showMessage('No orders in system. Place an order first.', 'info');
    }
}

// Make function globally accessible
window.loadRealCustomerData = loadRealCustomerData;

// Show notification to user
function showNotificationToUser(notification) {
    try {
        console.log('Showing notification to user:', notification);
        
        // Create notification element
        const notificationDiv = document.createElement('div');
        notificationDiv.className = `alert alert-${getNotificationType(notification.action)} alert-dismissible fade show position-fixed`;
        notificationDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 350px; max-width: 500px;';
        
        notificationDiv.innerHTML = `
            <div class="d-flex align-items-start">
                <div class="flex-grow-1">
                    <strong>🔔 Order Update!</strong>
                    <div class="mt-1">${notification.message}</div>
                    <small class="text-muted d-block mt-2">
                        Order ID: ${notification.orderId} • 
                        ${new Date(notification.timestamp).toLocaleString('hi-IN')}
                    </small>
                </div>
                <button type="button" class="btn-close ms-2" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notificationDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notificationDiv.parentNode) {
                notificationDiv.remove();
            }
        }, 10000);
        
        // Play notification sound (optional)
        playNotificationSound();
        
        console.log('Notification displayed successfully');
        
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

// Get notification type based on action
function getNotificationType(action) {
    switch (action) {
        case 'confirmed':
            return 'success';
        case 'shipped':
            return 'info';
        case 'delivered':
            return 'success';
        case 'cancelled':
            return 'danger';
        case 'status_updated':
            return 'warning';
        default:
            return 'info';
    }
}

// Play notification sound (optional)
function playNotificationSound() {
    try {
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        
    } catch (error) {
        console.log('Could not play notification sound:', error);
    }
}

// Load and display notifications
function loadNotifications() {
    try {
        const notifications = JSON.parse(localStorage.getItem('customerNotifications') || '[]');
        const container = document.getElementById('notificationsContainer');
        
        if (!container) return;
        
        // Filter notifications for current user
        const userNotifications = notifications.filter(n => 
            n.customerEmail === currentUser?.email && !n.read
        );
        
        if (userNotifications.length === 0) {
            container.innerHTML = '<p class="text-muted">No new notifications</p>';
            return;
        }
        
        container.innerHTML = userNotifications.map(notification => `
            <div class="alert alert-${getNotificationType(notification.action)} alert-dismissible fade show mb-2">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>${notification.message}</strong>
                        <div class="small text-muted mt-1">
                            ${new Date(notification.timestamp).toLocaleString('hi-IN')}
                        </div>
                    </div>
                    <button class="btn-close btn-sm" onclick="markNotificationRead('${notification.id}')"></button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Mark notification as read
function markNotificationRead(notificationId) {
    try {
        let notifications = JSON.parse(localStorage.getItem('customerNotifications') || '[]');
        const notificationIndex = notifications.findIndex(n => n.id == notificationId);
        
        if (notificationIndex !== -1) {
            notifications[notificationIndex].read = true;
            localStorage.setItem('customerNotifications', JSON.stringify(notifications));
            loadNotifications();
        }
        
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Make notification functions globally accessible
window.showNotificationToUser = showNotificationToUser;
window.loadNotifications = loadNotifications;
window.markNotificationRead = markNotificationRead;

// Additional functions for new dashboard design
function showProfile() {
    showMessage('Profile feature coming soon!', 'info');
}

function showSupport() {
    showMessage('Support feature coming soon!', 'info');
}

// NEW: View Admin Dashboard (for customers)
function viewAdminDashboard() {
    console.log('Viewing admin dashboard from customer perspective');
    
    // Check if user has admin privileges (for demo, allow all users)
    if (!currentUser) {
        showMessage('Please login to view admin dashboard', 'error');
        return;
    }
    
    // Create admin view modal
    const adminViewModal = document.createElement('div');
    adminViewModal.className = 'modal fade';
    adminViewModal.innerHTML = `
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header bg-dark text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-shield-alt me-2"></i>Admin Dashboard View
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card bg-primary text-white">
                                <div class="card-body text-center">
                                    <h4 id="adminTotalOrders">0</h4>
                                    <p class="mb-0">Total Orders</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-success text-white">
                                <div class="card-body text-center">
                                    <h4 id="adminCompletedOrders">0</h4>
                                    <p class="mb-0">Completed</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-warning text-white">
                                <div class="card-body text-center">
                                    <h4 id="adminPendingOrders">0</h4>
                                    <p class="mb-0">Pending</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-info text-white">
                                <div class="card-body text-center">
                                    <h4 id="adminTotalUsers">0</h4>
                                    <p class="mb-0">Total Users</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-12">
                            <h6><i class="fas fa-list me-2"></i>All Orders Overview</h6>
                            <div class="table-responsive">
                                <table class="table table-striped table-hover">
                                    <thead class="table-dark">
                                        <tr>
                                            <th>Order ID</th>
                                            <th>Customer</th>
                                            <th>Product</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="adminOrdersTable">
                                        <tr>
                                            <td colspan="8" class="text-center">
                                                <i class="fas fa-spinner fa-spin me-2"></i>
                                                Loading admin data...
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-12">
                            <h6><i class="fas fa-users me-2"></i>Customer Overview</h6>
                            <div class="table-responsive">
                                <table class="table table-striped table-hover">
                                    <thead class="table-dark">
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Phone</th>
                                            <th>Orders</th>
                                            <th>Status</th>
                                            <th>Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody id="adminUsersTable">
                                        <tr>
                                            <td colspan="7" class="text-center">
                                                <i class="fas fa-spinner fa-spin me-2"></i>
                                                Loading users data...
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" onclick="refreshAdminView()">Refresh Data</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(adminViewModal);
    
    // Show modal
    const modal = new bootstrap.Modal(adminViewModal);
    modal.show();
    
    // Load admin data
    loadAdminData();
    
    // Remove modal from DOM after hidden
    adminViewModal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(adminViewModal);
    });
    
    console.log('Admin view modal shown for customer:', currentUser.email);
}

// Load admin data for customer view
function loadAdminData() {
    try {
        console.log('Loading admin data for customer view');
        
        // Get all orders
        const allOrders = JSON.parse(localStorage.getItem('customerOrders')) || [];
        const allUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
        
        console.log('Found orders:', allOrders.length);
        console.log('Found users:', allUsers.length);
        
        // Update admin statistics
        updateAdminStatistics(allOrders, allUsers);
        
        // Render admin orders table
        renderAdminOrdersTable(allOrders);
        
        // Render admin users table
        renderAdminUsersTable(allUsers);
        
    } catch (error) {
        console.error('Error loading admin data:', error);
        showMessage('Error loading admin data', 'error');
    }
}

// Update admin statistics
function updateAdminStatistics(orders, users) {
    try {
        const totalOrders = orders.length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const totalUsers = users.length;
        
        // Update DOM elements
        const totalOrdersElement = document.getElementById('adminTotalOrders');
        const completedOrdersElement = document.getElementById('adminCompletedOrders');
        const pendingOrdersElement = document.getElementById('adminPendingOrders');
        const totalUsersElement = document.getElementById('adminTotalUsers');
        
        if (totalOrdersElement) totalOrdersElement.textContent = totalOrders;
        if (completedOrdersElement) completedOrdersElement.textContent = completedOrders;
        if (pendingOrdersElement) pendingOrdersElement.textContent = pendingOrders;
        if (totalUsersElement) totalUsersElement.textContent = totalUsers;
        
        console.log('Admin statistics updated:', { totalOrders, completedOrders, pendingOrders, totalUsers });
        
    } catch (error) {
        console.error('Error updating admin statistics:', error);
    }
}

// Render admin orders table
function renderAdminOrdersTable(orders) {
    try {
        const tableBody = document.getElementById('adminOrdersTable');
        if (!tableBody) return;
        
        if (orders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">
                        <i class="fas fa-inbox fa-2x mb-2"></i>
                        <p>No orders found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = orders.map(order => `
            <tr>
                <td><strong>${order.orderId || 'N/A'}</strong></td>
                <td>${order.name || 'N/A'}</td>
                <td>${order.solarType || 'N/A'}</td>
                <td>${formatINRCurrency(getOrderTotalAmountValue(order))}</td>
                <td>
                    <span class="badge ${getStatusBadgeClass(order.status)}">
                        ${getStatusText(order.status)}
                    </span>
                </td>
                <td>${order.orderDate || new Date(order.createdAt).toLocaleDateString('hi-IN')}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewOrderDetails('${order.orderId}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error rendering admin orders table:', error);
    }
}

// Render admin users table
function renderAdminUsersTable(users) {
    try {
        const tableBody = document.getElementById('adminUsersTable');
        if (!tableBody) return;
        
        if (users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        <i class="fas fa-users fa-2x mb-2"></i>
                        <p>No users found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = users.map(user => {
            const userOrders = JSON.parse(localStorage.getItem('customerOrders')) || [];
            const orderCount = userOrders.filter(o => o.email === user.email).length;
            
            return `
                <tr>
                    <td>${user.firstName || 'N/A'} ${user.lastName || ''}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${user.phone || 'N/A'}</td>
                    <td>
                        <span class="badge bg-primary">${orderCount}</span>
                    </td>
                    <td>
                        <span class="badge bg-success">Active</span>
                    </td>
                    <td>${new Date(user.createdAt || Date.now()).toLocaleDateString('hi-IN')}</td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error rendering admin users table:', error);
    }
}

// Refresh admin view
function refreshAdminView() {
    console.log('Refreshing admin view');
    loadAdminData();
    showMessage('Admin data refreshed', 'success');
}

// Load customer orders
async function loadCustomerOrders(silent = false) {
    try {
        console.log('=== Loading orders for user ===');
        console.log('Current user:', currentUser);
        
        // Check if currentUser exists
        if (!currentUser) {
            console.error('No current user found');
            showMessage('Please login again', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        // Try to load from API first
        try {
            console.log('Trying to load orders from API...');
            const response = await fetch(`${API_BASE}/orders`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    console.log('Orders loaded from API:', result.data);
                    
                    // Filter orders for current user
                    const userEmail = getUserEmailSafe(currentUser);
                    const userPhone = getUserPhoneSafe(currentUser);
                    
                    customerOrders = result.data.filter(order => {
                        if (!order || typeof order !== 'object') return false;
                        
                        // Match by email or phone
                        return (order.email && userEmail && order.email.toLowerCase() === userEmail.toLowerCase()) ||
                               (order.phone && userPhone && order.phone === userPhone);
                    });
                    
                    console.log('Filtered API orders for user:', customerOrders);
                    updateDashboard();
                    renderOrdersTable();
                    if (!silent) {
                        showMessage(`Loaded ${customerOrders.length} order(s) successfully`, 'success');
                    }
                    return;
                }
            }
        } catch (apiError) {
            console.log('API failed, using localStorage:', apiError);
        }
        
        // Fallback to localStorage
        console.log('Using localStorage fallback');
        let allOrders = [];
        try {
            const storedOrders = localStorage.getItem('customerOrders');
            if (storedOrders) {
                allOrders = JSON.parse(storedOrders);
                console.log('All orders from localStorage:', allOrders);
            }
        } catch (parseError) {
            console.error('Error parsing orders from localStorage:', parseError);
            allOrders = [];
        }
        
        // Ensure allOrders is an array
        if (!Array.isArray(allOrders)) {
            console.log('allOrders is not an array, converting to array');
            allOrders = allOrders ? [allOrders] : [];
        }
        
        console.log('Current user ID:', currentUser.id);
        console.log('Current user email:', currentUser.email);
        console.log('Current user phone:', currentUser.phone);
        
        const userEmail = getUserEmailSafe(currentUser);
        const userPhone = getUserPhoneSafe(currentUser);

        // Filter orders for current user with safety checks
        customerOrders = allOrders.filter(order => {
            if (!order || typeof order !== 'object') {
                return false;
            }

            console.log('Checking order:', order);

            // Match by userId first
            if (order.userId && currentUser.id && order.userId === currentUser.id) {
                console.log('Matched by userId:', order.userId);
                return true;
            }

            // Fallback to email match (phone can be missing / inconsistent)
            const orderEmail = getOrderEmailSafe(order);
            if (orderEmail && userEmail && orderEmail === userEmail) {
                console.log('Matched by email:', orderEmail);
                return true;
            }

            // Extra fallback: email missing but phone matches
            const orderPhone = getOrderPhoneSafe(order);
            if (!orderEmail && orderPhone && userPhone && orderPhone === userPhone) {
                console.log('Matched by phone:', orderPhone);
                return true;
            }

            return false;
        });
        
        // NO DEMO ORDERS - Only real registered user orders
        console.log('=== Final filtered orders for current user ===');
        console.log('Customer orders count:', customerOrders.length);
        console.log('Customer orders:', customerOrders);

        updateDashboard();
        renderOrdersTable();
        if (!silent) {
            showMessage(`Loaded ${customerOrders.length} order(s) successfully`, 'success');
        }
        
    } catch (error) {
        console.error('Error loading customer orders:', error);
        if (!silent) {
            showMessage('Error loading orders', 'error');
        }
    }
}

// Update dashboard statistics
function updateDashboard() {
    try {
        // Check if customerOrders is defined and is an array
        if (!customerOrders || !Array.isArray(customerOrders)) {
            console.log('customerOrders is not a valid array, setting to empty array');
            customerOrders = [];
        }
        
        const totalOrders = customerOrders.length;
        const completedOrders = customerOrders.filter(order => order && order.status === 'completed').length;
        const pendingOrders = customerOrders.filter(order => order && order.status === 'pending').length;
        const confirmedOrders = customerOrders.filter(order => order && order.status === 'confirmed').length;

        // Manual refresh function
        function refreshOrders() {
            console.log('Manual refresh triggered');
            loadCustomerOrders(false).then(() => {
                updateDashboard();
                showLastUpdateTime();
                showMessage('Orders refreshed successfully', 'success');
            }).catch(error => {
                console.error('Error refreshing orders:', error);
                showMessage('Error refreshing orders', 'error');
            });
        }

        // Make refreshOrders globally accessible
        window.refreshOrders = refreshOrders;

        const totalPending = pendingOrders + confirmedOrders; // Total pending including confirmed
        const totalSavings = customerOrders
            .filter(order => order && order.status === 'completed')
            .reduce((total, order) => total + (getOrderTotalAmountValue(order) * 0.1), 0); // 10% savings estimate
    
    // Update statistics
    const totalOrdersElement = document.getElementById('totalOrders');
    const completedOrdersElement = document.getElementById('completedOrders');
    const pendingOrdersElement = document.getElementById('pendingOrders');
    const totalSavingsElement = document.getElementById('totalSavings');
    
    if (totalOrdersElement) totalOrdersElement.textContent = totalOrders;
    if (completedOrdersElement) completedOrdersElement.textContent = completedOrders;
    if (pendingOrdersElement) pendingOrdersElement.textContent = totalPending;
    if (totalSavingsElement) totalSavingsElement.textContent = `₹${totalSavings.toLocaleString('hi-IN')}`;
    
    // Update welcome message with order count
    const welcomeOrderCount = document.getElementById('welcomeOrderCount');
    if (welcomeOrderCount) {
        welcomeOrderCount.textContent = `You have ${totalOrders} order(s): ${completedOrders} completed, ${totalPending} pending.`;
    }
    
    console.log('Dashboard updated with stats:', {
        totalOrders, completedOrders, pendingOrders, confirmedOrders, totalPending, totalSavings
    });
    
    } catch (error) {
        console.error('Error in updateDashboard:', error);
    }
}

// Manual refresh function
function refreshOrders() {
    console.log('Manual refresh triggered');
    
    // First try direct localStorage check
    checkLocalStorageDirectly();
    
    // Then try API refresh
    loadCustomerOrders(false).then(() => {
        updateDashboard();
        showLastUpdateTime();
        showMessage('Orders refreshed successfully', 'success');
    }).catch(error => {
        console.error('Error refreshing orders:', error);
        showMessage('Error refreshing orders', 'error');
    });
}

// Make refreshOrders globally accessible
window.refreshOrders = refreshOrders;

// Debug function to check customer dashboard state
function debugCustomerDashboard() {
    console.log('=== Customer Dashboard Debug ===');
    console.log('Current user:', currentUser);
    console.log('Customer orders:', customerOrders);
    console.log('LocalStorage customerOrders:', localStorage.getItem('customerOrders'));
    
    // Check if elements exist
    const elements = {
        totalOrders: document.getElementById('totalOrders'),
        completedOrders: document.getElementById('completedOrders'),
        pendingOrders: document.getElementById('pendingOrders'),
        ordersTable: document.getElementById('ordersTable')
    };
    
    console.log('DOM Elements:', elements);
    
    // Force refresh
    loadCustomerOrders(false);
}

// Make debug function globally accessible
window.debugCustomerDashboard = debugCustomerDashboard;

// Quick debug - check what's in localStorage
function quickDebug() {
    console.log('=== QUICK DEBUG ===');
    console.log('Current user:', currentUser);
    console.log('User email:', currentUser?.email);
    
    const stored = localStorage.getItem('customerOrders');
    console.log('localStorage exists:', !!stored);
    
    if (stored) {
        const orders = JSON.parse(stored);
        console.log('Total orders in localStorage:', orders.length);
        
        const userOrders = orders.filter(o => o.email === currentUser?.email);
        console.log('Orders for current user:', userOrders.length);
        
        if (userOrders.length > 0) {
            console.log('First user order:', userOrders[0]);
        }
    }
    
    // Check table element
    const table = document.getElementById('ordersTable');
    console.log('Table element exists:', !!table);
    
    return {
        user: currentUser,
        totalOrders: stored ? JSON.parse(stored).length : 0,
        userOrders: stored ? JSON.parse(stored).filter(o => o.email === currentUser?.email).length : 0,
        tableExists: !!table
    };
}

// Make quick debug globally accessible
window.quickDebug = quickDebug;

// Real orders check function
function checkRealOrders() {
    console.log('=== Checking Real Orders ===');
    console.log('Current user:', currentUser);
    
    // Check localStorage for real orders
    const storedOrders = localStorage.getItem('customerOrders');
    if (storedOrders) {
        const orders = JSON.parse(storedOrders);
        console.log('Total orders in localStorage:', orders.length);
        
        // Filter orders for current user
        const userOrders = orders.filter(order => {
            const userEmail = currentUser?.email?.toLowerCase();
            const orderEmail = order?.email?.toLowerCase();
            return userEmail && orderEmail && userEmail === orderEmail;
        });
        
        console.log('Orders for current user:', userOrders.length);
        console.log('User orders:', userOrders);
        
        // Update dashboard with real data
        customerOrders = userOrders;
        updateDashboard();
        renderOrdersTable();
        
        showMessage(`Found ${userOrders.length} real orders for ${currentUser?.name}`, 'info');
    } else {
        console.log('No orders found in localStorage');
        showMessage('No orders found. Please place an order first.', 'info');
    }
}

// Make check function globally accessible
window.checkRealOrders = checkRealOrders;

// Render orders table
function renderOrdersTable() {
    try {
        console.log('=== renderOrdersTable START ===');
        console.log('customerOrders:', customerOrders);
        console.log('customerOrders type:', typeof customerOrders);
        console.log('customerOrders isArray:', Array.isArray(customerOrders));
        
        const tableBody = document.getElementById('ordersTable');
        
        // Check if tableBody exists
        if (!tableBody) {
            console.error('ordersTable element not found');
            return;
        }
        
        // Check if customerOrders is defined and is an array
        if (!customerOrders || !Array.isArray(customerOrders)) {
            console.log('customerOrders is not a valid array, setting to empty array');
            customerOrders = [];
        }
        
        console.log('Final customerOrders:', customerOrders);
        console.log('customerOrders.length:', customerOrders.length);
        
        if (customerOrders.length === 0) {
            console.log('No real orders found for registered user, showing empty message');
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted">
                        <i class="fas fa-shopping-cart fa-2x mb-2"></i>
                        <p>No solar panel orders found yet.</p>
                        <p><small>Place your first solar panel order to see it here!</small></p>
                        <a href="index.html#solar-order" class="btn btn-primary btn-sm mt-2">
                            <i class="fas fa-plus me-1"></i>Place Order
                        </a>
                    </td>
                </tr>
            `;
            return;
        }
        
        console.log('Rendering orders table with', customerOrders.length, 'orders');
        
        tableBody.innerHTML = customerOrders.map(order => {
            console.log('Rendering order:', order);
            return `
                <tr>
                    <td><strong>${order.orderId || 'N/A'}</strong></td>
                    <td>${order.solarType || 'N/A'}</td>
                    <td>${order.quantity || 1}</td>
                    <td>${formatINRCurrency(getOrderTotalAmountValue(order))}</td>
                    <td>${order.orderDate || new Date(order.createdAt).toLocaleDateString('hi-IN')}</td>
                    <td>${order.installationDate || 'Not Scheduled'}</td>
                    <td>
                        <span class="badge ${getStatusBadgeClass(order.status)}">
                            ${getStatusText(order.status)}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${getPaymentBadgeClass(order.paymentStatus)}">
                            ${getPaymentText(order.paymentStatus)}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="trackOrder('${order.orderId}')" title="Track Order">
                            <i class="fas fa-truck"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="viewOrderDetails('${order.orderId}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${order.status === 'completed' ? `
                            <button class="btn btn-sm btn-warning" onclick="openReviewModal('${order.orderId}')" title="Add Review">
                                <i class="fas fa-star"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
        
        console.log('=== renderOrdersTable END ===');
        
    } catch (error) {
        console.error('Error in renderOrdersTable:', error);
        showMessage('Error rendering orders: ' + error.message, 'error');
        
        // Show error state in table
        const tableBody = document.getElementById('ordersTable');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                        <p>Error rendering orders: ${error.message}</p>
                        <button class="btn btn-sm btn-primary" onclick="loadCustomerOrders()">Retry</button>
                    </td>
                </tr>
            `;
        }
    }
}

// Get status badge class
function getStatusBadgeClass(status) {
    switch (status) {
        case 'completed': return 'bg-success';
        case 'confirmed': return 'bg-info';
        case 'pending': return 'bg-warning';
        case 'cancelled': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// Get status text
function getStatusText(status) {
    switch (status) {
        case 'completed': return 'Completed';
        case 'confirmed': return 'Confirmed';
        case 'pending': return 'Pending';
        case 'cancelled': return 'Cancelled';
        default: return 'Unknown';
    }
}

// Get payment badge class
function getPaymentBadgeClass(paymentStatus) {
    switch (paymentStatus) {
        case 'completed': return 'bg-success';
        case 'pending': return 'bg-warning';
        case 'failed': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// Get payment text
function getPaymentText(paymentStatus) {
    switch (paymentStatus) {
        case 'completed': return 'Paid';
        case 'pending': return 'Pending';
        case 'failed': return 'Failed';
        default: return 'Unknown';
    }
}

function ensureTrackingStyles() {
    if (document.getElementById('trackingStyles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'trackingStyles';
    style.textContent = `
        .tracking-summary-card{border:1px solid #e9ecef;border-radius:14px;background:#fff}
        .tracking-summary-row{display:flex;gap:14px;flex-wrap:wrap}
        .tracking-summary-item{flex:1;min-width:170px;padding:12px 14px;border-radius:12px;background:#f8f9fa;border:1px solid #eef1f4}
        .tracking-summary-label{font-size:.78rem;color:#6c757d;margin-bottom:4px}
        .tracking-summary-value{font-weight:700;color:#212529}
        .tracking-progress{height:10px;border-radius:999px;background:#e9ecef;overflow:hidden}
        .tracking-progress .bar{height:100%;border-radius:999px;background:linear-gradient(90deg,#0d6efd,#20c997)}
        .tracking-timeline{margin-top:10px}
        .tracking-step{display:grid;grid-template-columns:28px 1fr;gap:12px;padding:10px 0}
        .tracking-dot{width:28px;height:28px;border-radius:999px;display:flex;align-items:center;justify-content:center;border:1px solid #dee2e6;background:#fff}
        .tracking-step.completed .tracking-dot{border-color:rgba(25,135,84,.35);background:rgba(25,135,84,.08)}
        .tracking-step.active .tracking-dot{border-color:rgba(13,110,253,.35);background:rgba(13,110,253,.08)}
        .tracking-step.pending .tracking-dot{border-color:#dee2e6;background:#fff}
        .tracking-line{position:relative}
        .tracking-line:before{content:'';position:absolute;left:13px;top:-10px;bottom:-10px;width:2px;background:#e9ecef}
        .tracking-step:last-child .tracking-line:before{bottom:50%}
        .tracking-step:first-child .tracking-line:before{top:50%}
        .tracking-step .tracking-content h6{margin:0;font-weight:700}
        .tracking-step .tracking-content small{color:#6c757d}
        .tracking-badge{font-weight:700}
        .tracking-modal-header{background:linear-gradient(135deg,#111827,#334155);color:#fff;border-bottom:none}
        .tracking-modal-header .badge{font-weight:700}
    `;
    document.head.appendChild(style);
}

function getTrackingSteps(order) {
    const statusRank = {
        pending: 1,
        confirmed: 2,
        completed: 5,
        cancelled: 0
    };
    const rank = statusRank[order.status] ?? 1;
    const paid = order.paymentStatus === 'completed';

    const steps = [
        {
            key: 'placed',
            title: 'Order Placed',
            date: order.createdAt || order.orderDate,
            icon: 'fa-receipt',
            done: true
        },
        {
            key: 'confirmed',
            title: 'Order Confirmed',
            date: order.orderDate,
            icon: 'fa-circle-check',
            done: rank >= 2
        },
        {
            key: 'payment',
            title: 'Payment Verified',
            date: order.paymentCompletedAt,
            icon: 'fa-credit-card',
            done: paid
        },
        {
            key: 'scheduled',
            title: 'Installation Scheduled',
            date: order.installationDate,
            icon: 'fa-calendar-check',
            done: rank >= 2 && !!order.installationDate
        },
        {
            key: 'completed',
            title: 'Completed',
            date: order.completedAt,
            icon: 'fa-flag-checkered',
            done: order.status === 'completed'
        }
    ];

    return steps;
}

function getTrackingProgressPercent(order) {
    if (!order) return 0;
    if (order.status === 'cancelled') return 0;
    const steps = getTrackingSteps(order);
    const doneCount = steps.filter(s => s.done).length;
    return Math.round((doneCount / steps.length) * 100);
}

function formatTrackingDate(value) {
    if (!value) return 'Pending';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Pending';
    return d.toLocaleString('hi-IN');
}

function getLatestOrderFromStorage(orderId) {
    let allOrders = [];
    try {
        const stored = localStorage.getItem('customerOrders');
        if (stored) {
            allOrders = JSON.parse(stored);
        }
    } catch (e) {
        allOrders = [];
    }
    if (!Array.isArray(allOrders)) {
        allOrders = allOrders ? [allOrders] : [];
    }

    const order = allOrders.find(o => o && o.orderId === orderId);
    if (!order) return null;

    // Ensure customer can only see their own order
    if (currentUser) {
        const matchesUserId = order.userId && currentUser.id && order.userId === currentUser.id;
        const userEmail = getUserEmailSafe(currentUser);
        const userPhone = getUserPhoneSafe(currentUser);
        const orderEmail = getOrderEmailSafe(order);
        const orderPhone = getOrderPhoneSafe(order);
        const matchesEmail = orderEmail && userEmail && orderEmail === userEmail;
        const matchesPhone = !orderEmail && orderPhone && userPhone && orderPhone === userPhone;

        if (!matchesUserId && !matchesEmail && !matchesPhone) {
            return null;
        }
    }

    return order;
}

function renderTrackingModal(trackingModalEl, orderId) {
    const order = getLatestOrderFromStorage(orderId);
    if (!order) {
        const body = trackingModalEl.querySelector('[data-role="tracking-body"]');
        if (body) {
            body.innerHTML = `
                <div class="alert alert-warning mb-0">
                    <div class="d-flex align-items-center gap-2">
                        <i class="fas fa-triangle-exclamation"></i>
                        <div>
                            <div class="fw-bold">Order not available</div>
                            <div class="small text-muted">It may have been removed or no longer belongs to this account.</div>
                        </div>
                    </div>
                </div>
            `;
        }
        return;
    }

    ensureTrackingStyles();

    const progress = getTrackingProgressPercent(order);
    const steps = getTrackingSteps(order);

    const statusText = getStatusText(order.status);
    const statusClass = getStatusBadgeClass(order.status);
    const payText = getPaymentText(order.paymentStatus);
    const payClass = getPaymentBadgeClass(order.paymentStatus);

    const statusBadge = trackingModalEl.querySelector('[data-role="tracking-status"]');
    const payBadge = trackingModalEl.querySelector('[data-role="tracking-payment"]');
    const solarType = trackingModalEl.querySelector('[data-role="tracking-solar-type"]');
    const qty = trackingModalEl.querySelector('[data-role="tracking-quantity"]');
    const amount = trackingModalEl.querySelector('[data-role="tracking-amount"]');
    const progressPct = trackingModalEl.querySelector('[data-role="tracking-progress-pct"]');
    const progressBar = trackingModalEl.querySelector('[data-role="tracking-progress-bar"]');
    const timelineEl = trackingModalEl.querySelector('[data-role="tracking-timeline"]');

    if (statusBadge) {
        statusBadge.className = `badge ${statusClass} tracking-badge`;
        statusBadge.textContent = statusText;
    }
    if (payBadge) {
        payBadge.className = `badge ${payClass} tracking-badge`;
        payBadge.textContent = payText;
    }
    if (solarType) solarType.textContent = order.solarType || 'N/A';
    if (qty) qty.textContent = String(order.quantity || 1);
    if (amount) amount.textContent = formatINRCurrency(getOrderTotalAmountValue(order));
    if (progressPct) progressPct.textContent = `${progress}%`;
    if (progressBar) progressBar.style.width = `${progress}%`;

    if (timelineEl) {
        const firstPendingIndex = steps.findIndex(x => !x.done);
        timelineEl.innerHTML = steps.map((s, idx) => {
            const state = s.done ? 'completed' : (idx === firstPendingIndex ? 'active' : 'pending');
            return `
                <div class="tracking-step ${state}">
                    <div class="tracking-line">
                        <div class="tracking-dot">
                            <i class="fas ${s.done ? 'fa-check text-success' : (state === 'active' ? 'fa-location-dot text-primary' : 'fa-circle text-muted')}" style="font-size:.95rem"></i>
                        </div>
                    </div>
                    <div class="tracking-content">
                        <h6>${s.title}</h6>
                        <small>${formatTrackingDate(s.date)}</small>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function searchOrderById() {
    try {
        const input = document.getElementById('orderIdSearch');
        const orderId = (input ? input.value : '').trim();

        if (!orderId) {
            showMessage('Please enter an Order ID', 'error');
            return;
        }

        // Refresh local list silently so table/track uses latest
        loadCustomerOrders(true);

        const order = getLatestOrderFromStorage(orderId);
        if (!order) {
            showMessage('Order not found for this account', 'error');
            return;
        }

        trackOrder(orderId);
    } catch (error) {
        console.error('Error searching order by ID:', error);
        showMessage('Error searching order. Please try again.', 'error');
    }
}

// Track order
function trackOrder(orderId) {
    console.log('Tracking order:', orderId);
    
    if (!customerOrders || !Array.isArray(customerOrders)) {
        showMessage('No orders available to track', 'error');
        return;
    }
    
    // Always render from latest localStorage (admin updates)
    const order = getLatestOrderFromStorage(orderId) || customerOrders.find(o => o.orderId === orderId);
    if (!order) {
        showMessage('Order not found', 'error');
        return;
    }

    // Create tracking modal
    const trackingModal = document.createElement('div');
    trackingModal.className = 'modal fade';
    trackingModal.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header tracking-modal-header">
                    <div>
                        <div class="d-flex align-items-center gap-2 flex-wrap">
                            <h5 class="modal-title mb-0">Track Order</h5>
                            <span class="badge bg-secondary tracking-badge" data-role="tracking-status">Loading</span>
                            <span class="badge bg-secondary tracking-badge" data-role="tracking-payment">Loading</span>
                        </div>
                        <small class="opacity-75">Order ID: <span class="fw-semibold">${orderId}</span></small>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body" data-role="tracking-body">
                    <div class="tracking-summary-card p-3 mb-3">
                        <div class="tracking-summary-row">
                            <div class="tracking-summary-item">
                                <div class="tracking-summary-label">Solar Type</div>
                                <div class="tracking-summary-value" data-role="tracking-solar-type">-</div>
                            </div>
                            <div class="tracking-summary-item">
                                <small class="text-muted fw-semibold" data-role="tracking-progress-pct">0%</small>
                            </div>
                            <div class="tracking-progress" aria-label="Order progress">
                                <div class="bar" data-role="tracking-progress-bar" style="width:0%;"></div>
                            </div>
                        </div>
                    </div>

                    <div class="tracking-timeline" data-role="tracking-timeline"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" onclick="viewOrderDetails('${orderId}')" data-bs-dismiss="modal">
                        <i class="fas fa-eye me-2"></i>View Details
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(trackingModal);
    
    // Show modal
    const modal = new bootstrap.Modal(trackingModal);
    modal.show();

    // Initial render with latest data
    renderTrackingModal(trackingModal, orderId);

    // Keep modal updated while it's open (admin updates)
    let trackingIntervalId = null;
    const refreshTracking = () => renderTrackingModal(trackingModal, orderId);
    trackingIntervalId = window.setInterval(refreshTracking, 2000);

    const onTrackingStorage = (e) => {
        if (e && e.key === 'customerOrders') {
            refreshTracking();
        }
    };
    const onTrackingFocus = () => refreshTracking();

    window.addEventListener('storage', onTrackingStorage);
    window.addEventListener('focus', onTrackingFocus);
    
    // Remove modal from DOM after hidden
    trackingModal.addEventListener('hidden.bs.modal', () => {
        if (trackingIntervalId) {
            window.clearInterval(trackingIntervalId);
        }
        window.removeEventListener('storage', onTrackingStorage);
        window.removeEventListener('focus', onTrackingFocus);
        document.body.removeChild(trackingModal);
    });
    
    console.log('Tracking modal shown for order:', orderId);
}

// Generate tracking timeline
function generateTrackingTimeline(order) {
    const timeline = [
        { status: 'Order Placed', date: order.createdAt, completed: true },
        { status: 'Order Confirmed', date: order.orderDate, completed: order.status !== 'pending' },
        { status: 'Payment Verified', date: order.paymentCompletedAt, completed: order.paymentStatus === 'completed' },
        { status: 'Processing', date: order.processedAt, completed: order.status === 'confirmed' },
        { status: 'Installation Scheduled', date: order.installationDate, completed: order.status === 'confirmed' },
        { status: 'Completed', date: order.completedAt, completed: order.status === 'completed' }
    ];
    
    return timeline.map((item) => `
        <div class="tracking-item ${item.completed ? 'completed' : 'pending'}">
            <div class="tracking-icon">
                <i class="fas ${item.completed ? 'fa-check-circle text-success' : 'fa-circle text-muted'}"></i>
            </div>
            <div class="tracking-content">
                <h6>${item.status}</h6>
                <small class="text-muted">${item.date ? new Date(item.date).toLocaleString('hi-IN') : 'Pending'}</small>
            </div>
        </div>
    `).join('');
}

// View order details
function viewOrderDetails(orderId) {
    console.log('Viewing order details:', orderId);
    
    if (!customerOrders || !Array.isArray(customerOrders)) {
        showMessage('No orders available to view', 'error');
        return;
    }

    const order = getLatestOrderFromStorage(orderId) || customerOrders.find(o => o.orderId === orderId);
    if (!order) {
        showMessage('Order not found', 'error');
        return;
    }
    
    console.log('Found order for details:', order);
    
    // Create details modal
    const detailsModal = document.createElement('div');
    detailsModal.className = 'modal fade';
    detailsModal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Order Details - ${orderId}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h6>Customer Information</h6>
                            <p><strong>Name:</strong> ${order.name || 'N/A'}</p>
                            <p><strong>Email:</strong> ${order.email || 'N/A'}</p>
                            <p><strong>Phone:</strong> ${order.phone || 'N/A'}</p>
                            <p><strong>Address:</strong> ${order.address || 'N/A'}</p>
                        </div>
                        <div class="col-md-6">
                            <h6>Order Information</h6>
                            <p><strong>Order ID:</strong> ${order.orderId || 'N/A'}</p>
                            <p><strong>Solar Type:</strong> ${order.solarType || 'N/A'}</p>
                            <p><strong>Quantity:</strong> ${order.quantity || 0}</p>
                            <p><strong>Total Amount:</strong> ${formatINRCurrency(getOrderTotalAmountValue(order))}</p>
                        </div>
                    </div>
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <h6>Status Information</h6>
                            <p><strong>Order Status:</strong> <span class="badge ${getStatusBadgeClass(order.status)}">${getStatusText(order.status)}</span></p>
                            <p><strong>Payment Status:</strong> <span class="badge ${getPaymentBadgeClass(order.paymentStatus)}">${getPaymentText(order.paymentStatus)}</span></p>
                        </div>
                        <div class="col-md-6">
                            <h6>Date Information</h6>
                            <p><strong>Order Date:</strong> ${order.orderDate || new Date(order.createdAt).toLocaleDateString('hi-IN')}</p>
                            <p><strong>Installation Date:</strong> ${order.installationDate || 'Not Scheduled'}</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-info" onclick="downloadInvoice('${orderId}')" data-bs-dismiss="modal">Download Invoice</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(detailsModal);
    
    // Show modal
    const modal = new bootstrap.Modal(detailsModal);
    modal.show();
    
    // Remove modal from DOM after hidden
    detailsModal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(detailsModal);
    });
    
    console.log('Details modal shown for order:', orderId);
}

// Refresh orders with real-time updates
function refreshOrders() {
    const refreshBtn = document.querySelector('[onclick="refreshOrders()"]');
    if (!refreshBtn) {
        console.log('Refresh button not found');
        return;
    }
    
    const originalHTML = refreshBtn.innerHTML;
    
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    // Load fresh data from API
    loadCustomerOrders(false).then(() => {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = originalHTML;
        showMessage('Orders refreshed successfully', 'success');
        
        // Update dashboard with fresh data
        updateDashboard();
        
        // Show last update time
        showLastUpdateTime();
        
    }).catch((error) => {
        console.error('Error refreshing orders:', error);
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = originalHTML;
        showMessage('Failed to refresh orders', 'error');
    });
}

// Show last update time
function showLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    
    // Update or create last update indicator
    let updateIndicator = document.getElementById('lastUpdateIndicator');
    if (!updateIndicator) {
        updateIndicator = document.createElement('small');
        updateIndicator.id = 'lastUpdateIndicator';
        updateIndicator.className = 'text-muted d-block mt-2';
        
        const refreshBtn = document.querySelector('[onclick="refreshOrders()"]');
        if (refreshBtn && refreshBtn.parentNode) {
            refreshBtn.parentNode.appendChild(updateIndicator);
        }
    }
    
    updateIndicator.textContent = `Last updated: ${timeString}`;
}

// Auto-refresh orders every 30 seconds
function startAutoRefresh() {
    setInterval(() => {
        console.log('Auto-refreshing orders...');
        loadCustomerOrders(true).then(() => {
            updateDashboard();
            showLastUpdateTime();
        }).catch(error => {
            console.error('Auto-refresh failed:', error);
        });
    }, 30000); // 30 seconds
}

// Sync orders with admin changes
function syncWithAdminChanges() {
    // Listen for storage events (admin updates)
    window.addEventListener('storage', (e) => {
        try {
            if (e && e.key === 'customerOrders') {
                console.log('Detected admin changes, refreshing customer dashboard...');
                loadCustomerOrders(true).then(() => {
                    updateDashboard();
                    showLastUpdateTime();
                    showMessage('Orders updated by admin', 'info');
                });
            }
        } catch (err) {
            console.error('Error syncing with admin changes:', err);
        }
    });
    
    // Also check for direct localStorage changes (fallback)
    let lastOrderCount = customerOrders.length;
    setInterval(() => {
        try {
            const currentOrders = JSON.parse(localStorage.getItem('customerOrders') || '[]');
            if (currentOrders.length !== lastOrderCount) {
                console.log('Order count changed, refreshing...');
                lastOrderCount = currentOrders.length;
                loadCustomerOrders(true).then(() => {
                    updateDashboard();
                    showLastUpdateTime();
                });
            }
        } catch (err) {
            console.error('Error checking order changes:', err);
        }
    }, 5000); // Check every 5 seconds
}

// Setup event listeners
function setupEventListeners() {
    // Add tracking styles
    const style = document.createElement('style');
    style.textContent = `
        .tracking-timeline {
            position: relative;
            padding-left: 30px;
        }
        .tracking-item {
            position: relative;
            margin-bottom: 20px;
            padding-left: 20px;
        }
        .tracking-item::before {
            content: '';
            position: absolute;
            left: -15px;
            top: 20px;
            width: 2px;
            height: calc(100% + 10px);
            background: #dee2e6;
        }
        .tracking-item:last-child::before {
            display: none;
        }
        .tracking-icon {
            position: absolute;
            left: -25px;
            top: 0;
        }
        .tracking-content h6 {
            margin: 0 0 5px 0;
        }
        .tracking-content small {
            font-size: 0.85rem;
        }
        .tracking-item.completed .tracking-content h6 {
            color: #28a745;
        }
    `;
    document.head.appendChild(style);
}

// Logout customer
function logoutCustomer() {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Show message function
function showMessageLegacy(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    messageDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    messageDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

// Get customer orders (mock implementation)
async function getCustomerOrders() {
    // In real implementation, this would call the API
    return JSON.parse(localStorage.getItem('customerOrders')) || [];
}

// Render orders table
function renderOrdersTableLegacy() {
    const tableBody = document.getElementById('ordersTable');
    
    if (customerOrders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No orders found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = '';
    
    customerOrders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.orderId}</td>
            <td>${order.solarType || 'N/A'}</td>
            <td>${order.quantity || 1}</td>
            <td>${formatINRCurrency(getOrderTotalAmountValue(order))}</td>
            <td>${order.orderDate || 'N/A'}</td>
            <td>${order.installationDate || 'N/A'}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(order.status)}">
                    ${getStatusText(order.status)}
                </span>
            </td>
            <td>${order.paymentMethod || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewOrderDetails('${order.orderId}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-success" onclick="downloadInvoice('${order.orderId}')">
                    <i class="fas fa-download"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Get status badge class
function getStatusBadgeClass(status) {
    switch(status) {
        case 'pending': return 'bg-warning';
        case 'confirmed': return 'bg-success';
        case 'completed': return 'bg-info';
        default: return 'bg-secondary';
    }
}

// Get status text
function getStatusText(status) {
    switch(status) {
        case 'pending': return 'Pending';
        case 'confirmed': return 'Confirmed';
        case 'completed': return 'Completed';
        default: return 'Unknown';
    }
}

// Update statistics
function updateStatisticsLegacy() {
    const totalOrders = customerOrders.length;
    const completedOrders = customerOrders.filter(order => order.status === 'completed').length;
    const pendingOrders = customerOrders.filter(order => order.status === 'pending').length;
    
    // Calculate total savings (mock calculation)
    const totalSavings = customerOrders
        .filter(order => order.status === 'completed')
        .reduce((sum, order) => sum + (getOrderTotalAmountValue(order) * 0.8), 0); // 80% savings
    
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('completedOrders').textContent = completedOrders;
    document.getElementById('pendingOrders').textContent = pendingOrders;
    document.getElementById('totalSavings').textContent = formatINRCurrency(totalSavings);
}

// Setup real-time notifications
function setupRealTimeNotifications() {
    // Simulate real-time notifications
    setInterval(() => {
        checkForNewNotifications();
    }, 30000); // Check every 30 seconds
    
    // Initial load
    loadNotifications();
}

// Check for new notifications
function checkForNewNotifications() {
    // In real implementation, this would check with the server
    // For now, we'll simulate random notifications
    
    const randomNotifications = [
        'Your order status has been updated',
        'Installation team will visit your address',
        'Payment has been successful',
        'Your solar system is now 100% operational'
    ];
    
    if (Math.random() > 0.7) { // 30% chance of notification
        const notification = {
            id: Date.now(),
            message: randomNotifications[Math.floor(Math.random() * randomNotifications.length)],
            type: 'info',
            timestamp: new Date().toLocaleString('hi-IN'),
            read: false
        };
        
        notifications.unshift(notification);
        if (notifications.length > 10) {
            notifications.pop();
        }
        
        renderNotifications();
        showNotificationToast(notification.message);
    }
}

// Load notifications
function loadNotifications() {
    renderNotifications();
}

// Render notifications
function renderNotifications() {
    const container = document.getElementById('notificationsContainer');
    
    if (notifications.length === 0) {
        container.innerHTML = '<p class="text-muted">No notifications</p>';
        return;
    }
    
    container.innerHTML = '';
    
    if (!Array.isArray(notifications)) {
        notifications = [];
    }
    
    notifications.forEach(notification => {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = `alert alert-${notification.type} alert-dismissible fade show ${notification.read ? 'opacity-50' : ''}`;
        notificationDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${notification.message}</strong>
                    <br>
                    <small class="text-muted">${notification.timestamp}</small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" onclick="markAsRead(${notification.id})"></button>
            </div>
        `;
        container.appendChild(notificationDiv);
    });
}

// Mark notification as read
function markAsRead(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        localStorage.setItem('customerNotifications', JSON.stringify(notifications));
    }
}

// Show notification toast
function showNotificationToast(message) {
    const toast = document.createElement('div');
    toast.className = 'position-fixed top-0 end-0 p-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        <div class="toast show" role="alert">
            <div class="toast-header">
                <strong class="me-auto">Notification</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// View order details
function viewOrderDetailsLegacy(orderId) {
    try {
        console.log('Legacy viewOrderDetails called:', orderId);
    } catch (_) {}
}

// Download invoice
function downloadInvoice(orderId) {
    try {
        console.log('Downloading invoice for order:', orderId);
        
        // Get orders from localStorage
        const storedOrders = JSON.parse(localStorage.getItem('customerOrders') || '[]');
        const order = storedOrders.find(o => o.orderId === orderId);
        
        if (!order) {
            showMessage('Order not found', 'error');
            return;
        }
        
        console.log('Found order for invoice:', order);
        
        // Create invoice content
        const invoiceContent = generateInvoiceContent(order);
        
        // Create and download PDF-like HTML file
        const blob = new Blob([invoiceContent], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `Invoice_${order.orderId}_${timestamp}.html`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showMessage('Invoice downloaded successfully', 'success');
        console.log('Invoice downloaded:', filename);
        
    } catch (error) {
        console.error('Error downloading invoice:', error);
        showMessage('Error downloading invoice', 'error');
    }
}

// Generate invoice content
function generateInvoiceContent(order) {
    const orderDate = new Date(order.orderDate || order.createdAt).toLocaleDateString('hi-IN');
    const totalAmount = parseFloat(order.totalAmount || 0);
    const tax = totalAmount * 0.18; // 18% GST
    const grandTotal = totalAmount + tax;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${order.orderId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
        .company-info { text-align: center; margin-bottom: 30px; }
        .invoice-details { margin-bottom: 30px; }
        .billing-info { margin-bottom: 30px; }
        .order-items { margin-bottom: 30px; }
        .totals { text-align: right; margin-bottom: 30px; }
        .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        th { background-color: #f8f9fa; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .logo { font-size: 24px; font-weight: bold; color: #007bff; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">☀️ Brothers Solar</div>
        <h2>TAX INVOICE</h2>
        <p>Invoice No: INV-${order.orderId}</p>
        <p>Date: ${orderDate}</p>
    </div>
    
    <div class="company-info">
        <strong>Brothers Solar</strong><br>
        123 Solar Street, Renewable Energy Park<br>
        Mumbai, Maharashtra - 400001<br>
        Phone: +91 98765 43210<br>
        Email: info@brotherssolar.com<br>
        GSTIN: 27AAAPL1234C1ZV
    </div>
    
    <div class="billing-info">
        <h4>Bill To:</h4>
        <p>
            <strong>${order.name}</strong><br>
            ${order.address}<br>
            ${order.email}<br>
            ${order.phone}
        </p>
    </div>
    
    <div class="order-items">
        <h4>Order Details:</h4>
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${order.solarType || 'Solar Product'}</td>
                    <td>${order.quantity || 1}</td>
                    <td class="text-right">₹${totalAmount.toLocaleString('hi-IN')}</td>
                    <td class="text-right">₹${totalAmount.toLocaleString('hi-IN')}</td>
                </tr>
            </tbody>
        </table>
    </div>
    
    <div class="totals">
        <table style="width: 300px; float: right;">
            <tr>
                <td>Subtotal:</td>
                <td class="text-right">₹${totalAmount.toLocaleString('hi-IN')}</td>
            </tr>
            <tr>
                <td>GST (18%):</td>
                <td class="text-right">₹${tax.toLocaleString('hi-IN')}</td>
            </tr>
            <tr class="bold">
                <td>Grand Total:</td>
                <td class="text-right">₹${grandTotal.toLocaleString('hi-IN')}</td>
            </tr>
        </table>
    </div>
    
    <div class="footer">
        <p><strong>Payment Status:</strong> ${order.paymentStatus || 'Pending'}</p>
        <p><strong>Order Status:</strong> ${order.status || 'Pending'}</p>
        <p>Thank you for choosing Brothers Solar! 🌞</p>
        <p>This is a computer-generated invoice and does not require signature.</p>
    </div>
</body>
</html>
    `;
}

// Make invoice functions globally accessible
window.downloadInvoice = downloadInvoice;
window.generateInvoiceContent = generateInvoiceContent;

// Export functions
window.CustomerDashboard = {
    loadCustomerOrders,
    updateDashboard,
    refreshOrders
};

// Review Management Functions

// Open review modal
function openReviewModal(orderId) {
    try {
        // Get order details
        const order = getLatestOrderFromStorage(orderId);
        if (!order) {
            showMessage('Order not found', 'error');
            return;
        }

        // Check if review already exists
        checkExistingReview(orderId);

        // Create modal HTML
        const modalHtml = `
            <div class="modal fade" id="reviewModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-star me-2"></i>Add Review
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="reviewForm">
                                <input type="hidden" id="reviewOrderId" value="${orderId}">
                                
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Order ID</label>
                                    <input type="text" class="form-control" value="${orderId}" readonly>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Your Name</label>
                                    <input type="text" class="form-control" id="reviewName" value="${currentUser.name}" required>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Email</label>
                                    <input type="email" class="form-control" id="reviewEmail" value="${currentUser.email}" required>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Rating</label>
                                    <div class="d-flex gap-2">
                                        ${[1,2,3,4,5].map(star => `
                                            <button type="button" class="btn btn-outline-warning rating-btn" data-rating="${star}" onclick="setRating(${star})">
                                                <i class="fas fa-star"></i>
                                            </button>
                                        `).join('')}
                                    </div>
                                    <input type="hidden" id="reviewRating" value="5" required>
                                    <small class="text-muted">Click on stars to rate</small>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Your Review</label>
                                    <textarea class="form-control" id="reviewComment" rows="4" required 
                                              placeholder="Share your experience with Brothers Solar..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="submitReview()">
                                <i class="fas fa-paper-plane me-2"></i>Submit Review
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('reviewModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('reviewModal'));
        modal.show();

        // Set default rating
        setRating(5);

    } catch (error) {
        console.error('Error opening review modal:', error);
        showMessage('Error opening review form', 'error');
    }
}

// Set rating
function setRating(rating) {
    document.getElementById('reviewRating').value = rating;
    
    // Update star buttons
    const buttons = document.querySelectorAll('.rating-btn');
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

// Check if review already exists
async function checkExistingReview(orderId) {
    try {
        // Try API first
        try {
            const response = await fetch(`${API_BASE}/reviews`);
            const result = await response.json();
            
            if (result.success) {
                const existingReview = result.data.find(r => r.orderId === orderId);
                if (existingReview) {
                    showMessage('You have already submitted a review for this order', 'info');
                    // Close modal if it exists
                    const modal = bootstrap.Modal.getInstance(document.getElementById('reviewModal'));
                    if (modal) modal.hide();
                    return true;
                }
            }
        } catch (apiError) {
            console.log('API failed, allowing review:', apiError);
        }
        
        // If API fails or no reviews found, allow new review
        return false;
        
    } catch (error) {
        console.error('Error checking existing review:', error);
        return false; // Allow review on error
    }
}

// Submit review
async function submitReview() {
    try {
        console.log('Submitting review...');
        
        // Check if all elements exist
        const orderId = document.getElementById('reviewOrderId')?.value;
        const customerName = document.getElementById('reviewName')?.value;
        const customerEmail = document.getElementById('reviewEmail')?.value;
        const rating = document.getElementById('reviewRating')?.value;
        const comment = document.getElementById('reviewComment')?.value;

        console.log('Review data:', { orderId, customerName, customerEmail, rating, comment });

        // Validation
        if (!orderId || !customerName || !customerEmail || !rating || !comment) {
            showMessage('Please fill all fields', 'error');
            return;
        }

        const ratingNum = parseInt(rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            showMessage('Please provide a valid rating (1-5 stars)', 'error');
            return;
        }

        // Create review object
        const review = {
            id: Date.now(),
            orderId,
            customerName,
            customerEmail,
            rating: ratingNum,
            comment,
            status: 'pending', // Pending admin approval
            createdAt: new Date().toISOString(),
            userId: currentUser?.id
        };

        console.log('Review object created:', review);

        // Save to localStorage for admin approval
        try {
            let reviews = JSON.parse(localStorage.getItem('customerReviews') || '[]');
            
            // Check if review already exists for this order
            const existingReview = reviews.find(r => r.orderId === orderId);
            if (existingReview) {
                showMessage('You have already submitted a review for this order', 'warning');
                return;
            }
            
            reviews.push(review);
            localStorage.setItem('customerReviews', JSON.stringify(reviews));
            console.log('Review saved to localStorage');
            
        } catch (storageError) {
            console.error('Error saving to localStorage:', storageError);
        }

        // Try to submit to API (if available)
        try {
            const response = await fetch(`${API_BASE}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(review)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Review submitted to API:', result);
            }
        } catch (apiError) {
            console.log('API not available, review saved locally:', apiError);
        }

        // Success message and close modal
        showMessage('Review submitted successfully! It will be visible after admin approval.', 'success');
        closeReviewModal();
        
        // Refresh orders to update review button
        setTimeout(() => {
            renderOrdersTable();
        }, 1000);

    } catch (error) {
        console.error('Error submitting review:', error);
        showMessage('Error submitting review: ' + error.message, 'error');
    }
}

// Helper function to close review modal
function closeReviewModal() {
    try {
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('reviewModal'));
        if (modal) {
            modal.hide();
        }
        
        // Remove modal from DOM
        const modalElement = document.getElementById('reviewModal');
        if (modalElement) {
            modalElement.remove();
        }
        
        console.log('Review modal closed');
    } catch (error) {
        console.error('Error closing review modal:', error);
    }
}

// Make review functions globally accessible
window.openReviewModal = openReviewModal;
window.setRating = setRating;
window.submitReview = submitReview;
window.closeReviewModal = closeReviewModal;

// Export functions
