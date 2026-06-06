// map.js - Complete file with all features
class RoadMap {
    constructor() {
        this.map = null;
        this.roadsLayer = null;
        this.selectedRoad = null;
        this.selectedRoadId = null;
        this.currentUser = null;
        this.init();
    }

    init() {
        // Pune coordinates
        const puneCenter = [18.5204, 73.8567];
        
        // Initialize map with Pune center
        this.map = L.map('map').setView(puneCenter, 12);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        // Add scale bar
        L.control.scale({ imperial: false, metric: true }).addTo(this.map);
        
        // Load roads
        this.loadRoads();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check user authentication
        this.checkAuth();
    }

    checkAuth() {
        const token = sessionStorage.getItem('access_token');
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        this.currentUser = user;
        this.updateUI();
    }

    updateUI() {
        const token = sessionStorage.getItem('access_token');
        const user = this.currentUser;
        
        const authLinks = document.getElementById('auth-links');
        const userMenu = document.getElementById('user-menu');
        const usernameSpan = document.getElementById('username');
        const engineerControls = document.getElementById('engineer-controls');
        const adminControls = document.getElementById('admin-controls');
        
        if (token && user && user.username) {
            // User is logged in
            if (authLinks) authLinks.classList.add('d-none');
            if (userMenu) {
                userMenu.classList.remove('d-none');
                if (usernameSpan) usernameSpan.textContent = user.username;
            }
            
            // Show engineer controls if user is engineer
            if (engineerControls) {
                if (user.role === 'engineer') {
                    engineerControls.style.display = 'block';
                } else {
                    engineerControls.style.display = 'none';
                }
            }
            
            if (adminControls) {
                if (user.role === 'admin') {
                    adminControls.style.display = 'block';
                } else {
                    adminControls.style.display = 'none';
                }
            }
            
            // Load sidebar statistics
            this.loadSidebarStats();
        } else {
            // User is not logged in
            if (authLinks) authLinks.classList.remove('d-none');
            if (userMenu) userMenu.classList.add('d-none');
            if (engineerControls) engineerControls.style.display = 'none';
            if (adminControls) adminControls.style.display = 'none';
        }
    }

    async loadSidebarStats() {
        if (!this.currentUser || !this.currentUser.role || typeof api === 'undefined') return;
        
        try {
            if (this.currentUser.role === 'admin') {
                if (api.getDashboardStats) {
                    const stats = await api.getDashboardStats();
                    const pendingEl = document.getElementById('pending-complaints');
                    const activeEl = document.getElementById('active-assignments');
                    
                    if (pendingEl && stats.complaints) {
                        pendingEl.textContent = stats.complaints.pending || 0;
                    }
                    if (activeEl && stats.maintenance) {
                        activeEl.textContent = (stats.maintenance.in_progress || 0) + (stats.maintenance.assigned || 0);
                    }
                }
            } else if (this.currentUser.role === 'engineer') {
                if (api.getAssignedWork) {
                    const work = await api.getAssignedWork();
                    const assignedCountEl = document.getElementById('assigned-count');
                    const pendingWorkEl = document.getElementById('pending-work');
                    
                    if (assignedCountEl) assignedCountEl.textContent = work.length;
                    
                    if (pendingWorkEl) {
                        const pendingCount = work.filter(w => w.status === 'Assigned' || w.status === 'In Progress').length;
                        pendingWorkEl.textContent = pendingCount;
                    }
                }
            }
        } catch (e) {
            console.error('Error loading sidebar stats:', e);
        }
    }

