const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const pool = require("../config/database"); // Sử dụng shared pool từ config/database.js

// Cấu hình multer để lưu ảnh 360 vào thư mục public/images/360/
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Lưu vào thư mục public/images/360
    cb(null, "public/images/360/");
  },
  filename: function (req, file, cb) {
    // Tên file: thuvien_ + ID thư viện (nếu có) + timestamp + extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const libraryId = req.body.ID_thuvien || req.params.id || "";
    const prefix = libraryId ? `thuvien_${libraryId}_` : "thuvien_";
    cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Chỉ cho phép ảnh
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ cho phép file ảnh!"), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
  },
});

// Test route to check database connection
router.get("/test", async (req, res) => {
  try {
    console.log("Testing basic database connection...");
    const result = await pool.query("SELECT 1 as test");
    res.json({
      success: true,
      message: "Database connection OK",
      test: result.rows[0],
      pool: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      },
    });
  } catch (error) {
    console.error("Database test failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
    });
  }
});

// Test route để kiểm tra dữ liệu trong bảng thu_vien
router.get("/test-data", async (req, res) => {
  try {
    console.log("=== TESTING THU_VIEN TABLE DATA ===");

    // Kiểm tra bảng có tồn tại không
    const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'thu_vien'
            );
        `);

    if (!tableExists.rows[0].exists) {
      return res.json({
        success: false,
        error: "Bảng thu_vien không tồn tại",
        suggestion: "Kiểm tra tên bảng trong database",
      });
    }

    // Kiểm tra cấu trúc bảng
    const tableStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'thu_vien' 
            ORDER BY ordinal_position;
        `);

    // Đếm số lượng bản ghi
    const countResult = await pool.query(
      "SELECT COUNT(*) as total FROM thu_vien"
    );
    const totalRecords = countResult.rows[0].total;

    // Lấy một vài bản ghi mẫu
    const sampleData = await pool.query("SELECT * FROM thu_vien LIMIT 3");

    res.json({
      success: true,
      tableExists: true,
      tableStructure: tableStructure.rows,
      totalRecords: parseInt(totalRecords),
      sampleData: sampleData.rows,
      message: "Bảng thu_vien tồn tại và có dữ liệu",
    });
  } catch (error) {
    console.error("Test data failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
    });
  }
});

