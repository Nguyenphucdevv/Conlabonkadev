const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Kiểm tra biến môi trường
const requiredEnvVars = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD'];
requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        console.error(`Error: ${varName} is not defined in .env file`);
        process.exit(1);
    }
});

// Cấu hình kết nối PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5433,
    options: '-c search_path=public'
});

// Kiểm tra kết nối
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to database:', err.stack);
        process.exit(1);
    }
    console.log('Connected to database successfully:', process.env.DB_NAME);
    release();
});

// Hiển thị trang đăng ký
router.get('/', (req, res) => {
    res.render('register', { error: null });
});

// Xử lý đăng ký
router.post('/', async (req, res) => {
    const { hoTen, soDienThoai, email, taiKhoan, matKhau } = req.body;

    // Kiểm tra độ dài của tài khoản và mật khẩu
    const fields = { taiKhoan, matKhau };
    for (const [fieldName, value] of Object.entries(fields)) {
        if (value.length < 5 || value.length > 16) {
            return res.render('register', { error: `Trường ${fieldName} phải từ 5 đến 16 ký tự!` });
        }
    }

    try {
        // Kiểm tra xem bảng nguoi_dung có tồn tại không
        const checkTableQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'nguoi_dung'
            );
        `;
        const tableExistsResult = await pool.query(checkTableQuery);
        const tableExists = tableExistsResult.rows[0].exists;

        if (!tableExists) {
            throw new Error('Table nguoi_dung does not exist in schema public');
        }

        // Kiểm tra tai_khoan và email đã tồn tại chưa
        const checkDuplicateQuery = `
            SELECT tai_khoan, email 
            FROM public.nguoi_dung 
            WHERE tai_khoan = $1 OR email = $2
        `;
        const duplicateResult = await pool.query(checkDuplicateQuery, [taiKhoan, email]);
        if (duplicateResult.rows.length > 0) {
            return res.render('register', { error: 'Tài khoản hoặc email đã tồn tại!' });
        }

        // Lưu thông tin vào bảng nguoi_dung (không mã hóa mật khẩu)
        const query = `
            INSERT INTO public.nguoi_dung (ho_ten, so_dt, email, tai_khoan, mat_khau, id_vaitro)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id_user
        `;
        const values = [hoTen, soDienThoai, email, taiKhoan, matKhau, 3]; // Lưu mật khẩu gốc
        const result = await pool.query(query, values);

        // Chuyển hướng về trang đăng nhập sau khi đăng ký thành công
        res.redirect('/login');
    } catch (err) {
        console.error(err.stack);
        res.render('register', { error: 'Đăng ký thất bại: ' + err.message });
    }
});

module.exports = router;