    async loadRoads() {
        try {
            showLoading();
            const data = await api.getRoads();
            
            if (this.roadsLayer) {
                this.map.removeLayer(this.roadsLayer);
            }
            
            this.roadsLayer = L.geoJSON(data, {
                style: (feature) => this.getRoadStyle(feature),
                onEachFeature: (feature, layer) => this.onEachRoad(feature, layer)
            }).addTo(this.map);
            
            // Fit map to show all roads
            if (data.features && data.features.length > 0) {
                this.map.fitBounds(this.roadsLayer.getBounds());
            }
            
            // Update Map Controls stats
            const totalRoadsEl = document.getElementById('total-roads');
            const criticalRoadsEl = document.getElementById('critical-roads');
            if (totalRoadsEl && data.features) {
                totalRoadsEl.textContent = data.features.length;
            }
            if (criticalRoadsEl && data.features) {
                const criticalCount = data.features.filter(f => {
                    const score = f.properties.health_score || 100;
                    return score < 40;
                }).length;
                criticalRoadsEl.textContent = criticalCount;
            }
            
        } catch (error) {
            console.error('Error loading roads:', error);
            this.showToast('Failed to load roads', 'error');
        } finally {
            hideLoading();
        }
    }

    getRoadStyle(feature) {
        const properties = feature.properties || {};
        const condition = properties.condition || 'Good';
        const healthScore = properties.health_score || 100;
        
        // Color coding based on condition
        let color = '#28a745'; // Good - Green
        let weight = 4;
        
        if (healthScore < 40) {
            color = '#dc3545'; // Critical - Red
            weight = 6;
        } else if (healthScore < 70) {
            color = '#ffc107'; // Moderate - Yellow
            weight = 5;
        }
        
        // Check if assigned for repair
        if (properties.assigned_to) {
            color = '#ff8c00'; // Orange for assigned roads
            weight = 5;
        }
        
        return {
            color: color,
            weight: weight,
            opacity: 0.9,
            className: 'animated-road'
        };
    }

    onEachRoad(feature, layer) {
        const props = feature.properties || {};
        
        // Bind popup with basic info
        layer.bindPopup(this.createPopupContent(props));
        
        // Add click handler for detailed view
        layer.on('click', () => {
            this.selectRoad(feature, layer);
        });
    }