// Route GET /admin/thu_vien
router.get("/", async (req, res) => {
  try {
    console.log("=== THU VIEN ROUTE DEBUG ===");
    console.log("1. Testing database connection...");

    // Test database connection first
    const testQuery = await pool.query("SELECT NOW()");
    console.log("2. Database connection OK:", testQuery.rows[0]);

    console.log("3. Checking if Thu_vien table exists...");
    const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'thu_vien'
            );
        `);
    console.log("4. Table exists:", tableCheck.rows[0].exists);

    if (!tableCheck.rows[0].exists) {
      console.log("5. ERROR: Thu_vien table does not exist!");
      return res.status(500).send("Bảng Thu_vien không tồn tại trong database");
    }

    console.log("5. Fetching library data...");
    // Sửa tên bảng thành 'thu_vien' (chữ thường) để nhất quán
    const result = await pool.query(
      "SELECT * FROM thu_vien ORDER BY id_thuvien ASC"
    );
    console.log("6. Query result rows count:", result.rows.length);
    console.log("7. First row sample:", result.rows[0]);

    // Kiểm tra dữ liệu trả về
    if (!result.rows || result.rows.length === 0) {
      console.log("8. No rows returned from query - table might be empty");
      return res.render("thu_vien", { thuVien: [] });
    }

    console.log("9. Rendering template with data...");
    res.render("thu_vien", { thuVien: result.rows });
    console.log("10. Template rendered successfully");
  } catch (error) {
    console.error("=== DATABASE ERROR DETAILS ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error detail:", error.detail);
    console.error("Error hint:", error.hint);
    console.error("Error stack:", error.stack);

    // Send more specific error message
    let errorMessage = "Lỗi server";
    if (error.code === "42P01") {
      errorMessage = "Bảng Thu_vien không tồn tại";
    } else if (error.code === "28P01") {
      errorMessage = "Lỗi xác thực database";
    } else if (error.code === "3D000") {
      errorMessage = "Database không tồn tại";
    } else if (error.code === "08001") {
      errorMessage = "Không thể kết nối database";
    }

    res.status(500).send(`Lỗi server: ${errorMessage} (${error.message})`);
  }
});

// Route thêm thư viện với upload ảnh
router.post("/add", upload.single("Anh360"), async (req, res) => {
  try {
    console.log("=== BẮT ĐẦU THÊM THƯ VIỆN ===");
    console.log("Request body:", req.body);
    console.log(
      "Request file:",
      req.file
        ? {
          filename: req.file.filename,
          path: req.file.path,
          size: req.file.size,
        }
        : "Không có file"
    );

    const {
      ID_thuvien,
      Ten_thuvien,
      Dia_chi,
      Wifi,
      Phongdoc,
      Canteen,
      Dieuhoa,
      Latitude,
      Longitude,
      phanloai,
    } = req.body;

    // Validation dữ liệu đầu vào
    if (!ID_thuvien || !Ten_thuvien || !phanloai) {
      console.log("❌ Validation failed:", {
        ID_thuvien,
        Ten_thuvien,
        phanloai,
      });
      return res.status(400).json({
        success: false,
        error:
          "Thiếu thông tin bắt buộc: ID thư viện, tên thư viện và loại thư viện",
      });
    }

    // Kiểm tra kết nối database
    try {
      await pool.query("SELECT 1");
      console.log("✅ Database connection OK");
    } catch (dbError) {
      console.error("❌ Database connection failed:", dbError);
      return res.status(500).json({
        success: false,
        error: "Lỗi kết nối database: " + dbError.message,
      });
    }

    // Kiểm tra ID thư viện đã tồn tại chưa
    try {
      const existingLibrary = await pool.query(
        "SELECT id_thuvien FROM thu_vien WHERE id_thuvien = $1",
        [ID_thuvien]
      );

      if (existingLibrary.rows.length > 0) {
        console.log("❌ ID thư viện đã tồn tại:", ID_thuvien);
        return res.status(400).json({
          success: false,
          error: "ID thư viện đã tồn tại. Vui lòng chọn ID khác.",
        });
      }
    } catch (checkError) {
      console.error("❌ Lỗi khi kiểm tra ID:", checkError);
      return res.status(500).json({
        success: false,
        error: "Lỗi khi kiểm tra ID thư viện: " + checkError.message,
      });
    }

    // Xử lý ảnh nếu có
    let anh360Path = null;
    if (req.file) {
      anh360Path = "/images/360/" + req.file.filename;
      console.log("✅ File uploaded:", anh360Path);
    }

    // Xử lý và validate latitude/longitude
    let latitude = null;
    let longitude = null;

    if (Latitude && Latitude.trim() !== "") {
      const latValue = parseFloat(Latitude);
      // Latitude hợp lệ: -90 đến 90
      if (isNaN(latValue) || latValue < -90 || latValue > 90) {
        return res.status(400).json({
          success: false,
          error: "Latitude không hợp lệ. Giá trị phải từ -90 đến 90.",
        });
      }
      // Làm tròn đến 8 chữ số thập phân (phù hợp với precision 11, scale 8)
      latitude = Math.round(latValue * 100000000) / 100000000;
    }

    if (Longitude && Longitude.trim() !== "") {
      const lngValue = parseFloat(Longitude);
      // Longitude hợp lệ: -180 đến 180
      if (isNaN(lngValue) || lngValue < -180 || lngValue > 180) {
        return res.status(400).json({
          success: false,
          error: "Longitude không hợp lệ. Giá trị phải từ -180 đến 180.",
        });
      }
      // Làm tròn đến 8 chữ số thập phân (phù hợp với precision 11, scale 8)
      longitude = Math.round(lngValue * 100000000) / 100000000;
    }

    // Chuẩn bị giá trị để insert
    const insertValues = [
      ID_thuvien.trim(),
      Ten_thuvien.trim(),
      Dia_chi ? Dia_chi.trim() : null,
      Wifi === "on",
      Phongdoc === "on",
      Canteen === "on",
      Dieuhoa === "on",
      latitude,
      longitude,
      anh360Path,
      phanloai.trim(),
    ];

    // Debug: Log values để kiểm tra
    console.log("=== DEBUG INSERT VALUES ===");
    console.log("Values:", insertValues);
    console.log(
      "SQL:",
      `INSERT INTO thu_vien (
        id_thuvien, ten_thuvien, dia_chi, wifi, phongdoc, 
        canteen, dieuhoa, latitude, longitude, anh_360, phanloai
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`
    );

    // Thêm vào database
    const result = await pool.query(
      `INSERT INTO thu_vien (
          id_thuvien, ten_thuvien, dia_chi, wifi, phongdoc, 
          canteen, dieuhoa, latitude, longitude, anh_360, phanloai
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      insertValues
    );

    console.log("✅ Thêm thư viện thành công!");
    console.log("✅ Dữ liệu đã insert:", result.rows[0]);
    console.log("✅ Row count:", result.rowCount);

    // Xác nhận lại bằng cách query
    const verifyResult = await pool.query(
      "SELECT * FROM thu_vien WHERE id_thuvien = $1",
      [ID_thuvien]
    );
    console.log(
      "✅ Verify query result:",
      verifyResult.rows.length > 0 ? "Found" : "Not found"
    );

    // Kiểm tra nếu request là AJAX (có header X-Requested-With hoặc Accept: application/json)
    const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest' ||
      req.headers.accept && req.headers.accept.indexOf('application/json') !== -1;

    if (isAjax) {
      // Trả về JSON cho AJAX request
      res.json({
        success: true,
        data: result.rows[0],
        message: "Thêm thư viện thành công!",
      });
    } else {
      // Redirect về trang danh sách cho form submit thông thường
      res.redirect("/admin/thu_vien");
    }
  } catch (error) {
    console.error("❌ Lỗi khi thêm thư viện:", error);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error detail:", error.detail);
    console.error("❌ Error hint:", error.hint);
    console.error("❌ Error stack:", error.stack);

    // Xử lý lỗi database cụ thể
    let errorMessage = "Lỗi không xác định";
    let statusCode = 500;

    if (error.code === "22003") {
      // Numeric field overflow
      errorMessage = "Giá trị latitude hoặc longitude quá lớn. Latitude phải từ -90 đến 90, Longitude phải từ -180 đến 180.";
      statusCode = 400;
    } else if (error.code === "23505") {
      errorMessage = "ID thư viện đã tồn tại trong database";
      statusCode = 400;
    } else if (error.code === "23502") {
      errorMessage = "Thiếu thông tin bắt buộc trong database";
      statusCode = 400;
    } else if (error.code === "23514") {
      errorMessage = "Dữ liệu không hợp lệ theo ràng buộc database";
      statusCode = 400;
    } else if (error.code === "42P01") {
      errorMessage = "Bảng thu_vien không tồn tại trong database";
      statusCode = 500;
    } else if (error.code === "28P01") {
      errorMessage = "Lỗi xác thực database. Kiểm tra username/password";
      statusCode = 500;
    } else if (error.code === "3D000") {
      errorMessage = "Database không tồn tại";
      statusCode = 500;
    } else if (error.code === "08001") {
      errorMessage = "Không thể kết nối đến database";
      statusCode = 500;
    } else {
      errorMessage = error.message || "Lỗi không xác định";
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code: error.code,
      detail: error.detail,
    });
  }
});

