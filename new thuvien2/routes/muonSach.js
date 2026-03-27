const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Route hiển thị trang mượn sách
router.get('/', async (req, res) => {
    try {
        console.log('=== MUON SACH ROUTE DEBUG ===');
        console.log('1. Testing database connection...');
        
        // Test database connection first
        const testQuery = await pool.query('SELECT NOW()');
        console.log('2. Database connection OK:', testQuery.rows[0]);
        
        console.log('3. Checking if tables exist...');
        const tableCheck = await pool.query(`
            SELECT 
                EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'muon_sach') as muon_sach_exists,
                EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sach') as sach_exists
        `);
        console.log('4. Tables exist:', tableCheck.rows[0]);
        
        if (!tableCheck.rows[0].muon_sach_exists) {
            console.log('5. ERROR: muon_sach table does not exist!');
            return res.status(500).render('error', {
                title: 'Lỗi Database',
                message: 'Bảng muon_sach không tồn tại trong database',
                error: 'Vui lòng kiểm tra database schema'
            });
        }
        
        if (!tableCheck.rows[0].sach_exists) {
            console.log('5. ERROR: Sach table does not exist!');
            return res.status(500).render('error', {
                title: 'Lỗi Database',
                message: 'Bảng Sach không tồn tại trong database',
                error: 'Vui lòng kiểm tra database schema'
            });
        }
        
        console.log('5. Fetching sach data...');
        // Lấy danh sách sách
        const sachResult = await pool.query('SELECT id_sach, ten_sach FROM sach ORDER BY id_sach ASC');
        console.log('6. Đã lấy', sachResult.rows.length, 'sách');
        
        console.log('7. Fetching muon_sach data...');
        // Lấy danh sách mượn sách với LEFT JOIN để tránh lỗi nếu không có dữ liệu
        const muonSachResult = await pool.query(`
            SELECT ms.id_muonsach, ms.id_sach, ms.ten_nguoi_muon, ms.ngay_muon, ms.ngay_tra, 
                   COALESCE(s.ten_sach, 'Sách đã bị xóa') as ten_sach, 
                   ms.email_nguoi_muon, ms.so_dien_thoai, ms.ghi_chu, 
                   ms.thu_vien, ms.trang_thai, ms.ngay_tao
            FROM muon_sach ms
            LEFT JOIN sach s ON ms.id_sach = s.id_sach
            ORDER BY COALESCE(ms.ngay_tao, '1970-01-01'::timestamp) DESC
        `);
        
        console.log('8. Đã lấy', muonSachResult.rows.length, 'yêu cầu mượn sách');
        
        // Đảm bảo dữ liệu không null
        const sach = sachResult.rows || [];
        const muonSach = muonSachResult.rows || [];
        
        console.log('9. Rendering template with data...');
        console.log('10. Template rendered successfully');
        
        res.render('muonSach', { 
            sach: sach, 
            muonSach: muonSach 
        });
    } catch (error) {
        console.error('=== DATABASE ERROR DETAILS ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error detail:', error.detail);
        console.error('Error hint:', error.hint);
        console.error('Error stack:', error.stack);
        
        // Send more specific error message
        let errorMessage = 'Lỗi server';
        if (error.code === '42P01') {
            errorMessage = 'Bảng không tồn tại trong database';
        } else if (error.code === '28P01') {
            errorMessage = 'Lỗi xác thực database';
        } else if (error.code === '3D000') {
            errorMessage = 'Database không tồn tại';
        } else if (error.code === '08001') {
            errorMessage = 'Không thể kết nối database';
        }
        
        // Trả về error page thay vì plain text
        try {
            res.status(500).render('error', {
                title: 'Lỗi khi tải trang mượn sách',
                message: errorMessage,
                error: error.message
            });
        } catch (renderError) {
            console.error('Failed to render error page:', renderError);
            res.status(500).send(`
                <html>
                    <head><title>Lỗi Server</title></head>
                    <body style="font-family: Arial; padding: 50px;">
                        <h1>Lỗi khi tải trang mượn sách</h1>
                        <p><strong>Chi tiết:</strong> ${error.message}</p>
                        <p><strong>Code:</strong> ${error.code || 'N/A'}</p>
                        <a href="/admin">Về Trang Admin</a>
                    </body>
                </html>
            `);
        }
    }
});

