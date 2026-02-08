/**
 * Admin Order Status Fix Script - Inline Version
 * Fix admin page showing confirmed instead of completed orders
 */

(function() {
    console.log('🔧 ADMIN ORDER STATUS FIX (INLINE)...');

    // Step 1: Check current admin statistics
    console.log('\n=== STEP 1: CHECK ADMIN STATISTICS ===');
    const allOrders = JSON.parse(localStorage.getItem('customerOrders') || '[]');
    console.log('Total orders in system:', allOrders.length);

    const confirmedOrders = allOrders.filter(order => order.status === 'confirmed');
    const completedOrders = allOrders.filter(order => order.status === 'completed');
    const pendingOrders = allOrders.filter(order => order.status === 'pending');

    console.log('Confirmed orders:', confirmedOrders.length);
    console.log('Completed orders:', completedOrders.length);
    console.log('Pending orders:', pendingOrders.length);

    // Step 2: Function to update admin statistics properly
    window.updateAdminStatisticsFixed = function() {
        const orders = JSON.parse(localStorage.getItem('customerOrders') || '[]');
        
        const totalOrders = orders.length;
        const confirmedOrders = orders.filter(order => order.status === 'confirmed').length;
        const completedOrders = orders.filter(order => order.status === 'completed').length;
        const pendingOrders = orders.filter(order => order.status === 'pending').length;
        
        // Update DOM elements
        const totalOrdersElement = document.getElementById('totalOrders');
        const confirmedOrdersElement = document.getElementById('confirmedOrders');
        const completedOrdersElement = document.getElementById('completedOrders');
        const pendingOrdersElement = document.getElementById('pendingOrders');
        
        if (totalOrdersElement) totalOrdersElement.textContent = totalOrders;
        if (confirmedOrdersElement) confirmedOrdersElement.textContent = confirmedOrders;
        if (completedOrdersElement) completedOrdersElement.textContent = completedOrders;
        if (pendingOrdersElement) pendingOrdersElement.textContent = pendingOrders;
        
        console.log('✅ Admin statistics updated:', { 
            totalOrders, 
            confirmedOrders, 
            completedOrders, 
            pendingOrders 
        });
    };

    // Step 3: Auto-convert confirmed orders to completed
    window.autoConvertConfirmedToCompleted = function() {
        const orders = JSON.parse(localStorage.getItem('customerOrders') || '[]');
        let convertedCount = 0;
        
        orders.forEach((order, index) => {
            if (order.status === 'confirmed') {
                const shouldComplete = order.paymentStatus === 'completed' || 
                                   (order.installationDate && new Date(order.installationDate) < new Date()) ||
                                   (order.confirmedAt && new Date(order.confirmedAt) < new Date(Date.now() - 24*60*60*1000));
                
                if (shouldComplete) {
                    orders[index].status = 'completed';
                    orders[index].completedAt = new Date().toISOString();
                    convertedCount++;
                    console.log('✅ Auto-converted to completed:', order.orderId);
                }
            }
        });
        
        if (convertedCount > 0) {
            localStorage.setItem('customerOrders', JSON.stringify(orders));
            console.log(`✅ Auto-converted ${convertedCount} orders to completed`);
            
            updateAdminStatisticsFixed();
            
            if (typeof loadOrders === 'function') {
                loadOrders();
            }
        }
    };

    // Step 4: Manual conversion function
    window.convertConfirmedToCompleted = function(orderId) {
        if (!orderId) {
            const orders = JSON.parse(localStorage.getItem('customerOrders') || '[]');
            const confirmedOrders = orders.filter(order => order.status === 'confirmed');
            
            if (confirmedOrders.length === 0) {
                alert('No confirmed orders to convert!');
                return;
            }
            
            if (confirm(`Convert ${confirmedOrders.length} confirmed orders to completed?`)) {
                confirmedOrders.forEach(order => {
                    convertSingleOrder(order.orderId);
                });
            }
        } else {
            convertSingleOrder(orderId);
        }
    };

    // Convert single order
    function convertSingleOrder(orderId) {
        const orders = JSON.parse(localStorage.getItem('customerOrders') || '[]');
        const orderIndex = orders.findIndex(order => order.orderId === orderId);
        
        if (orderIndex !== -1) {
            const oldStatus = orders[orderIndex].status;
            orders[orderIndex].status = 'completed';
            orders[orderIndex].completedAt = new Date().toISOString();
            
            localStorage.setItem('customerOrders', JSON.stringify(orders));
            
            console.log(`✅ Order ${orderId} converted from ${oldStatus} to completed`);
            
            updateAdminStatisticsFixed();
            
            if (typeof loadOrders === 'function') {
                loadOrders();
            }
            
            if (typeof sendCustomerNotification === 'function') {
                sendCustomerNotification(orders[orderIndex], 'order_completed');
            }
            
            if (typeof showMessage === 'function') {
                showMessage(`Order ${orderId} marked as completed!`, 'success');
            }
        } else {
            console.error('❌ Order not found:', orderId);
            if (typeof showMessage === 'function') {
                showMessage('Order not found!', 'error');
            }
        }
    }

    // Step 5: Add admin controls
    window.addAdminControls = function() {
        const controlsHtml = `
            <div class="card mb-4" id="adminControls">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">🔧 Order Status Controls</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-4">
                            <button class="btn btn-success w-100" onclick="convertConfirmedToCompleted()">
                                <i class="fas fa-check me-2"></i>
                                Convert Confirmed → Completed
                            </button>
                        </div>
                        <div class="col-md-4">
                            <button class="btn btn-info w-100" onclick="updateAdminStatisticsFixed()">
                                <i class="fas fa-sync me-2"></i>
                                Refresh Statistics
                            </button>
                        </div>
                        <div class="col-md-4">
                            <button class="btn btn-warning w-100" onclick="autoConvertConfirmedToCompleted()">
                                <i class="fas fa-magic me-2"></i>
                                Auto-Convert
                            </button>
                        </div>
                    </div>
                    <div class="mt-3">
                        <small class="text-muted">
                            <strong>Current Status:</strong> 
                            Confirmed: <span id="currentConfirmed">0</span> | 
                            Completed: <span id="currentCompleted">0</span> | 
                            Pending: <span id="currentPending">0</span>
                        </small>
                    </div>
                </div>
            </div>
        `;
        
        const statisticsSection = document.querySelector('.row .col-md-3')?.parentElement?.parentElement;
        if (statisticsSection && !document.getElementById('adminControls')) {
            const controlsDiv = document.createElement('div');
            controlsDiv.innerHTML = controlsHtml;
            statisticsSection.parentNode.insertBefore(controlsDiv, statisticsSection.nextSibling);
            
            console.log('✅ Admin controls added');
            updateAdminStatisticsFixed();
        }
    };

    // Step 6: Initialize
    console.log('\n=== STEP 6: INITIALIZE ===');
    
    // Auto-run fixes after delay
    setTimeout(() => {
        updateAdminStatisticsFixed();
        autoConvertConfirmedToCompleted();
        addAdminControls();
    }, 2000);

    console.log('\n🎯 ADMIN ORDER STATUS FIX COMPLETE!');
    console.log('\n📝 Available commands:');
    console.log('  convertConfirmedToCompleted() - Convert all confirmed orders to completed');
    console.log('  updateAdminStatisticsFixed() - Refresh admin statistics');
    console.log('  autoConvertConfirmedToCompleted() - Auto-convert eligible orders');
    console.log('  addAdminControls() - Add admin control panel');

})();
