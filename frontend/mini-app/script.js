// Digital Vision Mini App - Main Script
document.addEventListener('DOMContentLoaded', function() {
    // Telegram WebApp Initialization
    const tg = window.Telegram.WebApp;
    tg.expand();
    tg.enableClosingConfirmation();
    tg.setHeaderColor('#2E8B57');
    tg.setBackgroundColor('#121212');
    
    // Global State
    let userData = {
        id: tg.initDataUnsafe.user?.id || 0,
        balance: 0,
        mainWallet: 0,
        cashWallet: 0,
        referrals: 0,
        tasksCompleted: 0
    };
    
    // DOM Elements
    const homePage = document.getElementById('home-page');
    const profilePage = document.getElementById('profile-page');
    const withdrawPage = document.getElementById('withdraw-page');
    const referPage = document.getElementById('refer-page');
    const incomePage = document.getElementById('income-page');
    const navBtns = document.querySelectorAll('.nav-btn');
    
    // Navigation
    function showPage(pageId) {
        [homePage, profilePage, withdrawPage, referPage, incomePage].forEach(page => {
            page.style.display = 'none';
        });
        document.getElementById(pageId).style.display = 'block';
        
        // Update active nav
        navBtns.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        // Load page data
        if (pageId === 'profile-page') loadProfile();
        if (pageId === 'withdraw-page') loadWithdraw();
        if (pageId === 'income-page') loadIncome();
    }
    
    // Load Profile Data
    function loadProfile() {
        fetch(`/api/users/${userData.id}`)
            .then(res => res.json())
            .then(data => {
                document.getElementById('user-balance').textContent = `৳${data.balance}`;
                document.getElementById('main-wallet').textContent = `৳${data.mainWallet}`;
                document.getElementById('cash-wallet').textContent = `৳${data.cashWallet}`;
                document.getElementById('referral-count').textContent = data.referrals;
                document.getElementById('tasks-count').textContent = data.tasksCompleted;
                document.getElementById('referral-code').textContent = data.referralCode;
            });
    }
    
    // Load Withdraw Options
    function loadWithdraw() {
        const amounts = [100, 300, 500, 1000];
        const container = document.getElementById('withdraw-options');
        container.innerHTML = amounts.map(amount => `
            <div class="withdraw-option" data-amount="${amount}">
                <span>৳${amount}</span>
                <button class="btn-withdraw" onclick="requestWithdraw(${amount})">Withdraw</button>
            </div>
        `).join('');
    }
    
    // Load Income History
    function loadIncome() {
        fetch(`/api/users/${userData.id}/income`)
            .then(res => res.json())
            .then(transactions => {
                const container = document.getElementById('income-history');
                container.innerHTML = transactions.map(t => `
                    <div class="transaction-item">
                        <div class="trans-type ${t.type}">${t.type.toUpperCase()}</div>
                        <div class="trans-amount ${t.amount > 0 ? 'positive' : 'negative'}">
                            ${t.amount > 0 ? '+' : ''}৳${t.amount}
                        </div>
                        <div class="trans-date">${new Date(t.date).toLocaleDateString()}</div>
                        <div class="trans-desc">${t.description}</div>
                    </div>
                `).join('');
            });
    }
    
    // Referral System
    function copyReferralLink() {
        const link = `https://t.me/${tg.initDataUnsafe.user?.username || 'bot'}?start=ref_${userData.id}`;
        navigator.clipboard.writeText(link);
        alert('Referral link copied!');
    }
    
    // Task Handling
    function startTask(taskId) {
        fetch(`/api/tasks/${taskId}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userData.id })
        })
        .then(res => res.json())
        .then(task => {
            // Show task modal with instructions
            showTaskModal(task);
        });
    }
    
    function showTaskModal(task) {
        const modal = document.createElement('div');
        modal.className = 'task-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>${task.title}</h3>
                <p>${task.instructions}</p>
                <a href="${task.link}" target="_blank" class="task-link">Click Here to Start</a>
                <div class="upload-section">
                    <p>Submit screenshot after completion:</p>
                    <input type="file" id="screenshot-upload" accept="image/*">
                    <button onclick="submitTask(${task.id})">Submit Task</button>
                </div>
                <button onclick="this.closest('.task-modal').remove()">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Event Listeners
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.target.dataset.page;
            showPage(page);
        });
    });
    
    // Initialize
    showPage('home-page');
    
    // Global functions
    window.requestWithdraw = function(amount) {
        if (userData.cashWallet < amount) {
            alert(`Minimum ৳${amount} required in Cash Wallet!`);
            return;
        }
        
        if (confirm(`Withdraw ৳${amount}? Charge will be ${calculateCharge(amount)}৳`)) {
            fetch('/api/payments/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    amount: amount,
                    method: 'bkash' // Default
                })
            })
            .then(res => res.json())
            .then(data => {
                alert('Withdraw request submitted!');
                loadProfile();
            });
        }
    };
    
    window.submitTask = function(taskId) {
        const fileInput = document.getElementById('screenshot-upload');
        if (!fileInput.files[0]) {
            alert('Please upload screenshot!');
            return;
        }
        
        const formData = new FormData();
        formData.append('screenshot', fileInput.files[0]);
        formData.append('userId', userData.id);
        formData.append('taskId', taskId);
        
        fetch(`/api/tasks/${taskId}/submit`, {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(result => {
            alert('Task submitted for review!');
            document.querySelector('.task-modal').remove();
        });
    };
    
    function calculateCharge(amount) {
        const isFirstWithdraw = true; // Check from DB
        if (isFirstWithdraw) {
            return Math.floor(amount * 0.1) + 10;
        }
        return Math.floor(amount * 0.1);
    }
    
    // Send data to Telegram
    tg.ready();
    tg.MainButton.setText('START EARNING').show().onClick(() => {
        showPage('home-page');
    });
});
