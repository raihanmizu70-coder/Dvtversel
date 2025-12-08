module.exports = function(bot, db) {
    const startHandler = require('./handlers/start');
    const commandsHandler = require('./handlers/commands');
    const callbackHandler = require('./handlers/callback');
    
    // Start command
    bot.start(startHandler(db));
    
    // Commands
    bot.command('help', commandsHandler.help);
    bot.command('balance', commandsHandler.balance);
    bot.command('profile', commandsHandler.profile);
    bot.command('withdraw', commandsHandler.withdraw);
    
    // Callback queries
    bot.on('callback_query', callbackHandler(db));
    
    // Text messages
    bot.on('text', async (ctx) => {
        const text = ctx.message.text;
        
        // Handle referral code
        if (text.startsWith('/start ')) {
            const refCode = text.split(' ')[1];
            await handleReferral(ctx, refCode, db);
        }
    });
    
    // Handle errors
    bot.catch((err, ctx) => {
        console.error(`Error for ${ctx.updateType}:`, err);
        ctx.reply('❌ Something went wrong. Please try again.');
    });
    
    console.log('✅ Telegram bot initialized');
};

async function handleReferral(ctx, refCode, db) {
    try {
        const userId = ctx.from.id;
        const referrer = await db.findUserByRefCode(refCode);
        
        if (referrer && referrer.userId !== userId) {
            // Save referral
            await db.addReferral(referrer.userId, userId);
            ctx.reply(`🎉 You were referred by ${referrer.username}!`);
        }
    } catch (error) {
        console.error('Referral error:', error);
    }
}
