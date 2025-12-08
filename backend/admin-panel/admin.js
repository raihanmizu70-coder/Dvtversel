const express = require('express');
const router = express.Router();
const helpers = require('../../telegram-bot/utils/helpers');
const WalletSystem = require('../../telegram-bot/utils/wallet');
const GoogleSheetsDB = require('../google-sheets/sheets');

class AdminPanel {
    constructor(db) {
        this.db = db;
        this.wallet = new WalletSystem(db);
        this.adminId = 6561117046; // আপনার টেলিগ্রাম আইডি
        this.adminUsername = '@Miju132';
        this.adminName = 'ᴺꪎᵗ.M i z u メ';
        
        // এডমিনদের লিস্ট
        this.admins = [
            {
                id: 6561117046,
                username: '@Miju132',
                name: 'ᴺꪎᵗ.M i z u メ',
                role: 'super_admin',
                permissions: ['all']
            }
        ];
        
        // Initialize routes
        this.initializeRoutes();
    }
    
    initializeRoutes() {
        // Middleware - শুধুমাত্র এডমিন এক্সেস
        router.use(this.adminMiddleware.bind(this));
        
        // Dashboard routes
        router.get('/dashboard', this.getDashboard.bind(this));
        router.get('/stats', this.getStats.bind(this));
        router.get('/realtime', this.getRealtimeStats.bind(this));
        
        // User management routes
        router.get('/users', this.getUsers.bind(this));
        router.get('/users/:id', this.getUser.bind(this));
        router.post('/users/:id/update', this.updateUser.bind(this));
        router.post('/users/:id/balance', this.updateUserBalance.bind(this));
        router.post('/users/:id/ban', this.banUser.bind(this));
        router.post('/users/:id/unban', this.unbanUser.bind(this));
        
        // Task management routes
        router.get('/tasks', this.getTasks.bind(this));
        router.get('/tasks/:id', this.getTask.bind(this));
        router.post('/tasks/create', this.createTask.bind(this));
        router.post('/tasks/:id/update', this.updateTask.bind(this));
        router.post('/tasks/:id/delete', this.deleteTask.bind(this));
        router.post('/tasks/:id/activate', this.activateTask.bind(this));
        router.post('/tasks/:id/deactivate', this.deactivateTask.bind(this));
        
        // Proof verification routes
        router.get('/proofs/pending', this.getPendingProofs.bind(this));
        router.get('/proofs/:id', this.getProof.bind(this));
        router.post('/proofs/:id/approve', this.approveProof.bind(this));
        router.post('/proofs/:id/reject', this.rejectProof.bind(this));
        
        // Code management routes
        router.get('/codes/gst', this.getGSTCodes.bind(this));
        router.post('/codes/gst/create', this.createGSTCode.bind(this));
        router.post('/codes/gst/:id/update', this.updateGSTCode.bind(this));
        router.post('/codes/gst/:id/delete', this.deleteGSTCode.bind(this));
        
        router.get('/codes/f', this.getFCodes.bind(this));
        router.post('/codes/f/create', this.createFCode.bind(this));
        router.post('/codes/f/:id/update', this.updateFCode.bind(this));
        
        router.get('/codes/insite', this.getInsiteCodes.bind(this));
        router.post('/codes/insite/create', this.createInsiteCode.bind(this));
        router.post('/codes/insite/:id/update', this.updateInsiteCode.bind(this));
        
        // Diamond packages
        router.get('/diamond', this.getDiamondPackages.bind(this));
        router.post('/diamond/create', this.createDiamondPackage.bind(this));
        router.post('/diamond/:id/update', this.updateDiamondPackage.bind(this));
        router.post('/diamond/:id/delete', this.deleteDiamondPackage.bind(this));
        
        // Withdrawal management
        router.get('/withdrawals', this.getWithdrawals.bind(this));
        router.get('/withdrawals/pending', this.getPendingWithdrawals.bind(this));
        router.post('/withdrawals/:id/approve', this.approveWithdrawal.bind(this));
        router.post('/withdrawals/:id/reject', this.rejectWithdrawal.bind(this));
        router.post('/withdrawals/:id/mark-paid', this.markWithdrawalPaid.bind(this));
        
        // Settings routes
        router.get('/settings', this.getSettings.bind(this));
        router.post('/settings/update', this.updateSettings.bind(this));
        router.post('/settings/channels', this.updateChannels.bind(this));
        router.post('/settings/payment', this.updatePaymentSettings.bind(this));
        
        // System routes
        router.get('/system/stats', this.getSystemStats.bind(this));
        router.post('/system/backup', this.createBackup.bind(this));
        router.post('/system/cleanup', this.cleanupSystem.bind(this));
        
        // Admin management
        router.get('/admins', this.getAdmins.bind(this));
        router.post('/admins/add', this.addAdmin.bind(this));
        router.post('/admins/remove', this.removeAdmin.bind(this));
        
        // Broadcast
        router.post('/broadcast', this.sendBroadcast.bind(this));
        
        return router;
    }
    