    createPopupContent(props) {
        const healthScore = props.health_score || 100;
        let conditionColor = '#28a745';
        let conditionText = 'Good';
        
        if (healthScore < 40) {
            conditionColor = '#dc3545';
            conditionText = 'Critical';
        } else if (healthScore < 70) {
            conditionColor = '#ffc107';
            conditionText = 'Moderate';
        }
        
        return `
            <div style="min-width: 200px;">
                <h6 style="margin:0 0 5px 0; color:#2c3e50;">${props.name || 'Unnamed Road'}</h6>
                <p style="margin:2px 0;"><strong>Road ID:</strong> ${props.road_id || 'N/A'}</p>
                <p style="margin:2px 0;"><strong>Area:</strong> ${props.area || 'N/A'}</p>
                <p style="margin:2px 0;"><strong>Condition:</strong> 
                    <span style="color:${conditionColor}; font-weight:bold;">${conditionText}</span>
                </p>
                <p style="margin:2px 0;"><strong>Health Score:</strong> ${healthScore}</p>
                ${props.assigned_to ? `<p style="margin:2px 0;"><strong>Assigned to:</strong> Engineer #${props.assigned_to}</p>` : ''}
                <button onclick="roadMap.showRoadDetails(${props.id})" 
                        style="width:100%; margin-top:8px; padding:5px; background:#007bff; color:white; border:none; border-radius:3px; cursor:pointer;">
                    View Full Details
                </button>
            </div>
        `;
    }

    selectRoad(feature, layer) {
        // Reset previous selection
        if (this.selectedRoad) {
            this.roadsLayer.resetStyle(this.selectedRoad);
        }
        
        // Highlight selected road
        this.selectedRoad = layer;
        this.selectedRoadId = feature.properties.id;
        layer.setStyle({
            weight: 8,
            color: '#0000ff',
            opacity: 1
        });
        
        // Show road details
        this.showRoadDetails(feature.properties.id);
    }

    async showRoadDetails(roadId) {
        try {
            showLoading();
            const roadData = await api.getRoad(roadId);
            
            const panel = document.getElementById('road-info-panel');
            const content = document.getElementById('road-info-content');
            
            if (panel && content) {
                content.innerHTML = this.createRoadDetailsHTML(roadData);
                panel.classList.add('active');
                panel.style.display = 'block';
                
                // Load maintenance history
                this.loadMaintenanceHistory(roadId);
                
                // Load complaints
                this.loadComplaints(roadId);
            }
        } catch (error) {
            console.error('Error loading road details:', error);
            this.showToast('Failed to load road details', 'error');
        } finally {
            hideLoading();
        }
    }

    createRoadDetailsHTML(road) {
        const user = this.currentUser || {};
        const isEngineer = user.role === 'engineer';
        const isAdmin = user.role === 'admin';
        const isUser = user.role === 'user';
        
        const health = road.health || { score: 100, status: 'Good' };
        
        return `
            <div class="road-details">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h5 style="margin:0;">${road.name}</h5>
                    <span class="condition-badge" style="background: ${this.getConditionColor(health.status)}; color: white; padding: 3px 10px; border-radius: 15px;">
                        ${health.status} (${health.score})
                    </span>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; background: #f8f9fa; padding: 10px; border-radius: 5px;">
                    <div><strong>Road ID:</strong> ${road.road_id}</div>
                    <div><strong>Area/Zone:</strong> ${road.area} / ${road.zone || 'N/A'}</div>
                    <div><strong>Length:</strong> ${road.length ? road.length.toFixed(2) : 'N/A'} km</div>
                    <div><strong>Surface:</strong> ${road.surface_type || 'N/A'}</div>
                    <div><strong>Lanes:</strong> ${road.lanes || 2}</div>
                    <div><strong>Constructed:</strong> ${road.constructed_year || 'N/A'}</div>
                </div>
                
                ${road.assigned_to ? `
                <div style="background: #e8f4fd; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                    <strong>🛠 Assigned to Engineer:</strong> ${road.assigned_to_name || 'Engineer #' + road.assigned_to}
                    ${isAdmin ? `<button onclick="roadMap.showAssignEngineer(${road.id})" style="margin-left:10px; padding:2px 8px; background:#007bff; color:white; border:none; border-radius:3px; cursor:pointer;">Change</button>` : ''}
                </div>
                ` : ''}
                
                <ul class="nav nav-tabs" id="roadTabs" role="tablist">
                    <li class="nav-item">
                        <a class="nav-link active" id="maintenance-tab" data-bs-toggle="tab" href="#maintenance" role="tab">
                            📋 History (${(road.maintenance_history ? road.maintenance_history.length : 0) + (road.work_assignments ? road.work_assignments.length : 0)})
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" id="complaints-tab" data-bs-toggle="tab" href="#complaints" role="tab">
                            ⚠️ Complaints (${road.complaints ? road.complaints.length : 0})
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" id="report-tab" data-bs-toggle="tab" href="#report" role="tab">
                            📢 Report Issue
                        </a>
                    </li>
                    ${isEngineer && road.assigned_to == user.id ? `
                    <li class="nav-item">
                        <a class="nav-link" id="complete-tab" data-bs-toggle="tab" href="#complete" role="tab">
                            ✅ Complete Work
                        </a>
                    </li>
                    ` : ''}
                </ul>
                
                <div class="tab-content mt-3">
                    <div class="tab-pane active" id="maintenance" role="tabpanel">
                        <div id="maintenance-list">Loading history...</div>
                    </div>
                    
                    <div class="tab-pane" id="complaints" role="tabpanel">
                        <div id="complaints-list">Loading complaints...</div>
                    </div>
                    
                    <div class="tab-pane" id="report" role="tabpanel">
                        ${this.createComplaintForm(road.id)}
                    </div>
                    
                    ${isEngineer && road.assigned_to == user.id ? `
                    <div class="tab-pane" id="complete" role="tabpanel">
                        ${(() => {
                            const active = (road.work_assignments || []).find(a => a.assigned_to == user.id && ['Assigned', 'In Progress'].includes(a.status));
                            if (active) {
                                return this.createWorkCompletionForm(active.id, road.id);
                            }
                            return '<div class="alert alert-info mt-3">No active work assignments to complete.</div>';
                        })()}
                    </div>
                    ` : ''}
                </div>
                
                ${isAdmin ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                    <h6>Admin Actions</h6>
                    <button class="btn btn-sm btn-warning" onclick="roadMap.showAssignEngineer(${road.id})">
                        👷 Assign to Engineer
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="roadMap.editRoad(${road.id})">
                        ✏️ Edit Road
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    }

    createComplaintForm(roadId) {
        return `
            <form id="complaintForm">
                <div class="mb-3">
                    <label class="form-label">Issue Type *</label>
                    <select class="form-control" id="complaint-type">
                        <option value="">Select issue type</option>
                        <option value="Pothole">🕳️ Pothole</option>
                        <option value="Crack">〰️ Crack</option>
                        <option value="Drainage">💧 Drainage Issue</option>
                        <option value="Signage">🚦 Missing/Damaged Sign</option>
                        <option value="Lighting">💡 Street Light Issue</option>
                        <option value="Surface">🛣️ Road Surface Damage</option>
                        <option value="Other">📌 Other</option>
                    </select>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Severity *</label>
                    <select class="form-control" id="complaint-severity">
                        <option value="Low">🟢 Low</option>
                        <option value="Medium">🟡 Medium</option>
                        <option value="High">🟠 High</option>
                        <option value="Critical">🔴 Critical</option>
                    </select>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Description *</label>
                    <textarea class="form-control" id="complaint-description" rows="3" 
                        placeholder="Describe the issue in detail..."></textarea>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Upload Images (Optional)</label>
                    <input type="file" class="form-control" id="complaint-images" 
                        accept="image/*" multiple>
                    <small class="text-muted">You can select multiple images</small>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Location (Optional)</label>
                    <input type="text" class="form-control" id="complaint-location" 
                        placeholder="e.g., near McDonald's, next to signal">
                </div>
                
                <button type="button" class="btn btn-danger w-100" onclick="roadMap.submitComplaint(${roadId})">
                    📢 Submit Complaint
                </button>
            </form>
        `;
    }

    createWorkCompletionForm(assignmentId, roadId) {
        return `
            <form id="completionForm">
                <div class="mb-3 mt-3">
                    <label class="form-label">Work Description</label>
                    <textarea class="form-control" id="completion-description" rows="3" 
                        placeholder="Describe the work completed..." required></textarea>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Upload Completion Images *</label>
                    <input type="file" class="form-control" id="completion-images" 
                        accept="image/*" multiple required>
                    <small class="text-muted">Upload photos of completed work</small>
                </div>
                
                <button type="button" class="btn btn-success w-100" onclick="roadMap.completeWork(${assignmentId}, ${roadId})">
                    ✅ Mark as Completed
                </button>
            </form>
        `;
    }

    async submitComplaint(roadId) {
        try {
            const type = document.getElementById('complaint-type').value;
            const severity = document.getElementById('complaint-severity').value;
            const description = document.getElementById('complaint-description').value;
            const location = document.getElementById('complaint-location').value;
            const imageFiles = document.getElementById('complaint-images').files;
            
            if (!type || !severity || !description) {
                this.showToast('Please fill all required fields', 'warning');
                return;
            }
            
            // Check auth token
            const token = sessionStorage.getItem('access_token');
            if (!token) {
                this.showToast('You must be logged in to submit a complaint. Redirecting...', 'error');
                setTimeout(() => { window.location.href = '/'; }, 1500);
                return;
            }
            
            showLoading();
            
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('road_id', roadId);
            formData.append('complaint_type', type);
            formData.append('severity', severity);
            formData.append('description', description);
            formData.append('location', location);
            
            // Append images
            for (let i = 0; i < imageFiles.length; i++) {
                formData.append('images', imageFiles[i]);
            }
            
            // Submit complaint
            const response = await fetch('http://localhost:5000/api/complaints', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            // Handle 422 (JWT expired/invalid)
            if (response.status === 422) {
                this.showToast('Your session has expired. Please log in again.', 'error');
                sessionStorage.removeItem('access_token');
                sessionStorage.removeItem('user');
                setTimeout(() => { window.location.href = '/'; }, 1500);
                return;
            }
            
            const result = await response.json();
            
            if (response.ok) {
                this.showToast('Complaint submitted successfully! You can track it in your Dashboard.', 'success');
                
                // Refresh complaints tab
                this.loadComplaints(roadId);
                
                // Switch to complaints tab
                const complaintsTab = document.getElementById('complaints-tab');
                if (complaintsTab) complaintsTab.click();
                
                // Clear form
                const form = document.getElementById('complaintForm');
                if (form) form.reset();
            } else {
                this.showToast(result.error || 'Failed to submit complaint', 'error');
            }
            
        } catch (error) {
            console.error('Error submitting complaint:', error);
            this.showToast('Failed to submit complaint. Check your connection.', 'error');
        } finally {
            hideLoading();
        }
    }

    async completeWork(assignmentId, roadId) {
        try {
            const description = document.getElementById('completion-description').value;
            const imageFiles = document.getElementById('completion-images').files;
            
            if (!description || imageFiles.length === 0) {
                this.showToast('Please fill description and upload images', 'warning');
                return;
            }
            
            showLoading();
            
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('notes', description);
            
            for (let i = 0; i < imageFiles.length; i++) {
                formData.append('images', imageFiles[i]);
            }
            
            // Submit completion
            const response = await fetch(`http://localhost:5000/api/work-assignments/${assignmentId}/complete`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showToast('Work marked as completed! Road condition updated.', 'success');
                
                // Reload road details
                this.showRoadDetails(roadId);
                
                // Reload roads to update colors
                this.loadRoads();
            } else {
                this.showToast(result.error || 'Failed to complete work', 'error');
            }
            
        } catch (error) {
            console.error('Error completing work:', error);
            this.showToast('Failed to complete work', 'error');
        } finally {
            hideLoading();
        }
    }

    async loadMaintenanceHistory(roadId) {
        try {
            // Get full road details to access work assignments
            const roadData = await api.getRoad(roadId);
            const container = document.getElementById('maintenance-list');
            
            if (!container) return;
            
            let html = '';
            
            // First show active/past work assignments (budgets and jobs)
            if (roadData.work_assignments && roadData.work_assignments.length > 0) {
                html += '<h6 class="mt-3 mb-2">Work Assignments & Budgets</h6>';
                html += roadData.work_assignments.map(a => `
                    <div style="background:#e8f4fd; padding:12px; margin-bottom:10px; border-radius:5px; border-left:4px solid ${this.getStatusColor(a.status)};">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong>Job Priority: ${a.priority}</strong>
                            <span style="background:${this.getStatusColor(a.status)}20; padding:3px 10px; border-radius:12px; font-size:0.8rem;">
                                ${a.status}
                            </span>
                        </div>
                        <div style="margin:8px 0; font-size:0.9rem; display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
                            <div>👷 Assigned To: Engineer #${a.assigned_to}</div>
                            <div>📅 Assigned: ${new Date(a.assigned_date).toLocaleDateString()}</div>
                            <div>💰 Est. Budget: ₹${a.estimated_budget ? a.estimated_budget.toLocaleString('en-IN') : 0}</div>
                            <div>📝 Budget Status: <strong>${a.budget_status}</strong></div>
                        </div>
                        ${a.status === 'Completed' || a.status === 'Verified' ? `
                            <div style="font-size:0.85rem; color:#28a745;">
                                ✅ Completed on: ${new Date(a.completed_date).toLocaleDateString()}
                                ${a.status === 'Verified' ? '<br>🛡️ Verified by Admin' : ''}
                            </div>
                        ` : `
                            <div style="font-size:0.85rem; color:#dc3545;">
                                ⏳ Requires completion
                            </div>
                        `}
                        ${(this.currentUser && this.currentUser.role === 'engineer' && a.assigned_to === this.currentUser.id && a.status === 'Assigned') ? `
                            <div style="margin-top: 10px;">
                                <button class="btn btn-sm btn-success" onclick="roadMap.acceptAssignment(${a.id})">Accept Work</button>
                                <button class="btn btn-sm btn-danger ms-2" onclick="roadMap.rejectAssignment(${a.id})">Reject Work</button>
                            </div>
                        ` : ''}
                        ${(this.currentUser && this.currentUser.role === 'admin' && a.status === 'Completed') ? `
                            <div style="margin-top: 10px;">
                                <button class="btn btn-sm btn-primary" onclick="roadMap.verifyWork(${a.id})">Verify Work Completion</button>
                            </div>
                        ` : ''}
                    </div>
                `).join('');
            }

            // Then show traditional maintenance records
            const records = roadData.maintenance_history || [];
            
            if (records.length > 0) {
                html += '<h6 class="mt-3 mb-2">Past Maintenance Logs</h6>';
                html += records.map(r => `
                    <div style="background:#f8f9fa; padding:12px; margin-bottom:10px; border-radius:5px; border-left:4px solid ${this.getStatusColor(r.work_status || r.status)};">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong>${r.repair_type}</strong>
                            <span style="background:${this.getStatusColor(r.work_status || r.status)}20; padding:3px 10px; border-radius:12px; font-size:0.8rem;">
                                ${r.work_status || r.status}
                            </span>
                        </div>
                        <p style="margin:8px 0; font-size:0.95rem;">${r.description || ''}</p>
                        <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:#666;">
                            <span>📅 ${r.repair_date}</span>
                            <span>💰 ₹${r.cost ? r.cost.toLocaleString('en-IN') : 0}</span>
                            <span>👷 ${r.contractor || 'N/A'}</span>
                        </div>
                        ${r.completion_images ? `
                        <div style="margin-top:8px;">
                            <small>✅ Completed with images</small>
                        </div>
                        ` : ''}
                    </div>
                `).join('');
            }
            
            if (!html) {
                html = '<p class="text-muted text-center">No maintenance or assignments found.</p>';
            }
            
            container.innerHTML = html;
            
        } catch (error) {
            console.error('Error loading maintenance:', error);
        }
    }

    async loadComplaints(roadId) {
        try {
            const complaints = await api.getComplaints(roadId);
            const container = document.getElementById('complaints-list');
            
            if (!container) return;
            
            if (!complaints || complaints.length === 0) {
                container.innerHTML = '<p class="text-muted text-center">No complaints reported.</p>';
                return;
            }
            
            container.innerHTML = complaints.map(c => `
                <div style="background:#f8f9fa; padding:12px; margin-bottom:10px; border-radius:5px; border-left:4px solid ${this.getSeverityColor(c.severity)};">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                        <strong>${c.complaint_type}</strong>
                        <span style="background:${this.getSeverityColor(c.severity)}20; padding:3px 10px; border-radius:12px; font-size:0.8rem;">
                            ${c.severity}
                        </span>
                    </div>
                    <p style="margin:8px 0;">${c.description}</p>
                    <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:#666; flex-wrap:wrap;">
                        <span>📅 ${new Date(c.reported_date).toLocaleDateString()}</span>
                        <span>📍 ${c.location || 'No location'}</span>
                        <span style="color:${this.getStatusColor(c.status)}">● ${c.status}</span>
                    </div>
                    ${c.images && c.images.length > 0 ? `
                    <div style="margin-top:8px;">
                        <small>📸 ${c.images.length} image(s) attached</small>
                    </div>
                    ` : ''}
                    ${c.assigned_to ? `
                    <div style="margin-top:5px; font-size:0.85rem;">
                        <small>👷 Assigned to Engineer #${c.assigned_to}</small>
                    </div>
                    ` : ''}
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Error loading complaints:', error);
        }
    }

    async showAssignEngineer(roadId) {
        try {
            showLoading();
            
            // Get list of engineers
            const response = await fetch('http://localhost:5000/api/users', {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
                }
            });
            const users = await response.json();
            
            // Get pending complaints for this road
            const complaintsResponse = await fetch(`http://localhost:5000/api/complaints?road_id=${roadId}&status=Reported`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
                }
            });
            const complaints = await complaintsResponse.json();
            
            hideLoading();
            
            // Create modal
            const modalHtml = `
                <div class="modal fade" id="assignModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-warning">
                                <h5 class="modal-title">👷 Assign Work to Engineer</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label class="form-label">Select Engineer:</label>
                                    <select id="engineer-select" class="form-control" required>
                                        <option value="">Choose engineer...</option>
                                        ${users.filter(u => u.role === 'engineer').map(u => 
                                            `<option value="${u.id}">${u.username} (${u.email})</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                
                                ${complaints.length > 0 ? `
                                <div class="mb-3">
                                    <label class="form-label">Link to Complaint (Optional):</label>
                                    <select id="complaint-select" class="form-control">
                                        <option value="">No specific complaint</option>
                                        ${complaints.map(c => 
                                            `<option value="${c.id}">${c.complaint_type} - ${c.severity} (${new Date(c.reported_date).toLocaleDateString()})</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                ` : ''}
                                
                                <div class="mb-3">
                                    <label class="form-label">Priority:</label>
                                    <select id="priority-select" class="form-control">
                                        <option value="Low">🟢 Low</option>
                                        <option value="Medium" selected>🟡 Medium</option>
                                        <option value="High">🟠 High</option>
                                        <option value="Critical">🔴 Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="roadMap.assignRoad(${roadId})">Assign Work</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            const existingModal = document.getElementById('assignModal');
            if (existingModal) existingModal.remove();
            
            // Add modal to page
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('assignModal'));
            modal.show();
            
        } catch (error) {
            hideLoading();
            console.error('Error showing assign modal:', error);
            this.showToast('Failed to load engineers', 'error');
        }
    }

    async assignRoad(roadId) {
        const engineerId = document.getElementById('engineer-select').value;
        const complaintId = document.getElementById('complaint-select')?.value;
        const priority = document.getElementById('priority-select')?.value || 'Medium';
        
        if (!engineerId) {
            this.showToast('Please select an engineer', 'warning');
            return;
        }
        
        try {
            showLoading();
            
            const response = await fetch(`http://localhost:5000/api/roads/${roadId}/assign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ 
                    engineer_id: engineerId,
                    complaint_id: complaintId,
                    priority: priority
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showToast('Road assigned successfully', 'success');
                bootstrap.Modal.getInstance(document.getElementById('assignModal')).hide();
                this.loadRoads(); // Reload roads to update colors
                
                // Refresh road details if panel is open
                if (this.selectedRoadId === roadId) {
                    this.showRoadDetails(roadId);
                }
            } else {
                this.showToast(data.error || 'Failed to assign road', 'error');
            }
        } catch (error) {
            console.error('Error assigning road:', error);
            this.showToast('Failed to assign road', 'error');
        } finally {
            hideLoading();
        }
    }