// Xóa thư viện
router.delete("/delete/:id", async (req, res) => {
  console.log("🗑️ ===== BẮT ĐẦU XÓA THƯ VIỆN =====");
  console.log("Request ID:", req.params.id);
  const { id } = req.params;
  try {
    // Kiểm tra thư viện có tồn tại không
    const checkResult = await pool.query(
      "SELECT id_thuvien, ten_thuvien FROM thu_vien WHERE id_thuvien = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      console.log("❌ Thư viện không tồn tại");
      return res.status(404).json({
        success: false,
        error: "Thư viện không tồn tại",
      });
    }

    const libraryName = checkResult.rows[0].ten_thuvien;
    console.log("✅ Tìm thấy thư viện:", libraryName);

    // Xóa các bản ghi liên quan trong thu_vien_sach trước
    await pool.query("DELETE FROM thu_vien_sach WHERE id_thuvien = $1", [id]);
    console.log("✅ Đã xóa các bản ghi sách liên quan");

    // Xóa thư viện
    const result = await pool.query(
      "DELETE FROM thu_vien WHERE id_thuvien = $1 RETURNING *",
      [id]
    );

    console.log("✅ Xóa thư viện thành công");
    res.json({
      success: true,
      message: "Xóa thành công",
      deletedLibrary: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Lỗi khi xóa thư viện:", error);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error detail:", error.detail);
    res.status(500).json({
      success: false,
      error: "Lỗi server: " + error.message,
    });
  }
});

// Route để hiển thị thống kê thư viện - thể loại - số lượng sách
// PHẢI ĐẶT TRƯỚC các route động như /books/:id, /api/:id để tránh conflict
router.get("/statistics", async (req, res) => {
  try {
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

// Route API GET /admin/thu_vien/api/:id để lấy thông tin thư viện dạng JSON (cho modal)
router.get("/api/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM thu_vien WHERE id_thuvien = $1",
      [id]
    );
    if (result.rows.length > 0) {
      res.json({
        success: true,
        library: result.rows[0],
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Không tìm thấy thư viện",
      });
    }
  } catch (error) {
    console.error("Lỗi khi lấy thông tin thư viện:", error);
    res.status(500).json({
      success: false,
      error: "Lỗi khi lấy thông tin thư viện: " + error.message,
    });
  }
});

// Route GET /admin/thu_vien/update/:id để hiển thị form sửa
router.get("/update/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Sửa tên bảng thành 'thu_vien' (chữ thường)
    const result = await pool.query(
      "SELECT * FROM thu_vien WHERE id_thuvien = $1",
      [id]
    );
    if (result.rows.length > 0) {
      const thu_vien = result.rows[0];
      res.render("updateThuVien", { thu_vien });
    } else {
      res.status(404).send("Không tìm thấy thư viện");
    }
  } catch (error) {
    console.error("Lỗi khi lấy thông tin thư viện:", error);
    res.status(500).send("Lỗi khi hiển thị trang sửa thư viện");
  }
});

