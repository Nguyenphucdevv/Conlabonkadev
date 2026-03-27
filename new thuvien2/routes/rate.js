const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Database connection configuration
const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5433,
    options: '-c search_path=public'
};

// Ensure the password is a string
dbConfig.password = String(dbConfig.password);

// Create a database connection pool
const pool = new Pool(dbConfig);

// API to submit rating and comment
router.post('/', async (req, res) => {
    const { idThuVien, diemDanhGia, binhLuan } = req.body;

    console.log('Dữ liệu nhận được:', req.body); // Log để kiểm tra dữ liệu

    if (!idThuVien || (!diemDanhGia && !binhLuan)) {
        return res.status(400).json({
            success: false,
            message: 'Library ID and at least one rating or comment are required'
        });
    }

    try {
        // Get user ID from session, default to 1 if not logged in
        const userId = req.session.user ? req.session.user.id_user : 1;
        let saved = false;

        if (diemDanhGia) {
            if (diemDanhGia < 1 || diemDanhGia > 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Rating must be between 1 and 5'
                });
            }
            await pool.query(
                'INSERT INTO Danh_gia (ID_thuvien, Diem_so, id_user, Thoi_gian) VALUES ($1, $2, $3, NOW())',
                [idThuVien, diemDanhGia, userId]
            );
            saved = true;
        }

        if (binhLuan) {
            await pool.query(
                'INSERT INTO Binh_luan (ID_thuvien, Noi_dung, id_user, Thoi_gian) VALUES ($1, $2, $3, NOW())',
                [idThuVien, binhLuan, userId]
            );
            saved = true;
        }

        if (!saved) {
            return res.status(400).json({
                success: false,
                message: 'No data was saved'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Rating and comment saved successfully'
        });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;