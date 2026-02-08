// Global variables
const API_BASE = 'http://localhost:3003/api';

// Use API_BASE_URL from api.js when available; fallback to API_BASE
const PAYMENT_API_BASE = (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) ? API_BASE_URL : API_BASE;

function escapeJsString(value) {
    return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r/g, '')
        .replace(/\n/g, ' ');
}

// Check user authentication
function checkUserAuthentication() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || 
                        JSON.parse(sessionStorage.getItem('currentUser'));
    
    if (!currentUser || !currentUser.token) {
        // Redirect to login page
        window.location.href = 'login.html';
        return false;
    }
    
    return currentUser;
}

// Get current logged-in user
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser')) || 
           JSON.parse(sessionStorage.getItem('currentUser'));
}

function savePendingOrderIntent(intent) {
    try {
        localStorage.setItem('pendingOrderIntent', JSON.stringify({
            ...intent,
            createdAt: new Date().toISOString()
        }));
    } catch (_) {}
}

function consumePendingOrderIntent() {
    try {
        const raw = localStorage.getItem('pendingOrderIntent');
        if (!raw) return null;
        localStorage.removeItem('pendingOrderIntent');
        return JSON.parse(raw);
    } catch (_) {
        return null;
    }
}

function requireLoginForOrder(intent) {
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.token) return true;

    savePendingOrderIntent(intent || { reason: 'order' });
    window.location.href = 'login.html';
    return false;
}

// Logout user
function logoutUser() {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Update user interface with logged-in user info
function updateUserInterface(currentUser) {
    // Update customer name in navigation
    const customerNameElement = document.getElementById('customerName');
    if (customerNameElement) {
        customerNameElement.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    }
    
    // Add logout functionality
    const logoutLink = document.querySelector('a[href="customer.html"]');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            logoutUser();
        });
    }
    
    // Pre-fill customer details form with logged-in user data
    const customerNameInput = document.getElementById('customerName');
    const customerEmailInput = document.getElementById('customerEmail');
    const customerPhoneInput = document.getElementById('customerPhone');
    const customerAddressInput = document.getElementById('customerAddress');
    
    if (customerNameInput) {
        customerNameInput.value = `${currentUser.firstName} ${currentUser.lastName}`;
        customerNameInput.readOnly = true; // Make it read-only since user is logged in
    }
    
    if (customerEmailInput) {
        customerEmailInput.value = currentUser.email;
        customerEmailInput.readOnly = true;
    }
    
    if (customerPhoneInput) {
        customerPhoneInput.value = currentUser.phone;
        customerPhoneInput.readOnly = true;
    }
    
    console.log('User interface updated for:', currentUser);
}

function setHomeNavbarState(currentUser) {
    const customerNameElement = document.getElementById('customerName');
    const customerEmailElement = document.getElementById('customerEmail');
    const userAvatarLetter = document.getElementById('userAvatarLetter');
    const customerNameDropdown = document.getElementById('customerNameDropdown');
    const customerEmailDropdown = document.getElementById('customerEmailDropdown');
    const userAvatarLetterDropdown = document.getElementById('userAvatarLetterDropdown');
    const navLoginLink = document.getElementById('navLoginLink');
    const navRegisterLink = document.getElementById('navRegisterLink');
    const authDividerTop = document.getElementById('authDividerTop');
    const navDashboardLink = document.getElementById('navDashboardLink');
    const navTrackOrdersLink = document.getElementById('navTrackOrdersLink');
    const myOrdersShortcut = document.getElementById('myOrdersShortcut');
    const logoutLink = document.getElementById('logoutLink');

    const isLoggedIn = !!(currentUser && currentUser.token);

    const setDisplay = (el, show) => {
        if (!el) return;
        el.style.display = show ? '' : 'none';
    };

    const setAvatarLetter = (el, name) => {
        if (!el) return;
        const letter = (name && typeof name === 'string' && name.length > 0) ? name.charAt(0).toUpperCase() : 'G';
        el.textContent = letter;
    };

    if (isLoggedIn) {
        const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email || 'User';
        const email = currentUser.email || 'No email';
        if (customerNameElement) customerNameElement.textContent = fullName;
        if (customerEmailElement) customerEmailElement.textContent = email;
        if (customerNameDropdown) customerNameDropdown.textContent = fullName;
        if (customerEmailDropdown) customerEmailDropdown.textContent = email;
        setAvatarLetter(userAvatarLetter, fullName);
        setAvatarLetter(userAvatarLetterDropdown, fullName);
    } else {
        if (customerNameElement) customerNameElement.textContent = 'Guest';
        if (customerEmailElement) customerEmailElement.textContent = 'Not logged in';
        if (customerNameDropdown) customerNameDropdown.textContent = 'Guest';
        if (customerEmailDropdown) customerEmailDropdown.textContent = 'Not logged in';
        setAvatarLetter(userAvatarLetter, 'Guest');
        setAvatarLetter(userAvatarLetterDropdown, 'Guest');
    }

    setDisplay(navLoginLink, !isLoggedIn);
    setDisplay(navRegisterLink, !isLoggedIn);
    setDisplay(authDividerTop, !isLoggedIn);
    setDisplay(navDashboardLink, isLoggedIn);
    setDisplay(navTrackOrdersLink, isLoggedIn);
    setDisplay(myOrdersShortcut, isLoggedIn);
    setDisplay(logoutLink, isLoggedIn);

    if (logoutLink) {
        logoutLink.onclick = (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            sessionStorage.removeItem('currentUser');
            setHomeNavbarState(null);
            window.location.href = 'index.html';
        };
    }
}

let solarTypes = [
    {
        id: 1,
        name: "Basic Solar Panel",
        power: "300W",
        price: 15000,
        description: "Basic solar panel for domestic use",
        efficiency: "15%",
        warranty: "25 years",
        icon: "fa-solar-panel"
    },
    {
        id: 2,
        name: "Premium Solar Panel",
        power: "400W",
        price: 25000,
        description: "High efficiency premium solar panel",
        efficiency: "20%",
        warranty: "25 years",
        icon: "fa-sun"
    },
    {
        id: 3,
        name: "Commercial Solar Panel",
        power: "500W",
        price: 35000,
        description: "Powerful solar panel for commercial use",
        efficiency: "22%",
        warranty: "25 years",
        icon: "fa-industry"
    },
    {
        id: 4,
        name: "Hybrid Solar System",
        power: "600W",
        price: 45000,
        description: "Hybrid system for both grid and off-grid",
        efficiency: "24%",
        warranty: "25 years",
        icon: "fa-battery-full"
    }
];

// Fallback solar types
const fallbackSolarTypes = [
    {
        id: 1,
        name: "Tata Power Solar",
        power: "300W",
        price: 15000,
        description: "Tata Power Solar - India's trusted solar company",
        efficiency: "15%",
        warranty: "25 years",
        icon: "fa-solar-panel"
    },
    {
        id: 2,
        name: "Luminous Solar",
        power: "400W",
        price: 25000,
        description: "Luminous - High quality solar panels",
        efficiency: "20%",
        warranty: "25 years",
        icon: "fa-sun"
    },
    {
        id: 3,
        name: "Waaree Solar",
        power: "500W",
        price: 35000,
        description: "Waaree Solar - Commercial solar solutions",
        efficiency: "22%",
        warranty: "25 years",
        icon: "fa-industry"
    },
    {
        id: 4,
        name: "Adani Solar",
        power: "600W",
        price: 45000,
        description: "Adani Solar - Hybrid solar system",
        efficiency: "24%",
        warranty: "25 years",
        icon: "fa-battery-full"
    }
];

