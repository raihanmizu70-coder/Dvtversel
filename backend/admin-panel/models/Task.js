class Task {
    constructor(db) {
        this.db = db;
        this.sheetName = 'Tasks';
    }

    // Get all tasks
    async getAllTasks() {
        try {
            const sheet = this.db.sheets[this.sheetName];
            if (!sheet) {
                console.error(`Sheet ${this.sheetName} not found`);
                return [];
            }
            
            const rows = await sheet.getRows();
            return rows.map(row => ({
                id: row.id || '',
                title: row.title || '',
                description: row.description || '',
                link: row.link || '',
                reward: row.reward || '3',
                status: row.status || 'active',
                createdAt: row.createdAt || new Date().toISOString(),
                expiresAt: row.expiresAt || '',
                adminId: row.adminId || '',
                completedBy: row.completedBy || '',
                completedAt: row.completedAt || '',
                activatedAt: row.activatedAt || '',
                deactivatedAt: row.deactivatedAt || '',
                totalCompletions: row.totalCompletions || '0'
            }));
        } catch (error) {
            console.error('Error getting all tasks:', error);
            return [];
        }
    }

    // Get active tasks
    async getActiveTasks() {
        try {
            const tasks = await this.getAllTasks();
            return tasks.filter(task => task.status === 'active');
        } catch (error) {
            console.error('Error getting active tasks:', error);
            return [];
        }
    }

    // Get task by ID
    async getTask(taskId) {
        try {
            const tasks = await this.getAllTasks();
            return tasks.find(task => task.id === taskId);
        } catch (error) {
            console.error(`Error getting task ${taskId}:`, error);
            return null;
        }
    }

    // Add new task
    async addTask(taskData) {
        try {
            const sheet = this.db.sheets[this.sheetName];
            if (!sheet) {
                throw new Error(`Sheet ${this.sheetName} not found`);
            }

            const task = {
                id: taskData.id || Date.now().toString(),
                title: taskData.title || '',
                description: taskData.description || '',
                link: taskData.link || '',
                reward: taskData.reward || '3',
                status: taskData.status || 'active',
                createdAt: taskData.createdAt || new Date().toISOString(),
                expiresAt: taskData.expiresAt || '',
                adminId: taskData.adminId || '',
                completedBy: '',
                completedAt: '',
                activatedAt: taskData.status === 'active' ? new Date().toISOString() : '',
                deactivatedAt: '',
                totalCompletions: '0'
            };

            await sheet.addRow(task);
            return task;
        } catch (error) {
            console.error('Error adding task:', error);
            throw error;
        }
    }

    // Update task
    async updateTask(taskId, updates) {
        try {
            const sheet = this.db.sheets[this.sheetName];
            if (!sheet) {
                throw new Error(`Sheet ${this.sheetName} not found`);
            }

            const rows = await sheet.getRows();
            const taskRow = rows.find(row => row.id === taskId);

            if (!taskRow) {
                throw new Error(`Task ${taskId} not found`);
            }

            // Update fields
            Object.keys(updates).forEach(key => {
                if (taskRow[key] !== undefined) {
                    taskRow[key] = updates[key];
                }
            });

            // Special handling for status changes
            if (updates.status === 'active' && taskRow.status !== 'active') {
                taskRow.activatedAt = new Date().toISOString();
                taskRow.deactivatedAt = '';
            } else if (updates.status === 'inactive' && taskRow.status !== 'inactive') {
                taskRow.deactivatedAt = new Date().toISOString();
                taskRow.activatedAt = '';
            }

            await taskRow.save();
            return taskRow;
        } catch (error) {
            console.error(`Error updating task ${taskId}:`, error);
            throw error;
        }
    }

    // Delete task
    async deleteTask(taskId) {
        try {
            const sheet = this.db.sheets[this.sheetName];
            if (!sheet) {
                throw new Error(`Sheet ${this.sheetName} not found`);
            }

            const rows = await sheet.getRows();
            const taskRow = rows.find(row => row.id === taskId);

            if (!taskRow) {
                throw new Error(`Task ${taskId} not found`);
            }

            await taskRow.delete();
            return true;
        } catch (error) {
            console.error(`Error deleting task ${taskId}:`, error);
            throw error;
        }
    }

    // Get tasks by admin ID
    async getTasksByAdmin(adminId) {
        try {
            const tasks = await this.getAllTasks();
            return tasks.filter(task => task.adminId === adminId);
        } catch (error) {
            console.error(`Error getting tasks for admin ${adminId}:`, error);
            return [];
        }
    }

    // Get expired tasks
    async getExpiredTasks() {
        try {
            const tasks = await this.getAllTasks();
            const now = new Date();
            return tasks.filter(task => {
                if (!task.expiresAt) return false;
                return new Date(task.expiresAt) < now;
            });
        } catch (error) {
            console.error('Error getting expired tasks:', error);
            return [];
        }
    }

    // Get task statistics
    async getTaskStatistics(taskId) {
        try {
            const task = await this.getTask(taskId);
            if (!task) {
                throw new Error(`Task ${taskId} not found`);
            }

            const proofs = await this.db.getProofsByTask(taskId);
            
            return {
                taskId: taskId,
                title: task.title,
                reward: task.reward,
                totalSubmissions: proofs.length,
                approved: proofs.filter(p => p.status === 'approved').length,
                rejected: proofs.filter(p => p.status === 'rejected').length,
                pending: proofs.filter(p => p.status === 'pending').length,
                totalRewards: proofs
                    .filter(p => p.status === 'approved')
                    .reduce((sum, p) => sum + (parseInt(p.reward) || 0), 0),
                successRate: proofs.length > 0 ? 
                    (proofs.filter(p => p.status === 'approved').length / proofs.length * 100).toFixed(2) : 0
            };
        } catch (error) {
            console.error(`Error getting statistics for task ${taskId}:`, error);
            throw error;
        }
    }

    // Search tasks
    async searchTasks(query) {
        try {
            const tasks = await this.getAllTasks();
            const queryLower = query.toLowerCase();
            
            return tasks.filter(task => 
                task.title.toLowerCase().includes(queryLower) ||
                task.description.toLowerCase().includes(queryLower) ||
                task.id.includes(query)
            );
        } catch (error) {
            console.error(`Error searching tasks with query ${query}:`, error);
            return [];
        }
    }

    // Get recent tasks
    async getRecentTasks(limit = 10) {
        try {
            const tasks = await this.getAllTasks();
            return tasks
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, limit);
        } catch (error) {
            console.error('Error getting recent tasks:', error);
            return [];
        }
    }

    // Update task completion count
    async incrementTaskCompletion(taskId) {
        try {
            const sheet = this.db.sheets[this.sheetName];
            if (!sheet) {
                throw new Error(`Sheet ${this.sheetName} not found`);
            }

            const rows = await sheet.getRows();
            const taskRow = rows.find(row => row.id === taskId);

            if (!taskRow) {
                throw new Error(`Task ${taskId} not found`);
            }

            const currentCompletions = parseInt(taskRow.totalCompletions) || 0;
            taskRow.totalCompletions = (currentCompletions + 1).toString();
            
            await taskRow.save();
            return taskRow.totalCompletions;
        } catch (error) {
            console.error(`Error incrementing completion for task ${taskId}:`, error);
            throw error;
        }
    }

    // Get tasks by status
    async getTasksByStatus(status) {
        try {
            const tasks = await this.getAllTasks();
            return tasks.filter(task => task.status === status);
        } catch (error) {
            console.error(`Error getting tasks with status ${status}:`, error);
            return [];
        }
    }

    // Bulk update tasks
    async bulkUpdateTasks(taskIds, updates) {
        try {
            const results = {
                success: [],
                failed: []
            };

            for (const taskId of taskIds) {
                try {
                    await this.updateTask(taskId, updates);
                    results.success.push(taskId);
                } catch (error) {
                    results.failed.push({
                        taskId: taskId,
                        error: error.message
                    });
                }
            }

            return results;
        } catch (error) {
            console.error('Error in bulk update tasks:', error);
            throw error;
        }
    }

    // Get task by link
    async getTaskByLink(link) {
        try {
            const tasks = await this.getAllTasks();
            return tasks.find(task => task.link === link);
        } catch (error) {
            console.error(`Error getting task by link ${link}:`, error);
            return null;
        }
    }

    // Get upcoming expiring tasks
    async getUpcomingExpiringTasks(hours = 24) {
        try {
            const tasks = await this.getAllTasks();
            const now = new Date();
            const future = new Date(now.getTime() + hours * 60 * 60 * 1000);
            
            return tasks.filter(task => {
                if (!task.expiresAt || task.status !== 'active') return false;
                const expireDate = new Date(task.expiresAt);
                return expireDate > now && expireDate <= future;
            });
        } catch (error) {
            console.error(`Error getting upcoming expiring tasks (${hours}h):`, error);
            return [];
        }
    }
}

module.exports = Task;
