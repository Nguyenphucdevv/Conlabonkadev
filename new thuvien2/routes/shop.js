const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cấu hình kết nối PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5433,
    options: '-c search_path=public'
});

// Route GET /shop - Hiển thị cửa hàng sách
router.get('/', async (req, res) => {
    try {
        // Lấy danh sách sách với số lượng tồn là slton
        const booksResult = await pool.query(`
            SELECT 
                s.id_sach, 
                s.ten_sach, 
                s.tac_gia, 
                s.nam_xuat_ban, 
                s.id_theloai,
                s.slton as so_luong,
                COALESCE(s.gia, 0) as gia,
                s.gia_goc,
                tl.ten_theloai
            FROM sach s
            LEFT JOIN the_loai tl ON s.id_theloai = tl.id_theloai
            ORDER BY s.id_sach ASC
        `);

        // Lấy danh sách thể loại
        const categoriesResult = await pool.query(`
            SELECT id_theloai, ten_theloai 
            FROM the_loai 
            ORDER BY id_theloai ASC
        `);

        // Lấy thông tin user từ session (để phân biệt giỏ hàng)
        const currentUser = req.session.user || null;
        const userId = currentUser ? (currentUser.id_user || currentUser.id_nguoidung || null) : null;

        res.render('shop', {
            books: booksResult.rows,
            categories: categoriesResult.rows,
            currentUser: currentUser,
            userId: userId
        });
    } catch (error) {
        console.error('❌ Lỗi khi lấy danh sách sách:', error);
        res.status(500).json({ error: 'Lỗi server', details: error.message });
    }
});

// Route GET /shop/my-orders - API lấy đơn hàng của user hiện tại
router.get('/my-orders', async (req, res) => {
    try {
        const id_user = req.session.user && (req.session.user.id_user || req.session.user.id_nguoidung)
            ? parseInt(req.session.user.id_user || req.session.user.id_nguoidung) 
            : null;

        if (!id_user) {
            return res.json({ success: false, message: 'Bạn chưa đăng nhập!', orders: [] });
        }

        // Lấy đơn hàng của user
        const ordersResult = await pool.query(`
            SELECT 
                dh.id_don_hang,
                dh.ngay_dat,
                dh.trang_thai,
                dh.tong_tien,
                dh.phuong_thuc_thanh_toan,
                dh.ngay_giao_du_kien,
                dh.ngay_hoan_thanh,
                dh.payment_proof_image,
                COUNT(ct.id_chi_tiet) as so_loai_sach,
                SUM(ct.so_luong) as tong_so_luong_sach
            FROM don_hang dh
            JOIN khach_hang kh ON dh.id_khach_hang = kh.id_khach_hang
            LEFT JOIN chi_tiet_don_hang ct ON dh.id_don_hang = ct.id_don_hang
            WHERE kh.id_user = $1
            GROUP BY 
                dh.id_don_hang, dh.ngay_dat, dh.trang_thai, dh.tong_tien,
                dh.phuong_thuc_thanh_toan, dh.ngay_giao_du_kien, 
                dh.ngay_hoan_thanh, dh.payment_proof_image
            ORDER BY dh.ngay_dat DESC
        `, [id_user]);

        res.json({ success: true, orders: ordersResult.rows });
    } catch (error) {
        console.error('❌ Lỗi khi lấy đơn hàng:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', details: error.message });
    }
});

// Route GET /shop/order-detail/:id - API lấy chi tiết đơn hàng
router.get('/order-detail/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const id_user = req.session.user && (req.session.user.id_user || req.session.user.id_nguoidung)
            ? parseInt(req.session.user.id_user || req.session.user.id_nguoidung) 
            : null;

        if (!id_user) {
            return res.json({ success: false, message: 'Bạn chưa đăng nhập!' });
        }

        // Lấy chi tiết đơn hàng (chỉ của user hiện tại)
        const detailResult = await pool.query(`
            SELECT 
                ct.id_sach,
                ct.ten_sach,
                ct.so_luong,
                ct.don_gia,
                ct.thanh_tien
            FROM chi_tiet_don_hang ct
            JOIN don_hang dh ON ct.id_don_hang = dh.id_don_hang
            JOIN khach_hang kh ON dh.id_khach_hang = kh.id_khach_hang
            WHERE ct.id_don_hang = $1 AND kh.id_user = $2
        `, [id, id_user]);

        if (detailResult.rows.length === 0) {
            return res.json({ success: false, message: 'Không tìm thấy đơn hàng!' });
        }

        res.json({ success: true, items: detailResult.rows });
    } catch (error) {
        console.error('❌ Lỗi khi lấy chi tiết đơn hàng:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', details: error.message });
    }
});