// Display fallback solar types
function displayFallbackSolarTypes() {
    console.log('Displaying fallback solar types');
    const container = document.getElementById('solarTypesContainer');
    if (!container) {
        console.log('Container not found');
        return;
    }
    
    container.innerHTML = '';
    
    fallbackSolarTypes.forEach(type => {
        const card = document.createElement('div');
        card.className = 'col-lg-6 col-md-6 mb-4';
        card.innerHTML = `
            <div class="solar-type-card" onclick="selectSolarType(this, ${type.id})">
                <div class="text-center">
                    <i class="fas ${type.icon} text-warning" style="font-size: 48px;"></i>
                    <h4>${type.name}</h4>
                    <p class="text-muted">${type.description}</p>
                    <div class="row text-center">
                        <div class="col-4">
                            <strong>Power</strong><br>
                            <span class="text-primary">${type.power}</span>
                        </div>
                        <div class="col-4">
                            <strong>Efficiency</strong><br>
                            <span class="text-success">${type.efficiency}</span>
                        </div>
                        <div class="col-4">
                            <strong>Warranty</strong><br>
                            <span class="text-info">${type.warranty}</span>
                        </div>
                    </div>
                    <div class="price mt-3">
                        <strong>₹${type.price.toLocaleString('hi-IN')}</strong>
                        <br>
                        <button class="btn btn-success btn-sm mt-2" onclick="event.stopPropagation(); window.openOrderPage(${type.id}, '${escapeJsString(typeof type.name === 'object' ? (type.name.en || type.name.hi || type.name.mr) : type.name)}', ${type.price})">
                            <i class="fas fa-shopping-cart me-1"></i>Order Now
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
        console.log('Added fallback card for:', type.name);
    });
}

let customerOrders = JSON.parse(localStorage.getItem('customerOrders')) || [];
let selectedSolarType = null;

// Initialize hero particles
function initHeroParticles() {
    const container = document.getElementById('heroParticles');
    if (!container) return;
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'hero-particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 3 + 1}px;
            height: ${Math.random() * 3 + 1}px;
            background: rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: particle-float-up ${Math.random() * 10 + 10}s linear infinite;
            animation-delay: ${Math.random() * 5}s;
        `;
        container.appendChild(particle);
    }
}

// Add particle animation to CSS
function addParticleAnimationCSS() {
    if (document.getElementById('hero-particle-styles')) return;
    const style = document.createElement('style');
    style.id = 'hero-particle-styles';
    style.textContent = `
        @keyframes particle-float-up {
            0% { transform: translateY(100vh) scale(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) scale(1); opacity: 0; }
        }
        .hero-particle {
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);
}

function initIconWiseSections() {
    const sectionIds = [
        'home',
        'bill-calculator',
        'solar-calculator',
        'solar-types',
        'solar-order',
        'gallery',
        'testimonials',
        'contact',
        'faq'
    ];

    // Do not hide sections; just enable smooth scrolling for navbar links.
    sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = '';
        }
    });

    const navLinks = document.querySelectorAll('.navbar a.nav-link[href^="#"]');
    navLinks.forEach((a) => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href') || '';
            const id = href.startsWith('#') ? href.slice(1) : '';
            if (!sectionIds.includes(id)) return;
            e.preventDefault();

            const target = document.getElementById(id);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            const navCollapseEl = document.getElementById('navbarNav');
            if (navCollapseEl && navCollapseEl.classList.contains('show') && window.bootstrap && window.bootstrap.Collapse) {
                try {
                    const collapse = window.bootstrap.Collapse.getOrCreateInstance(navCollapseEl);
                    collapse.hide();
                } catch (_) {}
            }
        });
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations (duplicate DOMContentLoaded blocks exist in this file)
    if (window.brothersSolarInitialized) {
        return;
    }
    window.brothersSolarInitialized = true;

    try {
        const path = (window.location && window.location.pathname) ? window.location.pathname.toLowerCase() : '';
        const isHome = path.endsWith('/') || path.endsWith('/index.html') || path.endsWith('index.html');
        const currentUser = getCurrentUser();

        if (isHome) {
            // Global guard: require login even for home page
            if (!currentUser || !currentUser.token) {
                try {
                    localStorage.setItem('postLoginRedirect', 'index.html');
                } catch (_) {}
                window.location.href = 'login.html';
                return;
            }

            if (currentUser && currentUser.token) {
                if (typeof updateUserInterface === 'function') {
                    updateUserInterface(currentUser);
                }
            }
            if (typeof setHomeNavbarState === 'function') setHomeNavbarState(currentUser);
            if (typeof addParticleAnimationCSS === 'function') addParticleAnimationCSS();
            if (typeof initHeroParticles === 'function') initHeroParticles();
            if (typeof initIconWiseSections === 'function') initIconWiseSections();

            // Resume pending order intent after login
            if (currentUser && currentUser.token) {
                const intent = consumePendingOrderIntent();
                if (intent && (intent.solarTypeId || intent.solarTypeName)) {
                    setTimeout(() => {
                        try {
                            openOrderPage(intent.solarTypeId, intent.solarTypeName, intent.price);
                        } catch (_) {}
                    }, 200);
                }
            }
        } else {
            const authUser = (typeof checkUserAuthentication === 'function') ? checkUserAuthentication() : null;
            if (!authUser) {
                return;
            }
            if (typeof updateUserInterface === 'function') {
                updateUserInterface(authUser);
            }
        }

        // Initialize dark mode
        if (typeof initializeDarkMode === 'function') initializeDarkMode();

        // Initialize with sample data if no API available
        if (typeof initializeSampleData === 'function') initializeSampleData();

        if (typeof loadSolarTypes === 'function') loadSolarTypes();
        if (typeof loadSolarTypesInOrder === 'function') loadSolarTypesInOrder();

        // Setup event listeners (critical for buttons)
        if (typeof setupEventListeners === 'function') setupEventListeners();

        if (typeof observeSections === 'function') observeSections();

        // Load testimonials
        if (typeof loadTestimonials === 'function') loadTestimonials();

        // Setup contact form
        if (typeof setupContactForm === 'function') setupContactForm();

        // Update API status indicator (if present)
        if (typeof updateApiStatusIndicator === 'function') {
            try {
                updateApiStatusIndicator();
            } catch (_) {}
        }

        // Load gallery
        if (typeof loadGallery === 'function') loadGallery();
    } catch (error) {
        console.error('❌ Error during main initialization:', error);
    }
});

// Dark Mode Functions
function initializeDarkMode() {
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        document.body.classList.add('dark-mode');
        updateDarkModeIcon(true);
    }
    
    // Check system preference
    if (!savedDarkMode && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-mode');
        updateDarkModeIcon(true);
    }
}

function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    updateDarkModeIcon(isDarkMode);
}

function updateDarkModeIcon(isDarkMode) {
    const icon = document.getElementById('darkModeIcon');
    if (isDarkMode) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

// Load testimonials
function loadTestimonials() {
    const container = document.getElementById('testimonialsContainer');
    if (!container) return;
    
    const testimonials = JSON.parse(localStorage.getItem('testimonials')) || [];
    
    if (testimonials.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <i class="fas fa-star text-muted" style="font-size: 48px;"></i>
                <h5 class="mt-3">No Reviews Yet</h5>
                <p class="text-muted">Be the first customer to share your solar experience with Brothers Solar!</p>
                <p class="small text-info">Only verified customers can leave reviews</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = testimonials.map(testimonial => `
        <div class="col-lg-4 col-md-6 mb-4">
            <div class="card h-100 testimonial-card">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <div class="avatar me-3" style="font-size: 2rem;">${testimonial.avatar}</div>
                        <div>
                            <h6 class="mb-0">${testimonial.name}</h6>
                            <small class="text-muted">${testimonial.location}</small>
                        </div>
                    </div>
                    <div class="mb-2">
                        ${generateStars(testimonial.rating)}
                    </div>
                    <p class="card-text">"${testimonial.comment}"</p>
                    <small class="text-muted">${testimonial.date}</small>
                </div>
            </div>
        </div>
    `).join('');
}

// Generate star rating HTML
function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star text-warning"></i>';
        } else {
            stars += '<i class="far fa-star text-warning"></i>';
        }
    }
    return stars;
}

// Setup contact form
function setupContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
        const contactData = {
            name: document.getElementById('contactName').value,
            email: document.getElementById('contactEmail').value,
            phone: document.getElementById('contactPhone').value,
            subject: document.getElementById('contactSubject').value,
            message: document.getElementById('contactMessage').value,
            date: new Date().toLocaleDateString('hi-IN'),
            status: 'pending'
        };
        
        try {
            // Save to localStorage (in real app, this would send to backend)
            const inquiries = JSON.parse(localStorage.getItem('contactInquiries')) || [];
            contactData.id = Date.now();
            inquiries.push(contactData);
            localStorage.setItem('contactInquiries', JSON.stringify(inquiries));
            
            // Show success message
            const resultDiv = document.getElementById('contactResult');
            resultDiv.innerHTML = `
                <div class="success-message">
                    <i class="fas fa-check-circle"></i>
                    <p>Your message has been sent successfully! We will contact you soon.</p>
                </div>
            `;
            
            // Reset form
            form.reset();
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                resultDiv.innerHTML = '';
            }, 5000);
            
        } catch (error) {
            console.error('Error submitting contact form:', error);
            const resultDiv = document.getElementById('contactResult');
            resultDiv.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error sending message. Please try again.</p>
                </div>
            `;
        } finally {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// Initialize sample data for immediate functionality
function initializeSampleData() {
    // Remove any demo/test keys and keep only real data.
    localStorage.removeItem('enableDemoData');

    try {
        const existingOrders = JSON.parse(localStorage.getItem('customerOrders')) || [];
        const cleanedOrders = Array.isArray(existingOrders)
            ? existingOrders.filter(o => o && typeof o === 'object' && !o.isSample && !(String(o.orderId || '').toUpperCase().includes('DEMO')))
            : [];
        localStorage.setItem('customerOrders', JSON.stringify(cleanedOrders));
    } catch (error) {
        console.error('Error cleaning customerOrders:', error);
    }

    // Do not inject fake testimonials/inquiries.
    if (!localStorage.getItem('testimonials')) {
        localStorage.setItem('testimonials', JSON.stringify([]));
    }
    if (!localStorage.getItem('contactInquiries')) {
        localStorage.setItem('contactInquiries', JSON.stringify([]));
    }
}

async function updateApiStatusIndicator() {
    const statusDiv = document.getElementById('apiStatus');
    const statusText = document.getElementById('apiStatusText');

    try {
        const health = await BrothersSolarAPI.healthCheck();
        if (health && health.success) {
            document.body.classList.add('api-connected');
            document.body.classList.remove('api-offline');

            if (statusDiv) statusDiv.className = 'api-status connected';
            if (statusText) statusText.textContent = 'API Connected';
        } else {
            document.body.classList.add('api-offline');
            document.body.classList.remove('api-connected');

            if (statusDiv) statusDiv.className = 'api-status offline';
            if (statusText) statusText.textContent = 'Offline Mode';
        }
    } catch (error) {
        document.body.classList.add('api-offline');
        document.body.classList.remove('api-connected');

        if (statusDiv) statusDiv.className = 'api-status offline';
        if (statusText) statusText.textContent = 'Offline Mode';
    }
}

// Change language
function changeLanguage(lang) {
    // Language switching removed - English only
    console.log('Language switching disabled - English only');
}

// Set language
function setLanguage(lang) {
    console.log('Language setting disabled - English only');
}

// ... (rest of the code remains the same)

// Setup event listeners
function setupEventListeners() {
    // Bill Calculator
    const billForm = document.getElementById('billCalculatorForm');
    if (billForm) billForm.addEventListener('submit', calculateBill);
    
    // Solar Calculator
    const solarForm = document.getElementById('solarCalculatorForm');
    if (solarForm) solarForm.addEventListener('submit', calculateSolar);
    
    // Contact Form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) contactForm.addEventListener('submit', handleContactForm);
    
    // Multi-step Order Form
    const solarTypeForm = document.getElementById('solarTypeForm');
    if (solarTypeForm) solarTypeForm.addEventListener('submit', handleSolarTypeForm);
    
    const customerDetailsForm = document.getElementById('customerDetailsForm');
    if (customerDetailsForm) customerDetailsForm.addEventListener('submit', handleCustomerDetailsForm);
    
    // Admin Login
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) adminLoginForm.addEventListener('submit', adminLogin);
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            
            // Skip if href is just "#" or empty or invalid
            if (!href || href === '#' || href.trim() === '') {
                console.log('Skipping invalid anchor href:', href);
                return;
            }
            
            try {
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                } else {
                    console.log('Target element not found for selector:', href);
                }
            } catch (error) {
                console.error('Error in smooth scrolling:', error.message, 'Selector:', href);
            }
        });
    });
}

