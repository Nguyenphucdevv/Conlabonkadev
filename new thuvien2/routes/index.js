const express = require('express');
const router = express.Router();
const pool = require('../config/database');


// Dữ liệu thư viện mẫu với ảnh 360° thực tế
const sampleLibraries = [
  {
    type: "Feature",
    properties: {
      ID: 1,
      TenThuVien: "Thư viện Quốc gia Việt Nam",
      DiaChi: "31 Tràng Thi, Hàng Trống, Hoàn Kiếm, Hà Nội",
      phanloai: "Thư viện công cộng",
      Wifi: true,
      PhongDoc: true,
      Canteen: true,
      DieuHoa: true,
      Anh360: "/images/360/thuvien_1_360.jpg",
      TheLoaiSach: "Sách giáo khoa, Văn học, Lịch sử",
      TenSach: "Truyện Kiều, Đại Việt sử ký"
    },
    geometry: {
      type: "Point",
      coordinates: [105.8542, 21.0285]
    }
  },
  {
    type: "Feature",
    properties: {
      ID: 2,
      TenThuVien: "Thư viện Hà Nội",
      DiaChi: "47 Bà Triệu, Hai Bà Trưng, Hà Nội",
      phanloai: "Thư viện công cộng",
      Wifi: true,
      PhongDoc: true,
      Canteen: false,
      DieuHoa: true,
      Anh360: "/images/360/thuvien_2_360.jpg",
      TheLoaiSach: "Văn học, Nghệ thuật, Khoa học",
      TenSach: "Nhật ký trong tù, Tuyên ngôn độc lập"
    },
    geometry: {
      type: "Point",
      coordinates: [105.8442, 21.0185]
    }
  },
  {
    type: "Feature",
    properties: {
      ID: 3,
      TenThuVien: "Thư viện Đại học Quốc gia Hà Nội",
      DiaChi: "144 Xuân Thủy, Cầu Giấy, Hà Nội",
      phanloai: "Thư viện trường học",
      Wifi: true,
      PhongDoc: true,
      Canteen: true,
      DieuHoa: true,
      Anh360: "/images/360/thuvien_3_360.jpg",
      TheLoaiSach: "Sách giáo khoa, Nghiên cứu, Luận văn",
      TenSach: "Giáo trình Toán, Vật lý, Hóa học"
    },
    geometry: {
      type: "Point",
      coordinates: [105.77995583357745, 21.07088380428482]
    }
  },
  {
    type: "Feature",
    properties: {
      ID: 4,
      TenThuVien: "Thư viện Tư nhân Minh Trí",
      DiaChi: "25 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội",
      phanloai: "Thư viện tư nhân",
      Wifi: false,
      PhongDoc: true,
      Canteen: false,
      DieuHoa: true,
      Anh360: "/images/360/thuvien_4_360.jpg",
      TheLoaiSach: "Tiểu thuyết, Truyện ngắn, Thơ",
      TenSach: "Truyện ngắn Nam Cao, Thơ Xuân Diệu"
    },
    geometry: {
      type: "Point",
      coordinates: [105.8642, 21.0385]
    }
  },
  {
    type: "Feature",
    properties: {
      ID: 5,
      TenThuVien: "Thư viện Công cộng Ba Đình",
      DiaChi: "123 Điện Biên Phủ, Ba Đình, Hà Nội",
      phanloai: "Thư viện công cộng",
      Wifi: true,
      PhongDoc: true,
      Canteen: true,
      DieuHoa: false,
      Anh360: "/images/360/thuvien_5_360.jpg",
      TheLoaiSach: "Văn học, Lịch sử, Địa lý",
      TenSach: "Lịch sử Việt Nam, Địa lý Hà Nội"
    },
    geometry: {
      type: "Point",
      coordinates: [105.8342, 21.0385]
    }
  },
  {
    type: "Feature",
    properties: {
      ID: 6,
      TenThuVien: "Thư viện Trường Đại học Bách Khoa",
      DiaChi: "1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội",
      phanloai: "Thư viện trường học",
      Wifi: true,
      PhongDoc: true,
      Canteen: true,
      DieuHoa: true,
      Anh360: "/images/360/thuvien_6_360.jpg",
      TheLoaiSach: "Kỹ thuật, Công nghệ, Toán học",
      TenSach: "Giáo trình Kỹ thuật, Công nghệ thông tin"
    },
    geometry: {
      type: "Point",
      coordinates: [105.8242, 21.0185]
    }
  },
  {
    type: "Feature",
    properties: {
      ID: 7,
      TenThuVien: "Thư viện Tư nhân Văn Lang",
      DiaChi: "45 Nguyễn Du, Hai Bà Trưng, Hà Nội",
      phanloai: "Thư viện tư nhân",
      Wifi: false,
      PhongDoc: true,
      Canteen: false,
      DieuHoa: true,
      Anh360: "/images/360/thuvien_7_360.jpg",
      TheLoaiSach: "Tiểu thuyết, Truyện ngắn, Thơ ca",
      TenSach: "Truyện ngắn Thạch Lam, Thơ Hồ Xuân Hương"
    },
    geometry: {
      type: "Point",
      coordinates: [105.8142, 21.0285]
    }
  },
  {
    type: "Feature",
    properties: {
      ID: 8,
      TenThuVien: "Thư viện Công cộng Hoàn Kiếm",
      DiaChi: "67 Hàng Gai, Hoàn Kiếm, Hà Nội",
      phanloai: "Thư viện công cộng",
      Wifi: true,
      PhongDoc: true,
      Canteen: false,
      DieuHoa: true,
      Anh360: "/images/360/thuvien_8_360.jpg",
      TheLoaiSach: "Văn học, Nghệ thuật, Du lịch",
      TenSach: "Văn học dân gian, Nghệ thuật truyền thống"
    },
    geometry: {
      type: "Point",
      coordinates: [105.8442, 21.0285]
    }
  },
  {
    type: "Feature",
    properties: {
      ID: 9,
      TenThuVien: "Thư viện Trường Đại học Kinh tế",
      DiaChi: "207 Giải Phóng, Đống Đa, Hà Nội",
      phanloai: "Thư viện trường học",
      Wifi: true,
      PhongDoc: true,
      Canteen: true,
      DieuHoa: true,
      Anh360: "/images/360/thuvien_9_360.jpg",
      TheLoaiSach: "Kinh tế, Quản lý, Tài chính",
      TenSach: "Giáo trình Kinh tế học, Quản trị kinh doanh"
    },
    geometry: {
      type: "Point",
      coordinates: [105.8042, 21.0085]
    }
  },
  {
    type: "Feature",
    properties: {
      ID: 10,
      TenThuVien: "Thư viện Công cộng Đống Đa",
      DiaChi: "89 Tây Sơn, Đống Đa, Hà Nội",
      phanloai: "Thư viện công cộng",
      Wifi: true,
      PhongDoc: true,
      Canteen: true,
      DieuHoa: true,
      Anh360: "/images/360/thuvien_10_360.jpg",
      TheLoaiSach: "Văn học, Lịch sử, Khoa học",
      TenSach: "Lịch sử Đống Đa, Khoa học tự nhiên"
    },
    geometry: {
      type: "Point",
      coordinates: [105.7942, 21.0185]
    }
  },
  {
    type: "Feature",
    properties: {
      ID: 11,
      TenThuVien: "Thư viện Tư nhân Hà Nội",
      DiaChi: "156 Trần Phú, Ba Đình, Hà Nội",
      phanloai: "Thư viện tư nhân",
      Wifi: false,
      PhongDoc: true,
      Canteen: false,
      DieuHoa: false,
      Anh360: "/images/360/thuvien_11_360.jpg",
      TheLoaiSach: "Tiểu thuyết, Truyện ngắn, Văn học",
      TenSach: "Truyện ngắn Nam Cao, Văn học hiện đại"
    },
    geometry: {
      type: "Point",
      coordinates: [105.8142, 21.0385]
    }
  }
];

