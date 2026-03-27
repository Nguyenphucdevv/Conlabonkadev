const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

// Cấu hình kết nối PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5433,
    options: '-c search_path=public'
});

// Hàm làm sạch tên file để đảm bảo an toàn
const sanitizeFileName = (fileName) => {
    return fileName
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Thay ký tự không hợp lệ bằng '_'
        .replace(/\.\./g, '_'); // Ngăn chặn các chuỗi như '../'
};

// Cấu hình multer để lưu file PDF
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'public', 'pdfs'));
    },
    filename: (req, file, cb) => {
        const { id } = req.params; // Lấy id_sach từ route
        // Sử dụng tên file gốc, làm sạch để đảm bảo an toàn
        let fileName = sanitizeFileName(file.originalname);
        // Nếu file đã tồn tại, thêm hậu tố id_sach để tránh xung đột
        const filePath = path.join(__dirname, '..', 'public', 'pdfs', fileName);
        fs.access(filePath)
            .then(() => {
                // File đã tồn tại, thêm id_sach vào tên file
                const extension = path.extname(fileName);
                const baseName = path.basename(fileName, extension);
                fileName = `${baseName}_${id}${extension}`;
                cb(null, fileName);
            })
            .catch(() => {
                // File chưa tồn tại, sử dụng tên gốc
                cb(null, fileName);
            });
    }
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận tệp PDF'), false);
        }
    }
});

// Hàm lấy danh sách tệp PDF trong public/pdfs
const getPdfFiles = async () => {
    const pdfsDir = path.join(__dirname, '..', 'public', 'pdfs');
    try {
        const files = await fs.readdir(pdfsDir);
        return files
            .filter(file => file.endsWith('.pdf'))
            .map(file => `/pdfs/${file}`);
    } catch (error) {
        console.error('Lỗi khi đọc thư mục /pdfs:', error);
        return [];
    }
};