// Multi-step Order Form Functions
let currentStep = 1;
let orderData = {};

function resetOrderFormToStep1() {
    try {
        for (let i = 1; i <= 4; i++) {
            const stepEl = document.getElementById(`step${i}`);
            const stepFormEl = document.getElementById(`orderStep${i}`);
            if (stepEl) stepEl.classList.remove('active', 'completed');
            if (stepFormEl) stepFormEl.classList.remove('active');
        }

        currentStep = 1;
        const step1 = document.getElementById('step1');
        const form1 = document.getElementById('orderStep1');
        if (step1) step1.classList.add('active');
        if (form1) form1.classList.add('active');
    } catch (error) {
        console.error('Error resetting order form:', error);
    }
}

function handleSolarTypeForm(e) {
    e.preventDefault();

    if (!requireLoginForOrder({ reason: 'order_step1' })) {
        return;
    }
    
    const solarType = document.getElementById('solarType').value;
    const quantity = document.getElementById('quantity').value;
    
    if (!solarType) {
        handleFormError('solarType', 'Please select solar type');
        return;
    }
    
    // Store data
    orderData.solarType = solarType;
    orderData.quantity = parseInt(quantity);
    
    // Get solar type details
    const selectedType = solarTypes.find(type => type.id == solarType);
    if (selectedType) {
        orderData.solarTypeName = selectedType.name;
        orderData.price = selectedType.price;
        orderData.totalAmount = selectedType.price * parseInt(quantity);
    }
    
    // Move to next step
    nextStep();
}

function handleCustomerDetailsForm(e) {
    e.preventDefault();
    
    // Get current logged-in user
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.token) {
        requireLoginForOrder({ reason: 'order_step2' });
        return;
    }
    
    // Use logged-in user data instead of form inputs
    const name = `${currentUser.firstName} ${currentUser.lastName}`;
    const email = currentUser.email;
    const phone = currentUser.phone;
    const address = document.getElementById('customerAddress').value; // Only address is editable
    
    // Validate address (required field)
    if (!address || address.trim() === '') {
        showMessage('Please enter your delivery address', 'error');
        return;
    }
    
    // Store data in global orderData
    orderData.name = name;
    orderData.email = email;
    orderData.phone = phone;
    orderData.address = address;
    orderData.userId = currentUser.id; // Link order to user
    
    console.log('Customer details stored in orderData:', orderData);
    
    // Move to next step
    nextStep();
}

function nextStep() {
    // Mark current step as completed
    document.getElementById(`step${currentStep}`).classList.remove('active');
    document.getElementById(`step${currentStep}`).classList.add('completed');
    
    // Hide current step
    document.getElementById(`orderStep${currentStep}`).classList.remove('active');
    
    // Show next step
    currentStep++;
    
    // Check if next step exists
    const nextStepElement = document.getElementById(`step${currentStep}`);
    const nextStepForm = document.getElementById(`orderStep${currentStep}`);
    
    if (nextStepElement && nextStepForm) {
        document.getElementById(`step${currentStep}`).classList.add('active');
        document.getElementById(`orderStep${currentStep}`).classList.add('active');
    }
    
    // Handle step-specific logic
    if (currentStep === 3) {
        showOrderSummary();
    } else if (currentStep === 4) {
        showFinalOrderSummary();
    }
}

function previousStep(step) {
    // Remove active from current step
    document.getElementById(`step${currentStep}`).classList.remove('active');
    document.getElementById(`orderStep${currentStep}`).classList.remove('active');
    
    // Show previous step
    currentStep = step;
    document.getElementById(`step${currentStep}`).classList.add('active');
    document.getElementById(`orderStep${currentStep}`).classList.add('active');
    
    // Scroll to top of form
    document.getElementById('solar-order').scrollIntoView({ behavior: 'smooth' });
}

function showOrderSummary() {
    const summaryDiv = document.getElementById('orderSummary');
    if (!summaryDiv) return;
    
    console.log('showOrderSummary called with orderData:', orderData);
    
    summaryDiv.innerHTML = `
        <div class="result-box">
            <h4><i class="fas fa-shopping-cart"></i> Order Summary</h4>
            <div class="result-item">
                <span>Solar Type:</span>
                <span>${orderData.solarTypeName || 'N/A'}</span>
            </div>
            <div class="result-item">
                <span>Quantity:</span>
                <span>${orderData.quantity || 0}</span>
            </div>
            <div class="result-item">
                <span>Price per Unit:</span>
                <span>₹${(orderData.price || 0).toLocaleString('hi-IN')}</span>
            </div>
            <div class="result-item">
                <span>Total Amount:</span>
                <span>₹${(orderData.totalAmount || 0).toLocaleString('hi-IN')}</span>
            </div>
            <hr>
            <h5>Customer Details</h5>
            <div class="result-item">
                <span>Name:</span>
                <span>${orderData.name || 'N/A'}</span>
            </div>
            <div class="result-item">
                <span>Email:</span>
                <span>${orderData.email || 'N/A'}</span>
            </div>
            <div class="result-item">
                <span>Phone:</span>
                <span>${orderData.phone || 'N/A'}</span>
            </div>
            <div class="result-item">
                <span>Address:</span>
                <span>${orderData.address || 'N/A'}</span>
            </div>
        </div>
    `;
}

function showFinalOrderSummary() {
    const summaryDiv = document.getElementById('finalOrderSummary');
    if (!summaryDiv) return;
    
    summaryDiv.innerHTML = `
        <div class="result-box">
            <h4><i class="fas fa-check-circle text-success"></i> Final Order Confirmation</h4>
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                Please confirm your order and complete the payment process.
            </div>
            <div class="result-item">
                <span>Order ID:</span>
                <span><strong>ORD${Date.now()}</strong></span>
            </div>
            <div class="result-item">
                <span>Total Amount:</span>
                <span><strong>₹${(orderData.totalAmount || 0).toLocaleString('hi-IN')}</strong></span>
            </div>
            <div class="result-item">
                <span>Estimated Installation:</span>
                <span><strong>3-5 working days</strong></span>
            </div>
            <div class="result-item">
                <span>Order Status:</span>
                <span><strong>Confirmation Pending</strong></span>
            </div>
            <div class="result-item">
                <span>Customer Type:</span>
                <span><strong>Individual</strong></span>
            </div>
        </div>
    `;
}

function confirmOrder(event) {
    event.preventDefault();
    console.log('confirmOrder called, showing payment section...');
    console.log('Current orderData:', orderData);

    try {
        // Check if orderData exists
        if (!orderData) {
            console.error('orderData is null or undefined');
            showMessage('Please fill all order details first', 'error');
            return;
        }

        if (!orderData.name || !orderData.email || !orderData.phone || !orderData.address) {
            console.error('orderData is incomplete:', orderData);
            showMessage('Please complete all customer details', 'error');
            return;
        }

        if (!orderData.solarType) {
            showMessage('Please select a solar product', 'error');
            return;
        }

        if (!orderData.quantity || orderData.quantity < 1) {
            showMessage('Please enter a valid quantity', 'error');
            return;
        }

        if (!orderData.totalAmount || orderData.totalAmount <= 0) {
            showMessage('Invalid total amount', 'error');
            return;
        }

        // Generate order ID
        orderData.orderId = 'ORD' + Date.now();
        orderData.orderDate = new Date().toLocaleDateString('en-US');
        orderData.installationDate = generateInstallationDate();
        orderData.status = 'pending'; // Start with pending status
        orderData.permission = 'granted'; // Everyone has permission to order
        orderData.customerType = 'individual'; // Individual customer
        orderData.orderSource = 'website'; // Ordered from website
        orderData.createdAt = new Date().toISOString(); // Add creation timestamp
        
        // Add user info if logged in
        const currentUser = getCurrentUser();
        if (currentUser) {
            orderData.userId = currentUser.id;
            orderData.userEmail = currentUser.email;
        }

        console.log('Final orderData before payment:', orderData);

        // Save order to localStorage for admin dashboard (immediately save with pending status)
        try {
            let existingOrders = JSON.parse(localStorage.getItem('customerOrders')) || [];
            existingOrders.push({
                ...orderData,
                isRealCustomer: true,
                processedAt: new Date().toISOString()
            });
            localStorage.setItem('customerOrders', JSON.stringify(existingOrders));
            console.log('Order saved to localStorage for admin dashboard with PENDING status');
            
            // Show admin notification (in real app, this would be a push notification)
            showMessage('Order placed! Admin will review your order soon.', 'info');
            
        } catch (saveError) {
            console.error('Error saving order to localStorage:', saveError);
        }

        showPaymentSection(orderData);

    } catch (error) {
        console.error('Error in confirmOrder:', error);
        showMessage('Error processing order: ' + error.message, 'error');
    }
}

function generateInstallationDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7); // 7 days from now
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    field.classList.add('is-invalid');
    
    // Remove existing error message
    const existingError = field.parentNode.querySelector('.invalid-feedback');
    if (existingError) {
        existingError.remove();
    }
    
    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.textContent = message;
    field.parentNode.appendChild(errorDiv);
}

function hideError(fieldId) {
    const field = document.getElementById(fieldId);
    field.classList.remove('is-invalid');
    
    // Remove error message
    const errorDiv = field.parentNode.querySelector('.invalid-feedback');
    if (errorDiv) {
        errorDiv.remove();
    }
}

function isValidEmail(email) {
    // Very relaxed email validation - just check for @ and some basic structure
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]*$/;
    return re.test(email);
}

function isValidPhone(phone) {
    const re = /^[6-9]\d{9}$/;
    return re.test(phone);
}

// Test function - add to window for global access
window.openOrderPage = openOrderPage;
window.testOrderPage = function() {
    console.log('Test function called');
    openOrderPage(1, 'Tata Power Solar', 15000);
};

// Open order page with selected solar type
function openOrderPage(solarTypeId, solarTypeName, price) {
    console.log('openOrderPage called with:', { solarTypeId, solarTypeName, price });
    
    try {
        if (!requireLoginForOrder({
            reason: 'order_now',
            solarTypeId,
            solarTypeName,
            price
        })) {
            return;
        }

        // Ensure user sees the first step with the selected solar type
        resetOrderFormToStep1();

        // Scroll to solar order section
        const orderSection = document.getElementById('solar-order');
        console.log('Order section found:', !!orderSection);
        
        if (orderSection) {
            orderSection.scrollIntoView({ behavior: 'smooth' });
            console.log('Scrolled to order section');
        }
        
        // Pre-fill solar type in order form
        setTimeout(() => {
            const solarTypeSelect = document.getElementById('solarType');
            console.log('Solar type select found:', !!solarTypeSelect);
            
            if (solarTypeSelect) {
                const desiredId = String(solarTypeId ?? '');
                const desiredName = String(solarTypeName ?? '').trim().toLowerCase();

                // Find and select the option
                const options = solarTypeSelect.options;
                console.log('Available options:', Array.from(options).map(o => ({ text: o.text, value: o.value })));
                
                let matched = false;
                for (let i = 0; i < options.length; i++) {
                    const optText = String(options[i].text || '').trim().toLowerCase();
                    const optValue = String(options[i].value || '');
                    const matchesValue = desiredId && optValue === desiredId;
                    const matchesText = desiredName && (optText === desiredName || optText.startsWith(desiredName));

                    if (matchesValue || matchesText) {
                        solarTypeSelect.selectedIndex = i;
                        console.log('Selected option:', options[i].text);
                        matched = true;
                        break;
                    }
                }
                
                // If not found, add the option
                if (!matched) {
                    const option = new Option(solarTypeName, solarTypeId);
                    solarTypeSelect.add(option);
                    solarTypeSelect.selectedIndex = solarTypeSelect.options.length - 1;
                    console.log('Added new option:', solarTypeName);
                }
                
                // Trigger change event
                solarTypeSelect.dispatchEvent(new Event('change'));
                console.log('Triggered change event');
            }
        }, 500);
        
    } catch (error) {
        console.error('Error opening order page:', error);
        showMessage('Error opening order form', 'error');
    }
}

// Load solar types in display section
async function loadSolarTypes() {
    const container = document.getElementById('solarTypesContainer');
    if (!container) return;
    
    // Show loading state
    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner"></div>
            <p class="mt-3">Loading solar types...</p>
        </div>
    `;
    
    try {
        solarTypes = await BrothersSolarAPI.getSolarTypes();
        container.innerHTML = '';
        
        solarTypes.forEach(type => {
            const card = document.createElement('div');
            card.className = 'col-lg-6 col-md-6 mb-4';
            card.innerHTML = `
                <div class="solar-type-card" onclick="selectSolarType(this, ${type.id})">
                    <div class="text-center">
                        <i class="fas ${type.icon} text-warning" style="font-size: 48px;"></i>
                        <h4>${typeof type.name === 'object' ? type.name.en || type.name.hi || type.name.mr : type.name}</h4>
                        <p class="text-muted">${typeof type.description === 'object' ? type.description.en || type.description.hi || type.description.mr : type.description}</p>
                        <div class="row text-center">
                            <div class="col-4">
                                <strong>Power</strong><br>
                                <span class="text-primary">${type.power}</span>
                            </div>
                            <div class="col-4">
                                <strong>Efficiency</strong><br>
                                <span class="text-success">${type.efficiency}</span>
                            </div>
                            <div class="col-4">
                                <strong>Warranty</strong><br>
                                <span class="text-info">${typeof type.warranty === 'object' ? type.warranty.en : type.warranty}</span>
                            </div>
                        </div>
                        <div class="price mt-3">
                            <strong>₹${type.price.toLocaleString('hi-IN')}</strong>
                            <br>
                            <button class="btn btn-success btn-sm mt-2" onclick="event.stopPropagation(); window.openOrderPage(${type.id}, '${escapeJsString(typeof type.name === 'object' ? (type.name.en || type.name.hi || type.name.mr) : type.name)}', ${type.price})">
                                <i class="fas fa-shopping-cart me-1"></i>Order Now
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading solar types:', error);
        // Use fallback when API fails
        displayFallbackSolarTypes();
    }
}

// Load solar types in order form
async function loadSolarTypesInOrder() {
    const select = document.getElementById('solarType');
    if (!select) {
        console.log('Solar type select not found');
        return;
    }
    
    // Show loading state
    select.innerHTML = `<option value="">Select Type (Loading...)</option>`;
    
    try {
        // Use local solar types data instead of API call
        if (!solarTypes.length) {
            console.log('Using local solar types data');
        }
        
        select.innerHTML = `<option value="">Select Type</option>`;
        
        solarTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            const displayName = typeof type.name === 'object' ? (type.name.en || type.name.hi || type.name.mr) : type.name;
            option.textContent = `${displayName} - ₹${type.price.toLocaleString('hi-IN')}`;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading solar types in order form:', error);
        select.innerHTML = `<option value="">Select Type (Error)</option>`;
    }
}

// Select solar type
function selectSolarType(cardEl, id) {
    selectedSolarType = solarTypes.find(type => type.id === id);
    
    // Update UI
    document.querySelectorAll('.solar-type-card').forEach(card => {
        card.classList.remove('selected');
    });

    if (cardEl && cardEl.classList) {
        cardEl.classList.add('selected');
    }
    
    // Scroll to order section
    const orderSection = document.getElementById('solar-order');
    if (orderSection) {
        orderSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Set the selected type in order form
    const solarTypeSelect = document.getElementById('solarType');
    if (solarTypeSelect) {
        solarTypeSelect.value = id;
    }
}

// Show customer details form
function showCustomerDetails() {
    const solarTypeSelect = document.getElementById('solarType');
    const solarTypeId = solarTypeSelect ? solarTypeSelect.value : null;
    
    if (!solarTypeId) {
        showMessage('Please select solar type', 'error');
        return;
    }
    
    selectedSolarType = solarTypes.find(type => type.id == solarTypeId);
    const customerDetailsForm = document.getElementById('customerDetailsForm');
    if (customerDetailsForm) {
        customerDetailsForm.style.display = 'block';
    }
}

// Bill Calculator
async function calculateBill(e) {
    e.preventDefault();
    
    const monthlyBill = parseFloat(document.getElementById('monthlyBill').value);
    const unitsPerMonth = parseFloat(document.getElementById('unitsPerMonth').value);
    const resultDiv = document.getElementById('billResult');
    if (!resultDiv) return;
    
    // Show loading state
    resultDiv.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner"></div>
            <p class="mt-3">Calculating savings...</p>
        </div>
    `;
    
    try {
        const result = await BrothersSolarAPI.calculateBill(monthlyBill, unitsPerMonth);
        
        const resultHTML = `
            <div class="result-box">
                <h4><i class="fas fa-chart-line"></i> Savings Analysis</h4>
                <div class="result-item">
                    <span>Monthly Savings:</span>
                    <span>₹${result.monthlySavings.toLocaleString('hi-IN')}</span>
                </div>
                <div class="result-item">
                    <span>Yearly Savings:</span>
                    <span>₹${result.yearlySavings.toLocaleString('hi-IN')}</span>
                </div>
                <div class="result-item">
                    <span>20 Year Savings:</span>
                    <span>₹${result.twentyYearSavings.toLocaleString('hi-IN')}</span>
                </div>
                <div class="result-item">
                    <span>Required Solar Capacity:</span>
                    <span>${result.requiredCapacity} kW</span>
                </div>
            </div>
        `;
        
        resultDiv.innerHTML = resultHTML;
        
        // Show advanced analytics
        showAdvancedAnalytics(result, monthlyBill, unitsPerMonth);
        
    } catch (error) {
        console.error('Error calculating bill:', error);
        resultDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error in calculation</p>
            </div>
        `;
    }
}

// Advanced Analytics Functions
let savingsChart, roiChart, performanceChart;

function showAdvancedAnalytics(result, monthlyBill, unitsPerMonth) {
    const analyticsDiv = document.getElementById('advancedAnalytics');
    analyticsDiv.style.display = 'block';
    
    // Destroy existing charts
    if (savingsChart) savingsChart.destroy();
    if (roiChart) roiChart.destroy();
    if (performanceChart) performanceChart.destroy();
    
    // Create Savings Chart
    createSavingsChart(result);
    
    // Create ROI Chart
    createROIChart(result, monthlyBill);
    
    // Create Performance Chart
    createPerformanceChart(result, unitsPerMonth);
    
    // Scroll to analytics
    setTimeout(() => {
        analyticsDiv.scrollIntoView({ behavior: 'smooth' });
    }, 500);
}

