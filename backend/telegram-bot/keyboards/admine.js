const { Markup } = require('telegraf');

// আপনার এডমিন আইডি
const ADMIN_IDS = [6561117046]; // শুধু আপনার আইডি

// এডমিন চেক করার ফাংশন
const isAdmin = (userId) => {
    return ADMIN_IDS.includes(parseInt(userId));
};

// Main admin keyboard (শুধু এডমিনদের জন্য)
const mainAdminKeyboard = () => {
    return Markup.keyboard([
        ['📊 ড্যাশবোর্ড', '👥 ইউজার'],
        ['🧩 মাইক্রো জব', '💼 কোডস'],
        ['💰 উত্তোলন', '📈 রিপোর্ট'],
        ['⚙️ সেটিংস', '📢 ব্রডকাস্ট'],
        ['🔙 ইউজার মোড']
    ]).resize().oneTime();
};

// Dashboard keyboard
const dashboardKeyboard = () => {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('📈 বট স্ট্যাটাস', 'admin_stats'),
            Markup.button.callback('💰 আর্থিক', 'admin_finance')
        ],
        [
            Markup.button.callback('👥 ইউজার', 'admin_users'),
            Markup.button.callback('📊 জব', 'admin_jobs')
        ]
    ]);
};

// User management keyboard
const userManagementKeyboard = () => {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('🔍 ইউজার খুঁজুন', 'admin_find_user'),
            Markup.button.callback('📋 সব ইউজার', 'admin_all_users')
        ],
        [
            Markup.button.callback('💰 ব্যালেন্স দেন', 'admin_add_balance'),
            Markup.button.callback('⚠️ ইউজার ব্যান', 'admin_ban_user')
        ]
    ]);
};

// Micro job keyboard
const microJobKeyboard = () => {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('➕ নতুন জব', 'admin_add_job'),
            Markup.button.callback('📋 সব জব', 'admin_all_jobs')
        ],
        [
            Markup.button.callback('✅ প্রুফ চেক', 'admin_check_proofs'),
            Markup.button.callback('💰 বোনাস দিন', 'admin_add_bonus')
        ]
    ]);
};

// Withdrawal keyboard
const withdrawalKeyboard = () => {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('⏳ পেন্ডিং', 'admin_pending_withdrawals'),
            Markup.button.callback('✅ অ্যাপ্রুভ', 'admin_approve_withdrawal')
        ],
        [
            Markup.button.callback('❌ রিজেক্ট', 'admin_reject_withdrawal'),
            Markup.button.callback('📊 স্ট্যাটাস', 'admin_withdrawal_stats')
        ]
    ]);
};

// Settings keyboard
const settingsKeyboard = () => {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('⚙️ বট সেটিংস', 'admin_bot_settings'),
            Markup.button.callback('💰 পেমেন্ট সেটিংস', 'admin_payment_settings')
        ],
        [
            Markup.button.callback('👥 রেফারেল সেটিংস', 'admin_referral_settings'),
            Markup.button.callback('📢 চ্যানেল সেটিংস', 'admin_channel_settings')
        ]
    ]);
};

// Broadcast keyboard
const broadcastKeyboard = () => {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('📢 সবাইকে', 'broadcast_all'),
            Markup.button.callback('👥 অ্যাক্টিভদের', 'broadcast_active')
        ],
        [
            Markup.button.callback('💰 প্রিমিয়ামদের', 'broadcast_premium'),
            Markup.button.callback('📱 কাস্টম', 'broadcast_custom')
        ]
    ]);
};

// Single user action
const userActionKeyboard = (userId) => {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('💰 ব্যালেন্স +', `add_bal_${userId}`),
            Markup.button.callback('➖ ব্যালেন্স -', `deduct_bal_${userId}`)
        ],
        [
            Markup.button.callback('⚠️ ওয়ার্ন', `warn_${userId}`),
            Markup.button.callback('🚫 ব্যান', `ban_${userId}`)
        ],
        [
            Markup.button.callback('✅ আনব্যান', `unban_${userId}`),
            Markup.button.callback('📊 স্ট্যাটাস', `stats_${userId}`)
        ]
    ]);
};

// Confirmation keyboard
const confirmKeyboard = (action, id) => {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('✅ কনফার্ম', `confirm_${action}_${id}`),
            Markup.button.callback('❌ ক্যানসেল', `cancel_${action}_${id}`)
        ]
    ]);
};

module.exports = {
    isAdmin,
    mainAdminKeyboard,
    dashboardKeyboard,
    userManagementKeyboard,
    microJobKeyboard,
    withdrawalKeyboard,
    settingsKeyboard,
    broadcastKeyboard,
    userActionKeyboard,
    confirmKeyboard
};
