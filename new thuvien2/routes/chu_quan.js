const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Middleware kiểm tra quyền chủ quán
router.use((req, res, next) => {
    console.log(`🏪 Chủ quán route được gọi: ${req.method} ${req.path}`);
    
    if (!req.session.user) {
        console.log('❌ Không có session, redirect đến login');
        return res.redirect('/login');
    }
    
    if (req.session.user.id_vaitro != 2) {
        console.log('❌ User không phải chủ quán, redirect đến trang chủ');
        return res.redirect('/');
    }
    
    console.log('✅ Session hợp lệ và user là chủ quán, tiếp tục');
    next();
});

// Route dashboard chủ quán
router.get('/', async (req, res) => {
    try {
        const userId = req.session.user.id_user;
        
         // Lấy thông tin thư viện mà chủ quán này quản lý
         const libraryQuery = `
         SELECT tv.* 
         FROM thu_vien tv
         WHERE tv.id_thuvien = $1
     `;
     
     const libraryResult = await pool.query(libraryQuery, [user.id_thuvien]);
        
        if (libraryResult.rows.length === 0) {
            return res.render('error', { 
                message: 'Bạn chưa được phân công quản lý thư viện nào. Vui lòng liên hệ Admin.' 
            });
        }
        
        const library = libraryResult.rows[0];
        
        res.render('chu_quan_dashboard', { 
            user: req.session.user,
            library: library,
            title: 'Dashboard Chủ quán - ' + library.ten_thuvien
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi tải dashboard chủ quán:', error);
        res.status(500).render('error', { message: 'Lỗi server' });
    }
});

// Route quản lý sách của thư viện
router.get('/sach', async (req, res) => {
    try {
        const userId = req.session.user.id_user;
        
        // Lấy thông tin thư viện của chủ quán
         // Lấy thông tin thư viện của chủ quán
         const libraryQuery = `
         SELECT tv.* 
         FROM thu_vien tv
         WHERE tv.id_thuvien = $1
     `;
     
     const libraryResult = await pool.query(libraryQuery, [user.id_thuvien]);
        
        if (libraryResult.rows.length === 0) {
            return res.status(404).render('error', { message: 'Không tìm thấy thư viện' });
        }
        
        const library = libraryResult.rows[0];
        
        // Lấy danh sách sách trong thư viện
        const booksQuery = `
            SELECT s.*, ts.so_luong, tl.ten_theloai
            FROM sach s
            JOIN thu_vien_sach ts ON s.id_sach = ts.id_sach
            LEFT JOIN the_loai tl ON s.id_theloai = tl.id_theloai
            WHERE ts.id_thuvien = $1
            ORDER BY s.ten_sach
        `;
        
        const booksResult = await pool.query(booksQuery, [library.id_thuvien]);
        
        res.render('chu_quan_sach', {
            user: req.session.user,
            library: library,
            books: booksResult.rows,
            title: 'Quản lý sách - ' + library.ten_thuvien
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi lấy danh sách sách:', error);
        res.status(500).render('error', { message: 'Lỗi server' });
    }
});

module.exports = router;
