const { Markup } = require('telegraf');

class WalletSystem {
    constructor(db) {
        this.db = db;
        this.walletConfig = {
            minimumWithdraw: 100,
            referralBonus: 5,
            firstWithdrawFixedCharge: 10,
            withdrawChargePercent: 10,
            minTaskReward: 3,
            maxTaskReward: 10
        };
    }

    // ইউজারের ব্যালেন্স চেক
    async getBalance(userId) {
        try {
            const user = await this.db.getUser(userId);
            if (!user) {
                return {
                    mainWallet: 0,
                    cashWallet: 0,
                    totalBalance: 0,
                    totalEarned: 0,
                    refEarned: 0
                };
            }

            return {
                mainWallet: parseInt(user.mainWallet) || 0,
                cashWallet: parseInt(user.cashWallet) || 0,
                totalBalance: (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0),
                totalEarned: parseInt(user.totalEarned) || 0,
                refEarned: parseInt(user.refEarned) || 0
            };
        } catch (error) {
            console.error('Get balance error:', error);
            throw error;
        }
    }

    // টাকা যোগ করুন
    async addBalance(userId, amount, type = 'task', description = '') {
        try {
            const user = await this.db.getUser(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const currentBalance = parseInt(user.mainWallet) || 0;
            const newBalance = currentBalance + amount;
            const totalEarned = parseInt(user.totalEarned) || 0;

            await this.db.updateUser(userId, {
                mainWallet: newBalance,
                totalEarned: totalEarned + amount
            });

            // ট্রানজেকশন লগ করুন
            await this.db.addTransaction({
                userId: userId,
                type: type,
                amount: amount,
                description: description || `Balance added for ${type}`,
                balanceAfter: newBalance
            });

            // টাইপ অনুযায়ী আপডেট
            if (type === 'referral') {
                const refEarned = parseInt(user.refEarned) || 0;
                await this.db.updateUser(userId, {
                    refEarned: refEarned + amount
                });
            }

            return {
                success: true,
                newBalance: newBalance,
                added: amount
            };
        } catch (error) {
            console.error('Add balance error:', error);
            throw error;
        }
    }

    // টাকা বাদ দিন
    async deductBalance(userId, amount, type = 'withdraw', description = '') {
        try {
            const user = await this.db.getUser(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const currentBalance = parseInt(user.cashWallet) || 0;
            
            if (currentBalance < amount) {
                return {
                    success: false,
                    error: 'Insufficient balance'
                };
            }

            const newBalance = currentBalance - amount;

            await this.db.updateUser(userId, {
                cashWallet: newBalance
            });

            // ট্রানজেকশন লগ করুন
            await this.db.addTransaction({
                userId: userId,
                type: type,
                amount: -amount,
                description: description || `Balance deducted for ${type}`,
                balanceAfter: newBalance
            });

            return {
                success: true,
                newBalance: newBalance,
                deducted: amount
            };
        } catch (error) {
            console.error('Deduct balance error:', error);
            throw error;
        }
    }

    // মেইন ওয়ালেট থেকে ক্যাশ ওয়ালেটে ট্রান্সফার
    async transferToCash(userId, amount) {
        try {
            const user = await this.db.getUser(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const mainBalance = parseInt(user.mainWallet) || 0;
            const cashBalance = parseInt(user.cashWallet) || 0;

            if (mainBalance < amount) {
                return {
                    success: false,
                    error: 'মেইন ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই'
                };
            }

            if (amount < 1) {
                return {
                    success: false,
                    error: 'ট্রান্সফারের জন্য কমপক্ষে ১ টাকা প্রয়োজন'
                };
            }

            const newMainBalance = mainBalance - amount;
            const newCashBalance = cashBalance + amount;

            await this.db.updateUser(userId, {
                mainWallet: newMainBalance,
                cashWallet: newCashBalance
            });

            // ট্রানজেকশন লগ করুন
            await this.db.addTransaction({
                userId: userId,
                type: 'transfer',
                amount: amount,
                description: `Main wallet to cash wallet transfer`,
                balanceAfter: newCashBalance
            });

            return {
                success: true,
                mainWallet: newMainBalance,
                cashWallet: newCashBalance,
                transferred: amount
            };
        } catch (error) {
            console.error('Transfer to cash error:', error);
            throw error;
        }
    }

    // ক্যাশ ওয়ালেট থেকে মেইন ওয়ালেটে ট্রান্সফার
    async transferToMain(userId, amount) {
        try {
            const user = await this.db.getUser(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const mainBalance = parseInt(user.mainWallet) || 0;
            const cashBalance = parseInt(user.cashWallet) || 0;

            if (cashBalance < amount) {
                return {
                    success: false,
                    error: 'ক্যাশ ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই'
                };
            }

            const newMainBalance = mainBalance + amount;
            const newCashBalance = cashBalance - amount;

            await this.db.updateUser(userId, {
                mainWallet: newMainBalance,
                cashWallet: newCashBalance
            });

            // ট্রানজেকশন লগ করুন
            await this.db.addTransaction({
                userId: userId,
                type: 'transfer',
                amount: amount,
                description: `Cash wallet to main wallet transfer`,
                balanceAfter: newMainBalance
            });

            return {
                success: true,
                mainWallet: newMainBalance,
                cashWallet: newCashBalance,
                transferred: amount
            };
        } catch (error) {
            console.error('Transfer to main error:', error);
            throw error;
        }
    }

    // উত্তোলনের চার্জ ক্যালকুলেট
    calculateWithdrawCharges(amount, isFirstWithdraw = false) {
        const percentCharge = Math.floor(amount / 100) * this.walletConfig.withdrawChargePercent;
        
        let totalCharge = percentCharge;
        if (isFirstWithdraw) {
            totalCharge += this.walletConfig.firstWithdrawFixedCharge;
        }

        const netAmount = amount - totalCharge;
        
        return {
            amount: amount,
            percentCharge: percentCharge,
            fixedCharge: isFirstWithdraw ? this.walletConfig.firstWithdrawFixedCharge : 0,
            totalCharge: totalCharge,
            netAmount: netAmount,
            isFirstWithdraw: isFirstWithdraw
        };
    }

    // উত্তোলন রিকোয়েস্ট তৈরি
    async createWithdrawalRequest(userId, amount, method = 'bkash') {
        try {
            // ইউজার চেক
            const user = await this.db.getUser(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // মিনিমাম উত্তোলন চেক
            if (amount < this.walletConfig.minimumWithdraw) {
                return {
                    success: false,
                    error: `সর্বনিম্ন উত্তোলন ${this.walletConfig.minimumWithdraw} টাকা`
                };
            }

            // ব্যালেন্স চেক
            const cashBalance = parseInt(user.cashWallet) || 0;
            if (cashBalance < amount) {
                return {
                    success: false,
                    error: 'পর্যাপ্ত ব্যালেন্স নেই'
                };
            }

            // প্রথম উত্তোলন কিনা চেক
            const previousWithdrawals = await this.db.getWithdrawalsByUser(userId);
            const isFirstWithdraw = previousWithdrawals.length === 0;

            // চার্জ ক্যালকুলেট
            const charges = this.calculateWithdrawCharges(amount, isFirstWithdraw);

            // নেট আমাউন্ট
            const netAmount = charges.netAmount;

            // উত্তোলন রিকোয়েস্ট তৈরি
            const withdrawalData = {
                userId: userId,
                amount: amount,
                charges: charges.totalCharge,
                netAmount: netAmount,
                method: method,
                status: 'pending',
                userPhone: user.phone || '',
                userDetails: JSON.stringify(user)
            };

            const withdrawal = await this.db.addWithdrawal(withdrawalData);

            return {
                success: true,
                withdrawalId: withdrawal.id,
                amount: amount,
                charges: charges.totalCharge,
                netAmount: netAmount,
                method: method,
                isFirstWithdraw: isFirstWithdraw,
                message: `উত্তোলন রিকোয়েস্ট তৈরি হয়েছে। ২৪ ঘণ্টার মধ্যে প্রসেস করা হবে।`
            };
        } catch (error) {
            console.error('Create withdrawal error:', error);
            throw error;
        }
    }

    // উত্তোলন প্রসেস
    async processWithdrawal(withdrawalId, adminId, action = 'approve', note = '') {
        try {
            const withdrawal = await this.db.getWithdrawal(withdrawalId);
            if (!withdrawal) {
                throw new Error('Withdrawal not found');
            }

            if (withdrawal.status !== 'pending') {
                return {
                    success: false,
                    error: 'এই উত্তোলন ইতিমধ্যে প্রসেস করা হয়েছে'
                };
            }

            if (action === 'approve') {
                // ব্যালেন্স কেটে নিন
                const result = await this.deductBalance(
                    withdrawal.userId, 
                    parseInt(withdrawal.amount),
                    'withdraw_approved',
                    `Withdrawal approved: ${withdrawalId}`
                );

                if (!result.success) {
                    return result;
                }

                // উত্তোলন আপডেট
                await this.db.updateWithdrawal(withdrawalId, {
                    status: 'approved',
                    processedAt: new Date().toISOString(),
                    processedBy: adminId,
                    adminNote: note || 'Approved by admin'
                });

                // ট্রানজেকশন লগ
                await this.db.addTransaction({
                    userId: withdrawal.userId,
                    type: 'withdrawal',
                    amount: -parseInt(withdrawal.amount),
                    description: `Withdrawal approved: ${withdrawalId}. Net amount: ${withdrawal.netAmount} via ${withdrawal.method}`,
                    balanceAfter: result.newBalance
                });

                return {
                    success: true,
                    message: 'উত্তোলন অনুমোদিত হয়েছে',
                    userId: withdrawal.userId,
                    amount: withdrawal.amount,
                    netAmount: withdrawal.netAmount,
                    method: withdrawal.method
                };

            } else if (action === 'reject') {
                // শুধু স্ট্যাটাস আপডেট
                await this.db.updateWithdrawal(withdrawalId, {
                    status: 'rejected',
                    processedAt: new Date().toISOString(),
                    processedBy: adminId,
                    adminNote: note || 'Rejected by admin'
                });

                return {
                    success: true,
                    message: 'উত্তোলন বাতিল করা হয়েছে',
                    userId: withdrawal.userId,
                    amount: withdrawal.amount
                };
            }

            return {
                success: false,
                error: 'Invalid action'
            };
        } catch (error) {
            console.error('Process withdrawal error:', error);
            throw error;
        }
    }

    // রেফারেল বোনাস দিন
    async addReferralBonus(referrerId, referredId) {
        try {
            // চেক করুন রেফারেল বোনাস দেওয়া হয়েছে কিনা
            const referrals = await this.db.getReferrals(referrerId);
            const alreadyGiven = referrals.find(ref => ref.referredId == referredId && ref.bonusPaid === 'true');
            
            if (alreadyGiven) {
                return {
                    success: false,
                    error: 'রেফারেল বোনাস ইতিমধ্যে দেওয়া হয়েছে'
                };
            }

            // রেফার্ড ইউজার উত্তোলন করেছে কিনা চেক করুন
            const referredWithdrawals = await this.db.getWithdrawalsByUser(referredId);
            if (referredWithdrawals.length === 0) {
                return {
                    success: false,
                    error: 'রেফার্ড ইউজার এখনও উত্তোলন করেনি'
                };
            }

            // বোনাস যোগ করুন
            const bonusResult = await this.addBalance(
                referrerId,
                this.walletConfig.referralBonus,
                'referral',
                `Referral bonus for user ${referredId}`
            );

            if (bonusResult.success) {
                // রেফারেল আপডেট করুন
                await this.db.updateReferralBonus(referredId, true);
                
                return {
                    success: true,
                    bonus: this.walletConfig.referralBonus,
                    referrerId: referrerId,
                    referredId: referredId
                };
            }

            return bonusResult;
        } catch (error) {
            console.error('Add referral bonus error:', error);
            throw error;
        }
    }

    // টাস্ক পুরস্কার দিন
    async addTaskReward(userId, taskId, rewardAmount = null) {
        try {
            const task = await this.db.getTask(taskId);
            if (!task) {
                throw new Error('Task not found');
            }

            const amount = rewardAmount || parseInt(task.reward) || this.walletConfig.minTaskReward;

            const result = await this.addBalance(
                userId,
                amount,
                'task',
                `Task completed: ${task.title}`
            );

            if (result.success) {
                // টাস্ক স্ট্যাটাস আপডেট
                await this.db.updateTask(taskId, {
                    completedBy: userId,
                    completedAt: new Date().toISOString()
                });

                return {
                    success: true,
                    reward: amount,
                    taskTitle: task.title,
                    newBalance: result.newBalance
                };
            }

            return result;
        } catch (error) {
            console.error('Add task reward error:', error);
            throw error;
        }
    }

    // ট্রানজেকশন হিস্ট্রি
    async getTransactionHistory(userId, limit = 10) {
        try {
            const transactions = await this.db.getTransactionsByUser(userId, limit);
            
            return transactions.map(tx => ({
                id: tx.id,
                type: tx.type,
                amount: parseInt(tx.amount),
                description: tx.description,
                timestamp: tx.timestamp,
                balanceAfter: parseInt(tx.balanceAfter) || 0
            }));
        } catch (error) {
            console.error('Get transaction history error:', error);
            throw error;
        }
    }

    // উত্তোলন হিস্ট্রি
    async getWithdrawalHistory(userId, limit = 10) {
        try {
            const withdrawals = await this.db.getWithdrawalsByUser(userId, limit);
            
            return withdrawals.map(wd => ({
                id: wd.id,
                amount: parseInt(wd.amount),
                charges: parseInt(wd.charges) || 0,
                netAmount: parseInt(wd.netAmount) || 0,
                method: wd.method,
                status: wd.status,
                requestedAt: wd.requestedAt,
                processedAt: wd.processedAt
            }));
        } catch (error) {
            console.error('Get withdrawal history error:', error);
            throw error;
        }
    }

    // ওয়ালেট কনফিগ আপডেট
    updateConfig(newConfig) {
        this.walletConfig = { ...this.walletConfig, ...newConfig };
        return this.walletConfig;
    }

    // ওয়ালেট স্ট্যাটাস
    async getWalletStats() {
        try {
            const users = await this.db.getAllUsers();
            
            let totalMainBalance = 0;
            let totalCashBalance = 0;
            let totalEarned = 0;
            let totalWithdrawn = 0;

            for (const user of users) {
                totalMainBalance += parseInt(user.mainWallet) || 0;
                totalCashBalance += parseInt(user.cashWallet) || 0;
                totalEarned += parseInt(user.totalEarned) || 0;
            }

            const withdrawals = await this.db.getAllWithdrawals();
            for (const wd of withdrawals) {
                if (wd.status === 'approved') {
                    totalWithdrawn += parseInt(wd.amount) || 0;
                }
            }

            return {
                totalUsers: users.length,
                totalMainBalance,
                totalCashBalance,
                totalBalance: totalMainBalance + totalCashBalance,
                totalEarned,
                totalWithdrawn,
                activeBalance: totalMainBalance + totalCashBalance - totalWithdrawn
            };
        } catch (error) {
            console.error('Get wallet stats error:', error);
            throw error;
        }
    }

    // ব্যালেন্স সারাংশ
    getBalanceSummary(balance) {
        return {
            mainWallet: balance.mainWallet,
            cashWallet: balance.cashWallet,
            totalBalance: balance.totalBalance,
            canWithdraw: balance.cashWallet >= this.walletConfig.minimumWithdraw,
            withdrawableAmount: balance.cashWallet,
            needsTransfer: balance.mainWallet > 0 && balance.cashWallet < this.walletConfig.minimumWithdraw
        };
    }

    // কাস্টম ট্রানজেকশন
    async createCustomTransaction(userId, amount, type, description) {
        try {
            if (amount > 0) {
                return await this.addBalance(userId, amount, type, description);
            } else if (amount < 0) {
                return await this.deductBalance(userId, Math.abs(amount), type, description);
            } else {
                return {
                    success: false,
                    error: 'Invalid amount'
                };
            }
        } catch (error) {
            console.error('Create custom transaction error:', error);
            throw error;
        }
    }
}

module.exports = WalletSystem;
