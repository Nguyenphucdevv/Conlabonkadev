-- ========================================
-- Script kiểm tra và sửa đơn hàng không hiển thị
-- ========================================

-- Bước 1: Kiểm tra user và khách hàng
SELECT 
    nd.id_user,
    nd.tai_khoan,
    nd.email,
    nd.so_dt,
    kh.id_khach_hang,
    kh.id_user as kh_id_user,
    kh.email as kh_email,
    kh.so_dien_thoai
FROM nguoi_dung nd
LEFT JOIN khach_hang kh ON nd.id_user = kh.id_user
WHERE nd.tai_khoan = 'Phuc123';  -- Thay bằng tài khoản của bạn

-- Bước 2: Kiểm tra đơn hàng của user theo id_user
SELECT 
    dh.id_don_hang,
    dh.ngay_dat,
    dh.trang_thai,
    dh.tong_tien,
    kh.id_khach_hang,
    kh.id_user,
    kh.email,
    kh.so_dien_thoai,
    nd.tai_khoan
FROM don_hang dh
JOIN khach_hang kh ON dh.id_khach_hang = kh.id_khach_hang
LEFT JOIN nguoi_dung nd ON kh.id_user = nd.id_user
WHERE kh.id_user IS NOT NULL
ORDER BY dh.ngay_dat DESC
LIMIT 10;

-- Bước 3: Kiểm tra đơn hàng theo email/sdt (nếu id_user chưa có)
SELECT 
    dh.id_don_hang,
    dh.ngay_dat,
    dh.trang_thai,
    kh.id_khach_hang,
    kh.id_user,
    kh.email,
    kh.so_dien_thoai,
    nd.tai_khoan
FROM don_hang dh
JOIN khach_hang kh ON dh.id_khach_hang = kh.id_khach_hang
LEFT JOIN nguoi_dung nd ON (
    (kh.email IS NOT NULL AND nd.email = kh.email) OR
    (kh.so_dien_thoai IS NOT NULL AND nd.so_dt = kh.so_dien_thoai)
)
WHERE kh.id_user IS NULL
ORDER BY dh.ngay_dat DESC
LIMIT 10;

-- Bước 4: Cập nhật id_user cho khách hàng dựa trên email/sdt
UPDATE khach_hang kh
SET id_user = nd.id_user
FROM nguoi_dung nd
WHERE kh.id_user IS NULL
AND (
    (kh.email IS NOT NULL AND kh.email != '' AND nd.email = kh.email) OR
    (kh.so_dien_thoai IS NOT NULL AND kh.so_dien_thoai != '' AND nd.so_dt = kh.so_dien_thoai)
)
AND nd.id_user IS NOT NULL;

-- Bước 5: Kiểm tra lại sau khi cập nhật
SELECT 
    kh.id_khach_hang,
    kh.ten_khach_hang,
    kh.id_user,
    nd.tai_khoan,
    COUNT(dh.id_don_hang) as so_don_hang
FROM khach_hang kh
LEFT JOIN nguoi_dung nd ON kh.id_user = nd.id_user
LEFT JOIN don_hang dh ON kh.id_khach_hang = dh.id_khach_hang
WHERE kh.id_user IS NOT NULL
GROUP BY kh.id_khach_hang, kh.ten_khach_hang, kh.id_user, nd.tai_khoan
ORDER BY kh.id_khach_hang DESC;

