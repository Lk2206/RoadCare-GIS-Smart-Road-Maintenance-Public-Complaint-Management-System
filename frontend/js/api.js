// API Service
const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    // Helper method to get headers with auth token
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        const token = sessionStorage.getItem('access_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }

    // Handle response
    async handleResponse(response) {
        const data = await response.json();
        
        if (!response.ok) {
            const error = data.error || 'An error occurred';
            this.showToast(error, 'error');
            throw new Error(error);
        }
        
        return data;
    }

    // Show toast notification
    showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            // Create toast container if it doesn't exist
            const container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${this.getToastIcon(type)} me-2"></i>
            <span>${message}</span>
        `;
        
        document.querySelector('.toast-container').appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    getToastIcon(type) {
        switch(type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }

    // Show/hide loading spinner
    setLoading(show) {
        const spinner = document.querySelector('.spinner-container');
        if (!spinner) {
            const container = document.createElement('div');
            container.className = 'spinner-container';
            container.innerHTML = '<div class="spinner"></div>';
            document.body.appendChild(container);
        }
        
        if (show) {
            document.querySelector('.spinner-container').classList.add('active');
        } else {
            document.querySelector('.spinner-container')?.classList.remove('active');
        }
    }

    // Auth endpoints
    async login(username, password) {
        this.setLoading(true);
        try {
            const response = await fetch(`${this.baseUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await this.handleResponse(response);
            this.showToast('Login successful!', 'success');
            return data;
        } finally {
            this.setLoading(false);
        }
    }

    async register(userData) {
        this.setLoading(true);
        try {
            const response = await fetch(`${this.baseUrl}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            
            const data = await this.handleResponse(response);
            this.showToast('Registration successful!', 'success');
            return data;
        } finally {
            this.setLoading(false);
        }
    }

    async getProfile() {
        const response = await fetch(`${this.baseUrl}/profile`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }
    
    // User Management endpoints (Admin)
    async getPendingUsers() {
        const response = await fetch(`${this.baseUrl}/users/pending`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }
    
    async approveUser(userId) {
        const response = await fetch(`${this.baseUrl}/users/${userId}/approve`, {
            method: 'POST',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }
    
    async rejectUser(userId) {
        if (!confirm('Are you sure you want to reject and delete this registration?')) {
            return;
        }
        const response = await fetch(`${this.baseUrl}/users/${userId}/reject`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }
    
    async getAllUsers() {
        const response = await fetch(`${this.baseUrl}/users`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    // Roads endpoints
    async getRoads() {
        this.setLoading(true);
        try {
            const response = await fetch(`${this.baseUrl}/roads`);
            return this.handleResponse(response);
        } finally {
            this.setLoading(false);
        }
    }

    async getRoad(roadId) {
        const response = await fetch(`${this.baseUrl}/roads/${roadId}`);
        return this.handleResponse(response);
    }

    async createRoad(roadData) {
        const response = await fetch(`${this.baseUrl}/roads`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(roadData)
        });
        return this.handleResponse(response);
    }

    async updateRoad(roadId, roadData) {
        const response = await fetch(`${this.baseUrl}/roads/${roadId}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(roadData)
        });
        return this.handleResponse(response);
    }

    async deleteRoad(roadId) {
        if (!confirm('Are you sure you want to delete this road?')) {
            return;
        }
        
        const response = await fetch(`${this.baseUrl}/roads/${roadId}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    // Maintenance endpoints
    async getMaintenance(roadId = null) {
        let url = `${this.baseUrl}/maintenance`;
        if (roadId) {
            url += `?road_id=${roadId}`;
        }
        
        const response = await fetch(url);
        return this.handleResponse(response);
    }

    async createMaintenance(maintenanceData) {
        const response = await fetch(`${this.baseUrl}/maintenance`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(maintenanceData)
        });
        return this.handleResponse(response);
    }

    async updateMaintenance(recordId, maintenanceData) {
        const response = await fetch(`${this.baseUrl}/maintenance/${recordId}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(maintenanceData)
        });
        return this.handleResponse(response);
    }

    async deleteMaintenance(recordId) {
        if (!confirm('Are you sure you want to delete this maintenance record?')) {
            return;
        }
        
        const response = await fetch(`${this.baseUrl}/maintenance/${recordId}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async getMaintenanceStats() {
        const response = await fetch(`${this.baseUrl}/maintenance/stats`);
        return this.handleResponse(response);
    }

    async getAssignedWork() {
        const response = await fetch(`${this.baseUrl}/maintenance/assigned`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async getEngineerAssignments() {
        const response = await fetch(`${this.baseUrl}/maintenance/assigned`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async completeWork(assignmentId, formData) {
        const token = sessionStorage.getItem('access_token');
        const response = await fetch(`${this.baseUrl}/work-assignments/${assignmentId}/complete`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        return this.handleResponse(response);
    }

    async requestBudget(assignmentId, budget) {
        const response = await fetch(`${this.baseUrl}/work-assignments/${assignmentId}/budget`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({ budget })
        });
        return this.handleResponse(response);
    }

    async approveBudget(assignmentId, status) {
        const response = await fetch(`${this.baseUrl}/work-assignments/${assignmentId}/approve-budget`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({ status })
        });
        return this.handleResponse(response);
    }

    async verifyWork(assignmentId) {
        const response = await fetch(`${this.baseUrl}/work-assignments/${assignmentId}/verify`, {
            method: 'PUT',
            headers: {
                ...this.getHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        return this.handleResponse(response);
    }

    async updateAssignmentStatus(assignmentId, status) {
        const response = await fetch(`${this.baseUrl}/work-assignments/${assignmentId}/status`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({ status })
        });
        return this.handleResponse(response);
    }

    async getPendingBudgets() {
        const response = await fetch(`${this.baseUrl}/work-assignments/pending-budgets`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async getPendingVerification() {
        const response = await fetch(`${this.baseUrl}/work-assignments/pending-verification`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    // Complaints endpoints
    async getComplaints(roadId = null, status = null) {
        let url = `${this.baseUrl}/complaints`;
        const params = new URLSearchParams();
        if (roadId) params.append('road_id', roadId);
        if (status) params.append('status', status);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await fetch(url, { headers: this.getHeaders() });
        return this.handleResponse(response);
    }

    async getMyComplaints() {
        const response = await fetch(`${this.baseUrl}/complaints/me`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async createComplaint(complaintData) {
        const response = await fetch(`${this.baseUrl}/complaints`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(complaintData)
        });
        return this.handleResponse(response);
    }

    async updateComplaint(complaintId, complaintData) {
        const response = await fetch(`${this.baseUrl}/complaints/${complaintId}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(complaintData)
        });
        return this.handleResponse(response);
    }

    async deleteComplaint(complaintId) {
        if (!confirm('Are you sure you want to delete this complaint?')) {
            return;
        }
        
        const response = await fetch(`${this.baseUrl}/complaints/${complaintId}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }
    
    // Quotation Workflow Endpoints
    async openComplaintForQuotes(complaintId) {
        const response = await fetch(`${this.baseUrl}/complaints/${complaintId}/open-for-quotes`, {
            method: 'POST',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async getOpenComplaints() {
        const response = await fetch(`${this.baseUrl}/complaints/open-for-quotes`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async submitQuotation(complaintId, formData) {
        const token = sessionStorage.getItem('access_token');
        const headers = { 'Authorization': `Bearer ${token}` }; // Let browser set Content-Type for boundary
        const response = await fetch(`${this.baseUrl}/complaints/${complaintId}/quote`, {
            method: 'POST',
            headers: headers,
            body: formData
        });
        return this.handleResponse(response);
    }

    async getComplaintQuotes(complaintId) {
        const response = await fetch(`${this.baseUrl}/complaints/${complaintId}/quotes`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async approveQuotation(quoteId) {
        const response = await fetch(`${this.baseUrl}/quotations/${quoteId}/approve`, {
            method: 'POST',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async getComplaintStats() {
        const response = await fetch(`${this.baseUrl}/complaints/stats`);
        return this.handleResponse(response);
    }

    // Dashboard endpoints
    async getDashboardStats() {
        this.setLoading(true);
        try {
            const response = await fetch(`${this.baseUrl}/dashboard/stats`);
            return this.handleResponse(response);
        } finally {
            this.setLoading(false);
        }
    }

    async getCriticalRoads() {
        const response = await fetch(`${this.baseUrl}/dashboard/critical-roads`);
        return this.handleResponse(response);
    }
    // Leaderboard Gamification
    async getLeaderboard() {
        const response = await fetch(`${this.baseUrl}/dashboard/leaderboard`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }
}

// Create global instance
const api = new ApiService();
