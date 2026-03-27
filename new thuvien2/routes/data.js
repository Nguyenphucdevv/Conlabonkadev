const { Pool } = require('pg');
const express = require('express');
const router = express.Router();

const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: String(process.env.DB_PASSWORD),
    port: process.env.DB_PORT,
    options: '-c search_path=public'
};

const pool = new Pool(dbConfig);

router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT jsonb_build_object(
                'type', 'FeatureCollection',
                'features', jsonb_agg(feature)
            )
            FROM (
                SELECT jsonb_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(thu_vien.Longitude, thu_vien.Latitude), 4326))::jsonb,
                    'properties', jsonb_build_object(
                        'ID', thu_vien.ID_thuvien,
                        'TenThuVien', thu_vien.Ten_thuvien,
                        'DiaChi', thu_vien.Dia_chi,
                        'Wifi', thu_vien.Wifi,
                        'PhongDoc', thu_vien.Phongdoc,
                        'Canteen', thu_vien.Canteen,
                        'DieuHoa', thu_vien.Dieuhoa,
                        'Anh360', COALESCE(thu_vien.anh_360, ''),
                        'phanloai', thu_vien.phanloai,
                        'Sachs', (
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'ID_sach', Sach.id_sach,
                                    'TenSach', Sach.Ten_sach,
                                    'TacGia', Sach.Tac_gia,
                                    'NamXuatBan', Sach.Nam_xuat_ban,
                                    'SlTon', COALESCE(Sach.Slton, 0),
                                    'TheLoai', The_loai.Ten_theloai,
                                    'digital_file', CASE 
                                        WHEN thu_vien.phanloai = 'Thư viện công cộng(có thư viện số)' 
                                        AND The_loai.id_theloai IN (1, 4, 7, 9) -- Chỉ 4 thể loại
                                        THEN COALESCE(Sach.digital_file, '') 
                                        ELSE '' 
                                    END
                                )
                            )
                            FROM Sach
                            JOIN The_loai ON Sach.ID_theloai = The_loai.ID_theloai
                            WHERE The_loai.ID_thuvien = thu_vien.ID_thuvien
                        ),
                        'Ratings', (
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'score', Danh_gia.Diem_so,
                                    'user', nguoi_dung.tai_khoan,
                                    'timestamp', Danh_gia.Thoi_gian
                                )
                            )
                            FROM Danh_gia
                            JOIN nguoi_dung ON Danh_gia.id_user = nguoi_dung.id_user
                            WHERE Danh_gia.ID_thuvien = thu_vien.ID_thuvien
                        ),
                        'Comments', (
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'text', Binh_luan.Noi_dung,
                                    'user', nguoi_dung.tai_khoan,
                                    'timestamp', Binh_luan.Thoi_gian
                                )
                            )
                            FROM Binh_luan
                            JOIN nguoi_dung ON Binh_luan.id_user = nguoi_dung.id_user
                            WHERE Binh_luan.ID_thuvien = thu_vien.ID_thuvien
                        )
                    )
                ) AS feature
                FROM thu_vien
                LEFT JOIN The_loai ON thu_vien.ID_thuvien = The_loai.ID_thuvien
                GROUP BY thu_vien.ID_thuvien, thu_vien.Ten_thuvien, thu_vien.Dia_chi, thu_vien.Wifi, 
                         thu_vien.Phongdoc, thu_vien.Canteen, thu_vien.Dieuhoa, thu_vien.Longitude, 
                         thu_vien.Latitude, thu_vien.anh_360, thu_vien.phanloai
            ) feature;
        `;

        const result = await pool.query(query);
        const data = result.rows[0].jsonb_build_object || { type: 'FeatureCollection', features: [] };
        res.json(data);
    } catch (error) {
        console.error('Error fetching library data:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;