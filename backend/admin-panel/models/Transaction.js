class Transaction {
    constructor(db) {
        this.db = db;
        this.sheetName = 'Transactions';
    }

    // Get all transactions
    async getAllTransactions() {
        try {
            const sheet = this.db.sheets[this.sheetName];
            if (!sheet) {
                console.error(`Sheet ${this.sheetName} not found`);
                return [];
            }
            
            const rows = await sheet.getRows();
            return rows.map(row => ({
                id: row.id || '',
                userId: row.userId || '',
                type: row.type || '',
                amount: row.amount || '0',
                description: row.description || '',
                timestamp: row.timestamp || new Date().toISOString(),
                balanceAfter: row.balanceAfter || '0',
                referenceId: row.referenceId || '',
                status: row.status || 'completed',
                adminId: row.adminId || '',
                notes: row.notes || '',
                transactionFee: row.transactionFee || '0',
                paymentMethod: row.paymentMethod || '',
                ipAddress: row.ipAddress || '',
                deviceInfo: row.deviceInfo || ''
            }));
        } catch (error) {
            console.error('Error getting all transactions:', error);
            return [];
        }
    }

    // Get transaction by ID
    async getTransaction(transactionId) {
        try {
            const transactions = await this.getAllTransactions();
            return transactions.find(transaction => transaction.id === transactionId);
        } catch (error) {
            console.error(`Error getting transaction ${transactionId}:`, error);
            return null;
        }
    }

    // Add new transaction
    async addTransaction(transactionData) {
        try {
            const sheet = this.db.sheets[this.sheetName];
            if (!sheet) {
                throw new Error(`Sheet ${this.sheetName} not found`);
            }

            const transaction = {
                id: transactionData.id || Date.now().toString(),
                userId: transactionData.userId || '',
                type: transactionData.type || '',
                amount: transactionData.amount || '0',
                description: transactionData.description || '',
                timestamp: transactionData.timestamp || new Date().toISOString(),
                balanceAfter: transactionData.balanceAfter || '0',
                referenceId: transactionData.referenceId || '',
                status: transactionData.status || 'completed',
                adminId: transactionData.adminId || '',
                notes: transactionData.notes || '',
                transactionFee: transactionData.transactionFee || '0',
                paymentMethod: transactionData.paymentMethod || '',
                ipAddress: transactionData.ipAddress || '',
                deviceInfo: transactionData.deviceInfo || ''
            };

            await sheet.addRow(transaction);
            return transaction;
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    }

    // Get transactions by user ID
    async getTransactionsByUser(userId, limit = null) {
        try {
            const transactions = await this.getAllTransactions();
            const userTransactions = transactions
                .filter(transaction => transaction.userId === userId.toString())
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            if (limit) {
                return userTransactions.slice(0, limit);
            }
            return userTransactions;
        } catch (error) {
            console.error(`Error getting transactions for user ${userId}:`, error);
            return [];
        }
    }

    // Get transactions by type
    async getTransactionsByType(type, limit = null) {
        try {
            const transactions = await this.getAllTransactions();
            const typeTransactions = transactions
                .filter(transaction => transaction.type === type)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            if (limit) {
                return typeTransactions.slice(0, limit);
            }
            return typeTransactions;
        } catch (error) {
            console.error(`Error getting transactions of type ${type}:`, error);
            return [];
        }
    }

    // Get transactions by date range
    async getTransactionsByDateRange(startDate, endDate = null) {
        try {
            const transactions = await this.getAllTransactions();
            const start = new Date(startDate);
            const end = endDate ? new Date(endDate) : new Date();
            
            if (endDate) {
                end.setHours(23, 59, 59, 999);
            }
            
            return transactions.filter(transaction => {
                const transDate = new Date(transaction.timestamp);
                return transDate >= start && transDate <= end;
            });
        } catch (error) {
            console.error(`Error getting transactions from ${startDate} to ${endDate}:`, error);
            return [];
        }
    }

    // Get recent transactions
    async getRecentTransactions(limit = 10) {
        try {
            const transactions = await this.getAllTransactions();
            return transactions
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit);
        } catch (error) {
            console.error('Error getting recent transactions:', error);
            return [];
        }
    }

    // Get transaction statistics
    async getTransactionStatistics(userId = null) {
        try {
            let transactions = await this.getAllTransactions();
            
            if (userId) {
                transactions = transactions.filter(t => t.userId === userId.toString());
            }
            
            const stats = {
                total: transactions.length,
                totalAmount: transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0),
                positiveAmount: transactions
                    .filter(t => parseFloat(t.amount) > 0)
                    .reduce((sum, t) => sum + parseFloat(t.amount), 0),
                negativeAmount: Math.abs(transactions
                    .filter(t => parseFloat(t.amount) < 0)
                    .reduce((sum, t) => sum + parseFloat(t.amount), 0)),
                byType: {},
                dailyAverage: 0,
                largestTransaction: null,
                smallestTransaction: null
            };
            
            // Group by type
            transactions.forEach(t => {
                if (!stats.byType[t.type]) {
                    stats.byType[t.type] = {
                        count: 0,
                        total: 0
                    };
                }
                stats.byType[t.type].count++;
                stats.byType[t.type].total += parseFloat(t.amount);
            });
            
            // Calculate daily average
            if (transactions.length > 0) {
                const firstDate = new Date(transactions[transactions.length - 1].timestamp);
                const lastDate = new Date(transactions[0].timestamp);
                const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
                stats.dailyAverage = daysDiff > 0 ? transactions.length / daysDiff : transactions.length;
            }
            
            // Find largest and smallest transactions
            if (transactions.length > 0) {
                stats.largestTransaction = transactions.reduce((max, t) => 
                    parseFloat(t.amount) > parseFloat(max.amount) ? t : max
                );
                stats.smallestTransaction = transactions.reduce((min, t) => 
                    parseFloat(t.amount) < parseFloat(min.amount) ? t : min
                );
            }
            
            return stats;
        } catch (error) {
            console.error('Error getting transaction statistics:', error);
            throw error;
        }
    }

    // Get daily transaction summary
    async getDailyTransactionSummary(date = null) {
        try {
            const targetDate = date ? new Date(date) : new Date();
            const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
            const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
            
            const transactions = await this.getTransactionsByDateRange(startOfDay, endOfDay);
            
            const summary = {
                date: startOfDay.toISOString().split('T')[0],
                totalTransactions: transactions.length,
                totalAmount: transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0),
                deposits: transactions.filter(t => parseFloat(t.amount) > 0).length,
                depositsAmount: transactions
                    .filter(t => parseFloat(t.amount) > 0)
                    .reduce((sum, t) => sum + parseFloat(t.amount), 0),
                withdrawals: transactions.filter(t => parseFloat(t.amount) < 0).length,
                withdrawalsAmount: Math.abs(transactions
                    .filter(t => parseFloat(t.amount) < 0)
                    .reduce((sum, t) => sum + parseFloat(t.amount), 0)),
                uniqueUsers: new Set(transactions.map(t => t.userId)).size,
                byHour: {}
            };
            
            // Group by hour
            for (let hour = 0; hour < 24; hour++) {
                summary.byHour[hour] = {
                    hour: hour,
                    transactions: 0,
                    amount: 0
                };
            }
            
            transactions.forEach(t => {
                const hour = new Date(t.timestamp).getHours();
                if (summary.byHour[hour]) {
                    summary.byHour[hour].transactions++;
                    summary.byHour[hour].amount += parseFloat(t.amount);
                }
            });
            
            summary.byHour = Object.values(summary.byHour);
            
            return summary;
        } catch (error) {
            console.error('Error getting daily transaction summary:', error);
            throw error;
        }
    }

    // Search transactions
    async searchTransactions(query) {
        try {
            const transactions = await this.getAllTransactions();
            const queryLower = query.toLowerCase();
            
            return transactions.filter(transaction => 
                transaction.id.includes(query) ||
                transaction.userId.includes(query) ||
                transaction.description.toLowerCase().includes(queryLower) ||
                transaction.type.toLowerCase().includes(queryLower) ||
                transaction.referenceId.includes(query)
            );
        } catch (error) {
            console.error(`Error searching transactions with query ${query}:`, error);
            return [];
        }
    }

    // Get transactions by reference ID
    async getTransactionsByReference(referenceId) {
        try {
            const transactions = await this.getAllTransactions();
            return transactions.filter(transaction => transaction.referenceId === referenceId);
        } catch (error) {
            console.error(`Error getting transactions for reference ${referenceId}:`, error);
            return [];
        }
    }

    // Get transactions by admin ID
    async getTransactionsByAdmin(adminId) {
        try {
            const transactions = await this.getAllTransactions();
            return transactions.filter(transaction => transaction.adminId === adminId);
        } catch (error) {
            console.error(`Error getting transactions for admin ${adminId}:`, error);
            return [];
        }
    }

    // Update transaction
    async updateTransaction(transactionId, updates) {
        try {
            const sheet = this.db.sheets[this.sheetName];
            if (!sheet) {
                throw new Error(`Sheet ${this.sheetName} not found`);
            }

            const rows = await sheet.getRows();
            const transactionRow = rows.find(row => row.id === transactionId);

            if (!transactionRow) {
                throw new Error(`Transaction ${transactionId} not found`);
            }

            // Update fields
            Object.keys(updates).forEach(key => {
                if (transactionRow[key] !== undefined) {
                    transactionRow[key] = updates[key];
                }
            });

            await transactionRow.save();
            return transactionRow;
        } catch (error) {
            console.error(`Error updating transaction ${transactionId}:`, error);
            throw error;
        }
    }

    // Delete transaction
    async deleteTransaction(transactionId) {
        try {
            const sheet = this.db.sheets[this.sheetName];
            if (!sheet) {
                throw new Error(`Sheet ${this.sheetName} not found`);
            }

            const rows = await sheet.getRows();
            const transactionRow = rows.find(row => row.id === transactionId);

            if (!transactionRow) {
                throw new Error(`Transaction ${transactionId} not found`);
            }

            await transactionRow.delete();
            return true;
        } catch (error) {
            console.error(`Error deleting transaction ${transactionId}:`, error);
            throw error;
        }
    }

    // Get transaction count by user and type
    async getTransactionCountByUserAndType(userId, type) {
        try {
            const transactions = await this.getAllTransactions();
            return transactions.filter(t => 
                t.userId === userId.toString() && t.type === type
            ).length;
        } catch (error) {
            console.error(`Error getting transaction count for user ${userId} and type ${type}:`, error);
            return 0;
        }
    }

    // Get total amount by user and type
    async getTotalAmountByUserAndType(userId, type) {
        try {
            const transactions = await this.getAllTransactions();
            return transactions
                .filter(t => t.userId === userId.toString() && t.type === type)
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        } catch (error) {
            console.error(`Error getting total amount for user ${userId} and type ${type}:`, error);
            return 0;
        }
    }

    // Get monthly transaction report
    async getMonthlyTransactionReport(year = null, month = null) {
        try {
            const now = new Date();
            const targetYear = year || now.getFullYear();
            const targetMonth = month !== null ? month : now.getMonth();
            
            const startDate = new Date(targetYear, targetMonth, 1);
            const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
            
            const transactions = await this.getTransactionsByDateRange(startDate, endDate);
            
            const report = {
                year: targetYear,
                month: targetMonth + 1,
                monthName: startDate.toLocaleString('default', { month: 'long' }),
                totalTransactions: transactions.length,
                totalAmount: transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0),
                deposits: transactions.filter(t => parseFloat(t.amount) > 0).length,
                depositsAmount: transactions
                    .filter(t => parseFloat(t.amount) > 0)
                    .reduce((sum, t) => sum + parseFloat(t.amount), 0),
                withdrawals: transactions.filter(t => parseFloat(t.amount) < 0).length,
                withdrawalsAmount: Math.abs(transactions
                    .filter(t => parseFloat(t.amount) < 0)
                    .reduce((sum, t) => sum + parseFloat(t.amount), 0)),
                uniqueUsers: new Set(transactions.map(t => t.userId)).size,
                dailyBreakdown: {}
            };
            
            // Initialize daily breakdown
            const daysInMonth = endDate.getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${targetYear}-${(targetMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                report.dailyBreakdown[dateStr] = {
                    date: dateStr,
                    transactions: 0,
                    amount: 0,
                    deposits: 0,
                    depositsAmount: 0,
                    withdrawals: 0,
                    withdrawalsAmount: 0
                };
            }
            
            // Populate daily breakdown
            transactions.forEach(t => {
                const dateStr = new Date(t.timestamp).toISOString().split('T')[0];
                if (report.dailyBreakdown[dateStr]) {
                    report.dailyBreakdown[dateStr].transactions++;
                    report.dailyBreakdown[dateStr].amount += parseFloat(t.amount);
                    
                    if (parseFloat(t.amount) > 0) {
                        report.dailyBreakdown[dateStr].deposits++;
                        report.dailyBreakdown[dateStr].depositsAmount += parseFloat(t.amount);
                    } else {
                        report.dailyBreakdown[dateStr].withdrawals++;
                        report.dailyBreakdown[dateStr].withdrawalsAmount += Math.abs(parseFloat(t.amount));
                    }
                }
            });
            
            report.dailyBreakdown = Object.values(report.dailyBreakdown);
            
            return report;
        } catch (error) {
            console.error(`Error getting monthly report for ${year}-${month}:`, error);
            throw error;
        }
    }

    // Export transactions to CSV
    async exportTransactions(filter = {}) {
        try {
            let transactions = await this.getAllTransactions();
            
            // Apply filters
            if (filter.userId) {
                transactions = transactions.filter(t => t.userId === filter.userId.toString());
            }
            if (filter.type) {
                transactions = transactions.filter(t => t.type === filter.type);
            }
            if (filter.startDate) {
                const start = new Date(filter.startDate);
                transactions = transactions.filter(t => new Date(t.timestamp) >= start);
            }
            if (filter.endDate) {
                const end = new Date(filter.endDate);
                end.setHours(23, 59, 59, 999);
                transactions = transactions.filter(t => new Date(t.timestamp) <= end);
            }
            if (filter.status) {
                transactions = transactions.filter(t => t.status === filter.status);
            }
            
            // Sort by timestamp (newest first)
            transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return transactions;
        } catch (error) {
            console.error('Error exporting transactions:', error);
            throw error;
        }
    }

    // Get transaction types
    async getTransactionTypes() {
        try {
            const transactions = await this.getAllTransactions();
            const types = new Set();
            
            transactions.forEach(t => {
                types.add(t.type);
            });
            
            return Array.from(types);
        } catch (error) {
            console.error('Error getting transaction types:', error);
            return [];
        }
    }

    // Get transaction status counts
    async getTransactionStatusCounts() {
        try {
            const transactions = await this.getAllTransactions();
            const statusCounts = {};
            
            transactions.forEach(t => {
                if (!statusCounts[t.status]) {
                    statusCounts[t.status] = 0;
                }
                statusCounts[t.status]++;
            });
            
            return statusCounts;
        } catch (error) {
            console.error('Error getting transaction status counts:', error);
            return {};
        }
    }

    // Bulk add transactions
    async bulkAddTransactions(transactionsData) {
        try {
            const results = {
                success: [],
                failed: []
            };

            for (const data of transactionsData) {
                try {
                    const transaction = await this.addTransaction(data);
                    results.success.push(transaction);
                } catch (error) {
                    results.failed.push({
                        data: data,
                        error: error.message
                    });
                }
            }

            return results;
        } catch (error) {
            console.error('Error in bulk add transactions:', error);
            throw error;
        }
    }
}

module.exports = Transaction;
