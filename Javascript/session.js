class SessionManager {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.currentUser = null;
        this.userProfile = null;
        this.authStateListenerActive = false;
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.warningTimeout = 25 * 60 * 1000; // 25 minutes
        this.sessionWarningShown = false;
        this.heartbeatInterval = null;
        this.activityTimeout = null;
    }

    // Initialize session management
    init() {
        if (this.authStateListenerActive) return Promise.resolve(this.currentUser);
        
        this.authStateListenerActive = true;
        return new Promise((resolve) => {
            this.auth.onAuthStateChanged(async (user) => {
                this.currentUser = user;
                if (user) {
                    await this.loadUserProfile();
                    this.startSessionMonitoring();
                    this.setupActivityListeners();
                    this.updateUIWithUserInfo();
                }
                this.handleAuthStateChange(user);
                resolve(user);
            });
        });
    }

    // Load user profile from Firestore
    async loadUserProfile() {
        if (!this.currentUser) return null;
        
        try {
            const doc = await this.db.collection('users').doc(this.currentUser.uid).get();
            if (doc.exists) {
                this.userProfile = { id: this.currentUser.uid, ...doc.data() };
                this.updateSessionStorage();
                return this.userProfile;
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
        return null;
    }

    // Handle authentication state changes
    handleAuthStateChange(user) {
        if (user) {
            // User is signed in
            console.log('User session active:', user.email);
            this.setUserSession(user);
            this.redirectIfOnAuthPage();
        } else {
            // User is signed out
            console.log('No active session');
            this.clearUserSession();
            this.stopSessionMonitoring();
            this.redirectToAuthIfNeeded();
        }
    }

    // Enhanced session data setting
    setUserSession(user) {
        const sessionData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            lastLoginTime: new Date().toISOString(),
            lastActivity: Date.now(),
            sessionStart: Date.now(),
            userProfile: this.userProfile
        };
        
        // Store in sessionStorage (cleared when browser/tab closes)
        sessionStorage.setItem('wheelzai_user_session', JSON.stringify(sessionData));
        
        // Optional: Store in localStorage for "Remember Me" functionality
        const rememberMe = localStorage.getItem('wheelzai_remember_me') === 'true';
        if (rememberMe) {
            localStorage.setItem('wheelzai_user_session', JSON.stringify(sessionData));
        }
    }

    // Update session storage with latest data
    updateSessionStorage() {
        const sessionData = this.getSessionData();
        if (sessionData && this.currentUser) {
            sessionData.userProfile = this.userProfile;
            sessionData.lastActivity = Date.now();
            
            sessionStorage.setItem('wheelzai_user_session', JSON.stringify(sessionData));
            
            const rememberMe = localStorage.getItem('wheelzai_remember_me') === 'true';
            if (rememberMe) {
                localStorage.setItem('wheelzai_user_session', JSON.stringify(sessionData));
            }
        }
    }

    // Clear user session data
    clearUserSession() {
        sessionStorage.removeItem('wheelzai_user_session');
        localStorage.removeItem('wheelzai_user_session');
        localStorage.removeItem('wheelzai_remember_me');
        this.currentUser = null;
        this.userProfile = null;
    }

    // Get current session data
    getSessionData() {
        try {
            const sessionData = sessionStorage.getItem('wheelzai_user_session') || 
                               localStorage.getItem('wheelzai_user_session');
            return sessionData ? JSON.parse(sessionData) : null;
        } catch (error) {
            console.error('Error parsing session data:', error);
            return null;
        }
    }

    // Enhanced authentication check with session validation
    isAuthenticated() {
        const sessionData = this.getSessionData();
        if (!sessionData || !this.currentUser) {
            return false;
        }

        // Check session timeout
        const now = Date.now();
        const lastActivity = sessionData.lastActivity || 0;
        const timeSinceActivity = now - lastActivity;

        if (timeSinceActivity > this.sessionTimeout) {
            this.handleSessionTimeout();
            return false;
        }

        return true;
    }

    // Update last activity timestamp
    updateLastActivity() {
        const sessionData = this.getSessionData();
        if (sessionData) {
            sessionData.lastActivity = Date.now();
            sessionStorage.setItem('wheelzai_user_session', JSON.stringify(sessionData));
            
            const rememberMe = localStorage.getItem('wheelzai_remember_me') === 'true';
            if (rememberMe) {
                localStorage.setItem('wheelzai_user_session', JSON.stringify(sessionData));
            }
        }
        this.sessionWarningShown = false; // Reset warning flag
    }

    // Set up activity listeners to track user interaction
    setupActivityListeners() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        const throttledUpdate = this.throttle(() => {
            this.updateLastActivity();
        }, 30000); // Update every 30 seconds max

        events.forEach(event => {
            document.addEventListener(event, throttledUpdate, true);
        });

        // Also listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateLastActivity();
            }
        });
    }

    // Throttle function to limit activity updates
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    // Start session monitoring
    startSessionMonitoring() {
        // Clear existing interval
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        // Check session every minute
        this.heartbeatInterval = setInterval(() => {
            this.checkSessionStatus();
        }, 60000);

        // Initial check
        this.checkSessionStatus();
    }

    // Stop session monitoring
    stopSessionMonitoring() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Check session status
    checkSessionStatus() {
        const sessionData = this.getSessionData();
        if (!sessionData || !this.currentUser) {
            this.redirectToAuthIfNeeded();
            return;
        }

        const now = Date.now();
        const lastActivity = sessionData.lastActivity || 0;
        const timeSinceActivity = now - lastActivity;

        // Show warning before session expires
        if (timeSinceActivity > this.warningTimeout && !this.sessionWarningShown) {
            this.showSessionWarning();
        }

        // Handle session timeout
        if (timeSinceActivity > this.sessionTimeout) {
            this.handleSessionTimeout();
        }
    }

    // Show session warning
    showSessionWarning() {
        this.sessionWarningShown = true;
        const timeLeft = Math.ceil((this.sessionTimeout - this.warningTimeout) / 60000);
        
        if (confirm(`Your session will expire in ${timeLeft} minutes due to inactivity. Click OK to extend your session.`)) {
            this.updateLastActivity();
        }
    }

    // Handle session timeout
    handleSessionTimeout() {
        alert('Your session has expired due to inactivity. Please sign in again.');
        this.signOut();
    }

    // Update UI with user information
    updateUIWithUserInfo() {
        try {
            // Update user email display
            const userEmailElements = document.querySelectorAll('.user-email, #userEmail, [data-user-email]');
            userEmailElements.forEach(element => {
                if (element) {
                    element.textContent = this.currentUser.email;
                }
            });

            // Update user name display
            const userName = this.currentUser.displayName || this.userProfile?.name || 'User';
            const userNameElements = document.querySelectorAll('.user-name, #userName, [data-user-name]');
            userNameElements.forEach(element => {
                if (element) {
                    element.textContent = userName;
                }
            });

            // Update welcome messages
            const welcomeElements = document.querySelectorAll('.welcome-message, #welcomeMessage, [data-welcome]');
            welcomeElements.forEach(element => {
                if (element) {
                    element.textContent = `Welcome to Your Dashboard, ${userName}!`;
                }
            });

            // Update "logged in as" messages
            const loggedInElements = document.querySelectorAll('.logged-in-as, #loggedInAs, [data-logged-in]');
            loggedInElements.forEach(element => {
                if (element) {
                    element.textContent = `You are logged in as: ${this.currentUser.email}`;
                }
            });

            // Update profile picture if available
            const profilePicElements = document.querySelectorAll('.user-avatar, #userAvatar, [data-user-avatar]');
            profilePicElements.forEach(element => {
                if (element && this.currentUser.photoURL) {
                    if (element.tagName === 'IMG') {
                        element.src = this.currentUser.photoURL;
                    } else {
                        element.style.backgroundImage = `url(${this.currentUser.photoURL})`;
                    }
                }
            });

        } catch (error) {
            console.error('Error updating UI:', error);
        }
    }

    // Enhanced sign out
    async signOut() {
        try {
            // Stop monitoring
            this.stopSessionMonitoring();
            
            // Clear session data
            this.clearUserSession();
            
            // Sign out from Firebase
            await this.auth.signOut();
            
            // Redirect to login
            window.location.href = '/Wheelz_AI/html/signin.html';
        } catch (error) {
            console.error('Sign out error:', error);
            // Force redirect even if Firebase signout fails
            window.location.href = '/Wheelz_AI/html/signin.html';
        }
    }

    // Redirect logic for auth pages
    redirectIfOnAuthPage() {
        const currentPage = window.location.pathname;
        const authPages = ['/signin.html', '/signup.html', '/forgotpassword.html'];
        
        if (authPages.some(page => currentPage.includes(page))) {
            // User is authenticated but on auth page, redirect to dashboard
            window.location.href = '/Wheelz_AI/html/dashboard.html';
        }
    }

    // Redirect to auth if needed (for protected pages)
    redirectToAuthIfNeeded() {
        const currentPage = window.location.pathname;
        const publicPages = ['/signin.html', '/signup.html', '/forgotpassword.html', '/index.html', '/', '/home.html'];
        
        if (!publicPages.some(page => currentPage.includes(page)) && 
            !currentPage.includes('signin') && 
            !currentPage.includes('signup') &&
            !currentPage.includes('index')) {
            // User is on protected page but not authenticated
            window.location.href = '/Wheelz_AI/html/signin.html';
        }
    }

    // Update user profile in Firestore
    async updateUserProfile(userData) {
        if (!this.currentUser) throw new Error('No authenticated user');
        
        try {
            await this.db.collection('users').doc(this.currentUser.uid).update({
                ...userData,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Reload profile and update session
            await this.loadUserProfile();
            this.updateUIWithUserInfo();
            
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }

    // Get user data from Firestore
    async getUserData() {
        if (!this.currentUser) return null;
        
        try {
            const doc = await this.db.collection('users').doc(this.currentUser.uid).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    }

    // Get complete user session info
    getCurrentUser() {
        return {
            user: this.currentUser,
            profile: this.userProfile,
            session: this.getSessionData()
        };
    }

    // Method to refresh user data across all pages
    async refreshUserData() {
        if (this.currentUser) {
            await this.loadUserProfile();
            this.updateUIWithUserInfo();
        }
    }
}

// ===== GLOBAL SESSION INSTANCE =====
// Create a global session manager instance
let globalSessionManager = null;

// Function to get or create session manager
function getSessionManager() {
    if (!globalSessionManager) {
        globalSessionManager = new SessionManager();
    }
    return globalSessionManager;
}

// ===== DASHBOARD INITIALIZATION SCRIPT =====
// Add this script to your dashboard.html:

document.addEventListener('DOMContentLoaded', async () => {
    // Get global session manager
    const sessionManager = getSessionManager();
    await sessionManager.init();

    // Check authentication
    if (!sessionManager.isAuthenticated()) {
        sessionManager.redirectToAuthIfNeeded();
        return;
    }

    console.log('Dashboard loaded for user:', sessionManager.currentUser?.email);

    // Initialize dashboard functionality
    initializeDashboard(sessionManager);

    // Set up navigation and logout
    setupDashboardNavigation(sessionManager);
});

function initializeDashboard(sessionManager) {
    // Get user data
    const userData = sessionManager.getCurrentUser();
    
    // Update dashboard UI elements
    updateDashboardElements(userData);
    
    // Set up real-time updates if needed
    setupRealtimeUpdates(sessionManager);
}

function updateDashboardElements(userData) {
    // Update any dashboard-specific elements
    const userInfo = userData.user;
    const profile = userData.profile;
    
    // Example: Update dashboard stats, user info, etc.
    console.log('Dashboard updated for:', userInfo?.email);
    
    // You can add specific dashboard UI updates here
}

function setupDashboardNavigation(sessionManager) {
    // Account Details Navigation
    const accountBtn = document.getElementById('accountDetailsBtn') || 
                      document.querySelector('[data-navigate="account"]');
    if (accountBtn) {
        accountBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToPage('/Wheelz_AI/html/account.html');
        });
    }

    // Advertisements Navigation
    const adsBtn = document.getElementById('advertisementsBtn') || 
                  document.querySelector('[data-navigate="advertisements"]');
    if (adsBtn) {
        adsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToPage('/Wheelz_AI/html/advertisements.html');
        });
    }

    // Sell Vehicle Navigation
    const sellBtn = document.getElementById('sellVehicleBtn') || 
                   document.querySelector('[data-navigate="sell"]');
    if (sellBtn) {
        sellBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToPage('/Wheelz_AI/html/sell-vehicle.html');
        });
    }

    // Buy Vehicle Navigation
    const buyBtn = document.getElementById('buyVehicleBtn') || 
                  document.querySelector('[data-navigate="buy"]');
    if (buyBtn) {
        buyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToPage('/Wheelz_AI/html/buy-vehicle.html');
        });
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn') || 
                     document.querySelector('[data-action="logout"]') ||
                     document.querySelector('.logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (confirm('Are you sure you want to logout?')) {
                await sessionManager.signOut();
            }
        });
    }
}