// Route POST /admin/thu_vien/update/:id để xử lý cập nhật với upload ảnh 360 và phanloai
router.post("/update/:id", upload.single("Anh360"), async (req, res) => {
  console.log("📝 ===== BẮT ĐẦU CẬP NHẬT THƯ VIỆN =====");
  console.log("Request ID:", req.params.id);
  console.log("Request body:", req.body);
  console.log(
    "Request file:",
    req.file
      ? {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
      }
      : "Không có file"
  );

  const { id } = req.params;
  const {
    Ten_thuvien,
    Dia_chi,
    Wifi,
    Phongdoc,
    Canteen,
    Dieuhoa,
    Latitude,
    Longitude,
    phanloai,
    currentAnh360,
  } = req.body;

  // Validation dữ liệu đầu vào
  if (!Ten_thuvien || !phanloai) {
    console.log("❌ Validation failed:", { Ten_thuvien, phanloai });
    return res.status(400).json({
      success: false,
      error: "Thiếu thông tin bắt buộc: Tên thư viện và loại thư viện",
    });
  }

  // Chuyển giá trị checkbox thành boolean
  const wifi = Wifi === "on";
  const phongdoc = Phongdoc === "on";
  const canteen = Canteen === "on";
  const dieuhoa = Dieuhoa === "on";

  // Xử lý ảnh 360 (nếu có file mới, cập nhật; nếu không, giữ nguyên giá trị cũ)
  let anh_360 = currentAnh360 || null;
  if (req.file) {
    // Lưu vào thư mục public/images/360/
    anh_360 = "/images/360/" + req.file.filename;
    console.log("✅ File uploaded:", anh_360);
  }

  // Xử lý và validate latitude/longitude
  let latitude = null;
  let longitude = null;

  if (Latitude && Latitude.trim() !== "") {
    const latValue = parseFloat(Latitude);
    // Latitude hợp lệ: -90 đến 90
    if (isNaN(latValue) || latValue < -90 || latValue > 90) {
      return res.status(400).json({
        success: false,
        error: "Latitude không hợp lệ. Giá trị phải từ -90 đến 90.",
      });
    }
    // Làm tròn đến 8 chữ số thập phân (phù hợp với precision 11, scale 8)
    latitude = Math.round(latValue * 100000000) / 100000000;
  }

  if (Longitude && Longitude.trim() !== "") {
    const lngValue = parseFloat(Longitude);
    // Longitude hợp lệ: -180 đến 180
    if (isNaN(lngValue) || lngValue < -180 || lngValue > 180) {
      return res.status(400).json({
        success: false,
        error: "Longitude không hợp lệ. Giá trị phải từ -180 đến 180.",
      });
    }
    // Làm tròn đến 8 chữ số thập phân (phù hợp với precision 11, scale 8)
    longitude = Math.round(lngValue * 100000000) / 100000000;
  }

  try {
    // Kiểm tra thư viện có tồn tại không
    const checkResult = await pool.query(
      "SELECT id_thuvien FROM thu_vien WHERE id_thuvien = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      console.log("❌ Thư viện không tồn tại");
      return res.status(404).json({
        success: false,
        error: "Thư viện không tồn tại",
      });
    }

    // Cập nhật thư viện
    const result = await pool.query(
      `UPDATE thu_vien 
             SET ten_thuvien = $1, dia_chi = $2, wifi = $3, phongdoc = $4, canteen = $5, dieuhoa = $6, latitude = $7, longitude = $8, anh_360 = $9, phanloai = $10
             WHERE id_thuvien = $11 RETURNING *`,
      [
        Ten_thuvien.trim(),
        Dia_chi ? Dia_chi.trim() : null,
        wifi,
        phongdoc,
        canteen,
        dieuhoa,
        latitude,
        longitude,
        anh_360,
        phanloai.trim(),
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Không thể cập nhật thư viện",
      });
    }

    console.log("✅ Cập nhật thư viện thành công");
    console.log("✅ Dữ liệu đã update:", result.rows[0]);

    // Nếu request từ form HTML (không phải AJAX), redirect
    if (
      req.headers["content-type"] &&
      req.headers["content-type"].includes("multipart/form-data")
    ) {
      res.redirect("/admin/thu_vien");
    } else {
      // Nếu request từ AJAX, trả về JSON
      res.json({
        success: true,
        message: "Cập nhật thư viện thành công!",
        data: result.rows[0],
      });
    }
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật thư viện:", error);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error detail:", error.detail);

    let errorMessage = "Lỗi không xác định";
    if (error.code === "22003") {
      // Numeric field overflow
      errorMessage = "Giá trị latitude hoặc longitude quá lớn. Latitude phải từ -90 đến 90, Longitude phải từ -180 đến 180.";
    } else if (error.code === "23505") {
      errorMessage = "Dữ liệu trùng lặp";
    } else if (error.code === "23502") {
      errorMessage = "Thiếu thông tin bắt buộc";
    }

    res.status(500).json({
      success: false,
      error: errorMessage + ": " + error.message,
    });
  }
});