    async acceptAssignment(assignmentId) {
        // Prompt for mandatory budget > 0
        let budgetInput = prompt("Enter estimated budget for this work (₹):\n\nNote: Must be greater than 0.", "");
        if (budgetInput === null) return; // User cancelled
        
        let budget = parseFloat(budgetInput);
        if (isNaN(budget) || budget <= 0) {
            this.showToast('You must enter a valid budget greater than 0 to accept work.', 'warning');
            return;
        }

        try {
            showLoading();
            if (typeof api !== 'undefined' && api.requestBudget) {
                await api.requestBudget(assignmentId, budget);
            }
            await api.updateAssignmentStatus(assignmentId, 'In Progress');
            this.showToast('Assignment accepted and budget requested', 'success');
            if (this.selectedRoadId) {
                this.showRoadDetails(this.selectedRoadId);
            }
        } catch (error) {
            console.error('Error accepting assignment:', error);
        } finally {
            hideLoading();
        }
    }

    async rejectAssignment(assignmentId) {
        if (!confirm('Are you sure you want to reject this work assignment?')) return;
        try {
            showLoading();
            await api.updateAssignmentStatus(assignmentId, 'Rejected');
            this.showToast('Assignment rejected', 'warning');
            if (this.selectedRoadId) {
                this.showRoadDetails(this.selectedRoadId);
            }
        } catch (error) {
            console.error('Error rejecting assignment:', error);
        } finally {
            hideLoading();
        }
    }

