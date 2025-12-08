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

// Get all withdrawals
router.get('/withdrawals', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            status = '',
            method = '',
            startDate = '',
            endDate = ''
        } = req.query;
        
        const db = req.app.get('db');
        let withdrawals = await db.getAllWithdrawals();
        
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
        
        // Sort by requested date (newest first)
        withdrawals.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
        
        const paginated = helpers.paginate(withdrawals, parseInt(page), parseInt(limit));
        
        // Get user details for each withdrawal
        const withdrawalDetails = await Promise.all(
            paginated.data.map(async (withdrawal) => {
                const user = await db.getUser(withdrawal.userId);
                const admin = withdrawal.processedBy ? await db.getUser(withdrawal.processedBy) : null;
                
                return {
                    id: withdrawal.id,
                    user: {
                        id: user?.userId,
                        username: user?.username || 'N/A'
                    },
                    amount: parseInt(withdrawal.amount) || 0,
                    charges: parseInt(withdrawal.charges) || 0,
                    netAmount: parseInt(withdrawal.netAmount) || 0,
                    method: withdrawal.method,
                    status: withdrawal.status,
                    userPhone: withdrawal.userPhone || '',
                    transactionId: withdrawal.transactionId || '',
                    requestedAt: withdrawal.requestedAt,
                    processedAt: withdrawal.processedAt,
                    processedBy: admin ? {
                        id: admin.userId,
                        username: admin.username
                    } : null,
                    adminNote: withdrawal.adminNote || '',
                    emoji: helpers.getEmojiByValue(withdrawal.status, 'payment')
                };
            })
        );
        
        // Calculate statistics
        const stats = {
            total: withdrawals.length,
            totalAmount: withdrawals.reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0),
            pending: withdrawals.filter(w => w.status === 'pending').length,
            pendingAmount: withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0),
            approved: withdrawals.filter(w => w.status === 'approved').length,
            approvedAmount: withdrawals.filter(w => w.status === 'approved').reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0),
            rejected: withdrawals.filter(w => w.status === 'rejected').length,
            paid: withdrawals.filter(w => w.status === 'paid').length,
            paidAmount: withdrawals.filter(w => w.status === 'paid').reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0)
        };
        
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
                statistics: stats,
                filters: {
                    status,
                    method,
                    startDate,
                    endDate
                }
            }
        });
    } catch (error) {
        console.error('Get withdrawals error:', error);
        res.status(500).json(helpers.errorResponse('Failed to get withdrawals', error));
    }
});

// Get pending withdrawals
router.get('/withdrawals/pending', async (req, res) => {
    try {
        const db = req.app.get('db');
        const withdrawals = await db.getPendingWithdrawals();
        
        const withdrawalDetails = await Promise.all(
            withdrawals.map(async (withdrawal) => {
                const user = await db.getUser(withdrawal.userId);
                
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
                    userPhone: withdrawal.userPhone || '',
                    requestedAt: withdrawal.requestedAt,
                    hoursPending: Math.floor((Date.now() - new Date(withdrawal.requestedAt).getTime()) / (1000 * 60 * 60))
                };
            })
        );
        
        res.json({
            success: true,
            data: {
                withdrawals: withdrawalDetails,
                count: withdrawalDetails.length,
                totalAmount: withdrawalDetails.reduce((sum, w) => sum + w.amount, 0),
                totalNetAmount: withdrawalDetails.reduce((sum, w) => sum + w.netAmount, 0)
            }
        });
    } catch (error) {
        console.error('Get pending withdrawals error:', error);
        res.status(500).json(helpers.errorResponse('Failed to get pending withdrawals', error));
    }
});