// API cập nhật nhanh thư viện bằng JSON (không xử lý upload)
router.put("/update-json/:id", async (req, res) => {
  const { id } = req.params;
  try {
    console.log("📝 UPDATE-JSON REQ ID:", id);
    console.log("📝 UPDATE-JSON BODY:", req.body);
    const {
      ten_thuvien,
      dia_chi,
      phanloai,
      wifi,
      phongdoc,
      canteen,
      dieuhoa,
      latitude,
      longitude,
    } = req.body || {};

    // Validate cơ bản
    if (!ten_thuvien || !phanloai) {
      return res
        .status(400)
        .json({ success: false, error: "Thiếu tên thư viện hoặc loại" });
    }

    // Xử lý và validate latitude/longitude
    let latValue = null;
    let lngValue = null;

    if (latitude !== undefined && latitude !== null && latitude !== "") {
      const lat = parseFloat(latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({
          success: false,
          error: "Latitude không hợp lệ. Giá trị phải từ -90 đến 90.",
        });
      }
      latValue = Math.round(lat * 100000000) / 100000000;
    }

    if (longitude !== undefined && longitude !== null && longitude !== "") {
      const lng = parseFloat(longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          error: "Longitude không hợp lệ. Giá trị phải từ -180 đến 180.",
        });
      }
      lngValue = Math.round(lng * 100000000) / 100000000;
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
        latValue,
        lngValue,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Không tìm thấy thư viện" });
    }

    res.json({ success: true, library: result.rows[0] });
  } catch (error) {
    console.error("❌ Lỗi update-json thư viện:", error);
    res
      .status(500)
      .json({ success: false, error: "Lỗi server: " + error.message });
  }
});

// Route để hiển thị danh sách thư viện với số lượng sách
// LƯU Ý: Route này có thể không cần thiết vì đã có route GET "/" ở trên
// Giữ lại để tương thích ngược nếu có code khác đang sử dụng
router.get("/admin/thu-vien", async (req, res, next) => {
  try {
    // Lấy danh sách thư viện với thống kê sách
    const query = `
            SELECT 
                tv.id_thuvien,
                tv.ten_thuvien,
                tv.dia_chi,
                tv.so_dien_thoai,
                tv.email,
                tv.mo_ta,
                tv.anh_dai_dien,
                tv.ngay_tao,
                COUNT(s.id_sach) as tong_so_sach,
                SUM(s.slton) as tong_so_luong_con,
                SUM(s.tongsl) as tong_so_luong_ban_dau,
                CASE 
                    WHEN COUNT(s.id_sach) = 0 THEN 'Chưa có sách'
                    WHEN SUM(s.slton) = 0 THEN 'Hết sách'
                    WHEN SUM(s.slton) < SUM(s.tongsl) * 0.2 THEN 'Cần bổ sung'
                    WHEN SUM(s.slton) < SUM(s.tongsl) * 0.5 THEN 'Cần chú ý'
                    ELSE 'Tốt'
                END as trang_thai_sach
            FROM thu_vien tv
            LEFT JOIN sach s ON tv.id_thuvien = s.id_thuvien
            GROUP BY tv.id_thuvien, tv.ten_thuvien, tv.dia_chi, tv.so_dien_thoai, tv.email, tv.mo_ta, tv.anh_dai_dien, tv.ngay_tao
            ORDER BY tv.ten_thuvien
        `;

    const result = await pool.query(query);

    res.render("thu_vien", {
      title: "Quản lý thư viện",
      libraries: result.rows,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách thư viện:", error);
    res.status(500).render("error", { message: "Lỗi server" });
  }
});

// Route test để kiểm tra route có hoạt động không
router.get("/books/test", (req, res) => {
  res.json({
    success: true,
    message: "Route books hoạt động bình thường",
    timestamp: new Date().toISOString(),
  });
});

// Route để lấy danh sách sách có sẵn cho thư viện - SỬA LẠI
router.get("/books/available/:id", async (req, res) => {
  const { id } = req.params;
  try {
    console.log(" ===== LẤY DANH SÁCH SÁCH CÓ SẴN =====");
    console.log("📚 Thư viện ID:", id);

    // Lấy danh sách sách có số lượng > 0
    const booksResult = await pool.query(`
            SELECT 
                s.id_sach,
                s.ten_sach,
                s.tac_gia,
                s.nam_xuat_ban,
                s.slton,
                s.tongsl,
                tl.ten_theloai
            FROM sach s
            JOIN the_loai tl ON s.id_theloai = tl.id_theloai
            WHERE s.slton > 0
            ORDER BY s.ten_sach ASC
        `);

    console.log("📚 Số sách tìm thấy:", booksResult.rows.length);
    console.log("📚 Dữ liệu sách:", booksResult.rows);

    res.json({
      success: true,
      books: booksResult.rows,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách sách:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi lấy danh sách sách",
      error: error.message,
    });
  }
});

// Route để thêm sách vào thư viện - SỬA LẠI
router.post("/add-book", async (req, res) => {
  const { library_id, book_id, quantity, reason, note } = req.body;

  console.log(" ===== BẮT ĐẦU THÊM SÁCH VÀO THƯ VIỆN =====");
  console.log("📚 Dữ liệu:", { library_id, book_id, quantity, reason, note });

  try {
    // Kiểm tra dữ liệu đầu vào
    if (!library_id || !book_id || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc",
      });
    }

    // Kiểm tra thư viện có tồn tại không
    const libraryResult = await pool.query(
      "SELECT * FROM thu_vien WHERE id_thuvien = $1",
      [library_id]
    );

    if (libraryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thư viện",
      });
    }

    // Kiểm tra sách có tồn tại không
    const bookResult = await pool.query(
      "SELECT * FROM sach WHERE id_sach = $1",
      [book_id]
    );

    if (bookResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sách",
      });
    }

    const book = bookResult.rows[0];

    // Kiểm tra số lượng có đủ không
    if (quantity > book.slton) {
      return res.status(400).json({
        success: false,
        message: `Số lượng không được vượt quá ${book.slton} quyển còn lại`,
      });
    }

    // Kiểm tra sách đã có trong thư viện chưa
    const existingResult = await pool.query(
      "SELECT * FROM thu_vien_sach WHERE id_thuvien = $1 AND id_sach = $2",
      [library_id, book_id]
    );

    if (existingResult.rows.length > 0) {
      // Cập nhật số lượng nếu đã có
      await pool.query(
        "UPDATE thu_vien_sach SET so_luong = so_luong + $1, ngay_them = CURRENT_TIMESTAMP WHERE id_thuvien = $2 AND id_sach = $3",
        [quantity, library_id, book_id]
      );
    } else {
      // Thêm mới nếu chưa có
      await pool.query(
        "INSERT INTO thu_vien_sach (id_thuvien, id_sach, so_luong, ngay_them) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)",
        [library_id, book_id, quantity]
      );
    }

    // Cập nhật số lượng tồn kho
    await pool.query("UPDATE sach SET slton = slton - $1 WHERE id_sach = $2", [
      quantity,
      book_id,
    ]);

    console.log("✅ Thêm sách vào thư viện thành công");

    res.json({
      success: true,
      message: "Thêm sách vào thư viện thành công",
    });
  } catch (error) {
    console.error("❌ Lỗi khi thêm sách vào thư viện:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi thêm sách vào thư viện",
      error: error.message,
    });
  }
});

