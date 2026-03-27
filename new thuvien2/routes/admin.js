const express = require('express');
const router = express.Router();
const path = require('path'); // Added for serving static files
const pool = require('../config/database'); // Import pool để truy vấn database
const multer = require('multer');
const fs = require('fs');

// Middleware kiểm tra session và quyền admin
router.use((req, res, next) => {
    console.log(`🔍 Admin route được gọi: ${req.method} ${req.path}`);
    console.log(`📍 Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
    console.log(`🔑 Session user:`, req.session.user);
    console.log(`🔍 Request URL: ${req.url}`);
    console.log(`🔍 Request path: ${req.path}`);
    console.log(`🔍 Request originalUrl: ${req.originalUrl}`);
    console.log(`🔍 Router mounted at: /admin`);
    
    // Kiểm tra session
    if (!req.session.user) {
        console.log('❌ Không có session, redirect đến login');
        return res.redirect('/login');
    }
    
    // Kiểm tra quyền admin
    console.log('🔍 Kiểm tra quyền admin:', {
        id_vaitro: req.session.user.id_vaitro,
        type: typeof req.session.user.id_vaitro
    });
    
    if (req.session.user.id_vaitro != 1) {
        console.log('❌ User không phải admin, redirect đến trang chủ');
        return res.redirect('/');
    }
    
    console.log('✅ Session hợp lệ và user là admin, tiếp tục');
    next();
});

router.get('/', (req, res) => {
    console.log('🏠 Admin dashboard route được gọi');
    console.log('🔍 Session user:', req.session.user);
    console.log('🔍 Đang cố gắng render admin.ejs...');
    
    try {
        res.render('admin', { 
            user: req.session.user,
            title: 'Admin Dashboard'
        });
        console.log('✅ Đã render admin.ejs thành công');
    } catch (error) {
        console.error('❌ Lỗi khi render admin.ejs:', error);
        res.status(500).send('Lỗi khi render trang admin');
    }
});

// Route test đơn giản
router.get('/ping', (req, res) => {
    console.log('🏓 Ping route được gọi');
    res.json({ 
        success: true, 
        message: 'Admin router hoạt động!',
        timestamp: new Date().toISOString(),
        path: req.path,
        url: req.url
    });
});

// Route test HTML đơn giản
router.get('/test-html', (req, res) => {
    console.log('🧪 Test HTML route được gọi');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Test Admin</title></head>
        <body>
            <h1>Admin Route Hoạt Động!</h1>
            <p>Path: ${req.path}</p>
            <p>URL: ${req.url}</p>
            <p>User: ${JSON.stringify(req.session.user)}</p>
            <a href="/admin">Quay lại Admin Dashboard</a>
        </body>
        </html>
    `);
});

// Route quản lý ảnh thư viện
router.get('/images', (req, res) => {
    res.render('admin-images');
});

// Route xem ảnh (trang xem_anh.ejs)
router.get('/xem-anh', (req, res) => {
    console.log('📸 Route /admin/xem-anh được gọi');
    try {
        res.render('xem_anh', { 
            title: 'Quản Lý Ảnh - Admin Panel',
            message: 'Chào mừng bạn đến với trang quản lý ảnh trong Admin Panel! Bạn có thể xem và quản lý tất cả ảnh thư viện.'
        });
        console.log('✅ Đã render xem_anh.ejs thành công');
    } catch (error) {
        console.error('❌ Lỗi khi render xem_anh.ejs:', error);
        res.status(500).send('Lỗi khi render trang xem ảnh');
    }
});

// Route test để kiểm tra
router.get('/test', (req, res) => {
    console.log('🧪 Admin test route được gọi');
    console.log('📊 Request headers:', req.headers);
    console.log('🍪 Cookies:', req.cookies);
    res.json({ 
        success: true, 
        message: 'Admin test route hoạt động!',
        path: req.path,
        url: req.url,
        originalUrl: req.originalUrl
    });
});

// Route test admin-map
router.get('/test-admin-map', (req, res) => {
    console.log('🧪 Test admin-map route được gọi');
    res.json({ 
        success: true, 
        message: 'Admin-map test route hoạt động!',
        availableRoutes: ['/admin/admin-map', '/admin/test', '/admin/images'],
        requestInfo: {
            method: req.method,
            path: req.path,
            url: req.url,
            originalUrl: req.originalUrl,
            baseUrl: req.baseUrl
        }
    });
});