// Route GET /shop/checkout - Hiển thị trang thanh toán
router.get('/checkout', async (req, res) => {
    try {
        res.render('checkout');
    } catch (error) {
        console.error('❌ Lỗi khi hiển thị trang checkout:', error);
        res.status(500).json({ error: 'Lỗi server', details: error.message });
    }
});

// Route POST /shop/checkout - Xử lý đặt hàng
router.post('/checkout', async (req, res) => {
    const { 
        ten_khach_hang, 
        email, 
        so_dien_thoai, 
        dia_chi, 
        ghi_chu_khach,
        phuong_thuc_thanh_toan,
        cart_data // Dữ liệu giỏ hàng dạng JSON
    } = req.body;

    // Lấy thông tin user đăng nhập từ session
    // LƯU Ý: Bảng nguoi_dung sử dụng cột id_user (không phải id_nguoidung)
    const id_user = req.session.user && (req.session.user.id_user || req.session.user.id_nguoidung)
        ? parseInt(req.session.user.id_user || req.session.user.id_nguoidung) 
        : null;

    console.log('📦 Nhận đơn hàng mới:', {
        ten_khach_hang,
        email,
        so_dien_thoai,
        dia_chi,
        phuong_thuc_thanh_toan,
        id_user,
        session_user: req.session.user,
        has_session: !!req.session.user
    });

    // Kiểm tra dữ liệu đầu vào
    if (!ten_khach_hang || !so_dien_thoai || !dia_chi) {
        return res.status(400).json({ 
            success: false, 
            message: 'Vui lòng điền đầy đủ thông tin bắt buộc!' 
        });
    }

    if (!cart_data) {
        return res.status(400).json({ 
            success: false, 
            message: 'Giỏ hàng trống!' 
        });
    }

    let cart;
    try {
        cart = JSON.parse(cart_data);
    } catch (error) {
        return res.status(400).json({ 
            success: false, 
            message: 'Dữ liệu giỏ hàng không hợp lệ!' 
        });
    }

    if (!cart || cart.length === 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Giỏ hàng trống!' 
        });
    }

    // Bắt đầu transaction
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // 1. Thêm thông tin khách hàng (hoặc cập nhật nếu đã tồn tại user)
        let id_khach_hang;
        
        if (id_user) {
            console.log('🔐 User đã đăng nhập với id_user:', id_user);
            
            // Nếu user đã đăng nhập, kiểm tra xem đã có khách hàng chưa
            const existingKH = await client.query(
                `SELECT id_khach_hang FROM khach_hang WHERE id_user = $1`,
                [id_user]
            );
            
            if (existingKH.rows.length > 0) {
                // Cập nhật thông tin khách hàng (đảm bảo id_user vẫn được giữ)
                id_khach_hang = existingKH.rows[0].id_khach_hang;
                await client.query(
                    `UPDATE khach_hang 
                     SET ten_khach_hang = $1, email = $2, so_dien_thoai = $3, dia_chi = $4, ghi_chu = $5,
                         id_user = $6
                     WHERE id_khach_hang = $7`,
                    [ten_khach_hang, email, so_dien_thoai, dia_chi, ghi_chu_khach, id_user, id_khach_hang]
                );
                console.log('✅ Đã cập nhật khách hàng:', id_khach_hang, 'với id_user:', id_user);
            } else {
                // Tạo mới khách hàng với id_user
                const khachHangResult = await client.query(
                    `INSERT INTO khach_hang (ten_khach_hang, email, so_dien_thoai, dia_chi, ghi_chu, id_user) 
                     VALUES ($1, $2, $3, $4, $5, $6) 
                     RETURNING id_khach_hang, id_user`,
                    [ten_khach_hang, email, so_dien_thoai, dia_chi, ghi_chu_khach, id_user]
                );
                id_khach_hang = khachHangResult.rows[0].id_khach_hang;
                console.log('✅ Đã tạo khách hàng mới với user:', {
                    id_khach_hang,
                    id_user: khachHangResult.rows[0].id_user
                });
            }
        } else {
            console.log('⚠️ User chưa đăng nhập, tạo khách hàng guest');
            // Khách hàng chưa đăng nhập
            const khachHangResult = await client.query(
                `INSERT INTO khach_hang (ten_khach_hang, email, so_dien_thoai, dia_chi, ghi_chu) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING id_khach_hang`,
                [ten_khach_hang, email, so_dien_thoai, dia_chi, ghi_chu_khach]
            );
            id_khach_hang = khachHangResult.rows[0].id_khach_hang;
            console.log('✅ Đã tạo khách hàng (guest):', id_khach_hang);
        }

        // 2. Tính tổng tiền và kiểm tra tồn kho
        let tong_tien = 0;
        for (let item of cart) {
            // Kiểm tra số lượng tồn kho
            const sachResult = await client.query(
                'SELECT slton FROM sach WHERE id_sach = $1',
                [item.id]
            );

            if (sachResult.rows.length === 0) {
                throw new Error(`Sách ID ${item.id} không tồn tại!`);
            }

            const slton = parseInt(sachResult.rows[0].slton) || 0;
            if (slton < item.quantity) {
                throw new Error(`Sách "${item.name}" chỉ còn ${slton} quyển!`);
            }

            tong_tien += item.price * item.quantity;
        }

        console.log('💰 Tổng tiền:', tong_tien);

        // 3. Tạo đơn hàng
        // Xác định trạng thái dựa trên phương thức thanh toán
        let trang_thai = 'Chờ xác nhận';
        if (phuong_thuc_thanh_toan && phuong_thuc_thanh_toan !== 'Thanh toán khi nhận hàng') {
            trang_thai = 'Chờ thanh toán'; // Chờ upload ảnh minh chứng
        }

        const donHangResult = await client.query(
            `INSERT INTO don_hang 
             (id_khach_hang, tong_tien, trang_thai, phuong_thuc_thanh_toan, ghi_chu, ngay_giao_du_kien) 
             VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + INTERVAL '3 days') 
             RETURNING id_don_hang`,
            [
                id_khach_hang, 
                tong_tien, 
                trang_thai, 
                phuong_thuc_thanh_toan || 'Thanh toán khi nhận hàng',
                'Đơn hàng từ website'
            ]
        );

        const id_don_hang = donHangResult.rows[0].id_don_hang;
        console.log('✅ Đã tạo đơn hàng:', id_don_hang);

        // 4. Thêm chi tiết đơn hàng và trừ số lượng tồn
        for (let item of cart) {
            const thanh_tien = item.price * item.quantity;

            // Thêm chi tiết đơn hàng
            await client.query(
                `INSERT INTO chi_tiet_don_hang 
                 (id_don_hang, id_sach, ten_sach, so_luong, don_gia, thanh_tien) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [id_don_hang, item.id, item.name, item.quantity, item.price, thanh_tien]
            );

            // Trừ số lượng tồn kho
            await client.query(
                `UPDATE sach 
                 SET slton = slton - $1 
                 WHERE id_sach = $2`,
                [item.quantity, item.id]
            );

            console.log(`✅ Đã thêm sách: ${item.name} x ${item.quantity}`);
        }

        // Commit transaction
        await client.query('COMMIT');
        console.log('🎉 Đặt hàng thành công!');
        console.log('📋 Chi tiết đơn hàng:', {
            id_don_hang,
            id_khach_hang,
            id_user,
            tong_tien
        });

        res.json({
            success: true,
            message: 'Đặt hàng thành công! Admin sẽ xác nhận đơn hàng của bạn sớm.',
            order_id: id_don_hang,
            redirect_url: '/shop?success=Đặt hàng thành công!'
        });

    } catch (error) {
        // Rollback nếu có lỗi
        await client.query('ROLLBACK');
        console.error('❌ Lỗi khi đặt hàng:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi đặt hàng!',
            details: error.message
        });
    } finally {
        client.release();
    }
});

// Cấu hình multer để upload ảnh minh chứng chuyển khoản
const paymentProofStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/images/payment_proofs/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const orderId = req.body.order_id || 'unknown';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `proof_${orderId}_${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const uploadPaymentProof = multer({
    storage: paymentProofStorage,
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

// Route GET /shop/payment-qr - Lấy QR code thanh toán
router.get('/payment-qr', async (req, res) => {
    // Đảm bảo luôn trả về JSON và không bị redirect
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Accept', 'application/json');
    
    try {
        const paymentMethod = decodeURIComponent(req.query.method || '');

        console.log('🔍 Lấy QR code cho phương thức:', paymentMethod);
        console.log('🔍 Request path:', req.path);
        console.log('🔍 Request URL:', req.url);
        console.log('🔍 Request originalUrl:', req.originalUrl);

        // Lấy QR code từ database (bảng cấu hình thanh toán)
        let qrData = {
            qr_image: null,
            account_number: null,
            account_name: null,
            bank_name: null
        };

        // Kiểm tra xem có bảng cấu hình thanh toán không
        try {
            const qrResult = await pool.query(
                `SELECT qr_image, account_number, account_name, bank_name 
                 FROM payment_config 
                 WHERE payment_method = $1 AND is_active = true 
                 LIMIT 1`,
                [paymentMethod]
            );

            if (qrResult.rows.length > 0) {
                qrData = {
                    qr_image: qrResult.rows[0].qr_image,
                    account_number: qrResult.rows[0].account_number,
                    account_name: qrResult.rows[0].account_name,
                    bank_name: qrResult.rows[0].bank_name
                };
                console.log('✅ Tìm thấy QR code:', qrData);
            } else {
                console.log('⚠️ Không tìm thấy QR code cho phương thức:', paymentMethod);
            }
        } catch (err) {
            // Bảng chưa tồn tại hoặc lỗi query, dùng giá trị mặc định
            console.log('⚠️ Lỗi khi query payment_config:', err.message);
            console.log('⚠️ Dùng giá trị mặc định cho QR code');
            // Không throw error, chỉ log và tiếp tục
        }

        // Luôn trả về JSON, ngay cả khi không có dữ liệu
        console.log('📤 Trả về QR data:', qrData);
        return res.json(qrData);
    } catch (error) {
        console.error('❌ Lỗi khi lấy QR code:', error);
        console.error('❌ Error stack:', error.stack);
        // Đảm bảo trả về JSON ngay cả khi có lỗi
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy QR code',
            error: error.message,
            qr_image: null,
            account_number: null,
            account_name: null,
            bank_name: null
        });
    }
});

// Route POST /shop/upload-payment-proof - Upload ảnh minh chứng chuyển khoản
router.post('/upload-payment-proof', uploadPaymentProof.single('proof_image'), async (req, res) => {
    try {
        const { order_id, payment_method, payment_note } = req.body;

        if (!order_id) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu mã đơn hàng!'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn ảnh minh chứng!'
            });
        }

        const proofImagePath = `/images/payment_proofs/${req.file.filename}`;

        // Cập nhật đơn hàng với ảnh minh chứng
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Cập nhật đơn hàng: thêm ảnh minh chứng và ghi chú
            await client.query(
                `UPDATE don_hang 
                 SET ghi_chu = COALESCE(ghi_chu || E'\n' || $1, $1),
                     payment_proof_image = $2
                 WHERE id_don_hang = $3`,
                [
                    `[Ảnh minh chứng] ${payment_note || 'Khách hàng đã upload ảnh minh chứng chuyển khoản'}`,
                    proofImagePath,
                    order_id
                ]
            );

            // Trạng thái vẫn là "Chờ thanh toán" để admin xác nhận

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Đã upload ảnh minh chứng thành công! Admin sẽ xác nhận đơn hàng của bạn sớm.',
                proof_image: proofImagePath
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Lỗi khi upload ảnh minh chứng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi upload ảnh minh chứng',
            error: error.message
        });
    }
});

