module.exports = {
    mainMenu: () => ({
        reply_markup: {
            keyboard: [
                [
                    { text: '🧩 Micro Job' },
                    { text: '💌 GST Code' }
                ],
                [
                    { text: '📘 F Code' },
                    { text: '📸 Insite' }
                ],
                [
                    { text: '🛠️ Hack ID' },
                    { text: '💎 Diamond' }
                ],
                [
                    { text: '🏪 Shop' },
                    { text: '💥 GetLike' }
                ],
                [
                    { text: '💰 Niva Coin' },
                    { text: '🎵 TikTok' }
                ],
                [
                    { text: '🏠 Home' },
                    { text: '👥 Refer' },
                    { text: '💸 My Income' }
                ],
                [
                    { text: '💳 Withdraw' },
                    { text: '👤 Profile' }
                ]
            ],
            resize_keyboard: true
        }
    }),
    
    categoryMenu: () => ({
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🧩 Micro Job', callback_data: 'category_micro_job' },
                    { text: '💌 GST Code', callback_data: 'category_gst_code' }
                ],
                [
                    { text: '📘 F Code', callback_data: 'category_f_code' },
                    { text: '📸 Insite', callback_data: 'category_insite' }
                ],
                [
                    { text: '🛠️ Hack Recover', callback_data: 'category_hack_recover' },
                    { text: '💎 Diamond', callback_data: 'category_diamond' }
                ],
                [
                    { text: '🏪 Shop', callback_data: 'category_shop' },
                    { text: '💥 GetLike', callback_data: 'category_getlike' }
                ],
                [
                    { text: '💰 Niva Coin', callback_data: 'category_niva_coin' },
                    { text: '🎵 TikTok', callback_data: 'category_tiktok' }
                ]
            ]
        }
    })
};