// Route test để kiểm tra tất cả routes
router.get('/routes-info', (req, res) => {
    console.log('📋 Routes info route được gọi');
    res.json({ 
        success: true, 
        message: 'Routes info',
        routerInfo: {
            mountedAt: '/admin',
            availableRoutes: [
                '/admin/admin-map',
                '/admin/test', 
                '/admin/images',
                '/admin/xem-anh',
                '/admin/test-admin-map',
                '/admin/routes-info'
            ],
            requestInfo: {
                method: req.method,
                path: req.path,
                url: req.url,
                originalUrl: req.originalUrl,
                baseUrl: req.baseUrl
            }
        }
    });
});

// Route xem bản đồ thư viện
router.get('/admin-map', (req, res) => {
    console.log('🗺️ Admin map route được gọi: /admin/admin-map');
    console.log('📊 Request details:', {
        method: req.method,
        path: req.path,
        url: req.url,
        originalUrl: req.originalUrl,
        session: req.session,
        user: req.session.user
    });
    
    console.log('🔍 Kiểm tra file admin-map.ejs...');
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../views/admin-map.ejs');
    
    if (fs.existsSync(filePath)) {
        console.log('✅ File admin-map.ejs tồn tại tại:', filePath);
    } else {
        console.log('❌ File admin-map.ejs KHÔNG tồn tại tại:', filePath);
        return res.status(404).json({
            success: false,
            message: 'File admin-map.ejs không tồn tại',
            path: filePath,
            currentDir: __dirname,
            viewsDir: path.join(__dirname, '../views')
        });
    }
    
    try {
        console.log('🔄 Đang render admin-map.ejs...');
        res.render('admin-map', { 
            user: req.session.user,
            title: 'Admin - Quản lý Bản đồ Thư viện'
        });
        console.log('✅ Admin map page rendered thành công');
    } catch (error) {
        console.error('❌ Lỗi khi render admin map:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi render admin map',
            error: error.message,
            stack: error.stack
        });
    }
});

// Route serve admin-map.js
router.get('/admin-map.js', (req, res) => {
    console.log('📜 Route /admin/admin-map.js được gọi');
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'admin-map.js'));
});