function createSavingsChart(result) {
    const ctx = document.getElementById('savingsChart').getContext('2d');
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentBill = Array(12).fill(result.monthlySavings + (result.monthlySavings / 0.8));
    const solarBill = Array(12).fill(result.monthlySavings);
    
    savingsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Without Solar',
                data: currentBill,
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                tension: 0.4
            }, {
                label: 'With Solar',
                data: solarBill,
                borderColor: '#27ae60',
                backgroundColor: 'rgba(39, 174, 96, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Monthly Bill Comparison'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString('hi-IN');
                        }
                    }
                }
            }
        }
    });
}

function createROIChart(result, initialCost) {
    const ctx = document.getElementById('roiChart').getContext('2d');
    
    const years = [];
    const cumulativeSavings = [];
    const netSavings = [];
    
    // Calculate ROI over 10 years
    let cumulative = 0;
    const estimatedCost = result.requiredCapacity * 50000; // Rough estimate
    
    for (let i = 1; i <= 10; i++) {
        years.push(`Year ${i}`);
        cumulative += result.yearlySavings;
        cumulativeSavings.push(cumulative);
        netSavings.push(cumulative - estimatedCost);
    }
    
    roiChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Cumulative Savings',
                data: cumulativeSavings,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4
            }, {
                label: 'Net Savings (After Cost)',
                data: netSavings,
                borderColor: '#f39c12',
                backgroundColor: 'rgba(243, 156, 18, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Return on Investment (10 Years)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString('hi-IN');
                        }
                    }
                }
            }
        }
    });
}

function createPerformanceChart(result, unitsPerMonth) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    const years = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];
    const performance = [];
    const efficiency = [95, 94, 93, 92, 90]; // Slight degradation over years
    
    efficiency.forEach((eff, index) => {
        performance.push((unitsPerMonth * 12 * eff / 100).toFixed(0));
    });
    
    performanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [{
                label: 'Annual Production (kWh)',
                data: performance,
                backgroundColor: [
                    'rgba(46, 204, 113, 0.8)',
                    'rgba(52, 152, 219, 0.8)',
                    'rgba(155, 89, 182, 0.8)',
                    'rgba(241, 196, 15, 0.8)',
                    'rgba(230, 126, 34, 0.8)'
                ],
                borderColor: [
                    'rgba(46, 204, 113, 1)',
                    'rgba(52, 152, 219, 1)',
                    'rgba(155, 89, 182, 1)',
                    'rgba(241, 196, 15, 1)',
                    'rgba(230, 126, 34, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'System Performance Projection'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Energy Production (kWh)'
                    }
                }
            }
        }
    });
}

