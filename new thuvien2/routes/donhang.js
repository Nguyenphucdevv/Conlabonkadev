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

// Route GET /admin/don_hang - Xem danh sách đơn hàng
router.get('/', async (req, res) => {
    try {
        // Lấy danh sách đơn hàng kèm thông tin khách hàng
        const donHangResult = await pool.query(`
            SELECT 
                dh.id_don_hang,
                dh.ngay_dat,
                dh.trang_thai,
                dh.tong_tien,
                dh.phuong_thuc_thanh_toan,
                dh.ngay_giao_du_kien,
                kh.ten_khach_hang,
                kh.so_dien_thoai,
                kh.dia_chi,
                kh.email,
                COUNT(ct.id_chi_tiet) as so_loai_sach,
                SUM(ct.so_luong) as tong_so_luong_sach
            FROM don_hang dh
            JOIN khach_hang kh ON dh.id_khach_hang = kh.id_khach_hang
            LEFT JOIN chi_tiet_don_hang ct ON dh.id_don_hang = ct.id_don_hang
            GROUP BY 
                dh.id_don_hang, dh.ngay_dat, dh.trang_thai, dh.tong_tien, 
                dh.phuong_thuc_thanh_toan, dh.ngay_giao_du_kien,
                kh.ten_khach_hang, kh.so_dien_thoai, kh.dia_chi, kh.email
            ORDER BY dh.ngay_dat DESC
        `);

        // Thống kê đơn hàng theo trạng thái
        const thongKeResult = await pool.query(`
            SELECT 
                trang_thai,
                COUNT(*) as so_luong,
                SUM(tong_tien) as tong_doanh_thu
            FROM don_hang
            GROUP BY trang_thai
        `);

        // Lấy danh sách QR code đã cấu hình
        let qrConfigs = [];
        try {
            const qrResult = await pool.query(`
                SELECT 
                    id_config,
                    payment_method,
                    qr_image,
                    account_number,
                    account_name,
                    bank_name,
                    is_active
                FROM payment_config
                ORDER BY payment_method ASC
            `);
            qrConfigs = qrResult.rows;
        } catch (err) {
            console.log('⚠️ Không thể lấy QR config:', err.message);
        }

        res.render('donhang', {
            donHang: donHangResult.rows,
            thongKe: thongKeResult.rows,
            qrConfigs: qrConfigs,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('❌ Lỗi khi lấy danh sách đơn hàng:', error);
        res.status(500).json({ error: 'Lỗi server', details: error.message });
    }
});

// Route GET /admin/don_hang/api/:id - Lấy thông tin đơn hàng qua API (bao gồm ảnh minh chứng)
router.get('/api/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Lấy thông tin đơn hàng bao gồm payment_proof_image
        const donHangResult = await pool.query(`
            SELECT 
                dh.*,
                kh.ten_khach_hang,
                kh.so_dien_thoai,
                kh.dia_chi,
                kh.email
            FROM don_hang dh
            JOIN khach_hang kh ON dh.id_khach_hang = kh.id_khach_hang
            WHERE dh.id_don_hang = $1
        `, [id]);

        if (donHangResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đơn hàng' 
            });
        }

        res.json({
            success: true,
            donHang: donHangResult.rows[0]
        });
    } catch (error) {
        console.error('❌ Lỗi khi lấy thông tin đơn hàng:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            details: error.message 
        });
    }
});

// Route GET /admin/don_hang/:id - Xem chi tiết đơn hàng
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Lấy thông tin đơn hàng và khách hàng (bao gồm payment_proof_image)
        const donHangResult = await pool.query(`
            SELECT 
                dh.*,
                kh.ten_khach_hang,
                kh.so_dien_thoai,
                kh.dia_chi,
                kh.email,
                kh.ghi_chu as ghi_chu_khach
            FROM don_hang dh
            JOIN khach_hang kh ON dh.id_khach_hang = kh.id_khach_hang
            WHERE dh.id_don_hang = $1
        `, [id]);

        if (donHangResult.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
        }

        // Lấy chi tiết sách trong đơn hàng
        const chiTietResult = await pool.query(`
            SELECT 
                ct.*,
                s.tac_gia,
                s.nam_xuat_ban
            FROM chi_tiet_don_hang ct
            LEFT JOIN sach s ON ct.id_sach = s.id_sach
            WHERE ct.id_don_hang = $1
        `, [id]);

        // Lấy lịch sử thay đổi trạng thái
        const lichSuResult = await pool.query(`
            SELECT *
            FROM lich_su_don_hang
            WHERE id_don_hang = $1
            ORDER BY ngay_thay_doi DESC
        `, [id]);

        res.render('donhang_chitiet', {
            donHang: donHangResult.rows[0],
            chiTiet: chiTietResult.rows,
            lichSu: lichSuResult.rows
        });
    } catch (error) {
        console.error('❌ Lỗi khi lấy chi tiết đơn hàng:', error);
        res.status(500).json({ error: 'Lỗi server', details: error.message });
    }
});