    // Middleware - শুধুমাত্র এডমিন এক্সেস
    async adminMiddleware(req, res, next) {
        try {
            const userId = parseInt(req.headers['x-user-id']);
            const userToken = req.headers['x-auth-token'];
            
            // ডেভেলপমেন্টে সরাসরি এক্সেস দিন
            if (process.env.NODE_ENV === 'development') {
                console.log('Development mode - Admin access granted');
                req.adminId = this.adminId;
                return next();
            }
            
            // প্রোডাকশনে টোকেন ভেরিফাই করুন
            if (!userId || userId !== this.adminId) {
                return res.status(403).json({
                    success: false,
                    error: 'এডমিন এক্সেস প্রয়োজন'
                });
            }
            
            req.adminId = userId;
            next();
        } catch (error) {
            console.error('Admin middleware error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    
    // Dashboard ডেটা
    async getDashboard(req, res) {
        try {
            // Overall stats
            const walletStats = await this.wallet.getWalletStats();
            const users = await this.db.getAllUsers();
            const tasks = await this.db.getActiveTasks();
            const pendingProofs = await this.db.getPendingProofs();
            const pendingWithdrawals = await this.db.getPendingWithdrawalsCount();
            
            // Recent activities
            const recentTransactions = await this.db.getRecentTransactions(10);
            const recentUsers = users
                .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
                .slice(0, 10);
            
            // Top performers
            const topEarners = users
                .sort((a, b) => (parseInt(b.totalEarned) || 0) - (parseInt(a.totalEarned) || 0))
                .slice(0, 5)
                .map(user => ({
                    id: user.userId,
                    username: user.username,
                    earned: parseInt(user.totalEarned) || 0,
                    tasks: user.completedTasks || 0
                }));
            
            res.json({
                success: true,
                data: {
                    overview: {
                        totalUsers: users.length,
                        activeUsers: users.filter(u => u.status === 'active').length,
                        totalEarned: walletStats.totalEarned,
                        totalWithdrawn: walletStats.totalWithdrawn,
                        systemBalance: walletStats.totalBalance
                    },
                    today: {
                        newUsers: users.filter(u => {
                            const joinDate = new Date(u.joinedAt);
                            const today = new Date();
                            return joinDate.toDateString() === today.toDateString();
                        }).length,
                        tasksCompleted: 0, // Calculate from transactions
                        earnings: 0,
                        withdrawals: 0
                    },
                    pending: {
                        proofs: pendingProofs.length,
                        withdrawals: pendingWithdrawals
                    },
                    tasks: {
                        active: tasks.length,
                        completedToday: 0,
                        totalRewards: tasks.reduce((sum, task) => sum + (parseInt(task.reward) || 0), 0)
                    },
                    recentActivities: recentTransactions.map(tx => ({
                        id: tx.id,
                        userId: tx.userId,
                        type: tx.type,
                        amount: tx.amount,
                        description: tx.description,
                        time: helpers.relativeTime(tx.timestamp)
                    })),
                    recentUsers: recentUsers.map(user => ({
                        id: user.userId,
                        username: user.username,
                        joined: helpers.relativeTime(user.joinedAt),
                        balance: parseInt(user.mainWallet) + parseInt(user.cashWallet)
                    })),
                    topEarners: topEarners
                }
            });
        } catch (error) {
            console.error('Get dashboard error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to load dashboard'
            });
        }
    }
    
    // System stats
    async getStats(req, res) {
        try {
            const stats = await this.wallet.getWalletStats();
            const users = await this.db.getAllUsers();
            const tasks = await this.db.getAllTasks();
            const withdrawals = await this.db.getAllWithdrawals();
            
            const userGrowth = this.calculateUserGrowth(users);
            const revenueStats = this.calculateRevenueStats(withdrawals);
            const taskStats = this.calculateTaskStats(tasks);
            
            res.json({
                success: true,
                data: {
                    financial: stats,
                    users: {
                        total: users.length,
                        active: users.filter(u => u.status === 'active').length,
                        banned: users.filter(u => u.status === 'banned').length,
                        growth: userGrowth
                    },
                    tasks: taskStats,
                    revenue: revenueStats,
                    performance: {
                        avgEarningPerUser: stats.totalEarned / Math.max(users.length, 1),
                        avgWithdrawal: stats.totalWithdrawn / Math.max(
                            withdrawals.filter(w => w.status === 'approved').length, 1
                        ),
                        conversionRate: (users.filter(u => (parseInt(u.totalEarned) || 0) > 0).length / Math.max(users.length, 1)) * 100
                    }
                }
            });
        } catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get stats', error));
        }
    }
    
    // Real-time stats
    async getRealtimeStats(req, res) {
        try {
            // এই ফাংশনে রিয়েল-টাইম ডেটা (WebSocket বা পোলিং এর মাধ্যমে)
            const users = await this.db.getAllUsers();
            const activeTasks = await this.db.getActiveTasks();
            const pendingProofs = await this.db.getPendingProofs();
            const pendingWithdrawals = await this.db.getPendingWithdrawalsCount();
            
            res.json({
                success: true,
                data: {
                    timestamp: new Date().toISOString(),
                    onlineUsers: users.filter(u => {
                        // Last activity within 5 minutes
                        const lastActive = u.lastActive ? new Date(u.lastActive) : new Date(u.joinedAt);
                        return (Date.now() - lastActive.getTime()) < 300000;
                    }).length,
                    activeTasks: activeTasks.length,
                    pendingApprovals: pendingProofs.length + pendingWithdrawals,
                    systemUptime: process.uptime()
                }
            });
        } catch (error) {
            console.error('Get realtime stats error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get realtime stats', error));
        }
    }
    
    // User management
    async getUsers(req, res) {
        try {
            const { page = 1, limit = 20, search = '', status = '' } = req.query;
            const users = await this.db.getAllUsers();
            
            // Filter users
            let filteredUsers = users;
            
            if (search) {
                filteredUsers = filteredUsers.filter(user => 
                    user.username?.toLowerCase().includes(search.toLowerCase()) ||
                    user.userId?.toString().includes(search)
                );
            }
            
            if (status) {
                filteredUsers = filteredUsers.filter(user => user.status === status);
            }
            
            // Sort by recent
            filteredUsers.sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));
            
            // Paginate
            const paginated = helpers.paginate(filteredUsers, parseInt(page), parseInt(limit));
            
