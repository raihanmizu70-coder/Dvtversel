const helpers = require('../../telegram-bot/utils/helpers');
const WalletSystem = require('../../telegram-bot/utils/wallet');

class UserController {
    constructor(db) {
        this.db = db;
        this.wallet = new WalletSystem(db);
    }

    // Get all users
    async getAllUsers(req, res) {
        try {
            const { 
                page = 1, 
                limit = 20, 
                search = '', 
                status = '',
                sortBy = 'joinedAt',
                sortOrder = 'desc',
                minBalance = '',
                maxBalance = ''
            } = req.query;

            let users = await this.db.getAllUsers();

            // Apply filters
            if (search) {
                const searchLower = search.toLowerCase();
                users = users.filter(user => 
                    user.username?.toLowerCase().includes(searchLower) ||
                    user.userId?.toString().includes(search) ||
                    user.refCode?.toLowerCase().includes(searchLower) ||
                    user.first_name?.toLowerCase().includes(searchLower)
                );
            }

            if (status) {
                users = users.filter(user => user.status === status);
            }

            // Balance filters
            if (minBalance) {
                const min = parseInt(minBalance);
                users = users.filter(user => 
                    (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0) >= min
                );
            }

            if (maxBalance) {
                const max = parseInt(maxBalance);
                users = users.filter(user => 
                    (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0) <= max
                );
            }

            // Apply sorting
            users.sort((a, b) => {
                let aValue = a[sortBy] || '';
                let bValue = b[sortBy] || '';

                // Handle numeric sorting
                if (sortBy.includes('Wallet') || sortBy === 'totalEarned' || sortBy === 'refEarned') {
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
            const paginated = helpers.paginate(users, parseInt(page), parseInt(limit));

            // Get additional statistics for each user
            const detailedUsers = await Promise.all(
                paginated.data.map(async (user) => {
                    const referrals = await this.db.getReferrals(user.userId);
                    const proofs = await this.db.getProofsByUser(user.userId);
                    const withdrawals = await this.wallet.getWithdrawalHistory(user.userId, 5);

                    return {
                        id: user.userId,
                        username: user.username || 'N/A',
                        firstName: user.first_name || '',
                        lastName: user.last_name || '',
                        refCode: user.refCode || 'N/A',
                        status: user.status || 'active',
                        isPremium: user.isPremium === 'true',
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
                            tasksCompleted: proofs.filter(p => p.status === 'approved').length,
                            referrals: referrals.length,
                            pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length
                        },
                        flags: {
                            hasWithdrawn: withdrawals.some(w => w.status === 'approved' || w.status === 'paid'),
                            isBanned: user.status === 'banned',
                            isNew: (Date.now() - new Date(user.joinedAt).getTime()) < 7 * 24 * 60 * 60 * 1000 // Less than 7 days
                        }
                    };
                })
            );

            // Calculate summary statistics
            const summary = {
                total: users.length,
                active: users.filter(u => u.status === 'active').length,
                banned: users.filter(u => u.status === 'banned').length,
                premium: users.filter(u => u.isPremium === 'true').length,
                newToday: users.filter(u => {
                    const joinDate = new Date(u.joinedAt);
                    const today = new Date();
                    return joinDate.toDateString() === today.toDateString();
                }).length,
                totalBalance: users.reduce((sum, u) => sum + (parseInt(u.mainWallet) || 0) + (parseInt(u.cashWallet) || 0), 0),
                totalEarnings: users.reduce((sum, u) => sum + (parseInt(u.totalEarned) || 0), 0),
                activeRate: users.length > 0 ? 
                    (users.filter(u => (parseInt(u.totalEarned) || 0) > 0).length / users.length * 100).toFixed(2) : 0
            };

            res.json(helpers.successResponse({
                users: detailedUsers,
                pagination: {
                    page: paginated.page,
                    limit: paginated.limit,
                    total: paginated.total,
                    totalPages: paginated.totalPages,
                    hasNext: paginated.hasNext,
                    hasPrev: paginated.hasPrev
                },
                summary: summary,
                filters: {
                    search,
                    status,
                    minBalance,
                    maxBalance
                }
            }));
        } catch (error) {
            console.error('Get all users error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get users', error));
        }
    }

    // Get user by ID
    async getUserById(req, res) {
        try {
            const userId = req.params.id;
            const user = await this.db.getUser(userId);

            if (!user) {
                return res.status(404).json(
                    helpers.errorResponse('User not found')
                );
            }

            // Get comprehensive user data
            const referrals = await this.db.getReferrals(userId);
            const proofs = await this.db.getProofsByUser(userId);
            const transactions = await this.wallet.getTransactionHistory(userId, 50);
            const withdrawals = await this.wallet.getWithdrawalHistory(userId, 50);
            
            // Get recent activity
            const recentActivity = [...transactions, ...withdrawals]
                .sort((a, b) => {
                    const dateA = a.timestamp || a.requestedAt;
                    const dateB = b.timestamp || b.requestedAt;
                    return new Date(dateB) - new Date(dateA);
                })
                .slice(0, 10);

            // Calculate statistics
            const statistics = {
                tasks: {
                    completed: proofs.filter(p => p.status === 'approved').length,
                    pending: proofs.filter(p => p.status === 'pending').length,
                    rejected: proofs.filter(p => p.status === 'rejected').length,
                    total: proofs.length,
                    successRate: proofs.length > 0 ? 
                        (proofs.filter(p => p.status === 'approved').length / proofs.length * 100).toFixed(2) : 0
                },
                referrals: {
                    total: referrals.length,
                    bonusPaid: referrals.filter(r => r.bonusPaid === 'true').length,
                    pending: referrals.filter(r => r.bonusPaid !== 'true').length,
                    earnings: referrals.filter(r => r.bonusPaid === 'true').length * 5
                },
                financial: {
                    totalWithdrawn: withdrawals
                        .filter(w => w.status === 'approved' || w.status === 'paid')
                        .reduce((sum, w) => sum + w.amount, 0),
                    pendingWithdrawal: withdrawals
                        .filter(w => w.status === 'pending')
                        .reduce((sum, w) => sum + w.amount, 0),
                    totalCharges: withdrawals
                        .filter(w => w.status === 'approved' || w.status === 'paid')
                        .reduce((sum, w) => sum + w.charges, 0),
                    netWithdrawn: withdrawals
                        .filter(w => w.status === 'approved' || w.status === 'paid')
                        .reduce((sum, w) => sum + w.netAmount, 0)
                },
                activity: {
                    daysActive: Math.ceil((Date.now() - new Date(user.joinedAt).getTime()) / (1000 * 60 * 60 * 24)),
                    lastActivity: user.lastActive || user.joinedAt,
                    avgDailyEarnings: (parseInt(user.totalEarned) || 0) / Math.max(1, Math.ceil((Date.now() - new Date(user.joinedAt).getTime()) / (1000 * 60 * 60 * 24)))
                }
            };

            // Get referral details
            const referralDetails = await Promise.all(
                referrals.map(async (ref) => {
                    const referredUser = await this.db.getUser(ref.referredId);
                    
                    return {
                        referredId: ref.referredId,
                        referredUser: {
                            username: referredUser?.username || 'N/A',
                            joined: referredUser?.joinedAt,
                            hasWithdrawn: referredUser ? 
                                (await this.wallet.getWithdrawalHistory(ref.referredId, 1))
                                    .some(w => w.status === 'approved' || w.status === 'paid') : false
                        },
                        timestamp: ref.timestamp,
                        bonusPaid: ref.bonusPaid === 'true',
                        eligibleForBonus: referredUser ? 
                            (await this.wallet.getWithdrawalHistory(ref.referredId, 1))
                                .some(w => w.status === 'approved' || w.status === 'paid') && ref.bonusPaid !== 'true' : false
                    };
                })
            );

            res.json(helpers.successResponse({
                profile: {
                    id: user.userId,
                    username: user.username || 'N/A',
                    firstName: user.first_name || '',
                    lastName: user.last_name || '',
                    language: user.language_code || 'en',
                    refCode: user.refCode || 'N/A',
                    status: user.status || 'active',
                    isPremium: user.isPremium === 'true',
                    joined: user.joinedAt,
                    lastActive: user.lastActive || user.joinedAt,
                    bannedInfo: user.status === 'banned' ? {
                        reason: user.banReason || '',
                        bannedBy: user.bannedBy || '',
                        bannedAt: user.bannedAt || ''
                    } : null
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
                    withdrawable: parseInt(user.cashWallet) || 0,
                    needsTransfer: (parseInt(user.mainWallet) || 0) > 0 && (parseInt(user.cashWallet) || 0) < 100
                },
                statistics: statistics,
                referrals: referralDetails,
                recentActivity: recentActivity.map(activity => ({
                    type: activity.type || 'withdrawal',
                    amount: activity.amount || 0,
                    description: activity.description || `Withdrawal via ${activity.method}`,
                    timestamp: activity.timestamp || activity.requestedAt,
                    status: activity.status || 'completed'
                })),
                proofHistory: proofs.slice(0, 10).map(proof => ({
                    id: proof.id,
                    status: proof.status,
                    reward: proof.reward,
                    submittedAt: proof.submittedAt,
                    verifiedAt: proof.verifiedAt
                })),
                withdrawalHistory: withdrawals.slice(0, 10).map(withdrawal => ({
                    id: withdrawal.id,
                    amount: withdrawal.amount,
                    netAmount: withdrawal.netAmount,
                    method: withdrawal.method,
                    status: withdrawal.status,
                    requestedAt: withdrawal.requestedAt
                }))
            }));
        } catch (error) {
            console.error('Get user by ID error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get user', error));
        }
    }

