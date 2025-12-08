const express = require('express');
const router = express.Router();
const helpers = require('../../telegram-bot/utils/helpers');
const WalletSystem = require('../../telegram-bot/utils/wallet');

// Middleware to check admin access
const adminMiddleware = (req, res, next) => {
    const adminId = parseInt(req.headers['x-admin-id']);
    if (!adminId || adminId !== 6561117046) {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }
    next();
};

router.use(adminMiddleware);

// Get all users with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            search = '', 
            status = '',
            sortBy = 'joinedAt',
            sortOrder = 'desc'
        } = req.query;
        
        const db = req.app.get('db');
        const users = await db.getAllUsers();
        
        // Apply filters
        let filteredUsers = users;
        
        if (search) {
            const searchLower = search.toLowerCase();
            filteredUsers = filteredUsers.filter(user => 
                user.username?.toLowerCase().includes(searchLower) ||
                user.userId?.toString().includes(search) ||
                user.refCode?.toLowerCase().includes(searchLower)
            );
        }
        
        if (status) {
            filteredUsers = filteredUsers.filter(user => user.status === status);
        }
        
        // Apply sorting
        filteredUsers.sort((a, b) => {
            let aValue = a[sortBy] || '';
            let bValue = b[sortBy] || '';
            
            // Handle numeric sorting for balance fields
            if (sortBy.includes('Wallet') || sortBy === 'totalEarned') {
                aValue = parseInt(aValue) || 0;
                bValue = parseInt(bValue) || 0;
            }
            
            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
        
        // Paginate
        const paginated = helpers.paginate(filteredUsers, parseInt(page), parseInt(limit));
        
        res.json({
            success: true,
            data: {
                users: paginated.data.map(user => ({
                    id: user.userId,
                    username: user.username || 'N/A',
                    firstName: user.first_name || '',
                    lastName: user.last_name || '',
                    refCode: user.refCode || 'N/A',
                    status: user.status || 'active',
                    balance: {
                        main: parseInt(user.mainWallet) || 0,
                        cash: parseInt(user.cashWallet) || 0,
                        total: (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0)
                    },
                    earnings: {
                        total: parseInt(user.totalEarned) || 0,
                        referral: parseInt(user.refEarned) || 0,
                        task: (parseInt(user.totalEarned) || 0) - (parseInt(user.refEarned) || 0)
                    },
                    activity: {
                        joined: user.joinedAt,
                        lastActive: user.lastActive || user.joinedAt,
                        tasksCompleted: user.completedTasks || 0,
                        referrals: user.refCount || 0
                    },
                    flags: {
                        isBanned: user.status === 'banned',
                        isPremium: user.isPremium === 'true',
                        hasWithdrawn: user.hasWithdrawn === 'true'
                    }
                })),
                pagination: {
                    page: paginated.page,
                    limit: paginated.limit,
                    total: paginated.total,
                    totalPages: paginated.totalPages,
                    hasNext: paginated.hasNext,
                    hasPrev: paginated.hasPrev
                },
                summary: {
                    total: users.length,
                    active: users.filter(u => u.status === 'active').length,
                    banned: users.filter(u => u.status === 'banned').length,
                    premium: users.filter(u => u.isPremium === 'true').length,
                    totalBalance: users.reduce((sum, u) => sum + (parseInt(u.mainWallet) || 0) + (parseInt(u.cashWallet) || 0), 0),
                    totalEarnings: users.reduce((sum, u) => sum + (parseInt(u.totalEarned) || 0), 0)
                }
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json(helpers.errorResponse('Failed to get users', error));
    }
});

// Get single user details
router.get('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const db = req.app.get('db');
        
        const user = await db.getUser(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Get additional data
        const wallet = new WalletSystem(db);
        const transactions = await wallet.getTransactionHistory(userId, 50);
        const withdrawals = await wallet.getWithdrawalHistory(userId, 50);
        const referrals = await db.getReferrals(userId);
        const proofs = await db.getProofsByUser(userId);
        
        res.json({
            success: true,
            data: {
                profile: {
                    id: user.userId,
                    username: user.username || 'N/A',
                    firstName: user.first_name || '',
                    lastName: user.last_name || '',
                    language: user.language_code || 'en',
                    refCode: user.refCode || 'N/A',
                    status: user.status || 'active',
                    joined: user.joinedAt,
                    lastActive: user.lastActive || user.joinedAt,
                    isPremium: user.isPremium === 'true',
                    bannedReason: user.banReason || '',
                    bannedBy: user.bannedBy || '',
                    bannedAt: user.bannedAt || ''
                },
                financial: {
                    balances: {
                        main: parseInt(user.mainWallet) || 0,
                        cash: parseInt(user.cashWallet) || 0,
                        total: (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0)
                    },
                    earnings: {
                        total: parseInt(user.totalEarned) || 0,
                        referral: parseInt(user.refEarned) || 0,
                        task: (parseInt(user.totalEarned) || 0) - (parseInt(user.refEarned) || 0),
                        other: 0
                    },
                    withdrawals: {
                        total: withdrawals.filter(w => w.status === 'approved').reduce((sum, w) => sum + w.amount, 0),
                        pending: withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0),
                        count: withdrawals.length
                    }
                },
                activity: {
                    tasks: {
                        completed: proofs.filter(p => p.status === 'approved').length,
                        pending: proofs.filter(p => p.status === 'pending').length,
                        rejected: proofs.filter(p => p.status === 'rejected').length,
                        total: proofs.length
                    },
                    referrals: {
                        total: referrals.length,
                        active: referrals.filter(r => r.bonusPaid === 'true').length,
                        earnings: referrals.filter(r => r.bonusPaid === 'true').length * 5
                    },
                    lastTransaction: transactions[0] || null
                },
                transactions: transactions.slice(0, 20).map(tx => ({
                    id: tx.id,
                    type: tx.type,
                    amount: tx.amount,
                    description: tx.description,
                    timestamp: tx.timestamp,
                    balanceAfter: tx.balanceAfter
                })),
                withdrawals: withdrawals.slice(0, 20).map(wd => ({
                    id: wd.id,
                    amount: wd.amount,
                    charges: wd.charges,
                    netAmount: wd.netAmount,
                    method: wd.method,
                    status: wd.status,
                    requestedAt: wd.requestedAt,
                    processedAt: wd.processedAt
                })),
                referrals: referrals.map(ref => ({
                    referredId: ref.referredId,
                    timestamp: ref.timestamp,
                    bonusPaid: ref.bonusPaid === 'true'
                }))
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json(helpers.errorResponse('Failed to get user', error));
    }
});

// Update user
router.put('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const updates = req.body;
        const db = req.app.get('db');
        
        // Check if user exists
        const user = await db.getUser(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Allowed updates
        const allowedUpdates = ['username', 'first_name', 'last_name', 'status', 'isPremium', 'refCode'];
        const filteredUpdates = {};
        
        for (const key in updates) {
            if (allowedUpdates.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        }
        
        await db.updateUser(userId, filteredUpdates);
        
        res.json({
            success: true,
            message: 'User updated successfully',
            updates: filteredUpdates
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json(helpers.errorResponse('Failed to update user', error));
    }
});

// Update user balance
router.post('/:id/balance', async (req, res) => {
    try {
        const userId = req.params.id;
        const { type, amount, description } = req.body;
        const db = req.app.get('db');
        
        if (!amount || isNaN(amount)) {
            return res.status(400).json({
                success: false,
                error: 'Valid amount is required'
            });
        }
        
        const wallet = new WalletSystem(db);
        const result = await wallet.createCustomTransaction(
            userId,
            parseFloat(amount),
            type || 'admin_adjustment',
            description || `Admin adjustment by ${req.headers['x-admin-id']}`
        );
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Balance updated successfully',
                data: {
                    userId: userId,
                    type: type,
                    amount: amount,
                    newBalance: result.newBalance,
                    transactionId: result.transactionId
                }
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Update user balance error:', error);
        res.status(500).json(helpers.errorResponse('Failed to update balance', error));
    }
});

// Ban user
router.post('/:id/ban', async (req, res) => {
    try {
        const userId = req.params.id;
        const { reason } = req.body;
        const db = req.app.get('db');
        
        await db.updateUser(userId, {
            status: 'banned',
            banReason: reason || 'Banned by admin',
            bannedAt: new Date().toISOString(),
            bannedBy: req.headers['x-admin-id'] || 6561117046
        });
        
        res.json({
            success: true,
            message: 'User banned successfully',
            data: {
                userId: userId,
                reason: reason,
                bannedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Ban user error:', error);
        res.status(500).json(helpers.errorResponse('Failed to ban user', error));
    }
});

// Unban user
router.post('/:id/unban', async (req, res) => {
    try {
        const userId = req.params.id;
        const db = req.app.get('db');
        
        await db.updateUser(userId, {
            status: 'active',
            banReason: '',
            bannedAt: '',
            bannedBy: ''
        });
        
        res.json({
            success: true,
            message: 'User unbanned successfully',
            data: {
                userId: userId,
                unbannedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Unban user error:', error);
        res.status(500).json(helpers.errorResponse('Failed to unban user', error));
    }
});

// Get user transactions
router.get('/:id/transactions', async (req, res) => {
    try {
        const userId = req.params.id;
        const { page = 1, limit = 50, type = '' } = req.query;
        const db = req.app.get('db');
        
        const wallet = new WalletSystem(db);
        let transactions = await wallet.getTransactionHistory(userId, 1000); // Get all
        
        if (type) {
            transactions = transactions.filter(tx => tx.type === type);
        }
        
        // Sort by timestamp (newest first)
        transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const paginated = helpers.paginate(transactions, parseInt(page), parseInt(limit));
        
        res.json({
            success: true,
            data: {
                transactions: paginated.data.map(tx => ({
                    id: tx.id,
                    type: tx.type,
                    amount: tx.amount,
                    description: tx.description,
                    timestamp: tx.timestamp,
                    balanceAfter: tx.balanceAfter,
                    emoji: helpers.getEmojiByValue(tx.type.includes('add') ? 'add' : 'deduct', 'status')
                })),
                pagination: {
                    page: paginated.page,
                    limit: paginated.limit,
                    total: paginated.total,
                    totalPages: paginated.totalPages,
                    hasNext: paginated.hasNext,
                    hasPrev: paginated.hasPrev
                },
                summary: {
                    total: transactions.length,
                    deposits: transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
                    withdrawals: Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)),
                    netBalance: transactions.reduce((sum, t) => sum + t.amount, 0)
                }
            }
        });
    } catch (error) {
        console.error('Get user transactions error:', error);
        res.status(500).json(helpers.errorResponse('Failed to get transactions', error));
    }
});

// Get user withdrawals
router.get('/:id/withdrawals', async (req, res) => {
    try {
        const userId = req.params.id;
        const { page = 1, limit = 20, status = '' } = req.query;
        const db = req.app.get('db');
        
        const wallet = new WalletSystem(db);
        let withdrawals = await wallet.getWithdrawalHistory(userId, 1000); // Get all
        
        if (status) {
            withdrawals = withdrawals.filter(wd => wd.status === status);
        }
        
        // Sort by requested date (newest first)
        withdrawals.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
        
        const paginated = helpers.paginate(withdrawals, parseInt(page), parseInt(limit));
        
        res.json({
            success: true,
            data: {
                withdrawals: paginated.data.map(wd => ({
                    id: wd.id,
                    amount: wd.amount,
                    charges: wd.charges,
                    netAmount: wd.netAmount,
                    method: wd.method,
                    status: wd.status,
                    requestedAt: wd.requestedAt,
                    processedAt: wd.processedAt,
                    emoji: helpers.getEmojiByValue(wd.status, 'payment')
                })),
                pagination: {
                    page: paginated.page,
                    limit: paginated.limit,
                    total: paginated.total,
                    totalPages: paginated.totalPages,
                    hasNext: paginated.hasNext,
                    hasPrev: paginated.hasPrev
                },
                summary: {
                    total: withdrawals.length,
                    pending: withdrawals.filter(w => w.status === 'pending').length,
                    approved: withdrawals.filter(w => w.status === 'approved').length,
                    rejected: withdrawals.filter(w => w.status === 'rejected').length,
                    totalAmount: withdrawals.reduce((sum, w) => sum + w.amount, 0),
                    totalNetAmount: withdrawals.reduce((sum, w) => sum + w.netAmount, 0)
                }
            }
        });
    } catch (error) {
        console.error('Get user withdrawals error:', error);
        res.status(500).json(helpers.errorResponse('Failed to get withdrawals', error));
    }
});

// Get user proofs
router.get('/:id/proofs', async (req, res) => {
    try {
        const userId = req.params.id;
        const { page = 1, limit = 20, status = '' } = req.query;
        const db = req.app.get('db');
        
        let proofs = await db.getProofsByUser(userId);
        
        if (status) {
            proofs = proofs.filter(p => p.status === status);
        }
        
        // Sort by submitted date (newest first)
        proofs.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        
        const paginated = helpers.paginate(proofs, parseInt(page), parseInt(limit));
        
        // Get task details for each proof
        const proofDetails = await Promise.all(
            paginated.data.map(async (proof) => {
                const task = await db.getTask(proof.taskId);
                
                return {
                    id: proof.id,
                    task: {
                        id: task?.id,
                        title: task?.title,
                        reward: task?.reward
                    },
                    status: proof.status,
                    reward: proof.reward,
                    submittedAt: proof.submittedAt,
                    verifiedAt: proof.verifiedAt,
                    adminNote: proof.adminNote,
                    emoji: helpers.getEmojiByValue(proof.status, 'status')
                };
            })
        );
        
        res.json({
            success: true,
            data: {
                proofs: proofDetails,
                pagination: {
                    page: paginated.page,
                    limit: paginated.limit,
                    total: paginated.total,
                    totalPages: paginated.totalPages,
                    hasNext: paginated.hasNext,
                    hasPrev: paginated.hasPrev
                },
                summary: {
                    total: proofs.length,
                    approved: proofs.filter(p => p.status === 'approved').length,
                    rejected: proofs.filter(p => p.status === 'rejected').length,
                    pending: proofs.filter(p => p.status === 'pending').length,
                    totalRewards: proofs
                        .filter(p => p.status === 'approved')
                        .reduce((sum, p) => sum + (parseInt(p.reward) || 0), 0)
                }
            }
        });
    } catch (error) {
        console.error('Get user proofs error:', error);
        res.status(500).json(helpers.errorResponse('Failed to get proofs', error));
    }
});

// Get user referrals
router.get('/:id/referrals', async (req, res) => {
    try {
        const userId = req.params.id;
        const { page = 1, limit = 20 } = req.query;
        const db = req.app.get('db');
        
        const referrals = await db.getReferrals(userId);
        
        // Sort by timestamp (newest first)
        referrals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const paginated = helpers.paginate(referrals, parseInt(page), parseInt(limit));
        
        // Get user details for each referral
        const referralDetails = await Promise.all(
            paginated.data.map(async (ref) => {
                const user = await db.getUser(ref.referredId);
                
                return {
                    referredId: ref.referredId,
                    referredUser: {
                        username: user?.username || 'N/A',
                        joined: user?.joinedAt
                    },
                    timestamp: ref.timestamp,
                    bonusPaid: ref.bonusPaid === 'true',
                    emoji: ref.bonusPaid === 'true' ? '💰' : '⏳'
                };
            })
        );
        
        res.json({
            success: true,
            data: {
                referrals: referralDetails,
                pagination: {
                    page: paginated.page,
                    limit: paginated.limit,
                    total: paginated.total,
                    totalPages: paginated.totalPages,
                    hasNext: paginated.hasNext,
                    hasPrev: paginated.hasPrev
                },
                summary: {
                    total: referrals.length,
                    bonusPaid: referrals.filter(r => r.bonusPaid === 'true').length,
                    bonusPending: referrals.filter(r => r.bonusPaid !== 'true').length,
                    totalBonus: referrals.filter(r => r.bonusPaid === 'true').length * 5
                }
            }
        });
    } catch (error) {
        console.error('Get user referrals error:', error);
        res.status(500).json(helpers.errorResponse('Failed to get referrals', error));
    }
});

// User search
router.get('/search/:query', async (req, res) => {
    try {
        const query = req.params.query;
        const db = req.app.get('db');
        
        const users = await db.getAllUsers();
        
        const results = users.filter(user => 
            user.username?.toLowerCase().includes(query.toLowerCase()) ||
            user.userId?.toString().includes(query) ||
            user.refCode?.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10);
        
        res.json({
            success: true,
            data: results.map(user => ({
                id: user.userId,
                username: user.username || 'N/A',
                refCode: user.refCode || 'N/A',
                status: user.status || 'active',
                balance: (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0),
                joined: user.joinedAt
            }))
        });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json(helpers.errorResponse('Failed to search users', error));
    }
});

// Export users data
router.get('/export/csv', async (req, res) => {
    try {
        const db = req.app.get('db');
        const users = await db.getAllUsers();
        
        // Create CSV headers
        const headers = [
            'User ID',
            'Username',
            'First Name',
            'Last Name',
            'Referral Code',
            'Main Wallet',
            'Cash Wallet',
            'Total Balance',
            'Total Earned',
            'Referral Earnings',
            'Status',
            'Joined Date',
            'Last Active'
        ];
        
        // Create CSV rows
        const rows = users.map(user => [
            user.userId,
            user.username || '',
            user.first_name || '',
            user.last_name || '',
            user.refCode || '',
            parseInt(user.mainWallet) || 0,
            parseInt(user.cashWallet) || 0,
            (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0),
            parseInt(user.totalEarned) || 0,
            parseInt(user.refEarned) || 0,
            user.status || 'active',
            user.joinedAt,
            user.lastActive || user.joinedAt
        ]);
        
        // Combine headers and rows
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        
        // Set response headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=users-export-${Date.now()}.csv`);
        
        res.send(csvContent);
    } catch (error) {
        console.error('Export users error:', error);
        res.status(500).json(helpers.errorResponse('Failed to export users', error));
    }
});

module.exports = router;
