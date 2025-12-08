// ============================================
// Digital Vision Bot - Keyboards Index File
// Exports all keyboards from one place
// ============================================

// Import all keyboard files
const mainKeyboards = require('./main.js');
const categoryKeyboards = require('./category.js');
const adminKeyboards = require('./admine.js'); // Note: admine.js (not admin.js)

// Your admin ID (from env or hardcoded)
const ADMIN_ID = 6561117046;

// ============================================
// EXPORT ALL KEYBOARDS
// ============================================

module.exports = {
    // ===== USER KEYBOARDS =====
    // From main.js
    mainMenu: mainKeyboards.mainMenu || mainKeyboards.mainKeyboard,
    backButton: mainKeyboards.backButton || mainKeyboards.backKeyboard,
    cancelButton: mainKeyboards.cancelButton || mainKeyboards.cancelKeyboard,
    
    // ===== CATEGORY KEYBOARDS =====
    // From category.js
    categories: categoryKeyboards.categories || categoryKeyboards.categoryKeyboard,
    jobActions: categoryKeyboards.jobActions || categoryKeyboards.jobActionKeyboard,
    
    // ===== ADMIN KEYBOARDS =====
    // From admine.js
    adminMenu: adminKeyboards.adminMenu || adminKeyboards.adminKeyboard,
    adminDashboard: adminKeyboards.adminDashboard || adminKeyboards.dashboardKeyboard,
    userActions: adminKeyboards.userActions || adminKeyboards.userActionKeyboard,
    
    // ===== HELPER FUNCTIONS =====
    // Check if user is admin
    isAdmin: function(userId) {
        const id = parseInt(userId);
        return id === ADMIN_ID;
    },
    
    // Get user keyboard based on role
    getUserKeyboard: function(userId) {
        if (this.isAdmin(userId)) {
            return this.adminMenu;
        }
        return this.mainMenu;
    },
    
    // Quick access to common keyboards
    getBackKeyboard: function() {
        return this.backButton;
    },
    
    getCategoryKeyboard: function() {
        return this.categories;
    }
};
