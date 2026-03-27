-- Script kiểm tra và đảm bảo cột payment_proof_image đã tồn tại
-- Chạy script này trong pgAdmin4 để kiểm tra

-- 1. Kiểm tra cột payment_proof_image trong bảng don_hang
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'don_hang' 
  AND column_name = 'payment_proof_image';

-- 2. Nếu cột chưa tồn tại, thêm vào
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'don_hang' AND column_name = 'payment_proof_image'
    ) THEN
        ALTER TABLE don_hang ADD COLUMN payment_proof_image VARCHAR(500);
        RAISE NOTICE '✅ Đã thêm cột payment_proof_image vào bảng don_hang';
    ELSE
        RAISE NOTICE '✅ Cột payment_proof_image đã tồn tại trong bảng don_hang';
    END IF;
END $$;

-- 3. Kiểm tra một số đơn hàng có ảnh minh chứng
SELECT 
    id_don_hang,
    ten_khach_hang,
    trang_thai,
    phuong_thuc_thanh_toan,
    payment_proof_image,
    CASE 
        WHEN payment_proof_image IS NOT NULL THEN '✅ Có ảnh'
        ELSE '❌ Chưa có ảnh'
    END as trang_thai_anh
FROM don_hang dh
JOIN khach_hang kh ON dh.id_khach_hang = kh.id_khach_hang
ORDER BY dh.ngay_dat DESC
LIMIT 10;

-- 4. Thống kê đơn hàng có/không có ảnh minh chứng
SELECT 
    COUNT(*) as tong_don_hang,
    COUNT(payment_proof_image) as don_co_anh,
    COUNT(*) - COUNT(payment_proof_image) as don_chua_co_anh
FROM don_hang;

-- Thông báo hoàn thành
SELECT '✅ Đã hoàn thành kiểm tra cấu hình ảnh minh chứng!' as message;

