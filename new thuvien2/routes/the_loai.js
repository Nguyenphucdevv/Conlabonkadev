const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Route test để kiểm tra kết nối database
router.get('/test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() as current_time');
        res.json({ 
            message: 'Kết nối database thành công', 
            time: result.rows[0].current_time 
        });
    } catch (error) {
        console.error('Lỗi kết nối database:', error);
        res.status(500).json({ error: 'Lỗi kết nối database', details: error.message });
    }
});

// Route test để kiểm tra cấu trúc bảng
router.get('/test-data', async (req, res) => {
    try {
        // Kiểm tra bảng thu_vien
        const thuVienResult = await pool.query('SELECT COUNT(*) as count FROM thu_vien');
        const theLoaiResult = await pool.query('SELECT COUNT(*) as count FROM "The_loai"');
        
        // Lấy dữ liệu mẫu
        const thuVienSample = await pool.query('SELECT * FROM thu_vien LIMIT 3');
        const theLoaiSample = await pool.query('SELECT * FROM "The_loai" LIMIT 3');
        
        res.json({
            thu_vien: {
                count: thuVienResult.rows[0].count,
                sample: thuVienSample.rows
            },
            the_loai: {
                count: theLoaiResult.rows[0].count,
                sample: theLoaiSample.rows
            }
        });
    } catch (error) {
        console.error('Lỗi khi kiểm tra dữ liệu:', error);
        res.status(500).json({ error: 'Lỗi khi kiểm tra dữ liệu', details: error.message });
    }
});

// Route tạo demo data
router.get('/create-demo', async (req, res) => {
    try {
        console.log('=== CREATING DEMO DATA ===');
        
        // Kiểm tra xem có thư viện nào không
        const thuVienCheck = await pool.query('SELECT COUNT(*) as count FROM thu_vien');
        if (parseInt(thuVienCheck.rows[0].count) === 0) {
            return res.json({
                success: false,
                message: 'Không có thư viện nào. Vui lòng tạo thư viện trước!'
            });
        }
        
        // Lấy ID thư viện đầu tiên
        const firstThuvien = await pool.query('SELECT ID_thuvien FROM thu_vien LIMIT 1');
        const thuvienId = firstThuvien.rows[0].ID_thuvien;
        
        // Tạo demo thể loại
        const demoCategories = [
            { id: 1, name: 'Văn học', thuvien_id: thuvienId },
            { id: 2, name: 'Khoa học', thuvien_id: thuvienId },
            { id: 3, name: 'Lịch sử', thuvien_id: thuvienId },
            { id: 4, name: 'Công nghệ', thuvien_id: thuvienId },
            { id: 5, name: 'Nghệ thuật', thuvien_id: thuvienId }
        ];
        
        let createdCount = 0;
        for (const category of demoCategories) {
            try {
                await pool.query(
                    'INSERT INTO "The_loai" (ID_theloai, Ten_theloai, ID_thuvien) VALUES ($1, $2, $3) ON CONFLICT (ID_theloai) DO NOTHING',
                    [category.id, category.name, category.thuvien_id]
                );
                createdCount++;
            } catch (insertError) {
                console.log(`Category ${category.id} already exists or error:`, insertError.message);
            }
        }
        
        res.json({
            success: true,
            message: `Đã tạo ${createdCount} thể loại demo`,
            thuvien_id: thuvienId,
            created_categories: createdCount
        });
        
    } catch (error) {
        console.error('Lỗi khi tạo demo data:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi khi tạo demo data', 
            details: error.message 
        });
    }
});

