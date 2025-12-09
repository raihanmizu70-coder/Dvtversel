// Navigation Bar Component
class AppNavigation extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.activePage = 'home';
    }
    
    connectedCallback() {
        this.render();
    }
    
    setActive(page) {
        this.activePage = page;
        this.render();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .nav-container {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: white;
                    border-top: 1px solid #e0e0e0;
                    padding: 10px 0;
                    z-index: 1000;
                    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
                }
                .nav-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 5px;
                    padding: 0 10px;
                }
                .nav-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 10px 5px;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-decoration: none;
                    color: #666;
                }
                .nav-item:hover {
                    background: #f5f5f5;
                }
                .nav-item.active {
                    background: linear-gradient(135deg, #2E8B57 0%, #3CB371 100%);
                    color: white;
                    transform: translateY(-5px);
                }
                .nav-icon {
                    font-size: 20px;
                    margin-bottom: 5px;
                }
                .nav-label {
                    font-size: 11px;
                    font-weight: 500;
                }
                .badge {
                    position: absolute;
                    top: 5px;
                    right: 15px;
                    background: #FF4757;
                    color: white;
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-weight: bold;
                    min-width: 18px;
                    text-align: center;
                }
                .nav-item.with-badge {
                    position: relative;
                }
                @media (min-width: 768px) {
                    .nav-container {
                        position: relative;
                        margin-top: 20px;
                        border-radius: 15px;
                        border: 1px solid #e0e0e0;
                    }
                    .nav-grid {
                        gap: 10px;
                    }
                }
            </style>
            
            <nav class="nav-container">
                <div class="nav-grid">
                    <a class="nav-item ${this.activePage === 'home' ? 'active' : ''}" 
                       data-page="home">
                        <span class="nav-icon">🏠</span>
                        <span class="nav-label">Home</span>
                    </a>
                    
                    <a class="nav-item ${this.activePage === 'refer' ? 'active' : ''} with-badge" 
                       data-page="refer">
                        <span class="nav-icon">👥</span>
                        <span class="nav-label">Refer</span>
                        <span class="badge" id="refer-badge">5</span>
                    </a>
                    
                    <a class="nav-item ${this.activePage === 'income' ? 'active' : ''} with-badge" 
                       data-page="income">
                        <span class="nav-icon">💸</span>
                        <span class="nav-label">My Income</span>
                    </a>
                    
                    <a class="nav-item ${this.activePage === 'withdraw' ? 'active' : ''}" 
                       data-page="withdraw">
                        <span class="nav-icon">💳</span>
                        <span class="nav-label">Withdraw</span>
                    </a>
                    
                    <a class="nav-item ${this.activePage === 'profile' ? 'active' : ''}" 
                       data-page="profile">
                        <span class="nav-icon">👤</span>
                        <span class="nav-label">Profile</span>
                    </a>
                </div>
            </nav>
        `;
        
        // Add click events
        this.shadowRoot.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.setActive(page);
                
                this.dispatchEvent(new CustomEvent('nav-change', {
                    detail: { page },
                    bubbles: true
                }));
            });
        });
    }
    
    updateBadge(count, type = 'refer') {
        const badge = this.shadowRoot.getElementById(`${type}-badge`);
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        }
    }
}

customElements.define('app-navigation', AppNavigation);
