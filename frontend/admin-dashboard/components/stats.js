// Admin Stats Component
class AdminStats extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.stats = {};
    }
    
    connectedCallback() {
        this.render();
        this.loadStats();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .stats-container {
                    padding: 20px 0;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                }
                
                .stat-card {
                    background: white;
                    padding: 25px;
                    border-radius: 15px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }
                
                .stat-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                }
                
                .stat-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, var(--card-color, #2E8B57), transparent);
                }
                
                .stat-icon-container {
                    width: 70px;
                    height: 70px;
                    border-radius: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 30px;
                    color: white;
                    flex-shrink: 0;
                    position: relative;
                    overflow: hidden;
                }
                
                .stat-icon-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255,255,255,0.2);
                }
                
                .stat-content {
                    flex: 1;
                }
                
                .stat-value {
                    font-size: 32px;
                    font-weight: 700;
                    margin-bottom: 5px;
                    color: #333;
                    line-height: 1;
                }
                
                .stat-label {
                    font-size: 14px;
                    color: #666;
                    margin-bottom: 10px;
                    font-weight: 500;
                }
                
                .stat-trend {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 14px;
                    font-weight: 600;
                }
                
                .trend-up {
                    color: #2E8B57;
                }
                
                .trend-down {
                    color: #FF4757;
                }
                
                .trend-icon {
                    font-size: 12px;
                }
                
                .stat-details {
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid #f0f0f0;
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                    color: #666;
                }
                
                .detail-item {
                    text-align: center;
                }
                
                .detail-value {
                    font-weight: 600;
                    color: #333;
                    font-size: 14px;
                    display: block;
                }
                
                .loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 200px;
                }
                
                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #2E8B57;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @media (max-width: 768px) {
                    .stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .stat-value {
                        font-size: 28px;
                    }
                    
                    .stat-icon-container {
                        width: 60px;
                        height: 60px;
                        font-size: 24px;
                    }
                }
                
                @media (max-width: 480px) {
                    .stats-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
            
            <div class="stats-container">
                <div class="stats-grid" id="stats-grid">
                    <!-- Stats cards will be loaded here -->
                    <div class="loading">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadStats() {
        try {
            const response = await fetch('/api/admin/stats/detailed');
            this.stats = await response.json();
            this.renderStats();
        } catch (error) {
            console.error('Failed to load stats:', error);
            this.showError();
        }
    }
    
    renderStats() {
        const container = this.shadowRoot.getElementById('stats-grid');
        
        if (!this.stats || Object.keys(this.stats).length === 0) {
            container.innerHTML = `
                <div class="error-message">
                    Failed to load statistics
                </div>
            `;
            return;
        }
        
        const statsData = [
            {
                id: 'users',
                label: 'Total Users',
                value: this.stats.totalUsers,
                trend: this.stats.userGrowth,
                icon: 'fas fa-users',
                color: '#667eea',
                details: [
                    { label: 'Active', value: this.stats.activeUsers },
                    { label: 'New Today', value: this.stats.newUsersToday }
                ]
            },
            {
                id: 'earnings',
                label: 'Total Earned',
                value: `৳${this.formatNumber(this.stats.totalEarnings)}`,
                trend: this.stats.earningsGrowth,
                icon: 'fas fa-money-bill-wave',
                color: '#2E8B57',
                details: [
                    { label: 'Today', value: `৳${this.formatNumber(this.stats.earningsToday)}` },
                    { label: 'This Month', value: `৳${this.formatNumber(this.stats.earningsMonth)}` }
                ]
            },
            {
                id: 'tasks',
                label: 'Tasks Completed',
                value: this.stats.completedTasks,
                trend: this.stats.taskGrowth,
                icon: 'fas fa-tasks',
                color: '#FF6B6B',
                details: [
                    { label: 'Pending', value: this.stats.pendingTasks },
                    { label: 'Today', value: this.stats.tasksToday }
                ]
            },
            {
                id: 'withdrawals',
                label: 'Total Withdrawn',
                value: `৳${this.formatNumber(this.stats.totalWithdrawn)}`,
                trend: this.stats.withdrawalGrowth,
                icon: 'fas fa-hand-holding-usd',
                color: '#FFA502',
                details: [
                    { label: 'Pending', value: this.stats.pendingWithdrawals },
                    { label: 'Today', value: `৳${this.formatNumber(this.stats.withdrawnToday)}` }
                ]
            },
            {
                id: 'revenue',
                label: 'Platform Revenue',
                value: `৳${this.formatNumber(this.stats.platformRevenue)}`,
                trend: this.stats.revenueGrowth,
                icon: 'fas fa-chart-line',
                color: '#06D6A0',
                details: [
                    { label: 'Net Profit', value: `৳${this.formatNumber(this.stats.netProfit)}` },
                    { label: 'This Month', value: `৳${this.formatNumber(this.stats.revenueMonth)}` }
                ]
            },
            {
                id: 'referrals',
                label: 'Referral Earnings',
                value: `৳${this.formatNumber(this.stats.referralEarnings)}`,
                trend: this.stats.referralGrowth,
                icon: 'fas fa-user-plus',
                color: '#7209B7',
                details: [
                    { label: 'Total Referrals', value: this.stats.totalReferrals },
                    { label: 'Active', value: this.stats.activeReferrals }
                ]
            }
        ];
        
        container.innerHTML = statsData.map(stat => `
            <div class="stat-card" style="--card-color: ${stat.color}">
                <div class="stat-icon-container" style="background: ${stat.color}">
                    <i class="${stat.icon}"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stat.value}</div>
                    <div class="stat-label">${stat.label}</div>
                    <div class="stat-trend ${stat.trend >= 0 ? 'trend-up' : 'trend-down'}">
                        <i class="trend-icon fas fa-${stat.trend >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        <span>${Math.abs(stat.trend)}%</span>
                    </div>
                    ${stat.details ? `
                        <div class="stat-details">
                            ${stat.details.map(detail => `
                                <div class="detail-item">
                                    <span class="detail-label">${detail.label}</span>
                                    <span class="detail-value">${detail.value}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }
    
    showError() {
        const container = this.shadowRoot.getElementById('stats-grid');
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #FF6B6B; margin-bottom: 20px;"></i>
                <h3 style="color: #333; margin-bottom: 10px;">Failed to Load Statistics</h3>
                <p style="color: #666; margin-bottom: 20px;">Please check your connection and try again.</p>
                <button id="retry-btn" style="
                    background: #2E8B57;
                    color: white;
                    border: none;
                    padding: 10px 25px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: 500;
                ">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
        
        // Add retry functionality
        this.shadowRoot.getElementById('retry-btn').addEventListener('click', () => {
            this.loadStats();
        });
    }
    
    updateStat(statId, value, trend) {
        const card = this.shadowRoot.querySelector(`.stat-card[data-stat="${statId}"]`);
        if (card) {
            const valueElement = card.querySelector('.stat-value');
            const trendElement = card.querySelector('.stat-trend');
            
            if (valueElement) valueElement.textContent = value;
            if (trendElement) {
                trendElement.className = `stat-trend ${trend >= 0 ? 'trend-up' : 'trend-down'}`;
                trendElement.innerHTML = `
                    <i class="trend-icon fas fa-${trend >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                    <span>${Math.abs(trend)}%</span>
                `;
            }
        }
    }
    
    refresh() {
        this.loadStats();
    }
}

customElements.define('admin-stats', AdminStats);
