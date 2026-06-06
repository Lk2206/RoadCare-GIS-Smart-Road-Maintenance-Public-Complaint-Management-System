// dashboard.js - Complete Dashboard with User Complaint Tracking, Engineer Work, and Admin Overview
class Dashboard {
    constructor() {
        this.currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
        this.token = sessionStorage.getItem('access_token');
        
        if (!this.token) {
            window.location.href = '/';
            return;
        }
        
        this.init();
    }

    async init() {
        this.setupUI();
        this.setupEventListeners();
    }

    setupUI() {
        const role = this.currentUser.role || 'user';
        
        // Hide all views first
        document.querySelectorAll('.role-view').forEach(el => el.classList.remove('active-view'));
        
        // Show the corresponding view
        if (role === 'admin') {
            const el = document.getElementById('admin-view');
            if (el) el.classList.add('active-view');
            this.loadAdminData();
        } else if (role === 'engineer') {
            const el = document.getElementById('engineer-view');
            if (el) el.classList.add('active-view');
            this.loadEngineerData();
        } else {
            const el = document.getElementById('user-view');
            if (el) el.classList.add('active-view');
            this.loadUserData();
        }
    }

    // --- USER METHODS ---
    async loadUserData() {
        try {
            this.loadLeaderboard('civic-leaderboard-user');
            const complaints = await api.getMyComplaints();
            const container = document.getElementById('my-complaints-list');
            const countEl = document.getElementById('my-complaint-count');
            
            if (countEl) countEl.textContent = complaints.length;
            
            if (!container) return;

            if (complaints.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-clipboard-check fa-3x mb-3" style="color: var(--primary-color); opacity: 0.5;"></i>
                        <p class="text-secondary">You have not filed any complaints yet.</p>
                        <a href="/map-view.html" class="btn btn-premium btn-sm mt-2">
                            <i class="fas fa-map-marked-alt me-2"></i>Go to Map to Report Issues
                        </a>
                    </div>`;
                return;
            }
            
            container.innerHTML = complaints.map((c, index) => `
                <div class="complaint-card animate-fade-in-up" style="animation-delay: ${index * 80}ms;">
                    <div class="complaint-card-header">
                        <div class="d-flex align-items-center gap-2">
                            <span class="complaint-icon">${this.getTypeIcon(c.complaint_type)}</span>
                            <div>
                                <h6 class="mb-0 text-white fw-bold">${c.complaint_type}</h6>
                                <small class="text-secondary">Complaint #${c.id}</small>
                            </div>
                        </div>
                        <span class="status-badge status-${(c.status || 'Reported').toLowerCase().replace(' ', '-')}">
                            ${this.getStatusIcon(c.status)} ${c.status}
                        </span>
                    </div>
                    <div class="complaint-card-body">
                        <p class="mb-2 text-secondary">${c.description}</p>
                        <div class="complaint-meta">
                            <span><i class="far fa-clock me-1"></i>${new Date(c.reported_date).toLocaleString()}</span>
                            <span class="severity-pill severity-${(c.severity || 'Medium').toLowerCase()}">${c.severity}</span>
                            ${c.location ? `<span><i class="fas fa-map-marker-alt me-1"></i>${c.location}</span>` : ''}
                        </div>
                        ${(c.images && c.images.length > 0) || (c.completion_images && c.completion_images.length > 0) ? `
                        <div class="row mt-3">
                            ${c.images && c.images.length > 0 ? `
                            <div class="col-6">
                                <small class="text-secondary d-block mb-1">Before:</small>
                                <div class="d-flex gap-2 flex-wrap">
                                    ${c.images.map(img => `
                                        <img src="${this.getImageUrl(img)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="window.open('${this.getImageUrl(img)}', '_blank')">
                                    `).join('')}
                                </div>
                            </div>
                            ` : ''}
                            ${c.status === 'Resolved' && c.completion_images && c.completion_images.length > 0 ? `
                            <div class="col-6">
                                <small class="text-success d-block mb-1">After (Resolved):</small>
                                <div class="d-flex gap-2 flex-wrap">
                                    ${c.completion_images.map(img => `
                                        <img src="${this.getImageUrl(img)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 2px solid #10b981; cursor: pointer;" onclick="window.open('${this.getImageUrl(img)}', '_blank')">
                                    `).join('')}
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        ` : ''}
                        ${this.renderStatusTimeline(c)}
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error(error);
            api.showToast('Failed to load complaints', 'error');
        }
    }

    getTypeIcon(type) {
        const icons = {
            'Pothole': '🕳️',
            'Crack': '〰️',
            'Drainage': '💧',
            'Signage': '🚦',
            'Lighting': '💡',
            'Surface': '🛣️',
            'Other': '📌'
        };
        return icons[type] || '📌';
    }

    getStatusIcon(status) {
        const icons = {
            'Reported': '📝',
            'Under Review': '🔍',
            'Assigned': '👷',
            'In Progress': '🔧',
            'Resolved': '✅'
        };
        return icons[status] || '📝';
    }

    renderStatusTimeline(complaint) {
        const statuses = ['Reported', 'Assigned', 'In Progress', 'Resolved'];
        const currentIdx = statuses.indexOf(complaint.status);
        
        return `
            <div class="status-timeline mt-3">
                ${statuses.map((s, i) => `
                    <div class="timeline-step ${i <= currentIdx ? 'active' : ''} ${i === currentIdx ? 'current' : ''}">
                        <div class="timeline-dot"></div>
                        <span class="timeline-label">${s}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getImageUrl(path) {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        return `http://localhost:5000/${cleanPath}`;
    }

    // --- ENGINEER METHODS ---
    async loadEngineerData() {
        try {
            this.loadAvailableWork();
            const work = await api.getAssignedWork();
            const container = document.getElementById('assigned-work-list');
            const countEl = document.getElementById('assigned-work-count');
            
            if (countEl) countEl.textContent = work.length;

            // Update sidebar stats
            const sidebarAssignedEl = document.getElementById('assigned-count');
            const sidebarPendingEl = document.getElementById('pending-work');
            if (sidebarAssignedEl) sidebarAssignedEl.textContent = work.length;
            if (sidebarPendingEl) {
                const pendingCount = work.filter(w => w.status === 'Assigned' || w.status === 'In Progress').length;
                sidebarPendingEl.textContent = pendingCount;
            }
            
            if (!container) return;

            if (work.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-hard-hat fa-3x mb-3" style="color: var(--warning); opacity: 0.5;"></i>
                        <p class="text-secondary">You have no assigned work currently.</p>
                        <a href="/map-view.html" class="btn btn-premium btn-sm mt-2">
                            <i class="fas fa-map-marked-alt me-2"></i>View Map
                        </a>
                    </div>`;
                return;
            }
            
            container.innerHTML = work.map((w, index) => `
                <div class="glass-panel p-3 mb-3 animate-fade-in-up" style="animation-delay: ${index * 80}ms; border-left: 4px solid ${this.getStatusColor(w.status)};">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0 text-white fw-bold"><i class="fas fa-road me-2 text-info"></i>${w.road_name}</h6>
                        <span class="badge-premium ${this.getStatusBadgeClass(w.status)}">${w.status}</span>
                    </div>
                    <div class="mb-2">
                        <small class="text-secondary"><i class="fas fa-exclamation-triangle me-1"></i>${w.complaint_type} - ${w.severity}</small>
                        <p class="text-secondary small mb-1 mt-1">${w.complaint_description ? w.complaint_description.substring(0, 120) : ''}</p>
                        ${w.location ? `<small class="text-secondary"><i class="fas fa-map-marker-alt me-1"></i>${w.location}</small>` : ''}
                    </div>
                    <div class="row mb-2">
                        <div class="col-6">
                            <small class="text-secondary d-block"><i class="fas fa-calendar-alt me-1"></i>Assigned</small>
                            <strong class="text-white small">${w.assigned_at ? new Date(w.assigned_at).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : 'N/A'}</strong>
                        </div>
                        <div class="col-6 text-end">
                            <small class="text-secondary d-block">Condition</small>
                            <span class="badge-premium ${w.condition === 'Critical' ? 'badge-danger' : w.condition === 'Moderate' ? 'badge-warning' : 'badge-success'}">${w.condition}</span>
                        </div>
                    </div>
                    ${w.budget > 0 ? `
                    <div class="row mb-2 p-2 mx-0 rounded" style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2);">
                        <div class="col-6">
                            <small class="text-secondary d-block"><i class="fas fa-rupee-sign me-1"></i>Budget</small>
                            <strong class="text-success small">₹${w.budget.toLocaleString('en-IN')}</strong>
                        </div>
                        <div class="col-6 text-end">
                            <small class="text-secondary d-block">Status</small>
                            <span class="badge-premium ${w.budget_status === 'Approved' ? 'badge-success' : w.budget_status === 'Rejected' ? 'badge-danger' : 'badge-warning'}">${w.budget_status}</span>
                        </div>
                    </div>` : ''}
                    <div class="mt-3 d-flex gap-2 flex-wrap">
                        ${w.status === 'Assigned' ? `
                            <button class="btn btn-success btn-sm flex-grow-1" onclick="dashboard.acceptWork(${w.assignment_id})">
                                <i class="fas fa-check me-1"></i>Accept Work
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="dashboard.rejectWork(${w.assignment_id})">
                                <i class="fas fa-times me-1"></i>Reject
                            </button>
                        ` : ''}
                        ${w.status === 'In Progress' ? `
                            <button class="btn btn-premium btn-sm flex-grow-1" onclick="dashboard.showCompletionModal(${w.assignment_id}, '${w.road_name.replace(/'/g, "\\'")}')">
                                <i class="fas fa-check-circle me-1"></i>Mark Work Done & Upload Photo
                            </button>
                        ` : ''}
                        ${w.status === 'Completed' ? `
                            <div class="w-100 text-center">
                                <span class="badge-premium badge-warning"><i class="fas fa-clock me-1"></i>Waiting for Admin Verification</span>
                            </div>
                        ` : ''}
                        ${w.status === 'Verified' ? `
                            <div class="w-100 text-center">
                                <span class="badge-premium badge-success"><i class="fas fa-check-double me-1"></i>Verified & Resolved</span>
                            </div>
                        ` : ''}
                        <a href="/map-view.html?road=${w.road_id}" class="btn btn-sm btn-outline-info flex-grow-1">
                            <i class="fas fa-map-marked-alt me-1"></i>View on Map
                        </a>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error(error);
            api.showToast('Failed to load assigned work', 'error');
        }
    }

    async acceptWork(assignmentId) {
        // Prompt for mandatory budget > 0
        let budgetInput = prompt("Enter estimated budget for this work (₹):\n\nNote: Must be greater than 0.", "");
        if (budgetInput === null) return; // User cancelled
        
        let budget = parseFloat(budgetInput);
        if (isNaN(budget) || budget <= 0) {
            api.showToast('You must enter a valid budget greater than 0 to accept work.', 'warning');
            return;
        }

        try {
            await api.requestBudget(assignmentId, budget);
            await api.updateAssignmentStatus(assignmentId, 'In Progress');
            api.showToast('Work accepted and budget requested!', 'success');
            this.loadEngineerData();
        } catch (error) {
            api.showToast('Failed to accept work or request budget', 'error');
        }
    }

    async rejectWork(assignmentId) {
        if (!confirm('Are you sure you want to reject this assignment?')) return;
        try {
            await api.updateAssignmentStatus(assignmentId, 'Rejected');
            api.showToast('Assignment rejected', 'info');
            this.loadEngineerData();
        } catch (error) {
            api.showToast('Failed to reject work', 'error');
        }
    }

    getStatusColor(status) {
        const colors = { 'Assigned': '#f59e0b', 'In Progress': '#3b82f6', 'Completed': '#8b5cf6', 'Verified': '#10b981' };
        return colors[status] || '#6366f1';
    }

    getConditionColor(condition) {
        const colors = { 'Critical': '#ef4444', 'Moderate': '#f59e0b', 'Good': '#10b981' };
        return colors[condition] || '#6366f1';
    }

    getStatusBadgeClass(status) {
        const classes = { 'Assigned': 'badge-warning', 'In Progress': 'badge-info', 'Completed': 'badge-info', 'Verified': 'badge-success', 'Rejected': 'badge-danger' };
        return classes[status] || 'badge-info';
    }

    showCompletionModal(assignmentId, roadName) {
        // Remove existing modal if any
        const existing = document.getElementById('completionModal');
        if (existing) existing.remove();
        
        const modalHtml = `
            <div class="modal fade" id="completionModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content" style="background: var(--bg-dark); border: 1px solid var(--border-color);">
                        <div class="modal-header" style="border-bottom: 1px solid var(--border-color);">
                            <h5 class="modal-title text-white"><i class="fas fa-check-circle text-success me-2"></i>Mark Work as Completed</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p class="text-secondary mb-3">Road: <strong class="text-white">${roadName}</strong></p>
                            
                            <div class="mb-3">
                                <label class="form-label text-secondary">Completion Notes</label>
                                <textarea id="completion-notes" class="form-control premium-input" rows="3" 
                                    placeholder="Describe the work done (e.g., Filled 3 potholes, resurfaced 50m stretch)..."
                                    style="background: rgba(30,41,59,0.5); border: 1px solid var(--border-color); color: white;"></textarea>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label text-secondary"><i class="fas fa-camera me-1"></i>Upload Completion Photos (Required)</label>
                                <input type="file" id="completion-images" class="form-control premium-input" multiple accept="image/*"
                                    style="background: rgba(30,41,59,0.5); border: 1px solid var(--border-color); color: white;">
                                <small class="text-secondary mt-1 d-block">Upload photos showing the completed work</small>
                            </div>
                            
                            <div id="image-preview" class="d-flex gap-2 flex-wrap mb-3"></div>
                        </div>
                        <div class="modal-footer" style="border-top: 1px solid var(--border-color);">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-premium" id="submit-completion" onclick="dashboard.submitCompletion(${assignmentId})">
                                <i class="fas fa-paper-plane me-1"></i>Submit Completion
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Image preview
        document.getElementById('completion-images').addEventListener('change', function() {
            const preview = document.getElementById('image-preview');
            preview.innerHTML = '';
            Array.from(this.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.innerHTML += `<img src="${e.target.result}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color);">`;
                };
                reader.readAsDataURL(file);
            });
        });
        
        const modal = new bootstrap.Modal(document.getElementById('completionModal'));
        modal.show();
    }

    async submitCompletion(assignmentId) {
        const notes = document.getElementById('completion-notes').value;
        const imageInput = document.getElementById('completion-images');
        const images = imageInput.files;
        
        if (!images || images.length === 0) {
            api.showToast('Please upload at least one photo of the completed work', 'warning');
            return;
        }
        
        const formData = new FormData();
        formData.append('notes', notes);
        for (let i = 0; i < images.length; i++) {
            formData.append('images', images[i]);
        }
        
        try {
            const submitBtn = document.getElementById('submit-completion');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Submitting...';
            
            const result = await api.completeWork(assignmentId, formData);
            api.showToast('Work marked as completed! Admin will verify soon.', 'success');
            
            bootstrap.Modal.getInstance(document.getElementById('completionModal')).hide();
            this.loadEngineerData();
        } catch (error) {
            console.error('Error completing work:', error);
            api.showToast('Failed to submit completion. Please try again.', 'error');
        } finally {
            const submitBtn = document.getElementById('submit-completion');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Submit Completion';
            }
        }
    }

    // --- ADMIN METHODS ---
    async loadAdminData() {
        try {
            const stats = await api.getDashboardStats();
            
            // Update stat cards
            const totalRoadsEl = document.getElementById('total-roads');
            const totalBudgetEl = document.getElementById('total-budget');
            const totalComplaintsEl = document.getElementById('total-complaints');
            const avgHealthEl = document.getElementById('avg-health');
            
            if (totalRoadsEl) totalRoadsEl.textContent = stats.overview?.total_roads || 0;
            if (totalBudgetEl) totalBudgetEl.textContent = '₹' + (stats.maintenance?.total_cost || 0).toLocaleString('en-IN');
            if (totalComplaintsEl) totalComplaintsEl.textContent = stats.overview?.total_complaints || 0;
            if (avgHealthEl) avgHealthEl.textContent = stats.overview?.avg_health_score || '--';
            
            // Update sidebar elements
            const pendingSidebarEl = document.getElementById('pending-complaints');
            const activeAssignmentsEl = document.getElementById('active-assignments');
            if (pendingSidebarEl) pendingSidebarEl.textContent = stats.complaints?.pending || 0;
            if (activeAssignmentsEl) activeAssignmentsEl.textContent = stats.maintenance?.assigned || 0;
            
            // Update problem areas
            this.updateProblemAreas(stats.problem_areas);
            
            // Load all complaints for admin
            this.loadAllComplaints();
            
            this.loadLeaderboard('civic-leaderboard');

            // Load pending items
            this.loadPendingBudgets();
            this.loadPendingVerifications();
            this.loadPendingUsers();
            this.loadPersonnel();
        } catch (error) {
            console.error('Admin data load error:', error);
        }
    }
    
    async loadPendingUsers() {
        try {
            const users = await api.getPendingUsers();
            const container = document.getElementById('pending-users-list');
            if (!container) return;
            
            if (!users || users.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-users-slash d-block"></i><p class="mb-0">No pending registrations</p></div>';
                return;
            }
            
            container.innerHTML = users.map(u => {
                let scoreHtml = '';
                if (u.auto_verify_score !== null) {
                    const color = u.auto_verify_score > 70 ? 'success' : (u.auto_verify_score > 40 ? 'warning' : 'danger');
                    scoreHtml = `<span class="badge badge-${color} ms-2">Auto-Verify: ${u.auto_verify_score}% Match</span>`;
                }
                
                let imgHtml = '';
                if (u.proof_image_path) {
                    imgHtml = `
                        <div class="mt-2 mb-2">
                            <small class="text-secondary d-block mb-1"><i class="fas fa-id-card me-1"></i>Proof Document:</small>
                            <img src="${this.getImageUrl(u.proof_image_path)}" style="width: 150px; height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer;" onclick="window.open('${this.getImageUrl(u.proof_image_path)}', '_blank')" title="View Proof">
                        </div>
                    `;
                }
                
                return `
                <div class="glass-panel p-3 mb-2" style="border-left: 3px solid #f59e0b;">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <div>
                            <span class="fw-bold text-white">${u.username}</span> <span class="text-secondary">(${u.email})</span>
                            <span class="ms-2 badge-premium badge-warning">Role: ${u.role}</span>
                            ${scoreHtml}
                        </div>
                        <small class="text-secondary">${new Date(u.created_at).toLocaleDateString()}</small>
                    </div>
                    ${imgHtml}
                    <div class="d-flex gap-2 mt-2">
                        <button class="btn btn-sm btn-success flex-grow-1" onclick="dashboard.approveUser(${u.id})"><i class="fas fa-check me-1"></i>Approve</button>
                        <button class="btn btn-sm btn-outline-danger flex-grow-1" onclick="dashboard.rejectUser(${u.id})"><i class="fas fa-times me-1"></i>Reject</button>
                    </div>
                </div>
                `;
            }).join('');
        } catch (e) {
            console.error('Error loading pending users:', e);
        }
    }
    
    async loadPersonnel() {
        try {
            const users = await api.getAllUsers();
            const tbody = document.getElementById('active-personnel-list');
            if (!tbody) return;
            
            const activeUsers = users.filter(u => u.account_status !== 'Pending');
            
            if (!activeUsers || activeUsers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-3">No personnel found</td></tr>';
                return;
            }
            
            tbody.innerHTML = activeUsers.map(u => `
                <tr>
                    <td class="text-white fw-bold">${u.username}</td>
                    <td class="text-secondary">${u.email}</td>
                    <td><span class="badge-premium badge-${u.role === 'admin' ? 'danger' : u.role === 'engineer' ? 'warning' : 'info'}">${u.role}</span></td>
                    <td class="text-secondary small">${new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('');
        } catch (e) {
            console.error('Error loading personnel:', e);
        }
    }
    
    async approveUser(userId) {
        if (!confirm('Are you sure you want to approve this registration?')) return;
        try {
            await api.approveUser(userId);
            api.showToast('User approved successfully!', 'success');
            this.loadPendingUsers();
            this.loadPersonnel();
        } catch (e) {
            api.showToast('Failed to approve user', 'error');
        }
    }
    
    async rejectUser(userId) {
        try {
            await api.rejectUser(userId);
            api.showToast('User registration rejected and removed', 'success');
            this.loadPendingUsers();
        } catch (e) {
            api.showToast('Failed to reject user', 'error');
        }
    }
    
    async loadAllComplaints() {
        try {
            const complaints = await api.getComplaints();
            const containerGram = document.getElementById('admin-complaints-gram');
            const containerTaluka = document.getElementById('admin-complaints-taluka');
            const containerMunicipal = document.getElementById('admin-complaints-municipal');
            
            if (!containerGram || !containerTaluka || !containerMunicipal) return;
            
            const gramComplaints = complaints.filter(c => c.escalation_level === 'Gram Panchayat');
            const talukaComplaints = complaints.filter(c => c.escalation_level === 'Taluka Level');
            const municipalComplaints = complaints.filter(c => c.escalation_level === 'Municipal Corporation');
            
            const renderHtml = (arr) => {
                if (!arr || arr.length === 0) return '<p class="text-secondary text-center my-3">No complaints found in this level</p>';
                return arr.map(c => `
                    <div class="glass-panel p-3 mb-2" style="border-left: 3px solid ${this.getSeverityColor(c.severity)}; position: relative;">
                        ${c.time_to_next_escalation && c.status !== 'Resolved' ? `
                            <span class="badge bg-danger" style="position: absolute; top: 10px; right: 10px; font-size: 0.75rem;">
                                <i class="fas fa-clock me-1"></i>${c.time_to_next_escalation}
                            </span>
                        ` : ''}
                        <div class="d-flex justify-content-between align-items-start mb-1 pe-5">
                            <div>
                                <span class="fw-bold text-white">${c.complaint_type} <span class="text-secondary fw-normal">on ${c.road_name}</span></span>
                                <span class="ms-2 badge-premium badge-${c.severity === 'Critical' ? 'danger' : c.severity === 'High' ? 'warning' : 'info'}">${c.severity}</span>
                            </div>
                        </div>
                        <div class="mb-2">
                            <span class="badge-premium ${this.getStatusBadgeClass(c.status)}">${c.status}</span>
                            <small class="text-secondary ms-2"><i class="fas fa-user me-1"></i>Reported by: ${c.reported_by_name}</small>
                        </div>
                        <p class="text-secondary small mb-2">${c.description}</p>
                        ${c.images && c.images.length > 0 ? `
                            <div class="d-flex gap-2 flex-wrap mb-2">
                                ${c.images.map(img => `
                                    <img src="${this.getImageUrl(img)}" 
                                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; cursor: pointer;" 
                                         onclick="window.open('${this.getImageUrl(img)}', '_blank')" 
                                         title="User Complaint Image">
                                `).join('')}
                            </div>
                        ` : ''}
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-secondary">
                                <i class="far fa-clock me-1"></i>${new Date(c.reported_date).toLocaleDateString()}
                                ${c.location ? ` · <i class="fas fa-map-marker-alt me-1"></i>${c.location}` : ''}
                            </small>
                            <div class="d-flex gap-1">
                                ${c.status === 'Reported' ? `
                                    <button class="btn btn-sm btn-outline-info" onclick="dashboard.openComplaintForQuotes(${c.id})" title="Open for Quotes">
                                        <i class="fas fa-bullhorn"></i> Open Quotes
                                    </button>
                                    <button class="btn btn-sm btn-outline-success" onclick="dashboard.updateComplaintStatus(${c.id}, 'Under Review')" title="Mark Under Review">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                ` : ''}
                                ${c.status === 'Open for Quotes' ? `
                                    <button class="btn btn-sm btn-outline-warning" onclick="dashboard.viewQuotations(${c.id})" title="View Quotes">
                                        <i class="fas fa-list-alt"></i> View Quotes
                                    </button>
                                ` : ''}
                                ${c.status === 'Assigned' || c.status === 'In Progress' ? `
                                    <button class="btn btn-sm btn-outline-success" onclick="dashboard.updateComplaintStatus(${c.id}, 'Resolved')" title="Mark Resolved">
                                        <i class="fas fa-check"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('');
            };
            
            containerGram.innerHTML = renderHtml(gramComplaints);
            containerTaluka.innerHTML = renderHtml(talukaComplaints);
            containerMunicipal.innerHTML = renderHtml(municipalComplaints);
        } catch (error) {
            console.error('Error loading admin complaints:', error);
        }
    }

    async openComplaintForQuotes(complaintId) {
        if (!confirm('Are you sure you want to open this complaint for engineer quotations?')) return;
        try {
            await api.openComplaintForQuotes(complaintId);
            api.showToast('Complaint is now open for quotes', 'success');
            this.loadAllComplaints();
        } catch (error) {
            console.error('Error opening complaint for quotes:', error);
        }
    }

    async loadAvailableWork() {
        try {
            const complaints = await api.getOpenComplaints();
            const container = document.getElementById('available-work-list');
            if (!container) return;

            if (complaints.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search-location d-block"></i>
                        <p class="mb-1">No open complaints available for quoting</p>
                    </div>`;
                return;
            }

            container.innerHTML = complaints.map(c => `
                <div class="glass-panel p-3 mb-2" style="border-left: 3px solid ${this.getSeverityColor(c.severity)};">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <div>
                            <span class="fw-bold text-white">${c.complaint_type} <span class="text-secondary fw-normal">on ${c.road_name}</span></span>
                            <span class="ms-2 badge-premium badge-${c.severity === 'Critical' ? 'danger' : c.severity === 'High' ? 'warning' : 'info'}">${c.severity}</span>
                        </div>
                    </div>
                    <p class="text-secondary small mb-2">${c.description}</p>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <small class="text-secondary">
                            ${c.has_quoted ? `<span class="text-success"><i class="fas fa-check-circle me-1"></i>You quoted ₹${c.my_quote}</span>` : '<span class="text-warning"><i class="fas fa-clock me-1"></i>Awaiting quotes</span>'}
                        </small>
                        ${!c.has_quoted ? `
                            <button class="btn btn-sm btn-info" onclick="dashboard.showSubmitQuoteModal(${c.id})">
                                <i class="fas fa-file-invoice-dollar me-1"></i> Submit Quote
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading available work:', error);
        }
    }

    showSubmitQuoteModal(complaintId) {
        document.getElementById('quote-complaint-id').value = complaintId;
        document.getElementById('quote-amount').value = '';
        document.getElementById('quote-notes').value = '';
        
        // Remove old event listener to prevent multiple submissions
        const submitBtn = document.getElementById('btn-submit-quote');
        const newBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newBtn, submitBtn);
        
        newBtn.addEventListener('click', async () => {
            const amount = document.getElementById('quote-amount').value;
            const notes = document.getElementById('quote-notes').value;
            const imageInput = document.getElementById('quote-image');
            
            if (!amount) {
                api.showToast('Amount is required', 'error');
                return;
            }
            
            const formData = new FormData();
            formData.append('amount', amount);
            formData.append('notes', notes);
            if (imageInput.files && imageInput.files[0]) {
                formData.append('image', imageInput.files[0]);
            }
            
            try {
                await api.submitQuotation(complaintId, formData);
                api.showToast('Quotation submitted successfully', 'success');
                bootstrap.Modal.getInstance(document.getElementById('submitQuoteModal')).hide();
                this.loadAvailableWork();
            } catch (error) {
                console.error('Error submitting quote:', error);
            }
        });
        
        const modal = new bootstrap.Modal(document.getElementById('submitQuoteModal'));
        modal.show();
    }

    async viewQuotations(complaintId) {
        try {
            const quotes = await api.getComplaintQuotes(complaintId);
            const container = document.getElementById('quotes-container');
            
            if (quotes.length === 0) {
                container.innerHTML = '<div class="text-center text-secondary py-4">No quotes received yet for this complaint.</div>';
            } else {
                container.innerHTML = quotes.map(q => `
                    <div class="glass-panel p-3 mb-3" style="border: 1px solid var(--glass-border);">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="mb-0 text-white fw-bold"><i class="fas fa-user-hard-hat me-2 text-info"></i>${q.engineer_name}</h6>
                            <span class="fs-5 fw-bold text-success">₹${q.amount}</span>
                        </div>
                        <p class="text-secondary small mb-3">${q.notes || 'No additional notes provided.'}</p>
                        ${q.image_path ? `
                            <div class="mb-3">
                                <img src="/${q.image_path}" class="img-fluid rounded" style="max-height: 200px; cursor: pointer;" onclick="window.open('/${q.image_path}', '_blank')">
                            </div>
                        ` : ''}
                        <div class="text-end">
                            <button class="btn btn-sm btn-outline-success" onclick="dashboard.approveQuotation(${q.id})">
                                <i class="fas fa-check me-1"></i> Approve & Assign
                            </button>
                        </div>
                    </div>
                `).join('');
            }
            
            const modal = new bootstrap.Modal(document.getElementById('viewQuotesModal'));
            modal.show();
        } catch (error) {
            console.error('Error fetching quotes:', error);
            api.showToast('Failed to load quotes', 'error');
        }
    }

    async approveQuotation(quoteId) {
        if (!confirm('Are you sure you want to approve this quote and assign the work?')) return;
        try {
            await api.approveQuotation(quoteId);
            api.showToast('Quotation approved and work assigned!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('viewQuotesModal')).hide();
            this.loadAllComplaints();
            this.loadAdminData();
        } catch (error) {
            console.error('Error approving quote:', error);
        }
    }

    async updateComplaintStatus(complaintId, newStatus) {
        if (!confirm(`Update complaint #${complaintId} to "${newStatus}"?`)) return;
        
        try {
            const response = await fetch(`http://localhost:5000/api/complaints/${complaintId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (response.ok) {
                api.showToast(`Complaint updated to ${newStatus}`, 'success');
                this.loadAllComplaints();
                this.loadAdminData();
            } else {
                const data = await response.json();
                api.showToast(data.error || 'Failed to update', 'error');
            }
        } catch (error) {
            api.showToast('Failed to update complaint status', 'error');
        }
    }

    getSeverityColor(severity) {
        const colors = { 'Critical': '#ef4444', 'High': '#f59e0b', 'Medium': '#3b82f6', 'Low': '#10b981' };
        return colors[severity] || '#6366f1';
    }

    getStatusBadgeClass(status) {
        const classes = {
            'Reported': 'badge-danger',
            'Under Review': 'badge-warning',
            'Assigned': 'badge-info',
            'In Progress': 'badge-warning',
            'Resolved': 'badge-success'
        };
        return classes[status] || 'badge-info';
    }

    updateProblemAreas(areas) {
        const container = document.getElementById('problem-areas');
        if (!container) return;

        if (!areas || areas.length === 0) {
            container.innerHTML = '<p class="text-secondary text-center my-3">No problem areas identified</p>';
            return;
        }

        container.innerHTML = areas.map(a => `
            <div class="d-flex justify-content-between align-items-center glass-panel p-2 mb-2">
                <span class="text-white small">${a.area}</span>
                <span class="badge-premium badge-danger">${a.complaints} issues</span>
            </div>
        `).join('');
    }

    async loadPendingBudgets() {
        try {
            const budgets = await api.getPendingBudgets();
            const container = document.getElementById('pending-budgets-list');
            
            if (!container) return;

            if (budgets.length === 0) {
                container.innerHTML = '<p class="text-secondary text-center my-3">No pending budget requests</p>';
                return;
            }
            
            container.innerHTML = budgets.map(b => `
                <div class="glass-panel p-3 mb-2">
                    <div class="d-flex justify-content-between mb-2">
                        <strong class="text-white">${b.road_name}</strong>
                        <span class="text-success fw-bold">₹${b.estimated_budget ? b.estimated_budget.toLocaleString('en-IN') : 0}</span>
                    </div>
                    <div class="small text-secondary mb-3"><i class="fas fa-hard-hat me-1"></i> By: ${b.engineer_name}</div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-success flex-grow-1" onclick="dashboard.approveBudget(${b.id}, 'Approved')"><i class="fas fa-check me-1"></i>Approve</button>
                        <button class="btn btn-sm btn-outline-danger flex-grow-1" onclick="dashboard.approveBudget(${b.id}, 'Rejected')"><i class="fas fa-times me-1"></i>Reject</button>
                    </div>
                </div>
            `).join('');
        } catch(e) {
            console.error(e);
        }
    }

    async loadPendingVerifications() {
        try {
            const verifications = await api.getPendingVerification();
            const container = document.getElementById('pending-verifications-list');
            
            if (!container) return;

            if (verifications.length === 0) {
                container.innerHTML = '<p class="text-secondary text-center my-3">No pending verifications</p>';
                return;
            }
            
            container.innerHTML = verifications.map(v => `
                <div class="glass-panel p-3 mb-2">
                    <div class="d-flex justify-content-between mb-2">
                        <strong class="text-white">${v.road_name}</strong>
                        <span class="badge-premium badge-success">Completed</span>
                    </div>
                    <div class="small text-secondary mb-2">
                        <i class="fas fa-hard-hat me-1"></i> By: ${v.engineer_name}<br>
                        <i class="far fa-calendar-check me-1"></i> On: ${v.completed_date ? new Date(v.completed_date).toLocaleDateString('en-IN') : 'N/A'}
                    <div class="row mt-3">
                        ${v.complaint_images && v.complaint_images.length > 0 ? `
                        <div class="col-6 mb-2" style="border-right: 1px dashed var(--border-color);">
                            <small class="text-warning d-block mb-1"><i class="fas fa-exclamation-circle me-1"></i>Original Issue:</small>
                            <p class="small text-secondary mb-1">${v.complaint_description || ''}</p>
                            <div class="d-flex gap-2 flex-wrap">
                                ${v.complaint_images.map(img => `
                                    <img src="${this.getImageUrl(img)}" 
                                         style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer;" 
                                         onclick="window.open('${this.getImageUrl(img)}', '_blank')" 
                                         title="Original Complaint Image">
                                `).join('')}
                            </div>
                        </div>
                        ` : `
                        <div class="col-6 mb-2" style="border-right: 1px dashed var(--border-color);">
                            <small class="text-warning d-block mb-1"><i class="fas fa-exclamation-circle me-1"></i>Original Issue:</small>
                            <p class="small text-secondary mb-1">${v.complaint_description || 'No description'}</p>
                            <span class="small text-secondary fst-italic">No user photos provided</span>
                        </div>
                        `}
                        
                        <div class="col-6 mb-2">
                            <small class="text-success d-block mb-1"><i class="fas fa-check-circle me-1"></i>Completed Work:</small>
                            <p class="small text-secondary mb-1">${v.completion_notes || 'No notes'}</p>
                            ${v.completion_images && v.completion_images.length > 0 ? `
                            <div class="d-flex gap-2 flex-wrap">
                                ${v.completion_images.map(img => `
                                    <img src="${this.getImageUrl(img)}" 
                                         style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; border: 2px solid #10b981; cursor: pointer;" 
                                         onclick="window.open('${this.getImageUrl(img)}', '_blank')" 
                                         title="Engineer Completion Image">
                                `).join('')}
                            </div>
                            ` : `<span class="small text-secondary fst-italic">No completion photos provided</span>`}
                        </div>
                    </div>
                    <button class="btn btn-sm btn-premium w-100" onclick="dashboard.verifyWork(${v.id})">
                        <i class="fas fa-shield-alt me-1"></i> Verify & Resolve Complaint
                    </button>
                </div>
            `).join('');
        } catch(e) {
            console.error(e);
        }
    }

    async approveBudget(id, status) {
        if (!confirm(`Are you sure you want to ${status.toLowerCase()} this budget?`)) return;
        try {
            await api.approveBudget(id, status);
            api.showToast(`Budget ${status}`, 'success');
            this.loadPendingBudgets();
        } catch (e) {
            api.showToast('Failed to update budget', 'error');
        }
    }

    async verifyWork(id) {
        if (!confirm('Verify this work and close related complaints?')) return;
        try {
            await api.verifyWork(id);
            api.showToast('Work verified and complaint resolved!', 'success');
            this.loadPendingVerifications();
            this.loadAdminData();
        } catch (e) {
            api.showToast('Failed to verify work', 'error');
        }
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const role = this.currentUser.role || 'user';
                if (role === 'admin') this.loadAdminData();
                else if (role === 'engineer') this.loadEngineerData();
                else this.loadUserData();
                api.showToast('Dashboard refreshed', 'success');
            });
        }
    }

    async loadLeaderboard(containerId) {
        try {
            const leaderboard = await api.getLeaderboard();
            const container = document.getElementById(containerId);
            if (!container) return;
            
            if (!leaderboard || leaderboard.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-medal d-block text-secondary"></i><p class="mb-0 text-secondary">No points awarded this month</p></div>';
                return;
            }
            
            container.innerHTML = leaderboard.map((user, index) => {
                let badgeIcon = '';
                let color = 'text-secondary';
                if (index === 0) { badgeIcon = 'fas fa-trophy'; color = 'text-warning'; }
                else if (index === 1) { badgeIcon = 'fas fa-medal'; color = 'text-light'; }
                else if (index === 2) { badgeIcon = 'fas fa-medal'; color = 'text-warning'; /* bronze proxy */ }
                else { badgeIcon = 'fas fa-star'; }
                
                return `
                <div class="list-group-item bg-transparent border-bottom border-secondary p-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="fw-bold text-white me-2">#${index + 1}</span>
                            <span class="text-white">${user.username}</span>
                        </div>
                        <div class="text-end">
                            <span class="fw-bold ${color}"><i class="${badgeIcon} me-1"></i>${user.score} pts</span>
                            <small class="d-block text-secondary" style="font-size: 0.7rem;">${user.complaints_count} valid complaints</small>
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new Dashboard();
});
