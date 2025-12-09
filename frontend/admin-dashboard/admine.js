// Admin Dashboard Main Script
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    initDashboard();
    
    // Load initial data
    loadDashboardData();
    setupEventListeners();
    setupModals();
    
    // Check admin authentication
    checkAdminAuth();
});

// Global variables
let currentUser = null;
let dashboardData = {};

// Initialize dashboard
function initDashboard() {
    // Set current date
    const dateElement = document.querySelector('.current-date');
    if (dateElement) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
    
    // Toggle sidebar
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
                sidebar.classList.remove('show');
            }
        }
    });
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load statistics
        const statsResponse = await fetch('/api/admin/stats');
        const stats = await statsResponse.json();
        
        // Update stat cards
        document.getElementById('total-users').textContent = stats.totalUsers.toLocaleString();
        document.getElementById('total-earned').textContent = `৳${stats.totalEarned.toLocaleString()}`;
        document.getElementById('completed-tasks').textContent = stats.completedTasks.toLocaleString();
        document.getElementById('total-withdrawn').textContent = `৳${stats.totalWithdrawn.toLocaleString()}`;
        
        // Update badges
        document.getElementById('pending-tasks').textContent = stats.pendingTasks || '0';
        document.getElementById('new-users').textContent = stats.newUsers || '0';
        document.getElementById('pending-withdrawals').textContent = stats.pendingWithdrawals || '0';
        
        // Load recent activities
        const activitiesResponse = await fetch('/api/admin/activities');
        const activities = await activitiesResponse.json();
        loadActivities(activities);
        
        // Load pending withdrawals
        const withdrawalsResponse = await fetch('/api/admin/pending-withdrawals');
        const withdrawals = await withdrawalsResponse.json();
        loadPendingWithdrawals(withdrawals);
        
        dashboardData = stats;
        
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showError('Failed to load dashboard data. Please check your connection.');
    }
}

// Load activities
function loadActivities(activities) {
    const container = document.getElementById('activities-list');
    if (!container) return;
    
    if (activities.length === 0) {
        container.innerHTML = `
            <div class="activity-item">
                <div class="activity-content">
                    <div class="activity-text">No recent activities</div>
                </div>
            </div>
        `;
        return;
    }
    
    const icons = {
        'user_register': 'fas fa-user-plus',
        'task_complete': 'fas fa-check-circle',
        'withdraw_request': 'fas fa-money-bill-wave',
        'withdraw_approve': 'fas fa-check',
        'withdraw_reject': 'fas fa-times',
        'task_add': 'fas fa-plus-circle',
        'code_add': 'fas fa-code'
    };
    
    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="${icons[activity.type] || 'fas fa-bell'}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-text">
                    <strong>${activity.title}</strong> ${activity.description}
                </div>
                <div class="activity-time">
                    ${formatTime(activity.timestamp)}
                </div>
            </div>
        </div>
    `).join('');
}

// Load pending withdrawals
function loadPendingWithdrawals(withdrawals) {
    const container = document.getElementById('pending-withdrawals-list');
    if (!container) return;
    
    if (withdrawals.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 30px;">
                    No pending withdrawals
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = withdrawals.map(w => `
        <tr>
            <td>
                <strong>${w.userName}</strong><br>
                <small>ID: ${w.userId}</small>
            </td>
            <td><strong>৳${w.amount}</strong></td>
            <td>${w.method.toUpperCase()}</td>
            <td>${w.accountNumber}</td>
            <td>
                <span class="status-badge status-pending">Pending</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small btn-approve" onclick="approveWithdrawal(${w.id})">
                        Approve
                    </button>
                    <button class="btn-small btn-reject" onclick="rejectWithdrawal(${w.id})">
                        Reject
                    </button>
                    <button class="btn-small" onclick="viewWithdrawalDetails(${w.id})">
                        Details
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Menu item clicks
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            loadSection(target);
            
            // Update active menu
            document.querySelectorAll('.menu-item').forEach(i => {
                i.classList.remove('active');
            });
            this.classList.add('active');
            
            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('show');
            }
        });
    });
    
    // Search functionality
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            performSearch(e.target.value);
        }, 300));
    }
    
    // Logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                logoutAdmin();
            }
        });
    }
    
    // Notification button
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', showNotifications);
    }
}