// Route POST /admin/don_hang/update-status/:id - Cập nhật trạng thái đơn hàng
router.post('/update-status/:id', async (req, res) => {
    const { id } = req.params;
    const { trang_thai, ghi_chu, ly_do_huy } = req.body;

    console.log('🔄 Cập nhật trạng thái đơn hàng:', { id, trang_thai, ghi_chu });

    try {
        // Kiểm tra trạng thái hợp lệ
        const validStatuses = [
            'Chờ xác nhận',
            'Chờ thanh toán',
            'Đã xác nhận',
            'Đang chuẩn bị',
            'Đang giao hàng',
            'Đã giao',
            'Đã hủy'
        ];

        if (!validStatuses.includes(trang_thai)) {
            return res.redirect(`/admin/don_hang?error=Trạng thái không hợp lệ`);
        }

        // Cập nhật trạng thái
        let updateQuery = 'UPDATE don_hang SET trang_thai = $1';
        let params = [trang_thai];
        let paramIndex = 2;

        // Nếu đơn hàng bị hủy, lưu lý do
        if (trang_thai === 'Đã hủy' && ly_do_huy) {
            updateQuery += `, ly_do_huy = $${paramIndex}`;
            params.push(ly_do_huy);
            paramIndex++;
        }

        // Nếu đơn hàng đã giao, lưu ngày hoàn thành
        if (trang_thai === 'Đã giao') {
            updateQuery += `, ngay_hoan_thanh = CURRENT_TIMESTAMP`;
        }

        updateQuery += `, ngay_cap_nhat = CURRENT_TIMESTAMP WHERE id_don_hang = $${paramIndex}`;
        params.push(id);

        await pool.query(updateQuery, params);

        // Ghi log vào lịch sử (nếu có ghi chú từ admin)
        if (ghi_chu) {
            await pool.query(
                `UPDATE lich_su_don_hang 
                 SET ghi_chu = $1, nguoi_thuc_hien = $2 
                 WHERE id_don_hang = $3 
                 AND trang_thai_moi = $4 
                 AND ngay_thay_doi = (
                     SELECT MAX(ngay_thay_doi) 
                     FROM lich_su_don_hang 
                     WHERE id_don_hang = $3
                 )`,
                [ghi_chu, 'Admin', id, trang_thai]
            );
        }

        console.log('✅ Cập nhật trạng thái thành công');
        res.redirect(`/admin/don_hang?success=Cập nhật trạng thái thành công`);
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật trạng thái:', error);
        res.redirect(`/admin/don_hang?error=Lỗi khi cập nhật: ${error.message}`);
    }
});

// Route POST /admin/don_hang/delete/:id - Xóa đơn hàng (chỉ khi chưa xác nhận hoặc đã hủy)
router.post('/delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Kiểm tra trạng thái đơn hàng
        const donHangResult = await pool.query(
            'SELECT trang_thai FROM don_hang WHERE id_don_hang = $1',
            [id]
        );

        if (donHangResult.rows.length === 0) {
            return res.redirect('/admin/don_hang?error=Không tìm thấy đơn hàng');
        }

        const trang_thai = donHangResult.rows[0].trang_thai;

        // Chỉ cho phép xóa đơn hàng chờ xác nhận hoặc đã hủy
        if (trang_thai !== 'Chờ xác nhận' && trang_thai !== 'Đã hủy') {
            return res.redirect('/admin/don_hang?error=Chỉ có thể xóa đơn hàng Chờ xác nhận hoặc Đã hủy');
        }

        // Xóa đơn hàng (cascade sẽ tự động xóa chi tiết và lịch sử)
        await pool.query('DELETE FROM don_hang WHERE id_don_hang = $1', [id]);

        console.log('✅ Xóa đơn hàng thành công:', id);
        res.redirect('/admin/don_hang?success=Xóa đơn hàng thành công');
    } catch (error) {
        console.error('❌ Lỗi khi xóa đơn hàng:', error);
        res.redirect(`/admin/don_hang?error=Lỗi khi xóa: ${error.message}`);
    }
});

// ========================================
// QUẢN LÝ QR CODE THANH TOÁN
// ========================================

// Route GET /admin/don_hang/qr-config - Lấy danh sách QR config (API)
router.get('/qr-config', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id_config,
                payment_method,
                qr_image,
                account_number,
                account_name,
                bank_name,
                is_active,
                updated_at
            FROM payment_config
            ORDER BY payment_method ASC
        `);
        res.json({ success: true, configs: result.rows });
    } catch (error) {
        console.error('❌ Lỗi khi lấy QR config:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Route GET /admin/don_hang/qr-config/:id - Lấy QR config theo ID (API)
router.get('/qr-config/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT * FROM payment_config WHERE id_config = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy cấu hình!' });
        }
        res.json({ success: true, config: result.rows[0] });
    } catch (error) {
        console.error('❌ Lỗi khi lấy QR config:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Route POST /admin/don_hang/qr-config - Cập nhật hoặc tạo mới QR config
router.post('/qr-config', uploadQRCode.single('qr_image'), async (req, res) => {
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
        console.error('❌ Lỗi khi cập nhật QR config:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật cấu hình QR code: ' + error.message
        });
    }
});

// Route DELETE /admin/don_hang/qr-config/:id - Xóa QR config
router.delete('/qr-config/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `DELETE FROM payment_config WHERE id_config = $1 RETURNING *`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy cấu hình để xóa!' });
        }
        res.json({ success: true, message: 'Đã xóa cấu hình thành công!' });
    } catch (error) {
        console.error('❌ Lỗi khi xóa QR config:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi xóa cấu hình: ' + error.message });
    }
});

module.exports = router;

