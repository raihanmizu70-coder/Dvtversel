const helpers = require('../../telegram-bot/utils/helpers');

class TaskController {
    constructor(db) {
        this.db = db;
    }

    // Get all tasks
    async getAllTasks(req, res) {
        try {
            const { 
                page = 1, 
                limit = 20, 
                status = '',
                search = '',
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;

            let tasks = await this.db.getAllTasks();

            // Apply filters
            if (status) {
                tasks = tasks.filter(task => task.status === status);
            }

            if (search) {
                const searchLower = search.toLowerCase();
                tasks = tasks.filter(task => 
                    task.title?.toLowerCase().includes(searchLower) ||
                    task.description?.toLowerCase().includes(searchLower) ||
                    task.id?.toString().includes(search)
                );
            }

            // Apply sorting
            tasks.sort((a, b) => {
                let aValue = a[sortBy] || '';
                let bValue = b[sortBy] || '';

                if (sortBy === 'reward') {
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
            const paginated = helpers.paginate(tasks, parseInt(page), parseInt(limit));

            // Get detailed information for each task
            const detailedTasks = await Promise.all(
                paginated.data.map(async (task) => {
                    const proofs = await this.db.getProofsByTask(task.id);
                    
                    return {
                        id: task.id,
                        title: task.title,
                        description: task.description,
                        link: task.link,
                        reward: parseInt(task.reward) || 0,
                        status: task.status,
                        createdAt: task.createdAt,
                        expiresAt: task.expiresAt,
                        adminId: task.adminId,
                        statistics: {
                            totalSubmissions: proofs.length,
                            approved: proofs.filter(p => p.status === 'approved').length,
                            rejected: proofs.filter(p => p.status === 'rejected').length,
                            pending: proofs.filter(p => p.status === 'pending').length,
                            successRate: proofs.length > 0 ? 
                                (proofs.filter(p => p.status === 'approved').length / proofs.length * 100).toFixed(2) : 0
                        }
                    };
                })
            );

            res.json(helpers.successResponse({
                tasks: detailedTasks,
                pagination: {
                    page: paginated.page,
                    limit: paginated.limit,
                    total: paginated.total,
                    totalPages: paginated.totalPages,
                    hasNext: paginated.hasNext,
                    hasPrev: paginated.hasPrev
                },
                summary: {
                    total: tasks.length,
                    active: tasks.filter(t => t.status === 'active').length,
                    inactive: tasks.filter(t => t.status === 'inactive').length,
                    completed: tasks.filter(t => t.status === 'completed').length,
                    totalRewards: tasks.reduce((sum, t) => sum + (parseInt(t.reward) || 0), 0)
                }
            }));
        } catch (error) {
            console.error('Get all tasks error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get tasks', error));
        }
    }

    // Get task by ID
    async getTaskById(req, res) {
        try {
            const taskId = req.params.id;
            const task = await this.db.getTask(taskId);

            if (!task) {
                return res.status(404).json(
                    helpers.errorResponse('Task not found')
                );
            }

            // Get proofs for this task
            const proofs = await this.db.getProofsByTask(taskId);

            // Get detailed proof information
            const detailedProofs = await Promise.all(
                proofs.map(async (proof) => {
                    const user = await this.db.getUser(proof.userId);
                    const admin = proof.verifiedBy ? await this.db.getUser(proof.verifiedBy) : null;

                    return {
                        id: proof.id,
                        user: {
                            id: user?.userId,
                            username: user?.username || 'N/A'
                        },
                        screenshot: proof.screenshot,
                        status: proof.status,
                        reward: proof.reward,
                        submittedAt: proof.submittedAt,
                        verifiedAt: proof.verifiedAt,
                        adminNote: proof.adminNote,
                        verifiedBy: admin ? {
                            id: admin.userId,
                            username: admin.username
                        } : null
                    };
                })
            );

            // Get task statistics
            const taskStats = {
                totalSubmissions: proofs.length,
                approved: proofs.filter(p => p.status === 'approved').length,
                rejected: proofs.filter(p => p.status === 'rejected').length,
                pending: proofs.filter(p => p.status === 'pending').length,
                totalRewards: proofs
                    .filter(p => p.status === 'approved')
                    .reduce((sum, p) => sum + (parseInt(p.reward) || 0), 0),
                successRate: proofs.length > 0 ? 
                    (proofs.filter(p => p.status === 'approved').length / proofs.length * 100).toFixed(2) : 0,
                dailyAverage: proofs.length > 0 ? 
                    (proofs.length / Math.max(1, Math.floor((Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24)))).toFixed(2) : 0
            };

            res.json(helpers.successResponse({
                task: {
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    link: task.link,
                    reward: parseInt(task.reward) || 0,
                    status: task.status,
                    createdAt: task.createdAt,
                    expiresAt: task.expiresAt,
                    adminId: task.adminId,
                    daysRemaining: Math.max(0, Math.floor((new Date(task.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                },
                statistics: taskStats,
                proofs: detailedProofs.slice(0, 20), // Show only first 20 proofs
                recentActivity: detailedProofs
                    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                    .slice(0, 10)
                    .map(proof => ({
                        id: proof.id,
                        user: proof.user.username,
                        status: proof.status,
                        submittedAt: proof.submittedAt,
                        reward: proof.reward
                    }))
            }));
        } catch (error) {
            console.error('Get task by ID error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get task', error));
        }
    }

    // Create new task
    async createTask(req, res) {
        try {
            const { title, description, link, reward, expiresInDays = 7 } = req.body;
            const adminId = req.adminId || 6561117046;

            // Validation
            if (!title || !link || !reward) {
                return res.status(400).json(
                    helpers.errorResponse('Title, link and reward are required')
                );
            }

            if (parseInt(reward) < 1) {
                return res.status(400).json(
                    helpers.errorResponse('Reward must be at least 1')
                );
            }

            // Calculate expiration date
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));

            const taskData = {
                title: title.trim(),
                description: description?.trim() || 'Complete the task and submit proof for verification',
                link: link.trim(),
                reward: parseInt(reward),
                status: 'active',
                adminId: adminId,
                expiresAt: expiresAt.toISOString()
            };

            const task = await this.db.addTask(taskData);

            res.json(helpers.successResponse({
                task: {
                    id: task.id,
                    title: task.title,
                    reward: task.reward,
                    expiresAt: task.expiresAt,
                    link: task.link
                }
            }, 'Task created successfully'));
        } catch (error) {
            console.error('Create task error:', error);
            res.status(500).json(helpers.errorResponse('Failed to create task', error));
        }
    }

    // Update task
    async updateTask(req, res) {
        try {
            const taskId = req.params.id;
            const updates = req.body;

            // Check if task exists
            const task = await this.db.getTask(taskId);
            if (!task) {
                return res.status(404).json(
                    helpers.errorResponse('Task not found')
                );
            }

            // Allowed updates
            const allowedUpdates = ['title', 'description', 'link', 'reward', 'status', 'expiresAt'];
            const filteredUpdates = {};

            for (const key in updates) {
                if (allowedUpdates.includes(key)) {
                    filteredUpdates[key] = updates[key];
                }
            }

            // Additional validation
            if (filteredUpdates.reward && parseInt(filteredUpdates.reward) < 1) {
                return res.status(400).json(
                    helpers.errorResponse('Reward must be at least 1')
                );
            }

            await this.db.updateTask(taskId, filteredUpdates);

            res.json(helpers.successResponse(
                filteredUpdates,
                'Task updated successfully'
            ));
        } catch (error) {
            console.error('Update task error:', error);
            res.status(500).json(helpers.errorResponse('Failed to update task', error));
        }
    }

    // Delete task
    async deleteTask(req, res) {
        try {
            const taskId = req.params.id;

            // Check if task exists
            const task = await this.db.getTask(taskId);
            if (!task) {
                return res.status(404).json(
                    helpers.errorResponse('Task not found')
                );
            }

            // Check for pending proofs
            const proofs = await this.db.getProofsByTask(taskId);
            const pendingProofs = proofs.filter(p => p.status === 'pending');

            if (pendingProofs.length > 0) {
                return res.status(400).json(
                    helpers.errorResponse(`Cannot delete task with ${pendingProofs.length} pending proofs`)
                );
            }

            await this.db.deleteTask(taskId);

            res.json(helpers.successResponse(
                null,
                'Task deleted successfully'
            ));
        } catch (error) {
            console.error('Delete task error:', error);
            res.status(500).json(helpers.errorResponse('Failed to delete task', error));
        }
    }

    // Activate task
    async activateTask(req, res) {
        try {
            const taskId = req.params.id;

            // Check if task exists
            const task = await this.db.getTask(taskId);
            if (!task) {
                return res.status(404).json(
                    helpers.errorResponse('Task not found')
                );
            }

            if (task.status === 'active') {
                return res.status(400).json(
                    helpers.errorResponse('Task is already active')
                );
            }

            await this.db.updateTask(taskId, {
                status: 'active',
                activatedAt: new Date().toISOString()
            });

            res.json(helpers.successResponse(
                null,
                'Task activated successfully'
            ));
        } catch (error) {
            console.error('Activate task error:', error);
            res.status(500).json(helpers.errorResponse('Failed to activate task', error));
        }
    }

    // Deactivate task
    async deactivateTask(req, res) {
        try {
            const taskId = req.params.id;

            // Check if task exists
            const task = await this.db.getTask(taskId);
            if (!task) {
                return res.status(404).json(
                    helpers.errorResponse('Task not found')
                );
            }

            if (task.status === 'inactive') {
                return res.status(400).json(
                    helpers.errorResponse('Task is already inactive')
                );
            }

            await this.db.updateTask(taskId, {
                status: 'inactive',
                deactivatedAt: new Date().toISOString()
            });

            res.json(helpers.successResponse(
                null,
                'Task deactivated successfully'
            ));
        } catch (error) {
            console.error('Deactivate task error:', error);
            res.status(500).json(helpers.errorResponse('Failed to deactivate task', error));
        }
    }

    // Get task statistics
    async getTaskStatistics(req, res) {
        try {
            const taskId = req.params.id;
            const { period = 'all' } = req.query; // all, day, week, month

            const task = await this.db.getTask(taskId);
            if (!task) {
                return res.status(404).json(
                    helpers.errorResponse('Task not found')
                );
            }

            const proofs = await this.db.getProofsByTask(taskId);

            // Filter by period if needed
            let filteredProofs = proofs;
            if (period !== 'all') {
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
                }

                filteredProofs = proofs.filter(p => new Date(p.submittedAt) >= startDate);
            }

            // Calculate statistics
            const stats = {
                totalSubmissions: filteredProofs.length,
                approved: filteredProofs.filter(p => p.status === 'approved').length,
                rejected: filteredProofs.filter(p => p.status === 'rejected').length,
                pending: filteredProofs.filter(p => p.status === 'pending').length,
                totalRewards: filteredProofs
                    .filter(p => p.status === 'approved')
                    .reduce((sum, p) => sum + (parseInt(p.reward) || 0), 0),
                successRate: filteredProofs.length > 0 ? 
                    (filteredProofs.filter(p => p.status === 'approved').length / filteredProofs.length * 100).toFixed(2) : 0,
                averageReward: filteredProofs.filter(p => p.status === 'approved').length > 0 ? 
                    (filteredProofs.filter(p => p.status === 'approved').reduce((sum, p) => sum + (parseInt(p.reward) || 0), 0) / 
                    filteredProofs.filter(p => p.status === 'approved').length).toFixed(2) : 0
            };

            // Daily breakdown for the last 7 days
            const dailyBreakdown = {};
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                last7Days.push(dateStr);
                dailyBreakdown[dateStr] = {
                    submissions: 0,
                    approved: 0,
                    rejected: 0,
                    rewards: 0
                };
            }

            filteredProofs.forEach(proof => {
                const dateStr = new Date(proof.submittedAt).toISOString().split('T')[0];
                if (dailyBreakdown[dateStr]) {
                    dailyBreakdown[dateStr].submissions++;
                    if (proof.status === 'approved') {
                        dailyBreakdown[dateStr].approved++;
                        dailyBreakdown[dateStr].rewards += parseInt(proof.reward) || 0;
                    } else if (proof.status === 'rejected') {
                        dailyBreakdown[dateStr].rejected++;
                    }
                }
            });

            res.json(helpers.successResponse({
                task: {
                    id: task.id,
                    title: task.title,
                    reward: task.reward
                },
                period: period,
                statistics: stats,
                dailyBreakdown: last7Days.map(date => ({
                    date: date,
                    ...dailyBreakdown[date]
                })),
                userDistribution: await this.getUserDistribution(taskId, filteredProofs)
            }));
        } catch (error) {
            console.error('Get task statistics error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get task statistics', error));
        }
    }

    // Get user distribution for a task
    async getUserDistribution(taskId, proofs) {
        const userStats = {};
        
        for (const proof of proofs) {
            if (!userStats[proof.userId]) {
                const user = await this.db.getUser(proof.userId);
                userStats[proof.userId] = {
                    userId: proof.userId,
                    username: user?.username || 'N/A',
                    submissions: 0,
                    approved: 0,
                    rejected: 0,
                    pending: 0,
                    totalRewards: 0
                };
            }
            
            userStats[proof.userId].submissions++;
            if (proof.status === 'approved') {
                userStats[proof.userId].approved++;
                userStats[proof.userId].totalRewards += parseInt(proof.reward) || 0;
            } else if (proof.status === 'rejected') {
                userStats[proof.userId].rejected++;
            } else if (proof.status === 'pending') {
                userStats[proof.userId].pending++;
            }
        }

        return Object.values(userStats)
            .sort((a, b) => b.submissions - a.submissions)
            .slice(0, 10); // Top 10 users
    }

    // Bulk task operations
    async bulkUpdateTasks(req, res) {
        try {
            const { taskIds, action, updates } = req.body;

            if (!Array.isArray(taskIds) || taskIds.length === 0) {
                return res.status(400).json(
                    helpers.errorResponse('Task IDs array is required')
                );
            }

            const results = {
                success: [],
                failed: []
            };

            for (const taskId of taskIds) {
                try {
                    if (action === 'update' && updates) {
                        await this.db.updateTask(taskId, updates);
                        results.success.push({
                            id: taskId,
                            action: 'update',
                            updates: updates
                        });
                    } else if (action === 'activate') {
                        await this.db.updateTask(taskId, {
                            status: 'active',
                            activatedAt: new Date().toISOString()
                        });
                        results.success.push({
                            id: taskId,
                            action: 'activate'
                        });
                    } else if (action === 'deactivate') {
                        await this.db.updateTask(taskId, {
                            status: 'inactive',
                            deactivatedAt: new Date().toISOString()
                        });
                        results.success.push({
                            id: taskId,
                            action: 'deactivate'
                        });
                    } else if (action === 'delete') {
                        // Check for pending proofs before deleting
                        const proofs = await this.db.getProofsByTask(taskId);
                        const pendingProofs = proofs.filter(p => p.status === 'pending');
                        
                        if (pendingProofs.length === 0) {
                            await this.db.deleteTask(taskId);
                            results.success.push({
                                id: taskId,
                                action: 'delete'
                            });
                        } else {
                            results.failed.push({
                                id: taskId,
                                action: 'delete',
                                error: `Has ${pendingProofs.length} pending proofs`
                            });
                        }
                    }
                } catch (error) {
                    results.failed.push({
                        id: taskId,
                        action: action,
                        error: error.message
                    });
                }
            }

            res.json(helpers.successResponse({
                processed: taskIds.length,
                results: results
            }, `Processed ${results.success.length} tasks successfully`));
        } catch (error) {
            console.error('Bulk update tasks error:', error);
            res.status(500).json(helpers.errorResponse('Failed to bulk update tasks', error));
        }
    }

    // Get pending proofs for tasks
    async getPendingProofs(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;
            
            const proofs = await this.db.getPendingProofs();
            
            // Get detailed information for each proof
            const detailedProofs = await Promise.all(
                proofs.map(async (proof) => {
                    const task = await this.db.getTask(proof.taskId);
                    const user = await this.db.getUser(proof.userId);
                    
                    return {
                        proofId: proof.id,
                        task: {
                            id: task?.id,
                            title: task?.title,
                            reward: task?.reward
                        },
                        user: {
                            id: user?.userId,
                            username: user?.username || 'N/A'
                        },
                        submittedAt: proof.submittedAt,
                        hoursPending: Math.floor((Date.now() - new Date(proof.submittedAt).getTime()) / (1000 * 60 * 60))
                    };
                })
            );
            
            // Sort by submission date (oldest first)
            detailedProofs.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
            
            const paginated = helpers.paginate(detailedProofs, parseInt(page), parseInt(limit));
            
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
                summary: {
                    totalPending: proofs.length,
                    oldestPending: proofs.length > 0 ? 
                        helpers.relativeTime(proofs.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))[0].submittedAt) : 'None'
                }
            }));
        } catch (error) {
            console.error('Get pending proofs error:', error);
            res.status(500).json(helpers.errorResponse('Failed to get pending proofs', error));
        }
    }

    // Export tasks to CSV
    async exportTasks(req, res) {
        try {
            const tasks = await this.db.getAllTasks();
            
            // Create CSV headers
            const headers = [
                'Task ID',
                'Title',
                'Description',
                'Link',
                'Reward',
                'Status',
                'Created At',
                'Expires At',
                'Admin ID'
            ];
            
            // Create CSV rows
            const rows = tasks.map(task => [
                task.id,
                task.title || '',
                task.description || '',
                task.link || '',
                parseInt(task.reward) || 0,
                task.status || 'active',
                task.createdAt,
                task.expiresAt,
                task.adminId || ''
            ]);
            
            // Combine headers and rows
            const csvContent = [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');
            
            // Set response headers for CSV download
            const filename = `tasks-export-${Date.now()}.csv`;
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            
            res.send(csvContent);
        } catch (error) {
            console.error('Export tasks error:', error);
            res.status(500).json(helpers.errorResponse('Failed to export tasks', error));
        }
    }
}

module.exports = TaskController;