// Get single withdrawal
router.get('/withdrawals/:id', async (req, res) => {
    try {
        const withdrawalId = req.params.id;
        const db = req.app.get('db');
        
        const withdrawal = await db.getWithdrawal(withdrawalId);
        
        if (!withdrawal) {
            return res.status(404).json({
                success: false,
                error: 'Withdrawal not found'
            });
        }
        
        const user = await db.getUser(withdrawal.userId);
        const admin = withdrawal.processedBy ? await db.getUser(withdrawal.processedBy) : null;
        const wallet = new WalletSystem(db);
        const userWithdrawals = await wallet.getWithdrawalHistory(withdrawal.userId, 10);
        
        res.json({
            success: true,
            data: {
                withdrawal: {
                    id: withdrawal.id,
                    amount: parseInt(withdrawal.amount) || 0,
                    charges: parseInt(withdrawal.charges) || 0,
                    netAmount: parseInt(withdrawal.netAmount) || 0,
                    method: withdrawal.method,
                    status: withdrawal.status,
                    transactionId: withdrawal.transactionId || '',
                    userPhone: withdrawal.userPhone || '',
                    adminNote: withdrawal.adminNote || '',
                    requestedAt: withdrawal.requestedAt,
                    processedAt: withdrawal.processedAt
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
                    totalWithdrawn: userWithdrawals
                        .filter(w => w.status === 'approved' || w.status === 'paid')
                        .reduce((sum, w) => sum + w.amount, 0)
                },
                admin: admin ? {
                    id: admin.userId,
                    username: admin.username
                } : null,
                history: {
                    totalWithdrawals: userWithdrawals.length,
                    successfulWithdrawals: userWithdrawals.filter(w => w.status === 'approved' || w.status === 'paid').length,
                    totalAmount: userWithdrawals.reduce((sum, w) => sum + w.amount, 0),
                    recentWithdrawals: userWithdrawals.slice(0, 5).map(wd => ({
                        id: wd.id,
                        amount: wd.amount,
                        status: wd.status,
                        requestedAt: wd.requestedAt
                    }))
                }
            }
        });
    } catch (error) {
        console.error('Get withdrawal error:', error);
        res.status(500).json(helpers.errorResponse('Failed to get withdrawal', error));
    }
});

