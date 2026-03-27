# Hướng dẫn quản lý QR Code thanh toán

## Vấn đề
Bạn đã đặt ảnh QR code vào `public/images/payment_proofs/qr.jpg` nhưng không hiển thị vì:
- **QR code phải được cấu hình trong database** (bảng `payment_config`)
- Đường dẫn QR code phải được lưu trong database để hệ thống biết nơi tìm ảnh

## Giải pháp

### Cách 1: Sử dụng trang Admin (Khuyến nghị) ✅

1. **Đăng nhập với tài khoản Admin**
2. **Truy cập**: `http://localhost:3001/admin/payment-config`
3. **Điền form**:
   - Chọn phương thức thanh toán: "Chuyển khoản ngân hàng"
   - Upload ảnh QR code (hoặc để trống nếu đã có ảnh trong `public/images/payment_proofs/qr.jpg`)
   - Nhập số tài khoản, tên chủ tài khoản, tên ngân hàng
   - Chọn trạng thái: "Kích hoạt"
4. **Nhấn "Lưu cấu hình"**

### Cách 2: Cập nhật trực tiếp trong pgAdmin4

1. **Mở pgAdmin4** và kết nối database
2. **Chạy script SQL** sau:

```sql
-- Cập nhật QR code cho "Chuyển khoản ngân hàng"
UPDATE payment_config 
SET 
    qr_image = '/images/payment_proofs/qr.jpg',
    account_number = '1234567890',  -- Thay bằng số tài khoản thực tế
    account_name = 'Tên chủ tài khoản',  -- Thay bằng tên chủ tài khoản thực tế
    bank_name = 'Tên ngân hàng',  -- Thay bằng tên ngân hàng thực tế
    is_active = true,
    updated_at = CURRENT_TIMESTAMP
WHERE payment_method = 'Chuyển khoản ngân hàng';

-- Nếu chưa có record, tạo mới
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
```

3. **Hoặc chạy script có sẵn**: `scripts/cap_nhat_qr_code.sql` (nhớ chỉnh sửa thông tin tài khoản trước)

## Lưu ý quan trọng

### 1. Đường dẫn QR code
- ✅ **Đúng**: `/images/payment_proofs/qr.jpg` (bắt đầu bằng `/images/`)
- ❌ **Sai**: `images/payment_proofs/qr.jpg` (thiếu dấu `/` đầu)
- ❌ **Sai**: `public/images/payment_proofs/qr.jpg` (không cần `public/`)

### 2. Vị trí file ảnh
- File ảnh QR code phải nằm trong: `public/images/payment_proofs/`
- Tên file có thể là: `qr.jpg`, `qr.png`, hoặc bất kỳ tên nào bạn muốn
- Đảm bảo đường dẫn trong database khớp với tên file thực tế

### 3. Trạng thái kích hoạt
- Phải đặt `is_active = true` để QR code hiển thị
- Nếu `is_active = false`, QR code sẽ không hiển thị cho khách hàng

### 4. Kiểm tra kết quả
Sau khi cấu hình, kiểm tra:
```sql
SELECT * FROM payment_config WHERE payment_method = 'Chuyển khoản ngân hàng';
```

Kết quả phải có:
- `qr_image` = `/images/payment_proofs/qr.jpg` (hoặc đường dẫn bạn đã đặt)
- `is_active` = `true`

## Tính năng mới

### Trang Admin quản lý QR Code
- **URL**: `/admin/payment-config`
- **Chức năng**:
  - ✅ Xem danh sách tất cả QR code đã cấu hình
  - ✅ Thêm QR code mới
  - ✅ Cập nhật QR code hiện có
  - ✅ Upload ảnh QR code trực tiếp
  - ✅ Xóa QR code
  - ✅ Bật/tắt QR code

### Cách sử dụng trang Admin
1. Đăng nhập với tài khoản Admin
2. Truy cập `/admin/payment-config`
3. Điền form và upload ảnh QR code
4. Nhấn "Lưu cấu hình"
5. QR code sẽ tự động hiển thị cho khách hàng khi thanh toán

## Troubleshooting

### QR code không hiển thị
1. Kiểm tra `is_active` = `true` trong database
2. Kiểm tra đường dẫn `qr_image` có đúng không
3. Kiểm tra file ảnh có tồn tại trong `public/images/payment_proofs/` không
4. Kiểm tra tên phương thức thanh toán có khớp không (phải là "Chuyển khoản ngân hàng" hoặc "Ví MoMo")

### Lỗi "QR Code chưa được cấu hình"
- Có nghĩa là không tìm thấy record trong `payment_config` với `is_active = true`
- Giải pháp: Cập nhật hoặc tạo mới record trong database

### Ảnh không hiển thị
- Kiểm tra đường dẫn trong database có đúng không
- Kiểm tra file ảnh có tồn tại không
- Kiểm tra quyền truy cập file (server có thể đọc file không)

## Script SQL có sẵn

File `scripts/cap_nhat_qr_code.sql` đã được tạo sẵn với:
- Script cập nhật QR code
- Script tạo mới nếu chưa có
- Script kiểm tra kết quả

**Lưu ý**: Nhớ chỉnh sửa thông tin tài khoản (số TK, tên TK, tên ngân hàng) trước khi chạy!

