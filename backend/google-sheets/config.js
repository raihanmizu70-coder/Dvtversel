// সরাসরি Google Sheets API কনফিগারেশন (Google Cloud ছাড়া)
const config = {
    // আপনার Google Sheet ID (লিংক থেকে নেওয়া)
    SPREADSHEET_ID: '1uIXfDQN6LbKSY26LOZQqbdAxVcoeJDZawQav3veLxRA',
    
    // Sheet টাইটেলস (একই নামে শীট তৈরি করুন)
    SHEET_NAMES: {
        USERS: 'Users',
        TASKS: 'Tasks',
        PROOFS: 'Proofs',
        TRANSACTIONS: 'Transactions',
        WITHDRAWALS: 'Withdrawals',
        REFERRALS: 'Referrals',
        CODES_GST: 'GST_Codes',
        CODES_F: 'F_Codes',
        CODES_INSITE: 'Insite_Codes',
        DIAMOND: 'Diamond_Packages',
        SETTINGS: 'Settings',
        ADMIN_LOGS: 'Admin_Logs'
    },
    
    // কলাম হেডারস (প্রতিটি শীটের জন্য)
    COLUMN_HEADERS: {
        USERS: [
            'userId', 'username', 'first_name', 'last_name', 'language_code',
            'mainWallet', 'cashWallet', 'totalEarned', 'refEarned', 'refCode',
            'refCount', 'status', 'isPremium', 'joinedAt', 'lastActive',
            'completedTasks', 'hasWithdrawn', 'banReason', 'bannedBy', 'bannedAt',
            'phone', 'email', 'totalReferrals', 'activeReferrals'
        ],
        
        TASKS: [
            'id', 'title', 'description', 'link', 'reward', 'status',
            'createdAt', 'expiresAt', 'adminId', 'completedBy', 'completedAt',
            'activatedAt', 'deactivatedAt', 'totalCompletions'
        ],
        
        PROOFS: [
            'id', 'userId', 'taskId', 'screenshot', 'status', 'submittedAt',
            'verifiedAt', 'adminNote', 'reward', 'verifiedBy'
        ],
        
        TRANSACTIONS: [
            'id', 'userId', 'type', 'amount', 'description', 'timestamp',
            'balanceAfter', 'referenceId', 'status', 'adminId', 'notes',
            'transactionFee', 'paymentMethod', 'ipAddress', 'deviceInfo'
        ],
        
        WITHDRAWALS: [
            'id', 'userId', 'amount', 'charges', 'netAmount', 'method',
            'status', 'userPhone', 'transactionId', 'adminNote', 'requestedAt',
            'processedAt', 'processedBy', 'isFirstWithdraw'
        ],
        
        REFERRALS: [
            'id', 'referrerId', 'referredId', 'bonusPaid', 'timestamp',
            'referredUsername', 'hasWithdrawn'
        ],
        
        CODES_GST: [
            'id', 'code', 'name', 'description', 'price', 'status',
            'addedAt', 'soldTo', 'soldAt', 'adminId'
        ],
        
        CODES_F: [
            'id', 'uid', 'address', 'codep', '2code', 'price', 'status',
            'addedAt', 'soldTo', 'soldAt', 'adminId'
        ],
        
        CODES_INSITE: [
            'id', 'uid', 'email', 'password', 'price', 'status',
            'addedAt', 'soldTo', 'soldAt', 'adminId'
        ],
        
        DIAMOND: [
            'id', 'diamonds', 'price', 'description', 'status', 'addedAt',
            'contactInfo', 'adminId'
        ],
        
        SETTINGS: [
            'key', 'value', 'updatedAt', 'updatedBy', 'description'
        ],
        
        ADMIN_LOGS: [
            'id', 'adminId', 'action', 'targetUserId', 'targetTaskId',
            'targetWithdrawalId', 'details', 'timestamp', 'ipAddress'
        ]
    },
    
    // ডিফল্ট সেটিংস
    DEFAULT_SETTINGS: [
        { key: 'bot_name', value: 'Digital Vision Trusted', description: 'Bot Name' },
        { key: 'bot_username', value: '@digitalvision_bot', description: 'Bot Username' },
        { key: 'welcome_message', value: 'Welcome to Digital Vision Trusted Bot!', description: 'Welcome Message' },
        { key: 'channel_1', value: '@income460tu', description: 'Required Channel 1' },
        { key: 'channel_2', value: '@dvt1236', description: 'Required Channel 2' },
        { key: 'support_channel', value: '@digitalvision_support', description: 'Support Channel' },
        { key: 'admin_username', value: '@Miju132', description: 'Admin Username' },
        { key: 'minimum_withdraw', value: '100', description: 'Minimum Withdrawal Amount' },
        { key: 'referral_bonus', value: '5', description: 'Referral Bonus Amount' },
        { key: 'first_withdraw_charge', value: '10', description: 'First Withdrawal Fixed Charge' },
        { key: 'withdraw_charge_percent', value: '10', description: 'Withdrawal Charge Percentage' },
        { key: 'min_task_reward', value: '3', description: 'Minimum Task Reward' },
        { key: 'max_task_reward', value: '10', description: 'Maximum Task Reward' },
        { key: 'max_tasks_per_day', value: '5', description: 'Maximum Tasks Per Day' },
        { key: 'shop_link', value: 'https://example-shop.com', description: 'Shop Link' },
        { key: 'bkash_number', value: '', description: 'Bkash Number' },
        { key: 'nagad_number', value: '', description: 'Nagad Number' },
        { key: 'rocket_number', value: '', description: 'Rocket Number' },
        { key: 'diamond_contact', value: '@Miju132', description: 'Diamond Contact' },
        { key: 'maintenance_mode', value: 'false', description: 'Maintenance Mode' },
        { key: 'auto_approve_tasks', value: 'false', description: 'Auto Approve Tasks' },
        { key: 'withdrawal_processing_time', value: '24', description: 'Withdrawal Processing Time (hours)' },
        { key: 'max_withdraw_per_day', value: '3', description: 'Max Withdrawals Per Day' }
    ]
};

module.exports = config;
