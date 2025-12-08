module.exports = {
    check: async (ctx) => {
        try {
            const userId = ctx.from.id;
            const channels = [
                process.env.CHANNEL_1,
                process.env.CHANNEL_2
            ];
            
            let notJoined = [];
            
            for (const channel of channels) {
                try {
                    const member = await ctx.telegram.getChatMember(channel, userId);
                    if (member.status === 'left' || member.status === 'kicked') {
                        notJoined.push(channel);
                    }
                } catch (error) {
                    console.error(`Error checking channel ${channel}:`, error);
                }
            }
            
            if (notJoined.length > 0) {
                await showSubscriptionAlert(ctx, notJoined);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Subscription check error:', error);
            return true; // Error হলে যেন ইউজার এডভান্স করতে পারে
        }
    }
};

async function showSubscriptionAlert(ctx, channels) {
    const buttons = channels.map(channel => ({
        text: `জয়েন করুন ${channel}`,
        url: `https://t.me/${channel.replace('@', '')}`
    }));
    
    const keyboard = {
        inline_keyboard: [
            ...buttons.map(btn => [btn]),
            [{ text: '✅ আমি জয়েন করেছি', callback_data: 'check_subscription' }]
        ]
    };
    
    await ctx.reply(
        '⚠️ **অনুগ্রহ করে আমাদের চ্যানেলগুলোতে জয়েন করুন**\n\n' +
        'আমাদের বট ব্যবহার করতে নিচের চ্যানেলগুলোতে জয়েন করা বাধ্যতামূলক:\n\n' +
        channels.map(c => `• ${c}`).join('\n') + '\n\n' +
        'চ্যানেলগুলোতে জয়েন করার পর "আমি জয়েন করেছি" বাটনে ক্লিক করুন।',
        { reply_markup: keyboard }
    );
}