// Download Advanced Report
async function downloadAdvancedReport() {
    try {
        const jsPDF = await loadPDFLibrary();
        const doc = new jsPDF();
        
        // Get current calculation results
        const resultDiv = document.getElementById('billResult');
        const resultText = resultDiv.textContent;
        
        // PDF Content
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let yPosition = margin;
        
        // Header
        doc.setFontSize(24);
        doc.setTextColor(30, 81, 40);
        doc.text('Brothers Solar', pageWidth / 2, yPosition, { align: 'center' });
        
        yPosition += 15;
        doc.setFontSize(18);
        doc.text('Advanced Solar Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
        
        yPosition += 20;
        doc.setFontSize(12);
        doc.text(`Date: ${new Date().toLocaleDateString('hi-IN')}`, pageWidth / 2, yPosition, { align: 'center' });
        
        yPosition += 30;
        doc.setFontSize(14);
        doc.text('Analysis Results:', margin, yPosition);
        
        yPosition += 15;
        doc.setFontSize(10);
        const results = resultText.split('\n');
        results.forEach(line => {
            if (line.trim()) {
                doc.text(line, margin, yPosition);
                yPosition += 8;
            }
        });
        
        // Add charts as images (simplified)
        yPosition += 20;
        doc.text('Charts and visualizations are available in the web application.', margin, yPosition);
        
        // Save the PDF
        const filename = `Brothers_Solar_Analysis_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        
    } catch (error) {
        console.error('Error generating report:', error);
        showMessage('Error generating report', 'error');
    }
}

// Contact Form Handler
async function handleContactForm(e) {
    e.preventDefault();
    
    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const phone = document.getElementById('contactPhone').value;
    const subject = document.getElementById('contactSubject').value;
    const message = document.getElementById('contactMessage').value;
    const resultDiv = document.getElementById('contactResult');
    if (!resultDiv) return;
    
    // Show loading
    resultDiv.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner"></div>
            <p>Sending message...</p>
        </div>
    `;
    
    try {
        // Simulate sending (in production, this would be an API call)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        resultDiv.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i>
                <p>Your message has been sent successfully. We will contact you soon.</p>
            </div>
        `;
        
        // Reset form
        document.getElementById('contactForm').reset();
        
    } catch (error) {
        console.error('Error submitting contact form:', error);
        resultDiv.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error sending message. Please try again.</p>
            </div>
        `;
    }
}

// Solar Calculator
async function calculateSolar(e) {
    e.preventDefault();
    
    const roofArea = parseFloat(document.getElementById('roofArea').value);
    const dailyUsage = parseFloat(document.getElementById('dailyUsage').value);
    const sunlightHours = parseFloat(document.getElementById('sunlightHours').value);
    const resultDiv = document.getElementById('solarResult');
    if (!resultDiv) return;
    
    // Show loading state
    resultDiv.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner"></div>
            <p>Calculating solar system...</p>
        </div>
    `;
    
    try {
        const result = await BrothersSolarAPI.calculateSolar(roofArea, dailyUsage, sunlightHours);
        
        const resultHTML = `
            <div class="result-box">
                <h4><i class="fas fa-solar-panel"></i> Solar System Details</h4>
                <div class="result-item">
                    <span>Required Panels:</span>
                    <span>${result.panelsNeeded} panels</span>
                </div>
                <div class="result-item">
                    <span>Total Capacity:</span>
                    <span>${result.totalCapacity} kW</span>
                </div>
                <div class="result-item">
                    <span>Required Area:</span>
                    <span>${result.areaRequired} sq ft</span>
                </div>
                <div class="result-item">
                    <span>Estimated Cost:</span>
                    <span>₹${result.estimatedCost.toLocaleString('hi-IN')}</span>
                </div>
                <div class="result-item">
                    <span>Roof Available:</span>
                    <span>${result.roofAvailable ? '✅ Sufficient' : '❌ Insufficient'}</span>
                </div>
            </div>
        `;
        
        resultDiv.innerHTML = resultHTML;
    } catch (error) {
        console.error('Error calculating solar:', error);
        resultDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error calculating solar</p>
            </div>
        `;
    }
}

// Submit customer details
async function submitCustomerDetails(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    
    const currentUser = getCurrentUser();
    const customerData = {
        name: document.getElementById('customerName').value || '',
        email: document.getElementById('customerEmail').value || '',
        phone: document.getElementById('customerPhone').value || '',
        address: document.getElementById('customerAddress').value || '',
        solarType: selectedSolarType ? selectedSolarType.name : '',
        solarTypeId: selectedSolarType ? selectedSolarType.id : null,
        quantity: parseInt(document.getElementById('quantity').value) || 0,
        price: selectedSolarType ? selectedSolarType.price : 0,
        totalAmount: selectedSolarType ? selectedSolarType.price * parseInt(document.getElementById('quantity').value) : 0,
        installationDate: generateInstallationDate(),
        userId: currentUser ? currentUser.id : null, // Link to logged-in user
        paymentStatus: 'pending',
        orderDate: new Date().toLocaleDateString('hi-IN'),
        createdAt: new Date().toISOString()
    };
    
    // Validate customer data before proceeding
    if (!customerData.name || customerData.name.trim() === '') {
        showMessage('Please enter your full name', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return;
    }
    
    if (!customerData.email || customerData.email.trim() === '') {
        showMessage('Please enter your email address', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return;
    }
    
    if (!customerData.phone || customerData.phone.trim() === '') {
        showMessage('Please enter your phone number', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return;
    }
    
    if (!customerData.address || customerData.address.trim() === '') {
        showMessage('Please enter your address', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return;
    }
    
    if (!selectedSolarType) {
        showMessage('Please select a solar panel type', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return;
    }
    
    if (!customerData.quantity || customerData.quantity < 1) {
        showMessage('Please enter a valid quantity', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return;
    }
    
    try {
        // Check if order already exists
        const existingOrders = JSON.parse(localStorage.getItem('customerOrders')) || [];
        const existingOrder = existingOrders.find(order => 
            order.email === customerData.email && 
            order.phone === customerData.phone && 
            order.solarType === customerData.solarType &&
            order.status !== 'completed'
        );
        
        if (existingOrder) {
            showMessage('You already have a pending order. Please complete the payment first.', 'warning');
            // Show existing order in payment section
            showPaymentSection(existingOrder);
            return;
        }
        
        // Create order locally instead of API call
        const orderId = 'ORD' + Date.now();
        customerData.orderId = orderId;
        customerData.status = 'pending'; // Set initial status
        customerData.isRealCustomer = true; // Mark as real customer
        
        // Save order to localStorage (not sending to backend yet)
        existingOrders.push(customerData);
        localStorage.setItem('customerOrders', JSON.stringify(existingOrders));
        
        // Set global orderData for payment processing
        orderData = customerData;
        
        console.log('Real customer order created:', customerData);
        
        // Show payment section
        showPaymentSection(customerData);
    } catch (error) {
        console.error('Error submitting customer details:', error);
        showMessage('Error submitting order', 'error');
    } finally {
        // Reset button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Generate installation date (7-14 days from now)
function generateInstallationDate() {
    const days = Math.floor(Math.random() * 8) + 7; // 7-14 days
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Show Payment Section
function showPaymentSection(customerData) {
    console.log('showPaymentSection called with:', customerData);
    
    // Show payment section
    const paymentSectionElement = document.getElementById('payment-section');
    if (paymentSectionElement) {
        paymentSectionElement.style.display = 'block';
        console.log('Payment section shown');
        
        // Show order summary
        const summaryHTML = `
            <div class="result-box">
                <h4><i class="fas fa-shopping-cart"></i> Order Summary</h4>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> Please complete the payment to confirm your order.
                </div>
                <div class="result-item">
                    <span>Customer Name:</span>
                    <span>${customerData.name || 'N/A'}</span>
                </div>
                <div class="result-item">
                    <span>Solar Type:</span>
                    <span>${customerData.solarType || 'N/A'}</span>
                </div>
                <div class="result-item">
                    <span>Quantity:</span>
                    <span>${customerData.quantity || 0}</span>
                </div>
                <div class="result-item">
                    <span>Total Amount:</span>
                    <span>₹${(customerData.totalAmount || 0).toLocaleString('hi-IN')}</span>
                </div>
            </div>
        `;
        const summaryDiv = document.getElementById('paymentOrderSummary');
        if (summaryDiv) {
            summaryDiv.innerHTML = summaryHTML;
            console.log('Order summary updated');
        } else {
            console.error('paymentOrderSummary element not found!');
        }
        
        // Scroll to payment section
        paymentSectionElement.scrollIntoView({ behavior: 'smooth' });
        console.log('Scrolled to payment section');
    } else {
        console.error('payment-section element not found!');
    }
}

// Payment Gateway Functions

// Handle payment method change
document.addEventListener('DOMContentLoaded', function() {
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    const paymentForms = document.querySelectorAll('.payment-form');
    const payNowBtn = document.getElementById('payNowBtn');
    
    paymentMethods.forEach(method => {
        method.addEventListener('change', function() {
            // Hide all payment forms
            paymentForms.forEach(form => form.style.display = 'none');
            
            // Show selected payment form
            const selectedMethod = this.value;
            const selectedForm = document.getElementById(selectedMethod + 'Info');
            if (selectedForm) {
                selectedForm.style.display = 'block';
            }
            
            // Always show Pay Now button
            if (payNowBtn) {
                payNowBtn.style.display = 'block';
            }
        });
    });
});

// Razorpay Payment Functions
let razorpayOrder = null;

async function initRazorpayPayment(orderData) {
    try {
        showMessage('Initializing payment...', 'info');
        
        // Get Razorpay key
        const keyResponse = await fetch(`${PAYMENT_API_BASE}/payment/key`);
        const keyData = await keyResponse.json();
        
        if (!keyData.success) {
            throw new Error('Failed to get payment key');
        }
        
        // Create Razorpay order
        const orderResponse = await fetch(`${PAYMENT_API_BASE}/payment/create-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: orderData.totalAmount,
                currency: 'INR',
                receipt: orderData.orderId,
                notes: {
                    customerName: orderData.name,
                    customerEmail: orderData.email,
                    solarType: orderData.solarType
                }
            })
        });
        
        const orderResult = await orderResponse.json();
        
        if (!orderResult.success) {
            throw new Error(orderResult.message || 'Failed to create payment order');
        }
        
        razorpayOrder = orderResult.data;
        
        // Initialize Razorpay checkout
        const options = {
            key: keyData.data.key,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            name: 'Brothers Solar',
            description: 'Payment for ' + orderData.solarType,
            order_id: razorpayOrder.orderId,
            handler: function (response) {
                // Payment successful
                verifyRazorpayPayment(response, orderData);
            },
            prefill: {
                name: orderData.name,
                email: orderData.email,
                contact: orderData.phone
            },
            notes: {
                address: orderData.address,
                solarType: orderData.solarType
            },
            theme: {
                color: '#22c55e'
            },
            modal: {
                ondismiss: function() {
                    showMessage('Payment cancelled', 'warning');
                }
            }
        };
        
        const rzp = new Razorpay(options);
        rzp.open();
        
    } catch (error) {
        console.error('Error initializing Razorpay payment:', error);
        showMessage('Payment initialization failed: ' + error.message, 'error');
    }
}

async function verifyRazorpayPayment(response, orderData) {
    try {
        showMessage('Verifying payment...', 'info');
        
        const verifyResponse = await fetch(`${PAYMENT_API_BASE}/payment/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderData: {
                    ...orderData,
                    paymentMethod: 'Razorpay',
                    paymentStatus: 'completed',
                    status: 'confirmed',
                    paymentCompletedAt: new Date().toISOString(),
                    processedAt: new Date().toISOString(),
                    orderDate: new Date().toLocaleDateString('hi-IN'),
                    installationDate: generateInstallationDate(),
                    isRealCustomer: true
                }
            })
        });
        
        const verifyResult = await verifyResponse.json();
        
        if (verifyResult.success) {
            // Update order data
            orderData.paymentMethod = 'Razorpay';
            orderData.paymentStatus = 'completed';
            orderData.status = 'confirmed';
            orderData.processedAt = new Date().toISOString();
            orderData.orderDate = new Date().toLocaleDateString('hi-IN');
            orderData.installationDate = generateInstallationDate();
            orderData.paymentDetails = {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                paymentCompletedAt: new Date().toISOString()
            };
            
            // Store customer data
            const customerData = {
                name: orderData.name,
                email: orderData.email,
                phone: orderData.phone,
                address: orderData.address,
                orderId: orderData.orderId
            };
            localStorage.setItem('customerData', JSON.stringify(customerData));
            
            // Update customer name in navigation
            const customerNameElement = document.getElementById('customerName');
            if (customerNameElement) {
                customerNameElement.textContent = orderData.name;
            }
            
            // Mark step 4 as completed
            const step4 = document.getElementById('step4');
            if (step4) {
                step4.classList.remove('active');
                step4.classList.add('completed');
            }
            
            showMessage(`Payment successful! Order ID: ${orderData.orderId}. Track your order in customer dashboard.`, 'success');
            
            // Save order to localStorage for admin dashboard
            try {
                let existingOrders = JSON.parse(localStorage.getItem('customerOrders')) || [];
                existingOrders.push({
                    ...orderData,
                    createdAt: new Date().toISOString(),
                    userId: getCurrentUser()?.id || null
                });
                localStorage.setItem('customerOrders', JSON.stringify(existingOrders));
                console.log('Order saved to localStorage for admin dashboard');
            } catch (error) {
                console.error('Error saving order to localStorage:', error);
            }
            
            // Redirect to customer dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = 'customer.html';
            }, 2000);
            
            showInstallationConfirmation(orderData);
        } else {
            showMessage('Payment verification failed: ' + verifyResult.message, 'error');
        }
        
    } catch (error) {
        console.error('Error verifying Razorpay payment:', error);
        showMessage('Payment verification failed: ' + error.message, 'error');
    }
}

// Send order to backend
async function sendOrderToBackend(orderData) {
    try {
        const response = await fetch('http://localhost:3002/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: orderData.name,
                email: orderData.email,
                phone: orderData.phone,
                address: orderData.address,
                solarType: orderData.solarType,
                solarTypeId: orderData.solarTypeId,
                quantity: orderData.quantity,
                price: orderData.price,
                totalAmount: orderData.totalAmount,
                installationDate: orderData.installationDate,
                paymentMethod: orderData.paymentMethod,
                paymentStatus: orderData.paymentStatus,
                paymentDetails: orderData.paymentDetails
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Order sent to backend successfully:', result);
            showMessage('Order saved to backend successfully!', 'success');
        } else {
            console.error('Backend error:', result.message);
            showMessage('Backend error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error sending order to backend:', error);
        showMessage('Backend connection error. Order saved locally.', 'warning');
    }
}

// Format card number input
document.addEventListener('DOMContentLoaded', function() {
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });
    }
    
    // Format expiry date input
    const cardExpiryInput = document.getElementById('cardExpiry');
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            e.target.value = value;
        });
    }
});

// Process Payment (Updated for COD and Razorpay)
async function processPayment() {
    const paymentMethodElement = document.querySelector('input[name="paymentMethod"]:checked');
    
    if (!paymentMethodElement) {
        showMessage('Please select a payment method', 'error');
        return;
    }
    
    const paymentMethod = paymentMethodElement.value;
    
    // Create order ID if not exists
    if (!orderData.orderId) {
        orderData.orderId = 'ORD' + Date.now();
    }
    
    // If COD, process directly
    if (paymentMethod === 'cod') {
        try {
            showMessage('Processing Cash on Delivery order...', 'info');
            
            // Mark step 4 as completed
            const step4 = document.getElementById('step4');
            if (step4) {
                step4.classList.remove('active');
                step4.classList.add('completed');
            }
            
            // Store payment method
            orderData.paymentMethod = 'Cash on Delivery';
            orderData.paymentStatus = 'pending';
            orderData.status = 'confirmed';
            orderData.paymentCompletedAt = new Date().toISOString();
            orderData.isRealCustomer = true;
            orderData.processedAt = new Date().toISOString();
            orderData.orderDate = new Date().toLocaleDateString('hi-IN');
            orderData.installationDate = generateInstallationDate();
            
            // Send order to backend
            sendOrderToBackend(orderData);
            
            // Update existing order in localStorage
            const existingOrders = JSON.parse(localStorage.getItem('customerOrders')) || [];
            const orderIndex = existingOrders.findIndex(order => order.orderId === orderData.orderId);
            
            if (orderIndex !== -1) {
                existingOrders[orderIndex] = orderData;
            } else {
                existingOrders.push(orderData);
            }
            
            localStorage.setItem('customerOrders', JSON.stringify(existingOrders));
            
            console.log('COD payment processed:', orderData);
            
            // Store customer data for dashboard access
            const customerData = {
                name: orderData.name,
                email: orderData.email,
                phone: orderData.phone,
                address: orderData.address,
                orderId: orderData.orderId
            };
            localStorage.setItem('customerData', JSON.stringify(customerData));
            
            // Update customer name in navigation
            const customerNameElement = document.getElementById('customerName');
            if (customerNameElement) {
                customerNameElement.textContent = orderData.name;
            }
            
            // Show success message
            showMessage(`Order confirmed! Order ID: ${orderData.orderId}. Track your order in customer dashboard.`, 'success');
            
            // Redirect to customer dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = 'customer.html';
            }, 2000);
            
            // Show installation confirmation
            showInstallationConfirmation(orderData);
            
        } catch (error) {
            console.error('Error processing COD payment:', error);
            showMessage('Error processing payment', 'error');
        }
    } else if (paymentMethod === 'razorpay') {
        // Initialize Razorpay payment
        await initRazorpayPayment(orderData);
    } else {
        showMessage('Please select a valid payment method', 'error');
    }
}