            res.json({
                success: true,
                data: {
                    users: paginated.data.map(user => ({
                        id: user.userId,
                        username: user.username,
                        name: user.first_name || user.username,
                        balance: {
                            main: parseInt(user.mainWallet) || 0,
                            cash: parseInt(user.cashWallet) || 0,
                            total: (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0)
                        },
                        earned: parseInt(user.totalEarned) || 0,
                        referrals: user.refCount || 0,
                        status: user.status || 'active',
                        joined: user.joinedAt,
                        lastActive: user.lastActive || user.joinedAt
                    })),
                    pagination: {
                        page: paginated.page,
                        limit: paginated.limit,
                        total: paginated.total,
                        totalPages: paginated.totalPages,
                        hasNext: paginated.hasNext,
                        hasPrev: paginated.hasPrev
                    }
                }
            });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get users', error));
        }
    }
    
    async getUser(req, res) {
        try {
            const userId = req.params.id;
            const user = await this.db.getUser(userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            
            // Get user transactions
            const transactions = await this.wallet.getTransactionHistory(userId, 20);
            const withdrawals = await this.wallet.getWithdrawalHistory(userId, 20);
            const referrals = await this.db.getReferrals(userId);
            
            res.json({
                success: true,
                data: {
                    user: {
                        id: user.userId,
                        username: user.username,
                        firstName: user.first_name,
                        lastName: user.last_name,
                        language: user.language_code,
                        refCode: user.refCode,
                        status: user.status || 'active',
                        joined: user.joinedAt,
                        lastActive: user.lastActive || user.joinedAt
                    },
                    balance: {
                        main: parseInt(user.mainWallet) || 0,
                        cash: parseInt(user.cashWallet) || 0,
                        total: (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0),
                        earned: parseInt(user.totalEarned) || 0,
                        refEarned: parseInt(user.refEarned) || 0
                    },
                    stats: {
                        tasksCompleted: transactions.filter(t => t.type === 'task').length,
                        referrals: referrals.length,
                        withdrawals: withdrawals.length,
                        totalWithdrawn: withdrawals
                            .filter(w => w.status === 'approved')
                            .reduce((sum, w) => sum + w.amount, 0)
                    },
                    transactions: transactions,
                    withdrawals: withdrawals,
                    referrals: referrals.map(ref => ({
                        id: ref.referredId,
                        joined: ref.timestamp,
                        bonusPaid: ref.bonusPaid === 'true'
                    }))
                }
            });
        } catch (error) {
            console.error('Get user error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get user', error));
        }
    }
    
    async updateUser(req, res) {
        try {
            const userId = req.params.id;
            const updates = req.body;
            
            // শুধুমাত্র নির্দিষ্ট ফিল্ড আপডেট করার অনুমতি
            const allowedUpdates = ['status', 'username', 'first_name', 'last_name'];
            const filteredUpdates = {};
            
            for (const key in updates) {
                if (allowedUpdates.includes(key)) {
                    filteredUpdates[key] = updates[key];
                }
            }
            
            await this.db.updateUser(userId, filteredUpdates);
            
            res.json({
                success: true,
                message: 'User updated successfully',
                updates: filteredUpdates
            });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json(helpers.errorResponse('Failed to update user', error));
        }
    }
    
    async updateUserBalance(req, res) {
        try {
            const userId = req.params.id;
            const { amount, type, description } = req.body;
            
            if (!amount || isNaN(amount)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid amount is required'
                });
            }
            
            const result = await this.wallet.createCustomTransaction(
                userId,
                parseFloat(amount),
                type || 'admin_adjustment',
                description || `Admin adjustment by ${req.adminId}`
            );
            
            if (result.success) {
                res.json({
                    success: true,
                    message: 'Balance updated successfully',
                    newBalance: result.newBalance
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
    }
    
    async banUser(req, res) {
        try {
            const userId = req.params.id;
            const { reason } = req.body;
            
            await this.db.updateUser(userId, {
                status: 'banned',
                banReason: reason || 'Banned by admin',
                bannedAt: new Date().toISOString(),
                bannedBy: req.adminId
            });
            
            res.json({
                success: true,
                message: 'User banned successfully'
            });
        } catch (error) {
            console.error('Ban user error:', error);
            res.status(500).json(helpers.errorResponse('Failed to ban user', error));
        }
    }
    
    async unbanUser(req, res) {
        try {
            const userId = req.params.id;
            
            await this.db.updateUser(userId, {
                status: 'active',
                banReason: '',
                bannedAt: '',
                bannedBy: ''
            });
            
            res.json({
                success: true,
                message: 'User unbanned successfully'
            });
        } catch (error) {
            console.error('Unban user error:', error);
            res.status(500).json(helpers.errorResponse('Failed to unban user', error));
        }
    }
    
    // Task management
    async getTasks(req, res) {
        try {
            const { page = 1, limit = 20, status = '' } = req.query;
            const tasks = await this.db.getAllTasks();
            
            let filteredTasks = tasks;
            
            if (status) {
                filteredTasks = filteredTasks.filter(task => task.status === status);
            }
            
            // Sort by creation date
            filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            const paginated = helpers.paginate(filteredTasks, parseInt(page), parseInt(limit));
            
            res.json({
                success: true,
                data: {
                    tasks: paginated.data.map(task => ({
                        id: task.id,
                        title: task.title,
                        description: task.description,
                        link: task.link,
                        reward: parseInt(task.reward) || 0,
                        status: task.status,
                        createdAt: task.createdAt,
                        expiresAt: task.expiresAt,
                        completedBy: task.completedBy || 0,
                        adminId: task.adminId
                    })),
                    pagination: {
                        page: paginated.page,
                        limit: paginated.limit,
                        total: paginated.total,
                        totalPages: paginated.totalPages,
                        hasNext: paginated.hasNext,
                        hasPrev: paginated.hasPrev
                    }
                }
            });
        } catch (error) {
            console.error('Get tasks error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get tasks', error));
        }
    }
    
    async getTask(req, res) {
        try {
            const taskId = req.params.id;
            const task = await this.db.getTask(taskId);
            
            if (!task) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found'
                });
            }
            
            // Get proofs for this task
            const proofs = await this.db.getProofsByTask(taskId);
            
            res.json({
                success: true,
                data: {
                    task: {
                        id: task.id,
                        title: task.title,
                        description: task.description,
                        link: task.link,
                        reward: parseInt(task.reward) || 0,
                        status: task.status,
                        createdAt: task.createdAt,
                        expiresAt: task.expiresAt,
                        adminId: task.adminId
                    },
                    stats: {
                        totalAttempts: proofs.length,
                        approved: proofs.filter(p => p.status === 'approved').length,
                        rejected: proofs.filter(p => p.status === 'rejected').length,
                        pending: proofs.filter(p => p.status === 'pending').length
                    },
                    proofs: proofs.map(proof => ({
                        id: proof.id,
                        userId: proof.userId,
                        status: proof.status,
                        submittedAt: proof.submittedAt,
                        verifiedAt: proof.verifiedAt,
                        adminNote: proof.adminNote
                    }))
                }
            });
        } catch (error) {
            console.error('Get task error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get task', error));
        }
    }
    
    async createTask(req, res) {
        try {
            const { title, description, link, reward, expiresAt } = req.body;
            
            if (!title || !link || !reward) {
                return res.status(400).json({
                    success: false,
                    error: 'Title, link and reward are required'
                });
            }
            
            const taskData = {
                title: title,
                description: description || 'Complete the task and submit proof',
                link: link,
                reward: parseInt(reward) || 3,
                status: 'active',
                adminId: req.adminId,
                expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            };
            
            const task = await this.db.addTask(taskData);
            
            res.json({
                success: true,
                message: 'Task created successfully',
                task: task
            });
        } catch (error) {
            console.error('Create task error:', error);
            res.status(500).json(helpers.errorResponse('Failed to create task', error));
        }
    }
    
    async updateTask(req, res) {
        try {
            const taskId = req.params.id;
            const updates = req.body;
            
            // শুধুমাত্র নির্দিষ্ট ফিল্ড আপডেট করার অনুমতি
            const allowedUpdates = ['title', 'description', 'link', 'reward', 'status', 'expiresAt'];
            const filteredUpdates = {};
            
            for (const key in updates) {
                if (allowedUpdates.includes(key)) {
                    filteredUpdates[key] = updates[key];
                }
            }
            
            await this.db.updateTask(taskId, filteredUpdates);
            
            res.json({
                success: true,
                message: 'Task updated successfully',
                updates: filteredUpdates
            });
        } catch (error) {
            console.error('Update task error:', error);
            res.status(500).json(helpers.errorResponse('Failed to update task', error));
        }
    }
    
    async deleteTask(req, res) {
        try {
            const taskId = req.params.id;
            
            // চেক করুন যদি কোনো pending proof থাকে
            const proofs = await this.db.getProofsByTask(taskId);
            const pendingProofs = proofs.filter(p => p.status === 'pending');
            
            if (pendingProofs.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Cannot delete task with ${pendingProofs.length} pending proofs`
                });
            }
            
            await this.db.deleteTask(taskId);
            
            res.json({
                success: true,
                message: 'Task deleted successfully'
            });
        } catch (error) {
            console.error('Delete task error:', error);
            res.status(500).json(helpers.errorResponse('Failed to delete task', error));
        }
    }
    
    async activateTask(req, res) {
        try {
            const taskId = req.params.id;
            
            await this.db.updateTask(taskId, {
                status: 'active',
                activatedAt: new Date().toISOString()
            });
            
            res.json({
                success: true,
                message: 'Task activated successfully'
            });
        } catch (error) {
            console.error('Activate task error:', error);
            res.status(500).json(helpers.errorResponse('Failed to activate task', error));
        }
    }
    
    async deactivateTask(req, res) {
        try {
            const taskId = req.params.id;
            
            await this.db.updateTask(taskId, {
                status: 'inactive',
                deactivatedAt: new Date().toISOString()
            });
            
            res.json({
                success: true,
                message: 'Task deactivated successfully'
            });
        } catch (error) {
            console.error('Deactivate task error:', error);
            res.status(500).json(helpers.errorResponse('Failed to deactivate task', error));
        }
    }
    
    // Proof verification
    async getPendingProofs(req, res) {
        try {
            const proofs = await this.db.getPendingProofs();
            
            // Get task and user details for each proof
            const proofDetails = await Promise.all(
                proofs.map(async (proof) => {
                    const task = await this.db.getTask(proof.taskId);
                    const user = await this.db.getUser(proof.userId);
                    
                    return {
                        id: proof.id,
                        task: {
                            id: task?.id,
                            title: task?.title,
                            reward: task?.reward
                        },
                        user: {
                            id: user?.userId,
                            username: user?.username
                        },
                        screenshot: proof.screenshot,
                        submittedAt: proof.submittedAt,
                        status: proof.status
                    };
                })
            );
            
            res.json({
                success: true,
                data: {
                    proofs: proofDetails,
                    count: proofDetails.length
                }
            });
        } catch (error) {
            console.error('Get pending proofs error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get pending proofs', error));
        }
    }
    
    async getProof(req, res) {
        try {
            const proofId = req.params.id;
            const proof = await this.db.getProof(proofId);
            
            if (!proof) {
                return res.status(404).json({
                    success: false,
                    error: 'Proof not found'
                });
            }
            
            const task = await this.db.getTask(proof.taskId);
            const user = await this.db.getUser(proof.userId);
            const admin = proof.verifiedBy ? await this.db.getUser(proof.verifiedBy) : null;
            
            res.json({
                success: true,
                data: {
                    proof: {
                        id: proof.id,
                        screenshot: proof.screenshot,
                        status: proof.status,
                        submittedAt: proof.submittedAt,
                        verifiedAt: proof.verifiedAt,
                        adminNote: proof.adminNote,
                        reward: proof.reward
                    },
                    task: {
                        id: task?.id,
                        title: task?.title,
                        description: task?.description,
                        link: task?.link,
                        reward: task?.reward
                    },
                    user: {
                        id: user?.userId,
                        username: user?.username,
                        balance: user ? (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0) : 0
                    },
                    admin: admin ? {
                        id: admin.userId,
                        username: admin.username
                    } : null
                }
            });
        } catch (error) {
            console.error('Get proof error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get proof', error));
        }
    }
    
    async approveProof(req, res) {
        try {
            const proofId = req.params.id;
            const { reward } = req.body;
            
            const proof = await this.db.getProof(proofId);
            if (!proof) {
                return res.status(404).json({
                    success: false,
                    error: 'Proof not found'
                });
            }
            
            if (proof.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    error: 'Proof already processed'
                });
            }
            
            const task = await this.db.getTask(proof.taskId);
            const rewardAmount = reward || parseInt(task?.reward) || 3;
            
            // Give reward to user
            const result = await this.wallet.addTaskReward(
                proof.userId,
                proof.taskId,
                rewardAmount
            );
            
            if (result.success) {
                // Update proof status
                await this.db.updateProof(proofId, {
                    status: 'approved',
                    verifiedAt: new Date().toISOString(),
                    verifiedBy: req.adminId,
                    reward: rewardAmount,
                    adminNote: `Approved by admin ${req.adminId}`
                });
                
                res.json({
                    success: true,
                    message: 'Proof approved successfully',
                    reward: rewardAmount,
                    userBalance: result.newBalance
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Approve proof error:', error);
            res.status(500).json(helpers.errorResponse('Failed to approve proof', error));
        }
    }
    
    async rejectProof(req, res) {
        try {
            const proofId = req.params.id;
            const { reason } = req.body;
            
            const proof = await this.db.getProof(proofId);
            if (!proof) {
                return res.status(404).json({
                    success: false,
                    error: 'Proof not found'
                });
            }
            
            if (proof.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    error: 'Proof already processed'
                });
            }
            
            // Update proof status
            await this.db.updateProof(proofId, {
                status: 'rejected',
                verifiedAt: new Date().toISOString(),
                verifiedBy: req.adminId,
                adminNote: reason || `Rejected by admin ${req.adminId}`
            });
            
            res.json({
                success: true,
                message: 'Proof rejected successfully'
            });
        } catch (error) {
            console.error('Reject proof error:', error);
            res.status(500).json(helpers.errorResponse('Failed to reject proof', error));
        }
    }
    
    // GST Code management
    async getGSTCodes(req, res) {
        try {
            const codes = await this.db.getGSTCodes();
            
            res.json({
                success: true,
                data: {
                    codes: codes.map(code => ({
                        id: code.id,
                        code: code.code,
                        name: code.name,
                        description: code.description,
                        price: parseInt(code.price) || 0,
                        status: code.status,
                        addedAt: code.addedAt
                    }))
                }
            });
        } catch (error) {
            console.error('Get GST codes error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get GST codes', error));
        }
    }
    
    async createGSTCode(req, res) {
        try {
            const { code, name, description, price } = req.body;
            
            if (!code || !name || !price) {
                return res.status(400).json({
                    success: false,
                    error: 'Code, name and price are required'
                });
            }
            
            const codeData = {
                code: code,
                name: name,
                description: description || 'GST Code',
                price: parseInt(price) || 0,
                status: 'available'
            };
            
            const newCode = await this.db.addGSTCode(codeData);
            
            res.json({
                success: true,
                message: 'GST Code created successfully',
                code: newCode
            });
        } catch (error) {
            console.error('Create GST code error:', error);
            res.status(500).json(helpers.errorResponse('Failed to create GST code', error));
        }
    }
    
    async updateGSTCode(req, res) {
        try {
            const codeId = req.params.id;
            const updates = req.body;
            
            // শুধুমাত্র নির্দিষ্ট ফিল্ড আপডেট করার অনুমতি
            const allowedUpdates = ['code', 'name', 'description', 'price', 'status'];
            const filteredUpdates = {};
            
            for (const key in updates) {
                if (allowedUpdates.includes(key)) {
                    filteredUpdates[key] = updates[key];
                }
            }
            
            await this.db.updateGSTCode(codeId, filteredUpdates);
            
            res.json({
                success: true,
                message: 'GST Code updated successfully',
                updates: filteredUpdates
            });
        } catch (error) {
            console.error('Update GST code error:', error);
            res.status(500).json(helpers.errorResponse('Failed to update GST code', error));
        }
    }
    
    async deleteGSTCode(req, res) {
        try {
            const codeId = req.params.id;
            
            await this.db.deleteGSTCode(codeId);
            
            res.json({
                success: true,
                message: 'GST Code deleted successfully'
            });
        } catch (error) {
            console.error('Delete GST code error:', error);
            res.status(500).json(helpers.errorResponse('Failed to delete GST code', error));
        }
    }
    
    // F Code management (similar to GST)
    async getFCodes(req, res) {
        try {
            const codes = await this.db.getFCodes();
            
            res.json({
                success: true,
                data: {
                    codes: codes.map(code => ({
                        id: code.id,
                        uid: code.uid,
                        address: code.address,
                        codep: code.codep,
                        '2code': code['2code'],
                        price: parseInt(code.price) || 0,
                        status: code.status,
                        addedAt: code.addedAt
                    }))
                }
            });
        } catch (error) {
            console.error('Get F codes error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get F codes', error));
        }
    }
    
    async createFCode(req, res) {
        try {
            const { uid, address, codep, twoCode, price } = req.body;
            
            if (!uid || !address || !codep || !twoCode || !price) {
                return res.status(400).json({
                    success: false,
                    error: 'All fields are required for F Code'
                });
            }
            
            const codeData = {
                uid: uid,
                address: address,
                codep: codep,
                '2code': twoCode,
                price: parseInt(price) || 0,
                status: 'available'
            };
            
            const newCode = await this.db.addFCode(codeData);
            
            res.json({
                success: true,
                message: 'F Code created successfully',
                code: newCode
            });
        } catch (error) {
            console.error('Create F code error:', error);
            res.status(500).json(helpers.errorResponse('Failed to create F code', error));
        }
    }
    
    async updateFCode(req, res) {
        try {
            const codeId = req.params.id;
            const updates = req.body;
            
            const allowedUpdates = ['uid', 'address', 'codep', '2code', 'price', 'status'];
            const filteredUpdates = {};
            
            for (const key in updates) {
                if (allowedUpdates.includes(key)) {
                    filteredUpdates[key] = updates[key];
                }
            }
            
            await this.db.updateFCode(codeId, filteredUpdates);
            
            res.json({
                success: true,
                message: 'F Code updated successfully',
                updates: filteredUpdates
            });
        } catch (error) {
            console.error('Update F code error:', error);
            res.status(500).json(helpers.errorResponse('Failed to update F code', error));
        }
    }
    
    // Insite Code management (similar to GST and F)
    async getInsiteCodes(req, res) {
        try {
            const codes = await this.db.getInsiteCodes();
            
            res.json({
                success: true,
                data: {
                    codes: codes.map(code => ({
                        id: code.id,
                        uid: code.uid,
                        email: code.email,
                        password: code.password,
                        price: parseInt(code.price) || 0,
                        status: code.status,
                        addedAt: code.addedAt
                    }))
                }
            });
        } catch (error) {
            console.error('Get Insite codes error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get Insite codes', error));
        }
    }
    
    async createInsiteCode(req, res) {
        try {
            const { uid, email, password, price } = req.body;
            
            if (!uid || !email || !password || !price) {
                return res.status(400).json({
                    success: false,
                    error: 'All fields are required for Insite Code'
                });
            }
            
            const codeData = {
                uid: uid,
                email: email,
                password: password,
                price: parseInt(price) || 0,
                status: 'available'
            };
            
            const newCode = await this.db.addInsiteCode(codeData);
            
            res.json({
                success: true,
                message: 'Insite Code created successfully',
                code: newCode
            });
        } catch (error) {
            console.error('Create Insite code error:', error);
            res.status(500).json(helpers.errorResponse('Failed to create Insite code', error));
        }
    }
    
    async updateInsiteCode(req, res) {
        try {
            const codeId = req.params.id;
            const updates = req.body;
            
            const allowedUpdates = ['uid', 'email', 'password', 'price', 'status'];
            const filteredUpdates = {};
            
            for (const key in updates) {
                if (allowedUpdates.includes(key)) {
                    filteredUpdates[key] = updates[key];
                }
            }
            
            await this.db.updateInsiteCode(codeId, filteredUpdates);
            
            res.json({
                success: true,
                message: 'Insite Code updated successfully',
                updates: filteredUpdates
            });
        } catch (error) {
            console.error('Update Insite code error:', error);
            res.status(500).json(helpers.errorResponse('Failed to update Insite code', error));
        }
    }
    
    // Diamond packages
    async getDiamondPackages(req, res) {
        try {
            const packages = await this.db.getDiamondPackages();
            
            res.json({
                success: true,
                data: {
                    packages: packages.map(pkg => ({
                        id: pkg.id,
                        diamonds: parseInt(pkg.diamonds) || 0,
                        price: parseInt(pkg.price) || 0,
                        description: pkg.description,
                        status: pkg.status,
                        addedAt: pkg.addedAt
                    }))
                }
            });
        } catch (error) {
            console.error('Get diamond packages error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get diamond packages', error));
        }
    }
    
    async createDiamondPackage(req, res) {
        try {
            const { diamonds, price, description } = req.body;
            
            if (!diamonds || !price) {
                return res.status(400).json({
                    success: false,
                    error: 'Diamonds and price are required'
                });
            }
            
            const packageData = {
                diamonds: parseInt(diamonds),
                price: parseInt(price),
                description: description || `${diamonds} Diamond Package`,
                status: 'available'
            };
            
            const newPackage = await this.db.addDiamondPackage(packageData);
            
            res.json({
                success: true,
                message: 'Diamond package created successfully',
                package: newPackage
            });
        } catch (error) {
            console.error('Create diamond package error:', error);
            res.status(500).json(helpers.errorResponse('Failed to create diamond package', error));
        }
    }
    
    async updateDiamondPackage(req, res) {
        try {
            const packageId = req.params.id;
            const updates = req.body;
            
            const allowedUpdates = ['diamonds', 'price', 'description', 'status'];
            const filteredUpdates = {};
            
            for (const key in updates) {
                if (allowedUpdates.includes(key)) {
                    filteredUpdates[key] = updates[key];
                }
            }
            
            await this.db.updateDiamondPackage(packageId, filteredUpdates);
            
            res.json({
                success: true,
                message: 'Diamond package updated successfully',
                updates: filteredUpdates
            });
        } catch (error) {
            console.error('Update diamond package error:', error);
            res.status(500).json(helpers.errorResponse('Failed to update diamond package', error));
        }
    }
    
    async deleteDiamondPackage(req, res) {
        try {
            const packageId = req.params.id;
            
            await this.db.deleteDiamondPackage(packageId);
            
            res.json({
                success: true,
                message: 'Diamond package deleted successfully'
            });
        } catch (error) {
            console.error('Delete diamond package error:', error);
            res.status(500).json(helpers.errorResponse('Failed to delete diamond package', error));
        }
    }
    
    // Withdrawal management
    async getWithdrawals(req, res) {
        try {
            const { page = 1, limit = 20, status = '' } = req.query;
            const withdrawals = await this.db.getAllWithdrawals();
            
            let filteredWithdrawals = withdrawals;
            
            if (status) {
                filteredWithdrawals = filteredWithdrawals.filter(w => w.status === status);
            }
            
            // Sort by request date
            filteredWithdrawals.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
            
            const paginated = helpers.paginate(filteredWithdrawals, parseInt(page), parseInt(limit));
            
            // Get user details for each withdrawal
            const withdrawalDetails = await Promise.all(
                paginated.data.map(async (withdrawal) => {
                    const user = await this.db.getUser(withdrawal.userId);
                    
                    return {
                        id: withdrawal.id,
                        user: {
                            id: user?.userId,
                            username: user?.username
                        },
                        amount: parseInt(withdrawal.amount) || 0,
                        charges: parseInt(withdrawal.charges) || 0,
                        netAmount: parseInt(withdrawal.netAmount) || 0,
                        method: withdrawal.method,
                        status: withdrawal.status,
                        requestedAt: withdrawal.requestedAt,
                        processedAt: withdrawal.processedAt,
                        adminNote: withdrawal.adminNote
                    };
                })
            );
            
            res.json({
                success: true,
                data: {
                    withdrawals: withdrawalDetails,
                    pagination: {
                        page: paginated.page,
                        limit: paginated.limit,
                        total: paginated.total,
                        totalPages: paginated.totalPages,
                        hasNext: paginated.hasNext,
                        hasPrev: paginated.hasPrev
                    },
                    summary: {
                        total: filteredWithdrawals.length,
                        pending: filteredWithdrawals.filter(w => w.status === 'pending').length,
                        approved: filteredWithdrawals.filter(w => w.status === 'approved').length,
                        rejected: filteredWithdrawals.filter(w => w.status === 'rejected').length,
                        totalAmount: filteredWithdrawals.reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0)
                    }
                }
            });
        } catch (error) {
            console.error('Get withdrawals error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get withdrawals', error));
        }
    }
    
    async getPendingWithdrawals(req, res) {
        try {
            const withdrawals = await this.db.getPendingWithdrawals();
            
            const withdrawalDetails = await Promise.all(
                withdrawals.map(async (withdrawal) => {
                    const user = await this.db.getUser(withdrawal.userId);
                    
                    return {
                        id: withdrawal.id,
                        user: {
                            id: user?.userId,
                            username: user?.username,
                            balance: user ? (parseInt(user.cashWallet) || 0) : 0
                        },
                        amount: parseInt(withdrawal.amount) || 0,
                        charges: parseInt(withdrawal.charges) || 0,
                        netAmount: parseInt(withdrawal.netAmount) || 0,
                        method: withdrawal.method,
                        requestedAt: withdrawal.requestedAt
                    };
                })
            );
            
            res.json({
                success: true,
                data: {
                    withdrawals: withdrawalDetails,
                    count: withdrawalDetails.length,
                    totalAmount: withdrawalDetails.reduce((sum, w) => sum + w.amount, 0)
                }
            });
        } catch (error) {
            console.error('Get pending withdrawals error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get pending withdrawals', error));
        }
    }
    
    async approveWithdrawal(req, res) {
        try {
            const withdrawalId = req.params.id;
            
            const result = await this.wallet.processWithdrawal(
                withdrawalId,
                req.adminId,
                'approve'
            );
            
            if (result.success) {
                res.json({
                    success: true,
                    message: result.message,
                    data: {
                        userId: result.userId,
                        amount: result.amount,
                        netAmount: result.netAmount
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Approve withdrawal error:', error);
            res.status(500).json(helpers.errorResponse('Failed to approve withdrawal', error));
        }
    }
    
    async rejectWithdrawal(req, res) {
        try {
            const withdrawalId = req.params.id;
            const { reason } = req.body;
            
            const result = await this.wallet.processWithdrawal(
                withdrawalId,
                req.adminId,
                'reject',
                reason
            );
            
            if (result.success) {
                res.json({
                    success: true,
                    message: result.message
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Reject withdrawal error:', error);
            res.status(500).json(helpers.errorResponse('Failed to reject withdrawal', error));
        }
    }
    
    async markWithdrawalPaid(req, res) {
        try {
            const withdrawalId = req.params.id;
            const { transactionId, note } = req.body;
            
            const withdrawal = await this.db.getWithdrawal(withdrawalId);
            if (!withdrawal) {
                return res.status(404).json({
                    success: false,
                    error: 'Withdrawal not found'
                });
            }
            
            await this.db.updateWithdrawal(withdrawalId, {
                status: 'paid',
                processedAt: new Date().toISOString(),
                processedBy: req.adminId,
                transactionId: transactionId || '',
                adminNote: note || `Marked as paid by admin ${req.adminId}`
            });
            
            res.json({
                success: true,
                message: 'Withdrawal marked as paid'
            });
        } catch (error) {
            console.error('Mark withdrawal paid error:', error);
            res.status(500).json(helpers.errorResponse('Failed to mark withdrawal as paid', error));
        }
    }
    
    // Settings management
    async getSettings(req, res) {
        try {
            const settings = await this.db.getSettings();
            
            const formattedSettings = {
                bot: {
                    name: settings.bot_name || 'Digital Vision Trusted',
                    username: settings.bot_username || '@digitalvision_bot',
                    welcomeMessage: settings.welcome_message || 'Welcome to Digital Vision Trusted!',
                    maintenance: settings.maintenance_mode === 'true'
                },
                channels: {
                    channel1: settings.channel_1 || '@income460tu',
                    channel2: settings.channel_2 || '@dvt1236',
                    support: settings.support_channel || '@digitalvision_support',
                    admin: settings.admin_username || '@Miju132'
                },
                wallet: {
                    minimumWithdraw: parseInt(settings.minimum_withdraw) || 100,
                    referralBonus: parseInt(settings.referral_bonus) || 5,
                    firstWithdrawCharge: parseInt(settings.first_withdraw_charge) || 10,
                    withdrawChargePercent: parseInt(settings.withdraw_charge_percent) || 10
                },
                tasks: {
                    minReward: parseInt(settings.min_task_reward) || 3,
                    maxReward: parseInt(settings.max_task_reward) || 10,
                    maxTasksPerDay: parseInt(settings.max_tasks_per_day) || 5
                },
                shop: {
                    link: settings.shop_link || 'https://example-shop.com'
                },
                payment: {
                    bkash: settings.bkash_number || '',
                    nagad: settings.nagad_number || '',
                    rocket: settings.rocket_number || ''
                },
                diamond: {
                    contact: settings.diamond_contact || '@Miju132'
                }
            };
            
            res.json({
                success: true,
                data: formattedSettings
            });
        } catch (error) {
            console.error('Get settings error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get settings', error));
        }
    }
    
    async updateSettings(req, res) {
        try {
            const updates = req.body;
            
            for (const [key, value] of Object.entries(updates)) {
                await this.db.updateSetting(key, value);
            }
            
            res.json({
                success: true,
                message: 'Settings updated successfully'
            });
        } catch (error) {
            console.error('Update settings error:', error);
            res.status(500).json(helpers.errorResponse('Failed to update settings', error));
        }
    }
    
    async updateChannels(req, res) {
        try {
            const { channel1, channel2, support, admin } = req.body;
            
            if (channel1) await this.db.updateSetting('channel_1', channel1);
            if (channel2) await this.db.updateSetting('channel_2', channel2);
            if (support) await this.db.updateSetting('support_channel', support);
            if (admin) await this.db.updateSetting('admin_username', admin);
            
            res.json({
                success: true,
                message: 'Channel settings updated successfully'
            });
        } catch (error) {
            console.error('Update channels error:', error);
            res.status(500).json(helpers.errorResponse('Failed to update channels', error));
        }
    }
    
    async updatePaymentSettings(req, res) {
        try {
            const { bkash, nagad, rocket } = req.body;
            
            if (bkash) await this.db.updateSetting('bkash_number', bkash);
            if (nagad) await this.db.updateSetting('nagad_number', nagad);
            if (rocket) await this.db.updateSetting('rocket_number', rocket);
            
            res.json({
                success: true,
                message: 'Payment settings updated successfully'
            });
        } catch (error) {
            console.error('Update payment settings error:', error);
            res.status(500).json(helpers.errorResponse('Failed to update payment settings', error));
        }
    }
    
    // System management
    async getSystemStats(req, res) {
        try {
            const stats = await this.wallet.getWalletStats();
            const users = await this.db.getAllUsers();
            const tasks = await this.db.getAllTasks();
            
            res.json({
                success: true,
                data: {
                    database: {
                        users: users.length,
                        tasks: tasks.length,
                        transactions: 0, // Calculate from transaction table
                        proofs: 0 // Calculate from proofs table
                    },
                    server: {
                        uptime: process.uptime(),
                        memory: process.memoryUsage(),
                        platform: process.platform,
                        nodeVersion: process.version
                    },
                    performance: {
                        avgResponseTime: 0,
                        requestsPerMinute: 0,
                        errorRate: 0
                    }
                }
            });
        } catch (error) {
            console.error('Get system stats error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get system stats', error));
        }
    }
    
    async createBackup(req, res) {
        try {
            const backupData = {
                timestamp: new Date().toISOString(),
                adminId: req.adminId,
                type: 'manual',
                data: {
                    users: await this.db.getAllUsers(),
                    tasks: await this.db.getAllTasks(),
                    settings: await this.db.getSettings()
                }
            };
            
            // Create backup file
            const backupDir = path.join(__dirname, '../../backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const backupFile = path.join(backupDir, `backup-${Date.now()}.json`);
            fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
            
            res.json({
                success: true,
                message: 'Backup created successfully',
                file: backupFile
            });
        } catch (error) {
            console.error('Create backup error:', error);
            res.status(500).json(helpers.errorResponse('Failed to create backup', error));
        }
    }
    
    async cleanupSystem(req, res) {
        try {
            const { days = 30 } = req.body;
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            // এখানে পুরানো ডেটা ডিলিট করার লজিক যোগ করুন
            // যেমন: ৩০ দিনের পুরানো লগ, inactive users ইত্যাদি
            
            res.json({
                success: true,
                message: `System cleanup completed (older than ${days} days)`
            });
        } catch (error) {
            console.error('Cleanup system error:', error);
            res.status(500).json(helpers.errorResponse('Failed to cleanup system', error));
        }
    }
    
    // Admin management
    async getAdmins(req, res) {
        try {
            res.json({
                success: true,
                data: this.admins
            });
        } catch (error) {
            console.error('Get admins error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get admins', error));
        }
    }
    
    async addAdmin(req, res) {
        try {
            const { userId, username, name, role } = req.body;
            
            if (!userId || !username) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID and username are required'
                });
            }
            
            const newAdmin = {
                id: parseInt(userId),
                username: username,
                name: name || username,
                role: role || 'admin',
                permissions: ['view', 'edit']
            };
            
            // চেক করুন ইতিমধ্যে এডমিন কিনা
            const existingAdmin = this.admins.find(a => a.id === newAdmin.id);
            if (existingAdmin) {
                return res.status(400).json({
                    success: false,
                    error: 'User is already an admin'
                });
            }
            
            this.admins.push(newAdmin);
            
            res.json({
                success: true,
                message: 'Admin added successfully',
                admin: newAdmin
            });
        } catch (error) {
            console.error('Add admin error:', error);
            res.status(500).json(helpers.errorResponse('Failed to add admin', error));
        }
    }
    
    async removeAdmin(req, res) {
        try {
            const { userId } = req.body;
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }
            
            // সুপার এডমিন সরানো যাবে না
            const adminToRemove = this.admins.find(a => a.id === parseInt(userId));
            if (adminToRemove && adminToRemove.role === 'super_admin') {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot remove super admin'
                });
            }
            
            const index = this.admins.findIndex(a => a.id === parseInt(userId));
            if (index > -1) {
                this.admins.splice(index, 1);
                res.json({
                    success: true,
                    message: 'Admin removed successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: 'Admin not found'
                });
            }
        } catch (error) {
            console.error('Remove admin error:', error);
            res.status(500).json(helpers.errorResponse('Failed to remove admin', error));
        }
    }
    
    // Broadcast message
    async sendBroadcast(req, res) {
        try {
            const { message, type = 'all', filters = {} } = req.body;
            
            if (!message) {
                return res.status(400).json({
                    success: false,
                    error: 'Message is required'
                });
            }
            
            // এখানে ব্রডকাস্ট লজিক যোগ করুন
            // টেলিগ্রাম API ব্যবহার করে সব ইউজারকে মেসেজ পাঠান
            
            res.json({
                success: true,
                message: 'Broadcast initiated',
                details: {
                    type: type,
                    messageLength: message.length,
                    filters: filters
                }
            });
        } catch (error) {
            console.error('Send broadcast error:', error);
            res.status(500).json(helpers.errorResponse('Failed to send broadcast', error));
        }
    }
    
    // Helper methods
    calculateUserGrowth(users) {
        const now = new Date();
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const weeklyGrowth = users.filter(u => new Date(u.joinedAt) > lastWeek).length;
        const monthlyGrowth = users.filter(u => new Date(u.joinedAt) > lastMonth).length;
        
        return {
            daily: users.filter(u => {
                const joinDate = new Date(u.joinedAt);
                return joinDate.toDateString() === now.toDateString();
            }).length,
            weekly: weeklyGrowth,
            monthly: monthlyGrowth,
            total: users.length
        };
    }
    
    calculateRevenueStats(withdrawals) {
        const approvedWithdrawals = withdrawals.filter(w => w.status === 'approved');
        const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
        
        const totalApproved = approvedWithdrawals.reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0);
        const totalPending = pendingWithdrawals.reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0);
        
        return {
            totalApproved: totalApproved,
            totalPending: totalPending,
            totalWithdrawals: withdrawals.length,
            avgWithdrawal: totalApproved / Math.max(approvedWithdrawals.length, 1)
        };
    }
    
    calculateTaskStats(tasks) {
        const activeTasks = tasks.filter(t => t.status === 'active');
        const completedTasks = tasks.filter(t => t.status === 'completed');
        
        return {
            total: tasks.length,
            active: activeTasks.length,
            completed: completedTasks.length,
            totalRewards: tasks.reduce((sum, t) => sum + (parseInt(t.reward) || 0), 0)
        };
    }
}

module.exports = AdminPanel;
