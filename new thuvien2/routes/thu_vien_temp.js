const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'thuvien',
    password: process.env.DB_PASSWORD || '1',
    port: process.env.DB_PORT || 5433,
    options: '-c search_path=public'
});

// Log database configuration (without password)
console.log('=== DATABASE CONFIG ===');
console.log('DB_USER:', process.env.DB_USER || 'postgres');
console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
console.log('DB_NAME:', process.env.DB_NAME || 'thuvien');
console.log('DB_PORT:', process.env.DB_PORT || 5433);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '[HIDDEN]' : 'NOT SET');
console.log('========================');
