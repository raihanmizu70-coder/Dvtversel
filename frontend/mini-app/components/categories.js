// Categories Component
class CategoryGrid extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.categories = [];
    }
    
    connectedCallback() {
        this.loadCategories();
    }
    
    async loadCategories() {
        try {
            const response = await fetch('/api/categories');
            this.categories = await response.json();
            this.render();
        } catch (error) {
            console.error('Failed to load categories:', error);
            this.categories = this.getDefaultCategories();
            this.render();
        }
    }
    
    getDefaultCategories() {
        return [
            { id: 1, name: 'Micro Job', icon: '🧩', color: '#FF6B6B', description: 'Complete small tasks and earn money' },
            { id: 2, name: 'GST.Code Sell', icon: '💌', color: '#4ECDC4', description: 'Buy GST codes instantly' },
            { id: 3, name: 'F.Code Sell', icon: '📘', color: '#FFD166', description: 'Purchase F codes' },
            { id: 4, name: 'Insite Sell', icon: '📸', color: '#06D6A0', description: 'Facebook related services' },
            { id: 5, name: 'Hack ID Recover', icon: '🛠️', color: '#118AB2', description: 'Recover banned accounts' },
            { id: 6, name: 'Diamond Top-Up', icon: '💎', color: '#EF476F', description: 'Top up game diamonds' },
            { id: 7, name: 'Shop', icon: '🏪', color: '#073B4C', description: 'Visit our online shop' },
            { id: 8, name: 'GetLike', icon: '💥', color: '#7209B7', description: 'Get likes and followers' },
            { id: 9, name: 'Niva Coin Sell', icon: '💰', color: '#F3722C', description: 'Buy Niva coins' },
            { id: 10, name: 'TikTok', icon: '🎵', color: '#000000', description: 'TikTok services' }
        ];
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .categories-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    padding: 20px;
                }
                .category-card {
                    background: white;
                    border-radius: 15px;
                    padding: 20px 15px;
                    text-align: center;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border: 2px solid transparent;
                    position: relative;
                    overflow: hidden;
                }
                .category-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                }
                .category-card:active {
                    transform: translateY(0);
                }
                .category-icon {
                    font-size: 40px;
                    margin-bottom: 10px;
                    display: block;
                }
                .category-name {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 5px;
                    color: #333;
                }
                .category-desc {
                    font-size: 12px;
                    color: #666;
                    line-height: 1.3;
                }
                .category-badge {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: #FF4757;
                    color: white;
                    font-size: 10px;
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-weight: bold;
                }
                .new-badge {
                    background: #2ED573;
                }
                .popular-badge {
                    background: #FFA502;
                }
                .locked {
                    opacity: 0.7;
                    position: relative;
                }
                .locked::after {
                    content: '🔒';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 30px;
                    background: rgba(0,0,0,0.7);
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 15px;
                }
                @media (min-width: 768px) {
                    .categories-grid {
                        grid-template-columns: repeat(3, 1fr);
                        gap: 20px;
                        padding: 30px;
                    }
                }
            </style>
            
            <div class="categories-grid">
                ${this.categories.map(cat => `
                    <div class="category-card" 
                         style="border-color: ${cat.color}"
                         data-category="${cat.id}"
                         ${cat.locked ? 'data-locked="true"' : ''}>
                        ${cat.badge ? `<span class="category-badge ${cat.badge}-badge">${cat.badge.toUpperCase()}</span>` : ''}
                        <span class="category-icon">${cat.icon}</span>
                        <div class="category-name">${cat.name}</div>
                        <div class="category-desc">${cat.description}</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add click events
        this.shadowRoot.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const categoryId = card.dataset.category;
                const isLocked = card.dataset.locked === 'true';
                
                if (isLocked) {
                    this.dispatchEvent(new CustomEvent('category-locked', {
                        detail: { categoryId },
                        bubbles: true
                    }));
                    return;
                }
                
                this.dispatchEvent(new CustomEvent('category-click', {
                    detail: { categoryId },
                    bubbles: true
                }));
            });
        });
    }
}

customElements.define('category-grid', CategoryGrid);