// Show installation confirmation
function showInstallationConfirmation(customerData) {
    // Hide payment section
    const paymentSectionElement = document.getElementById('payment-section');
    if (paymentSectionElement) {
        paymentSectionElement.style.display = 'none';
    }
    
    // Show installation section
    const installationSectionElement = document.getElementById('installation-section');
    if (installationSectionElement) {
        installationSectionElement.style.display = 'block';
    }
    
    const installationHTML = `
        <div class="result-box">
            <h4><i class="fas fa-calendar-check"></i> Installation Details</h4>
            <div class="result-item">
                <span>Order ID:</span>
                <span>${customerData.orderId}</span>
            </div>
            <div class="result-item">
                <span>Customer Name:</span>
                <span>${customerData.name}</span>
            </div>
            <div class="result-item">
                <span>Email:</span>
                <span>${customerData.email}</span>
            </div>
            <div class="result-item">
                <span>Phone:</span>
                <span>${customerData.phone}</span>
            </div>
            <div class="result-item">
                <span>Address:</span>
                <span>${customerData.address}</span>
            </div>
            <div class="result-item">
                <span>Installation Date:</span>
                <span>${customerData.installationDate}</span>
            </div>
            <div class="result-item">
                <span>Installation Time:</span>
                <span>9:00 AM - 5:00 PM</span>
            </div>
            <div class="result-item">
                <span>Status:</span>
                <span class="text-success">✅ Confirmed</span>
            </div>
        </div>
        <div class="mt-3">
            <p class="text-muted">Our team will visit your address to install solar panels on the scheduled date. Please contact us for any questions.</p>
            <div class="mt-3">
                <a href="customer.html" class="btn btn-primary">
                    <i class="fas fa-tachometer-alt"></i> Track Your Order
                </a>
                <a href="index.html" class="btn btn-secondary ms-2">
                    <i class="fas fa-home"></i> Back to Home
                </a>
            </div>
        </div>
    `;
    
    const installationDetailsDiv = document.getElementById('installationDetails');
    if (installationDetailsDiv) {
        installationDetailsDiv.innerHTML = installationHTML;
    }
    
    // Add PDF invoice download button
    if (window.PDFInvoice && window.PDFInvoice.addInvoiceDownloadButton) {
        window.PDFInvoice.addInvoiceDownloadButton(customerData);
    }
    
    // Scroll to installation section
    const installationSectionScroll = document.getElementById('installation-section');
    if (installationSectionScroll) {
        installationSectionScroll.scrollIntoView({ behavior: 'smooth' });
    }
}

// Admin login
function adminLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    // Simple authentication (in production, use proper authentication)
    if (username === 'admin' && password === 'admin123') {
        document.getElementById('admin').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        loadCustomerOrders();
    } else {
        showMessage('Invalid username or password', 'error');
    }
}

// Load customer orders in admin dashboard
function loadCustomerOrders() {
    const tableBody = document.getElementById('customerOrdersTable');
    tableBody.innerHTML = '';
    
    if (customerOrders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No orders found</td></tr>';
        return;
    }
    
    customerOrders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.orderId}</td>
            <td>${order.name}</td>
            <td>${order.phone}</td>
            <td>${order.solarType}</td>
            <td>${order.quantity}</td>
            <td>₹${order.totalAmount.toLocaleString('hi-IN')}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(order.status)}">
                    ${getStatusText(order.status)}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editOrder('${order.orderId}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteOrder('${order.orderId}')">
                    <i class="fas fa-trash"></i>
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

// Get status text in English
function getStatusText(status) {
    switch(status) {
        case 'pending': return 'Pending';
        case 'confirmed': return 'Confirmed';
        case 'completed': return 'Completed';
        default: return 'Unknown';
    }
}

// Edit order
function editOrder(orderId) {
    const order = customerOrders.find(o => o.orderId === orderId);
    if (!order) return;
    
    // Simple edit - just change status
    const newStatus = prompt('Choose new status (pending, confirmed, completed):', order.status);
    if (newStatus && ['pending', 'confirmed', 'completed'].includes(newStatus)) {
        order.status = newStatus;
        localStorage.setItem('customerOrders', JSON.stringify(customerOrders));
        loadCustomerOrders();
        showMessage('Order updated', 'success');
    }
}

// Delete order
function deleteOrder(orderId) {
    if (confirm('Are you sure you want to delete this order?')) {
        customerOrders = customerOrders.filter(order => order.orderId !== orderId);
        localStorage.setItem('customerOrders', JSON.stringify(customerOrders));
        loadCustomerOrders();
        showMessage('Order deleted', 'success');
    }
}

// Logout admin
function logoutAdmin() {
    document.getElementById('admin-dashboard').style.display = 'none';
    document.getElementById('admin').style.display = 'block';
    document.getElementById('adminLoginForm').reset();
}

// Show message
function showMessage(message, type) {
    console.log('showMessage called:', message, type);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.textContent = message;
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.zIndex = '9999';
    messageDiv.style.padding = '15px 20px';
    messageDiv.style.borderRadius = '10px';
    messageDiv.style.maxWidth = '300px';
    messageDiv.style.fontSize = '14px';
    messageDiv.style.fontWeight = 'bold';
    messageDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    
    // Set colors based on type
    switch(type) {
        case 'error':
            messageDiv.style.backgroundColor = '#dc3545';
            messageDiv.style.color = 'white';
            break;
        case 'success':
            messageDiv.style.backgroundColor = '#28a745';
            messageDiv.style.color = 'white';
            break;
        case 'warning':
            messageDiv.style.backgroundColor = '#ffc107';
            messageDiv.style.color = 'black';
            break;
        default:
            messageDiv.style.backgroundColor = '#17a2b8';
            messageDiv.style.color = 'white';
    }
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

// Observe sections for animation
function observeSections() {
    if (typeof IntersectionObserver === 'undefined') {
        document.querySelectorAll('section').forEach(section => {
            section.classList.add('visible');
        });
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });
    
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
}

// Gallery Functions
let currentGalleryFilter = 'all';

function getGalleryItems() {
    try {
        const existing = JSON.parse(localStorage.getItem('galleryItems'));
        if (Array.isArray(existing) && existing.length > 0) return existing;
    } catch (_) {}

    const seeded = [
        {
            id: 1,
            category: 'residential',
            title: 'Mumbai Residential Solar Installation',
            description: '3KW Solar System',
            image: 'https://picsum.photos/id/1069/800/600'
        },
        {
            id: 2,
            category: 'commercial',
            title: 'Pune Office Solar Panels',
            description: '5KW Commercial System',
            image: 'https://picsum.photos/id/1011/800/600'
        },
        {
            id: 3,
            category: 'industrial',
            title: 'Ahmedabad Factory Solar',
            description: '10KW Industrial System',
            image: 'https://picsum.photos/id/1008/800/600'
        },
        {
            id: 4,
            category: 'residential',
            title: 'Hyderabad Residential Solar',
            description: '6KW Residential System',
            image: 'https://picsum.photos/id/1025/800/600'
        },
        {
            id: 5,
            category: 'commercial',
            title: 'Bangalore Shop Solar',
            description: '4KW Commercial System',
            image: 'https://picsum.photos/id/1031/800/600'
        },
        {
            id: 6,
            category: 'residential',
            title: 'Kolkata Residential Solar',
            description: '1.5KW Residential System',
            image: 'https://picsum.photos/id/1036/800/600'
        },
        {
            id: 7,
            category: 'industrial',
            title: 'Chennai Industrial Solar',
            description: '8KW Industrial System',
            image: 'https://picsum.photos/id/1040/800/600'
        },
        {
            id: 8,
            category: 'commercial',
            title: 'Kolkata Restaurant Solar',
            description: '3KW Commercial System',
            image: 'https://picsum.photos/id/1043/800/600'
        }
    ];

    try {
        localStorage.setItem('galleryItems', JSON.stringify(seeded));
    } catch (_) {}

    return seeded;
}

function loadGallery() {
    const container = document.getElementById('galleryContainer');
    if (!container) return;

    const galleryItems = getGalleryItems();
    renderGallery(galleryItems);
}

function renderGallery(items) {
    const container = document.getElementById('galleryContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const filteredItems = currentGalleryFilter === 'all' 
        ? items 
        : items.filter(item => item.category === currentGalleryFilter);
    
    filteredItems.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col-lg-4 col-md-6 mb-4';
        col.innerHTML = `
            <div class="gallery-item" onclick="openLightbox('${item.image}', '${item.title}', '${item.description}')">
                <img src="${item.image}" alt="${item.title}">
                <div class="gallery-badge">${getCategoryLabel(item.category)}</div>
                <div class="gallery-overlay">
                    <div class="gallery-info">
                        <h4>${item.title}</h4>
                        <p>${item.description}</p>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(col);
    });
}

function getCategoryLabel(category) {
    const labels = {
        'residential': 'Residential',
        'commercial': 'Commercial',
        'industrial': 'Industrial'
    };
    return labels[category] || category;
}

function filterGallery(category, btnEl) {
    currentGalleryFilter = category;
    
    // Update button states
    document.querySelectorAll('.btn-outline-primary').forEach(btn => {
        btn.classList.remove('active');
    });

    if (btnEl && btnEl.classList) {
        btnEl.classList.add('active');
    } else {
        const match = document.querySelector(`.btn-outline-primary[data-category="${category}"]`);
        if (match) match.classList.add('active');
    }
    
    // Re-render gallery
    loadGallery();
}

function openLightbox(imageSrc, title, description) {
    const lightbox = document.getElementById('galleryLightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxCaption = document.getElementById('lightboxCaption');
    
    lightboxImage.src = imageSrc;
    lightboxCaption.innerHTML = `<h4>${title}</h4><p>${description}</p>`;
    lightbox.style.display = 'block';
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lightbox = document.getElementById('galleryLightbox');
    lightbox.style.display = 'none';
    
    // Restore body scroll
    document.body.style.overflow = 'auto';
}

// Close lightbox on ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeLightbox();
    }
});

// Customer login functionality
function customerLogin(email, phone) {
    const customerData = {
        name: email.split('@')[0], // Extract name from email
        email: email,
        phone: phone,
        address: 'Default Address',
        loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('customerData', JSON.stringify(customerData));
    document.getElementById('customerName').textContent = customerData.name;
    
    showMessage('Login successful', 'success');
}

// Customer logout
function logoutCustomer() {
    localStorage.removeItem('customerData');
    localStorage.removeItem('customerOrders');
    document.getElementById('customerName').textContent = 'Customer';
    
    // Redirect to home
    window.location.href = 'index.html';
}

// Check if customer is logged in
function isCustomerLoggedIn() {
    return localStorage.getItem('customerData') !== null;
}

// Reviews Management Functions

// Load and display reviews on home page
async function loadReviews() {
    try {
        const container = document.getElementById('reviewsContainer');
        if (!container) return;

        // Show loading state
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading reviews...</span>
                </div>
                <p class="mt-2 text-muted">Loading customer reviews...</p>
            </div>
        `;

        let reviews = [];
        let apiCompleted = false;

        // Try API first with a hard timeout
        const apiPromise = new Promise(async (resolve) => {
            try {
                const response = await fetch(`${API_BASE}/reviews`);
                
                if (response.ok && response.status !== 503) {
                    const result = await response.json();
                    if (result.success && result.data && result.data.length > 0) {
                        reviews = result.data;
                    }
                }
            } catch (e) {
                console.log('API fetch failed:', e);
            }
            apiCompleted = true;
            resolve();
        });

        // Hard timeout - max 2 seconds for API
        const timeoutPromise = new Promise(resolve => {
            setTimeout(() => {
                if (!apiCompleted) {
                    console.log('API timeout - using localStorage');
                }
                resolve();
            }, 2000);
        });

        // Race between API and timeout
        await Promise.race([apiPromise, timeoutPromise]);

        // Fallback to localStorage if API failed or returned no reviews
        if (reviews.length === 0) {
            try {
                const localReviews = JSON.parse(localStorage.getItem('customerReviews') || '[]');
                // Filter only approved reviews
                reviews = localReviews.filter(r => r.approved === true || r.status === 'approved');
                console.log('Loaded from localStorage:', reviews.length);
            } catch (localError) {
                console.log('Error reading localStorage:', localError);
            }
        }

        // Display reviews if found
        if (reviews.length > 0) {
            displayReviews(reviews);
            return;
        }

        // Fallback - show no reviews message
        container.innerHTML = `
            <div class="col-12 text-center">
                <i class="fas fa-star text-muted" style="font-size: 48px;"></i>
                <h5 class="mt-3">No Reviews Yet</h5>
                <p class="text-muted">Be the first customer to share your solar experience with Brothers Solar!</p>
                <p class="small text-info">Only verified customers can leave reviews</p>
                <button class="btn btn-primary mt-3" onclick="loadReviews()">Retry</button>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading reviews:', error);
        const container = document.getElementById('reviewsContainer');
        if (container) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <i class="fas fa-exclamation-triangle text-warning" style="font-size: 48px;"></i>
                    <p class="mt-3 text-muted">Unable to load reviews at the moment.</p>
                    <button class="btn btn-primary" onclick="loadReviews()">Retry</button>
                </div>
            `;
        }
    }
}

