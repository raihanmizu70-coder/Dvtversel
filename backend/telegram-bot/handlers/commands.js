module.exports = {
    help: (ctx) => {
        ctx.reply(
            '📚 **হেল্প মেনু**\n\n' +
            '• /start - বট শুরু করুন\n' +
            '• /balance - ব্যালেন্স চেক করুন\n' +
            '• /profile - প্রোফাইল দেখুন\n' +
            '• /withdraw - টাকা উত্তোলন করুন\n' +
            '• /app - মিনি অ্যাপ ওপেন করুন\n\n' +
            '📞 সাপোর্ট: @digitalvision_support'
        );
    },
    
    balance: async (ctx, db) => {
        const userId = ctx.from.id;
        const user = await db.getUser(userId);
        
        if (user) {
            ctx.reply(
                `💰 **আপনার ব্যালেন্স**\n\n` +
                `মেইন ওয়ালেট: ৳${user.mainWallet}\n` +
                `ক্যাশ ওয়ালেট: ৳${user.cashWallet}\n` +
                `মোট আয়: ৳${user.totalEarned || 0}\n\n` +
                `উত্তোলনের জন্য কমপক্ষে ৳100 প্রয়োজন।`
            );
        }
    },
    
    profile: async (ctx, db) => {
        const userId = ctx.from.id;
        const user = await db.getUser(userId);
        
        if (user) {
            const referrals = await db.getReferrals(userId);
            
            ctx.reply(
                `👤 **আপনার প্রোফাইল**\n\n` +
                `নাম: ${user.username}\n` +
                `আইডি: ${user.userId}\n` +
                `যোগদান: ${new Date(user.joinedAt).toLocaleDateString()}\n` +
                `রেফার সংখ্যা: ${referrals.length}\n` +
                `রেফার আয়: ৳${user.refEarned || 0}\n` +
                `মোট আয়: ৳${user.totalEarned || 0}\n\n` +
                `🎯 আপনার রেফার লিংক:\n` +
                `https://t.me/${process.env.BOT_USERNAME}?start=${user.refCode}`
            );
        }
    },
    
    withdraw: async (ctx, db) => {
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '৳100 উত্তোলন', callback_data: 'withdraw_100' },
                    { text: '৳300 উত্তোলন', callback_data: 'withdraw_300' }
                ],
                [
                    { text: '৳500 উত্তোলন', callback_data: 'withdraw_500' },
                    { text: '৳1000 উত্তোলন', callback_data: 'withdraw_1000' }
                ],
                [
                    { text: 'ইতিহাস দেখুন', callback_data: 'withdraw_history' }
                ]
            ]
        };
        
        ctx.reply(
            '💰 **টাকা উত্তোলন**\n\n' +
            'উত্তোলনের পরিমাণ নির্বাচন করুন:\n\n' +
            '📌 নিয়ম:\n' +
            '• প্রথম উত্তোলনে ১০% + ১০ টাকা চার্জ\n' +
            '• পরবর্তীতে শুধু ১০% চার্জ\n' +
            '• সর্বনিম্ন ৳100 উত্তোলন করা যাবে',
            { reply_markup: keyboard }
        );
    }
};