// Setup modals
function setupModals() {
    // Close modal when clicking X
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('show');
        });
    });
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });
}

// Load different sections
async function loadSection(section) {
    const mainContent = document.querySelector('.main-content');
    
    try {
        const response = await fetch(`/admin/pages/${section}.html`);
        const content = await response.text();
        
        // Extract the main content from the loaded page
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const sectionContent = tempDiv.querySelector('.section-content') || tempDiv;
        
        // Replace main content
        mainContent.innerHTML = sectionContent.innerHTML;
        
        // Update page title
        const pageTitle = document.querySelector('.top-header h1');
        if (pageTitle) {
            pageTitle.textContent = section.charAt(0).toUpperCase() + section.slice(1);
        }
        
        // Load section-specific data
        if (section === 'tasks') {
            loadTasks();
        } else if (section === 'users') {
            loadUsers();
        } else if (section === 'withdrawals') {
            loadAllWithdrawals();
        } else if (section === 'codes') {
            loadCodes();
        } else if (section === 'content') {
            loadContent();
        } else if (section === 'finance') {
            loadFinance();
        } else if (section === 'settings') {
            loadSettings();
        }
        
    } catch (error) {
        console.error(`Failed to load section ${section}:`, error);
        mainContent.innerHTML = `
            <div class="error-message">
                <h2>Error Loading Section</h2>
                <p>Failed to load ${section} section. Please try again.</p>
            </div>
        `;
    }
}

// Quick Action Functions
function openAddTask() {
    const modal = document.getElementById('task-modal');
    if (!modal) return;
    
    modal.querySelector('.modal-body').innerHTML = `
        <form id="add-task-form">
            <div class="form-group">
                <label>Task Title</label>
                <input type="text" name="title" required placeholder="Enter task title">
            </div>
            <div class="form-group">
                <label>Task Description</label>
                <textarea name="description" required rows="3" placeholder="Enter task description"></textarea>
            </div>
            <div class="form-group">
                <label>Instructions</label>
                <textarea name="instructions" required rows="4" placeholder="Enter detailed instructions"></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Reward Amount (৳)</label>
                    <input type="number" name="reward" required min="1" value="3">
                </div>
                <div class="form-group">
                    <label>Task Duration (minutes)</label>
                    <input type="number" name="duration" required min="1" value="5">
                </div>
            </div>
            <div class="form-group">
                <label>CPA Link</label>
                <input type="url" name="link" required placeholder="https://example.com">
            </div>
            <div class="form-group">
                <label>Category</label>
                <select name="category" required>
                    <option value="micro_job">Micro Job</option>
                    <option value="survey">Survey</option>
                    <option value="watch">Watch Video</option>
                    <option value="install">Install App</option>
                </select>
            </div>
            <div class="form-group">
                <label>Total Slots</label>
                <input type="number" name="slots" required min="1" value="100">
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="this.closest('.modal').classList.remove('show')">
                    Cancel
                </button>
                <button type="submit" class="btn-primary">
                    Add Task
                </button>
            </div>
        </form>
    `;
    
    // Handle form submission
    const form = document.getElementById('add-task-form');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const response = await fetch('/api/admin/tasks/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Task added successfully!');
                modal.classList.remove('show');
                if (document.querySelector('.main-content h1').textContent === 'Tasks') {
                    loadTasks();
                }
            } else {
                alert('Failed to add task: ' + result.message);
            }
        } catch (error) {
            alert('Error adding task. Please try again.');
        }
    });
    
    modal.classList.add('show');
}

function openVerifyTasks() {
    loadSection('tasks');
    // Highlight pending tasks tab
    setTimeout(() => {
        const pendingTab = document.querySelector('.tab-button[data-tab="pending"]');
        if (pendingTab) pendingTab.click();
    }, 100);
}

function openProcessWithdrawals() {
    loadSection('withdrawals');
}