// Route để lấy TẤT CẢ sách từ bảng sach (cho dropdown chọn sách)
// Đổi tên thành /all-books để tránh hoàn toàn conflict với /books/:id
router.get("/all-books", async (req, res) => {
  try {
    console.log("✅ ===== ROUTE /all-books ĐƯỢC GỌI =====");
    console.log("📚 Lấy tất cả sách từ bảng sach...");
    console.log("📚 Request URL:", req.url);
    console.log("📚 Request path:", req.path);
    console.log("📚 Request method:", req.method);
    console.log("📚 Request originalUrl:", req.originalUrl);

    const booksResult = await pool.query(`
            SELECT 
                s.id_sach,
                s.ten_sach,
                s.tac_gia,
                s.nam_xuat_ban,
                s.slton,
                s.tongsl,
                s.digital_file,
                COALESCE(tl.ten_theloai, 'Chưa phân loại') as ten_theloai
            FROM sach s
            LEFT JOIN the_loai tl ON s.id_theloai = tl.id_theloai
            ORDER BY s.ten_sach ASC
        `);

    console.log(`✅ Tìm thấy ${booksResult.rows.length} sách`);

    res.json({
      success: true,
      books: booksResult.rows,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy tất cả sách:", error);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error detail:", error.detail);
    res.status(500).json({
      success: false,
      error: "Lỗi server: " + error.message,
    });
  }
});

// Route để xem sách của thư viện
router.get("/books/:id", async (req, res) => {
  const { id } = req.params;

  // QUAN TRỌNG: Kiểm tra nếu id là "all" thì không xử lý ở đây
  // Route /books/all đã được định nghĩa riêng ở trên và phải được match trước
  if (id === "all") {
    console.log("⚠️ Route /books/:id được gọi với id='all' - Điều này không nên xảy ra!");
    console.log("⚠️ Route /books/all phải được match trước route /books/:id");
    // Không trả về response, để Express tiếp tục tìm route khác
    // Nhưng trong Express, một khi route được match thì không thể skip
    // Vì vậy cần đảm bảo route /books/all được định nghĩa TRƯỚC route này
    return res.status(404).json({
      success: false,
      error: "Route không tồn tại. Vui lòng sử dụng /books/all để lấy tất cả sách.",
    });
  }

  try {
    console.log("📚 ===== BẮT ĐẦU LẤY SÁCH THƯ VIỆN =====");
    console.log("📚 Thư viện ID:", id);
    console.log("📚 ID type:", typeof id);
    console.log("📚 ID value:", JSON.stringify(id));

    // Validate ID - kiểm tra kỹ hơn
    if (!id || id.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "ID thư viện không được để trống.",
      });
    }

    const libraryId = id.trim();

    // Lấy thông tin thư viện (dùng id dạng chuỗi hoặc số đều được)
    const libraryResult = await pool.query(
      "SELECT * FROM thu_vien WHERE id_thuvien = $1",
      [libraryId]
    );

    if (libraryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy thư viện với ID: " + libraryId,
      });
    }

    const library = libraryResult.rows[0];
    console.log("📚 Thư viện:", library.ten_thuvien);

    // Lấy danh sách sách của thư viện này từ thu_vien_sach
    const booksResult = await pool.query(
      `SELECT 
          s.id_sach,
          s.ten_sach,
          s.tac_gia,
          s.nam_xuat_ban,
          s.slton,
          s.tongsl,
          s.digital_file,
          ts.so_luong as so_luong_trong_thu_vien,
          ts.ngay_them,
          COALESCE(tl.ten_theloai, 'Chưa phân loại') as ten_theloai
       FROM thu_vien_sach ts
       JOIN sach s ON ts.id_sach = s.id_sach
       LEFT JOIN the_loai tl ON s.id_theloai = tl.id_theloai
       WHERE ts.id_thuvien = $1
       ORDER BY s.ten_sach ASC`,
      [libraryId]
    );

    console.log("📚 Số sách tìm thấy:", booksResult.rows.length);

    res.json({
      success: true,
      library: library,
      books: booksResult.rows,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy sách thư viện:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      success: false,
      error: "Có lỗi xảy ra khi lấy sách thư viện: " + error.message,
    });
  }
});

