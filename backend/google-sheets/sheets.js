const axios = require('axios');
const config = require('./config');

class GoogleSheetsAPI {
    constructor() {
        this.spreadsheetId = config.SPREADSHEET_ID;
        this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
        this.apiKey = ''; // পাবলিক API কি ছাড়াই কাজ করবে
        
        // শীট ম্যাপ
        this.sheets = {};
        
        // লোকাল স্টোরেজ (API না থাকলে ব্যাকআপ)
        this.localStorage = {
            users: [],
            tasks: [],
            proofs: [],
            transactions: [],
            withdrawals: [],
            referrals: [],
            codes_gst: [],
            codes_f: [],
            codes_insite: [],
            diamond: [],
            settings: [],
            admin_logs: []
        };
    }
    
    // শীট ইনিশিয়ালাইজ
    async initialize() {
        try {
            console.log('🔧 Google Sheets API ইনিশিয়ালাইজ করা হচ্ছে...');
            
            // শীটগুলো চেক করি
            await this.checkAndCreateSheets();
            
            console.log('✅ Google Sheets প্রস্তুত!');
            return true;
        } catch (error) {
            console.error('❌ Google Sheets ইনিশিয়ালাইজেশনে ত্রুটি:', error.message);
            console.log('⚠️ লোকাল স্টোরেজ ব্যবহার করা হবে...');
            
            // লোকাল স্টোরেজ ইনিশিয়ালাইজ
            await this.initializeLocalStorage();
            return false;
        }
    }
    
    // শীট চেক এবং তৈরি
    async checkAndCreateSheets() {
        try {
            // API এর মাধ্যমে শীটগুলো পেতে চেষ্টা করি
            const response = await axios.get(
                `${this.baseUrl}/${this.spreadsheetId}?key=${this.apiKey}`
            ).catch(() => null);
            
            if (response && response.data) {
                // API কাজ করলে
                const existingSheets = response.data.sheets || [];
                const existingSheetNames = existingSheets.map(sheet => sheet.properties.title);
                
                // প্রতিটি প্রয়োজনীয় শীট চেক করুন
                for (const [key, sheetName] of Object.entries(config.SHEET_NAMES)) {
                    if (!existingSheetNames.includes(sheetName)) {
                        console.log(`📄 শীট তৈরি করা হচ্ছে: ${sheetName}`);
                        await this.createSheet(sheetName, config.COLUMN_HEADERS[key]);
                    } else {
                        console.log(`✅ শীট পাওয়া গেছে: ${sheetName}`);
                    }
                    
                    // শীট রেফারেন্স সেভ করুন
                    this.sheets[sheetName] = sheetName;
                }
                
                // ডিফল্ট সেটিংস সেট করুন
                await this.initializeDefaultSettings();
            } else {
                // API কাজ না করলে লোকাল স্টোরেজ ব্যবহার করুন
                throw new Error('API সংযোগ ব্যর্থ');
            }
        } catch (error) {
            throw error;
        }
    }
    