    async verifyWork(assignmentId) {
        if (!confirm('Are you sure you want to verify this completed work?')) return;
        try {
            showLoading();
            await api.verifyWork(assignmentId);
            this.showToast('Work verified successfully', 'success');
            if (this.selectedRoadId) {
                this.showRoadDetails(this.selectedRoadId);
            }
        } catch (error) {
            console.error('Error verifying work:', error);
        } finally {
            hideLoading();
        }
    }

    showToast(message, type = 'info') {
        if (typeof api !== 'undefined' && api.showToast) {
            api.showToast(message, type);
        } else {
            alert(message);
        }
    }

    getConditionColor(condition) {
        switch(condition) {
            case 'Good': return '#28a745';
            case 'Moderate': return '#ffc107';
            case 'Critical': return '#dc3545';
            default: return '#6c757d';
        }
    }

    getStatusColor(status) {
        switch(status) {
            case 'Completed': return '#28a745';
            case 'In Progress': return '#ffc107';
            case 'Pending': return '#6c757d';
            case 'Assigned': return '#17a2b8';
            case 'Reported': return '#dc3545';
            case 'Resolved': return '#28a745';
            default: return '#6c757d';
        }
    }

    getSeverityColor(severity) {
        switch(severity) {
            case 'Critical': return '#dc3545';
            case 'High': return '#fd7e14';
            case 'Medium': return '#ffc107';
            case 'Low': return '#28a745';
            default: return '#6c757d';
        }
    }