// Route trang bán sách cho người dùng
router.get('/shop', async (req, res, next) => {
    try {
        // Kiểm tra xem có cột gia trong database không
        const checkColumnQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sach' AND column_name IN ('gia', 'don_gia', 'gia_goc')
        `;
        const columnCheck = await pool.query(checkColumnQuery);
        const hasGia = columnCheck.rows.some(r => r.column_name === 'gia');
        const hasDonGia = columnCheck.rows.some(r => r.column_name === 'don_gia');
        const hasGiaGoc = columnCheck.rows.some(r => r.column_name === 'gia_goc');
        
        console.log('🔍 Kiểm tra cột:', { hasGia, hasDonGia, hasGiaGoc });
        
        // Xây dựng query động dựa trên các cột có sẵn - CHỈ dùng cột tồn tại
        let giaSelect = '0 as gia';
        if (hasGia) {
            giaSelect = 'COALESCE(s.gia, 0) as gia';
        } else if (hasDonGia) {
            giaSelect = 'COALESCE(s.don_gia, 0) as gia';
        }
        // Nếu không có cả hai, dùng giá trị mặc định 0
        
        let giaGocSelect = '';
        if (hasGiaGoc) {
            giaGocSelect = ', s.gia_goc';
        }
        
        // Lấy tất cả sách với thể loại - CHỈ SELECT các cột tồn tại
        const booksQuery = `
            SELECT s.id_sach, s.ten_sach, s.tac_gia, s.nam_xuat_ban, 
                   s.id_theloai, s.slton as so_luong, s.tongsl, s.digital_file,
                   ${giaSelect}${giaGocSelect},
                   tl.ten_theloai
            FROM sach s
            LEFT JOIN the_loai tl ON s.id_theloai = tl.id_theloai
            ORDER BY s.id_sach DESC
        `;
        
        console.log('📚 Query sách:', booksQuery);
        const booksResult = await pool.query(booksQuery);
        console.log('✅ Đã lấy được', booksResult.rows.length, 'quyển sách');
        
        // Xử lý dữ liệu để đảm bảo có đầy đủ các trường
        const processedBooks = booksResult.rows.map(book => ({
            ...book,
            gia: book.gia || 0,
            gia_goc: book.gia_goc || null,
            so_luong: book.so_luong || 0
        }));
        
        // Lấy tất cả thể loại
        const categoriesQuery = `
            SELECT DISTINCT tl.id_theloai, tl.ten_theloai
            FROM the_loai tl
            INNER JOIN sach s ON tl.id_theloai = s.id_theloai
            ORDER BY tl.ten_theloai
        `;
        
        const categoriesResult = await pool.query(categoriesQuery);
        console.log('✅ Đã lấy được', categoriesResult.rows.length, 'thể loại');
        
        res.render('shop', {
            books: processedBooks,
            categories: categoriesResult.rows,
            user: req.session.user || null
        });
    } catch (error) {
        console.error('❌ Lỗi khi load trang shop:', error);
        console.error('❌ Chi tiết lỗi:', error.message);
        console.error('❌ Stack:', error.stack);
        next(error);
    }
});

router.get('/', (req, res, next) => {
    try {
        // Truyền thông tin người dùng từ session vào template
        res.render('index', { 
            title: 'Trang Chính',
            user: req.session.user // Truyền user để kiểm tra trong index.ejs
        });
    } catch (err) {
        next(err);
    }
});

// Route cung cấp dữ liệu thư viện với sách cho bản đồ
router.get('/data', async (req, res, next) => {
    console.log('📡 API /data được gọi');
    
    try {

        // Lấy dữ liệu thư viện từ database với thông tin sách
        const librariesResult = await pool.query(`
            SELECT 
                tv.id_thuvien,
                tv.ten_thuvien,
                tv.dia_chi,
                tv.wifi,
                tv.phongdoc,
                tv.canteen,
                tv.dieuhoa,
                tv.latitude,
                tv.longitude,
                tv.anh_360,
                tv.phanloai,
                COUNT(DISTINCT s.id_sach) as tong_so_sach,
                STRING_AGG(DISTINCT s.ten_sach, ', ') as danh_sach_sach,
                STRING_AGG(DISTINCT tl.ten_theloai, ', ') as danh_sach_the_loai
            FROM thu_vien tv
            LEFT JOIN thu_vien_sach tvs ON tv.id_thuvien = tvs.id_thuvien
            LEFT JOIN sach s ON tvs.id_sach = s.id_sach
            LEFT JOIN the_loai tl ON s.id_theloai = tl.id_theloai
            GROUP BY tv.id_thuvien, tv.ten_thuvien, tv.dia_chi, tv.wifi, 
                     tv.phongdoc, tv.canteen, tv.dieuhoa, tv.latitude, 
                     tv.longitude, tv.anh_360, tv.phanloai
            ORDER BY tv.id_thuvien
        `);

        console.log(`✅ Tìm thấy ${librariesResult.rows.length} thư viện từ database`);

        // Chuyển đổi dữ liệu thành GeoJSON format
        const features = librariesResult.rows
            .filter(lib => lib.latitude && lib.longitude) // Chỉ lấy thư viện có tọa độ hợp lệ
            .map(lib => ({
                type: "Feature",
                properties: {
                    ID: lib.id_thuvien,
                    TenThuVien: lib.ten_thuvien,
                    DiaChi: lib.dia_chi,
                    phanloai: lib.phanloai || "Không xác định",
                    Wifi: lib.wifi || false,
                    PhongDoc: lib.phongdoc || false,
                    Canteen: lib.canteen || false,
                    DieuHoa: lib.dieuhoa || false,
                    Anh360: lib.anh_360 || null,
                    TongSoSach: lib.tong_so_sach || 0,
                    DanhSachSach: lib.danh_sach_sach || "Chưa có sách",
                    DanhSachTheLoai: lib.danh_sach_the_loai || "Chưa có thể loại"
                },
                geometry: {
                    type: "Point",
                    coordinates: [parseFloat(lib.longitude), parseFloat(lib.latitude)]
                }
            }));

        const geoJsonData = {
            type: "FeatureCollection",
            features: features
        };
        
        console.log(`✅ Trả về ${features.length} thư viện có tọa độ hợp lệ`);
        res.json(geoJsonData);
        
    } catch (err) {
        console.error('❌ Lỗi khi lấy dữ liệu thư viện:', err);
        console.error('❌ Chi tiết lỗi:', err.message);
        console.error('❌ Stack:', err.stack);
        
        // Trả về lỗi với thông tin chi tiết
        res.status(500).json({
            error: 'Server error',
            message: err.message,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// Route test database
router.get('/test-db', async (req, res, next) => {
    try {
        
        console.log('🔍 Testing database connection...');
        
        // Test query đơn giản
        const result = await pool.query('SELECT id_thuvien, ten_thuvien, latitude, longitude FROM thu_vien ORDER BY id_thuvien');
        
        console.log(`✅ Found ${result.rows.length} libraries in database`);
        
        // Hiển thị thông tin từng thư viện
        const libraries = result.rows.map(lib => ({
            id: lib.id_thuvien,
            name: lib.ten_thuvien,
            lat: lib.latitude,
            lng: lib.longitude,
            hasCoords: !!(lib.latitude && lib.longitude)
        }));
        
        const validLibraries = libraries.filter(lib => lib.hasCoords);
        
        res.json({
            success: true,
            total: libraries.length,
            validCoordinates: validLibraries.length,
            libraries: libraries
        });
        
    } catch (err) {
        console.error('❌ Database test error:', err);
        res.status(500).json({
            success: false,
            error: err.message,
            stack: err.stack
        });
    }
});

// Route để lấy danh sách ảnh có sẵn
router.get('/images', (req, res, next) => {
    try {
        // Danh sách ảnh 360° có sẵn
        const availableImages = [
            "/images/360/thuvien_1_360.jpg",
            "/images/360/thuvien_2_360.jpg",
            "/images/360/thuvien_3_360.jpg",
            "/images/360/thuvien_4_360.jpg",
            "/images/360/thuvien_5_360.jpg",
            "/images/360/thuvien_6_360.jpg",
            "/images/360/thuvien_7_360.jpg",
            "/images/360/thuvien_8_360.jpg",
            "/images/360/thuvien_9_360.jpg",
            "/images/360/thuvien_10_360.jpg",
            "/images/360/thuvien_11_360.jpg"
        ];
        
        res.json({
            success: true,
            images: availableImages,
            count: availableImages.length
        });
    } catch (err) {
        next(err);
    }
});

// Route để cập nhật ảnh cho thư viện
router.post('/update-image', (req, res, next) => {
    try {
        const { libraryId, newImagePath } = req.body;
        
        // Tìm thư viện và cập nhật ảnh
        const library = sampleLibraries.find(lib => lib.properties.ID == libraryId);
        if (library) {
            library.properties.Anh360 = newImagePath;
            res.json({
                success: true,
                message: `Đã cập nhật ảnh cho thư viện: ${library.properties.TenThuVien}`,
                newImage: newImagePath
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Không tìm thấy thư viện"
            });
        }
    } catch (err) {
        next(err);
    }
});

// Route để xem ảnh
router.get('/xem-anh', (req, res, next) => {
    try {
        console.log('📸 Route /xem-anh được gọi');
        res.render('xem_anh', { 
            title: 'Xem Ảnh',
            message: 'Chào mừng bạn đến với trang xem ảnh!'
        });
    } catch (err) {
        next(err);
    }
});

// Route API để mượn sách
router.post('/api/borrow-book', async (req, res, next) => {
    try {
        const borrowData = req.body;
        
        console.log('📚 Dữ liệu mượn sách nhận được:', borrowData);
        
        // Kiểm tra dữ liệu bắt buộc
        if (!borrowData.libraryName || !borrowData.borrowerName || 
            !borrowData.borrowerEmail || !borrowData.borrowerPhone || 
            !borrowData.borrowDate || !borrowData.returnDate) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        // Sử dụng shared pool từ config/database.js
        const pool = require('../config/database');

        // Tìm sách phù hợp với loại sách yêu cầu
        let bookQuery = 'SELECT s.id_sach, s.ten_sach, s.slton, tl.ten_theloai FROM Sach s LEFT JOIN the_loai tl ON s.id_theloai = tl.id_theloai WHERE s.slton > 0';
        let bookParams = [];
        
        if (borrowData.bookCategory && borrowData.bookCategory !== '') {
            // Tìm sách theo thể loại
            bookQuery += ' AND tl.ten_theloai ILIKE $1';
            bookParams.push(`%${borrowData.bookCategory}%`);
        }
        
        bookQuery += ' ORDER BY s.slton DESC LIMIT 1';
        
        const bookResult = await pool.query(bookQuery, bookParams);
        
        if (bookResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: borrowData.bookCategory 
                    ? `Không có sách thuộc thể loại "${borrowData.bookCategory}" trong kho`
                    : 'Không có sách nào trong kho'
            });
        }

        const selectedBook = bookResult.rows[0];
        
        // Thêm vào bảng muon_sach
        const insertResult = await pool.query(
            `INSERT INTO muon_sach (id_sach, ten_nguoi_muon, ngay_muon, ngay_tra, 
             email_nguoi_muon, so_dien_thoai, ghi_chu, thu_vien, trang_thai, ngay_tao) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id_muonsach`,
            [
                selectedBook.id_sach,
                borrowData.borrowerName,
                borrowData.borrowDate,
                borrowData.returnDate,
                borrowData.borrowerEmail,
                borrowData.borrowerPhone,
                borrowData.notes || '',
                borrowData.libraryName,
                'Chờ xử lý',
                new Date()
            ]
        );

        const muonSachId = insertResult.rows[0].id_muonsach;
        
        console.log('✅ Đã lưu yêu cầu mượn sách vào database với ID:', muonSachId);
        
        // Trả về kết quả thành công
        res.json({
            success: true,
            message: 'Yêu cầu mượn sách đã được gửi thành công! Admin sẽ xem xét yêu cầu của bạn.',
            muonSachId: muonSachId,
            bookInfo: {
                id: selectedBook.id_sach,
                name: selectedBook.ten_sach,
                category: selectedBook.ten_theloai || 'Không xác định'
            },
            redirectUrl: '/admin/muon_sach'
        });
        
    } catch (err) {
        console.error('❌ Lỗi khi xử lý yêu cầu mượn sách:', err);
        next(err);
    }
});

// Thay thế toàn bộ route /api/rate-library
// Thay thế toàn bộ route /api/rate-library
router.post('/api/rate-library', async (req, res, next) => {
    // Import pool để kết nối database
    const pool = require('../config/database');
    console.log('🎯 ===== ROUTE /api/rate-library ĐƯỢC GỌI =====');
    console.log('📡 Method:', req.method);
    console.log('📡 Path:', req.path);
    console.log('📡 Body:', JSON.stringify(req.body, null, 2));
    
    try {
        const ratingData = req.body;
        
        // Kiểm tra dữ liệu bắt buộc
        if (!ratingData.libraryId || !ratingData.rating || !ratingData.userName) {
            console.log('❌ Thiếu thông tin bắt buộc:', {
                libraryId: ratingData.libraryId,
                rating: ratingData.rating,
                userName: ratingData.userName
            });
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: libraryId, rating, userName'
            });
        }

        // Validate rating
        const rating = parseInt(ratingData.rating);
        if (isNaN(rating) || rating < 1 || rating > 5) {
            console.log('❌ Rating không hợp lệ:', rating);
            return res.status(400).json({
                success: false,
                message: 'Điểm đánh giá phải từ 1 đến 5'
            });
        }

        console.log('✅ Dữ liệu hợp lệ, đang lưu vào database...');
        
        // Lưu vào database với cấu trúc đúng
        const query = `
            INSERT INTO danh_gia (
                id_thuvien, 
                ten_nguoi_danh_gia, 
                email_nguoi_danh_gia, 
                so_dien_thoai,
                diem_so, 
                nhan_xet, 
                ngay_danh_gia, 
                trang_thai, 
                ghi_chu, 
                id_user, 
                thoi_gian
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id_danhgia
        `;
        
        const values = [
            ratingData.libraryId,                    // id_thuvien
            ratingData.userName,                     // ten_nguoi_danh_gia
            ratingData.email || '',                  // email_nguoi_danh_gia
            ratingData.phone || '',                  // so_dien_thoai
            rating,                                  // diem_so
            ratingData.comment || '',                // nhan_xet
            new Date(),                              // ngay_danh_gia
            'Chờ duyệt',                            // trang_thai
            '',                                      // ghi_chu
            ratingData.userId || 1,                  // id_user
            new Date()                               // thoi_gian
        ];
        
        const result = await pool.query(query, values);
        
        console.log('✅ Đã lưu đánh giá vào database:', result.rows[0]);
        
        res.json({
            success: true,
            message: 'Đánh giá thành công!',
            ratingId: result.rows[0].id_danhgia,
            data: ratingData
        });

    } catch (error) {
        console.error('❌ Lỗi trong route:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + error.message
        });
    }
});

// API cập nhật thư viện cho Admin Map (đường dẫn đầy đủ để tránh 404 khi mount router)
router.put('/admin/thu_vien/update-json/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            ten_thuvien,
            dia_chi,
            phanloai,
            wifi,
            phongdoc,
            canteen,
            dieuhoa,
            latitude,
            longitude
        } = req.body || {};

        if (!ten_thuvien || !phanloai) {
            return res.status(400).json({ success: false, error: 'Thiếu tên thư viện hoặc loại' });
        }

        const result = await pool.query(
            `UPDATE thu_vien
             SET ten_thuvien = $1,
                 dia_chi = $2,
                 phanloai = $3,
                 wifi = $4,
                 phongdoc = $5,
                 canteen = $6,
                 dieuhoa = $7,
                 latitude = $8,
                 longitude = $9
             WHERE id_thuvien = $10
             RETURNING *`,
            [
                ten_thuvien,
                dia_chi || null,
                phanloai,
                !!wifi,
                !!phongdoc,
                !!canteen,
                !!dieuhoa,
                latitude === undefined || latitude === null || latitude === '' ? null : parseFloat(latitude),
                longitude === undefined || longitude === null || longitude === '' ? null : parseFloat(longitude),
                id
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy thư viện' });
        }

        res.json({ success: true, library: result.rows[0] });
    } catch (error) {
        console.error('❌ Lỗi update-json (index router):', error);
        res.status(500).json({ success: false, error: 'Lỗi server: ' + error.message });
    }
});

router.get('/books/:id', async (req, res) => {
    const { id } = req.params;
    try {
        console.log('📚 Đang lấy sách của thư viện ID:', id);
        
        // Lấy thông tin thư viện
        const libraryResult = await pool.query(
            'SELECT * FROM thu_vien WHERE id_thuvien = $1',
            [id]
        );
        
        if (libraryResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Không tìm thấy thư viện' 
            });
        }
        
        const library = libraryResult.rows[0];
        
        // Lấy sách của thư viện từ bảng liên kết
        const booksResult = await pool.query(`
            SELECT 
                s.id_sach,
                s.ten_sach,
                s.tac_gia,
                s.nam_xuat_ban,
                s.slton,
                s.tongsl,
                s.digital_file,
                tl.ten_theloai,
                tvs.so_luong as so_luong_trong_thu_vien,
                tvs.ngay_them
            FROM thu_vien_sach tvs
            JOIN sach s ON tvs.id_sach = s.id_sach
            LEFT JOIN the_loai tl ON s.id_theloai = tl.id_theloai
            WHERE tvs.id_thuvien = $1
            ORDER BY tvs.ngay_them DESC, s.ten_sach
        `, [id]);
        
        res.json({
            success: true,
            library: library,
            books: booksResult.rows
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi lấy sách thư viện:', error);
        res.status(500).json({ 
            success: false,
            error: 'Lỗi server: ' + error.message 
        });
    }
});

// Route để lấy danh sách sách có thể thêm vào thư viện
router.get('/books/:id/available', async (req, res) => {
    const { id } = req.params;
    try {
        // Lấy sách chưa có trong thư viện này
        const booksResult = await pool.query(`
            SELECT 
                s.id_sach,
                s.ten_sach,
                s.tac_gia,
                s.nam_xuat_ban,
                s.slton,
                s.tongsl,
                s.digital_file,
                tl.ten_theloai,
                COALESCE(SUM(tvs.so_luong), 0) as so_luong_da_phan_bo
            FROM sach s
            LEFT JOIN the_loai tl ON s.id_theloai = tl.id_theloai
            LEFT JOIN thu_vien_sach tvs ON s.id_sach = tvs.id_sach
            WHERE s.id_sach NOT IN (
                SELECT id_sach FROM thu_vien_sach WHERE id_thuvien = $1
            )
            GROUP BY s.id_sach, s.ten_sach, s.tac_gia, s.nam_xuat_ban, s.slton, s.tongsl, s.digital_file, tl.ten_theloai
            HAVING COALESCE(SUM(tvs.so_luong), 0) < s.tongsl
            ORDER BY s.ten_sach
        `, [id]);
        
        res.json({
            success: true,
            books: booksResult.rows
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi lấy sách có sẵn:', error);
        res.status(500).json({ 
            success: false,
            error: 'Lỗi server: ' + error.message 
        });
    }
});

// Route để thêm sách vào thư viện
router.post('/books/:id/add', async (req, res) => {
    const { id } = req.params;
    const { sach_id, so_luong } = req.body;
    
    try {
        console.log('➕ Thêm sách vào thư viện:', { id, sach_id, so_luong });
        
        // Kiểm tra sách có tồn tại không
        const sachResult = await pool.query(
            'SELECT id_sach, ten_sach, tongsl FROM sach WHERE id_sach = $1',
            [sach_id]
        );
        
        if (sachResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Không tìm thấy sách' 
            });
        }
        
        const sach = sachResult.rows[0];
        
        // Tính tổng số lượng đã phân bố cho sách này
        const totalDistributedResult = await pool.query(
            'SELECT COALESCE(SUM(so_luong), 0) as total_distributed FROM thu_vien_sach WHERE id_sach = $1',
            [sach_id]
        );
        
        const totalDistributed = parseInt(totalDistributedResult.rows[0].total_distributed);
        const totalAvailable = parseInt(sach.tongsl);
        const availableToAdd = totalAvailable - totalDistributed;
        
        if (parseInt(so_luong) > availableToAdd) {
            return res.status(400).json({
                success: false,
                error: `Không thể thêm ${so_luong} quyển. Chỉ còn ${availableToAdd} quyển có thể thêm vào thư viện khác.`,
                details: {
                    totalAvailable: totalAvailable,
                    totalDistributed: totalDistributed,
                    availableToAdd: availableToAdd,
                    requested: parseInt(so_luong)
                }
            });
        }
        
        // Kiểm tra sách đã có trong thư viện chưa
        const existingResult = await pool.query(
            'SELECT * FROM thu_vien_sach WHERE id_thuvien = $1 AND id_sach = $2',
            [id, sach_id]
        );
        
        if (existingResult.rows.length > 0) {
            // Cập nhật số lượng
            const newTotal = existingResult.rows[0].so_luong + parseInt(so_luong);
            
            if (newTotal > totalAvailable) {
                return res.status(400).json({
                    success: false,
                    error: `Không thể thêm ${so_luong} quyển. Tổng số lượng sẽ vượt quá ${totalAvailable} quyển.`,
                    details: {
                        currentInLibrary: existingResult.rows[0].so_luong,
                        requested: parseInt(so_luong),
                        newTotal: newTotal,
                        totalAvailable: totalAvailable
                    }
                });
            }
            
            await pool.query(
                'UPDATE thu_vien_sach SET so_luong = so_luong + $1 WHERE id_thuvien = $2 AND id_sach = $3',
                [so_luong, id, sach_id]
            );
        } else {
            // Thêm mới
            await pool.query(
                'INSERT INTO thu_vien_sach (id_thuvien, id_sach, so_luong) VALUES ($1, $2, $3)',
                [id, sach_id, so_luong]
            );
        }

        res.json({
            success: true,
            message: `Đã thêm ${so_luong} quyển "${sach.ten_sach}" vào thư viện`,
            details: {
                bookName: sach.ten_sach,
                quantityAdded: parseInt(so_luong),
                totalAvailable: totalAvailable,
                remainingAvailable: availableToAdd - parseInt(so_luong)
            }
        });

    } catch (error) {
        console.error('❌ Lỗi khi thêm sách:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi server: ' + error.message 
        });
    }
});

// Route để xóa sách khỏi thư viện
router.delete('/books/:id/remove/:sach_id', async (req, res) => {
    const { id, sach_id } = req.params;
    
    try {
        await pool.query(
            'DELETE FROM thu_vien_sach WHERE id_thuvien = $1 AND id_sach = $2',
            [id, sach_id]
        );
        
        res.json({ success: true, message: 'Đã xóa sách khỏi thư viện' });
        
    } catch (error) {
        console.error('❌ Lỗi khi xóa sách:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Route để cập nhật số lượng sách trong thư viện
router.put('/books/:id/update/:sach_id', async (req, res) => {
    const { id, sach_id } = req.params;
    const { so_luong } = req.body;
    
    try {
        await pool.query(
            'UPDATE thu_vien_sach SET so_luong = $1 WHERE id_thuvien = $2 AND id_sach = $3',
            [so_luong, id, sach_id]
        );
        
        res.json({ success: true, message: 'Đã cập nhật số lượng sách' });
        
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật số lượng:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});


module.exports = router;