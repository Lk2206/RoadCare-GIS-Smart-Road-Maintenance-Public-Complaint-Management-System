// Authentication handling
class AuthManager {
    constructor() {
        this.checkAuth();
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!sessionStorage.getItem('access_token');
    }

    // Get current user
    getCurrentUser() {
        const user = sessionStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    // Check if user has required role
    hasRole(requiredRole) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        if (requiredRole === 'admin') {
            return user.role === 'admin';
        }
        
        // Engineer can access engineer and some admin features
        return ['admin', 'engineer'].includes(user.role);
    }

    // Redirect if not authenticated
    requireAuth(redirectTo = '/login.html') {
        if (!this.isAuthenticated()) {
            window.location.href = redirectTo;
            return false;
        }
        return true;
    }

    // Redirect if not admin
    requireAdmin(redirectTo = '/dashboard.html') {
        if (!this.isAuthenticated()) {
            window.location.href = '/login.html';
            return false;
        }
        
        const user = this.getCurrentUser();
        if (user.role !== 'admin') {
            window.location.href = redirectTo;
            return false;
        }
        
        return true;
    }

    // Check authentication on page load
    checkAuth() {
        const publicPages = ['/login.html', '/', '/index.html'];
        const currentPath = window.location.pathname;
        
        // Check if current page requires authentication
        if (!publicPages.includes(currentPath)) {
            this.requireAuth();
        }
        
        // Update UI based on auth status
        this.updateUI();
    }

    // Update UI based on authentication status
    updateUI() {
        const token = sessionStorage.getItem('access_token');
        const user = this.getCurrentUser();
        
        const authLinks = document.getElementById('auth-links');
        const userMenu = document.getElementById('user-menu');
        const usernameSpan = document.getElementById('username');
        
        if (token && user) {
            if (authLinks) authLinks.classList.add('d-none');
            if (userMenu) {
                userMenu.classList.remove('d-none');
                if (usernameSpan) usernameSpan.textContent = user.username;
            }
            
            // Show/hide admin-only elements
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = user.role === 'admin' ? '' : 'none';
            });
            
            // Show/hide engineer elements
            document.querySelectorAll('.engineer-only').forEach(el => {
                el.style.display = ['admin', 'engineer'].includes(user.role) ? '' : 'none';
            });
        } else {
            if (authLinks) authLinks.classList.remove('d-none');
            if (userMenu) userMenu.classList.add('d-none');
        }
    }

    // Logout
    logout() {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('user');
        window.location.href = '/';
    }
}

// Create global auth manager
const auth = new AuthManager();

// Handle login form submission
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            try {
                const data = await api.login(username, password);
                
                // Store token and user data
                sessionStorage.setItem('access_token', data.access_token);
                sessionStorage.setItem('user', JSON.stringify(data.user));
                
                // Redirect based on role
                if (data.user.role === 'admin') {
                    window.location.href = '/dashboard.html';
                } else {
                    window.location.href = '/map-view.html';
                }
            } catch (error) {
                console.error('Login error:', error);
            }
        });
    }
    
    // Handle registration form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userData = {
                username: document.getElementById('username').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                role: document.getElementById('role').value
            };
            
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (userData.password !== confirmPassword) {
                api.showToast('Passwords do not match', 'error');
                return;
            }
            
            try {
                await api.register(userData);
                window.location.href = '/login.html';
            } catch (error) {
                console.error('Registration error:', error);
            }
        });
    }
}); 
// Make logout function globally available
window.logout = function() {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('user');
    
    // Update UI
    const authLinks = document.getElementById('auth-links');
    const userMenu = document.getElementById('user-menu');
    
    if (authLinks) authLinks.classList.remove('d-none');
    if (userMenu) userMenu.classList.add('d-none');
    
    // Show message
    alert('Logged out successfully');
    
    // Redirect to home
    window.location.href = '/';
};

// Add logout button listener
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});
