const GoogleSheetsAPI = require('./sheets');
const api = new GoogleSheetsAPI();

// API ফাংশনগুলো এক্সপোর্ট
module.exports = {
    // ইনিশিয়ালাইজেশন
    initialize: async () => await api.initialize(),
    
    // ইউজার অপারেশনস
    getAllUsers: async () => await api.getAllUsers(),
    getUser: async (userId) => await api.getUser(userId),
    addUser: async (userData) => await api.addUser(userData),
    updateUser: async (userId, updates) => await api.updateUser(userId, updates),
    
    // টাস্ক অপারেশনস
    getAllTasks: async () => await api.getAllTasks(),
    getTask: async (taskId) => await api.getTask(taskId),
    addTask: async (taskData) => await api.addTask(taskData),
    updateTask: async (taskId, updates) => await api.updateTask(taskId, updates),
    deleteTask: async (taskId) => await api.deleteTask(taskId),
    getActiveTasks: async () => {
        const tasks = await api.getAllTasks();
        return tasks.filter(task => task.status === 'active');
    },
    
    // প্রুফ অপারেশনস
    getAllProofs: async () => await api.getAllProofs(),
    getProof: async (proofId) => await api.getProof(proofId),
    addProof: async (proofData) => await api.addProof(proofData),
    updateProof: async (proofId, updates) => await api.updateProof(proofId, updates),
    getProofsByUser: async (userId) => await api.getProofsByUser(userId),
    getProofsByTask: async (taskId) => await api.getProofsByTask(taskId),
    getPendingProofs: async () => await api.getPendingProofs(),
    
    // ট্রানজেকশন অপারেশনস
    getAllTransactions: async () => await api.getAllTransactions(),
    addTransaction: async (transactionData) => await api.addTransaction(transactionData),
    getTransactionsByUser: async (userId, limit) => await api.getTransactionsByUser(userId, limit),
    getRecentTransactions: async (limit = 10) => {
        const transactions = await api.getAllTransactions();
        return transactions
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    },
    
    // উইথড্র অপারেশনস
    getAllWithdrawals: async () => await api.getAllWithdrawals(),
    getWithdrawal: async (withdrawalId) => await api.getWithdrawal(withdrawalId),
    addWithdrawal: async (withdrawalData) => await api.addWithdrawal(withdrawalData),
    updateWithdrawal: async (withdrawalId, updates) => await api.updateWithdrawal(withdrawalId, updates),
    getWithdrawalsByUser: async (userId) => await api.getWithdrawalsByUser(userId),
    getPendingWithdrawals: async () => await api.getPendingWithdrawals(),
    getPendingWithdrawalsCount: async () => await api.getPendingWithdrawalsCount(),
    
    // রেফারেল অপারেশনস
    getAllReferrals: async () => await api.getAllReferrals(),
    addReferral: async (referralData) => await api.addReferral(referralData),
    getReferrals: async (referrerId) => await api.getReferrals(referrerId),
    updateReferralBonus: async (referredId, bonusPaid) => 
        await api.updateReferralBonus(referredId, bonusPaid),
    
    // কোড অপারেশনস
    getGSTCodes: async () => await api.getGSTCodes(),
    addGSTCode: async (codeData) => await api.addGSTCode(codeData),
    updateGSTCode: async (codeId, updates) => await api.updateGSTCode(codeId, updates),
    deleteGSTCode: async (codeId) => await api.deleteGSTCode(codeId),
    
    getFCodes: async () => await api.getFCodes(),
    addFCode: async (codeData) => await api.addFCode(codeData),
    updateFCode: async (codeId, updates) => await api.updateFCode(codeId, updates),
    
    getInsiteCodes: async () => await api.getInsiteCodes(),
    addInsiteCode: async (codeData) => await api.addInsiteCode(codeData),
    updateInsiteCode: async (codeId, updates) => await api.updateInsiteCode(codeId, updates),
    
    // ডায়মন্ড অপারেশনস
    getDiamondPackages: async () => await api.getDiamondPackages(),
    addDiamondPackage: async (packageData) => await api.addDiamondPackage(packageData),
    updateDiamondPackage: async (packageId, updates) => await api.updateDiamondPackage(packageId, updates),
    deleteDiamondPackage: async (packageId) => await api.deleteDiamondPackage(packageId),
    
    // সেটিংস অপারেশনস
    getSettings: async () => await api.getSettings(),
    updateSetting: async (key, value) => await api.updateSetting(key, value),
    
    // অ্যাডমিন লগস
    addAdminLog: async (logData) => await api.addAdminLog(logData),
    getAdminLogs: async (limit) => await api.getAdminLogs(limit),
    
    // ইউটিলিটি
    backupData: async () => await api.backupData(),
    restoreData: async (backupFile) => await api.restoreData(backupFile),
    
    // সার্চ এবং ফিল্টার
    searchUsers: async (query) => {
        const users = await api.getAllUsers();
        const queryLower = query.toLowerCase();
        return users.filter(user => 
            user.username?.toLowerCase().includes(queryLower) ||
            user.userId?.includes(query) ||
            user.refCode?.toLowerCase().includes(queryLower)
        );
    },
    
    searchTasks: async (query) => {
        const tasks = await api.getAllTasks();
        const queryLower = query.toLowerCase();
        return tasks.filter(task => 
            task.title?.toLowerCase().includes(queryLower) ||
            task.description?.toLowerCase().includes(queryLower) ||
            task.id?.includes(query)
        );
    },
    
    // স্ট্যাটিস্টিক্স
    getSystemStats: async () => {
        const users = await api.getAllUsers();
        const tasks = await api.getAllTasks();
        const withdrawals = await api.getAllWithdrawals();
        const transactions = await api.getAllTransactions();
        
        const totalBalance = users.reduce((sum, user) => 
            sum + (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0), 0);
        
        const totalEarned = users.reduce((sum, user) => 
            sum + (parseInt(user.totalEarned) || 0), 0);
        
        const totalWithdrawn = withdrawals
            .filter(w => w.status === 'approved' || w.status === 'paid')
            .reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0);
        
        return {
            totalUsers: users.length,
            activeUsers: users.filter(u => u.status === 'active').length,
            totalTasks: tasks.length,
            activeTasks: tasks.filter(t => t.status === 'active').length,
            totalBalance,
            totalEarned,
            totalWithdrawn,
            pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
            pendingProofs: (await api.getPendingProofs()).length,
            totalTransactions: transactions.length
        };
    },
    
    // ডেটা এক্সপোর্ট
    exportUsersToCSV: async () => {
        const users = await api.getAllUsers();
        const headers = Object.keys(users[0] || {}).join(',');
        const rows = users.map(user => 
            Object.values(user).map(val => 
                `"${(val || '').toString().replace(/"/g, '""')}"`
            ).join(',')
        );
        return [headers, ...rows].join('\n');
    },
    
    exportTransactionsToCSV: async () => {
        const transactions = await api.getAllTransactions();
        const headers = Object.keys(transactions[0] || {}).join(',');
        const rows = transactions.map(transaction => 
            Object.values(transaction).map(val => 
                `"${(val || '').toString().replace(/"/g, '""')}"`
            ).join(',')
        );
        return [headers, ...rows].join('\n');
    },
    
    // API ইন্সট্যান্স (যদি সরাসরি এক্সেস প্রয়োজন হয়)
    apiInstance: api
};
