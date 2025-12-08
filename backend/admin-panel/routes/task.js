const express = require('express');
const router = express.Router();
const helpers = require('../../telegram-bot/utils/helpers');

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

// Get all tasks
router.get('/', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const db = req.app.get('db');
        
        let tasks = await db.getAllTasks();
        
        if (status) {
            tasks = tasks.filter(task => task.status === status);
        }
        
        // Sort by creation date (newest first)
        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const paginated = helpers.paginate(tasks, parseInt(page), parseInt(limit));
        
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
                    completedCount: task.completedCount || 0,
                    adminId: task.adminId
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
                    total: tasks.length,
                    active: tasks.filter(t => t.status === 'active').length,
                    inactive: tasks.filter(t => t.status === 'inactive').length,
                    completed: tasks.filter(t => t.status === 'completed').length
                }
            }
        });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json(helpers.errorResponse('Failed to get tasks', error));
    }
});

// Get single task
router.get('/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const db = req.app.get('db');
        
        const task = await db.getTask(taskId);
        
        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }
        
        // Get proofs for this task
        const proofs = await db.getProofsByTask(taskId);
        
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
                statistics: {
                    totalSubmissions: proofs.length,
                    approved: proofs.filter(p => p.status === 'approved').length,
                    rejected: proofs.filter(p => p.status === 'rejected').length,
                    pending: proofs.filter(p => p.status === 'pending').length,
                    successRate: proofs.length > 0 ? 
                        (proofs.filter(p => p.status === 'approved').length / proofs.length * 100).toFixed(2) : 0
                },
                recentSubmissions: proofs.slice(0, 10).map(proof => ({
                    id: proof.id,
                    userId: proof.userId,
                    status: proof.status,
                    submittedAt: proof.submittedAt,
                    verifiedAt: proof.verifiedAt
                }))
            }
        });
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json(helpers.errorResponse('Failed to get task', error));
    }
});

// Create new task
router.post('/', async (req, res) => {
    try {
        const { title, description, link, reward, expiresInDays } = req.body;
        const db = req.app.get('db');
        
        if (!title || !link || !reward) {
            return res.status(400).json({
                success: false,
                error: 'Title, link and reward are required'
            });
        }
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (parseInt(expiresInDays) || 7));
        
        const taskData = {
            title: title,
            description: description || 'Complete the task and submit screenshot for verification',
            link: link,
            reward: parseInt(reward) || 3,
            status: 'active',
            adminId: 6561117046, // আপনার আইডি
            expiresAt: expiresAt.toISOString()
        };
        
        const task = await db.addTask(taskData);
        
        res.json({
            success: true,
            message: 'Task created successfully',
            data: {
                id: task.id,
                title: task.title,
                reward: task.reward,
                expiresAt: task.expiresAt
            }
        });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json(helpers.errorResponse('Failed to create task', error));
    }
});

// Update task
router.put('/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const updates = req.body;
        const db = req.app.get('db');
        
        // Check if task exists
        const task = await db.getTask(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }
        
        // Allowed updates
        const allowedUpdates = ['title', 'description', 'link', 'reward', 'status', 'expiresAt'];
        const filteredUpdates = {};
        
        for (const key in updates) {
            if (allowedUpdates.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        }
        
        await db.updateTask(taskId, filteredUpdates);
        
        res.json({
            success: true,
            message: 'Task updated successfully',
            updates: filteredUpdates
        });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json(helpers.errorResponse('Failed to update task', error));
    }
});

// Delete task
router.delete('/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const db = req.app.get('db');
        
        // Check if task exists
        const task = await db.getTask(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }
        
        // Check for pending proofs
        const proofs = await db.getProofsByTask(taskId);
        const pendingProofs = proofs.filter(p => p.status === 'pending');
        
        if (pendingProofs.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete task with ${pendingProofs.length} pending proofs`
            });
        }
        
        await db.deleteTask(taskId);
        
        res.json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json(helpers.errorResponse('Failed to delete task', error));
    }
});

// Activate task
router.post('/:id/activate', async (req, res) => {
    try {
        const taskId = req.params.id;
        const db = req.app.get('db');
        
        await db.updateTask(taskId, {
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
});

// Deactivate task
router.post('/:id/deactivate', async (req, res) => {
    try {
        const taskId = req.params.id;
        const db = req.app.get('db');
        
        await db.updateTask(taskId, {
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
});

// Get task statistics
router.get('/:id/stats', async (req, res) => {
    try {
        const taskId = req.params.id;
        const db = req.app.get('db');
        
        const task = await db.getTask(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }
        
        const proofs = await db.getProofsByTask(taskId);
        
        const stats = {
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
        
        res.json({
            success: true,
            data: {
                task: {
                    id: task.id,
                    title: task.title,
                    reward: task.reward
                },
                statistics: stats,
                timeline: {
                    created: task.createdAt,
                    expires: task.expiresAt,
                    daysRemaining: Math.max(0, Math.floor((new Date(task.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                }
            }
        });
    } catch (error) {
        console.error('Get task stats error:', error);
        res.status(500).json(helpers.errorResponse('Failed to get task statistics', error));
    }
});

// Bulk task operations
router.post('/bulk/activate', async (req, res) => {
    try {
        const { taskIds } = req.body;
        const db = req.app.get('db');
        
        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Task IDs array is required'
            });
        }
        
        const activated = [];
        const failed = [];
        
        for (const taskId of taskIds) {
            try {
                await db.updateTask(taskId, {
                    status: 'active',
                    activatedAt: new Date().toISOString()
                });
                activated.push(taskId);
            } catch (error) {
                failed.push({ taskId, error: error.message });
            }
        }
        
        res.json({
            success: true,
            message: `Activated ${activated.length} tasks`,
            data: {
                activated,
                failed
            }
        });
    } catch (error) {
        console.error('Bulk activate error:', error);
        res.status(500).json(helpers.errorResponse('Failed to bulk activate tasks', error));
    }
});

router.post('/bulk/deactivate', async (req, res) => {
    try {
        const { taskIds } = req.body;
        const db = req.app.get('db');
        
        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Task IDs array is required'
            });
        }
        
        const deactivated = [];
        const failed = [];
        
        for (const taskId of taskIds) {
            try {
                await db.updateTask(taskId, {
                    status: 'inactive',
                    deactivatedAt: new Date().toISOString()
                });
                deactivated.push(taskId);
            } catch (error) {
                failed.push({ taskId, error: error.message });
            }
        }
        
        res.json({
            success: true,
            message: `Deactivated ${deactivated.length} tasks`,
            data: {
                deactivated,
                failed
            }
        });
    } catch (error) {
        console.error('Bulk deactivate error:', error);
        res.status(500).json(helpers.errorResponse('Failed to bulk deactivate tasks', error));
    }
});

module.exports = router;
