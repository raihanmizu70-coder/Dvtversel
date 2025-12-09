// Admin Sidebar Component
class AdminSidebar extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }
    
    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .admin-sidebar {
                    width: 250px;
                    background: linear-gradient(180deg, #2c3e50 0%, #1a252f 100%);
                    color: white;
                    height: 100vh;
                    position: fixed;
                    left: 0;
                    top: 0;
                    overflow-y: auto;
                    transition: all 0.3s ease;
                    z-index: 1000;
                }
                
                .logo-section {
                    padding: 25px 20px;
                    text-align: center;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                
                .logo {
                    width: 70px;
                    height: 70px;
                    background: linear-gradient(135deg, #2E8B57 0%, #3CB371 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 28px;
                    font-weight: bold;
                    margin: 0 auto 15px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                }
                
                .app-name {
                    font-size: 22px;
                    font-weight: 600;
                    margin-bottom: 5px;
                    letter-spacing: 1px;
                }
                
                .app-subtitle {
                    font-size: 12px;
                    opacity: 0.7;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                }
                
                .admin-info {
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                
                .admin-avatar {
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 18px;
                    flex-shrink: 0;
                }
                
                .admin-details {
                    flex: 1;
                    min-width: 0;
                }
                
                .admin-name {
                    font-weight: 600;
                    font-size: 16px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .admin-role {
                    font-size: 12px;
                    opacity: 0.7;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .menu-section {
                    padding: 20px 0;
                }
                
                .menu-title {
                    padding: 0 20px 10px;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    opacity: 0.5;
                    font-weight: 600;
                }
                
                .menu-items {
                    display: flex;
                    flex-direction: column;
                }
                
                .menu-item {
                    display: flex;
                    align-items: center;
                    padding: 15px 20px;
                    color: rgba(255,255,255,0.8);
                    text-decoration: none;
                    transition: all 0.3s ease;
                    position: relative;
                    border-left: 4px solid transparent;
                    cursor: pointer;
                }
                
                .menu-item:hover {
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border-left-color: #2E8B57;
                }
                
                .menu-item.active {
                    background: rgba(46, 139, 87, 0.2);
                    color: white;
                    border-left-color: #2E8B57;
                }
                
                .menu-icon {
                    width: 20px;
                    margin-right: 15px;
                    font-size: 16px;
                    text-align: center;
                }
                
                .menu-text {
                    flex: 1;
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .menu-badge {
                    background: #FF4757;
                    color: white;
                    font-size: 11px;
                    padding: 3px 8px;
                    border-radius: 10px;
                    margin-left: 10px;
                    min-width: 20px;
                    text-align: center;
                    font-weight: 600;
                }
                
                .submenu {
                    display: none;
                    background: rgba(0,0,0,0.2);
                    padding-left: 20px;
                }
                
                .menu-item.has-submenu.active .submenu {
                    display: block;
                }
                
                .submenu-item {
                    padding: 12px 20px 12px 40px;
                    color: rgba(255,255,255,0.7);
                    text-decoration: none;
                    transition: all 0.3s ease;
                    font-size: 13px;
                }
                
                .submenu-item:hover {
                    color: white;
                    background: rgba(255,255,255,0.05);
                }
                
                .submenu-item.active {
                    color: #2E8B57;
                    font-weight: 500;
                }
                
                .menu-toggle {
                    position: absolute;
                    right: 15px;
                    transition: transform 0.3s ease;
                }
                
                .menu-item.has-submenu.active .menu-toggle {
                    transform: rotate(180deg);
                }
                
                .logout-section {
                    padding: 20px;
                    position: absolute;
                    bottom: 0;
                    width: 100%;
                    border-top: 1px solid rgba(255,255,255,0.1);
                }
                
                .logout-btn {
                    width: 100%;
                    padding: 12px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: white;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.3s ease;
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .logout-btn:hover {
                    background: rgba(255,255,255,0.2);
                }
                
                .version {
                    text-align: center;
                    font-size: 11px;
                    opacity: 0.5;
                    margin-top: 10px;
                }
                
                @media (max-width: 768px) {
                    .admin-sidebar {
                        transform: translateX(-100%);
                    }
                    
                    .admin-sidebar.show {
                        transform: translateX(0);
                    }
                }
            </style>
            
            <aside class="admin-sidebar">
                <div class="logo-section">
                    <div class="logo">DV</div>
                    <div class="app-name">Digital Vision</div>
                    <div class="app-subtitle">Admin Panel</div>
                </div>
                
                <div class="admin-info">
                    <div class="admin-avatar" id="admin-avatar">A</div>
                    <div class="admin-details">
                        <div class="admin-name" id="admin-name">Super Admin</div>
                        <div class="admin-role" id="admin-role">Administrator</div>
                    </div>
                </div>
                
                <div class="menu-section">
                    <div class="menu-title">Main Navigation</div>
                    <div class="menu-items">
                        <a class="menu-item active" data-page="dashboard">
                            <i class="menu-icon fas fa-tachometer-alt"></i>
                            <span class="menu-text">Dashboard</span>
                        </a>
                    </div>
                </div>
                
                <div class="menu-section">
                    <div class="menu-title">Management</div>
                    <div class="menu-items">
                        <a class="menu-item" data-page="tasks">
                            <i class="menu-icon fas fa-tasks"></i>
                            <span class="menu-text">Micro Jobs</span>
                            <span class="menu-badge" id="badge-tasks">0</span>
                        </a>
                        
                        <a class="menu-item has-submenu" data-page="users">
                            <i class="menu-icon fas fa-users"></i>
                            <span class="menu-text">Users</span>
                            <span class="menu-badge" id="badge-users">0</span>
                            <i class="menu-toggle fas fa-chevron-down"></i>
                            <div class="submenu">
                                <a class="submenu-item" data-page="users-all">All Users</a>
                                <a class="submenu-item" data-page="users-new">New Users</a>
                                <a class="submenu-item" data-page="users-active">Active Users</a>
                            </div>
                        </a>
                        
                        <a class="menu-item" data-page="withdrawals">
                            <i class="menu-icon fas fa-money-bill-wave"></i>
                            <span class="menu-text">Withdrawals</span>
                            <span class="menu-badge" id="badge-withdrawals">0</span>
                        </a>
                        
                        <a class="menu-item has-submenu" data-page="codes">
                            <i class="menu-icon fas fa-code"></i>
                            <span class="menu-text">Codes</span>
                            <i class="menu-toggle fas fa-chevron-down"></i>
                            <div class="submenu">
                                <a class="submenu-item" data-page="codes-gst">GST Codes</a>
                                <a class="submenu-item" data-page="codes-f">F Codes</a>
                                <a class="submenu-item" data-page="codes-insite">Insite Codes</a>
                            </div>
                        </a>
                    </div>
                </div>
                
                <div class="menu-section">
                    <div class="menu-title">Content & Settings</div>
                    <div class="menu-items">
                        <a class="menu-item" data-page="content">
                            <i class="menu-icon fas fa-edit"></i>
                            <span class="menu-text">Content</span>
                        </a>
                        
                        <a class="menu-item" data-page="finance">
                            <i class="menu-icon fas fa-chart-line"></i>
                            <span class="menu-text">Finance</span>
                        </a>
                        
                        <a class="menu-item has-submenu" data-page="settings">
                            <i class="menu-icon fas fa-cog"></i>
                            <span class="menu-text">Settings</span>
                            <i class="menu-toggle fas fa-chevron-down"></i>
                            <div class="submenu">
                                <a class="submenu-item" data-page="settings-general">General</a>
                                <a class="submenu-item" data-page="settings-payment">Payment</a>
                                <a class="submenu-item" data-page="settings-task">Task Settings</a>
                                <a class="submenu-item" data-page="settings-system">System</a>
                            </div>
                        </a>
                        
                        <a class="menu-item" data-page="support">
                            <i class="menu-icon fas fa-headset"></i>
                            <span class="menu-text">Support</span>
                        </a>
                    </div>
                </div>
                
                <div class="logout-section">
                    <button class="logout-btn" id="logout-btn">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Logout</span>
                    </button>
                    <div class="version">v1.0.0</div>
                </div>
            </aside>
        `;
    }
    
    setupEventListeners() {
        // Menu item clicks
        this.shadowRoot.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                
                // Toggle submenu for items with submenu
                if (item.classList.contains('has-submenu') && !item.classList.contains('active')) {
                    item.classList.add('active');
                } else if (item.classList.contains('has-submenu') && item.classList.contains('active')) {
                    item.classList.remove('active');
                } else {
                    // Set active item
                    this.shadowRoot.querySelectorAll('.menu-item').forEach(i => {
                        i.classList.remove('active');
                    });
                    item.classList.add('active');
                    
                    // Dispatch page change event
                    this.dispatchEvent(new CustomEvent('page-change', {
                        detail: { page },
                        bubbles: true
                    }));
                }
            });
        });
        
        // Submenu item clicks
        this.shadowRoot.querySelectorAll('.submenu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const page = item.dataset.page;
                
                // Set active submenu item
                this.shadowRoot.querySelectorAll('.submenu-item').forEach(i => {
                    i.classList.remove('active');
                });
                item.classList.add('active');
                
                // Dispatch page change event
                this.dispatchEvent(new CustomEvent('page-change', {
                    detail: { page },
                    bubbles: true
                }));
            });
        });
        
        // Logout button
        this.shadowRoot.getElementById('logout-btn').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('logout', { bubbles: true }));
        });
    }
    
    updateBadge(type, count) {
        const badge = this.shadowRoot.getElementById(`badge-${type}`);
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-block' : 'none';
        }
    }
    
    updateAdminInfo(name, role, avatar) {
        const nameEl = this.shadowRoot.getElementById('admin-name');
        const roleEl = this.shadowRoot.getElementById('admin-role');
        const avatarEl = this.shadowRoot.getElementById('admin-avatar');
        
        if (nameEl) nameEl.textContent = name;
        if (roleEl) roleEl.textContent = role;
        if (avatarEl) {
            avatarEl.textContent = avatar || name.charAt(0).toUpperCase();
        }
    }
    
    show() {
        this.shadowRoot.querySelector('.admin-sidebar').classList.add('show');
    }
    
    hide() {
        this.shadowRoot.querySelector('.admin-sidebar').classList.remove('show');
    }
    
    toggle() {
        this.shadowRoot.querySelector('.admin-sidebar').classList.toggle('show');
    }
}

customElements.define('admin-sidebar', AdminSidebar);
