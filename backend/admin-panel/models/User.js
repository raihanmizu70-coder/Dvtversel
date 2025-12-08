class User {
    constructor(db) {
        this.db = db;
        this.sheetName = 'Users';
    }

    // Get all users
    async getAllUsers() {
        try {
            const sheet = this.db.sheets[this.sheetName];
            if (!sheet) {
                console.error(`Sheet ${this.sheetName} not found`);
                return [];
            }
            
            const rows = await sheet.getRows();
            return rows.map(row => ({
                userId: row.userId || '',
                username: row.username || '',
                first_name: row.first_name || '',
                last_name: row.last_name || '',
                language_code: row.language_code || 'en',
                mainWallet: row.mainWallet || '0',
                cashWallet: row.cashWallet || '0',
                totalEarned: row.totalEarned || '0',
                refEarned: row.refEarned || '0',
                refCode: row.refCode || '',
                refCount: row.refCount || '0',
                status: row.status || 'active',
                isPremium: row.isPremium || 'false',
                joinedAt: row.joinedAt || new Date().toISOString(),
                lastActive: row.lastActive || row.joinedAt || new Date().toISOString(),
                completedTasks: row.completedTasks || '0',
                hasWithdrawn: row.hasWithdrawn || 'false',
                banReason: row.banReason || '',
                bannedBy: row.bannedBy || '',
                bannedAt: row.bannedAt || '',
                phone: row.phone || '',
                email: row.email || '',
                totalReferrals: row.totalReferrals || '0',
                activeReferrals: row.activeReferrals || '0'
            }));
        } catch (error) {
            console.error('Error getting all users:', error);
            return [];
        }
    }

    // Get user by ID
    async getUser(userId) {
        try {
            const users = await this.getAllUsers();
            return users.find(user => user.userId === userId.toString());
        } catch (error) {
            console.error(`Error getting user ${userId}:`, error);
            return null;
        }
    }

    // Get user by username
    async getUserByUsername(username) {
        try {
            const users = await this.getAllUsers();
            return users.find(user => user.username === username);
        } catch (error) {
            console.error(`Error getting user by username ${username}:`, error);
            return null;
        }
    }

    // Get user by referral code
    async getUserByRefCode(refCode) {
        try {
            const users = await this.getAllUsers();
            return users.find(user => user.refCode === refCode);
        } catch (error) {
            console.error(`Error getting user by refCode ${refCode}:`, error);
            return null;
        }
    }

    // Add new user
    async addUser(userData) {
        try {
            const sheet = this.db.sheets[this.sheetName];
            if (!sheet) {
                throw new Error(`Sheet ${this.sheetName} not found`);
            }

            // Check if user already exists
            const existingUser = await this.getUser(userData.userId);
            if (existingUser) {
                return existingUser;
            }

            const user = {
                userId: userData.userId || '',
                username: userData.username || '',
                first_name: userData.first_name || '',
                last_name: userData.last_name || '',
                language_code: userData.language_code || 'en',
                mainWallet: userData.mainWallet || '0',
                cashWallet: userData.cashWallet || '0',
                totalEarned: userData.totalEarned || '0',
                refEarned: userData.refEarned || '0',
                refCode: userData.refCode || '',
                refCount: userData.refCount || '0',
                status: userData.status || 'active',
                isPremium: userData.isPremium || 'false',
                joinedAt: userData.joinedAt || new Date().toISOString(),
                lastActive: userData.lastActive || new Date().toISOString(),
                completedTasks: userData.completedTasks || '0',
                hasWithdrawn: userData.hasWithdrawn || 'false',
                banReason: userData.banReason || '',
                bannedBy: userData.bannedBy || '',
                bannedAt: userData.bannedAt || '',
                phone: userData.phone || '',
                email: userData.email || '',
                totalReferrals: userData.totalReferrals || '0',
                activeReferrals: userData.activeReferrals || '0'
            };

            await sheet.addRow(user);
            return user;
        } catch (error) {
            console.error('Error adding user:', error);
            throw error;
        }
    }

    // Update user
    async updateUser(userId, updates) {
        try {
            const sheet = this.db.sheets[this.sheetName];
            if (!sheet) {
                throw new Error(`Sheet ${this.sheetName} not found`);
            }

            const rows = await sheet.getRows();
            const userRow = rows.find(row => row.userId === userId.toString());

            if (!userRow) {
                throw new Error(`User ${userId} not found`);
            }

            // Update fields
            Object.keys(updates).forEach(key => {
                if (userRow[key] !== undefined) {
                    userRow[key] = updates[key];
                }
            });

            // Update last active if not explicitly set
            if (!updates.lastActive && (updates.mainWallet || updates.cashWallet || updates.totalEarned)) {
                userRow.lastActive = new Date().toISOString();
            }

            await userRow.save();
            return userRow;
        } catch (error) {
            console.error(`Error updating user ${userId}:`, error);
            throw error;
        }
    }

    // Delete user
    async deleteUser(userId) {
        try {
            const sheet = this.db.sheets[this.sheetName];
            if (!sheet) {
                throw new Error(`Sheet ${this.sheetName} not found`);
            }

            const rows = await sheet.getRows();
            const userRow = rows.find(row => row.userId === userId.toString());

            if (!userRow) {
                throw new Error(`User ${userId} not found`);
            }

            await userRow.delete();
            return true;
        } catch (error) {
            console.error(`Error deleting user ${userId}:`, error);
            throw error;
        }
    }

    // Get active users
    async getActiveUsers() {
        try {
            const users = await this.getAllUsers();
            return users.filter(user => user.status === 'active');
        } catch (error) {
            console.error('Error getting active users:', error);
            return [];
        }
    }

    // Get banned users
    async getBannedUsers() {
        try {
            const users = await this.getAllUsers();
            return users.filter(user => user.status === 'banned');
        } catch (error) {
            console.error('Error getting banned users:', error);
            return [];
        }
    }

    // Get premium users
    async getPremiumUsers() {
        try {
            const users = await this.getAllUsers();
            return users.filter(user => user.isPremium === 'true');
        } catch (error) {
            console.error('Error getting premium users:', error);
            return [];
        }
    }

    // Get users by balance range
    async getUsersByBalance(minBalance = 0, maxBalance = null) {
        try {
            const users = await this.getAllUsers();
            return users.filter(user => {
                const totalBalance = (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0);
                if (maxBalance !== null) {
                    return totalBalance >= minBalance && totalBalance <= maxBalance;
                }
                return totalBalance >= minBalance;
            });
        } catch (error) {
            console.error('Error getting users by balance:', error);
            return [];
        }
    }

    // Get top earners
    async getTopEarners(limit = 10) {
        try {
            const users = await this.getAllUsers();
            return users
                .sort((a, b) => (parseInt(b.totalEarned) || 0) - (parseInt(a.totalEarned) || 0))
                .slice(0, limit);
        } catch (error) {
            console.error('Error getting top earners:', error);
            return [];
        }
    }

    // Get top referrers
    async getTopReferrers(limit = 10) {
        try {
            const users = await this.getAllUsers();
            return users
                .sort((a, b) => (parseInt(b.refCount) || 0) - (parseInt(a.refCount) || 0))
                .slice(0, limit);
        } catch (error) {
            console.error('Error getting top referrers:', error);
            return [];
        }
    }

    // Search users
    async searchUsers(query) {
        try {
            const users = await this.getAllUsers();
            const queryLower = query.toLowerCase();
            
            return users.filter(user => 
                user.username.toLowerCase().includes(queryLower) ||
                user.userId.toString().includes(query) ||
                user.refCode.toLowerCase().includes(queryLower) ||
                user.first_name.toLowerCase().includes(queryLower) ||
                user.phone?.includes(query) ||
                user.email?.toLowerCase().includes(queryLower)
            );
        } catch (error) {
            console.error(`Error searching users with query ${query}:`, error);
            return [];
        }
    }

    // Get recent users
    async getRecentUsers(limit = 10) {
        try {
            const users = await this.getAllUsers();
            return users
                .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
                .slice(0, limit);
        } catch (error) {
            console.error('Error getting recent users:', error);
            return [];
        }
    }

    // Get user statistics
    async getUserStatistics(userId) {
        try {
            const user = await this.getUser(userId);
            if (!user) {
                throw new Error(`User ${userId} not found`);
            }

            const referrals = await this.db.getReferrals(userId);
            const proofs = await this.db.getProofsByUser(userId);
            const withdrawals = await this.db.getWithdrawalsByUser(userId);
            
            return {
                userId: userId,
                username: user.username,
                totalBalance: (parseInt(user.mainWallet) || 0) + (parseInt(user.cashWallet) || 0),
                totalEarned: parseInt(user.totalEarned) || 0,
                totalReferrals: referrals.length,
                activeReferrals: referrals.filter(r => r.bonusPaid === 'true').length,
                totalTasksCompleted: proofs.filter(p => p.status === 'approved').length,
                totalWithdrawals: withdrawals.length,
                totalWithdrawn: withdrawals
                    .filter(w => w.status === 'approved' || w.status === 'paid')
                    .reduce((sum, w) => sum + (parseInt(w.amount) || 0), 0),
                joinDate: user.joinedAt,
                daysActive: Math.ceil((Date.now() - new Date(user.joinedAt).getTime()) / (1000 * 60 * 60 * 24)),
                avgDailyEarnings: (parseInt(user.totalEarned) || 0) / Math.max(1, Math.ceil((Date.now() - new Date(user.joinedAt).getTime()) / (1000 * 60 * 60 * 24)))
            };
        } catch (error) {
            console.error(`Error getting statistics for user ${userId}:`, error);
            throw error;
        }
    }

    // Increment user referral count
    async incrementReferralCount(userId) {
        try {
            const sheet = this.db.sheets[this.sheetName];
            if (!sheet) {
                throw new Error(`Sheet ${this.sheetName} not found`);
            }

            const rows = await sheet.getRows();
            const userRow = rows.find(row => row.userId === userId.toString());

            if (!userRow) {
                throw new Error(`User ${userId} not found`);
            }

            const currentCount = parseInt(userRow.refCount) || 0;
            userRow.refCount = (currentCount + 1).toString();
            
            await userRow.save();
            return userRow.refCount;
        } catch (error) {
            console.error(`Error incrementing referral count for user ${userId}:`, error);
            throw error;
        }
    }

    // Increment user completed tasks
    async incrementCompletedTasks(userId) {
        try {
            const sheet = this.db.sheets[this.sheetName];
            if (!sheet) {
                throw new Error(`Sheet ${this.sheetName} not found`);
            }

            const rows = await sheet.getRows();
            const userRow = rows.find(row => row.userId === userId.toString());

            if (!userRow) {
                throw new Error(`User ${userId} not found`);
            }

            const currentTasks = parseInt(userRow.completedTasks) || 0;
            userRow.completedTasks = (currentTasks + 1).toString();
            
            await userRow.save();
            return userRow.completedTasks;
        } catch (error) {
            console.error(`Error incrementing completed tasks for user ${userId}:`, error);
            throw error;
        }
    }

    // Update user balance
    async updateUserBalance(userId, mainWallet = null, cashWallet = null, totalEarned = null, refEarned = null) {
        try {
            const updates = {};
            
            if (mainWallet !== null) updates.mainWallet = mainWallet.toString();
            if (cashWallet !== null) updates.cashWallet = cashWallet.toString();
            if (totalEarned !== null) updates.totalEarned = totalEarned.toString();
            if (refEarned !== null) updates.refEarned = refEarned.toString();
            
            if (Object.keys(updates).length > 0) {
                updates.lastActive = new Date().toISOString();
                await this.updateUser(userId, updates);
            }
            
            return await this.getUser(userId);
        } catch (error) {
            console.error(`Error updating balance for user ${userId}:`, error);
            throw error;
        }
    }

    // Get users who haven't withdrawn yet
    async getUsersWithoutWithdrawal() {
        try {
            const users = await this.getAllUsers();
            return users.filter(user => user.hasWithdrawn !== 'true');
        } catch (error) {
            console.error('Error getting users without withdrawal:', error);
            return [];
        }
    }

    // Mark user as withdrawn
    async markUserWithdrawn(userId) {
        try {
            await this.updateUser(userId, {
                hasWithdrawn: 'true',
                lastActive: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error(`Error marking user ${userId} as withdrawn:`, error);
            throw error;
        }
    }

    // Get user growth statistics
    async getUserGrowthStats(days = 30) {
        try {
            const users = await this.getAllUsers();
            const now = new Date();
            const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            
            const dailyGrowth = {};
            
            // Initialize days
            for (let i = 0; i < days; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                dailyGrowth[dateStr] = {
                    date: dateStr,
                    newUsers: 0,
                    activeUsers: 0,
                    totalUsers: 0
                };
            }
            
            // Calculate growth
            users.forEach(user => {
                const joinDate = new Date(user.joinedAt).toISOString().split('T')[0];
                if (dailyGrowth[joinDate]) {
                    dailyGrowth[joinDate].newUsers++;
                }
                
                // Count active users for each day
                Object.keys(dailyGrowth).forEach(dateStr => {
                    const date = new Date(dateStr);
                    if (new Date(user.joinedAt) <= date) {
                        dailyGrowth[dateStr].totalUsers++;
                        if (user.status === 'active') {
                            dailyGrowth[dateStr].activeUsers++;
                        }
                    }
                });
            });
            
            return Object.values(dailyGrowth);
        } catch (error) {
            console.error(`Error getting user growth stats for ${days} days:`, error);
            return [];
        }
    }

    // Bulk update users
    async bulkUpdateUsers(userIds, updates) {
        try {
            const results = {
                success: [],
                failed: []
            };

            for (const userId of userIds) {
                try {
                    await this.updateUser(userId, updates);
                    results.success.push(userId);
                } catch (error) {
                    results.failed.push({
                        userId: userId,
                        error: error.message
                    });
                }
            }

            return results;
        } catch (error) {
            console.error('Error in bulk update users:', error);
            throw error;
        }
    }
}

module.exports = User;