    editRoad(roadId) {
        this.showToast('Edit feature coming soon', 'info');
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('road-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchRoads(e.target.value));
        }
        
        // Filter by condition
        const filterSelect = document.getElementById('condition-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => this.filterRoads(e.target.value));
        }
        
        // Close panel button
        const closeBtn = document.getElementById('close-road-panel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const panel = document.getElementById('road-info-panel');
                panel.classList.remove('active');
                panel.style.display = 'none';
                if (this.selectedRoad) {
                    this.roadsLayer.resetStyle(this.selectedRoad);
                    this.selectedRoad = null;
                    this.selectedRoadId = null;
                }
            });
        }
    }

    searchRoads(query) {
        if (!this.roadsLayer) return;
        
        this.roadsLayer.eachLayer(layer => {
            const props = layer.feature.properties;
            const name = (props.name || '').toLowerCase();
            const roadId = (props.road_id || '').toLowerCase();
            const searchLower = query.toLowerCase();
            
            if (name.includes(searchLower) || roadId.includes(searchLower)) {
                layer.setStyle({ opacity: 1, weight: 6 });
                layer.bringToFront();
            } else {
                layer.setStyle({ opacity: 0.3, weight: 2 });
            }
        });
    }

    filterRoads(condition) {
        if (!this.roadsLayer) return;
        
        if (condition === 'all') {
            this.roadsLayer.eachLayer(layer => {
                layer.setStyle({ opacity: 0.9, weight: 4 });
            });
            return;
        }
        
        this.roadsLayer.eachLayer(layer => {
            const props = layer.feature.properties;
            if (props.condition === condition) {
                layer.setStyle({ opacity: 1, weight: 6 });
                layer.bringToFront();
            } else {
                layer.setStyle({ opacity: 0.2, weight: 2 });
            }
        });
    }
}

// Loading indicators
function showLoading() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.classList.remove('d-none');
}

function hideLoading() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.classList.add('d-none');
}

// Initialize map
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('map')) {
        window.roadMap = new RoadMap();
    }
});

// Global logout function
window.logout = function() {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('user');
    window.location.href = '/';
};