    // Update user
    async updateUser(req, res) {
        try {
            const userId = req.params.id;
            const updates = req.body;

            // Check if user exists
            const user = await this.db.getUser(userId);
            if (!user) {
                return res.status(404).json(
                    helpers.errorResponse('User not found')
                );
            }

            // Allowed updates
            const allowedUpdates = [
                'username', 'first_name', 'last_name', 'status', 
                'isPremium', 'refCode', 'language_code', 'lastActive'
            ];
            const filteredUpdates = {};

            for (const key in updates) {
                if (allowedUpdates.includes(key)) {
                    filteredUpdates[key] = updates[key];
                }
            }

            // Special handling for status changes
            if (filteredUpdates.status === 'banned' && user.status !== 'banned') {
                filteredUpdates.banReason = updates.banReason || 'Banned by admin';
                filteredUpdates.bannedBy = req.adminId || 6561117046;
                filteredUpdates.bannedAt = new Date().toISOString();
            } else if (filteredUpdates.status === 'active' && user.status === 'banned') {
                filteredUpdates.banReason = '';
                filteredUpdates.bannedBy = '';
                filteredUpdates.bannedAt = '';
            }

            await this.db.updateUser(userId, filteredUpdates);

            res.json(helpers.successResponse(
                filteredUpdates,
                'User updated successfully'
            ));
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json(helpers.errorResponse('Failed to update user', error));
        }
    }

