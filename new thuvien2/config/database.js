const { Pool } = require('pg');


const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'thuvien',
    password: process.env.DB_PASSWORD || '1',
    port: process.env.DB_PORT || 5433,
    options: '-c search_path=public'
};

// Log c?u h�nh database (kh�ng hi?n th? password)
console.log('=== DATABASE CONFIG ===');
console.log('DB_USER:', dbConfig.user);
console.log('DB_HOST:', dbConfig.host);
console.log('DB_NAME:', dbConfig.database);
console.log('DB_PORT:', dbConfig.port);
console.log('DB_PASSWORD:', dbConfig.password ? '[HIDDEN]' : 'NOT SET');
console.log('========================');

// T?o pool connection
const pool = new Pool(dbConfig);

// Test k?t n?i database
pool.connect((err, client, release) => {
    if (err) {
        console.error(' L?i k?t n?i database:', err.message);
        console.error(' H�y ki?m tra:');
        console.error('   1. PostgreSQL c� dang ch?y kh�ng?');
        console.error('   2. Th�ng tin dang nh?p database c� d�ng kh�ng?');
        console.error('   3. Database c� t?n t?i kh�ng?');
        console.error('   4. File .env c� d�ng d?nh d?ng kh�ng?');
    } else {
        console.log(' K?t n?i database th�nh c�ng!');
        console.log(' Database:', dbConfig.database);
        console.log(' Host:', dbConfig.host);
        release();
    }
});

module.exports = pool;
