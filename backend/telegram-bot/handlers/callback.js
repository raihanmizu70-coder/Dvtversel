module.exports = function(db) {
    return async (ctx) => {
        const callbackData = ctx.callbackQuery.data;
        const userId = ctx.from.id;
        
        try {
            if (callbackData.startsWith('category_')) {
                await handleCategory(ctx, callbackData, db);
            }
            else if (callbackData.startsWith('withdraw_')) {
                await handleWithdraw(ctx, callbackData, db);
            }
            else if (callbackData === 'check_subscription') {
                await checkSubscription(ctx, db);
            }
            
            // Answer callback query
            await ctx.answerCbQuery();
        } catch (error) {
            console.error('Callback error:', error);
            await ctx.answerCbQuery('❌ Error occurred');
        }
    };
};

async function handleCategory(ctx, callbackData, db) {
    const category = callbackData.replace('category_', '');
    
    switch(category) {
        case 'micro_job':
            await showMicroJobs(ctx, db);
            break;
        case 'gst_code':
            await showGSTCodes(ctx, db);
            break;
        case 'f_code':
            await showFCodes(ctx, db);
            break;
        case 'insite':
            await showInsite(ctx, db);
            break;
        case 'hack_recover':
            await showHackRecover(ctx, db);
            break;
        case 'diamond':
            await showDiamond(ctx, db);
            break;
        case 'shop':
            await showShop(ctx, db);
            break;
        case 'getlike':
            await showGetLike(ctx, db);
            break;
        case 'niva_coin':
            await showNivaCoin(ctx, db);
            break;
        case 'tiktok':
            await showTikTok(ctx, db);
            break;
    }
}

async function showMicroJobs(ctx, db) {
    const tasks = await db.getActiveTasks();
    
    if (tasks.length === 0) {
        ctx.reply('📭 এখন কোন কাজ নেই। পরে চেক করুন।');
        return;
    }
    
    for (const task of tasks.slice(0, 5)) {
        const keyboard = {
            inline_keyboard: [[
                { text: 'কাজ শুরু করুন', url: task.link },
                { text: 'প্রুফ জমা দিন', callback_data: `submit_proof_${task.id}` }
            ]]
        };
        
        ctx.reply(
            `🧩 **${task.title}**\n\n` +
            `${task.description}\n\n` +
            `💰 পুরস্কার: ৳${task.reward}\n` +
            `⏰ শেষ: ${new Date(task.expiresAt).toLocaleDateString()}`,
            { reply_markup: keyboard }
        );
    }
}

async function showGSTCodes(ctx, db) {
    const codes = await db.getGSTCodes();
    
    if (codes.length === 0) {
        ctx.reply('📭 এখন কোন জিএসটি কোড নেই।');
        return;
    }
    
    const message = codes.map(code => 
        `🔹 ${code.name}\n` +
        `কোড: ${code.code}\n` +
        `দাম: ৳${code.price}\n` +
        `${code.description}\n`
    ).join('\n');
    
    ctx.reply(
        '💌 **জিএসটি কোড বিক্রয়**\n\n' +
        'দয়া করে জিএসটি খুলবেন এই কোড দিয়ে:\n\n' +
        message +
        '\n📞 কোড কিনতে এডমিনের সাথে যোগাযোগ করুন।'
    );
}