// Approve withdrawal
router.post('/withdrawals/:id/approve', async (req, res) => {
    try {
        const withdrawalId = req.params.id;
        const { note } = req.body;
        const adminId = req.headers['x-admin-id'] || 6561117046;
        const db = req.app.get('db');
        
        const wallet = new WalletSystem(db);
        const result = await wallet.processWithdrawal(
            withdrawalId,
            adminId,
            'approve',
            note || `Approved by admin ${adminId}`
        );
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: {
                    withdrawalId: withdrawalId,
                    userId: result.userId,
                    amount: result.amount,
                    netAmount: result.netAmount,
                    method: result.method,
                    processedAt: new Date().toISOString()
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
});

// Reject withdrawal
router.post('/withdrawals/:id/reject', async (req, res) => {
    try {
        const withdrawalId = req.params.id;
        const { reason } = req.body;
        const adminId = req.headers['x-admin-id'] || 6561117046;
        const db = req.app.get('db');
        
        const wallet = new WalletSystem(db);
        const result = await wallet.processWithdrawal(
            withdrawalId,
            adminId,
            'reject',
            reason || `Rejected by admin ${adminId}`
        );
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: {
                    withdrawalId: withdrawalId,
                    userId: result.userId,
                    amount: result.amount,
                    rejectedAt: new Date().toISOString(),
                    reason: reason
                }
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
});

// Mark withdrawal as paid
router.post('/withdrawals/:id/paid', async (req, res) => {
    try {
        const withdrawalId = req.params.id;
        const { transactionId, note } = req.body;
        const adminId = req.headers['x-admin-id'] || 6561117046;
        const db = req.app.get('db');
        
        const withdrawal = await db.getWithdrawal(withdrawalId);
        if (!withdrawal) {
            return res.status(404).json({
                success: false,
                error: 'Withdrawal not found'
            });
        }
        
        if (withdrawal.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Withdrawal is already ${withdrawal.status}`
            });
        }
        
        // Update withdrawal status
        await db.updateWithdrawal(withdrawalId, {
            status: 'paid',
            processedAt: new Date().toISOString(),
            processedBy: adminId,
            transactionId: transactionId || '',
            adminNote: note || `Marked as paid by admin ${adminId}`
        });
        
        // Deduct balance from user
        const wallet = new WalletSystem(db);
        const deduction = await wallet.deductBalance(
            withdrawal.userId,
            parseInt(withdrawal.amount),
            'withdrawal_paid',
            `Withdrawal ${withdrawalId} marked as paid`
        );
        
        if (deduction.success) {
            res.json({
                success: true,
                message: 'Withdrawal marked as paid successfully',
                data: {
                    withdrawalId: withdrawalId,
                    userId: withdrawal.userId,
                    amount: withdrawal.amount,
                    netAmount: withdrawal.netAmount,
                    method: withdrawal.method,
                    transactionId: transactionId,
                    processedAt: new Date().toISOString(),
                    userBalance: deduction.newBalance
                }
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to deduct balance: ' + deduction.error
            });
        }
    } catch (error) {
        console.error('Mark withdrawal paid error:', error);
        res.status(500).json(helpers.errorResponse('Failed to mark withdrawal as paid', error));
    }
});

// Update withdrawal details
router.put('/withdrawals/:id', async (req, res) => {
    try {
        const withdrawalId = req.params.id;
        const updates = req.body;
        const db = req.app.get('db');
        
        // Check if withdrawal exists
        const withdrawal = await db.getWithdrawal(withdrawalId);
        if (!withdrawal) {
            return res.status(404).json({
                success: false,
                error: 'Withdrawal not found'
            });
        }
        
        // Allowed updates
        const allowedUpdates = ['status', 'adminNote', 'transactionId', 'userPhone'];
        const filteredUpdates = {};
        
        for (const key in updates) {
            if (allowedUpdates.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        }
        
        await db.updateWithdrawal(withdrawalId, filteredUpdates);
        
        res.json({
            success: true,
            message: 'Withdrawal updated successfully',
            updates: filteredUpdates
        });
    } catch (error) {
        console.error('Update withdrawal error:', error);
        res.status(500).json(helpers.errorResponse('Failed to update withdrawal', error));
    }
});

// Bulk process withdrawals
router.post('/withdrawals/bulk/process', async (req, res) => {
    try {
        const { withdrawalIds, action } = req.body;
        const adminId = req.headers['x-admin-id'] || 6561117046;
        const db = req.app.get('db');
        
        if (!Array.isArray(withdrawalIds) || withdrawalIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Withdrawal IDs array is required'
            });
        }
        
        if (!['approve', 'reject', 'paid'].includes(action)) {
            return res.status(400).json({
                success: false,
                error: 'Action must be approve, reject, or paid'
            });
        }
        
        const wallet = new WalletSystem(db);
        const results = {
            success: [],
            failed: []
        };
        
        for (const withdrawalId of withdrawalIds) {
            try {
                if (action === 'paid') {
                    const withdrawal = await db.getWithdrawal(withdrawalId);
                    if (withdrawal && withdrawal.status === 'pending') {
                        await db.updateWithdrawal(withdrawalId, {
                            status: 'paid',
                            processedAt: new Date().toISOString(),
                            processedBy: adminId,
                            adminNote: `Bulk processed as paid by admin ${adminId}`
                        });
                        
                        // Deduct balance
                        await wallet.deductBalance(
                            withdrawal.userId,
                            parseInt(withdrawal.amount),
                            'withdrawal_paid',
                            `Bulk processed withdrawal ${withdrawalId}`
                        );
                        
                        results.success.push({
                            id: withdrawalId,
                            message: 'Marked as paid'
                        });
                    } else {
                        results.failed.push({
                            id: withdrawalId,
                            error: 'Not pending or not found'
                        });
                    }
                } else {
                    const result = await wallet.processWithdrawal(
                        withdrawalId,
                        adminId,
                        action,
                        `Bulk processed as ${action} by admin ${adminId}`
                    );
                    
                    if (result.success) {
                        results.success.push({
                            id: withdrawalId,
                            message: result.message
                        });
                    } else {
                        results.failed.push({
                            id: withdrawalId,
                            error: result.error
                        });
                    }
                }
            } catch (error) {
                results.failed.push({
                    id: withdrawalId,
                    error: error.message
                });
            }
        }
        
        res.json({
            success: true,
            message: `Processed ${results.success.length} withdrawals`,
            data: results
        });
    } catch (error) {
        console.error('Bulk process withdrawals error:', error);
        res.status(500).json(helpers.errorResponse('Failed to bulk process withdrawals', error));
    }
});

// Get payment statistics
router.get('/statistics', async (req, res) => {
    try {
        const { period = 'month' } = req.query; // day, week, month, year
        const db = req.app.get('db');
        const wallet = new WalletSystem(db);
        
        const withdrawals = await db.getAllWithdrawals();
        const stats = await wallet.getWalletStats();
        
        // Calculate period-based statistics
        const now = new Date();
        let startDate;
        
        switch (period) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        
        const periodWithdrawals = withdrawals.filter(w => 
            new Date(w.requestedAt) >= startDate
        );
        
        const periodStats = {
            totalWithdrawals: periodWithdrawals.length,
            totalAmount: periodWithdrawals.reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0),
            totalCharges: periodWithdrawals.reduce((sum, w) => sum + (parseInt(w.charges) || 0), 0),
            totalNetAmount: periodWithdrawals.reduce((sum, w) => sum + (parseInt(w.netAmount) || 0), 0),
            pending: periodWithdrawals.filter(w => w.status === 'pending').length,
            approved: periodWithdrawals.filter(w => w.status === 'approved').length,
            rejected: periodWithdrawals.filter(w => w.status === 'rejected').length,
            paid: periodWithdrawals.filter(w => w.status === 'paid').length,
            byMethod: {
                bkash: periodWithdrawals.filter(w => w.method === 'bkash').length,
                nagad: periodWithdrawals.filter(w => w.method === 'nagad').length,
                rocket: periodWithdrawals.filter(w => w.method === 'rocket').length,
                other: periodWithdrawals.filter(w => !['bkash', 'nagad', 'rocket'].includes(w.method)).length
            }
        };
        
        res.json({
            success: true,
            data: {
                period: period,
                dateRange: {
                    start: startDate.toISOString(),
                    end: now.toISOString()
                },
                overall: stats,
                periodStats: periodStats,
                trends: {
                    dailyAverage: periodStats.totalWithdrawals / Math.max(1, Math.floor((now - startDate) / (1000 * 60 * 60 * 24))),
                    amountAverage: periodStats.totalAmount / Math.max(periodStats.totalWithdrawals, 1),
                    approvalRate: periodWithdrawals.length > 0 ? 
                        ((periodStats.approved + periodStats.paid) / periodWithdrawals.length * 100).toFixed(2) : 0
                }
            }
        });
    } catch (error) {
        console.error('Get payment statistics error:', error);
        res.status(500).json(helpers.errorResponse('Failed to get payment statistics', error));
    }
});

// Get revenue report
router.get('/revenue', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const db = req.app.get('db');
        
        const withdrawals = await db.getAllWithdrawals();
        
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
        
        // Group by date
        const revenueByDate = {};
        filteredWithdrawals.forEach(w => {
            if (w.status === 'approved' || w.status === 'paid') {
                const date = new Date(w.requestedAt).toISOString().split('T')[0];
                if (!revenueByDate[date]) {
                    revenueByDate[date] = {
                        date: date,
                        withdrawals: 0,
                        amount: 0,
                        charges: 0,
                        netAmount: 0
                    };
                }
                revenueByDate[date].withdrawals++;
                revenueByDate[date].amount += parseInt(w.amount) || 0;
                revenueByDate[date].charges += parseInt(w.charges) || 0;
                revenueByDate[date].netAmount += parseInt(w.netAmount) || 0;
            }
        });
        
        // Convert to array and sort by date
        const revenueArray = Object.values(revenueByDate).sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );
        
        // Calculate totals
        const totals = revenueArray.reduce((acc, day) => ({
            withdrawals: acc.withdrawals + day.withdrawals,
            amount: acc.amount + day.amount,
            charges: acc.charges + day.charges,
            netAmount: acc.netAmount + day.netAmount
        }), { withdrawals: 0, amount: 0, charges: 0, netAmount: 0 });
        
        res.json({
            success: true,
            data: {
                dateRange: {
                    start: startDate || new Date(Math.min(...revenueArray.map(r => new Date(r.date).getTime()))).toISOString(),
                    end: endDate || new Date(Math.max(...revenueArray.map(r => new Date(r.date).getTime()))).toISOString()
                },
                revenue: revenueArray,
                totals: totals,
                summary: {
                    avgDailyWithdrawals: totals.withdrawals / Math.max(revenueArray.length, 1),
                    avgDailyAmount: totals.amount / Math.max(revenueArray.length, 1),
                    chargePercentage: totals.amount > 0 ? (totals.charges / totals.amount * 100).toFixed(2) : 0
                }
            }
        });
    } catch (error) {
        console.error('Get revenue report error:', error);
        res.status(500).json(helpers.errorResponse('Failed to get revenue report', error));
    }
});

// Export withdrawals to CSV
router.get('/export/withdrawals', async (req, res) => {
    try {
        const { status, method, startDate, endDate } = req.query;
        const db = req.app.get('db');
        
        let withdrawals = await db.getAllWithdrawals();
        
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
                const user = await db.getUser(withdrawal.userId);
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
            'Processed By'
        ];
        
        // Create CSV rows
        const rows = withdrawalDetails.map(wd => [
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
            wd.processedBy || ''
        ]);
        
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
});

// Update payment settings
router.put('/settings', async (req, res) => {
    try {
        const settings = req.body;
        const db = req.app.get('db');
        
        // Allowed settings
        const allowedSettings = [
            'minimum_withdraw',
            'referral_bonus',
            'first_withdraw_charge',
            'withdraw_charge_percent',
            'bkash_number',
            'nagad_number',
            'rocket_number',
            'payment_methods'
        ];
        
        for (const [key, value] of Object.entries(settings)) {
            if (allowedSettings.includes(key)) {
                await db.updateSetting(key, value);
            }
        }
        
        res.json({
            success: true,
            message: 'Payment settings updated successfully'
        });
    } catch (error) {
        console.error('Update payment settings error:', error);
        res.status(500).json(helpers.errorResponse('Failed to update payment settings', error));
    }
});

module.exports = router;