// Route xử lý thêm mượn sách
router.post('/add', async (req, res) => {
    const { id_sach, ten_nguoi_muon, ngay_muon, ngay_tra, email_nguoi_muon, so_dien_thoai, thu_vien, ghi_chu } = req.body;
    try {
        // Kiểm tra số lượng tồn
        const sach = await pool.query('SELECT slton FROM sach WHERE id_sach = $1', [id_sach]);
        if (sach.rows.length === 0 || sach.rows[0].slton <= 0) {
            return res.status(400).send('Sách không còn trong kho');
        }

        // Thêm bản ghi mượn sách với trạng thái mặc định là "Chờ xử lý"
        await pool.query(
            `INSERT INTO muon_sach (id_sach, ngay_muon, ngay_tra, ten_nguoi_muon, email_nguoi_muon, so_dien_thoai, thu_vien, ghi_chu, trang_thai) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                id_sach, 
                ngay_muon, 
                ngay_tra || null, 
                ten_nguoi_muon,
                email_nguoi_muon || null,
                so_dien_thoai || null,
                thu_vien || null,
                ghi_chu || null,
                'Chờ xử lý' // Trạng thái mặc định
            ]
        );

        // Không cần giảm slton ở đây vì chỉ khi duyệt mới giảm số lượng
        console.log('✅ Đã thêm yêu cầu mượn sách mới với trạng thái "Chờ xử lý"');
        res.redirect('/admin/muon_sach?success=Thêm yêu cầu mượn sách thành công');
    } catch (error) {
        console.error('❌ Lỗi khi thêm mượn sách:', error);
        res.status(500).send('Lỗi khi mượn sách: ' + error.message);
    }
});

// Route hiển thị form sửa mượn sách
router.get('/update/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const muonSachResult = await pool.query(`
            SELECT ms.id_muonsach, ms.id_sach, ms.ten_nguoi_muon, ms.ngay_muon, ms.ngay_tra, s.ten_sach
            FROM muon_sach ms
            LEFT JOIN sach s ON ms.id_sach = s.id_sach
            WHERE ms.id_muonsach = $1
        `, [id]);
        const sachResult = await pool.query('SELECT id_sach, ten_sach FROM sach ORDER BY id_sach ASC');

        if (muonSachResult.rows.length === 0) {
            return res.status(404).send('Không tìm thấy bản ghi mượn sách');
        }

        res.render('updateMuonSach', {
            muonSach: muonSachResult.rows[0],
            sach: sachResult.rows
        });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin mượn sách:', error);
        res.status(500).send('Lỗi server');
    }
});

// Route xử lý cập nhật mượn sách
router.post('/update/:id', async (req, res) => {
    const { id } = req.params;
    const { id_sach, ten_nguoi_muon, ngay_muon, ngay_tra } = req.body;
    try {
        const result = await pool.query(
            `UPDATE muon_sach 
             SET id_sach = $1, ten_nguoi_muon = $2, ngay_muon = $3, ngay_tra = $4 
             WHERE id_muonsach = $5`,
            [id_sach, ten_nguoi_muon, ngay_muon, ngay_tra || null, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).send('Không tìm thấy bản ghi để cập nhật');
        }

        res.redirect('/admin/muon_sach');
    } catch (error) {
        console.error('Lỗi khi cập nhật mượn sách:', error);
        res.status(500).send('Lỗi server');
    }
});

// Route xử lý xóa mượn sách
router.get('/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const muonSach = await pool.query('SELECT id_sach, ngay_tra FROM muon_sach WHERE id_muonsach = $1', [id]);
        if (muonSach.rows.length === 0) {
            return res.status(404).send('Không tìm thấy bản ghi mượn sách');
        }

        await pool.query('DELETE FROM muon_sach WHERE id_muonsach = $1', [id]);

        // Tăng lại số lượng tồn nếu sách chưa trả (ngay_tra IS NULL)
        if (!muonSach.rows[0].ngay_tra) {
            await pool.query('UPDATE sach SET slton = slton + 1 WHERE id_sach = $1', [muonSach.rows[0].id_sach]);
        }

        res.redirect('/admin/muon_sach');
    } catch (error) {
        console.error('Lỗi khi xóa mượn sách:', error);
        res.status(500).send('Lỗi server');
    }
});

// Route xử lý duyệt yêu cầu mượn sách
router.post('/approve/:id', async (req, res) => {
    const { id } = req.params;
    try {
        console.log(`✅ Duyệt yêu cầu mượn sách ID: ${id}`);
        
        // Kiểm tra yêu cầu có tồn tại không
        const muonSach = await pool.query(
            'SELECT id_sach, trang_thai FROM muon_sach WHERE id_muonsach = $1',
            [id]
        );
        
        if (muonSach.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy yêu cầu mượn sách' 
            });
        }

        // Kiểm tra trạng thái hiện tại
        const currentStatus = muonSach.rows[0].trang_thai;
        if (currentStatus === 'Đã duyệt') {
            return res.status(400).json({ 
                success: false, 
                message: 'Yêu cầu này đã được duyệt rồi' 
            });
        }

        // Cập nhật trạng thái thành "Đã duyệt"
        await pool.query(
            'UPDATE muon_sach SET trang_thai = $1 WHERE id_muonsach = $2',
            ['Đã duyệt', id]
        );

        console.log(`✅ Đã duyệt yêu cầu mượn sách ID: ${id}`);
        
        // Trả về JSON để có thể xử lý bằng JavaScript
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: 'Đã duyệt yêu cầu mượn sách thành công!' 
            });
        }
        
        res.redirect('/admin/muon_sach?success=Duyệt thành công');
    } catch (error) {
        console.error('❌ Lỗi khi duyệt yêu cầu mượn sách:', error);
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ 
                success: false, 
                message: 'Lỗi server: ' + error.message 
            });
        }
        res.status(500).send('Lỗi server');
    }
});

// Route xử lý từ chối yêu cầu mượn sách
router.post('/reject/:id', async (req, res) => {
    const { id } = req.params;
    try {
        console.log(`❌ Từ chối yêu cầu mượn sách ID: ${id}`);
        
        // Kiểm tra yêu cầu có tồn tại không
        const muonSach = await pool.query(
            'SELECT id_sach, trang_thai FROM muon_sach WHERE id_muonsach = $1',
            [id]
        );
        
        if (muonSach.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy yêu cầu mượn sách' 
            });
        }

        // Cập nhật trạng thái thành "Đã từ chối"
        await pool.query(
            'UPDATE muon_sach SET trang_thai = $1 WHERE id_muonsach = $2',
            ['Đã từ chối', id]
        );

        console.log(`❌ Đã từ chối yêu cầu mượn sách ID: ${id}`);
        
        // Trả về JSON để có thể xử lý bằng JavaScript
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: 'Đã từ chối yêu cầu mượn sách' 
            });
        }
        
        res.redirect('/admin/muon_sach?success=Từ chối thành công');
    } catch (error) {
        console.error('❌ Lỗi khi từ chối yêu cầu mượn sách:', error);
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ 
                success: false, 
                message: 'Lỗi server: ' + error.message 
            });
        }
        res.status(500).send('Lỗi server');
    }
});

// Route test database - kiểm tra bảng muon_sach
router.get('/test-data', async (req, res) => {
    try {
        console.log('🔍 Test database route được gọi');
        
        // Kiểm tra bảng muon_sach có tồn tại không
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'muon_sach'
            ) as table_exists
        `);
        
        const tableExists = tableCheck.rows[0].table_exists;
        
        if (!tableExists) {
            return res.json({
                success: false,
                error: 'Bảng muon_sach không tồn tại trong database',
                tableExists: false,
                totalRecords: 0,
                tableStructure: []
            });
        }
        
        // Lấy cấu trúc bảng
        const structureQuery = await pool.query(`
            SELECT 
                column_name,
                data_type,
                character_maximum_length,
                is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'muon_sach'
            ORDER BY ordinal_position
        `);
        
        // Đếm tổng số bản ghi
        const countQuery = await pool.query('SELECT COUNT(*) as total FROM muon_sach');
        const totalRecords = parseInt(countQuery.rows[0].total) || 0;
        
        // Lấy thông tin database
        const dbInfo = await pool.query('SELECT current_database() as db_name, version() as db_version');
        
        res.json({
            success: true,
            tableExists: true,
            totalRecords: totalRecords,
            tableStructure: structureQuery.rows.map(col => ({
                name: col.column_name,
                type: col.data_type,
                maxLength: col.character_maximum_length,
                nullable: col.is_nullable === 'YES'
            })),
            database: {
                name: dbInfo.rows[0].db_name,
                version: dbInfo.rows[0].db_version.split(',')[0] // Lấy phần đầu của version
            }
        });
    } catch (error) {
        console.error('❌ Lỗi khi test database:', error);
        res.json({
            success: false,
            error: error.message,
            tableExists: false,
            totalRecords: 0,
            tableStructure: []
        });
    }
});

module.exports = router;