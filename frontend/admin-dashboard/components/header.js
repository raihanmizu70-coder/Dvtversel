// Admin Header Component
class AdminHeader extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.searchQuery = '';
        this.notifications = [];
    }
    
    connectedCallback() {
        this.render();
        this.loadNotifications();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .admin-header {
                    background: white;
                    padding: 0 25px;
                    height: 70px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    position: sticky;
                    top: 0;
                    z-index: 999;
                }
                
                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }
                
                .menu-toggle {
                    display: none;
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #333;
                    padding: 10px;
                    border-radius: 5px;
                    transition: all 0.3s ease;
                }
                
                .menu-toggle:hover {
                    background: #f5f5f5;
                }
                
                .page-title {
                    font-size: 22px;
                    font-weight: 600;
                    color: #333;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .page-icon {
                    color: #2E8B57;
                }
                
                .header-right {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }
                
                .search-container {
                    position: relative;
                }
                
                .search-input {
                    padding: 12px 20px 12px 40px;
                    border: 2px solid #e0e0e0;
                    border-radius: 25px;
                    width: 300px;
                    font-size: 14px;
                    transition: all 0.3s ease;
                }
                
                .search-input:focus {
                    border-color: #2E8B57;
                    outline: none;
                    width: 350px;
                    box-shadow: 0 0 0 3px rgba(46, 139, 87, 0.1);
                }
                
                .search-icon {
                    position: absolute;
                    left: 15px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #666;
                }
                
                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                
                .action-btn {
                    background: none;
                    border: none;
                    font-size: 18px;
                    color: #666;
                    cursor: pointer;
                    padding: 10px;
                    border-radius: 50%;
                    transition: all 0.3s ease;
                    position: relative;
                }
                
                .action-btn:hover {
                    background: #f5f5f5;
                    color: #333;
                }
                
                .notification-btn {
                    position: relative;
                }
                
                .notification-count {
                    position: absolute;
                    top: 0;
                    right: 0;
                    background: #FF4757;
                    color: white;
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 50%;
                    min-width: 18px;
                    text-align: center;
                    font-weight: bold;
                }
                
                .admin-profile {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    padding: 5px 10px;
                    border-radius: 20px;
                    transition: all 0.3s ease;
                }
                
                .admin-profile:hover {
                    background: #f5f5f5;
                }
                
                .profile-avatar {
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, #2E8B57 0%, #3CB371 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    color: white;
                    font-size: 16px;
                }
                
                .profile-info {
                    display: flex;
                    flex-direction: column;
                }
                
                .profile-name {
                    font-size: 14px;
                    font-weight: 600;
                    color: #333;
                }
                
                .profile-role {
                    font-size: 11px;
                    color: #666;
                }
                
                .profile-dropdown {
                    display: flex;
                    align-items: center;
                    color: #666;
                }
                
                /* Dropdown Menus */
                .dropdown {
                    position: relative;
                }
                
                .dropdown-content {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.15);
                    min-width: 300px;
                    max-height: 400px;
                    overflow-y: auto;
                    display: none;
                    z-index: 1000;
                    margin-top: 10px;
                }
                
                .dropdown-content.show {
                    display: block;
                }
                
                .notifications-dropdown {
                    min-width: 350px;
                }
                
                .dropdown-header {
                    padding: 15px 20px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .dropdown-title {
                    font-weight: 600;
                    font-size: 16px;
                    color: #333;
                }
                
                .dropdown-actions {
                    display: flex;
                    gap: 10px;
                }
                
                .dropdown-action {
                    background: none;
                    border: none;
                    color: #2E8B57;
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                }
                
                .dropdown-items {
                    max-height: 300px;
                    overflow-y: auto;
                }
                
                .notification-item {
                    padding: 15px 20px;
                    border-bottom: 1px solid #f5f5f5;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .notification-item:hover {
                    background: #f9f9f9;
                }
                
                .notification-item.unread {
                    background: #f0f9ff;
                }
                
                .notification-title {
                    font-weight: 600;
                    font-size: 14px;
                    color: #333;
                    margin-bottom: 5px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .notification-time {
                    font-size: 11px;
                    color: #666;
                }
                
                .notification-message {
                    font-size: 13px;
                    color: #666;
                    line-height: 1.4;
                }
                
                .notification-type {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 10px;
                    font-weight: 500;
                    margin-right: 5px;
                }
                
                .type-success {
                    background: #d4edda;
                    color: #155724;
                }
                
                .type-warning {
                    background: #fff3cd;
                    color: #856404;
                }
                
                .type-error {
                    background: #f8d7da;
                    color: #721c24;
                }
                
                .type-info {
                    background: #d1ecf1;
                    color: #0c5460;
                }
                
                .dropdown-footer {
                    padding: 15px 20px;
                    text-align: center;
                    border-top: 1px solid #e0e0e0;
                }
                
                .view-all-link {
                    color: #2E8B57;
                    text-decoration: none;
                    font-weight: 500;
                    font-size: 14px;
                }
                
                .profile-dropdown-content {
                    min-width: 200px;
                }
                
                .profile-menu-item {
                    padding: 12px 20px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #333;
                    text-decoration: none;
                    transition: all 0.3s ease;
                }
                
                .profile-menu-item:hover {
                    background: #f5f5f5;
                    color: #2E8B57;
                }
                
                .profile-menu-icon {
                    width: 16px;
                    text-align: center;
                }
                
                .current-date {
                    font-size: 14px;
                    color: #666;
                    padding: 5px 15px;
                    background: #f5f5f5;
                    border-radius: 15px;
                    font-weight: 500;
                }
                
                @media (max-width: 1024px) {
                    .search-input {
                        width: 250px;
                    }
                    
                    .search-input:focus {
                        width: 300px;
                    }
                }
                
                @media (max-width: 768px) {
                    .menu-toggle {
                        display: block;
                    }
                    
                    .search-container {
                        display: none;
                    }
                    
                    .profile-info {
                        display: none;
                    }
                    
                    .current-date {
                        display: none;
                    }
                }
                
                @media (max-width: 480px) {
                    .admin-header {
                        padding: 0 15px;
                    }
                    
                    .page-title {
                        font-size: 18px;
                    }
                }
            </style>
            
            <header class="admin-header">
                <div class="header-left">
                    <button class="menu-toggle" id="menu-toggle">
                        <i class="fas fa-bars"></i>
                    </button>
                    
                    <div class="page-title">
                        <i class="page-icon fas fa-tachometer-alt" id="page-icon"></i>
                        <span id="page-title">Dashboard</span>
                    </div>
                    
                    <div class="current-date" id="current-date"></div>
                </div>
                
                <div class="header-right">
                    <div class="search-container">
                        <i class="search-icon fas fa-search"></i>
                        <input type="text" 
                               class="search-input" 
                               id="search-input"
                               placeholder="Search users, tasks, withdrawals...">
                    </div>
                    
                    <div class="header-actions">
                        <div class="dropdown">
                            <button class="action-btn notification-btn" id="notification-btn">
                                <i class="fas fa-bell"></i>
                                <span class="notification-count" id="notification-count">0</span>
                            </button>
                            <div class="dropdown-content notifications-dropdown" id="notifications-dropdown">
                                <div class="dropdown-header">
                                    <div class="dropdown-title">Notifications</div>
                                    <div class="dropdown-actions">
                                        <button class="dropdown-action" id="mark-all-read">
                                            Mark all as read
                                        </button>
                                        <button class="dropdown-action" id="clear-all">
                                            Clear all
                                        </button>
                                    </div>
                                </div>
                                <div class="dropdown-items" id="notification-items">
                                    <!-- Notifications will be loaded here -->
                                    <div class="notification-item">
                                        <div class="notification-title">
                                            No notifications
                                        </div>
                                    </div>
                                </div>
                                <div class="dropdown-footer">
                                    <a href="#" class="view-all-link" id="view-all-notifications">
                                        View all notifications
                                    </a>
                                </div>
                            </div>
                        </div>
                        
                        <div class="dropdown">
                            <div class="admin-profile" id="admin-profile">
                                <div class="profile-avatar" id="profile-avatar">A</div>
                                <div class="profile-info">
                                    <div class="profile-name" id="profile-name">Admin</div>
                                    <div class="profile-role" id="profile-role">Super Admin</div>
                                </div>
                                <div class="profile-dropdown">
                                    <i class="fas fa-chevron-down"></i>
                                </div>
                            </div>
                            <div class="dropdown-content profile-dropdown-content" id="profile-dropdown">
                                <a href="#" class="profile-menu-item" data-action="profile">
                                    <i class="profile-menu-icon fas fa-user"></i>
                                    <span>My Profile</span>
                                </a>
                                <a href="#" class="profile-menu-item" data-action="settings">
                                    <i class="profile-menu-icon fas fa-cog"></i>
                                    <span>Account Settings</span>
                                </a>
                                <a href="#" class="profile-menu-item" data-action="activity">
                                    <i class="profile-menu-icon fas fa-history"></i>
                                    <span>Activity Log</span>
                                </a>
                                <div class="dropdown-footer">
                                    <a href="#" class="profile-menu-item" data-action="logout">
                                        <i class="profile-menu-icon fas fa-sign-out-alt"></i>
                                        <span>Logout</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        `;
        
        this.updateDate();
        this.setupEventListeners();
    }
    
    updateDate() {
        const dateElement = this.shadowRoot.getElementById('current-date');
        if (dateElement) {
            const now = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateElement.textContent = now.toLocaleDateString('en-US', options);
        }
    }
    
    setupEventListeners() {
        // Menu toggle
        this.shadowRoot.getElementById('menu-toggle').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('toggle-menu', { bubbles: true }));
        });
        
        // Search functionality
        const searchInput = this.shadowRoot.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.dispatchEvent(new CustomEvent('search', { 
                detail: { query: this.searchQuery },
                bubbles: true 
            }));
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.dispatchEvent(new CustomEvent('search-enter', { 
                    detail: { query: this.searchQuery },
                    bubbles: true 
                }));
            }
        });
        
        // Notifications dropdown
        const notificationBtn = this.shadowRoot.getElementById('notification-btn');
        const notificationsDropdown = this.shadowRoot.getElementById('notifications-dropdown');
        
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationsDropdown.classList.toggle('show');
        });
        
        // Profile dropdown
        const profileBtn = this.shadowRoot.getElementById('admin-profile');
        const profileDropdown = this.shadowRoot.getElementById('profile-dropdown');
        
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            notificationsDropdown.classList.remove('show');
            profileDropdown.classList.remove('show');
        });
        
        // Mark all as read
        this.shadowRoot.getElementById('mark-all-read').addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.markAllNotificationsAsRead();
        });
        
        // Clear all notifications
        this.shadowRoot.getElementById('clear-all').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Clear all notifications?')) {
                await this.clearAllNotifications();
            }
        });
        
        // Profile menu actions
        this.shadowRoot.querySelectorAll('.profile-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const action = item.dataset.action;
                this.dispatchEvent(new CustomEvent('profile-action', {
                    detail: { action },
                    bubbles: true
                }));
                profileDropdown.classList.remove('show');
            });
        });
        
        // View all notifications
        this.shadowRoot.getElementById('view-all-notifications').addEventListener('click', (e) => {
            e.preventDefault();
            this.dispatchEvent(new CustomEvent('view-all-notifications', { bubbles: true }));
        });
    }
    
    async loadNotifications() {
        try {
            const response = await fetch('/api/admin/notifications');
            this.notifications = await response.json();
            this.renderNotifications();
            this.updateNotificationCount();
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }
    
    renderNotifications() {
        const container = this.shadowRoot.getElementById('notification-items');
        
        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="notification-item">
                    <div class="notification-title">
                        No notifications
                    </div>
                    <div class="notification-message">
                        You're all caught up!
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.unread ? 'unread' : ''}" 
                 data-id="${notification.id}">
                <div class="notification-title">
                    <span>
                        ${notification.type ? `
                            <span class="notification-type type-${notification.type}">
                                ${notification.type.toUpperCase()}
                            </span>
                        ` : ''}
                        ${notification.title}
                    </span>
                    <span class="notification-time">
                        ${this.formatTime(notification.timestamp)}
                    </span>
                </div>
                <div class="notification-message">
                    ${notification.message}
                </div>
            </div>
        `).join('');
        
        // Add click event to notification items
        container.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                const id = item.dataset.id;
                await this.markNotificationAsRead(id);
                
                // Dispatch notification click event
                const notification = this.notifications.find(n => n.id == id);
                if (notification) {
                    this.dispatchEvent(new CustomEvent('notification-click', {
                        detail: { notification },
                        bubbles: true
                    }));
                }
            });
        });
    }
    
    async markNotificationAsRead(id) {
        try {
            await fetch(`/api/admin/notifications/${id}/read`, {
                method: 'POST'
            });
            
            // Update locally
            const notification = this.notifications.find(n => n.id == id);
            if (notification) {
                notification.unread = false;
                this.renderNotifications();
                this.updateNotificationCount();
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }
    
    async markAllNotificationsAsRead() {
        try {
            await fetch('/api/admin/notifications/mark-all-read', {
                method: 'POST'
            });
            
            // Update locally
            this.notifications.forEach(n => n.unread = false);
            this.renderNotifications();
            this.updateNotificationCount();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    }
    
    async clearAllNotifications() {
        try {
            await fetch('/api/admin/notifications/clear-all', {
                method: 'POST'
            });
            
            // Update locally
            this.notifications = [];
            this.renderNotifications();
            this.updateNotificationCount();
        } catch (error) {
            console.error('Failed to clear notifications:', error);
        }
    }
    
    updateNotificationCount() {
        const count = this.notifications.filter(n => n.unread).length;
        const countElement = this.shadowRoot.getElementById('notification-count');
        
        if (countElement) {
            countElement.textContent = count;
            countElement.style.display = count > 0 ? 'inline' : 'none';
        }
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    setPageTitle(title, icon = 'fa-tachometer-alt') {
        const titleElement = this.shadowRoot.getElementById('page-title');
        const iconElement = this.shadowRoot.getElementById('page-icon');
        
        if (titleElement) titleElement.textContent = title;
        if (iconElement) {
            iconElement.className = `page-icon fas ${icon}`;
        }
    }
    
    setAdminInfo(name, role, avatar) {
        const nameElement = this.shadowRoot.getElementById('profile-name');
        const roleElement = this.shadowRoot.getElementById('profile-role');
        const avatarElement = this.shadowRoot.getElementById('profile-avatar');
        
        if (nameElement) nameElement.textContent = name;
        if (roleElement) roleElement.textContent = role;
        if (avatarElement) {
            avatarElement.textContent = avatar || name.charAt(0).toUpperCase();
        }
    }
    
    addNotification(notification) {
        this.notifications.unshift(notification);
        this.renderNotifications();
        this.updateNotificationCount();
    }
}

customElements.define('admin-header', AdminHeader);