    // Update user balance
    async updateUserBalance(req, res) {
        try {
            const userId = req.params.id;
            const { type, amount, description, note } = req.body;
            const adminId = req.adminId || 6561117046;

            if (!amount || isNaN(amount) || parseFloat(amount) === 0) {
                return res.status(400).json(
                    helpers.errorResponse('Valid non-zero amount is required')
                );
            }

            // Check if user exists
            const user = await this.db.getUser(userId);
            if (!user) {
                return res.status(404).json(
                    helpers.errorResponse('User not found')
                );
            }

            const transactionType = type || 'admin_adjustment';
            const transactionDescription = description || 
                `Admin adjustment by ${adminId}${note ? `: ${note}` : ''}`;

            const result = await this.wallet.createCustomTransaction(
                userId,
                parseFloat(amount),
                transactionType,
                transactionDescription
            );

            if (result.success) {
                // Log admin action
                await this.db.addAdminLog({
                    adminId: adminId,
                    action: 'balance_adjustment',
                    targetUserId: userId,
                    details: {
                        amount: amount,
                        type: transactionType,
                        description: transactionDescription,
                        previousBalance: (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0),
                        newBalance: result.newBalance
                    },
                    timestamp: new Date().toISOString()
                });

                res.json(helpers.successResponse({
                    userId: userId,
                    type: transactionType,
                    amount: amount,
                    previousBalance: (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0),
                    newBalance: result.newBalance,
                    transactionId: result.transactionId
                }, 'Balance updated successfully'));
            } else {
                res.status(400).json(
                    helpers.errorResponse(result.error)
                );
            }
        } catch (error) {
            console.error('Update user balance error:', error);
            res.status(500).json(helpers.errorResponse('Failed to update balance', error));
        }
    }