// Route GET /admin/sach
router.get('/', async (req, res) => {
    try {
        const sachResult = await pool.query(`
            SELECT s.id_sach, s.ten_sach, s.tac_gia, s.nam_xuat_ban, s.id_theloai, s.slton, s.tongsl, s.digital_file, 
                   COALESCE(s.gia, 0) as gia, s.gia_goc, tl.ten_theloai
            FROM sach s
            LEFT JOIN the_loai tl ON s.id_theloai = tl.id_theloai
            ORDER BY s.id_sach ASC
        `);
        const theLoaiResult = await pool.query('SELECT * FROM The_loai ORDER BY id_theloai ASC');
        const pdfFiles = await getPdfFiles();
        
        // Truyền thông báo success/error từ query string
        res.render('sach', { 
            sach: sachResult.rows, 
            theloai: theLoaiResult.rows, 
            pdfFiles,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Lỗi server', details: error.message });
    }
});

// Thêm sách
router.post('/add', upload.single('digital_file'), async (req, res) => {
    const { ID_sach, Ten_sach, Tac_gia, Nam_xuat_ban, ID_theloai, slton, tongsl, gia, gia_goc } = req.body;
    const digital_file = req.file ? `/pdfs/${req.file.filename}` : null;

    // Kiểm tra dữ liệu đầu vào
    if (!Ten_sach || !ID_theloai) {
        return res.status(400).json({ error: 'Tên sách và thể loại là bắt buộc' });
    }
    if (Nam_xuat_ban < 0 || Nam_xuat_ban > new Date().getFullYear()) {
        return res.status(400).json({ error: 'Năm xuất bản không hợp lệ' });
    }
    if (slton < 0 || tongsl < 0) {
        return res.status(400).json({ error: 'Số lượng tồn và tổng số lượng phải không âm' });
    }
    if (parseInt(slton) > parseInt(tongsl)) {
        return res.status(400).json({ error: 'Số lượng tồn không được lớn hơn tổng số lượng' });
    }
    
    // Xử lý giá tiền
    const giaValue = gia ? parseFloat(gia) : 0;
    const giaGocValue = gia_goc && gia_goc.trim() !== '' ? parseFloat(gia_goc) : null;
    
    if (giaValue < 0) {
        return res.status(400).json({ error: 'Giá bán không được âm' });
    }
    if (giaGocValue !== null && giaGocValue < 0) {
        return res.status(400).json({ error: 'Giá gốc không được âm' });
    }
    if (giaGocValue !== null && giaGocValue < giaValue) {
        return res.status(400).json({ error: 'Giá gốc phải lớn hơn hoặc bằng giá bán' });
    }

    try {
        // Kiểm tra xem có trường gia trong database không
        const checkColumnQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sach' AND column_name = 'gia'
        `;
        const columnCheck = await pool.query(checkColumnQuery);
        
        if (columnCheck.rows.length > 0) {
            // Có trường gia, thêm vào INSERT
            await pool.query(
                'INSERT INTO sach (id_sach, ten_sach, tac_gia, nam_xuat_ban, id_theloai, slton, tongsl, digital_file, gia, gia_goc) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                [ID_sach, Ten_sach, Tac_gia, Nam_xuat_ban, ID_theloai, slton, tongsl, digital_file, giaValue, giaGocValue]
            );
        } else {
            // Chưa có trường gia, INSERT không có gia
            await pool.query(
                'INSERT INTO sach (id_sach, ten_sach, tac_gia, nam_xuat_ban, id_theloai, slton, tongsl, digital_file) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [ID_sach, Ten_sach, Tac_gia, Nam_xuat_ban, ID_theloai, slton, tongsl, digital_file]
            );
        }
        res.redirect('/admin/sach?success=Sách đã được thêm thành công');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Lỗi khi thêm sách', details: error.message });
    }
});

// Xóa sách
router.post('/delete/:id', async (req, res) => {
    const id = req.params.id;
    try {
        // Đặt digital_file = null trước khi xóa sách
        await pool.query('UPDATE Sach SET digital_file = NULL WHERE id_sach = $1', [id]);
        await pool.query('DELETE FROM Sach WHERE id_sach = $1', [id]);
        res.redirect('/admin/sach');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Lỗi khi xóa sách', details: error.message });
    }
});

// Route lấy thông tin sách để sửa
router.get('/update/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const sachResult = await pool.query(
            `SELECT s.id_sach, s.ten_sach, s.tac_gia, s.nam_xuat_ban, s.id_theloai, s.slton, s.tongsl, s.digital_file, 
                    COALESCE(s.gia, 0) as gia, s.gia_goc, tl.ten_theloai 
             FROM sach s 
             LEFT JOIN the_loai tl ON s.id_theloai = tl.id_theloai 
             WHERE s.id_sach = $1`,
            [id]
        );
        const theLoaiResult = await pool.query('SELECT * FROM The_loai ORDER BY id_theloai ASC');
        const pdfFiles = await getPdfFiles();

        if (sachResult.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy sách' });
        }

        res.render('updateSach', { sach: sachResult.rows[0], theloai: theLoaiResult.rows, pdfFiles });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin sách:', error);
        res.status(500).json({ error: 'Lỗi server', details: error.message });
    }
});

// Route cập nhật sách
router.post('/update/:id', upload.single('digital_file'), async (req, res) => {
    const { id } = req.params;
    const { Ten_sach, Tac_gia, Nam_xuat_ban, ID_theloai, slton, tongsl, existing_digital_file, delete_digital_file, gia, gia_goc } = req.body;
    let digital_file = req.file ? `/pdfs/${req.file.filename}` : existing_digital_file || null;

    // Kiểm tra dữ liệu đầu vào
    if (!Ten_sach || !ID_theloai) {
        return res.status(400).json({ error: 'Tên sách và thể loại là bắt buộc' });
    }
    if (Nam_xuat_ban < 0 || Nam_xuat_ban > new Date().getFullYear()) {
        return res.status(400).json({ error: 'Năm xuất bản không hợp lệ' });
    }
    if (slton < 0 || tongsl < 0) {
        return res.status(400).json({ error: 'Số lượng tồn và tổng số lượng phải không âm' });
    }
    if (parseInt(slton) > parseInt(tongsl)) {
        return res.status(400).json({ error: 'Số lượng tồn không được lớn hơn tổng số lượng' });
    }
    
    // Xử lý giá tiền
    const giaValue = gia ? parseFloat(gia) : 0;
    const giaGocValue = gia_goc && gia_goc.trim() !== '' ? parseFloat(gia_goc) : null;
    
    if (giaValue < 0) {
        return res.status(400).json({ error: 'Giá bán không được âm' });
    }
    if (giaGocValue !== null && giaGocValue < 0) {
        return res.status(400).json({ error: 'Giá gốc không được âm' });
    }
    if (giaGocValue !== null && giaGocValue < giaValue) {
        return res.status(400).json({ error: 'Giá gốc phải lớn hơn hoặc bằng giá bán' });
    }

    try {
        // Nếu người dùng chọn xóa liên kết PDF, đặt digital_file = null
        if (delete_digital_file === 'true') {
            digital_file = null;
        }

        // Kiểm tra xem có trường gia trong database không
        const checkColumnQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sach' AND column_name = 'gia'
        `;
        const columnCheck = await pool.query(checkColumnQuery);
        
        let result;
        if (columnCheck.rows.length > 0) {
            // Có trường gia, UPDATE với gia
            result = await pool.query(
                `UPDATE sach 
                 SET ten_sach = $1, tac_gia = $2, nam_xuat_ban = $3, id_theloai = $4, slton = $5, tongsl = $6, digital_file = $7, gia = $8, gia_goc = $9
                 WHERE id_sach = $10`,
                [Ten_sach, Tac_gia, Nam_xuat_ban, ID_theloai, slton, tongsl, digital_file, giaValue, giaGocValue, id]
            );
        } else {
            // Chưa có trường gia, UPDATE không có gia
            result = await pool.query(
                `UPDATE sach 
                 SET ten_sach = $1, tac_gia = $2, nam_xuat_ban = $3, id_theloai = $4, slton = $5, tongsl = $6, digital_file = $7 
                 WHERE id_sach = $8`,
                [Ten_sach, Tac_gia, Nam_xuat_ban, ID_theloai, slton, tongsl, digital_file, id]
            );
        }

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Không tìm thấy sách để cập nhật' });
        }

        res.redirect('/admin/sach?success=Sách đã được cập nhật thành công');
    } catch (error) {
        console.error('Lỗi khi cập nhật sách:', error);
        res.status(500).json({ error: 'Lỗi server', details: error.message });
    }
});

// Route cập nhật số lượng sách - ĐẶT TRƯỚC module.exports
router.post('/update-quantity', async (req, res) => {
    const { sach_id, quantity_type, new_quantity, reason } = req.body;
    
    console.log('🔄 Cập nhật số lượng sách:', { sach_id, quantity_type, new_quantity, reason });

    try {
        // Kiểm tra dữ liệu đầu vào
        if (!sach_id || !quantity_type || !new_quantity) {
            return res.redirect('/admin/sach?error=Thiếu thông tin bắt buộc');
        }

        const quantity = parseInt(new_quantity);
        if (isNaN(quantity) || quantity < 0) {
            return res.redirect('/admin/sach?error=Số lượng không hợp lệ');
        }

        // Lấy thông tin sách hiện tại
        const sachResult = await pool.query(
            'SELECT id_sach, ten_sach, tongsl, slton FROM Sach WHERE id_sach = $1',
            [sach_id]
        );

        if (sachResult.rows.length === 0) {
            return res.redirect('/admin/sach?error=Không tìm thấy sách');
        }

        const currentBook = sachResult.rows[0];
        const currentTongSl = parseInt(currentBook.tongsl) || 0;
        const currentSlTon = parseInt(currentBook.slton) || 0;

        let newTongSl, newSlTon;

        if (quantity_type === 'add') {
            // Thêm sách mới về
            newTongSl = currentTongSl + quantity;
            newSlTon = currentSlTon + quantity;
            console.log(`➕ Thêm ${quantity} quyển sách "${currentBook.ten_sach}"`);
        } else if (quantity_type === 'set') {
            // Đặt lại số lượng
            newTongSl = quantity;
            newSlTon = quantity;
            console.log(` Đặt lại số lượng sách "${currentBook.ten_sach}" thành ${quantity}`);
        } else {
            return res.redirect('/admin/sach?error=Loại cập nhật không hợp lệ');
        }

        // Cập nhật số lượng trong database
        await pool.query(
            'UPDATE Sach SET tongsl = $1, slton = $2 WHERE id_sach = $3',
            [newTongSl, newSlTon, sach_id]
        );

        // Ghi log cập nhật
        console.log(`✅ Cập nhật thành công: ${currentBook.ten_sach}`);
        console.log(`   Từ: Tổng ${currentTongSl}, Tồn ${currentSlTon}`);
        console.log(`   Thành: Tổng ${newTongSl}, Tồn ${newSlTon}`);
        console.log(`   Lý do: ${reason || 'Không có'}`);

        res.redirect('/admin/sach?success=Cập nhật số lượng sách thành công!');
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật số lượng sách:', error);
        res.redirect('/admin/sach?error=Lỗi server: ' + error.message);
    }
});

// ============================================
// API GET /api/books - Lấy danh sách tất cả sách (JSON)
// Endpoint: GET /api/books
// ============================================
router.get('/books', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                s.id_sach,
                s.ten_sach,
                s.tac_gia,
                s.nam_xuat_ban,
                s.slton,
                s.tongsl,
                COALESCE(s.gia, 0) AS gia,
                s.gia_goc,
                tl.ten_theloai
            FROM sach s
            LEFT JOIN the_loai tl ON s.id_theloai = tl.id_theloai
            ORDER BY s.id_sach ASC
        `);

        res.json({
            success: true,
            total: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('❌ Lỗi GET /api/books:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Route test để kiểm tra route có hoạt động không
router.get('/test-route', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Route sach hoạt động bình thường',
        timestamp: new Date().toISOString()
    });
});

// Route test POST
router.post('/test-post', (req, res) => {
    res.json({ 
        success: true, 
        message: 'POST route sach hoạt động bình thường',
        body: req.body,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;