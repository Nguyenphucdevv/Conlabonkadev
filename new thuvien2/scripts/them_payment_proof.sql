-- Script thêm hỗ trợ thanh toán chuyển khoản và QR code
-- Chạy script này để thêm các cột và bảng cần thiết

-- 1. Thêm cột payment_proof_image vào bảng don_hang (nếu chưa có)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'don_hang' AND column_name = 'payment_proof_image'
    ) THEN
        ALTER TABLE don_hang ADD COLUMN payment_proof_image VARCHAR(500);
        RAISE NOTICE 'Đã thêm cột payment_proof_image vào bảng don_hang';
    ELSE
        RAISE NOTICE 'Cột payment_proof_image đã tồn tại trong bảng don_hang';
    END IF;
END $$;

-- 2. Tạo bảng payment_config để lưu cấu hình QR code thanh toán
CREATE TABLE IF NOT EXISTS payment_config (
    id_config SERIAL PRIMARY KEY,
    payment_method VARCHAR(100) NOT NULL UNIQUE,
    qr_image VARCHAR(500),
    account_number VARCHAR(50),
    account_name VARCHAR(200),
    bank_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Thêm comment cho các cột
COMMENT ON TABLE payment_config IS 'Bảng cấu hình QR code và thông tin thanh toán';
COMMENT ON COLUMN payment_config.payment_method IS 'Phương thức thanh toán (Chuyển khoản ngân hàng, Ví MoMo, ...)';
COMMENT ON COLUMN payment_config.qr_image IS 'Đường dẫn đến ảnh QR code';
COMMENT ON COLUMN payment_config.account_number IS 'Số tài khoản';
COMMENT ON COLUMN payment_config.account_name IS 'Tên chủ tài khoản';
COMMENT ON COLUMN payment_config.bank_name IS 'Tên ngân hàng';
COMMENT ON COLUMN payment_config.is_active IS 'Trạng thái kích hoạt';

-- 4. Thêm dữ liệu mẫu (admin có thể cập nhật sau)
INSERT INTO payment_config (payment_method, qr_image, account_number, account_name, bank_name, is_active)
VALUES 
    ('Chuyển khoản ngân hàng', NULL, NULL, NULL, NULL, false),
    ('Ví MoMo', NULL, NULL, NULL, NULL, false)
ON CONFLICT (payment_method) DO NOTHING;

-- 5. Tạo index để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_payment_config_method ON payment_config(payment_method);
CREATE INDEX IF NOT EXISTS idx_payment_config_active ON payment_config(is_active);

-- Thông báo hoàn thành
SELECT '✅ Đã hoàn thành cấu hình thanh toán chuyển khoản!' as message;