// Route POST /shop/cancel-order/:id - Hủy đơn hàng
router.post('/cancel-order/:id', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);

        if (!orderId || isNaN(orderId)) {
            return res.status(400).json({
                success: false,
                message: 'Mã đơn hàng không hợp lệ!'
            });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Kiểm tra đơn hàng có tồn tại không
            const orderResult = await client.query(
                `SELECT id_don_hang, trang_thai FROM don_hang WHERE id_don_hang = $1`,
                [orderId]
            );

            if (orderResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng!'
                });
            }

            const order = orderResult.rows[0];

            // Chỉ cho phép hủy nếu đơn hàng chưa được xác nhận
            if (order.trang_thai !== 'Chờ xác nhận' && order.trang_thai !== 'Chờ thanh toán') {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể hủy đơn hàng đã được xác nhận!'
                });
            }

            // Hoàn trả số lượng tồn kho
            const chiTietResult = await client.query(
                `SELECT id_sach, so_luong FROM chi_tiet_don_hang WHERE id_don_hang = $1`,
                [orderId]
            );

            for (const item of chiTietResult.rows) {
                await client.query(
                    `UPDATE sach SET slton = slton + $1 WHERE id_sach = $2`,
                    [item.so_luong, item.id_sach]
                );
            }

            // Cập nhật trạng thái đơn hàng thành "Đã hủy"
            await client.query(
                `UPDATE don_hang 
                 SET trang_thai = 'Đã hủy', 
                     ly_do_huy = 'Khách hàng hủy đơn hàng'
                 WHERE id_don_hang = $1`,
                [orderId]
            );

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Đã hủy đơn hàng thành công!'
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Lỗi khi hủy đơn hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi hủy đơn hàng',
            error: error.message
        });
    }
});

module.exports = router;