function openAddCodes() {
    const modal = document.getElementById('task-modal');
    if (!modal) return;
    
    modal.querySelector('.modal-header h3').textContent = 'Add New Codes';
    modal.querySelector('.modal-body').innerHTML = `
        <div class="tabs">
            <button class="tab-button active" data-type="gst">GST Code</button>
            <button class="tab-button" data-type="f">F Code</button>
            <button class="tab-button" data-type="insite">Insite Code</button>
        </div>
        
        <form id="add-code-form" class="tab-content active" data-type="gst">
            <div class="form-group">
                <label>Code Type</label>
                <select name="codeType" required>
                    <option value="gst">GST Code</option>
                    <option value="f">F Code</option>
                    <option value="insite">Insite Code</option>
                </select>
            </div>
            <div class="form-group">
                <label>Code Name</label>
                <input type="text" name="name" required placeholder="e.g., Premium GST Code">
            </div>
            <div class="form-group">
                <label>Code Value</label>
                <input type="text" name="code" required placeholder="Enter the actual code">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description" rows="3" placeholder="Code description"></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Price (৳)</label>
                    <input type="number" name="price" required min="1">
                </div>
                <div class="form-group">
                    <label>Stock Quantity</label>
                    <input type="number" name="quantity" required min="1" value="1">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="this.closest('.modal').classList.remove('show')">
                    Cancel
                </button>
                <button type="submit" class="btn-primary">
                    Add Code
                </button>
            </div>
        </form>
    `;
    
    // Tab switching
    modal.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.dataset.type;
            
            // Update tabs
            modal.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update form
            const form = document.getElementById('add-code-form');
            form.querySelector('select[name="codeType"]').value = type;
            form.setAttribute('data-type', type);
        });
    });
    
    // Form submission
    const form = document.getElementById('add-code-form');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const response = await fetch('/api/admin/codes/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Code added successfully!');
                modal.classList.remove('show');
                if (document.querySelector('.main-content h1').textContent === 'Codes') {
                    loadCodes();
                }
            } else {
                alert('Failed to add code: ' + result.message);
            }
        } catch (error) {
            alert('Error adding code. Please try again.');
        }
    });
    
    modal.classList.add('show');
}

function openManageContent() {
    loadSection('content');
}

function openSettings() {
    loadSection('settings');
}

// Withdrawal Actions
async function approveWithdrawal(id) {
    if (!confirm('Approve this withdrawal?')) return;
    
    try {
        const response = await fetch(`/api/admin/withdrawals/${id}/approve`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Withdrawal approved!');
            loadDashboardData();
        } else {
            alert('Failed to approve: ' + result.message);
        }
    } catch (error) {
        alert('Error approving withdrawal. Please try again.');
    }
}

async function rejectWithdrawal(id) {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
        const response = await fetch(`/api/admin/withdrawals/${id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Withdrawal rejected!');
            loadDashboardData();
        } else {
            alert('Failed to reject: ' + result.message);
        }
    } catch (error) {
        alert('Error rejecting withdrawal. Please try again.');
    }
}

function viewWithdrawalDetails(id) {
    // Implementation for viewing withdrawal details
    console.log('View withdrawal details:', id);
}

// Utility Functions
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function performSearch(query) {
    if (query.length < 2) return;
    
    try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        
        // Display search results
        console.log('Search results:', results);
        // You can implement a search results modal here
    } catch (error) {
        console.error('Search error:', error);
    }
}

function showNotifications() {
    // Implementation for notifications modal
    alert('Notifications feature coming soon!');
}

async function checkAdminAuth() {
    try {
        const response = await fetch('/api/admin/check-auth');
        const result = await response.json();
        
        if (!result.authenticated) {
            window.location.href = '/admin/login.html';
        } else {
            currentUser = result.user;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/admin/login.html';
    }
}

async function logoutAdmin() {
    try {
        await fetch('/api/admin/logout', { method: 'POST' });
        window.location.href = '/admin/login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function showError(message) {
    // Create error toast
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// Make functions available globally
window.openAddTask = openAddTask;
window.openVerifyTasks = openVerifyTasks;
window.openProcessWithdrawals = openProcessWithdrawals;
window.openAddCodes = openAddCodes;
window.openManageContent = openManageContent;
window.openSettings = openSettings;
window.approveWithdrawal = approveWithdrawal;
window.rejectWithdrawal = rejectWithdrawal;
window.viewWithdrawalDetails = viewWithdrawalDetails;