// Route để lấy danh sách sách có thể thêm vào thư viện
router.get("/books/:id/available", async (req, res) => {
  const { id } = req.params;
  try {
    // Lấy sách chưa có trong thư viện này
    const booksResult = await pool.query(
      `
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
        `,
      [id]
    );

    res.json({
      success: true,
      books: booksResult.rows,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy sách có sẵn:", error);
    res.status(500).json({
      success: false,
      error: "Lỗi server: " + error.message,
    });
  }
});

// Route để thêm sách vào thư viện
router.post("/books/:id/add", async (req, res) => {
  const { id } = req.params;
  const { sach_id, so_luong } = req.body;

  try {
    console.log("➕ Thêm sách vào thư viện:", { id, sach_id, so_luong });

    // Kiểm tra sách có tồn tại không
    const sachResult = await pool.query(
      "SELECT id_sach, ten_sach, tongsl FROM sach WHERE id_sach = $1",
      [sach_id]
    );

    if (sachResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy sách",
      });
    }

    const sach = sachResult.rows[0];

    // Tính tổng số lượng đã phân bố cho sách này
    const totalDistributedResult = await pool.query(
      "SELECT COALESCE(SUM(so_luong), 0) as total_distributed FROM thu_vien_sach WHERE id_sach = $1",
      [sach_id]
    );

    const totalDistributed = parseInt(
      totalDistributedResult.rows[0].total_distributed
    );
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
          requested: parseInt(so_luong),
        },
      });
    }

    // Kiểm tra sách đã có trong thư viện chưa
    const existingResult = await pool.query(
      "SELECT * FROM thu_vien_sach WHERE id_thuvien = $1 AND id_sach = $2",
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
            totalAvailable: totalAvailable,
          },
        });
      }

      await pool.query(
        "UPDATE thu_vien_sach SET so_luong = so_luong + $1 WHERE id_thuvien = $2 AND id_sach = $3",
        [so_luong, id, sach_id]
      );
    } else {
      // Thêm mới
      await pool.query(
        "INSERT INTO thu_vien_sach (id_thuvien, id_sach, so_luong) VALUES ($1, $2, $3)",
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
        remainingAvailable: availableToAdd - parseInt(so_luong),
      },
    });
  } catch (error) {
    console.error("❌ Lỗi khi thêm sách:", error);
    res.status(500).json({
      success: false,
      error: "Lỗi server: " + error.message,
    });
  }
});