function navigateToPage(url) {
    // You can add loading states here if needed
    window.location.href = url;
}

function setupRealtimeUpdates(sessionManager) {
    // Set up any real-time data updates for dashboard
    // This could include listening to Firestore changes, etc.
}

// ===== PROTECTED PAGE TEMPLATE =====
// Add this script to ALL other protected pages (account.html, advertisements.html, sell-vehicle.html, buy-vehicle.html, etc.):

document.addEventListener('DOMContentLoaded', async () => {
    // Get global session manager
    const sessionManager = getSessionManager();
    
    // If session manager not initialized, initialize it
    if (!sessionManager.authStateListenerActive) {
        await sessionManager.init();
    }

    // Check authentication
    if (!sessionManager.isAuthenticated()) {
        sessionManager.redirectToAuthIfNeeded();
        return;
    }

    console.log('Protected page loaded for user:', sessionManager.currentUser?.email);

    // Initialize page-specific functionality
    initializeProtectedPage(sessionManager);

    // Set up logout functionality for this page
    setupPageLogout(sessionManager);

    // Set up back to dashboard navigation
    setupBackToDashboard();
});

function initializeProtectedPage(sessionManager) {
    // Get user data for this page
    const userData = sessionManager.getCurrentUser();
    
    // Update page-specific UI elements
    sessionManager.updateUIWithUserInfo();
    
    // Add any page-specific initialization here
    console.log('Page initialized for:', userData.user?.email);
}

function setupPageLogout(sessionManager) {
    const logoutElements = document.querySelectorAll(
        '#logoutBtn, .logout-button, [data-action="logout"]'
    );
    
    logoutElements.forEach(logoutBtn => {
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                if (confirm('Are you sure you want to logout?')) {
                    await sessionManager.signOut();
                }
            });
        }
    });
}

function setupBackToDashboard() {
    const dashboardBtns = document.querySelectorAll(
        '#dashboardBtn, .dashboard-button, [data-navigate="dashboard"]'
    );
    
    dashboardBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/Wheelz_AI/html/dashboard.html';
            });
        }
    });
}
