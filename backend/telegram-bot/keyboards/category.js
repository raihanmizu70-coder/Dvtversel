const { Markup } = require('telegraf');

module.exports = {
    // Micro Job এর জন্য keyboard
    microJobKeyboard: (task) => {
        return Markup.inlineKeyboard([
            [
                Markup.button.url('🔗 লিঙ্কে যান', task.link),
                Markup.button.callback('📸 প্রুফ জমা দিন', `submit_proof_${task.id}`)
            ],
            [
                Markup.button.callback('❌ বাতিল করুন', 'cancel_task')
            ]
        ]);
    },

    // GST Code এর জন্য keyboard
    gstCodeKeyboard: (code) => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('💰 কিনুন', `buy_gst_${code.id}`),
                Markup.button.callback('ℹ️ বিস্তারিত', `info_gst_${code.id}`)
            ]
        ]);
    },

    // F Code এর জন্য keyboard
    fCodeKeyboard: (code) => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🔐 কোড দেখুন', `show_fcode_${code.id}`),
                Markup.button.callback('💰 কিনুন', `buy_fcode_${code.id}`)
            ],
            [
                Markup.button.callback('📜 বিক্রি ইতিহাস', 'sell_history')
            ]
        ]);
    },

    // Insite এর জন্য keyboard
    insiteKeyboard: (item) => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('👁️ দেখুন', `view_insite_${item.id}`),
                Markup.button.callback('🛒 কিনুন', `buy_insite_${item.id}`)
            ]
        ]);
    },

    // Hack ID Recover এর জন্য keyboard
    hackRecoverKeyboard: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.url('📞 এডমিনের সাথে যোগাযোগ', 'https://t.me/digitalvision_admin')
            ],
            [
                Markup.button.callback('📋 সার্ভিস ডিটেইলস', 'service_details'),
                Markup.button.callback('💵 প্রাইস লিস্ট', 'price_list')
            ]
        ]);
    },

    // Diamond Top-Up এর জন্য keyboard
    diamondKeyboard: (packages) => {
        const buttons = packages.map(pkg => [
            Markup.button.callback(
                `${pkg.diamonds} Diamond - ৳${pkg.price}`,
                `buy_diamond_${pkg.id}`
            )
        ]);
        
        buttons.push([
            Markup.button.callback('📞 অর্ডার দিতে যোগাযোগ', 'contact_for_diamond')
        ]);
        
        return Markup.inlineKeyboard(buttons);
    },

    // Shop এর জন্য keyboard
    shopKeyboard: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.url('🛒 শপ ভিজিট করুন', process.env.SHOP_LINK || 'https://example-shop.com')
            ],
            [
                Markup.button.callback('🏪 অন্যান্য শপ', 'other_shops'),
                Markup.button.callback('📦 অর্ডার ট্র্যাক', 'track_order')
            ]
        ]);
    },

    // GetLike এর জন্য keyboard
    getLikeKeyboard: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.url('🌟 GetLike ওয়েবসাইট', 'https://getlike.io')
            ],
            [
                Markup.button.callback('📊 আমার স্ট্যাটাস', 'getlike_status'),
                Markup.button.callback('💰 আয় করুন', 'earn_getlike')
            ],
            [
                Markup.button.callback('📞 সাপোর্ট', 'getlike_support')
            ]
        ]);
    },

    // Niva Coin এর জন্য keyboard
    nivaCoinKeyboard: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🪙 Niva Coin কিনুন', 'buy_niva'),
                Markup.button.callback('💰 বিক্রি করুন', 'sell_niva')
            ],
            [
                Markup.button.callback('📈 মার্কেট প্রাইস', 'niva_price'),
                Markup.button.callback('📜 ট্রানজেকশন', 'niva_transactions')
            ],
            [
                Markup.button.url('👨‍💼 এডমিন', 'https://t.me/niva_admin')
            ]
        ]);
    },

    // TikTok এর জন্য keyboard
    tiktokKeyboard: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('📱 TikTok সার্ভিস', 'tiktok_services'),
                Markup.button.callback('👥 ফলোয়ার কিনুন', 'buy_followers')
            ],
            [
                Markup.button.callback('💖 লাইক কিনুন', 'buy_likes'),
                Markup.button.callback('💬 কমেন্ট কিনুন', 'buy_comments')
            ],
            [
                Markup.button.url('📞 যোগাযোগ', 'https://t.me/tiktok_service_admin')
            ]
        ]);
    },

    // Withdraw amount selection keyboard
    withdrawAmountKeyboard: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('৳100', 'withdraw_100'),
                Markup.button.callback('৳300', 'withdraw_300')
            ],
            [
                Markup.button.callback('৳500', 'withdraw_500'),
                Markup.button.callback('৳1000', 'withdraw_1000')
            ],
            [
                Markup.button.callback('✏️ কাস্টম', 'withdraw_custom'),
                Markup.button.callback('📜 ইতিহাস', 'withdraw_history')
            ]
        ]);
    },

    // Proof submission keyboard
    proofSubmissionKeyboard: (taskId) => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('📸 স্ক্রিনশট আপলোড', `upload_proof_${taskId}`)
            ],
            [
                Markup.button.callback('📝 ম্যানুয়ালি লিখুন', `manual_proof_${taskId}`)
            ],
            [
                Markup.button.callback('❌ বাতিল', 'cancel_proof')
            ]
        ]);
    },

    // Admin action keyboard for proofs
    adminProofActionKeyboard: (proofId) => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Approve (+৳3)', `approve_proof_${proofId}`),
                Markup.button.callback('❌ Reject', `reject_proof_${proofId}`)
            ],
            [
                Markup.button.callback('🔍 View Details', `view_proof_${proofId}`),
                Markup.button.callback('💬 Message User', `message_user_${proofId}`)
            ]
        ]);
    },

    // Category selection keyboard (for main menu)
    categorySelectionKeyboard: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🧩 Micro Job', 'category_micro_job'),
                Markup.button.callback('💌 GST Code', 'category_gst_code')
            ],
            [
                Markup.button.callback('📘 F Code', 'category_f_code'),
                Markup.button.callback('📸 Insite', 'category_insite')
            ],
            [
                Markup.button.callback('🛠️ Hack ID', 'category_hack_recover'),
                Markup.button.callback('💎 Diamond', 'category_diamond')
            ],
            [
                Markup.button.callback('🏪 Shop', 'category_shop'),
                Markup.button.callback('💥 GetLike', 'category_getlike')
            ],
            [
                Markup.button.callback('💰 Niva Coin', 'category_niva_coin'),
                Markup.button.callback('🎵 TikTok', 'category_tiktok')
            ]
        ]);
    },

    // Navigation keyboard
    navigationKeyboard: () => {
        return Markup.keyboard([
            ['🏠 Home', '👥 Refer'],
            ['💸 My Income', '💳 Withdraw'],
            ['👤 Profile', 'ℹ️ Help']
        ]).resize();
    },

    // Yes/No confirmation keyboard
    confirmationKeyboard: (action) => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ হ্যাঁ', `confirm_${action}`),
                Markup.button.callback('❌ না', `cancel_${action}`)
            ]
        ]);
    },

    // Payment method keyboard
    paymentMethodKeyboard: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🏦 বিকাশ', 'payment_bkash'),
                Markup.button.callback('🏧 নগদ', 'payment_nagad')
            ],
            [
                Markup.button.callback('🚀 রকেট', 'payment_rocket'),
                Markup.button.callback('💳 অন্যান্য', 'payment_other')
            ]
        ]);
    },

    // Support options keyboard
    supportKeyboard: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.url('📢 চ্যানেল ১', 'https://t.me/income460tu'),
                Markup.button.url('📢 চ্যানেল ২', 'https://t.me/dvt1236')
            ],
            [
                Markup.button.url('🆘 সাপোর্ট গ্রুপ', 'https://t.me/digitalvision_support'),
                Markup.button.url('👨‍💼 এডমিন', 'https://t.me/digitalvision_admin')
            ],
            [
                Markup.button.callback('📞 কল ব্যাক', 'request_callback'),
                Markup.button.callback('📧 ইমেইল', 'send_email')
            ]
        ]);
    },

    // Task management keyboard (for admin)
    taskManagementKeyboard: (taskId) => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✏️ Edit', `edit_task_${taskId}`),
                Markup.button.callback('👁️ View', `view_task_${taskId}`)
            ],
            [
                Markup.button.callback('✅ Activate', `activate_task_${taskId}`),
                Markup.button.callback('❌ Deactivate', `deactivate_task_${taskId}`)
            ],
            [
                Markup.button.callback('🗑️ Delete', `delete_task_${taskId}`),
                Markup.button.callback('📊 Stats', `stats_task_${taskId}`)
            ]
        ]);
    },

    // User management keyboard (for admin)
    userManagementKeyboard: (userId) => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('👁️ View Profile', `view_user_${userId}`),
                Markup.button.callback('💰 Add Balance', `add_balance_${userId}`)
            ],
            [
                Markup.button.callback('⚠️ Warn User', `warn_user_${userId}`),
                Markup.button.callback('🚫 Ban User', `ban_user_${userId}`)
            ],
            [
                Markup.button.callback('✅ Unban User', `unban_user_${userId}`),
                Markup.button.callback('📊 Statistics', `stats_user_${userId}`)
            ]
        ]);
    }
};