    // Ban user
    async banUser(req, res) {
        try {
            const userId = req.params.id;
            const { reason } = req.body;
            const adminId = req.adminId || 6561117046;

            // Check if user exists
            const user = await this.db.getUser(userId);
            if (!user) {
                return res.status(404).json(
                    helpers.errorResponse('User not found')
                );
            }

            if (user.status === 'banned') {
                return res.status(400).json(
                    helpers.errorResponse('User is already banned')
                );
            }

            const banData = {
                status: 'banned',
                banReason: reason || 'Banned by admin',
                bannedBy: adminId,
                bannedAt: new Date().toISOString()
            };

            await this.db.updateUser(userId, banData);

            // Log admin action
            await this.db.addAdminLog({
                adminId: adminId,
                action: 'ban_user',
                targetUserId: userId,
                details: {
                    reason: reason,
                    previousStatus: user.status
                },
                timestamp: new Date().toISOString()
            });

            res.json(helpers.successResponse({
                userId: userId,
                bannedAt: banData.bannedAt,
                reason: banData.banReason,
                bannedBy: banData.bannedBy
            }, 'User banned successfully'));
        } catch (error) {
            console.error('Ban user error:', error);
            res.status(500).json(helpers.errorResponse('Failed to ban user', error));
        }
    }

    // Unban user
    async unbanUser(req, res) {
        try {
            const userId = req.params.id;
            const adminId = req.adminId || 6561117046;

            // Check if user exists
            const user = await this.db.getUser(userId);
            if (!user) {
                return res.status(404).json(
                    helpers.errorResponse('User not found')
                );
            }

            if (user.status !== 'banned') {
                return res.status(400).json(
                    helpers.errorResponse('User is not banned')
                );
            }

            const unbanData = {
                status: 'active',
                banReason: '',
                bannedBy: '',
                bannedAt: ''
            };

            await this.db.updateUser(userId, unbanData);

            // Log admin action
            await this.db.addAdminLog({
                adminId: adminId,
                action: 'unban_user',
                targetUserId: userId,
                details: {
                    previousStatus: user.status,
                    banReason: user.banReason
                },
                timestamp: new Date().toISOString()
            });

            res.json(helpers.successResponse({
                userId: userId,
                unbannedAt: new Date().toISOString()
            }, 'User unbanned successfully'));
        } catch (error) {
            console.error('Unban user error:', error);
            res.status(500).json(helpers.errorResponse('Failed to unban user', error));
        }
    }

