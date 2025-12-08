const helpers = require('../../telegram-bot/utils/helpers');
const WalletSystem = require('../../telegram-bot/utils/wallet');

class PaymentController {
    constructor(db) {
        this.db = db;
        this.wallet = new WalletSystem(db);
    }

    // Get all withdrawals
    async getAllWithdrawals(req, res) {
        try {
            const { 
                page = 1, 
                limit = 20, 
                status = '',
                method = '',
                startDate = '',
                endDate = '',
                minAmount = '',
                maxAmount = '',
                sortBy = 'requestedAt',
                sortOrder = 'desc'
            } = req.query;

            let withdrawals = await this.db.getAllWithdrawals();

            // Apply filters
            if (status) {
                withdrawals = withdrawals.filter(w => w.status === status);
            }

            if (method) {
                withdrawals = withdrawals.filter(w => w.method === method);
            }

            if (startDate) {
                const start = new Date(startDate);
                withdrawals = withdrawals.filter(w => new Date(w.requestedAt) >= start);
            }

            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                withdrawals = withdrawals.filter(w => new Date(w.requestedAt) <= end);
            }

            if (minAmount) {
                const min = parseInt(minAmount);
                withdrawals = withdrawals.filter(w => parseInt(w.amount) >= min);
            }

            if (maxAmount) {
                const max = parseInt(maxAmount);
                withdrawals = withdrawals.filter(w => parseInt(w.amount) <= max);
            }

            // Apply sorting
            withdrawals.sort((a, b) => {
                let aValue = a[sortBy] || '';
                let bValue = b[sortBy] || '';

                // Handle numeric sorting
                if (sortBy === 'amount' || sortBy === 'netAmount' || sortBy === 'charges') {
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
            const paginated = helpers.paginate(withdrawals, parseInt(page), parseInt(limit));

            // Get detailed information for each withdrawal
            const detailedWithdrawals = await Promise.all(
                paginated.data.map(async (withdrawal) => {
                    const user = await this.db.getUser(withdrawal.userId);
                    const admin = withdrawal.processedBy ? await this.db.getUser(withdrawal.processedBy) : null;

                    return {
                        id: withdrawal.id,
                        user: {
                            id: user?.userId,
                            username: user?.username || 'N/A',
                            balance: user ? (parseInt(user.cashWallet) || 0) : 0
                        },
                        amount: parseInt(withdrawal.amount) || 0,
                        charges: parseInt(withdrawal.charges) || 0,
                        netAmount: parseInt(withdrawal.netAmount) || 0,
                        method: withdrawal.method,
                        status: withdrawal.status,
                        userPhone: withdrawal.userPhone || '',
                        transactionId: withdrawal.transactionId || '',
                        adminNote: withdrawal.adminNote || '',
                        requestedAt: withdrawal.requestedAt,
                        processedAt: withdrawal.processedAt,
                        processedBy: admin ? {
                            id: admin.userId,
                            username: admin.username
                        } : null,
                        hoursPending: withdrawal.status === 'pending' ? 
                            Math.floor((Date.now() - new Date(withdrawal.requestedAt).getTime()) / (1000 * 60 * 60)) : null,
                        emoji: helpers.getEmojiByValue(withdrawal.status, 'payment')
                    };
                })
            );

            // Calculate statistics
            const stats = {
                total: withdrawals.length,
                totalAmount: withdrawals.reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0),
                totalCharges: withdrawals.reduce((sum, w) => sum + (parseInt(w.charges) || 0), 0),
                totalNetAmount: withdrawals.reduce((sum, w) => sum + (parseInt(w.netAmount) || 0), 0),
                pending: withdrawals.filter(w => w.status === 'pending').length,
                pendingAmount: withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0),
                approved: withdrawals.filter(w => w.status === 'approved').length,
                approvedAmount: withdrawals.filter(w => w.status === 'approved').reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0),
                rejected: withdrawals.filter(w => w.status === 'rejected').length,
                rejectedAmount: withdrawals.filter(w => w.status === 'rejected').reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0),
                paid: withdrawals.filter(w => w.status === 'paid').length,
                paidAmount: withdrawals.filter(w => w.status === 'paid').reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0),
                byMethod: this.groupWithdrawalsByMethod(withdrawals),
                byStatus: this.groupWithdrawalsByStatus(withdrawals)
            };

            res.json(helpers.successResponse({
                withdrawals: detailedWithdrawals,
                pagination: {
                    page: paginated.page,
                    limit: paginated.limit,
                    total: paginated.total,
                    totalPages: paginated.totalPages,
                    hasNext: paginated.hasNext,
                    hasPrev: paginated.hasPrev
                },
                statistics: stats,
                filters: {
                    status,
                    method,
                    startDate,
                    endDate,
                    minAmount,
                    maxAmount
                }
            }));
        } catch (error) {
            console.error('Get all withdrawals error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get withdrawals', error));
        }
    }

    // Get withdrawal by ID
    async getWithdrawalById(req, res) {
        try {
            const withdrawalId = req.params.id;
            const withdrawal = await this.db.getWithdrawal(withdrawalId);

            if (!withdrawal) {
                return res.status(404).json(
                    helpers.errorResponse('Withdrawal not found')
                );
            }

            const user = await this.db.getUser(withdrawal.userId);
            const admin = withdrawal.processedBy ? await this.db.getUser(withdrawal.processedBy) : null;
            
            // Get user's withdrawal history
            const userWithdrawals = await this.wallet.getWithdrawalHistory(withdrawal.userId, 10);
            
            // Get user's transactions
            const userTransactions = await this.wallet.getTransactionHistory(withdrawal.userId, 10);

            // Calculate user statistics
            const userStats = {
                totalWithdrawals: userWithdrawals.length,
                successfulWithdrawals: userWithdrawals.filter(w => 
                    w.status === 'approved' || w.status === 'paid'
                ).length,
                totalWithdrawn: userWithdrawals
                    .filter(w => w.status === 'approved' || w.status === 'paid')
                    .reduce((sum, w) => sum + w.amount, 0),
                totalCharges: userWithdrawals
                    .filter(w => w.status === 'approved' || w.status === 'paid')
                    .reduce((sum, w) => sum + w.charges, 0),
                withdrawalFrequency: this.calculateWithdrawalFrequency(userWithdrawals)
            };

            res.json(helpers.successResponse({
                withdrawal: {
                    id: withdrawal.id,
                    amount: parseInt(withdrawal.amount) || 0,
                    charges: parseInt(withdrawal.charges) || 0,
                    netAmount: parseInt(withdrawal.netAmount) || 0,
                    method: withdrawal.method,
                    status: withdrawal.status,
                    userPhone: withdrawal.userPhone || '',
                    transactionId: withdrawal.transactionId || '',
                    adminNote: withdrawal.adminNote || '',
                    requestedAt: withdrawal.requestedAt,
                    processedAt: withdrawal.processedAt,
                    isFirstWithdraw: userWithdrawals.length === 1 && 
                        (withdrawal.status === 'pending' || withdrawal.status === 'approved' || withdrawal.status === 'paid')
                },
                user: {
                    id: user?.userId,
                    username: user?.username || 'N/A',
                    balance: user ? {
                        main: parseInt(user.mainWallet) || 0,
                        cash: parseInt(user.cashWallet) || 0,
                        total: (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0)
                    } : null,
                    totalEarned: parseInt(user?.totalEarned) || 0,
                    joined: user?.joinedAt,
                    status: user?.status || 'active'
                },
                admin: admin ? {
                    id: admin.userId,
                    username: admin.username
                } : null,
                userStatistics: userStats,
                recentWithdrawals: userWithdrawals.slice(0, 5).map(wd => ({
                    id: wd.id,
                    amount: wd.amount,
                    status: wd.status,
                    method: wd.method,
                    requestedAt: wd.requestedAt
                })),
                recentTransactions: userTransactions
                    .filter(tx => tx.type.includes('withdraw') || tx.type.includes('task'))
                    .slice(0, 5)
                    .map(tx => ({
                        type: tx.type,
                        amount: tx.amount,
                        description: tx.description,
                        timestamp: tx.timestamp
                    }))
            }));
        } catch (error) {
            console.error('Get withdrawal by ID error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get withdrawal', error));
        }
    }

    // Approve withdrawal
    async approveWithdrawal(req, res) {
        try {
            const withdrawalId = req.params.id;
            const { note } = req.body;
            const adminId = req.adminId || 6561117046;

            const result = await this.wallet.processWithdrawal(
                withdrawalId,
                adminId,
                'approve',
                note || `Approved by admin ${adminId}`
            );

            if (result.success) {
                // Log admin action
                await this.db.addAdminLog({
                    adminId: adminId,
                    action: 'approve_withdrawal',
                    targetUserId: result.userId,
                    targetWithdrawalId: withdrawalId,
                    details: {
                        amount: result.amount,
                        netAmount: result.netAmount,
                        method: result.method,
                        note: note
                    },
                    timestamp: new Date().toISOString()
                });

                res.json(helpers.successResponse({
                    withdrawalId: withdrawalId,
                    userId: result.userId,
                    amount: result.amount,
                    netAmount: result.netAmount,
                    method: result.method,
                    processedAt: new Date().toISOString()
                }, result.message));
            } else {
                res.status(400).json(
                    helpers.errorResponse(result.error)
                );
            }
        } catch (error) {
            console.error('Approve withdrawal error:', error);
            res.status(500).json(helpers.errorResponse('Failed to approve withdrawal', error));
        }
    }

    // Reject withdrawal
    async rejectWithdrawal(req, res) {
        try {
            const withdrawalId = req.params.id;
            const { reason } = req.body;
            const adminId = req.adminId || 6561117046;

            const result = await this.wallet.processWithdrawal(
                withdrawalId,
                adminId,
                'reject',
                reason || `Rejected by admin ${adminId}`
            );

            if (result.success) {
                // Log admin action
                await this.db.addAdminLog({
                    adminId: adminId,
                    action: 'reject_withdrawal',
                    targetUserId: result.userId,
                    targetWithdrawalId: withdrawalId,
                    details: {
                        amount: result.amount,
                        reason: reason
                    },
                    timestamp: new Date().toISOString()
                });

                res.json(helpers.successResponse({
                    withdrawalId: withdrawalId,
                    userId: result.userId,
                    amount: result.amount,
                    rejectedAt: new Date().toISOString(),
                    reason: reason
                }, result.message));
            } else {
                res.status(400).json(
                    helpers.errorResponse(result.error)
                );
            }
        } catch (error) {
            console.error('Reject withdrawal error:', error);
            res.status(500).json(helpers.errorResponse('Failed to reject withdrawal', error));
        }
    }

    // Mark withdrawal as paid
    async markWithdrawalPaid(req, res) {
        try {
            const withdrawalId = req.params.id;
            const { transactionId, note } = req.body;
            const adminId = req.adminId || 6561117046;

            const withdrawal = await this.db.getWithdrawal(withdrawalId);
            if (!withdrawal) {
                return res.status(404).json(
                    helpers.errorResponse('Withdrawal not found')
                );
            }

            if (withdrawal.status !== 'pending') {
                return res.status(400).json(
                    helpers.errorResponse(`Withdrawal is already ${withdrawal.status}`)
                );
            }

            // Update withdrawal status
            const updateData = {
                status: 'paid',
                processedAt: new Date().toISOString(),
                processedBy: adminId,
                transactionId: transactionId || '',
                adminNote: note || `Marked as paid by admin ${adminId}`
            };

            await this.db.updateWithdrawal(withdrawalId, updateData);

            // Deduct balance from user
            const deduction = await this.wallet.deductBalance(
                withdrawal.userId,
                parseInt(withdrawal.amount),
                'withdrawal_paid',
                `Withdrawal ${withdrawalId} marked as paid`
            );

            if (deduction.success) {
                // Log admin action
                await this.db.addAdminLog({
                    adminId: adminId,
                    action: 'mark_withdrawal_paid',
                    targetUserId: withdrawal.userId,
                    targetWithdrawalId: withdrawalId,
                    details: {
                        amount: withdrawal.amount,
                        netAmount: withdrawal.netAmount,
                        transactionId: transactionId,
                        previousUserBalance: (parseInt((await this.db.getUser(withdrawal.userId))?.cashWallet) || 0) + parseInt(withdrawal.amount),
                        newUserBalance: deduction.newBalance
                    },
                    timestamp: new Date().toISOString()
                });

                res.json(helpers.successResponse({
                    withdrawalId: withdrawalId,
                    userId: withdrawal.userId,
                    amount: withdrawal.amount,
                    netAmount: withdrawal.netAmount,
                    method: withdrawal.method,
                    transactionId: transactionId,
                    processedAt: updateData.processedAt,
                    userBalance: deduction.newBalance
                }, 'Withdrawal marked as paid successfully'));
            } else {
                res.status(400).json(
                    helpers.errorResponse('Failed to deduct balance: ' + deduction.error)
                );
            }
        } catch (error) {
            console.error('Mark withdrawal paid error:', error);
            res.status(500).json(helpers.errorResponse('Failed to mark withdrawal as paid', error));
        }
    }

    // Update withdrawal details
    async updateWithdrawal(req, res) {
        try {
            const withdrawalId = req.params.id;
            const updates = req.body;
            const adminId = req.adminId || 6561117046;

            // Check if withdrawal exists
            const withdrawal = await this.db.getWithdrawal(withdrawalId);
            if (!withdrawal) {
                return res.status(404).json(
                    helpers.errorResponse('Withdrawal not found')
                );
            }

            // Allowed updates
            const allowedUpdates = ['status', 'adminNote', 'transactionId', 'userPhone', 'method'];
            const filteredUpdates = {};

            for (const key in updates) {
                if (allowedUpdates.includes(key)) {
                    filteredUpdates[key] = updates[key];
                }
            }

            // If status is changing, log it
            if (filteredUpdates.status && filteredUpdates.status !== withdrawal.status) {
                filteredUpdates.processedAt = new Date().toISOString();
                filteredUpdates.processedBy = adminId;
            }

            await this.db.updateWithdrawal(withdrawalId, filteredUpdates);

            // Log admin action if status changed
            if (filteredUpdates.status && filteredUpdates.status !== withdrawal.status) {
                await this.db.addAdminLog({
                    adminId: adminId,
                    action: 'update_withdrawal_status',
                    targetUserId: withdrawal.userId,
                    targetWithdrawalId: withdrawalId,
                    details: {
                        previousStatus: withdrawal.status,
                        newStatus: filteredUpdates.status,
                        updates: filteredUpdates
                    },
                    timestamp: new Date().toISOString()
                });
            }

            res.json(helpers.successResponse(
                filteredUpdates,
                'Withdrawal updated successfully'
            ));
        } catch (error) {
            console.error('Update withdrawal error:', error);
            res.status(500).json(helpers.errorResponse('Failed to update withdrawal', error));
        }
    }

    // Bulk process withdrawals
    async bulkProcessWithdrawals(req, res) {
        try {
            const { withdrawalIds, action, data } = req.body;
            const adminId = req.adminId || 6561117046;

            if (!Array.isArray(withdrawalIds) || withdrawalIds.length === 0) {
                return res.status(400).json(
                    helpers.errorResponse('Withdrawal IDs array is required')
                );
            }

            if (!['approve', 'reject', 'paid'].includes(action)) {
                return res.status(400).json(
                    helpers.errorResponse('Action must be approve, reject, or paid')
                );
            }

            const results = {
                success: [],
                failed: []
            };

            for (const withdrawalId of withdrawalIds) {
                try {
                    if (action === 'paid') {
                        const withdrawal = await this.db.getWithdrawal(withdrawalId);
                        if (withdrawal && withdrawal.status === 'pending') {
                            const updateData = {
                                status: 'paid',
                                processedAt: new Date().toISOString(),
                                processedBy: adminId,
                                transactionId: data?.transactionId || '',
                                adminNote: `Bulk processed as paid by admin ${adminId}`
                            };

                            await this.db.updateWithdrawal(withdrawalId, updateData);

                            // Deduct balance
                            await this.wallet.deductBalance(
                                withdrawal.userId,
                                parseInt(withdrawal.amount),
                                'withdrawal_paid',
                                `Bulk processed withdrawal ${withdrawalId}`
                            );

                            results.success.push({
                                id: withdrawalId,
                                action: 'paid',
                                amount: withdrawal.amount
                            });
                        } else {
                            results.failed.push({
                                id: withdrawalId,
                                action: 'paid',
                                error: 'Not pending or not found'
                            });
                        }
                    } else {
                        const result = await this.wallet.processWithdrawal(
                            withdrawalId,
                            adminId,
                            action,
                            `Bulk processed as ${action} by admin ${adminId}`
                        );

                        if (result.success) {
                            results.success.push({
                                id: withdrawalId,
                                action: action,
                                amount: result.amount
                            });
                        } else {
                            results.failed.push({
                                id: withdrawalId,
                                action: action,
                                error: result.error
                            });
                        }
                    }
                } catch (error) {
                    results.failed.push({
                        id: withdrawalId,
                        action: action,
                        error: error.message
                    });
                }
            }

            // Log bulk action
            await this.db.addAdminLog({
                adminId: adminId,
                action: 'bulk_process_withdrawals',
                details: {
                    action: action,
                    total: withdrawalIds.length,
                    success: results.success.length,
                    failed: results.failed.length,
                    totalAmount: results.success.reduce((sum, r) => sum + (r.amount || 0), 0)
                },
                timestamp: new Date().toISOString()
            });

            res.json(helpers.successResponse({
                processed: withdrawalIds.length,
                results: results,
                summary: {
                    totalAmount: results.success.reduce((sum, r) => sum + (r.amount || 0), 0),
                    successCount: results.success.length,
                    failureCount: results.failed.length
                }
            }, `Processed ${results.success.length} withdrawals successfully`));
        } catch (error) {
            console.error('Bulk process withdrawals error:', error);
            res.status(500).json(helpers.errorResponse('Failed to bulk process withdrawals', error));
        }
    }

    // Get payment statistics
    async getPaymentStatistics(req, res) {
        try {
            const { period = 'month', method = '' } = req.query; // day, week, month, year, all
            const withdrawals = await this.db.getAllWithdrawals();

            // Filter by method if specified
            let filteredWithdrawals = withdrawals;
            if (method) {
                filteredWithdrawals = filteredWithdrawals.filter(w => w.method === method);
            }

            // Filter by period
            const now = new Date();
            let startDate;
            let periodLabel;

            switch (period) {
                case 'day':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    periodLabel = 'Today';
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    periodLabel = 'Last 7 Days';
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    periodLabel = 'This Month';
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    periodLabel = 'This Year';
                    break;
                default:
                    startDate = new Date(0); // All time
                    periodLabel = 'All Time';
            }

            const periodWithdrawals = filteredWithdrawals.filter(w => 
                new Date(w.requestedAt) >= startDate
            );

            // Calculate statistics
            const stats = {
                totalWithdrawals: periodWithdrawals.length,
                totalAmount: periodWithdrawals.reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0),
                totalCharges: periodWithdrawals.reduce((sum, w) => sum + (parseInt(w.charges) || 0), 0),
                totalNetAmount: periodWithdrawals.reduce((sum, w) => sum + (parseInt(w.netAmount) || 0), 0),
                pending: periodWithdrawals.filter(w => w.status === 'pending').length,
                pendingAmount: periodWithdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0),
                approved: periodWithdrawals.filter(w => w.status === 'approved').length,
                approvedAmount: periodWithdrawals.filter(w => w.status === 'approved').reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0),
                rejected: periodWithdrawals.filter(w => w.status === 'rejected').length,
                paid: periodWithdrawals.filter(w => w.status === 'paid').length,
                paidAmount: periodWithdrawals.filter(w => w.status === 'paid').reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0),
                averageAmount: periodWithdrawals.length > 0 ? 
                    (periodWithdrawals.reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0) / periodWithdrawals.length).toFixed(2) : 0,
                chargePercentage: periodWithdrawals.reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0) > 0 ? 
                    (periodWithdrawals.reduce((sum, w) => sum + (parseInt(w.charges) || 0), 0) / 
                     periodWithdrawals.reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0) * 100).toFixed(2) : 0
            };

            // Daily breakdown for the selected period
            const dailyBreakdown = this.calculateDailyBreakdown(periodWithdrawals, period, startDate);

            // Method distribution
            const methodDistribution = this.groupWithdrawalsByMethod(periodWithdrawals);

            // Status distribution
            const statusDistribution = this.groupWithdrawalsByStatus(periodWithdrawals);

            // Top users by withdrawal amount
            const topUsers = await this.getTopWithdrawalUsers(periodWithdrawals, 10);

            res.json(helpers.successResponse({
                period: period,
                periodLabel: periodLabel,
                dateRange: {
                    start: startDate.toISOString(),
                    end: now.toISOString()
                },
                statistics: stats,
                dailyBreakdown: dailyBreakdown,
                distributions: {
                    byMethod: methodDistribution,
                    byStatus: statusDistribution
                },
                topUsers: topUsers,
                trends: {
                    dailyAverage: stats.totalWithdrawals / Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24))),
                    approvalRate: periodWithdrawals.length > 0 ? 
                        ((stats.approved + stats.paid) / periodWithdrawals.length * 100).toFixed(2) : 0,
                    averageProcessingTime: this.calculateAverageProcessingTime(periodWithdrawals)
                }
            }));
        } catch (error) {
            console.error('Get payment statistics error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get payment statistics', error));
        }
    }

    // Get revenue report
    async getRevenueReport(req, res) {
        try {
            const { startDate, endDate, groupBy = 'day' } = req.query; // day, week, month
            const withdrawals = await this.db.getAllWithdrawals();

            // Filter by date range if provided
            let filteredWithdrawals = withdrawals;
            if (startDate) {
                const start = new Date(startDate);
                filteredWithdrawals = filteredWithdrawals.filter(w => new Date(w.requestedAt) >= start);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filteredWithdrawals = filteredWithdrawals.filter(w => new Date(w.requestedAt) <= end);
            }

            // Group by period
            const revenueData = this.groupRevenueByPeriod(filteredWithdrawals, groupBy);

            // Calculate totals
            const totals = revenueData.reduce((acc, period) => ({
                withdrawals: acc.withdrawals + period.withdrawals,
                amount: acc.amount + period.amount,
                charges: acc.charges + period.charges,
                netAmount: acc.netAmount + period.netAmount,
                users: acc.users + period.users
            }), { withdrawals: 0, amount: 0, charges: 0, netAmount: 0, users: 0 });

            // Calculate additional metrics
            const metrics = {
                avgWithdrawalAmount: totals.withdrawals > 0 ? (totals.amount / totals.withdrawals).toFixed(2) : 0,
                avgChargesPerWithdrawal: totals.withdrawals > 0 ? (totals.charges / totals.withdrawals).toFixed(2) : 0,
                chargePercentage: totals.amount > 0 ? (totals.charges / totals.amount * 100).toFixed(2) : 0,
                avgWithdrawalsPerUser: totals.users > 0 ? (totals.withdrawals / totals.users).toFixed(2) : 0,
                avgAmountPerUser: totals.users > 0 ? (totals.amount / totals.users).toFixed(2) : 0
            };

            // Get method breakdown
            const methodBreakdown = this.groupWithdrawalsByMethod(filteredWithdrawals);

            // Get status breakdown
            const statusBreakdown = this.groupWithdrawalsByStatus(filteredWithdrawals);

            res.json(helpers.successResponse({
                dateRange: {
                    start: startDate || revenueData[0]?.period || new Date().toISOString(),
                    end: endDate || revenueData[revenueData.length - 1]?.period || new Date().toISOString()
                },
                groupBy: groupBy,
                revenueData: revenueData,
                totals: totals,
                metrics: metrics,
                breakdowns: {
                    byMethod: methodBreakdown,
                    byStatus: statusBreakdown
                },
                summary: {
                    periodCount: revenueData.length,
                    dateRangeCovered: revenueData.length > 0 ? 
                        `${revenueData[0].period} to ${revenueData[revenueData.length - 1].period}` : 'No data'
                }
            }));
        } catch (error) {
            console.error('Get revenue report error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get revenue report', error));
        }
    }

    // Update payment settings
    async updatePaymentSettings(req, res) {
        try {
            const settings = req.body;
            const adminId = req.adminId || 6561117046;

            // Allowed settings
            const allowedSettings = [
                'minimum_withdraw',
                'referral_bonus',
                'first_withdraw_charge',
                'withdraw_charge_percent',
                'bkash_number',
                'nagad_number',
                'rocket_number',
                'payment_methods',
                'withdrawal_processing_time',
                'auto_approve_withdrawals',
                'max_withdraw_per_day',
                'withdraw_limit_per_user'
            ];

            const updatedSettings = {};
            for (const [key, value] of Object.entries(settings)) {
                if (allowedSettings.includes(key)) {
                    await this.db.updateSetting(key, value);
                    updatedSettings[key] = value;
                }
            }

            // Log admin action
            await this.db.addAdminLog({
                adminId: adminId,
                action: 'update_payment_settings',
                details: {
                    updatedSettings: updatedSettings
                },
                timestamp: new Date().toISOString()
            });

            res.json(helpers.successResponse(
                updatedSettings,
                'Payment settings updated successfully'
            ));
        } catch (error) {
            console.error('Update payment settings error:', error);
            res.status(500).json(helpers.errorResponse('Failed to update payment settings', error));
        }
    }

    // Get payment methods
    async getPaymentMethods(req, res) {
        try {
            const settings = await this.db.getSettings();
            
            const paymentMethods = {
                bkash: {
                    number: settings.bkash_number || '',
                    name: 'Bkash',
                    enabled: true,
                    charge: 0,
                    processingTime: 'Instant'
                },
                nagad: {
                    number: settings.nagad_number || '',
                    name: 'Nagad',
                    enabled: true,
                    charge: 0,
                    processingTime: 'Instant'
                },
                rocket: {
                    number: settings.rocket_number || '',
                    name: 'Rocket',
                    enabled: true,
                    charge: 0,
                    processingTime: 'Instant'
                },
                bank: {
                    name: 'Bank Transfer',
                    enabled: false,
                    charge: 15,
                    processingTime: '1-2 Business Days'
                }
            };

            res.json(helpers.successResponse(paymentMethods));
        } catch (error) {
            console.error('Get payment methods error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get payment methods', error));
        }
    }

    // Export withdrawals to CSV
    async exportWithdrawals(req, res) {
        try {
            const { status, method, startDate, endDate } = req.query;
            let withdrawals = await this.db.getAllWithdrawals();

            // Apply filters
            if (status) {
                withdrawals = withdrawals.filter(w => w.status === status);
            }

            if (method) {
                withdrawals = withdrawals.filter(w => w.method === method);
            }

            if (startDate) {
                const start = new Date(startDate);
                withdrawals = withdrawals.filter(w => new Date(w.requestedAt) >= start);
            }

            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                withdrawals = withdrawals.filter(w => new Date(w.requestedAt) <= end);
            }

            // Get user details for each withdrawal
            const withdrawalDetails = await Promise.all(
                withdrawals.map(async (withdrawal) => {
                    const user = await this.db.getUser(withdrawal.userId);
                    return {
                        ...withdrawal,
                        username: user?.username || 'N/A'
                    };
                })
            );

            // Create CSV headers
            const headers = [
                'Withdrawal ID',
                'User ID',
                'Username',
                'Amount',
                'Charges',
                'Net Amount',
                'Method',
                'Status',
                'User Phone',
                'Transaction ID',
                'Admin Note',
                'Requested Date',
                'Processed Date',
                'Processed By',
                'Is First Withdraw'
            ];

            // Create CSV rows
            const rows = withdrawalDetails.map(wd => {
                const isFirst = wd.status === 'pending' || wd.status === 'approved' || wd.status === 'paid' ? 
                    'Yes' : 'No';
                
                return [
                    wd.id,
                    wd.userId,
                    wd.username,
                    parseInt(wd.amount) || 0,
                    parseInt(wd.charges) || 0,
                    parseInt(wd.netAmount) || 0,
                    wd.method,
                    wd.status,
                    wd.userPhone || '',
                    wd.transactionId || '',
                    wd.adminNote || '',
                    wd.requestedAt,
                    wd.processedAt || '',
                    wd.processedBy || '',
                    isFirst
                ];
            });

            // Combine headers and rows
            const csvContent = [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');

            // Set response headers for CSV download
            const filename = `withdrawals-export-${Date.now()}.csv`;
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

            res.send(csvContent);
        } catch (error) {
            console.error('Export withdrawals error:', error);
            res.status(500).json(helpers.errorResponse('Failed to export withdrawals', error));
        }
    }

    // Helper methods
    groupWithdrawalsByMethod(withdrawals) {
        const groups = {};
        
        withdrawals.forEach(wd => {
            if (!groups[wd.method]) {
                groups[wd.method] = {
                    count: 0,
                    amount: 0,
                    netAmount: 0,
                    charges: 0
                };
            }
            groups[wd.method].count++;
            groups[wd.method].amount += parseInt(wd.amount) || 0;
            groups[wd.method].netAmount += parseInt(wd.netAmount) || 0;
            groups[wd.method].charges += parseInt(wd.charges) || 0;
        });
        
        return groups;
    }

    groupWithdrawalsByStatus(withdrawals) {
        const groups = {};
        
        withdrawals.forEach(wd => {
            if (!groups[wd.status]) {
                groups[wd.status] = {
                    count: 0,
                    amount: 0,
                    netAmount: 0,
                    charges: 0
                };
            }
            groups[wd.status].count++;
            groups[wd.status].amount += parseInt(wd.amount) || 0;
            groups[wd.status].netAmount += parseInt(wd.netAmount) || 0;
            groups[wd.status].charges += parseInt(wd.charges) || 0;
        });
        
        return groups;
    }

    calculateWithdrawalFrequency(withdrawals) {
        if (withdrawals.length < 2) return 'N/A';
        
        const sortedWithdrawals = withdrawals
            .filter(w => w.status === 'approved' || w.status === 'paid')
            .sort((a, b) => new Date(a.requestedAt) - new Date(b.requestedAt));
        
        if (sortedWithdrawals.length < 2) return 'N/A';
        
        const timeDiff = new Date(sortedWithdrawals[sortedWithdrawals.length - 1].requestedAt) - 
                        new Date(sortedWithdrawals[0].requestedAt);
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        
        return (sortedWithdrawals.length / daysDiff).toFixed(2) + ' per day';
    }

    calculateDailyBreakdown(withdrawals, period, startDate) {
        const breakdown = {};
        const now = new Date();
        
        // Determine interval based on period
        let intervalDays;
        switch (period) {
            case 'day':
                intervalDays = 1;
                break;
            case 'week':
                intervalDays = 7;
                break;
            case 'month':
                intervalDays = 30;
                break;
            case 'year':
                intervalDays = 365;
                break;
            default:
                intervalDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
        }
        
        // Initialize dates
        for (let i = 0; i < intervalDays; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            breakdown[dateStr] = {
                date: dateStr,
                withdrawals: 0,
                amount: 0,
                charges: 0,
                netAmount: 0,
                users: new Set()
            };
        }
        
        // Populate data
        withdrawals.forEach(wd => {
            const dateStr = new Date(wd.requestedAt).toISOString().split('T')[0];
            if (breakdown[dateStr]) {
                breakdown[dateStr].withdrawals++;
                breakdown[dateStr].amount += parseInt(wd.amount) || 0;
                breakdown[dateStr].charges += parseInt(wd.charges) || 0;
                breakdown[dateStr].netAmount += parseInt(wd.netAmount) || 0;
                breakdown[dateStr].users.add(wd.userId);
            }
        });
        
        // Convert to array and calculate unique users
        return Object.values(breakdown).map(day => ({
            ...day,
            users: day.users.size
        }));
    }

    async getTopWithdrawalUsers(withdrawals, limit = 10) {
        const userTotals = {};
        
        // Calculate totals per user
        for (const wd of withdrawals) {
            if (!userTotals[wd.userId]) {
                userTotals[wd.userId] = {
                    userId: wd.userId,
                    totalAmount: 0,
                    totalWithdrawals: 0
                };
            }
            userTotals[wd.userId].totalAmount += parseInt(wd.amount) || 0;
            userTotals[wd.userId].totalWithdrawals++;
        }
        
        // Get user details
        const userDetails = await Promise.all(
            Object.values(userTotals)
                .sort((a, b) => b.totalAmount - a.totalAmount)
                .slice(0, limit)
                .map(async (userTotal) => {
                    const user = await this.db.getUser(userTotal.userId);
                    return {
                        userId: userTotal.userId,
                        username: user?.username || 'N/A',
                        totalAmount: userTotal.totalAmount,
                        totalWithdrawals: userTotal.totalWithdrawals,
                        averageAmount: (userTotal.totalAmount / userTotal.totalWithdrawals).toFixed(2)
                    };
                })
        );
        
        return userDetails;
    }

    calculateAverageProcessingTime(withdrawals) {
        const processedWithdrawals = withdrawals.filter(w => 
            w.status === 'approved' || w.status === 'paid' || w.status === 'rejected'
        );
        
        if (processedWithdrawals.length === 0) return 'N/A';
        
        let totalHours = 0;
        processedWithdrawals.forEach(wd => {
            if (wd.requestedAt && wd.processedAt) {
                const requestTime = new Date(wd.requestedAt).getTime();
                const processTime = new Date(wd.processedAt).getTime();
                totalHours += (processTime - requestTime) / (1000 * 60 * 60);
            }
        });
        
        const avgHours = totalHours / processedWithdrawals.length;
        
        if (avgHours < 1) return '< 1 hour';
        if (avgHours < 24) return `${avgHours.toFixed(1)} hours`;
        return `${(avgHours / 24).toFixed(1)} days`;
    }

    groupRevenueByPeriod(withdrawals, groupBy) {
        const groups = {};
        
        withdrawals.forEach(wd => {
            let periodKey;
            const date = new Date(wd.requestedAt);
            
            switch (groupBy) {
                case 'day':
                    periodKey = date.toISOString().split('T')[0];
                    break;
                case 'week':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    periodKey = weekStart.toISOString().split('T')[0];
                    break;
                case 'month':
                    periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                    break;
                default:
                    periodKey = date.toISOString().split('T')[0];
            }
            
            if (!groups[periodKey]) {
                groups[periodKey] = {
                    period: periodKey,
                    withdrawals: 0,
                    amount: 0,
                    charges: 0,
                    netAmount: 0,
                    users: new Set()
                };
            }
            
            groups[periodKey].withdrawals++;
            groups[periodKey].amount += parseInt(wd.amount) || 0;
            groups[periodKey].charges += parseInt(wd.charges) || 0;
            groups[periodKey].netAmount += parseInt(wd.netAmount) || 0;
            groups[periodKey].users.add(wd.userId);
        });
        
        // Convert to array and format
        return Object.values(groups)
            .sort((a, b) => a.period.localeCompare(b.period))
            .map(group => ({
                ...group,
                users: group.users.size,
                avgAmount: group.withdrawals > 0 ? (group.amount / group.withdrawals).toFixed(2) : 0,
                chargePercentage: group.amount > 0 ? (group.charges / group.amount * 100).toFixed(2) : 0
            }));
    }
}

module.exports = PaymentController;