// Route GET /admin/the_loai
router.get('/', async (req, res) => {
    try {
        console.log('=== THE LOAI ROUTE DEBUG ===');
        console.log('1. Testing database connection...');
        
        // Test database connection first
        const testQuery = await pool.query('SELECT NOW()');
        console.log('2. Database connection OK:', testQuery.rows[0]);
        
        console.log('3. Checking if the_loai table exists...');
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'the_loai'
            );
        `);
        console.log('4. the_loai table exists:', tableCheck.rows[0].exists);
        
        if (!tableCheck.rows[0].exists) {
            console.log('5. ERROR: the_loai table does not exist!');
            return res.status(500).send('Bảng the_loai không tồn tại trong database');
        }
        
        console.log('5. Fetching category data with book statistics...');
        const result = await pool.query(`
            SELECT 
                tl.id_theloai, 
                tl.ten_theloai, 
                tl.id_thuvien, 
                COALESCE(tv.ten_thuvien, 'Không xác định') as ten_thuvien,
                COALESCE(COUNT(DISTINCT s.id_sach), 0)::integer as tong_so_sach,
                COALESCE(SUM(s.tongsl), 0)::integer as tong_so_luong,
                COALESCE(SUM(s.slton), 0)::integer as tong_so_luong_con
            FROM 
                the_loai tl
            LEFT JOIN 
                thu_vien tv ON tl.id_thuvien = tv.id_thuvien
            LEFT JOIN
                sach s ON tl.id_theloai = s.id_theloai
            GROUP BY
                tl.id_theloai, tl.ten_theloai, tl.id_thuvien, tv.ten_thuvien
            ORDER BY 
                tl.ten_theloai ASC
        `);
        
        console.log('6. Query result rows count:', result.rows.length);
        console.log('7. First row sample:', result.rows[0]);
        
        // Kiểm tra dữ liệu trả về
        if (!result.rows || result.rows.length === 0) {
            console.log('8. No rows returned from query - table might be empty');
            return res.render('the_loai', { 
                theLoai: [],
                error: req.query.error,
                success: req.query.success
            });
        }
        
        console.log('9. Rendering template with data...');
        res.render('the_loai', { 
            theLoai: result.rows,
            error: req.query.error,
            success: req.query.success
        });
        console.log('10. Template rendered successfully');
        
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
            errorMessage = 'Bảng the_loai không tồn tại';
        } else if (error.code === '28P01') {
            errorMessage = 'Lỗi xác thực database';
        } else if (error.code === '3D000') {
            errorMessage = 'Database không tồn tại';
        } else if (error.code === '08001') {
            errorMessage = 'Không thể kết nối database';
        }
        
        // Render error page instead of sending plain text
        res.status(500).render('the_loai', {
            theLoai: [],
            error: `${errorMessage}: ${error.message}`,
            success: null
        });
    }
});

// Thêm thể loại
router.post('/add', async (req, res) => {
    const { ID_theloai, Ten_theloai, ID_thuvien } = req.body;

    try {
        // Kiểm tra xem id_thuvien có tồn tại trong bảng thu_vien không
        const checkThuvien = await pool.query('SELECT id_thuvien FROM thu_vien WHERE id_thuvien = $1', [ID_thuvien]);
        if (checkThuvien.rows.length === 0) {
            return res.redirect('/admin/the_loai?error=ID thư viện không tồn tại!');
        }

        // Kiểm tra xem id_theloai đã tồn tại chưa
        const checkTheloai = await pool.query('SELECT id_theloai FROM the_loai WHERE id_theloai = $1', [ID_theloai]);
        if (checkTheloai.rows.length > 0) {
            return res.redirect('/admin/the_loai?error=ID thể loại đã tồn tại!');
        }

        // Thêm thể loại mới vào bảng the_loai
        await pool.query(
            'INSERT INTO the_loai (id_theloai, ten_theloai, id_thuvien) VALUES ($1, $2, $3)',
            [ID_theloai, Ten_theloai, ID_thuvien]
        );

        // Chuyển hướng về trang danh sách thể loại với thông báo thành công
        res.redirect('/admin/the_loai?success=Thêm thể loại thành công!');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/the_loai?error=Lỗi khi thêm thể loại: ' + error.message);
    }
});

// Xóa thể loại
router.post('/delete/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query('DELETE FROM the_loai WHERE id_theloai = $1', [id]);
        res.redirect('/admin/the_loai?success=Xóa thể loại thành công!');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/the_loai?error=Lỗi khi xóa thể loại: ' + error.message);
    }
});

// Route: Hiển thị form sửa thể loại
router.get('/update/:id', async (req, res) => {
    const { id } = req.params;
    try {
        console.log(' Đang lấy thông tin thể loại ID:', id);
        
        // Lấy thông tin thể loại cần sửa
        const theLoaiResult = await pool.query(
            `SELECT the_loai.*, thu_vien.ten_thuvien 
             FROM the_loai 
             JOIN thu_vien ON the_loai.id_thuvien = thu_vien.id_thuvien
             WHERE id_theloai = $1`,
            [id]
        );

        if (theLoaiResult.rows.length === 0) {
            console.log('❌ Không tìm thấy thể loại với ID:', id);
            return res.status(404).send('Thể loại không tồn tại');
        }

        console.log('✅ Tìm thấy thể loại:', theLoaiResult.rows[0]);

        // Lấy danh sách tất cả thư viện để chọn
        console.log(' Đang lấy danh sách thư viện...');
        const thuVienResult = await pool.query(
            'SELECT id_thuvien, ten_thuvien FROM thu_vien ORDER BY ten_thuvien ASC'
        );

        console.log('✅ Lấy được danh sách thư viện:', thuVienResult.rows.length, 'thư viện');

        // Truyền dữ liệu sang view
        res.render('updateTheLoai', { 
            the_loai: theLoaiResult.rows[0],
            danh_sach_thu_vien: thuVienResult.rows
        });
        
        console.log('✅ Đã render template updateTheLoai');
    } catch (error) {
        console.error('❌ Lỗi khi lấy thông tin thể loại:', error);
        res.status(500).send('Lỗi server: ' + error.message);
    }
});

// Route: Cập nhật thông tin thể loại
router.post('/update/:id', async (req, res) => {
    const { id } = req.params;
    const { Ten_theloai, ID_thuvien } = req.body;

    console.log('🔄 Đang cập nhật thể loại ID:', id);
    console.log('📝 Dữ liệu nhận được:', { Ten_theloai, ID_thuvien });

    try {
        // Kiểm tra dữ liệu đầu vào
        if (!Ten_theloai || !ID_thuvien) {
            console.log('❌ Thiếu dữ liệu bắt buộc');
            return res.redirect('/admin/the_loai?error=Vui lòng điền đầy đủ thông tin!');
        }

        // Kiểm tra xem id_thuvien có tồn tại trong bảng thu_vien không
        const checkThuvien = await pool.query('SELECT id_thuvien, ten_thuvien FROM thu_vien WHERE id_thuvien = $1', [ID_thuvien]);
        if (checkThuvien.rows.length === 0) {
            console.log('❌ ID thư viện không tồn tại:', ID_thuvien);
            return res.redirect('/admin/the_loai?error=ID thư viện không tồn tại!');
        }

        // Kiểm tra xem thể loại có tồn tại không
        const checkTheloai = await pool.query('SELECT id_theloai FROM the_loai WHERE id_theloai = $1', [id]);
        if (checkTheloai.rows.length === 0) {
            console.log('❌ Thể loại không tồn tại:', id);
            return res.redirect('/admin/the_loai?error=Thể loại không tồn tại!');
        }

        // Cập nhật thông tin thể loại
        const result = await pool.query(
            `UPDATE the_loai
             SET ten_theloai = $1, id_thuvien = $2
             WHERE id_theloai = $3`,
            [Ten_theloai, ID_thuvien, id]
        );

        if (result.rowCount === 0) {
            console.log('❌ Không thể cập nhật thể loại');
            return res.redirect('/admin/the_loai?error=Không thể cập nhật thể loại!');
        }

        console.log('✅ Cập nhật thể loại thành công');
        // Chuyển hướng về trang danh sách thể loại với thông báo thành công
        res.redirect('/admin/the_loai?success=Cập nhật thể loại thành công!');
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật thể loại:', error);
        res.redirect('/admin/the_loai?error=Lỗi khi cập nhật thể loại: ' + error.message);
    }
});

module.exports = router;