    // Get user transactions
    async getUserTransactions(req, res) {
        try {
            const userId = req.params.id;
            const { 
                page = 1, 
                limit = 50, 
                type = '',
                startDate = '',
                endDate = ''
            } = req.query;

            // Check if user exists
            const user = await this.db.getUser(userId);
            if (!user) {
                return res.status(404).json(
                    helpers.errorResponse('User not found')
                );
            }

            let transactions = await this.wallet.getTransactionHistory(userId, 1000);

            // Apply filters
            if (type) {
                transactions = transactions.filter(tx => tx.type === type);
            }

            if (startDate) {
                const start = new Date(startDate);
                transactions = transactions.filter(tx => new Date(tx.timestamp) >= start);
            }

            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                transactions = transactions.filter(tx => new Date(tx.timestamp) <= end);
            }

            // Sort by timestamp (newest first)
            transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            const paginated = helpers.paginate(transactions, parseInt(page), parseInt(limit));

            // Calculate statistics
            const stats = {
                total: transactions.length,
                deposits: transactions.filter(t => t.amount > 0).length,
                withdrawals: transactions.filter(t => t.amount < 0).length,
                totalDeposits: transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
                totalWithdrawals: Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)),
                netChange: transactions.reduce((sum, t) => sum + t.amount, 0),
                byType: this.groupTransactionsByType(transactions)
            };

            res.json(helpers.successResponse({
                transactions: paginated.data.map(tx => ({
                    id: tx.id,
                    type: tx.type,
                    amount: tx.amount,
                    description: tx.description,
                    timestamp: tx.timestamp,
                    balanceAfter: tx.balanceAfter,
                    emoji: helpers.getEmojiByValue(tx.type.includes('add') ? 'add' : 'deduct', 'status'),
                    isPositive: tx.amount > 0
                })),
                pagination: {
                    page: paginated.page,
                    limit: paginated.limit,
                    total: paginated.total,
                    totalPages: paginated.totalPages,
                    hasNext: paginated.hasNext,
                    hasPrev: paginated.hasPrev
                },
                statistics: stats,
                user: {
                    id: user.userId,
                    username: user.username,
                    currentBalance: (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0)
                }
            }));
        } catch (error) {
            console.error('Get user transactions error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get transactions', error));
        }
    }

    // Get user withdrawals
    async getUserWithdrawals(req, res) {
        try {
            const userId = req.params.id;
            const { 
                page = 1, 
                limit = 20, 
                status = '',
                method = ''
            } = req.query;

            // Check if user exists
            const user = await this.db.getUser(userId);
            if (!user) {
                return res.status(404).json(
                    helpers.errorResponse('User not found')
                );
            }

            let withdrawals = await this.wallet.getWithdrawalHistory(userId, 1000);

            // Apply filters
            if (status) {
                withdrawals = withdrawals.filter(w => w.status === status);
            }

            if (method) {
                withdrawals = withdrawals.filter(w => w.method === method);
            }

            // Sort by requested date (newest first)
            withdrawals.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

            const paginated = helpers.paginate(withdrawals, parseInt(page), parseInt(limit));

            // Calculate statistics
            const stats = {
                total: withdrawals.length,
                pending: withdrawals.filter(w => w.status === 'pending').length,
                approved: withdrawals.filter(w => w.status === 'approved').length,
                rejected: withdrawals.filter(w => w.status === 'rejected').length,
                paid: withdrawals.filter(w => w.status === 'paid').length,
                totalAmount: withdrawals.reduce((sum, w) => sum + w.amount, 0),
                totalNetAmount: withdrawals.reduce((sum, w) => sum + w.netAmount, 0),
                totalCharges: withdrawals.reduce((sum, w) => sum + w.charges, 0),
                byMethod: this.groupWithdrawalsByMethod(withdrawals)
            };

            res.json(helpers.successResponse({
                withdrawals: paginated.data.map(wd => ({
                    id: wd.id,
                    amount: wd.amount,
                    charges: wd.charges,
                    netAmount: wd.netAmount,
                    method: wd.method,
                    status: wd.status,
                    requestedAt: wd.requestedAt,
                    processedAt: wd.processedAt,
                    emoji: helpers.getEmojiByValue(wd.status, 'payment'),
                    isFirst: wd.isFirstWithdraw || false
                })),
                pagination: {
                    page: paginated.page,
                    limit: paginated.limit,
                    total: paginated.total,
                    totalPages: paginated.totalPages,
                    hasNext: paginated.hasNext,
                    hasPrev: paginated.hasPrev
                },
                statistics: stats,
                user: {
                    id: user.userId,
                    username: user.username,
                    cashBalance: parseInt(user.cashWallet) || 0
                }
            }));
        } catch (error) {
            console.error('Get user withdrawals error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get withdrawals', error));
        }
    }

    // Get user proofs
    async getUserProofs(req, res) {
        try {
            const userId = req.params.id;
            const { 
                page = 1, 
                limit = 20, 
                status = '',
                taskId = ''
            } = req.query;

            // Check if user exists
            const user = await this.db.getUser(userId);
            if (!user) {
                return res.status(404).json(
                    helpers.errorResponse('User not found')
                );
            }

            let proofs = await this.db.getProofsByUser(userId);

            // Apply filters
            if (status) {
                proofs = proofs.filter(p => p.status === status);
            }

            if (taskId) {
                proofs = proofs.filter(p => p.taskId === taskId);
            }

            // Sort by submitted date (newest first)
            proofs.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

            // Get task details for each proof
            const detailedProofs = await Promise.all(
                proofs.map(async (proof) => {
                    const task = await this.db.getTask(proof.taskId);
                    const admin = proof.verifiedBy ? await this.db.getUser(proof.verifiedBy) : null;

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
                        verifiedBy: admin ? {
                            id: admin.userId,
                            username: admin.username
                        } : null,
                        hoursPending: proof.status === 'pending' ? 
                            Math.floor((Date.now() - new Date(proof.submittedAt).getTime()) / (1000 * 60 * 60)) : null
                    };
                })
            );

            const paginated = helpers.paginate(detailedProofs, parseInt(page), parseInt(limit));

            // Calculate statistics
            const stats = {
                total: proofs.length,
                approved: proofs.filter(p => p.status === 'approved').length,
                rejected: proofs.filter(p => p.status === 'rejected').length,
                pending: proofs.filter(p => p.status === 'pending').length,
                totalRewards: proofs
                    .filter(p => p.status === 'approved')
                    .reduce((sum, p) => sum + (parseInt(p.reward) || 0), 0),
                successRate: proofs.length > 0 ? 
                    (proofs.filter(p => p.status === 'approved').length / proofs.length * 100).toFixed(2) : 0
            };

            res.json(helpers.successResponse({
                proofs: paginated.data,
                pagination: {
                    page: paginated.page,
                    limit: paginated.limit,
                    total: paginated.total,
                    totalPages: paginated.totalPages,
                    hasNext: paginated.hasNext,
                    hasPrev: paginated.hasPrev
                },
                statistics: stats,
                user: {
                    id: user.userId,
                    username: user.username,
                    taskEarnings: parseInt(user.totalEarned) - parseInt(user.refEarned) || 0
                }
            }));
        } catch (error) {
            console.error('Get user proofs error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get proofs', error));
        }
    }

    // Search users
    async searchUsers(req, res) {
        try {
            const query = req.params.query;
            const limit = parseInt(req.query.limit) || 10;

            const users = await this.db.getAllUsers();

            const results = users.filter(user => 
                user.username?.toLowerCase().includes(query.toLowerCase()) ||
                user.userId?.toString().includes(query) ||
                user.refCode?.toLowerCase().includes(query.toLowerCase()) ||
                user.first_name?.toLowerCase().includes(query.toLowerCase())
            ).slice(0, limit);

            res.json(helpers.successResponse(
                results.map(user => ({
                    id: user.userId,
                    username: user.username || 'N/A',
                    firstName: user.first_name || '',
                    refCode: user.refCode || 'N/A',
                    status: user.status || 'active',
                    balance: (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0),
                    joined: user.joinedAt,
                    lastActive: user.lastActive || user.joinedAt
                }))
            ));
        } catch (error) {
            console.error('Search users error:', error);
            res.status(500).json(helpers.errorResponse('Failed to search users', error));
        }
    }

    // Export users to CSV
    async exportUsers(req, res) {
        try {
            const users = await this.db.getAllUsers();
            
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
                'Is Premium',
                'Joined Date',
                'Last Active',
                'Language',
                'Banned Reason',
                'Banned By',
                'Banned At'
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
                user.isPremium === 'true' ? 'Yes' : 'No',
                user.joinedAt,
                user.lastActive || user.joinedAt,
                user.language_code || 'en',
                user.banReason || '',
                user.bannedBy || '',
                user.bannedAt || ''
            ]);
            
            // Combine headers and rows
            const csvContent = [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');
            
            // Set response headers for CSV download
            const filename = `users-export-${Date.now()}.csv`;
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            
            res.send(csvContent);
        } catch (error) {
            console.error('Export users error:', error);
            res.status(500).json(helpers.errorResponse('Failed to export users', error));
        }
    }

    // Helper methods
    groupTransactionsByType(transactions) {
        const groups = {};
        
        transactions.forEach(tx => {
            if (!groups[tx.type]) {
                groups[tx.type] = {
                    count: 0,
                    total: 0
                };
            }
            groups[tx.type].count++;
            groups[tx.type].total += tx.amount;
        });
        
        return groups;
    }

    groupWithdrawalsByMethod(withdrawals) {
        const groups = {};
        
        withdrawals.forEach(wd => {
            if (!groups[wd.method]) {
                groups[wd.method] = {
                    count: 0,
                    total: 0,
                    netTotal: 0
                };
            }
            groups[wd.method].count++;
            groups[wd.method].total += wd.amount;
            groups[wd.method].netTotal += wd.netAmount;
        });
        
        return groups;
    }
}

module.exports = UserController;