// Test route để kiểm tra JavaScript
router.get('/test-js', (req, res) => {
    console.log('🧪 Test JS route được gọi');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Test Admin Map JS</title></head>
        <body>
            <h1>🧪 Test Admin Map JavaScript</h1>
            <div id="test-container">Container test</div>
            <script>
                console.log("🚀 Test script loaded!");
                document.getElementById("test-container").innerHTML = "JavaScript hoạt động!";
            </script>
            <script src="/admin/admin-map.js"></script>
            <p>Kiểm tra console để xem log từ admin-map.js</p>
        </body>
        </html>
    `);
});

// Debug route để hiển thị tất cả routes
router.get('/debug-routes', (req, res) => {
    console.log('🐛 Debug routes được gọi');
    const routes = [];
    
    // Lấy tất cả routes từ router
    router.stack.forEach((middleware) => {
        if (middleware.route) {
            const path = middleware.route.path;
            const methods = Object.keys(middleware.route.methods);
            routes.push({ path, methods });
        }
    });
    
    res.json({
        success: true,
        message: 'Debug routes',
        routerPath: '/admin',
        availableRoutes: routes,
        requestInfo: {
            method: req.method,
            path: req.path,
            url: req.url,
            originalUrl: req.originalUrl,
            baseUrl: req.baseUrl
        }
    });
});

// Route để hiển thị thống kê thư viện - thể loại - số lượng sách
// PHẢI ĐẶT TRƯỚC các route động để tránh conflict
router.get('/thongke', async (req, res) => {
  try {
    console.log("📊 ===== ROUTE /admin/thongke ĐƯỢC GỌI =====");
    console.log("📊 Request path:", req.path);
    console.log("📊 Request url:", req.url);
    console.log("📊 Request originalUrl:", req.originalUrl);
    console.log("📊 ===== BẮT ĐẦU LẤY THỐNG KÊ THƯ VIỆN - THỂ LOẠI =====");

    // Lấy tất cả thư viện
    const librariesResult = await pool.query(`
      SELECT id_thuvien, ten_thuvien, dia_chi
      FROM thu_vien
      ORDER BY ten_thuvien ASC
    `);

    const libraries = [];

    // Với mỗi thư viện, lấy thống kê thể loại
    for (const lib of librariesResult.rows) {
      const categoryStats = await pool.query(`
        SELECT 
          tl.id_theloai,
          tl.ten_theloai,
          COUNT(DISTINCT tvs.id_sach) as so_loai_sach,
          COALESCE(SUM(tvs.so_luong), 0) as tong_so_luong_sach
        FROM thu_vien_sach tvs
        JOIN sach s ON tvs.id_sach = s.id_sach
        LEFT JOIN the_loai tl ON s.id_theloai = tl.id_theloai
        WHERE tvs.id_thuvien = $1
          AND tl.id_theloai IS NOT NULL
        GROUP BY tl.id_theloai, tl.ten_theloai
        ORDER BY tl.ten_theloai ASC
      `, [lib.id_thuvien]);

      const the_loai = categoryStats.rows.map(row => ({
        id_theloai: row.id_theloai,
        ten_theloai: row.ten_theloai,
        so_loai_sach: parseInt(row.so_loai_sach) || 0,
        tong_so_luong_sach: parseInt(row.tong_so_luong_sach) || 0,
      }));

      const tong_so_loai_sach = the_loai.length;
      const tong_so_luong_sach = the_loai.reduce(
        (sum, tl) => sum + tl.tong_so_luong_sach,
        0
      );

      libraries.push({
        id_thuvien: lib.id_thuvien,
        ten_thuvien: lib.ten_thuvien,
        dia_chi: lib.dia_chi,
        the_loai: the_loai,
        tong_so_loai_sach: tong_so_loai_sach,
        tong_so_luong_sach: tong_so_luong_sach,
      });
    }

    console.log(`✅ Đã lấy thống kê cho ${libraries.length} thư viện`);

    res.render("thongke", {
      libraries: libraries,
      title: "Thống kê Thư viện - Thể loại",
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy thống kê:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).render("error", {
      message: "Có lỗi xảy ra khi lấy thống kê: " + error.message,
    });
  }
});

// Route để xem quản lý sách thư viện
router.get('/admin/library-books', async (req, res, next) => {
    try {
        // Lấy danh sách tất cả thư viện với thống kê sách
        const query = `
            SELECT 
                tv.id_thuvien,
                tv.ten_thuvien,
                tv.dia_chi,
                COUNT(s.id_sach) as tong_so_sach,
                SUM(s.slton) as tong_so_luong_con,
                SUM(s.tongsl) as tong_so_luong_ban_dau
            FROM thu_vien tv
            LEFT JOIN sach s ON tv.id_thuvien = s.id_thuvien
            GROUP BY tv.id_thuvien, tv.ten_thuvien, tv.dia_chi
            ORDER BY tv.ten_thuvien
        `;
        
        const result = await pool.query(query);
        
        res.render('admin-library-books', {
            title: 'Quản lý sách thư viện',
            libraries: result.rows
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi lấy danh sách thư viện:', error);
        res.status(500).render('error', { message: 'Lỗi server' });
    }
});

// Route để xem chi tiết sách của một thư viện
router.get('/admin/library-books/:libraryId', async (req, res, next) => {
    try {
        const { libraryId } = req.params;
        
        // Lấy thông tin thư viện
        const libraryQuery = `
            SELECT id_thuvien, ten_thuvien, dia_chi, so_dien_thoai, email, mo_ta
            FROM thu_vien 
            WHERE id_thuvien = $1
        `;
        const libraryResult = await pool.query(libraryQuery, [libraryId]);
        
        if (libraryResult.rows.length === 0) {
            return res.status(404).render('error', { message: 'Không tìm thấy thư viện' });
        }
        
        const library = libraryResult.rows[0];
        
        // Lấy danh sách sách trong thư viện
        const booksQuery = `
            SELECT 
                s.id_sach,
                s.ten_sach,
                s.tac_gia,
                s.nam_xuat_ban,
                s.slton,
                s.tongsl,
                tl.ten_theloai,
                CASE 
                    WHEN s.slton > 0 THEN 'Còn sách'
                    ELSE 'Hết sách'
                END as trang_thai
            FROM sach s
            LEFT JOIN the_loai tl ON s.id_theloai = tl.id_theloai
            WHERE s.id_thuvien = $1
            ORDER BY s.ten_sach
        `;
        const booksResult = await pool.query(booksQuery, [libraryId]);
        
        // Thống kê theo thể loại
        const statsQuery = `
            SELECT 
                tl.ten_theloai,
                COUNT(s.id_sach) as tong_so_sach,
                SUM(s.slton) as tong_so_luong_con,
                SUM(s.tongsl) as tong_so_luong_ban_dau
            FROM sach s
            LEFT JOIN the_loai tl ON s.id_theloai = tl.id_theloai
            WHERE s.id_thuvien = $1
            GROUP BY tl.id_theloai, tl.ten_theloai
            ORDER BY tong_so_luong_con DESC
        `;
        const statsResult = await pool.query(statsQuery, [libraryId]);
        
        res.render('admin-library-books-detail', {
            title: `Sách thư viện - ${library.ten_thuvien}`,
            library: library,
            books: booksResult.rows,
            statistics: statsResult.rows
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi lấy chi tiết sách thư viện:', error);
        res.status(500).render('error', { message: 'Lỗi server' });
    }
});

// ========================================
// QUẢN LÝ QR CODE THANH TOÁN
// ========================================

// Cấu hình multer để upload QR code
const qrCodeStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/images/payment_proofs/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const paymentMethod = req.body.payment_method || 'qr';
        const sanitizedMethod = paymentMethod.replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `qr_${sanitizedMethod}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const uploadQRCode = multer({
    storage: qrCodeStorage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ cho phép file ảnh!'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Route GET /admin/payment-config - Hiển thị trang quản lý QR code
router.get('/payment-config', async (req, res) => {
    try {
        // Lấy tất cả cấu hình thanh toán
        const configResult = await pool.query(`
            SELECT 
                id_config,
                payment_method,
                qr_image,
                account_number,
                account_name,
                bank_name,
                is_active,
                created_at,
                updated_at
            FROM payment_config
            ORDER BY payment_method ASC
        `);

        res.render('admin-payment-config', {
            title: 'Quản lý QR Code Thanh toán',
            paymentConfigs: configResult.rows,
            user: req.session.user
        });
    } catch (error) {
        console.error('❌ Lỗi khi lấy cấu hình thanh toán:', error);
        res.status(500).render('error', {
            message: 'Lỗi khi lấy cấu hình thanh toán: ' + error.message
        });
    }
});

// Route POST /admin/payment-config - Cập nhật hoặc tạo mới cấu hình QR code
router.post('/payment-config', uploadQRCode.single('qr_image'), async (req, res) => {
    try {
        const { payment_method, account_number, account_name, bank_name, is_active } = req.body;
        
        if (!payment_method) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập phương thức thanh toán!'
            });
        }

        let qrImagePath = null;
        
        // Nếu có upload ảnh mới
        if (req.file) {
            qrImagePath = `/images/payment_proofs/${req.file.filename}`;
        } else {
            // Nếu không upload ảnh mới, giữ nguyên ảnh cũ (nếu có)
            const existingResult = await pool.query(
                `SELECT qr_image FROM payment_config WHERE payment_method = $1`,
                [payment_method]
            );
            if (existingResult.rows.length > 0) {
                qrImagePath = existingResult.rows[0].qr_image;
            }
        }

        const isActive = is_active === 'true' || is_active === true || is_active === 'on';

        // Cập nhật hoặc tạo mới
        const result = await pool.query(`
            INSERT INTO payment_config (payment_method, qr_image, account_number, account_name, bank_name, is_active, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            ON CONFLICT (payment_method) 
            DO UPDATE SET
                qr_image = COALESCE(EXCLUDED.qr_image, payment_config.qr_image),
                account_number = EXCLUDED.account_number,
                account_name = EXCLUDED.account_name,
                bank_name = EXCLUDED.bank_name,
                is_active = EXCLUDED.is_active,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [payment_method, qrImagePath, account_number || null, account_name || null, bank_name || null, isActive]);

        res.json({
            success: true,
            message: 'Đã cập nhật cấu hình QR code thành công!',
            config: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật cấu hình QR code:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật cấu hình QR code: ' + error.message
        });
    }
});

// Route GET /admin/payment-config/:id - Lấy thông tin cấu hình theo ID
router.get('/payment-config/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT * FROM payment_config WHERE id_config = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy cấu hình!'
            });
        }

        res.json({
            success: true,
            config: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Lỗi khi lấy cấu hình:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy cấu hình: ' + error.message
        });
    }
});

// Route DELETE /admin/payment-config/:id - Xóa cấu hình
router.delete('/payment-config/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `DELETE FROM payment_config WHERE id_config = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy cấu hình để xóa!'
            });
        }

        res.json({
            success: true,
            message: 'Đã xóa cấu hình thành công!'
        });
    } catch (error) {
        console.error('❌ Lỗi khi xóa cấu hình:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa cấu hình: ' + error.message
        });
    }
});

module.exports = router;
