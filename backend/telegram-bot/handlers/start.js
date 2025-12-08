const subscriptionCheck = require('../utils/subscription');
const mainKeyboard = require('../keyboards/main');

module.exports = function(db) {
    return async (ctx) => {
        try {
            const userId = ctx.from.id;
            const username = ctx.from.username || ctx.from.first_name;
            
            // চ্যানেল সাবস্ক্রিপশন চেক
            const isSubscribed = await subscriptionCheck.check(ctx);
            
            if (!isSubscribed) {
                return;
            }
            
            // ইউজার সেভ/আপডেট
            const user = await db.getUser(userId);
            
            if (!user) {
                // নতুন ইউজার
                const newUser = {
                    userId,
                    username,
                    balance: 0,
                    mainWallet: 0,
                    cashWallet: 0,
                    refCode: generateRefCode(userId),
                    joinedAt: new Date().toISOString(),
                    status: 'active'
                };
                
                await db.addUser(newUser);
                
                ctx.reply(`🎉 স্বাগতম ${username}!\n\n` +
                    `আপনার রেফার কোড: ${newUser.refCode}\n` +
                    `রেফার করলে ৫ টাকা বোনাস পাবেন!\n\n` +
                    `📱 মিনি অ্যাপ ওপেন করতে /app কমান্ড দিন।`,
                    mainKeyboard.mainMenu());
            } else {
                ctx.reply(`👋 হ্যালো ${username}!\n` +
                    `আপনার ব্যালেন্স: ৳${user.balance}\n` +
                    `রেফার কোড: ${user.refCode}\n\n` +
                    `মেনু থেকে অপশন সিলেক্ট করুন:`,
                    mainKeyboard.mainMenu());
            }
        } catch (error) {
            console.error('Start handler error:', error);
            ctx.reply('❌ সিস্টেমে সমস্যা হচ্ছে। পরে চেষ্টা করুন।');
        }
    };
};

function generateRefCode(userId) {
    return `DV${userId.toString(36).toUpperCase().substr(0, 6)}`;
}
