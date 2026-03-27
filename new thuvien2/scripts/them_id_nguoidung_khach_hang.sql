-- ========================================
-- Migration: Thêm cột id_user vào bảng khach_hang
-- Mục đích: Liên kết khách hàng với tài khoản người dùng đã đăng nhập
-- LƯU Ý: Bảng nguoi_dung sử dụng cột id_user (không phải id_nguoidung)
-- ========================================

-- Bước 1: Xóa cột id_nguoidung cũ nếu có (nếu đã chạy migration sai trước đó)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'khach_hang' 
        AND column_name = 'id_nguoidung'
    ) THEN
        -- Xóa foreign key constraint cũ nếu có
        IF EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_khach_hang_nguoidung'
            AND table_name = 'khach_hang'
        ) THEN
            ALTER TABLE khach_hang DROP CONSTRAINT fk_khach_hang_nguoidung;
        END IF;
        
        -- Xóa index cũ nếu có
        DROP INDEX IF EXISTS idx_khach_hang_nguoidung;
        
        -- Xóa cột cũ
        ALTER TABLE khach_hang DROP COLUMN id_nguoidung;
        RAISE NOTICE '✅ Đã xóa cột id_nguoidung cũ';
    END IF;
END $$;

-- Bước 2: Thêm cột id_user (đúng tên cột trong bảng nguoi_dung)
ALTER TABLE khach_hang 
ADD COLUMN IF NOT EXISTS id_user INTEGER;

-- Bước 3: Thêm foreign key constraint (chỉ nếu chưa có)
DO $$
BEGIN
    -- Kiểm tra xem constraint đã tồn tại chưa
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_khach_hang_user'
        AND table_name = 'khach_hang'
    ) THEN
        -- Thêm foreign key constraint - tham chiếu đến id_user trong nguoi_dung
        ALTER TABLE khach_hang 
        ADD CONSTRAINT fk_khach_hang_user 
        FOREIGN KEY (id_user) 
        REFERENCES nguoi_dung(id_user)
        ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Đã thêm foreign key constraint';
    ELSE
        RAISE NOTICE 'ℹ️ Foreign key constraint đã tồn tại';
    END IF;
END $$;

-- Bước 4: Thêm index
CREATE INDEX IF NOT EXISTS idx_khach_hang_user 
ON khach_hang(id_user);

-- Bước 5: Kiểm tra kết quả
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'khach_hang'
AND column_name = 'id_user';

-- Thông báo hoàn thành
DO $$
BEGIN
    RAISE NOTICE '🎉 Migration hoàn thành! Cột id_user đã được thêm vào bảng khach_hang';
END $$;

