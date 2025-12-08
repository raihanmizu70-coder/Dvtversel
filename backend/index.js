require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

async function initializeApp() {
    try {
        console.log('🚀 Starting Digital Vision Bot...');
        
        // Check required environment variables
        if (!process.env.BOT_TOKEN) {
            throw new Error('BOT_TOKEN is missing in .env file');
        }
        
        if (!process.env.ADMIN_IDS) {
            throw new Error('ADMIN_IDS is missing in .env file');
        }
        
        // Initialize Telegram Bot
        const bot = new Telegraf(process.env.BOT_TOKEN);
        
        // Basic bot commands
        bot.start((ctx) => {
            ctx.reply('🎉 Welcome to Digital Vision Bot!\n\nUse /help to see available commands.');
        });
        
        bot.help((ctx) => {
            ctx.reply('Available commands:\n/start - Start bot\n/balance - Check balance\n/tasks - View available tasks\n/admin - Admin panel (if admin)');
        });
        
        // Admin command
        bot.command('admin', (ctx) => {
            const adminIds = process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim()));
            
            if (adminIds.includes(ctx.from.id)) {
                ctx.reply('🔧 Admin Panel Access\n\nAvailable admin commands:\n/users - View all users\n/stats - Bot statistics\n/broadcast - Send message to all users');
            } else {
                ctx.reply('❌ You are not authorized to access admin panel.');
            }
        });
        
        // Set webhook for production
        if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
            await bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}/bot${process.env.BOT_TOKEN}`);
            app.use(bot.webhookCallback(`/bot${process.env.BOT_TOKEN}`));
            console.log('✅ Webhook set for production');
        } else {
            bot.launch();
            console.log('✅ Bot started in polling mode');
        }
        
        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({ 
                status: 'OK', 
                bot: 'Digital Vision Bot',
                timestamp: new Date(),
                admin: process.env.ADMIN_IDS
            });
        });
        
        // Admin panel route
        app.get('/admin', (req, res) => {
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Digital Vision Admin</title>
                    <style>
                        body { font-family: Arial; padding: 20px; }
                        .container { max-width: 800px; margin: 0 auto; }
                        .status { background: #4CAF50; color: white; padding: 10px; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🤖 Digital Vision Bot Admin</h1>
                        <div class="status">
                            Status: Running ✅<br>
                            Admin ID: ${process.env.ADMIN_IDS}<br>
                            Bot: ${process.env.BOT_USERNAME}
                        </div>
                        <p>Full admin panel coming soon...</p>
                    </div>
                </body>
                </html>
            `);
        });
        
        // Start server
        app.listen(port, () => {
            console.log(`✅ Server running on port ${port}`);
            console.log(`👑 Admin IDs: ${process.env.ADMIN_IDS}`);
            console.log(`🤖 Bot: ${process.env.BOT_USERNAME}`);
            console.log(`📊 Health check: http://localhost:${port}/health`);
            console.log(`🔧 Admin panel: http://localhost:${port}/admin`);
        });
        
        // Graceful shutdown
        process.once('SIGINT', () => bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot.stop('SIGTERM'));
        
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        process.exit(1);
    }
}

initializeApp();
