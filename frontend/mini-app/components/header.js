// Header Component
class AppHeader extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }
    
    connectedCallback() {
        this.render();
        this.updateBalance();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .app-header {
                    background: linear-gradient(135deg, #2E8B57 0%, #3CB371 100%);
                    color: white;
                    padding: 15px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                }
                .logo-section {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .logo {
                    width: 40px;
                    height: 40px;
                    background: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    color: #2E8B57;
                }
                .app-title h1 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                }
                .app-title p {
                    margin: 0;
                    font-size: 12px;
                    opacity: 0.9;
                }
                .balance-section {
                    text-align: right;
                }
                .balance-label {
                    font-size: 12px;
                    opacity: 0.8;
                }
                .balance-amount {
                    font-size: 20px;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .balance-icon {
                    font-size: 16px;
                }
                .menu-btn {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 5px;
                }
                .three-line-menu {
                    position: relative;
                }
                .dropdown-menu {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
                    min-width: 200px;
                    display: none;
                    z-index: 1001;
                }
                .dropdown-menu.show {
                    display: block;
                }
                .menu-item {
                    padding: 12px 20px;
                    color: #333;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    border-bottom: 1px solid #eee;
                }
                .menu-item:hover {
                    background: #f5f5f5;
                }
                .menu-item:last-child {
                    border-bottom: none;
                }
                .menu-icon {
                    font-size: 18px;
                }
            </style>
            
            <header class="app-header">
                <div class="logo-section">
                    <div class="logo">DV</div>
                    <div class="app-title">
                        <h1>Digital Vision</h1>
                        <p>Trusted Earning Platform</p>
                    </div>
                </div>
                
                <div class="balance-section">
                    <div class="balance-label">Your Balance</div>
                    <div class="balance-amount">
                        <span class="balance-icon">💎</span>
                        <span id="balance-amount">৳0</span>
                    </div>
                </div>
                
                <div class="three-line-menu">
                    <button class="menu-btn" id="menu-toggle">☰</button>
                    <div class="dropdown-menu" id="dropdown-menu">
                        <a href="#" class="menu-item" data-page="profile">
                            <span class="menu-icon">👤</span>
                            <span>My Profile</span>
                        </a>
                        <a href="#" class="menu-item" data-page="work">
                            <span class="menu-icon">💼</span>
                            <span>My Work</span>
                        </a>
                        <a href="#" class="menu-item" data-page="withdraw-history">
                            <span class="menu-icon">📊</span>
                            <span>Withdraw History</span>
                        </a>
                        <a href="#" class="menu-item" data-page="support">
                            <span class="menu-icon">💬</span>
                            <span>Support</span>
                        </a>
                        <a href="#" class="menu-item" id="channel-check">
                            <span class="menu-icon">📢</span>
                            <span>Join Channels</span>
                        </a>
                    </div>
                </div>
            </header>
        `;
        
        // Add event listeners
        this.shadowRoot.getElementById('menu-toggle').addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = this.shadowRoot.getElementById('dropdown-menu');
            menu.classList.toggle('show');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', () => {
            this.shadowRoot.getElementById('dropdown-menu').classList.remove('show');
        });
        
        // Menu item clicks
        this.shadowRoot.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.dispatchEvent(new CustomEvent('menu-click', { 
                    detail: { page },
                    bubbles: true 
                }));
                this.shadowRoot.getElementById('dropdown-menu').classList.remove('show');
            });
        });
    }
    
    updateBalance(balance = 0) {
        const balanceEl = this.shadowRoot.getElementById('balance-amount');
        if (balanceEl) {
            balanceEl.textContent = `৳${balance}`;
        }
    }
}

customElements.define('app-header', AppHeader);
