-- Script cập nhật QR code và thông tin thanh toán
-- Chạy script này để cập nhật QR code vào database

-- 1. Cập nhật QR code cho "Chuyển khoản ngân hàng"
-- Lưu ý: Đường dẫn phải bắt đầu bằng /images/ (từ public folder)
UPDATE payment_config 
SET 
    qr_image = '/images/payment_proofs/qr.jpg',
    account_number = '1234567890',  -- Thay bằng số tài khoản thực tế
    account_name = 'Tên chủ tài khoản',  -- Thay bằng tên chủ tài khoản thực tế
    bank_name = 'Tên ngân hàng',  -- Thay bằng tên ngân hàng thực tế
    is_active = true,
    updated_at = CURRENT_TIMESTAMP
WHERE payment_method = 'Chuyển khoản ngân hàng';

-- 2. Nếu chưa có record, tạo mới
INSERT INTO payment_config (payment_method, qr_image, account_number, account_name, bank_name, is_active)
VALUES 
    ('Chuyển khoản ngân hàng', '/images/payment_proofs/qr.jpg', '1234567890', 'Tên chủ tài khoản', 'Tên ngân hàng', true)
ON CONFLICT (payment_method) DO UPDATE 
SET 
    qr_image = EXCLUDED.qr_image,
    account_number = EXCLUDED.account_number,
    account_name = EXCLUDED.account_name,
    bank_name = EXCLUDED.bank_name,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- 3. Kiểm tra kết quả
SELECT 
    id_config,
    payment_method,
    qr_image,
    account_number,
    account_name,
    bank_name,
    is_active,
    updated_at
FROM payment_config
WHERE payment_method = 'Chuyển khoản ngân hàng';

-- Thông báo hoàn thành
SELECT '✅ Đã cập nhật QR code cho Chuyển khoản ngân hàng!' as message;