    // নতুন শীট তৈরি (API ছাড়া)
    async createSheet(sheetName, headers) {
        try {
            // API এর মাধ্যমে শীট তৈরি
            const response = await axios.post(
                `${this.baseUrl}/${this.spreadsheetId}:batchUpdate`,
                {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: sheetName
                            }
                        }
                    }]
                },
                { params: { key: this.apiKey } }
            ).catch(() => null);
            
            if (response && response.data) {
                // শীট ID সেভ করুন
                const sheetId = response.data.replies[0].addSheet.properties.sheetId;
                
                // হেডার যোগ করুন
                await this.updateSheetData(sheetName, [headers]);
                
                return sheetId;
            } else {
                // লোকাল স্টোরেজে শীট তৈরি
                this.localStorage[this.getLocalStorageKey(sheetName)] = [];
                return sheetName;
            }
        } catch (error) {
            // লোকাল স্টোরেজে শীট তৈরি
            this.localStorage[this.getLocalStorageKey(sheetName)] = [];
            return sheetName;
        }
    }
    
    // শীট ডেটা আপডেট
    async updateSheetData(sheetName, data) {
        try {
            const range = `${sheetName}!A1:Z${data.length + 100}`;
            
            const response = await axios.put(
                `${this.baseUrl}/${this.spreadsheetId}/values/${range}?valueInputOption=RAW`,
                {
                    values: data
                },
                { params: { key: this.apiKey } }
            ).catch(() => null);
            
            return response ? response.data : null;
        } catch (error) {
            // লোকাল স্টোরেজে সেভ করুন
            const storageKey = this.getLocalStorageKey(sheetName);
            if (data.length > 0 && data[0]) {
                // শুধু নতুন ডেটা যোগ করুন (প্রথম সারি হেডার)
                if (data.length === 1) {
                    this.localStorage[storageKey] = [data[0]];
                } else {
                    this.localStorage[storageKey] = data;
                }
            }
            return { success: true };
        }
    }
    
    // শীট ডেটা পড়ুন
    async getSheetData(sheetName) {
        try {
            const range = `${sheetName}!A1:Z1000`;
            
            const response = await axios.get(
                `${this.baseUrl}/${this.spreadsheetId}/values/${range}`,
                { params: { key: this.apiKey } }
            ).catch(() => null);
            
            if (response && response.data && response.data.values) {
                return response.data.values;
            } else {
                // লোকাল স্টোরেজ থেকে পড়ুন
                return this.localStorage[this.getLocalStorageKey(sheetName)] || [];
            }
        } catch (error) {
            // লোকাল স্টোরেজ থেকে পড়ুন
            return this.localStorage[this.getLocalStorageKey(sheetName)] || [];
        }
    }
    
    // ডিফল্ট সেটিংস ইনিশিয়ালাইজ
    async initializeDefaultSettings() {
        try {
            const settings = await this.getSheetData(config.SHEET_NAMES.SETTINGS);
            
            // যদি সেটিংস খালি থাকে
            if (settings.length <= 1) {
                const settingsData = [
                    config.COLUMN_HEADERS.SETTINGS,
                    ...config.DEFAULT_SETTINGS.map(setting => [
                        setting.key,
                        setting.value,
                        new Date().toISOString(),
                        'system',
                        setting.description
                    ])
                ];
                
                await this.updateSheetData(config.SHEET_NAMES.SETTINGS, settingsData);
                console.log('✅ ডিফল্ট সেটিংস সেট করা হয়েছে');
            }
        } catch (error) {
            console.error('❌ সেটিংস ইনিশিয়ালাইজেশনে ত্রুটি:', error);
        }
    }
    
    // লোকাল স্টোরেজ ইনিশিয়ালাইজ
    async initializeLocalStorage() {
        try {
            // প্রতিটি শীটের জন্য লোকাল স্টোরেজ তৈরি
            for (const [key, sheetName] of Object.entries(config.SHEET_NAMES)) {
                const storageKey = this.getLocalStorageKey(sheetName);
                this.localStorage[storageKey] = [config.COLUMN_HEADERS[key]];
                
                // সেটিংস শীটের জন্য ডিফল্ট ভ্যালু যোগ
                if (sheetName === config.SHEET_NAMES.SETTINGS) {
                    const defaultSettings = config.DEFAULT_SETTINGS.map(setting => [
                        setting.key,
                        setting.value,
                        new Date().toISOString(),
                        'system',
                        setting.description
                    ]);
                    this.localStorage[storageKey].push(...defaultSettings);
                }
            }
            
            console.log('✅ লোকাল স্টোরেজ প্রস্তুত!');
        } catch (error) {
            console.error('❌ লোকাল স্টোরেজ ইনিশিয়ালাইজেশনে ত্রুটি:', error);
        }
    }
    
    // শীট নাম থেকে লোকাল স্টোরেজ কী
    getLocalStorageKey(sheetName) {
        const keyMap = {
            'Users': 'users',
            'Tasks': 'tasks',
            'Proofs': 'proofs',
            'Transactions': 'transactions',
            'Withdrawals': 'withdrawals',
            'Referrals': 'referrals',
            'GST_Codes': 'codes_gst',
            'F_Codes': 'codes_f',
            'Insite_Codes': 'codes_insite',
            'Diamond_Packages': 'diamond',
            'Settings': 'settings',
            'Admin_Logs': 'admin_logs'
        };
        
        return keyMap[sheetName] || sheetName.toLowerCase();
    }
    
    // ================== ইউটিলিটি মেথডস ==================
    
    // সারি যোগ করুন
    async addRow(sheetName, rowData) {
        try {
            const data = await this.getSheetData(sheetName);
            const headers = data[0] || [];
            
            // সারি তৈরি করুন
            const newRow = headers.map(header => rowData[header] || '');
            data.push(newRow);
            
            // শীট আপডেট করুন
            await this.updateSheetData(sheetName, data);
            
            return { ...rowData, id: Date.now().toString() };
        } catch (error) {
            console.error(`❌ ${sheetName} এ সারি যোগ করতে ত্রুটি:`, error);
            
            // লোকাল স্টোরেজে যোগ করুন
            const storageKey = this.getLocalStorageKey(sheetName);
            if (this.localStorage[storageKey]) {
                const headers = this.localStorage[storageKey][0];
                const newRow = headers.map(header => rowData[header] || '');
                this.localStorage[storageKey].push(newRow);
                
                return { ...rowData, id: Date.now().toString() };
            }
            
            throw error;
        }
    }
    
    // সারি আপডেট করুন
    async updateRow(sheetName, rowId, updates, idColumn = 'id') {
        try {
            const data = await this.getSheetData(sheetName);
            const headers = data[0] || [];
            
            // সারি খুঁজুন
            const rowIndex = data.findIndex(row => row[headers.indexOf(idColumn)] === rowId);
            if (rowIndex === -1) {
                throw new Error(`সারি পাওয়া যায়নি: ${rowId}`);
            }
            
            // আপডেট করুন
            Object.keys(updates).forEach(key => {
                const colIndex = headers.indexOf(key);
                if (colIndex !== -1) {
                    data[rowIndex][colIndex] = updates[key];
                }
            });
            
            // শীট আপডেট করুন
            await this.updateSheetData(sheetName, data);
            
            return true;
        } catch (error) {
            console.error(`❌ ${sheetName} এ সারি আপডেট করতে ত্রুটি:`, error);
            
            // লোকাল স্টোরেজে আপডেট করুন
            const storageKey = this.getLocalStorageKey(sheetName);
            if (this.localStorage[storageKey]) {
                const data = this.localStorage[storageKey];
                const headers = data[0];
                const rowIndex = data.findIndex(row => row[headers.indexOf(idColumn)] === rowId);
                
                if (rowIndex !== -1) {
                    Object.keys(updates).forEach(key => {
                        const colIndex = headers.indexOf(key);
                        if (colIndex !== -1) {
                            data[rowIndex][colIndex] = updates[key];
                        }
                    });
                }
            }
            
            return false;
        }
    }
    
    // সারি মুছুন
    async deleteRow(sheetName, rowId, idColumn = 'id') {
        try {
            const data = await this.getSheetData(sheetName);
            const headers = data[0] || [];
            
            // সারি খুঁজুন
            const rowIndex = data.findIndex(row => row[headers.indexOf(idColumn)] === rowId);
            if (rowIndex === -1) {
                throw new Error(`সারি পাওয়া যায়নি: ${rowId}`);
            }
            
            // সারি মুছুন
            data.splice(rowIndex, 1);
            
            // শীট আপডেট করুন
            await this.updateSheetData(sheetName, data);
            
            return true;
        } catch (error) {
            console.error(`❌ ${sheetName} থেকে সারি মুছতে ত্রুটি:`, error);
            
            // লোকাল স্টোরেজ থেকে মুছুন
            const storageKey = this.getLocalStorageKey(sheetName);
            if (this.localStorage[storageKey]) {
                const data = this.localStorage[storageKey];
                const headers = data[0];
                const rowIndex = data.findIndex(row => row[headers.indexOf(idColumn)] === rowId);
                
                if (rowIndex !== -1) {
                    data.splice(rowIndex, 1);
                }
            }
            
            return false;
        }
    }
    
    // সারি পড়ুন
    async getRow(sheetName, rowId, idColumn = 'id') {
        try {
            const data = await this.getSheetData(sheetName);
            const headers = data[0] || [];
            
            // সারি খুঁজুন
            const row = data.find(row => row[headers.indexOf(idColumn)] === rowId);
            if (!row) {
                return null;
            }
            
            // অবজেক্টে কনভার্ট করুন
            const rowObject = {};
            headers.forEach((header, index) => {
                rowObject[header] = row[index] || '';
            });
            
            return rowObject;
        } catch (error) {
            console.error(`❌ ${sheetName} থেকে সারি পড়তে ত্রুটি:`, error);
            
            // লোকাল স্টোরেজ থেকে পড়ুন
            const storageKey = this.getLocalStorageKey(sheetName);
            if (this.localStorage[storageKey]) {
                const data = this.localStorage[storageKey];
                const headers = data[0];
                const row = data.find(row => row[headers.indexOf(idColumn)] === rowId);
                
                if (row) {
                    const rowObject = {};
                    headers.forEach((header, index) => {
                        rowObject[header] = row[index] || '';
                    });
                    return rowObject;
                }
            }
            
            return null;
        }
    }
    
    // সব সারি পড়ুন
    async getAllRows(sheetName) {
        try {
            const data = await this.getSheetData(sheetName);
            const headers = data[0] || [];
            
            // সব সারি কনভার্ট করুন
            const rows = [];
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                const rowObject = {};
                
                headers.forEach((header, index) => {
                    rowObject[header] = row[index] || '';
                });
                
                rows.push(rowObject);
            }
            
            return rows;
        } catch (error) {
            console.error(`❌ ${sheetName} থেকে সব সারি পড়তে ত্রুটি:`, error);
            
            // লোকাল স্টোরেজ থেকে পড়ুন
            const storageKey = this.getLocalStorageKey(sheetName);
            if (this.localStorage[storageKey]) {
                const data = this.localStorage[storageKey];
                const headers = data[0];
                const rows = [];
                
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    const rowObject = {};
                    
                    headers.forEach((header, index) => {
                        rowObject[header] = row[index] || '';
                    });
                    
                    rows.push(rowObject);
                }
                
                return rows;
            }
            
            return [];
        }
    }
    
    // ================== স্পেসিফিক মেথডস ==================
    
    // ইউজার মেথডস
    async getAllUsers() {
        return await this.getAllRows(config.SHEET_NAMES.USERS);
    }
    
    async getUser(userId) {
        return await this.getRow(config.SHEET_NAMES.USERS, userId.toString(), 'userId');
    }
    
    async addUser(userData) {
        return await this.addRow(config.SHEET_NAMES.USERS, {
            ...userData,
            joinedAt: userData.joinedAt || new Date().toISOString(),
            lastActive: userData.lastActive || new Date().toISOString()
        });
    }
    
    async updateUser(userId, updates) {
        return await this.updateRow(config.SHEET_NAMES.USERS, userId.toString(), updates, 'userId');
    }
    
    // টাস্ক মেথডস
    async getAllTasks() {
        return await this.getAllRows(config.SHEET_NAMES.TASKS);
    }
    
    async getTask(taskId) {
        return await this.getRow(config.SHEET_NAMES.TASKS, taskId, 'id');
    }
    
    async addTask(taskData) {
        return await this.addRow(config.SHEET_NAMES.TASKS, taskData);
    }
    
    async updateTask(taskId, updates) {
        return await this.updateRow(config.SHEET_NAMES.TASKS, taskId, updates, 'id');
    }
    
    async deleteTask(taskId) {
        return await this.deleteRow(config.SHEET_NAMES.TASKS, taskId, 'id');
    }
    
    // প্রুফ মেথডস
    async getAllProofs() {
        return await this.getAllRows(config.SHEET_NAMES.PROOFS);
    }
    
    async getProof(proofId) {
        return await this.getRow(config.SHEET_NAMES.PROOFS, proofId, 'id');
    }
    
    async addProof(proofData) {
        return await this.addRow(config.SHEET_NAMES.PROOFS, proofData);
    }
    
    async updateProof(proofId, updates) {
        return await this.updateRow(config.SHEET_NAMES.PROOFS, proofId, updates, 'id');
    }
    
    async getProofsByUser(userId) {
        const proofs = await this.getAllProofs();
        return proofs.filter(proof => proof.userId === userId.toString());
    }
    
    async getProofsByTask(taskId) {
        const proofs = await this.getAllProofs();
        return proofs.filter(proof => proof.taskId === taskId);
    }
    
    async getPendingProofs() {
        const proofs = await this.getAllProofs();
        return proofs.filter(proof => proof.status === 'pending');
    }
    
    // ট্রানজেকশন মেথডস
    async getAllTransactions() {
        return await this.getAllRows(config.SHEET_NAMES.TRANSACTIONS);
    }
    
    async addTransaction(transactionData) {
        return await this.addRow(config.SHEET_NAMES.TRANSACTIONS, transactionData);
    }
    
    async getTransactionsByUser(userId, limit = null) {
        const transactions = await this.getAllTransactions();
        const userTransactions = transactions.filter(t => t.userId === userId.toString());
        
        if (limit) {
            return userTransactions.slice(0, limit);
        }
        return userTransactions;
    }
    
    // উইথড্র মেথডস
    async getAllWithdrawals() {
        return await this.getAllRows(config.SHEET_NAMES.WITHDRAWALS);
    }
    
    async getWithdrawal(withdrawalId) {
        return await this.getRow(config.SHEET_NAMES.WITHDRAWALS, withdrawalId, 'id');
    }
    
    async addWithdrawal(withdrawalData) {
        return await this.addRow(config.SHEET_NAMES.WITHDRAWALS, withdrawalData);
    }
    
    async updateWithdrawal(withdrawalId, updates) {
        return await this.updateRow(config.SHEET_NAMES.WITHDRAWALS, withdrawalId, updates, 'id');
    }
    
    async getWithdrawalsByUser(userId) {
        const withdrawals = await this.getAllWithdrawals();
        return withdrawals.filter(w => w.userId === userId.toString());
    }
    
    async getPendingWithdrawals() {
        const withdrawals = await this.getAllWithdrawals();
        return withdrawals.filter(w => w.status === 'pending');
    }
    
    async getPendingWithdrawalsCount() {
        const withdrawals = await this.getAllWithdrawals();
        return withdrawals.filter(w => w.status === 'pending').length;
    }
    
    // রেফারেল মেথডস
    async getAllReferrals() {
        return await this.getAllRows(config.SHEET_NAMES.REFERRALS);
    }
    
    async addReferral(referralData) {
        return await this.addRow(config.SHEET_NAMES.REFERRALS, referralData);
    }
    
    async getReferrals(referrerId) {
        const referrals = await this.getAllReferrals();
        return referrals.filter(ref => ref.referrerId === referrerId.toString());
    }
    
    async updateReferralBonus(referredId, bonusPaid) {
        const referrals = await this.getAllReferrals();
        const referral = referrals.find(ref => ref.referredId === referredId.toString());
        
        if (referral) {
            return await this.updateRow(config.SHEET_NAMES.REFERRALS, referral.id, {
                bonusPaid: bonusPaid.toString()
            }, 'id');
        }
        
        return false;
    }
    
    // কোড মেথডস
    async getGSTCodes() {
        return await this.getAllRows(config.SHEET_NAMES.CODES_GST);
    }
    
    async addGSTCode(codeData) {
        return await this.addRow(config.SHEET_NAMES.CODES_GST, codeData);
    }
    
    async updateGSTCode(codeId, updates) {
        return await this.updateRow(config.SHEET_NAMES.CODES_GST, codeId, updates, 'id');
    }
    
    async deleteGSTCode(codeId) {
        return await this.deleteRow(config.SHEET_NAMES.CODES_GST, codeId, 'id');
    }
    
    async getFCodes() {
        return await this.getAllRows(config.SHEET_NAMES.CODES_F);
    }
    
    async addFCode(codeData) {
        return await this.addRow(config.SHEET_NAMES.CODES_F, codeData);
    }
    
    async updateFCode(codeId, updates) {
        return await this.updateRow(config.SHEET_NAMES.CODES_F, codeId, updates, 'id');
    }
    
    async getInsiteCodes() {
        return await this.getAllRows(config.SHEET_NAMES.CODES_INSITE);
    }
    
    async addInsiteCode(codeData) {
        return await this.addRow(config.SHEET_NAMES.CODES_INSITE, codeData);
    }
    
    async updateInsiteCode(codeId, updates) {
        return await this.updateRow(config.SHEET_NAMES.CODES_INSITE, codeId, updates, 'id');
    }
    
    // ডায়মন্ড মেথডস
    async getDiamondPackages() {
        return await this.getAllRows(config.SHEET_NAMES.DIAMOND);
    }
    
    async addDiamondPackage(packageData) {
        return await this.addRow(config.SHEET_NAMES.DIAMOND, packageData);
    }
    
    async updateDiamondPackage(packageId, updates) {
        return await this.updateRow(config.SHEET_NAMES.DIAMOND, packageId, updates, 'id');
    }
    
    async deleteDiamondPackage(packageId) {
        return await this.deleteRow(config.SHEET_NAMES.DIAMOND, packageId, 'id');
    }
    
    // সেটিংস মেথডস
    async getSettings() {
        const settings = await this.getAllRows(config.SHEET_NAMES.SETTINGS);
        const settingsObj = {};
        
        settings.forEach(setting => {
            settingsObj[setting.key] = setting.value;
        });
        
        return settingsObj;
    }
    
    async updateSetting(key, value) {
        const settings = await this.getAllRows(config.SHEET_NAMES.SETTINGS);
        const setting = settings.find(s => s.key === key);
        
        if (setting) {
            return await this.updateRow(config.SHEET_NAMES.SETTINGS, setting.id, {
                value: value,
                updatedAt: new Date().toISOString(),
                updatedBy: 'admin'
            }, 'id');
        } else {
            return await this.addRow(config.SHEET_NAMES.SETTINGS, {
                key: key,
                value: value,
                updatedAt: new Date().toISOString(),
                updatedBy: 'admin',
                description: 'User updated'
            });
        }
    }
    
    // অ্যাডমিন লগস
    async addAdminLog(logData) {
        return await this.addRow(config.SHEET_NAMES.ADMIN_LOGS, {
            ...logData,
            timestamp: logData.timestamp || new Date().toISOString()
        });
    }
    
    async getAdminLogs(limit = 100) {
        const logs = await this.getAllRows(config.SHEET_NAMES.ADMIN_LOGS);
        return logs
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }
    
    // ================== ব্যাকআপ এবং রিস্টোর ==================
    
    async backupData() {
        try {
            const backup = {};
            
            for (const [key, sheetName] of Object.entries(config.SHEET_NAMES)) {
                backup[sheetName] = await this.getSheetData(sheetName);
            }
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupData = {
                timestamp: timestamp,
                data: backup
            };
            
            // ফাইলে সেভ করুন
            const fs = require('fs');
            const path = require('path');
            const backupDir = path.join(__dirname, '../../backups');
            
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
            fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
            
            console.log(`✅ ব্যাকআপ তৈরি হয়েছে: ${backupFile}`);
            return backupFile;
        } catch (error) {
            console.error('❌ ব্যাকআপ করতে ত্রুটি:', error);
            throw error;
        }
    }
    
    async restoreData(backupFile) {
        try {
            const fs = require('fs');
            const path = require('path');
            
            if (!fs.existsSync(backupFile)) {
                throw new Error('ব্যাকআপ ফাইল পাওয়া যায়নি');
            }
            
            const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
            
            for (const [sheetName, data] of Object.entries(backupData.data)) {
                await this.updateSheetData(sheetName, data);
            }
            
            console.log(`✅ ডেটা রিস্টোর হয়েছে: ${backupFile}`);
            return true;
        } catch (error) {
            console.error('❌ ডেটা রিস্টোর করতে ত্রুটি:', error);
            throw error;
        }
    }
}

module.exports = GoogleSheetsAPI;