// Route để xóa sách khỏi thư viện
router.delete("/books/:id/remove/:sach_id", async (req, res) => {
  const { id, sach_id } = req.params;

  console.log("🗑️ ===== BẮT ĐẦU XÓA SÁCH KHỎI THƯ VIỆN =====");
  console.log("📚 Thư viện ID:", id);
  console.log("📖 Sách ID:", sach_id);

  try {
    // Kiểm tra sách có trong thư viện không
    const checkResult = await pool.query(
      "SELECT ts.so_luong, s.ten_sach FROM thu_vien_sach ts JOIN sach s ON ts.id_sach = s.id_sach WHERE ts.id_thuvien = $1 AND ts.id_sach = $2",
      [id, sach_id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Sách không tồn tại trong thư viện này",
      });
    }

    const soLuong = checkResult.rows[0].so_luong;
    const tenSach = checkResult.rows[0].ten_sach;
    console.log("✅ Tìm thấy sách:", tenSach, "Số lượng:", soLuong);

    // Xóa sách khỏi thư viện
    await pool.query(
      "DELETE FROM thu_vien_sach WHERE id_thuvien = $1 AND id_sach = $2",
      [id, sach_id]
    );

    // Trả số lượng về kho (cập nhật slton)
    await pool.query("UPDATE sach SET slton = slton + $1 WHERE id_sach = $2", [
      soLuong,
      sach_id,
    ]);

    console.log("✅ Đã xóa sách và trả lại", soLuong, "quyển vào kho");

    res.json({
      success: true,
      message: `Đã xóa "${tenSach}" khỏi thư viện và trả lại ${soLuong} quyển vào kho`,
    });
  } catch (error) {
    console.error("❌ Lỗi khi xóa sách:", error);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error detail:", error.detail);
    res.status(500).json({
      success: false,
      error: "Lỗi server: " + error.message,
    });
  }
});

// Route để cập nhật số lượng sách trong thư viện
router.put("/books/:id/update/:sach_id", async (req, res) => {
  const { id, sach_id } = req.params;
  const { so_luong } = req.body;

  console.log("📝 ===== BẮT ĐẦU CẬP NHẬT SỐ LƯỢNG SÁCH =====");
  console.log("📚 Thư viện ID:", id);
  console.log("📖 Sách ID:", sach_id);
  console.log("🔢 Số lượng mới:", so_luong);

  try {
    // Validate số lượng
    const newQuantity = parseInt(so_luong);
    if (isNaN(newQuantity) || newQuantity < 0) {
      return res.status(400).json({
        success: false,
        error: "Số lượng không hợp lệ",
      });
    }

    // Kiểm tra sách có trong thư viện không
    const checkResult = await pool.query(
      "SELECT ts.so_luong as so_luong_hien_tai, s.tongsl, s.ten_sach FROM thu_vien_sach ts JOIN sach s ON ts.id_sach = s.id_sach WHERE ts.id_thuvien = $1 AND ts.id_sach = $2",
      [id, sach_id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Sách không tồn tại trong thư viện này",
      });
    }

    const currentQuantity = checkResult.rows[0].so_luong_hien_tai;
    const totalAvailable = parseInt(checkResult.rows[0].tongsl);
    const tenSach = checkResult.rows[0].ten_sach;

    // Kiểm tra số lượng mới không vượt quá tổng số lượng
    if (newQuantity > totalAvailable) {
      return res.status(400).json({
        success: false,
        error: `Số lượng không được vượt quá ${totalAvailable} quyển (tổng số lượng của sách)`,
      });
    }

    // Tính toán chênh lệch
    const difference = newQuantity - currentQuantity;

    // Cập nhật số lượng trong thu_vien_sach
    await pool.query(
      "UPDATE thu_vien_sach SET so_luong = $1 WHERE id_thuvien = $2 AND id_sach = $3",
      [newQuantity, id, sach_id]
    );

    // Cập nhật số lượng tồn kho (slton) - giảm nếu tăng số lượng trong thư viện, tăng nếu giảm
    if (difference !== 0) {
      await pool.query(
        "UPDATE sach SET slton = slton - $1 WHERE id_sach = $2",
        [difference, sach_id]
      );
    }

    console.log("✅ Cập nhật số lượng thành công");
    console.log(
      "📊 Chênh lệch:",
      difference > 0 ? `+${difference}` : difference
    );

    res.json({
      success: true,
      message: `Đã cập nhật số lượng "${tenSach}" từ ${currentQuantity} thành ${newQuantity} quyển`,
    });
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật số lượng:", error);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error detail:", error.detail);
    res.status(500).json({
      success: false,
      error: "Lỗi server: " + error.message,
    });
  }
});

// Route test để kiểm tra sách
router.get("/test-books", async (req, res) => {
  try {
    console.log("🧪 Test route sách");

    const booksResult = await pool.query(`
            SELECT 
                s.id_sach,
                s.ten_sach,
                s.tac_gia,
                s.slton,
                tl.ten_theloai
            FROM sach s
            JOIN the_loai tl ON s.id_theloai = tl.id_theloai
            WHERE s.slton > 0
            ORDER BY s.ten_sach ASC
            LIMIT 5
        `);

    res.json({
      success: true,
      message: "Test thành công",
      books: booksResult.rows,
      count: booksResult.rows.length,
    });
  } catch (error) {
    console.error("❌ Lỗi test sách:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


module.exports = router;