// Display reviews on home page - Professional Style
function displayReviews(reviews) {
    const container = document.getElementById('reviewsContainer');
    if (!container) return;

    const reviewsHtml = reviews.map(review => {
        const initials = (review.customerName || 'A').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        return `
        <div class="col-lg-4 col-md-6 mb-4">
            <div class="card h-100 border-0 shadow-lg hover-shadow transition-all" style="border-radius: 20px; background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);">
                <div class="card-body p-4 position-relative">
                    <!-- Quote Icon -->
                    <div class="position-absolute" style="top: 20px; right: 20px; opacity: 0.1;">
                        <i class="fas fa-quote-right fa-3x text-primary"></i>
                    </div>
                    
                    <!-- User Profile Section -->
                    <div class="d-flex align-items-center mb-3">
                        <div class="rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" 
                             style="width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: bold; font-size: 20px;">
                            ${initials}
                        </div>
                        <div>
                            <h6 class="mb-1 fw-bold text-dark" style="font-size: 1.1rem;">${review.customerName || 'Anonymous'}</h6>
                            <small class="text-muted">
                                <i class="far fa-calendar-alt me-1"></i>${formatReviewDate(review.createdAt)}
                            </small>
                        </div>
                    </div>
                    
                    <!-- Star Rating -->
                    <div class="mb-3">
                        ${generateStarRating(review.rating)}
                        <span class="ms-2 badge bg-warning text-dark">${review.rating}/5</span>
                    </div>
                    
                    <!-- Review Comment -->
                    <div class="position-relative mb-3">
                        <p class="card-text text-secondary fst-italic" style="line-height: 1.6; font-size: 0.95rem;">
                            "${review.comment || 'Great service!'}"
                        </p>
                    </div>
                    
                    <!-- Verified Badge -->
                    ${review.verifiedOrder ? `
                    <div class="d-flex align-items-center mt-auto pt-3 border-top">
                        <span class="badge bg-success bg-opacity-10 text-success border border-success">
                            <i class="fas fa-check-circle me-1"></i>Verified Customer
                        </span>
                        <small class="text-muted ms-auto">
                            <i class="fas fa-shopping-bag me-1"></i>Order #${(review.orderId || '').slice(-4)}
                        </small>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `}).join('');

    // Add professional header if reviews exist
    const headerHtml = reviews.length > 0 ? `
        <div class="col-12 text-center mb-4">
            <h3 class="fw-bold text-primary mb-2">
                <i class="fas fa-comments me-2"></i>Customer Testimonials
            </h3>
            <p class="text-muted">See what our satisfied customers have to say</p>
            <div class="d-flex justify-content-center align-items-center gap-2 mb-3">
                <span class="badge bg-warning text-dark fs-6">
                    <i class="fas fa-star me-1"></i>${(reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)}
                </span>
                <span class="text-muted">Average Rating</span>
                <span class="badge bg-primary fs-6">${reviews.length} Reviews</span>
            </div>
        </div>
    ` : '';

    container.innerHTML = headerHtml + reviewsHtml || `
        <div class="col-12 text-center">
            <p class="text-muted">No reviews available yet.</p>
        </div>
    `;
}

// Generate star rating HTML (same as admin)
function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '';
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            stars += '<i class="fas fa-star text-warning"></i>';
        } else if (i === fullStars + 1 && hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt text-warning"></i>';
        } else {
            stars += '<i class="far fa-star text-warning"></i>';
        }
    }
    
    return stars;
}

// Format review date
function formatReviewDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// Update customer name in navigation
function updateCustomerName() {
    const customerData = JSON.parse(localStorage.getItem('customerData'));
    if (customerData && document.getElementById('customerName')) {
        document.getElementById('customerName').textContent = customerData.name;
    }
}

// Load initial data safely
async function loadInitialData() {
    try {
        // Load solar types
        if (window.BrothersSolarAPI && typeof BrothersSolarAPI.getSolarTypes === 'function') {
            await BrothersSolarAPI.getSolarTypes();
        }
        
        // Load testimonials
        if (typeof loadTestimonials === 'function') {
            await loadTestimonials();
        }
        
        // Load orders if customer is logged in
        if (isCustomerLoggedIn() && typeof loadCustomerOrders === 'function') {
            await loadCustomerOrders();
        }
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        // Don't show error message on initial load to avoid annoying users
    }
}

// Show message function for notifications
function showMessage(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'position-fixed top-0 end-0 p-3';
    toast.style.zIndex = '9999';
    
    const bgClass = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-info';
    const textClass = type === 'success' ? 'text-white' : type === 'error' ? 'text-white' : 'text-white';
    
    toast.innerHTML = `
        <div class="toast show ${bgClass} ${textClass}" role="alert">
            <div class="toast-header ${bgClass} ${textClass}">
                <strong class="me-auto">${type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info'}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 5000);
}
