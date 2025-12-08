const fs = require('fs');
const path = require('path');

class Helpers {
    constructor() {
        this.adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim())) : [];
    }

    // ইউনিক আইডি জেনারেট
    generateId(length = 10) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // রেফারেল কোড জেনারেট
    generateReferralCode(userId) {
        const prefix = 'DV';
        const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
        const userIdPart = userId.toString(36).slice(-3).toUpperCase();
        return `${prefix}${userIdPart}${timestamp}`;
    }

    // টেলিগ্রাম ইউজারনেম ভ্যালিডেট
    validateUsername(username) {
        if (!username) return false;
        const regex = /^[a-zA-Z0-9_]{5,32}$/;
        return regex.test(username.replace('@', ''));
    }

    // ফোন নম্বর ভ্যালিডেট (বাংলাদেশ)
    validatePhoneNumber(phone) {
        if (!phone) return false;
        const regex = /^(?:\+88|88)?(01[3-9]\d{8})$/;
        return regex.test(phone);
    }

    // ইমেইল ভ্যালিডেট
    validateEmail(email) {
        if (!email) return false;
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    // এডমিন চেক
    isAdmin(userId) {
        return this.adminIds.includes(parseInt(userId));
    }

    // যুক্ত করুন এডমিন
    addAdmin(userId) {
        const id = parseInt(userId);
        if (!this.adminIds.includes(id)) {
            this.adminIds.push(id);
            return true;
        }
        return false;
    }

    // সরান এডমিন
    removeAdmin(userId) {
        const id = parseInt(userId);
        const index = this.adminIds.indexOf(id);
        if (index > -1) {
            this.adminIds.splice(index, 1);
            return true;
        }
        return false;
    }

    // ফরম্যাট টাকার মান
    formatMoney(amount) {
        if (typeof amount !== 'number') {
            amount = parseFloat(amount) || 0;
        }
        return `৳${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
    }

    // ফরম্যাট তারিখ
    formatDate(date, includeTime = true) {
        const d = new Date(date);
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        let formatted = d.toLocaleDateString('bn-BD', options);
        
        if (includeTime) {
            const time = d.toLocaleTimeString('bn-BD', {
                hour: '2-digit',
                minute: '2-digit'
            });
            formatted += ` ${time}`;
        }
        
        return formatted;
    }

    // রিলেটিভ টাইম (কতক্ষণ আগে)
    relativeTime(date) {
        const now = new Date();
        const past = new Date(date);
        const diff = Math.floor((now - past) / 1000); // সেকেন্ডে
        
        if (diff < 60) return 'এইমাত্র';
        if (diff < 3600) return `${Math.floor(diff / 60)} মিনিট আগে`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} ঘণ্টা আগে`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} দিন আগে`;
        if (diff < 2592000) return `${Math.floor(diff / 604800)} সপ্তাহ আগে`;
        if (diff < 31536000) return `${Math.floor(diff / 2592000)} মাস আগে`;
        return `${Math.floor(diff / 31536000)} বছর আগে`;
    }

    // ছবির URL ভ্যালিডেট
    validateImageUrl(url) {
        if (!url) return false;
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        return imageExtensions.some(ext => url.toLowerCase().endsWith(ext));
    }

    // লিংক ভ্যালিডেট
    validateUrl(url) {
        if (!url) return false;
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    // টেক্সট ট্রিম এবং ক্লিন
    cleanText(text, maxLength = 1000) {
        if (!text) return '';
        
        // HTML ট্যাগ রিমুভ
        let cleaned = text.replace(/<[^>]*>/g, '');
        
        // স্পেশাল ক্যারেক্টার হ্যান্ডেল
        cleaned = cleaned.replace(/&[a-z]+;/g, ' ');
        
        // এক্সট্রা স্পেস রিমুভ
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        
        // ম্যাক্স লেংথ চেক
        if (cleaned.length > maxLength) {
            cleaned = cleaned.substring(0, maxLength) + '...';
        }
        
        return cleaned;
    }

    // পাসওয়ার্ড জেনারেট
    generatePassword(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    // অ্যারে থেকে র্যান্ডম আইটেম
    getRandomItem(array) {
        if (!Array.isArray(array) || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    }

    // অ্যারে শাফেল
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // ফাইল সাইজ ফরম্যাট
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // JSON স্ট্রিংফাই সেফ
    safeStringify(obj) {
        try {
            return JSON.stringify(obj);
        } catch {
            return '{}';
        }
    }

    // JSON পার্স সেফ
    safeParse(str) {
        try {
            return JSON.parse(str);
        } catch {
            return null;
        }
    }

    // লজ ফাইল
    logToFile(type, message, data = null) {
        const logDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const date = new Date();
        const dateStr = date.toISOString().split('T')[0];
        const timeStr = date.toTimeString().split(' ')[0];
        
        const logFile = path.join(logDir, `${type}-${dateStr}.log`);
        const logEntry = `[${timeStr}] ${message} ${data ? JSON.stringify(data) : ''}\n`;
        
        fs.appendFileSync(logFile, logEntry, 'utf8');
    }

    // ইরর হ্যান্ডলার
    handleError(error, context = '') {
        console.error(`❌ Error${context ? ` in ${context}` : ''}:`, error);
        
        // লগ ফাইলে সেভ
        this.logToFile('error', context, {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        return {
            success: false,
            error: error.message,
            context: context
        };
    }

    // সফল রেসপন্স
    successResponse(data = null, message = 'সফল') {
        return {
            success: true,
            message: message,
            data: data,
            timestamp: new Date().toISOString()
        };
    }

    // ব্যর্থ রেসপন্স
    errorResponse(message = 'ব্যর্থ', error = null) {
        return {
            success: false,
            message: message,
            error: error,
            timestamp: new Date().toISOString()
        };
    }

    // টেলিগ্রাম মেসেজ ট্রিম (4096 ক্যারেক্টার লিমিট)
    trimTelegramMessage(text, maxLength = 4000) {
        if (!text || text.length <= maxLength) return text;
        
        // প্যারাগ্রাফ বাই প্যারাগ্রাফ কাটা
        const paragraphs = text.split('\n\n');
        let trimmed = '';
        
        for (const para of paragraphs) {
            if ((trimmed + '\n\n' + para).length <= maxLength) {
                trimmed += (trimmed ? '\n\n' : '') + para;
            } else {
                break;
            }
        }
        
        // যদি খুব লম্বা প্যারাগ্রাফ হয়
        if (!trimmed && text.length > maxLength) {
            trimmed = text.substring(0, maxLength - 3) + '...';
        }
        
        return trimmed;
    }

    // টেলিগ্রাম বাটন টেক্সট ট্রিম (64 ক্যারেক্টার লিমিট)
    trimButtonText(text, maxLength = 64) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    // নম্বর থেকে বাংলা সংখ্যা
    toBanglaNumber(num) {
        const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return num.toString().replace(/\d/g, digit => banglaDigits[digit]);
    }

    // বাংলা থেকে ইংরেজি সংখ্যা
    toEnglishNumber(str) {
        const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        
        let result = '';
        for (const char of str) {
            const index = banglaDigits.indexOf(char);
            result += index !== -1 ? englishDigits[index] : char;
        }
        return result;
    }

    // মাসের নাম বাংলায়
    getBanglaMonth(monthIndex) {
        const months = [
            'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
            'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
        ];
        return months[monthIndex] || '';
    }

    // সপ্তাহের দিন বাংলায়
    getBanglaDay(dayIndex) {
        const days = [
            'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার',
            'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
        ];
        return days[dayIndex] || '';
    }

    // কালেকশন প্যাজিনেট
    paginate(array, page, limit) {
        const total = array.length;
        const totalPages = Math.ceil(total / limit);
        const start = (page - 1) * limit;
        const end = start + limit;
        
        return {
            data: array.slice(start, end),
            page: page,
            limit: limit,
            total: total,
            totalPages: totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };
    }

    // ডিলে ফাংশন
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // রেট লিমিটার
    createRateLimiter(maxRequests, timeWindow) {
        const requests = new Map();
        
        return (userId) => {
            const now = Date.now();
            const userRequests = requests.get(userId) || [];
            
            // পুরানো রিকোয়েস্ট রিমুভ
            const recentRequests = userRequests.filter(time => now - time < timeWindow);
            
            if (recentRequests.length >= maxRequests) {
                return false; // রেট লিমিট এক্সিড
            }
            
            recentRequests.push(now);
            requests.set(userId, recentRequests);
            return true; // রিকোয়েস্ট অ্যালাউ
        };
    }

    // ইমোজি রিটার্ন বেসড অন ভ্যালু
    getEmojiByValue(value, type = 'status') {
        const emojis = {
            status: {
                active: '🟢',
                pending: '🟡',
                completed: '✅',
                rejected: '❌',
                banned: '🔴',
                inactive: '⚫'
            },
            task: {
                easy: '🟢',
                medium: '🟡',
                hard: '🔴',
                urgent: '🚨'
            },
            payment: {
                pending: '⏳',
                approved: '✅',
                rejected: '❌',
                paid: '💰'
            }
        };
        
        return emojis[type]?.[value] || '📌';
    }

    // প্রগ্রেস বার জেনারেট
    generateProgressBar(current, total, length = 10) {
        const percentage = Math.min(100, Math.max(0, (current / total) * 100));
        const filledLength = Math.round((percentage / 100) * length);
        const emptyLength = length - filledLength;
        
        const filledBar = '█'.repeat(filledLength);
        const emptyBar = '░'.repeat(emptyLength);
        
        return `${filledBar}${emptyBar} ${percentage.toFixed(1)}%`;
    }

    // ক্যাপচা জেনারেট
    generateCaptcha(length = 6) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let captcha = '';
        for (let i = 0; i < length; i++) {
            captcha += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return captcha;
    }

    // স্ট্রিং এনক্রিপ্ট (বেসিক)
    encrypt(text, key = process.env.ENCRYPTION_KEY || 'digital-vision') {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return Buffer.from(result).toString('base64');
    }

    // স্ট্রিং ডিক্রিপ্ট (বেসিক)
    decrypt(encrypted, key = process.env.ENCRYPTION_KEY || 'digital-vision') {
        const text = Buffer.from(encrypted, 'base64').toString();
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    }
}

module.exports = new Helpers();
