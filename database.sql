--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2026-03-26 23:20:08

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 17632)
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- TOC entry 6013 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- TOC entry 1670 (class 1247 OID 18713)
-- Name: vai_tro_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vai_tro_enum AS ENUM (
    'Quan_ly'
);


--
-- TOC entry 718 (class 1255 OID 44415)
-- Name: ghi_lich_su_don_hang(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ghi_lich_su_don_hang() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Chỉ ghi log nếu trạng thái thực sự thay đổi
    IF (TG_OP = 'UPDATE' AND OLD.trang_thai <> NEW.trang_thai) THEN
        INSERT INTO lich_su_don_hang (
            id_don_hang, 
            trang_thai_cu, 
            trang_thai_moi,
            ghi_chu
        ) VALUES (
            NEW.id_don_hang,
            OLD.trang_thai,
            NEW.trang_thai,
            'Tự động ghi log'
        );
    END IF;
    
    -- Nếu là INSERT (đơn hàng mới)
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO lich_su_don_hang (
            id_don_hang, 
            trang_thai_cu, 
            trang_thai_moi,
            ghi_chu
        ) VALUES (
            NEW.id_don_hang,
            NULL,
            NEW.trang_thai,
            'Đơn hàng mới được tạo'
        );
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- TOC entry 6014 (class 0 OID 0)
-- Dependencies: 718
-- Name: FUNCTION ghi_lich_su_don_hang(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ghi_lich_su_don_hang() IS 'Tự động ghi log mỗi khi trạng thái đơn hàng thay đổi';


--
-- TOC entry 801 (class 1255 OID 18715)
-- Name: set_slton_on_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_slton_on_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.slton := NEW.tongsl;
    RETURN NEW;
END;
$$;


--
-- TOC entry 865 (class 1255 OID 18716)
-- Name: update_id_muonsach_after_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_id_muonsach_after_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Cập nhật id_muonsach trong bảng muon_sach
    UPDATE public.muon_sach
    SET id_muonsach = id_muonsach - 1
    WHERE id_muonsach > OLD.id_muonsach;

    -- Cập nhật sequence để bắt đầu từ giá trị id_muonsach lớn nhất + 1
    PERFORM setval('public.muon_sach_id_muonsach_seq', 
                   COALESCE((SELECT MAX(id_muonsach) FROM public.muon_sach), 0) + 1);

    RETURN OLD;
END;
$$;


--
-- TOC entry 889 (class 1255 OID 18717)
-- Name: update_id_sach_after_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_id_sach_after_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Cập nhật id_sach trong bảng sach
    UPDATE public.sach
    SET id_sach = id_sach - 1
    WHERE id_sach > OLD.id_sach;

    -- Cập nhật id_sach trong bảng muon_sach (khóa ngoại)
    UPDATE public.muon_sach
    SET id_sach = id_sach - 1
    WHERE id_sach > OLD.id_sach;

    RETURN OLD;
END;
$$;


--
-- TOC entry 701 (class 1255 OID 18718)
-- Name: update_id_theloai_after_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_id_theloai_after_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Kiểm tra nếu ID_theloai mới sau khi giảm có tồn tại trong bảng The_loai hay không
    IF EXISTS (SELECT 1 FROM The_loai WHERE ID_theloai = OLD.ID_theloai - 1) THEN
        -- Cập nhật lại các ID_theloai trong bảng Sach từ bé đến lớn
        UPDATE Sach
        SET ID_theloai = ID_theloai - 1
        WHERE ID_theloai > OLD.ID_theloai;
    END IF;
    
    -- Xóa thể loại đã được xóa khỏi bảng The_loai
    RETURN OLD;
END;
$$;


--
-- TOC entry 1017 (class 1255 OID 18719)
-- Name: update_id_thuvien_after_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_id_thuvien_after_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Cập nhật id_thuvien trong bảng thu_vien
    UPDATE public.thu_vien
    SET id_thuvien = id_thuvien - 1
    WHERE id_thuvien > OLD.id_thuvien;

    -- Cập nhật id_thuvien trong bảng the_loai
    UPDATE public.the_loai
    SET id_thuvien = id_thuvien - 1
    WHERE id_thuvien > OLD.id_thuvien;

    -- Cập nhật id_thuvien trong bảng binh_luan
    UPDATE public.binh_luan
    SET id_thuvien = id_thuvien - 1
    WHERE id_thuvien > OLD.id_thuvien;

    -- Cập nhật id_thuvien trong bảng danh_gia
    UPDATE public.danh_gia
    SET id_thuvien = id_thuvien - 1
    WHERE id_thuvien > OLD.id_thuvien;

    -- Cập nhật sequence để bắt đầu từ giá trị id_thuvien lớn nhất + 1
    PERFORM setval('public.thu_vien_id_thuvien_seq', 
                   COALESCE((SELECT MAX(id_thuvien) FROM public.thu_vien), 0) + 1);

    RETURN OLD;
END;
$$;


--
-- TOC entry 762 (class 1255 OID 18720)
-- Name: update_id_user_after_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_id_user_after_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Cập nhật id_user trong bảng nguoi_dung
    UPDATE public.nguoi_dung
    SET id_user = id_user - 1
    WHERE id_user > OLD.id_user;

    -- Cập nhật id_user trong bảng muon_sach
    UPDATE public.muon_sach
    SET id_user = id_user - 1
    WHERE id_user > OLD.id_user;

    -- Cập nhật id_user trong bảng binh_luan
    UPDATE public.binh_luan
    SET id_user = id_user - 1
    WHERE id_user > OLD.id_user;

    -- Cập nhật id_user trong bảng danh_gia
    UPDATE public.danh_gia
    SET id_user = id_user - 1
    WHERE id_user > OLD.id_user;

    RETURN OLD;
END;
$$;


--
-- TOC entry 259 (class 1255 OID 18721)
-- Name: update_muonsach_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_muonsach_ids() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Cập nhật lại id_muonsach theo thứ tự tăng dần bắt đầu từ 1
    WITH new_ids AS (
        SELECT id_muonsach, 
               ROW_NUMBER() OVER (ORDER BY id_muonsach) AS new_id
        FROM public.muon_sach
    )
    UPDATE public.muon_sach
    SET id_muonsach = new_ids.new_id
    FROM new_ids
    WHERE public.muon_sach.id_muonsach = new_ids.id_muonsach;

    -- Cập nhật sequence để bắt đầu từ giá trị lớn nhất + 1
    PERFORM setval('public.muon_sach_id_muonsach_seq', (SELECT COALESCE(MAX(id_muonsach), 0) + 1 FROM public.muon_sach));

    RETURN NULL;
END;
$$;


--
-- TOC entry 771 (class 1255 OID 18722)
-- Name: update_slton_on_borrow(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_slton_on_borrow() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Kiểm tra nếu số lượng tồn còn đủ
    IF (SELECT slton FROM public.sach WHERE id_sach = NEW.id_sach) <= 0 THEN
        RAISE EXCEPTION 'Sách với ID % không còn trong kho.', NEW.id_sach;
    END IF;

    -- Giảm slton trong bảng sach
    UPDATE public.sach
    SET slton = slton - 1
    WHERE id_sach = NEW.id_sach;

    RETURN NEW;
END;
$$;


--
-- TOC entry 791 (class 1255 OID 18723)
-- Name: update_slton_on_return(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_slton_on_return() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Kiểm tra nếu sách được trả (ngay_tra chuyển từ NULL sang không NULL)
    IF NEW.ngay_tra IS NOT NULL AND OLD.ngay_tra IS NULL THEN
        UPDATE public.sach
        SET slton = slton + 1
        WHERE id_sach = NEW.id_sach;
    END IF;
    RETURN NEW;
END;
$$;


--
-- TOC entry 810 (class 1255 OID 18724)
-- Name: update_slton_on_tongsl_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_slton_on_tongsl_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    delta_tongsl INTEGER; -- Chênh lệch tongsl
    borrowed_count INTEGER; -- Số sách đang mượn
BEGIN
    -- Kiểm tra nếu tongsl thay đổi
    IF NEW.tongsl != OLD.tongsl THEN
        -- Tính chênh lệch tongsl
        delta_tongsl := NEW.tongsl - OLD.tongsl;

        -- Tính số sách đang mượn (ngay_tra IS NULL)
        SELECT COUNT(*) INTO borrowed_count
        FROM public.muon_sach
        WHERE id_sach = NEW.id_sach AND ngay_tra IS NULL;

        -- Cập nhật slton: tăng hoặc giảm tương ứng với delta_tongsl
        NEW.slton := OLD.slton + delta_tongsl;

        -- Đảm bảo slton không nhỏ hơn số sách đang mượn và không vượt quá tongsl
        IF NEW.slton < borrowed_count THEN
            NEW.slton := borrowed_count; -- Giữ slton ít nhất bằng số sách đang mượn
        ELSIF NEW.slton > NEW.tongsl THEN
            NEW.slton := NEW.tongsl; -- Giới hạn slton không vượt quá tongsl
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


--
-- TOC entry 522 (class 1255 OID 18725)
-- Name: update_theloai_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_theloai_ids() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Cập nhật lại id_theloai theo thứ tự tăng dần bắt đầu từ 1
    WITH new_ids AS (
        SELECT id_theloai, 
               ROW_NUMBER() OVER (ORDER BY id_theloai) AS new_id
        FROM public.the_loai
    )
    UPDATE public.the_loai
    SET id_theloai = new_ids.new_id
    FROM new_ids
    WHERE public.the_loai.id_theloai = new_ids.id_theloai;

    -- Cập nhật sequence để bắt đầu từ giá trị lớn nhất + 1
    PERFORM setval('public.the_loai_id_theloai_seq', (SELECT COALESCE(MAX(id_theloai), 0) + 1 FROM public.the_loai));

    RETURN NULL;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 223 (class 1259 OID 18726)
-- Name: binh_luan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.binh_luan (
    id_binhluan integer NOT NULL,
    id_thuvien integer NOT NULL,
    noi_dung text NOT NULL,
    id_user integer NOT NULL,
    thoi_gian timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 224 (class 1259 OID 18732)
-- Name: binh_luan_id_binhluan_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.binh_luan_id_binhluan_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6015 (class 0 OID 0)
-- Dependencies: 224
-- Name: binh_luan_id_binhluan_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.binh_luan_id_binhluan_seq OWNED BY public.binh_luan.id_binhluan;


--
-- TOC entry 243 (class 1259 OID 44363)
-- Name: chi_tiet_don_hang; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chi_tiet_don_hang (
    id_chi_tiet integer NOT NULL,
    id_don_hang integer NOT NULL,
    id_sach integer NOT NULL,
    ten_sach character varying(255) NOT NULL,
    so_luong integer NOT NULL,
    don_gia numeric(15,2) NOT NULL,
    thanh_tien numeric(15,2) NOT NULL,
    CONSTRAINT chi_tiet_don_hang_don_gia_check CHECK ((don_gia >= (0)::numeric)),
    CONSTRAINT chi_tiet_don_hang_so_luong_check CHECK ((so_luong > 0))
);


--
-- TOC entry 6016 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE chi_tiet_don_hang; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chi_tiet_don_hang IS 'Chi tiết sách trong từng đơn hàng';


--
-- TOC entry 6017 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN chi_tiet_don_hang.thanh_tien; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chi_tiet_don_hang.thanh_tien IS 'Tính bằng so_luong * don_gia';


--
-- TOC entry 242 (class 1259 OID 44362)
-- Name: chi_tiet_don_hang_id_chi_tiet_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chi_tiet_don_hang_id_chi_tiet_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6018 (class 0 OID 0)
-- Dependencies: 242
-- Name: chi_tiet_don_hang_id_chi_tiet_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chi_tiet_don_hang_id_chi_tiet_seq OWNED BY public.chi_tiet_don_hang.id_chi_tiet;


--
-- TOC entry 239 (class 1259 OID 36120)
-- Name: danh_gia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.danh_gia (
    id_danhgia integer NOT NULL,
    id_thuvien integer NOT NULL,
    ten_nguoi_danh_gia character varying(255) NOT NULL,
    email_nguoi_danh_gia character varying(255),
    so_dien_thoai character varying(20),
    diem_so integer NOT NULL,
    nhan_xet text,
    ngay_danh_gia timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    trang_thai character varying(50) DEFAULT 'Chờ duyệt'::character varying,
    ghi_chu text,
    id_user integer,
    thoi_gian timestamp without time zone DEFAULT now(),
    CONSTRAINT danh_gia_diem_so_check CHECK (((diem_so >= 1) AND (diem_so <= 5)))
);


--
-- TOC entry 6019 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE danh_gia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.danh_gia IS 'Bảng lưu trữ đánh giá của người dùng về thư viện';


--
-- TOC entry 6020 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN danh_gia.id_danhgia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.danh_gia.id_danhgia IS 'ID đánh giá (tự động tăng)';


--
-- TOC entry 6021 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN danh_gia.id_thuvien; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.danh_gia.id_thuvien IS 'ID thư viện được đánh giá';


--
-- TOC entry 6022 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN danh_gia.ten_nguoi_danh_gia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.danh_gia.ten_nguoi_danh_gia IS 'Tên người đánh giá';


--
-- TOC entry 6023 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN danh_gia.email_nguoi_danh_gia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.danh_gia.email_nguoi_danh_gia IS 'Email người đánh giá';


--
-- TOC entry 6024 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN danh_gia.so_dien_thoai; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.danh_gia.so_dien_thoai IS 'Số điện thoại liên hệ';


--
-- TOC entry 6025 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN danh_gia.diem_so; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.danh_gia.diem_so IS 'Điểm đánh giá từ 1-5 sao';


--
-- TOC entry 6026 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN danh_gia.nhan_xet; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.danh_gia.nhan_xet IS 'Nhận xét chi tiết';


--
-- TOC entry 6027 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN danh_gia.ngay_danh_gia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.danh_gia.ngay_danh_gia IS 'Thời gian đánh giá';


--
-- TOC entry 6028 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN danh_gia.trang_thai; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.danh_gia.trang_thai IS 'Trạng thái: Chờ duyệt, Đã duyệt, Bị ẩn';


--
-- TOC entry 6029 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN danh_gia.ghi_chu; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.danh_gia.ghi_chu IS 'Ghi chú của admin';


--
-- TOC entry 238 (class 1259 OID 36119)
-- Name: danh_gia_id_danhgia_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.danh_gia_id_danhgia_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6030 (class 0 OID 0)
-- Dependencies: 238
-- Name: danh_gia_id_danhgia_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.danh_gia_id_danhgia_seq OWNED BY public.danh_gia.id_danhgia;


--
-- TOC entry 241 (class 1259 OID 44344)
-- Name: don_hang; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.don_hang (
    id_don_hang integer NOT NULL,
    id_khach_hang integer NOT NULL,
    tong_tien numeric(15,2) DEFAULT 0 NOT NULL,
    trang_thai character varying(50) DEFAULT 'Chờ xác nhận'::character varying NOT NULL,
    phuong_thuc_thanh_toan character varying(100) DEFAULT 'Thanh toán khi nhận hàng'::character varying,
    ghi_chu text,
    ngay_dat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ly_do_huy text,
    ngay_giao_du_kien date,
    ngay_hoan_thanh timestamp without time zone,
    payment_proof_image character varying(500),
    id_payment_config integer,
    id_trang_thai integer
);


--
-- TOC entry 6031 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE don_hang; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.don_hang IS 'Lưu thông tin đơn hàng';


--
-- TOC entry 6032 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN don_hang.trang_thai; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.don_hang.trang_thai IS 'Chờ xác nhận, Đã xác nhận, Đang giao, Đã giao, Đã hủy';


--
-- TOC entry 6033 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN don_hang.phuong_thuc_thanh_toan; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.don_hang.phuong_thuc_thanh_toan IS 'COD, Chuyển khoản, Thẻ tín dụng...';


--
-- TOC entry 6034 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN don_hang.ly_do_huy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.don_hang.ly_do_huy IS 'Lý do nếu đơn hàng bị hủy';


--
-- TOC entry 6035 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN don_hang.ngay_giao_du_kien; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.don_hang.ngay_giao_du_kien IS 'Ngày dự kiến giao hàng tới khách';


--
-- TOC entry 240 (class 1259 OID 44343)
-- Name: don_hang_id_don_hang_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.don_hang_id_don_hang_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6036 (class 0 OID 0)
-- Dependencies: 240
-- Name: don_hang_id_don_hang_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.don_hang_id_don_hang_seq OWNED BY public.don_hang.id_don_hang;


--
-- TOC entry 250 (class 1259 OID 44442)
-- Name: khach_hang; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.khach_hang (
    id_khach_hang integer NOT NULL,
    ten_khach_hang character varying(255) NOT NULL,
    email character varying(255),
    so_dien_thoai character varying(20) NOT NULL,
    dia_chi text NOT NULL,
    ghi_chu text,
    ngay_tao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_user integer
);


--
-- TOC entry 249 (class 1259 OID 44441)
-- Name: khach_hang_id_khach_hang_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.khach_hang_id_khach_hang_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6037 (class 0 OID 0)
-- Dependencies: 249
-- Name: khach_hang_id_khach_hang_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.khach_hang_id_khach_hang_seq OWNED BY public.khach_hang.id_khach_hang;


--
-- TOC entry 247 (class 1259 OID 44399)
-- Name: lich_su_don_hang; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lich_su_don_hang (
    id_lich_su integer NOT NULL,
    id_don_hang integer NOT NULL,
    trang_thai_cu character varying(50),
    trang_thai_moi character varying(50) NOT NULL,
    nguoi_thuc_hien character varying(100),
    ghi_chu text,
    ngay_thay_doi timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 6038 (class 0 OID 0)
-- Dependencies: 247
-- Name: TABLE lich_su_don_hang; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lich_su_don_hang IS 'Lưu lịch sử thay đổi trạng thái của mỗi đơn hàng';


--
-- TOC entry 246 (class 1259 OID 44398)
-- Name: lich_su_don_hang_id_lich_su_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lich_su_don_hang_id_lich_su_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6039 (class 0 OID 0)
-- Dependencies: 246
-- Name: lich_su_don_hang_id_lich_su_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lich_su_don_hang_id_lich_su_seq OWNED BY public.lich_su_don_hang.id_lich_su;


--
-- TOC entry 225 (class 1259 OID 18739)
-- Name: muon_sach; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.muon_sach (
    id_muonsach integer NOT NULL,
    id_sach integer NOT NULL,
    ngay_muon timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ngay_tra timestamp without time zone,
    ten_nguoi_muon character varying(255),
    email_nguoi_muon character varying(255),
    so_dien_thoai character varying(20),
    ghi_chu text,
    thu_vien character varying(255),
    trang_thai character varying(50) DEFAULT 'Chờ xử lý'::character varying,
    ngay_tao timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 226 (class 1259 OID 18743)
-- Name: muon_sach_id_muonsach_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.muon_sach_id_muonsach_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6040 (class 0 OID 0)
-- Dependencies: 226
-- Name: muon_sach_id_muonsach_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.muon_sach_id_muonsach_seq OWNED BY public.muon_sach.id_muonsach;


--
-- TOC entry 227 (class 1259 OID 18744)
-- Name: nguoi_dung; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nguoi_dung (
    id_user integer NOT NULL,
    tai_khoan character varying(50) NOT NULL,
    mat_khau text NOT NULL,
    id_vaitro integer,
    ho_ten character varying(255),
    so_dt character varying(20),
    email character varying(255),
    id_thuvien integer
);


--
-- TOC entry 228 (class 1259 OID 18749)
-- Name: nguoi_dung_id_user_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nguoi_dung_id_user_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6041 (class 0 OID 0)
-- Dependencies: 228
-- Name: nguoi_dung_id_user_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nguoi_dung_id_user_seq OWNED BY public.nguoi_dung.id_user;


--
-- TOC entry 252 (class 1259 OID 44470)
-- Name: payment_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_config (
    id_config integer NOT NULL,
    payment_method character varying(100) NOT NULL,
    qr_image character varying(500),
    account_number character varying(50),
    account_name character varying(200),
    bank_name character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 6042 (class 0 OID 0)
-- Dependencies: 252
-- Name: TABLE payment_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payment_config IS 'Bảng cấu hình QR code và thông tin thanh toán';


--
-- TOC entry 6043 (class 0 OID 0)
-- Dependencies: 252
-- Name: COLUMN payment_config.payment_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_config.payment_method IS 'Phương thức thanh toán (Chuyển khoản ngân hàng, Ví MoMo, ...)';


--
-- TOC entry 6044 (class 0 OID 0)
-- Dependencies: 252
-- Name: COLUMN payment_config.qr_image; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_config.qr_image IS 'Đường dẫn đến ảnh QR code';


--
-- TOC entry 6045 (class 0 OID 0)
-- Dependencies: 252
-- Name: COLUMN payment_config.account_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_config.account_number IS 'Số tài khoản';


--
-- TOC entry 6046 (class 0 OID 0)
-- Dependencies: 252
-- Name: COLUMN payment_config.account_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_config.account_name IS 'Tên chủ tài khoản';


--
-- TOC entry 6047 (class 0 OID 0)
-- Dependencies: 252
-- Name: COLUMN payment_config.bank_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_config.bank_name IS 'Tên ngân hàng';


--
-- TOC entry 6048 (class 0 OID 0)
-- Dependencies: 252
-- Name: COLUMN payment_config.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_config.is_active IS 'Trạng thái kích hoạt';


--
-- TOC entry 251 (class 1259 OID 44469)
-- Name: payment_config_id_config_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_config_id_config_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6049 (class 0 OID 0)
-- Dependencies: 251
-- Name: payment_config_id_config_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_config_id_config_seq OWNED BY public.payment_config.id_config;


--
-- TOC entry 229 (class 1259 OID 18750)
-- Name: sach; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sach (
    id_sach integer NOT NULL,
    ten_sach character varying(255) NOT NULL,
    tac_gia character varying(255),
    nam_xuat_ban smallint,
    id_theloai integer,
    slton integer DEFAULT 0,
    tongsl integer DEFAULT 0,
    digital_file text,
    id_thuvien integer,
    gia numeric(12,2) DEFAULT 0,
    gia_goc numeric(12,2) DEFAULT NULL::numeric,
    CONSTRAINT sach_gia_check CHECK ((gia >= (0)::numeric)),
    CONSTRAINT sach_gia_goc_check CHECK (((gia_goc IS NULL) OR (gia_goc >= (0)::numeric))),
    CONSTRAINT sach_nam_xuat_ban_check CHECK (((nam_xuat_ban >= 0) AND ((nam_xuat_ban)::numeric <= EXTRACT(year FROM CURRENT_DATE)))),
    CONSTRAINT sach_slton_check CHECK ((slton >= 0)),
    CONSTRAINT sach_tongsl_check CHECK ((tongsl >= 0))
);


--
-- TOC entry 6050 (class 0 OID 0)
-- Dependencies: 229
-- Name: COLUMN sach.gia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sach.gia IS 'Giá bán của sách (VNĐ)';


--
-- TOC entry 6051 (class 0 OID 0)
-- Dependencies: 229
-- Name: COLUMN sach.gia_goc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sach.gia_goc IS 'Giá gốc của sách (để hiển thị giá đã giảm)';


--
-- TOC entry 230 (class 1259 OID 18760)
-- Name: sach_id_sach_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sach_id_sach_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6052 (class 0 OID 0)
-- Dependencies: 230
-- Name: sach_id_sach_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sach_id_sach_seq OWNED BY public.sach.id_sach;


--
-- TOC entry 231 (class 1259 OID 18761)
-- Name: the_loai; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.the_loai (
    id_theloai integer NOT NULL,
    ten_theloai character varying(255) NOT NULL,
    id_thuvien integer
);


--
-- TOC entry 232 (class 1259 OID 18764)
-- Name: the_loai_id_theloai_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.the_loai_id_theloai_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6053 (class 0 OID 0)
-- Dependencies: 232
-- Name: the_loai_id_theloai_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.the_loai_id_theloai_seq OWNED BY public.the_loai.id_theloai;


--
-- TOC entry 233 (class 1259 OID 18765)
-- Name: thu_vien; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thu_vien (
    id_thuvien integer NOT NULL,
    ten_thuvien character varying(255) NOT NULL,
    dia_chi character varying(255),
    wifi boolean DEFAULT false,
    phongdoc boolean DEFAULT false,
    canteen boolean DEFAULT false,
    dieuhoa boolean DEFAULT false,
    latitude numeric(10,8),
    longitude numeric(11,8),
    anh_360 text,
    phanloai character varying(50)
);


--
-- TOC entry 234 (class 1259 OID 18774)
-- Name: thu_vien_id_thuvien_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.thu_vien_id_thuvien_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6054 (class 0 OID 0)
-- Dependencies: 234
-- Name: thu_vien_id_thuvien_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.thu_vien_id_thuvien_seq OWNED BY public.thu_vien.id_thuvien;


--
-- TOC entry 237 (class 1259 OID 27947)
-- Name: thu_vien_sach; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thu_vien_sach (
    id_thuvien integer NOT NULL,
    id_sach integer NOT NULL,
    so_luong integer DEFAULT 0,
    ngay_them timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 6055 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE thu_vien_sach; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.thu_vien_sach IS 'Bảng liên kết sách và thư viện';


--
-- TOC entry 6056 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN thu_vien_sach.ngay_them; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.thu_vien_sach.ngay_them IS 'Ngày thêm sách vào thư viện';


--
-- TOC entry 245 (class 1259 OID 44387)
-- Name: trang_thai_don_hang; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trang_thai_don_hang (
    id_trang_thai integer NOT NULL,
    ma_trang_thai character varying(50) NOT NULL,
    ten_trang_thai character varying(100) NOT NULL,
    mo_ta text,
    mau_sac character varying(20),
    thu_tu integer DEFAULT 0
);


--
-- TOC entry 6057 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE trang_thai_don_hang; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.trang_thai_don_hang IS 'Danh sách các trạng thái đơn hàng trong hệ thống';


--
-- TOC entry 244 (class 1259 OID 44386)
-- Name: trang_thai_don_hang_id_trang_thai_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trang_thai_don_hang_id_trang_thai_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6058 (class 0 OID 0)
-- Dependencies: 244
-- Name: trang_thai_don_hang_id_trang_thai_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trang_thai_don_hang_id_trang_thai_seq OWNED BY public.trang_thai_don_hang.id_trang_thai;


--
-- TOC entry 248 (class 1259 OID 44418)
-- Name: v_thong_ke_don_hang; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_thong_ke_don_hang AS
 SELECT trang_thai,
    count(*) AS so_luong,
    sum(tong_tien) AS tong_doanh_thu,
    avg(tong_tien) AS gia_tri_trung_binh
   FROM public.don_hang
  GROUP BY trang_thai
  ORDER BY
        CASE trang_thai
            WHEN 'Chờ xác nhận'::text THEN 1
            WHEN 'Đã xác nhận'::text THEN 2
            WHEN 'Đang chuẩn bị'::text THEN 3
            WHEN 'Đang giao hàng'::text THEN 4
            WHEN 'Đã giao'::text THEN 5
            WHEN 'Đã hủy'::text THEN 6
            ELSE 7
        END;


--
-- TOC entry 6059 (class 0 OID 0)
-- Dependencies: 248
-- Name: VIEW v_thong_ke_don_hang; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_thong_ke_don_hang IS 'Thống kê số lượng và doanh thu theo từng trạng thái';


--
-- TOC entry 235 (class 1259 OID 18775)
-- Name: vai_tro; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vai_tro (
    id_vaitro integer NOT NULL,
    ten_vaitro character varying(50) NOT NULL
);


--
-- TOC entry 236 (class 1259 OID 18778)
-- Name: vai_tro_id_vaitro_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vai_tro_id_vaitro_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6060 (class 0 OID 0)
-- Dependencies: 236
-- Name: vai_tro_id_vaitro_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vai_tro_id_vaitro_seq OWNED BY public.vai_tro.id_vaitro;


--
-- TOC entry 5695 (class 2604 OID 18779)
-- Name: binh_luan id_binhluan; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.binh_luan ALTER COLUMN id_binhluan SET DEFAULT nextval('public.binh_luan_id_binhluan_seq'::regclass);


--
-- TOC entry 5726 (class 2604 OID 44366)
-- Name: chi_tiet_don_hang id_chi_tiet; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chi_tiet_don_hang ALTER COLUMN id_chi_tiet SET DEFAULT nextval('public.chi_tiet_don_hang_id_chi_tiet_seq'::regclass);


--
-- TOC entry 5716 (class 2604 OID 36123)
-- Name: danh_gia id_danhgia; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.danh_gia ALTER COLUMN id_danhgia SET DEFAULT nextval('public.danh_gia_id_danhgia_seq'::regclass);


--
-- TOC entry 5720 (class 2604 OID 44347)
-- Name: don_hang id_don_hang; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.don_hang ALTER COLUMN id_don_hang SET DEFAULT nextval('public.don_hang_id_don_hang_seq'::regclass);


--
-- TOC entry 5731 (class 2604 OID 44445)
-- Name: khach_hang id_khach_hang; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.khach_hang ALTER COLUMN id_khach_hang SET DEFAULT nextval('public.khach_hang_id_khach_hang_seq'::regclass);


--
-- TOC entry 5729 (class 2604 OID 44402)
-- Name: lich_su_don_hang id_lich_su; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lich_su_don_hang ALTER COLUMN id_lich_su SET DEFAULT nextval('public.lich_su_don_hang_id_lich_su_seq'::regclass);


--
-- TOC entry 5697 (class 2604 OID 18781)
-- Name: muon_sach id_muonsach; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.muon_sach ALTER COLUMN id_muonsach SET DEFAULT nextval('public.muon_sach_id_muonsach_seq'::regclass);


--
-- TOC entry 5701 (class 2604 OID 18782)
-- Name: nguoi_dung id_user; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nguoi_dung ALTER COLUMN id_user SET DEFAULT nextval('public.nguoi_dung_id_user_seq'::regclass);


--
-- TOC entry 5733 (class 2604 OID 44473)
-- Name: payment_config id_config; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_config ALTER COLUMN id_config SET DEFAULT nextval('public.payment_config_id_config_seq'::regclass);


--
-- TOC entry 5702 (class 2604 OID 18783)
-- Name: sach id_sach; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sach ALTER COLUMN id_sach SET DEFAULT nextval('public.sach_id_sach_seq'::regclass);


--
-- TOC entry 5707 (class 2604 OID 18784)
-- Name: the_loai id_theloai; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.the_loai ALTER COLUMN id_theloai SET DEFAULT nextval('public.the_loai_id_theloai_seq'::regclass);


--
-- TOC entry 5708 (class 2604 OID 18785)
-- Name: thu_vien id_thuvien; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thu_vien ALTER COLUMN id_thuvien SET DEFAULT nextval('public.thu_vien_id_thuvien_seq'::regclass);


--
-- TOC entry 5727 (class 2604 OID 44390)
-- Name: trang_thai_don_hang id_trang_thai; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trang_thai_don_hang ALTER COLUMN id_trang_thai SET DEFAULT nextval('public.trang_thai_don_hang_id_trang_thai_seq'::regclass);


--
-- TOC entry 5713 (class 2604 OID 18786)
-- Name: vai_tro id_vaitro; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vai_tro ALTER COLUMN id_vaitro SET DEFAULT nextval('public.vai_tro_id_vaitro_seq'::regclass);


--
-- TOC entry 5979 (class 0 OID 18726)
-- Dependencies: 223
-- Data for Name: binh_luan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.binh_luan (id_binhluan, id_thuvien, noi_dung, id_user, thoi_gian) FROM stdin;
2	10	vip	2	2025-04-23 01:31:51.191182
4	10	1	3	2025-04-23 15:14:41.868434
5	10	Dat2705	1	2025-05-08 16:29:39.477517
6	7	hhhhhhhhh	3	2025-06-13 15:06:38.35297
7	8	andasnda	3	2025-06-13 15:07:02.329434
8	7	alo 1235	42	2025-06-13 15:37:06.563596
9	5	không đẹp	3	2025-08-06 09:23:10.282274
10	554	hello bro	2	2025-12-04 10:24:47.988224
\.


--
-- TOC entry 5999 (class 0 OID 44363)
-- Dependencies: 243
-- Data for Name: chi_tiet_don_hang; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chi_tiet_don_hang (id_chi_tiet, id_don_hang, id_sach, ten_sach, so_luong, don_gia, thanh_tien) FROM stdin;
7	3	2	Khoa học 2	1	0.00	0.00
8	4	3	Văn học 1	1	0.00	0.00
9	4	1	Khoa học 1	5	0.00	0.00
10	5	1	Khoa học 1	1	0.00	0.00
11	6	4	Văn học 2	1	0.00	0.00
12	6	3	Văn học 1	1	0.00	0.00
13	7	11	Văn hóa 1	1	0.00	0.00
14	7	5	Công nghệ 1	1	0.00	0.00
15	8	23	DU KA	1	0.00	0.00
16	9	2	Khoa học 2	1	0.00	0.00
17	10	2	Khoa học 2	1	0.00	0.00
18	10	1	Khoa học 1	1	0.00	0.00
19	11	2	Khoa học 2	1	0.00	0.00
20	12	2	Khoa học 2	1	0.00	0.00
21	13	2	Khoa học 2	1	0.00	0.00
22	14	5	Công nghệ 1	1	0.00	0.00
23	14	6	Công nghệ 2	1	0.00	0.00
24	15	5	Công nghệ 1	1	0.00	0.00
25	15	6	Công nghệ 2	1	0.00	0.00
26	16	5	Công nghệ 1	1	0.00	0.00
27	16	6	Công nghệ 2	1	0.00	0.00
28	17	5	Công nghệ 1	1	0.00	0.00
29	17	6	Công nghệ 2	1	0.00	0.00
30	18	5	Công nghệ 1	1	0.00	0.00
31	18	6	Công nghệ 2	1	0.00	0.00
32	19	5	Công nghệ 1	1	0.00	0.00
33	19	6	Công nghệ 2	1	0.00	0.00
34	20	1	Khoa học 1	3	250000.00	750000.00
35	21	1	Khoa học 1	1	250000.00	250000.00
36	22	1	Khoa học 1	1	250000.00	250000.00
37	23	1	Khoa học 1	1	250000.00	250000.00
38	24	1	Khoa học 1	1	250000.00	250000.00
39	25	1	Khoa học 1	2	250000.00	500000.00
40	26	1	Khoa học 1	2	250000.00	500000.00
41	27	4	Văn học 2	1	0.00	0.00
42	28	1	Khoa học 1	1	250000.00	250000.00
\.


--
-- TOC entry 5995 (class 0 OID 36120)
-- Dependencies: 239
-- Data for Name: danh_gia; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.danh_gia (id_danhgia, id_thuvien, ten_nguoi_danh_gia, email_nguoi_danh_gia, so_dien_thoai, diem_so, nhan_xet, ngay_danh_gia, trang_thai, ghi_chu, id_user, thoi_gian) FROM stdin;
1	1	Nguyễn Văn A	nguyenvana@example.com	\N	5	Thư viện rất đẹp, sạch sẽ, nhân viên thân thiện!	2025-09-30 23:50:55.906494	Đã duyệt	\N	\N	2025-10-01 18:14:32.321042
2	1	Trần Thị B	tranthib@example.com	\N	4	Không gian yên tĩnh, phù hợp để học tập.	2025-09-30 23:50:55.906494	Đã duyệt	\N	\N	2025-10-01 18:14:32.321042
3	2	Lê Văn C	levanc@example.com	\N	5	Sách phong phú, có nhiều đầu sách mới.	2025-09-30 23:50:55.906494	Đã duyệt	\N	\N	2025-10-01 18:14:32.321042
4	2	Phạm Thị D	phamthid@example.com	\N	3	Tạm được nhưng cần cải thiện điều hòa.	2025-09-30 23:50:55.906494	Chờ duyệt	\N	\N	2025-10-01 18:14:32.321042
5	26	Phúc			3	ádasdas	2025-10-01 21:46:56.914	Chờ duyệt		1	2025-10-01 21:46:56.914
6	37	Dương Quốc Anh			4	ĐẸP ZAI VÃI 	2025-10-01 23:42:57.197	Chờ duyệt		1	2025-10-01 23:42:57.197
\.


--
-- TOC entry 5997 (class 0 OID 44344)
-- Dependencies: 241
-- Data for Name: don_hang; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.don_hang (id_don_hang, id_khach_hang, tong_tien, trang_thai, phuong_thuc_thanh_toan, ghi_chu, ngay_dat, ngay_cap_nhat, ly_do_huy, ngay_giao_du_kien, ngay_hoan_thanh, payment_proof_image, id_payment_config, id_trang_thai) FROM stdin;
3	1	0.00	Đã xác nhận	Thanh toán khi nhận hàng	Đơn hàng từ website	2025-11-27 21:09:28.545213	2025-11-27 21:09:58.019014	\N	2025-11-30	\N	\N	\N	\N
4	2	0.00	Chờ xác nhận	Chuyển khoản ngân hàng	Đơn hàng từ website	2025-11-27 21:38:45.994912	2025-11-27 21:38:45.994912	\N	2025-11-30	\N	\N	\N	\N
5	3	0.00	Chờ xác nhận	Thanh toán khi nhận hàng	Đơn hàng từ website	2025-11-27 21:51:51.510202	2025-11-27 21:51:51.510202	\N	2025-11-30	\N	\N	\N	\N
6	4	0.00	Chờ xác nhận	Thanh toán khi nhận hàng	Đơn hàng từ website	2025-11-27 21:56:19.01649	2025-11-27 21:56:19.01649	\N	2025-11-30	\N	\N	\N	\N
7	5	0.00	Chờ xác nhận	Thanh toán khi nhận hàng	Đơn hàng từ website	2025-11-27 21:59:36.385614	2025-11-27 21:59:36.385614	\N	2025-11-30	\N	\N	\N	\N
8	6	0.00	Chờ xác nhận	Thanh toán khi nhận hàng	Đơn hàng từ website	2025-11-27 22:03:49.277142	2025-11-27 22:03:49.277142	\N	2025-11-30	\N	\N	\N	\N
9	7	0.00	Chờ xác nhận	Thanh toán khi nhận hàng	Đơn hàng từ website	2025-11-27 22:17:36.527809	2025-11-27 22:17:36.527809	\N	2025-11-30	\N	\N	\N	\N
10	8	0.00	Chờ xác nhận	Thanh toán khi nhận hàng	Đơn hàng từ website	2025-11-27 22:22:04.357581	2025-11-27 22:22:04.357581	\N	2025-11-30	\N	\N	\N	\N
11	9	0.00	Chờ xác nhận	Chuyển khoản ngân hàng	Đơn hàng từ website	2025-11-27 23:23:34.837975	2025-11-27 23:23:34.837975	\N	2025-11-30	\N	\N	\N	\N
12	9	0.00	Chờ xác nhận	Chuyển khoản ngân hàng	Đơn hàng từ website	2025-11-27 23:25:30.923887	2025-11-27 23:25:30.923887	\N	2025-11-30	\N	\N	\N	\N
13	9	0.00	Chờ xác nhận	Thanh toán khi nhận hàng	Đơn hàng từ website	2025-11-27 23:25:33.675239	2025-11-27 23:25:33.675239	\N	2025-11-30	\N	\N	\N	\N
14	9	0.00	Chờ xác nhận	Ví MoMo	Đơn hàng từ website	2025-11-27 23:27:07.222115	2025-11-27 23:27:07.222115	\N	2025-11-30	\N	\N	\N	\N
15	9	0.00	Chờ xác nhận	Ví MoMo	Đơn hàng từ website	2025-11-27 23:27:37.026044	2025-11-27 23:27:37.026044	\N	2025-11-30	\N	\N	\N	\N
16	9	0.00	Chờ xác nhận	Ví MoMo	Đơn hàng từ website	2025-11-27 23:27:39.60214	2025-11-27 23:27:39.60214	\N	2025-11-30	\N	\N	\N	\N
17	9	0.00	Chờ xác nhận	Ví MoMo	Đơn hàng từ website	2025-11-27 23:28:42.6306	2025-11-27 23:28:42.6306	\N	2025-11-30	\N	\N	\N	\N
18	9	0.00	Chờ xác nhận	Chuyển khoản ngân hàng	Đơn hàng từ website	2025-11-27 23:28:58.734737	2025-11-27 23:28:58.734737	\N	2025-11-30	\N	\N	\N	\N
19	9	0.00	Đang giao hàng	Chuyển khoản ngân hàng	Đơn hàng từ website	2025-11-27 23:30:43.601858	2025-11-28 00:14:17.522977	\N	2025-11-30	\N	\N	\N	\N
20	1	750000.00	Chờ xác nhận	Thanh toán khi nhận hàng	Đơn hàng từ website	2025-11-28 00:56:59.663235	2025-11-28 00:56:59.663235	\N	2025-12-01	\N	\N	\N	\N
21	2	250000.00	Chờ thanh toán	Chuyển khoản ngân hàng	Đơn hàng từ website	2025-11-28 00:57:23.062198	2025-11-28 00:57:23.062198	\N	2025-12-01	\N	\N	\N	\N
22	9	250000.00	Chờ thanh toán	Chuyển khoản ngân hàng	Đơn hàng từ website	2025-11-28 01:07:02.914653	2025-11-28 01:07:02.914653	\N	2025-12-01	\N	\N	\N	\N
23	9	250000.00	Chờ thanh toán	Chuyển khoản ngân hàng	Đơn hàng từ website	2025-11-28 01:16:41.142548	2025-11-28 01:16:41.142548	\N	2025-12-01	\N	\N	\N	\N
24	9	250000.00	Chờ thanh toán	Chuyển khoản ngân hàng	Đơn hàng từ website\n[Ảnh minh chứng] Khách hàng đã upload ảnh minh chứng chuyển khoản	2025-11-28 01:19:00.132907	2025-11-28 01:19:00.132907	\N	2025-12-01	\N	/images/payment_proofs/proof_24_1764267548484-463523728.JPG	\N	\N
25	3	500000.00	Chờ xác nhận	Thanh toán khi nhận hàng	Đơn hàng từ website	2025-11-28 01:24:39.586651	2025-11-28 01:24:39.586651	\N	2025-12-01	\N	\N	\N	\N
26	10	500000.00	Đang giao hàng	Chuyển khoản ngân hàng	Đơn hàng từ website\n[Ảnh minh chứng] Khách hàng đã upload ảnh minh chứng chuyển khoản	2025-11-28 01:30:27.110051	2025-11-28 01:31:12.485047	\N	2025-12-01	\N	/images/payment_proofs/proof_26_1764268232344-116663511.PNG	\N	\N
27	10	0.00	Đã giao	Chuyển khoản ngân hàng	Đơn hàng từ website\n[Ảnh minh chứng] Khách hàng đã upload ảnh minh chứng chuyển khoản	2025-11-28 22:43:18.146552	2025-11-28 22:44:41.107657	\N	2025-12-01	2025-11-28 22:44:41.107657	/images/payment_proofs/proof_27_1764344615114-866389098.jpg	\N	\N
28	9	250000.00	Đã giao	Thanh toán khi nhận hàng	Đơn hàng từ website	2026-02-26 23:11:56.570879	2026-02-26 23:13:00.426581	\N	2026-03-01	2026-02-26 23:13:00.426581	\N	\N	\N
\.


--
-- TOC entry 6005 (class 0 OID 44442)
-- Dependencies: 250
-- Data for Name: khach_hang; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.khach_hang (id_khach_hang, ten_khach_hang, email, so_dien_thoai, dia_chi, ghi_chu, ngay_tao, id_user) FROM stdin;
4	aa	adphucdz@gmaiil.com	0339025833	aa	aa	2025-11-27 21:56:19.01649	42
5	xx	bumanhluc250903@gmail.com	0339025833	aa	aaa	2025-11-27 21:59:36.385614	42
6	nnn	admin@gmail.com	0339025833	aa	aa	2025-11-27 22:03:49.277142	42
7	mmm	admin@gmail.com	0339025833	mmm	mm	2025-11-27 22:17:36.527809	42
8	bbb	admin@gmail.com	0339025833	111	11	2025-11-27 22:22:04.357581	42
1	bvasd	adphucdz@gmaiil.com	0339025833	sdas	ádasd	2025-11-27 21:09:28.545213	42
2	vâcxc	zxczx@gmail.com	0339025833	ádas	zxczx	2025-11-27 21:38:45.994912	42
3	nam	admin@gmail.com	0339025833	aa	aaa	2025-11-27 21:51:51.510202	42
10	Dương Quốc Anh	Duongquocanh@gmail.com	0339025833	hà nội	hihi	2025-11-28 01:30:27.110051	45
9	Nguyễn Văn Phúc	2121050415@student.humg.edu.vn	0339025833	ok em zai		2025-11-27 23:23:34.837975	1
\.


--
-- TOC entry 6003 (class 0 OID 44399)
-- Dependencies: 247
-- Data for Name: lich_su_don_hang; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lich_su_don_hang (id_lich_su, id_don_hang, trang_thai_cu, trang_thai_moi, nguoi_thuc_hien, ghi_chu, ngay_thay_doi) FROM stdin;
2	3	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-27 21:09:28.545213
3	3	Chờ xác nhận	Đã xác nhận	\N	Tự động ghi log	2025-11-27 21:09:58.019014
4	4	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-27 21:38:45.994912
5	5	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-27 21:51:51.510202
6	6	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-27 21:56:19.01649
7	7	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-27 21:59:36.385614
8	8	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-27 22:03:49.277142
9	9	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-27 22:17:36.527809
10	10	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-27 22:22:04.357581
11	11	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-27 23:23:34.837975
12	12	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-27 23:25:30.923887
13	13	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-27 23:25:33.675239
14	14	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-27 23:27:07.222115
15	15	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-27 23:27:37.026044
16	16	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-27 23:27:39.60214
17	17	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-27 23:28:42.6306
18	18	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-27 23:28:58.734737
19	19	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-27 23:30:43.601858
20	19	Chờ xác nhận	Đang giao hàng	\N	Tự động ghi log	2025-11-28 00:14:17.522977
21	20	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-28 00:56:59.663235
22	21	\N	Chờ thanh toán	\N	Đơn hàng mới được tạo	2025-11-28 00:57:23.062198
23	22	\N	Chờ thanh toán	\N	Đơn hàng mới được tạo	2025-11-28 01:07:02.914653
24	23	\N	Chờ thanh toán	\N	Đơn hàng mới được tạo	2025-11-28 01:16:41.142548
25	24	\N	Chờ thanh toán	\N	Đơn hàng mới được tạo	2025-11-28 01:19:00.132907
26	25	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2025-11-28 01:24:39.586651
27	26	\N	Chờ thanh toán	\N	Đơn hàng mới được tạo	2025-11-28 01:30:27.110051
28	26	Chờ thanh toán	Đang giao hàng	\N	Tự động ghi log	2025-11-28 01:31:12.485047
29	27	\N	Chờ thanh toán	\N	Đơn hàng mới được tạo	2025-11-28 22:43:18.146552
30	27	Chờ thanh toán	Đã giao	\N	Tự động ghi log	2025-11-28 22:44:41.107657
31	28	\N	Chờ xác nhận	\N	Đơn hàng mới được tạo	2026-02-26 23:11:56.570879
32	28	Chờ xác nhận	Đã giao	\N	Tự động ghi log	2026-02-26 23:13:00.426581
\.


--
-- TOC entry 5981 (class 0 OID 18739)
-- Dependencies: 225
-- Data for Name: muon_sach; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.muon_sach (id_muonsach, id_sach, ngay_muon, ngay_tra, ten_nguoi_muon, email_nguoi_muon, so_dien_thoai, ghi_chu, thu_vien, trang_thai, ngay_tao) FROM stdin;
1	2	2025-04-02 14:30:00	2025-04-10 09:00:00	Le Van Hung	\N	\N	\N	\N	Đã duyệt	2025-08-24 18:13:14.610654
2	3	2025-04-03 09:15:00	\N	Pham Thi Mai	\N	\N	\N	\N	Đã từ chối	2025-08-24 18:13:14.610654
3	4	2025-04-04 16:20:00	2025-04-12 14:00:00	Hoang Van Nam	\N	\N	\N	\N	Đã từ chối	2025-08-24 18:13:14.610654
4	5	2025-04-05 11:00:00	\N	Vu Thi Lan	\N	\N	\N	\N	Đã từ chối	2025-08-24 18:13:14.610654
5	6	2025-04-06 13:45:00	2025-04-15 10:30:00	Nguyen Van Kien	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
6	7	2025-04-07 08:30:00	\N	Do Thi Hoa	\N	\N	\N	\N	Đã duyệt	2025-08-24 18:13:14.610654
7	9	2025-04-09 12:10:00	\N	Trinh Thi Thu	\N	\N	\N	\N	Đã duyệt	2025-08-24 18:13:14.610654
8	10	2025-04-10 17:00:00	2025-04-18 13:00:00	Dang Van Long	\N	\N	\N	\N	Đã duyệt	2025-08-24 18:13:14.610654
9	11	2025-04-11 09:30:00	\N	Nguyen Thi Ha	\N	\N	\N	\N	Đã duyệt	2025-08-24 18:13:14.610654
10	12	2025-04-12 14:00:00	\N	Le Van Duc	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
11	13	2025-04-13 10:45:00	\N	Pham Van Anh	\N	\N	\N	\N	Đã từ chối	2025-08-24 18:13:14.610654
12	14	2025-04-14 16:30:00	\N	Hoang Thi Yen	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
13	15	2025-04-15 11:15:00	\N	Vu Van Minh	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
14	16	2025-04-16 13:00:00	\N	Tran Van Son	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
30	12	2025-05-02 14:30:00	\N	Le Van Truong	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
31	13	2025-05-03 10:00:00	\N	Pham Thi Lan	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
32	14	2025-05-04 16:45:00	\N	Hoang Van Khoa	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
33	15	2025-05-05 11:00:00	\N	Vu Thi Huong	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
34	16	2025-05-06 13:30:00	\N	Tran Van Tuan	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
35	17	2025-05-07 08:15:00	\N	Do Van Hai	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
36	18	2025-05-07 15:00:00	\N	Bui Thi Cuc	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
37	20	2025-05-07 12:15:00	\N	Trinh Van Dong	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
38	21	2025-05-07 17:30:00	\N	Dang Thi Thuy	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
49	2	2025-11-25 00:00:00	2025-11-29 00:00:00	xxx22	\N	\N	\N	\N	Đã từ chối	2025-11-26 10:00:19.156286
50	3	2005-10-16 00:00:00	2055-12-30 00:00:00	Lê Mai Trang	lemaitranghanoi@gmail.com	0901761000	Hihihi	Thư viện Hoàn Kiếm	Đã duyệt	2025-12-08 23:57:00.369
15	17	2025-04-17 08:00:00	\N	Do Van Phuc	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
16	18	2025-04-18 15:30:00	2025-04-26 14:30:00	Bui Thi Linh	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
17	20	2025-04-19 12:00:00	\N	Trinh Van Bao	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
18	21	2025-04-20 17:45:00	\N	Dang Thi Ngoc	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
19	1	2025-04-21 09:00:00	\N	Nguyen Van Tam	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
20	2	2025-04-22 14:15:00	\N	Le Thi Kim	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
21	3	2025-04-23 10:30:00	\N	Pham Van Hieu	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
22	4	2025-04-24 16:00:00	\N	Hoang Van Phu	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
23	5	2025-04-25 11:30:00	\N	Vu Thi Thanh	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
24	6	2025-04-26 13:15:00	\N	Tran Van Thai	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
25	7	2025-04-27 08:45:00	\N	Do Thi Mai	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
26	8	2025-04-28 15:45:00	\N	Bui Van Quan	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
27	9	2025-04-29 12:30:00	\N	Trinh Thi Hong	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
28	10	2025-04-30 17:15:00	\N	Dang Van Vinh	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
29	11	2025-05-01 09:45:00	\N	Nguyen Thi Tuyet	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
44	23	2025-09-30 00:00:00	2025-10-14 00:00:00	Nguyễn Văn A	test@gmail.com	0123456789	Hihi	Thư viện Ba Đình	Đã duyệt	2025-09-30 23:23:43.932
45	22	2025-09-29 00:00:00	2025-10-16 00:00:00	Dương Quốc Anha	Duongquocanh@gmail.com	03919293192	MYLOVE	Thư Viện Quận Long Biên	Đã duyệt	2025-09-30 23:26:10.943
46	7	2025-09-30 00:00:00	2025-12-14 00:00:00	Nguyễn Văn Đức	haan@gmail.com	0339201212	ádasdas	Thư Viện Ba Đình	Đã duyệt	2025-10-01 18:18:20.055
47	10	2025-10-12 00:00:00	2025-10-26 00:00:00	Phúc Văn Nguyễn	hello@gmail.com	03390258313	tôi muốn mượn lâu hơn	Thư Viện Quận Cầu Giấy	Đã duyệt	2025-10-13 00:00:11.388
48	3	2025-11-23 00:00:00	2025-12-07 00:00:00	đâsd	ádasd	ádasd	ádasdasd	Test Library	Đã duyệt	2025-11-23 23:40:37.378
39	1	2025-08-06 00:00:00	2025-08-20 00:00:00	Nguyễn Văn C	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
40	1	2025-08-06 00:00:00	2025-08-07 00:00:00	Nguyễn Văn C	\N	\N	\N	\N	Chờ xử lý	2025-08-24 18:13:14.610654
41	1	2025-09-09 00:00:00	2025-09-26 00:00:00	Pn	\N	\N	\N	\N	Đã duyệt	2025-09-10 00:19:06.857925
42	2	2025-09-16 00:00:00	2025-12-29 00:00:00	ha van long	\N	\N	\N	\N	Đã duyệt	2025-09-16 23:21:48.047164
43	4	2025-09-30 00:00:00	2026-02-22 00:00:00	Nam Đẹp zai	\N	\N	\N	\N	Đã từ chối	2025-09-30 23:08:10.878381
\.


--
-- TOC entry 5983 (class 0 OID 18744)
-- Dependencies: 227
-- Data for Name: nguoi_dung; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nguoi_dung (id_user, tai_khoan, mat_khau, id_vaitro, ho_ten, so_dt, email, id_thuvien) FROM stdin;
2	dat2003	dat2003	2	NguyenTienDat	0223456789	dat@gmail.com	\N
4	c2003	c123456	2	Nguyen Van C	0337680729	c@gmail.com	\N
5	d2003	123456	2	Nguyen Van D	0337680730	d@gmail.com	\N
41	duy123	123456	2	Nguyen Van Duy	0337680731	duy@gmail.com	\N
42	Phuc123	phuc123	2	Nguyen Văn Phúc	0339025833	homthucuaphucc@gmail.com	\N
1	admin	admin	1	Nguyen Van A\n	0123456789	a@gmail.com	\N
3	b2003	123456	2	Nguyen Van B	0337680728	b@gmail.com	\N
44	hehe123	Phuc123	2	phuc van nguyen	0339025833	ad@gmail.com	\N
45	hoangmai	hoangmai123	2	fuck	0339025833	xx@gmail.com	1
43	phucle	phuc123	3	phuc văn lê	03390258332	adphucdz@gmail.com	\N
46	hoangle	hoangle	3	fuck	0339025833	hihi@gmail.com	\N
47	nhanvien01	123456	3	Nhân viên Mới	0988777666	nhanvien@thuvien.com	\N
\.


--
-- TOC entry 6007 (class 0 OID 44470)
-- Dependencies: 252
-- Data for Name: payment_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_config (id_config, payment_method, qr_image, account_number, account_name, bank_name, is_active, created_at, updated_at) FROM stdin;
2	Ví MoMo	\N	\N	\N	\N	f	2025-11-27 23:23:41.806007	2025-11-27 23:23:41.806007
1	Chuyển khoản ngân hàng	/images/payment_proofs/qr_Chuy_n_kho_n_ng_n_h_ng_1766939000023.jpg	0339025833	Nguyễn Văn Phúc	 MB BANK	t	2025-11-27 23:23:41.806007	2025-12-28 23:23:20.201825
\.


--
-- TOC entry 5985 (class 0 OID 18750)
-- Dependencies: 229
-- Data for Name: sach; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sach (id_sach, ten_sach, tac_gia, nam_xuat_ban, id_theloai, slton, tongsl, digital_file, id_thuvien, gia, gia_goc) FROM stdin;
13	Triết học 1	Tác giả M	2022	7	6	8	/pdfs/book_13.pdf	\N	0.00	\N
14	Triết học 2	Tác giả N	2020	7	8	10	/pdfs/book_14.pdf	\N	0.00	\N
17	Ngôn ngữ học 1	Tác giả Q	2021	9	13	15	/pdfs/book_17.pdf	\N	0.00	\N
18	Ngôn ngữ học 2	Tác giả R	2022	9	8	10	/pdfs/book_18.pdf	\N	0.00	\N
9	Lịch sử 1	Tác giả E	2018	5	3	5	\N	\N	0.00	\N
15	Xã hội học 1	Tác giả O	2019	8	12	14	\N	\N	0.00	\N
16	Xã hội học 2	Tác giả P	2020	8	18	20	\N	\N	0.00	\N
20	Giải tich 1	Nguyễn Văn A	2000	10	10	12	\N	\N	0.00	\N
23	DU KA	Phúc Nguyễn	2020	1	106	110	\N	\N	500000.00	7000000.00
22	Việt Nam	Phúc Nguyễn	2025	3	99	100	\N	\N	199000.00	300000.00
12	Văn hóa 2	Tác giả L	2020	6	20	22	\N	\N	199000.00	300000.00
3	Văn học 1	Tác giả C	2019	2	5	12	\N	\N	199000.00	299000.00
10	Lịch sử 2	Tác giả F	2020	5	8	10	\N	\N	0.00	\N
4	Văn học 2	Tác giả D	2022	2	7	8	\N	\N	199000.00	299000.00
5	Công nghệ 1	Tác giả G	2021	3	10	20	\N	\N	199000.00	299000.00
6	Công nghệ 2	Tác giả H	2022	3	22	30	\N	\N	199000.00	299000.00
8	Kinh tế 2	Tác giả J	2021	4	0	12	/pdfs/book_8.pdf	\N	199000.00	299000.00
2	Khoa học 2	Tác giả B	2021	1	5	15	/pdfs/book_2.pdf	\N	199000.00	299000.00
7	Kinh tế 1	Tác giả I	2020	4	19	25	/pdfs/book_7.pdf	\N	0.00	\N
1	Khoa học 1	Tác giả A	2020	1	997	1020	/pdfs/book_1.pdf	\N	250000.00	300000.00
24	NẮNG ẤM XA DẦN 	NGUYỄN XUÂN PHÚC	2025	4	360	400	\N	\N	1000000.00	5000000.00
21	Conan	Nguyễn Tiến C	1999	11	0	12	\N	\N	199000.00	300000.00
11	Văn hóa 1	Tác giả K	2021	6	14	18	\N	\N	0.00	\N
\.


--
-- TOC entry 5694 (class 0 OID 17954)
-- Dependencies: 219
-- Data for Name: spatial_ref_sys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text) FROM stdin;
\.


--
-- TOC entry 5987 (class 0 OID 18761)
-- Dependencies: 231
-- Data for Name: the_loai; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.the_loai (id_theloai, ten_theloai, id_thuvien) FROM stdin;
1	Khoa học	1
2	Văn học	2
3	Công nghệ	3
4	Kinh tế	4
5	Lịch sử	5
6	Văn hóa	6
7	Triết học	7
8	Xã hội học	8
9	Ngôn ngữ học	9
10	Toán học	10
11	Truyện	10
12	XUKA	1
13	Khoa Học	25
14	Cơn Mưa Ngang Qua	5
\.


--
-- TOC entry 5989 (class 0 OID 18765)
-- Dependencies: 233
-- Data for Name: thu_vien; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.thu_vien (id_thuvien, ten_thuvien, dia_chi, wifi, phongdoc, canteen, dieuhoa, latitude, longitude, anh_360, phanloai) FROM stdin;
2	Thư Viện Ba Đình	Hà Nội, Quận Ba Đình, Phố Nguyễn Thái Học	t	t	f	t	21.02750000	105.83230000	/images/360/thuvien_2_360.jpg	Thư viện tư nhân
5	Thư Viện Quận Long Biên	Hà Nội, Quận Long Biên, Phố Ngọc Thụy	t	t	t	t	21.04250000	105.88090000	/images/360/thuvien_5_360.jpg	Thư viện tư nhân
8	Thư Viện Quận Tây Hồ	Hà Nội, Quận Tây Hồ, Phố Xuân Diệu	t	t	t	f	21.06620000	105.82670000	/images/360/thuvien_8_360.jpg	Thư viện tư nhân
10	Thư Viện Tân Hội	Hà Nội,Huyện Đan Phượng, Xã Tân Hội	t	t	f	f	21.09574827	105.69928668	/images/360/thuvien_10_360.jpg	Thư viện công cộng
6	Thư Viện Quận Thanh Xuân	Hà Nội, Quận Thanh Xuân, Phố Nguyễn Trãi	t	f	f	t	20.99760000	105.79890000	/images/360/thuvien_6_360.jpg	Thư viện công cộng
9	Thư Viện Quận Hai Bà Trưng	Hà Nội, Quận Hai Bà Trưng, Phố Trần Khát Chân	t	f	f	t	21.01440000	105.86110000	/images/360/thuvien_9_360.jpg	Thư viện công cộng(có thư viện số)
11	Thư viện Hà Nội 11	Hà Nội	t	t	t	f	21.02832529	105.83814660	/images/360/thuvien_11_360.jpg	Thư viện tư nhân
21	Thư viện Quốc gia	31 Tràng Thi, Hoàn Kiếm, Hà Nội	t	t	t	t	21.02851100	105.84185400	quoc_gia_360.jpg	Quốc gia
22	Thư viện Tạ Quang Bửu	1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội	t	t	t	t	21.00752900	105.84712300	bk_360.jpg	Đại học
23	Thư viện Hà Nội	47 Bà Triệu, Hoàn Kiếm, Hà Nội	t	t	f	t	21.02345600	105.85678900	hanoi_360.jpg	Công cộng
24	Thư viện Đống Đa	145 Quan Thổ 1, Đống Đa, Hà Nội	t	t	t	t	21.01567800	105.83456700	dongda_360.jpg	Quận
25	Thư viện Cầu Giấy	232 Cầu Giấy, Cầu Giấy, Hà Nội	t	t	t	t	21.03456700	105.78901200	caugiay_360.jpg	Quận
26	Thư viện ĐHKHXH&NV	336 Nguyễn Trãi, Thanh Xuân, Hà Nội	t	t	t	t	21.00234500	105.82345600	ussh_360.jpg	Đại học
27	Thư viện Long Biên	456 Nguyễn Văn Cừ, Long Biên, Hà Nội	f	t	f	t	21.04567800	105.87654300	longbien_360.jpg	Quận
28	Thư viện Thanh Xuân	234 Nguyễn Trãi, Thanh Xuân, Hà Nội	t	t	t	t	20.99876500	105.82345600	thanhxuan_360.jpg	Quận
30	Thư viện Bắc Từ Liêm	123 Phạm Văn Đồng, Bắc Từ Liêm, Hà Nội	t	f	t	t	21.06789000	105.77890100	bactuliem_360.jpg	Quận
31	Thư viện Hoàng Mai	567 Giải Phóng, Hoàng Mai, Hà Nội	t	t	t	t	20.98765400	105.84567800	hoangmai_360.jpg	Quận
32	Thư viện Hai Bà Trưng	789 Bạch Mai, Hai Bà Trưng, Hà Nội	t	t	t	t	21.01234500	105.85678900	haibatrung_360.jpg	Quận
33	Thư viện Ba Đình	110 Điện Biên Phủ, Ba Đình, Hà Nội	t	t	f	t	21.03456700	105.83456700	badinh_360.jpg	Quận
34	Thư viện Hoàn Kiếm	23 Tràng Tiền, Hoàn Kiếm, Hà Nội	t	t	t	t	21.02567800	105.84567800	hoankiem_360.jpg	Quận
35	Thư viện ĐHBKHN	1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội	t	t	t	t	21.00712300	105.84723400	hust_360.jpg	Đại học
37	Thư viện ĐHQGHN	144 Xuân Thủy, Cầu Giấy, Hà Nội	t	t	t	t	21.03789000	105.78234500	vnu_360.jpg	Đại học
29	Thư viện Nam Từ Liêm	345 Mỹ Đình, Nam Từ Liêm, Hà Nội	t	t	t	t	21.02345600	105.77654300	/images/360/thuvien_29_360.jpg	Thư viện công cộng
4	Thư Viện Quận Đống Đa	Hà Nội, Quận Đống Đa, Phố Tôn Đức Thắng	t	t	t	t	21.02990000	105.83390000	/images/360/thuvien_4_360.jpg	Thư viện công cộng
36	Thư viện ĐH Y Hà Nội	1 Tôn Thất Tùng, Đống Đa, Hà Nội	t	t	t	t	21.00345600	105.82901200	/images/360/thuvien_36_360.jpg	Thư viện công cộng
3	Thư Viện Quận Cầu Giấy	Hà Nội, Quận Cầu Giấy, Phố Trần Duy Hưng	t	t	t	f	21.00840000	105.82410000	/images/360/thuvien_3_360.jpg	Thư viện công cộng(có thư viện số)
38	Thư Viện Của Phúc Nguyễn	Đường Hồng Phong, Khu 11, Quảng Yên, Quảng Ninh 20000, Việt Nam	t	t	t	t	20.91727689	106.85536651	/images/360/thuvien_40_360.jpg	Thư viện công cộng
200	Phúc Trang	297 Trâu Qùy	t	t	t	t	21.00489209	105.93743504	\N	Thư viện tư nhân
112	Hoàng Mai	345 Mỹ Đình, Nam Từ Liêm, Hà Nội	t	t	t	t	21.07225049	105.77419722	\N	Thư viện trường học
1	Thư Viện Quận Hoàn Kiếm	Hà Nội, Quận Hoàn Kiếm, Phố Ngô Quyền	t	f	t	f	21.02850000	105.85420000	/images/1764090794541-957539663.jpg	Thư viện trường học
7	Thư Viện Quận Hoàng Mai	Hà Nội, Quận Hoàng Mai, Phố Vĩnh Hưng	t	t	t	t	20.99210000	105.86530000	/images/360/thuvien_7_360.jpg	Thư viện tư nhân
554	thư viện nóng cá	hòa nạc	t	t	t	f	21.03068214	105.80388817	/images/1764090631974-467357209.png	Thư viện công cộng
39	Hoàng anh gia lai	hoàng quốc việt	t	t	f	f	20.95227105	106.77651335	\N	Thư viện tư nhân
40	Thư Viện Đh Mỏ địa chất	Phường Đức Thắng	t	t	f	f	21.07222045	105.77398264	\N	Thư viện trường học
\.


--
-- TOC entry 5993 (class 0 OID 27947)
-- Dependencies: 237
-- Data for Name: thu_vien_sach; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.thu_vien_sach (id_thuvien, id_sach, so_luong, ngay_them) FROM stdin;
1	1	8	2025-09-30 23:40:16.87589
1	2	3	2025-09-30 23:40:16.87589
1	3	12	2025-09-30 23:40:16.87589
1	4	12	2025-09-30 23:40:16.87589
1	5	8	2025-09-30 23:40:16.87589
1	6	9	2025-09-30 23:40:16.87589
1	7	9	2025-09-30 23:40:16.87589
1	8	5	2025-09-30 23:40:16.87589
1	9	6	2025-09-30 23:40:16.87589
1	10	5	2025-09-30 23:40:16.87589
1	11	9	2025-09-30 23:40:16.87589
1	12	15	2025-09-30 23:40:16.87589
1	13	6	2025-09-30 23:40:16.87589
1	14	9	2025-09-30 23:40:16.87589
1	15	3	2025-09-30 23:40:16.87589
1	16	15	2025-09-30 23:40:16.87589
1	17	5	2025-09-30 23:40:16.87589
1	18	8	2025-09-30 23:40:16.87589
1	20	13	2025-09-30 23:40:16.87589
1	21	5	2025-09-30 23:40:16.87589
1	22	3	2025-09-30 23:40:16.87589
1	23	14	2025-09-30 23:40:16.87589
2	1	12	2025-09-30 23:40:16.87589
2	2	10	2025-09-30 23:40:16.87589
2	3	7	2025-09-30 23:40:16.87589
2	4	15	2025-09-30 23:40:16.87589
2	5	4	2025-09-30 23:40:16.87589
2	6	5	2025-09-30 23:40:16.87589
2	7	9	2025-09-30 23:40:16.87589
2	8	9	2025-09-30 23:40:16.87589
2	9	6	2025-09-30 23:40:16.87589
2	10	14	2025-09-30 23:40:16.87589
2	11	12	2025-09-30 23:40:16.87589
2	12	4	2025-09-30 23:40:16.87589
2	13	5	2025-09-30 23:40:16.87589
2	14	8	2025-09-30 23:40:16.87589
2	15	10	2025-09-30 23:40:16.87589
2	16	3	2025-09-30 23:40:16.87589
2	17	6	2025-09-30 23:40:16.87589
2	18	7	2025-09-30 23:40:16.87589
2	20	9	2025-09-30 23:40:16.87589
2	21	9	2025-09-30 23:40:16.87589
2	22	13	2025-09-30 23:40:16.87589
2	23	5	2025-09-30 23:40:16.87589
3	1	14	2025-09-30 23:40:16.87589
3	2	3	2025-09-30 23:40:16.87589
3	3	15	2025-09-30 23:40:16.87589
3	4	13	2025-09-30 23:40:16.87589
3	6	15	2025-09-30 23:40:16.87589
3	7	6	2025-09-30 23:40:16.87589
3	8	14	2025-09-30 23:40:16.87589
3	9	5	2025-09-30 23:40:16.87589
3	10	10	2025-09-30 23:40:16.87589
3	11	9	2025-09-30 23:40:16.87589
3	12	4	2025-09-30 23:40:16.87589
3	13	8	2025-09-30 23:40:16.87589
3	14	10	2025-09-30 23:40:16.87589
3	15	5	2025-09-30 23:40:16.87589
3	16	6	2025-09-30 23:40:16.87589
3	17	10	2025-09-30 23:40:16.87589
3	18	9	2025-09-30 23:40:16.87589
3	20	6	2025-09-30 23:40:16.87589
3	21	7	2025-09-30 23:40:16.87589
3	22	4	2025-09-30 23:40:16.87589
3	23	13	2025-09-30 23:40:16.87589
4	1	10	2025-09-30 23:40:16.87589
4	2	12	2025-09-30 23:40:16.87589
4	3	13	2025-09-30 23:40:16.87589
4	4	8	2025-09-30 23:40:16.87589
4	5	6	2025-09-30 23:40:16.87589
4	6	7	2025-09-30 23:40:16.87589
4	7	8	2025-09-30 23:40:16.87589
4	8	4	2025-09-30 23:40:16.87589
4	9	11	2025-09-30 23:40:16.87589
4	10	5	2025-09-30 23:40:16.87589
4	11	8	2025-09-30 23:40:16.87589
4	12	10	2025-09-30 23:40:16.87589
4	13	6	2025-09-30 23:40:16.87589
4	14	7	2025-09-30 23:40:16.87589
4	15	3	2025-09-30 23:40:16.87589
4	16	10	2025-09-30 23:40:16.87589
4	17	3	2025-09-30 23:40:16.87589
4	18	3	2025-09-30 23:40:16.87589
4	20	7	2025-09-30 23:40:16.87589
4	21	15	2025-09-30 23:40:16.87589
4	22	14	2025-09-30 23:40:16.87589
4	23	4	2025-09-30 23:40:16.87589
5	1	14	2025-09-30 23:40:16.87589
5	2	9	2025-09-30 23:40:16.87589
5	3	10	2025-09-30 23:40:16.87589
5	4	4	2025-09-30 23:40:16.87589
5	5	4	2025-09-30 23:40:16.87589
5	6	8	2025-09-30 23:40:16.87589
5	7	9	2025-09-30 23:40:16.87589
5	8	9	2025-09-30 23:40:16.87589
5	9	14	2025-09-30 23:40:16.87589
5	10	7	2025-09-30 23:40:16.87589
5	11	12	2025-09-30 23:40:16.87589
5	12	14	2025-09-30 23:40:16.87589
5	13	6	2025-09-30 23:40:16.87589
5	14	6	2025-09-30 23:40:16.87589
5	15	13	2025-09-30 23:40:16.87589
5	16	13	2025-09-30 23:40:16.87589
5	17	15	2025-09-30 23:40:16.87589
5	18	6	2025-09-30 23:40:16.87589
5	20	14	2025-09-30 23:40:16.87589
5	21	10	2025-09-30 23:40:16.87589
5	22	12	2025-09-30 23:40:16.87589
5	23	12	2025-09-30 23:40:16.87589
6	1	14	2025-09-30 23:40:16.87589
6	2	11	2025-09-30 23:40:16.87589
6	3	5	2025-09-30 23:40:16.87589
6	4	8	2025-09-30 23:40:16.87589
6	5	14	2025-09-30 23:40:16.87589
6	6	4	2025-09-30 23:40:16.87589
6	7	10	2025-09-30 23:40:16.87589
6	8	5	2025-09-30 23:40:16.87589
6	9	3	2025-09-30 23:40:16.87589
6	10	5	2025-09-30 23:40:16.87589
6	11	13	2025-09-30 23:40:16.87589
6	12	14	2025-09-30 23:40:16.87589
6	13	6	2025-09-30 23:40:16.87589
6	14	5	2025-09-30 23:40:16.87589
6	15	4	2025-09-30 23:40:16.87589
6	16	9	2025-09-30 23:40:16.87589
6	17	7	2025-09-30 23:40:16.87589
6	18	3	2025-09-30 23:40:16.87589
6	20	4	2025-09-30 23:40:16.87589
6	21	6	2025-09-30 23:40:16.87589
6	22	10	2025-09-30 23:40:16.87589
6	23	5	2025-09-30 23:40:16.87589
7	1	6	2025-09-30 23:40:16.87589
7	2	15	2025-09-30 23:40:16.87589
7	3	4	2025-09-30 23:40:16.87589
7	4	4	2025-09-30 23:40:16.87589
7	5	12	2025-09-30 23:40:16.87589
7	6	9	2025-09-30 23:40:16.87589
7	7	12	2025-09-30 23:40:16.87589
7	8	5	2025-09-30 23:40:16.87589
7	9	11	2025-09-30 23:40:16.87589
7	10	15	2025-09-30 23:40:16.87589
7	11	4	2025-09-30 23:40:16.87589
7	12	8	2025-09-30 23:40:16.87589
7	13	4	2025-09-30 23:40:16.87589
7	14	6	2025-09-30 23:40:16.87589
7	15	7	2025-09-30 23:40:16.87589
7	16	12	2025-09-30 23:40:16.87589
7	17	11	2025-09-30 23:40:16.87589
7	18	9	2025-09-30 23:40:16.87589
7	20	4	2025-09-30 23:40:16.87589
7	21	10	2025-09-30 23:40:16.87589
7	22	14	2025-09-30 23:40:16.87589
7	23	12	2025-09-30 23:40:16.87589
8	1	14	2025-09-30 23:40:16.87589
8	2	11	2025-09-30 23:40:16.87589
8	3	4	2025-09-30 23:40:16.87589
8	4	3	2025-09-30 23:40:16.87589
8	5	6	2025-09-30 23:40:16.87589
8	6	15	2025-09-30 23:40:16.87589
8	7	8	2025-09-30 23:40:16.87589
8	8	14	2025-09-30 23:40:16.87589
8	9	5	2025-09-30 23:40:16.87589
8	10	13	2025-09-30 23:40:16.87589
8	11	3	2025-09-30 23:40:16.87589
8	12	6	2025-09-30 23:40:16.87589
8	13	4	2025-09-30 23:40:16.87589
8	14	8	2025-09-30 23:40:16.87589
8	15	11	2025-09-30 23:40:16.87589
8	16	7	2025-09-30 23:40:16.87589
8	17	6	2025-09-30 23:40:16.87589
8	18	10	2025-09-30 23:40:16.87589
8	20	9	2025-09-30 23:40:16.87589
8	21	13	2025-09-30 23:40:16.87589
8	22	11	2025-09-30 23:40:16.87589
8	23	11	2025-09-30 23:40:16.87589
9	1	5	2025-09-30 23:40:16.87589
9	2	12	2025-09-30 23:40:16.87589
9	3	13	2025-09-30 23:40:16.87589
9	4	3	2025-09-30 23:40:16.87589
9	5	10	2025-09-30 23:40:16.87589
9	6	15	2025-09-30 23:40:16.87589
9	7	12	2025-09-30 23:40:16.87589
9	8	10	2025-09-30 23:40:16.87589
9	9	7	2025-09-30 23:40:16.87589
9	10	10	2025-09-30 23:40:16.87589
9	11	6	2025-09-30 23:40:16.87589
9	12	14	2025-09-30 23:40:16.87589
9	13	3	2025-09-30 23:40:16.87589
9	14	14	2025-09-30 23:40:16.87589
9	15	6	2025-09-30 23:40:16.87589
9	16	4	2025-09-30 23:40:16.87589
9	17	3	2025-09-30 23:40:16.87589
9	18	14	2025-09-30 23:40:16.87589
9	20	5	2025-09-30 23:40:16.87589
9	21	10	2025-09-30 23:40:16.87589
9	22	12	2025-09-30 23:40:16.87589
9	23	12	2025-09-30 23:40:16.87589
10	1	5	2025-09-30 23:40:16.87589
10	2	9	2025-09-30 23:40:16.87589
10	3	3	2025-09-30 23:40:16.87589
10	4	5	2025-09-30 23:40:16.87589
10	5	5	2025-09-30 23:40:16.87589
10	6	13	2025-09-30 23:40:16.87589
10	7	13	2025-09-30 23:40:16.87589
10	8	8	2025-09-30 23:40:16.87589
10	9	6	2025-09-30 23:40:16.87589
10	10	12	2025-09-30 23:40:16.87589
10	11	11	2025-09-30 23:40:16.87589
10	12	7	2025-09-30 23:40:16.87589
10	13	9	2025-09-30 23:40:16.87589
10	14	15	2025-09-30 23:40:16.87589
10	15	13	2025-09-30 23:40:16.87589
10	16	6	2025-09-30 23:40:16.87589
10	17	5	2025-09-30 23:40:16.87589
10	18	4	2025-09-30 23:40:16.87589
10	20	8	2025-09-30 23:40:16.87589
10	21	14	2025-09-30 23:40:16.87589
10	22	3	2025-09-30 23:40:16.87589
10	23	5	2025-09-30 23:40:16.87589
11	1	13	2025-09-30 23:40:16.87589
11	2	6	2025-09-30 23:40:16.87589
11	3	14	2025-09-30 23:40:16.87589
11	4	11	2025-09-30 23:40:16.87589
11	5	6	2025-09-30 23:40:16.87589
11	6	13	2025-09-30 23:40:16.87589
11	7	10	2025-09-30 23:40:16.87589
11	8	5	2025-09-30 23:40:16.87589
11	9	15	2025-09-30 23:40:16.87589
11	10	8	2025-09-30 23:40:16.87589
11	11	13	2025-09-30 23:40:16.87589
11	12	3	2025-09-30 23:40:16.87589
11	13	11	2025-09-30 23:40:16.87589
11	14	5	2025-09-30 23:40:16.87589
11	15	13	2025-09-30 23:40:16.87589
11	16	7	2025-09-30 23:40:16.87589
11	17	11	2025-09-30 23:40:16.87589
11	18	5	2025-09-30 23:40:16.87589
11	20	11	2025-09-30 23:40:16.87589
11	21	10	2025-09-30 23:40:16.87589
11	22	15	2025-09-30 23:40:16.87589
11	23	8	2025-09-30 23:40:16.87589
21	1	7	2025-09-30 23:40:16.87589
21	2	14	2025-09-30 23:40:16.87589
21	3	3	2025-09-30 23:40:16.87589
21	4	8	2025-09-30 23:40:16.87589
21	5	8	2025-09-30 23:40:16.87589
21	6	15	2025-09-30 23:40:16.87589
21	7	8	2025-09-30 23:40:16.87589
21	8	3	2025-09-30 23:40:16.87589
21	9	7	2025-09-30 23:40:16.87589
21	10	6	2025-09-30 23:40:16.87589
21	11	5	2025-09-30 23:40:16.87589
21	12	6	2025-09-30 23:40:16.87589
21	13	4	2025-09-30 23:40:16.87589
21	14	12	2025-09-30 23:40:16.87589
21	15	10	2025-09-30 23:40:16.87589
21	16	12	2025-09-30 23:40:16.87589
21	17	13	2025-09-30 23:40:16.87589
21	18	3	2025-09-30 23:40:16.87589
21	20	14	2025-09-30 23:40:16.87589
21	21	10	2025-09-30 23:40:16.87589
21	22	15	2025-09-30 23:40:16.87589
21	23	6	2025-09-30 23:40:16.87589
22	1	12	2025-09-30 23:40:16.87589
22	2	11	2025-09-30 23:40:16.87589
22	3	7	2025-09-30 23:40:16.87589
22	4	14	2025-09-30 23:40:16.87589
22	5	12	2025-09-30 23:40:16.87589
22	6	6	2025-09-30 23:40:16.87589
22	7	9	2025-09-30 23:40:16.87589
22	8	7	2025-09-30 23:40:16.87589
22	9	8	2025-09-30 23:40:16.87589
22	10	10	2025-09-30 23:40:16.87589
22	11	14	2025-09-30 23:40:16.87589
22	12	13	2025-09-30 23:40:16.87589
22	13	6	2025-09-30 23:40:16.87589
22	14	4	2025-09-30 23:40:16.87589
22	15	8	2025-09-30 23:40:16.87589
22	16	3	2025-09-30 23:40:16.87589
22	17	3	2025-09-30 23:40:16.87589
22	18	13	2025-09-30 23:40:16.87589
22	20	11	2025-09-30 23:40:16.87589
22	21	10	2025-09-30 23:40:16.87589
22	22	6	2025-09-30 23:40:16.87589
22	23	14	2025-09-30 23:40:16.87589
23	1	10	2025-09-30 23:40:16.87589
23	2	8	2025-09-30 23:40:16.87589
23	3	7	2025-09-30 23:40:16.87589
23	4	13	2025-09-30 23:40:16.87589
23	5	5	2025-09-30 23:40:16.87589
23	6	12	2025-09-30 23:40:16.87589
23	7	12	2025-09-30 23:40:16.87589
23	8	12	2025-09-30 23:40:16.87589
23	9	15	2025-09-30 23:40:16.87589
23	10	14	2025-09-30 23:40:16.87589
23	11	10	2025-09-30 23:40:16.87589
23	12	13	2025-09-30 23:40:16.87589
23	13	15	2025-09-30 23:40:16.87589
23	14	5	2025-09-30 23:40:16.87589
23	15	13	2025-09-30 23:40:16.87589
23	16	6	2025-09-30 23:40:16.87589
23	17	8	2025-09-30 23:40:16.87589
23	18	12	2025-09-30 23:40:16.87589
23	20	6	2025-09-30 23:40:16.87589
23	21	11	2025-09-30 23:40:16.87589
23	22	14	2025-09-30 23:40:16.87589
23	23	12	2025-09-30 23:40:16.87589
24	1	12	2025-09-30 23:40:16.87589
24	2	11	2025-09-30 23:40:16.87589
24	3	8	2025-09-30 23:40:16.87589
24	4	15	2025-09-30 23:40:16.87589
24	5	12	2025-09-30 23:40:16.87589
24	6	4	2025-09-30 23:40:16.87589
24	7	7	2025-09-30 23:40:16.87589
24	8	5	2025-09-30 23:40:16.87589
24	9	10	2025-09-30 23:40:16.87589
24	10	13	2025-09-30 23:40:16.87589
24	11	13	2025-09-30 23:40:16.87589
24	12	7	2025-09-30 23:40:16.87589
24	13	3	2025-09-30 23:40:16.87589
24	14	11	2025-09-30 23:40:16.87589
24	15	10	2025-09-30 23:40:16.87589
24	16	12	2025-09-30 23:40:16.87589
24	17	12	2025-09-30 23:40:16.87589
24	18	10	2025-09-30 23:40:16.87589
24	20	15	2025-09-30 23:40:16.87589
24	21	15	2025-09-30 23:40:16.87589
24	22	12	2025-09-30 23:40:16.87589
24	23	7	2025-09-30 23:40:16.87589
25	1	10	2025-09-30 23:40:16.87589
25	2	15	2025-09-30 23:40:16.87589
25	3	7	2025-09-30 23:40:16.87589
25	4	6	2025-09-30 23:40:16.87589
25	5	6	2025-09-30 23:40:16.87589
25	6	9	2025-09-30 23:40:16.87589
25	7	9	2025-09-30 23:40:16.87589
25	8	15	2025-09-30 23:40:16.87589
25	9	14	2025-09-30 23:40:16.87589
25	10	7	2025-09-30 23:40:16.87589
25	11	14	2025-09-30 23:40:16.87589
25	12	15	2025-09-30 23:40:16.87589
25	13	6	2025-09-30 23:40:16.87589
25	14	12	2025-09-30 23:40:16.87589
25	15	9	2025-09-30 23:40:16.87589
25	16	15	2025-09-30 23:40:16.87589
25	17	3	2025-09-30 23:40:16.87589
25	18	7	2025-09-30 23:40:16.87589
25	20	9	2025-09-30 23:40:16.87589
25	21	8	2025-09-30 23:40:16.87589
25	22	9	2025-09-30 23:40:16.87589
25	23	9	2025-09-30 23:40:16.87589
26	1	11	2025-09-30 23:40:16.87589
26	2	4	2025-09-30 23:40:16.87589
26	3	9	2025-09-30 23:40:16.87589
26	4	9	2025-09-30 23:40:16.87589
26	5	9	2025-09-30 23:40:16.87589
26	6	13	2025-09-30 23:40:16.87589
26	7	6	2025-09-30 23:40:16.87589
26	8	11	2025-09-30 23:40:16.87589
26	9	14	2025-09-30 23:40:16.87589
26	10	4	2025-09-30 23:40:16.87589
26	11	10	2025-09-30 23:40:16.87589
26	12	14	2025-09-30 23:40:16.87589
26	13	13	2025-09-30 23:40:16.87589
26	14	3	2025-09-30 23:40:16.87589
26	15	9	2025-09-30 23:40:16.87589
26	16	9	2025-09-30 23:40:16.87589
26	17	10	2025-09-30 23:40:16.87589
26	18	10	2025-09-30 23:40:16.87589
26	20	4	2025-09-30 23:40:16.87589
26	21	14	2025-09-30 23:40:16.87589
26	22	9	2025-09-30 23:40:16.87589
26	23	13	2025-09-30 23:40:16.87589
27	1	10	2025-09-30 23:40:16.87589
27	2	5	2025-09-30 23:40:16.87589
27	3	13	2025-09-30 23:40:16.87589
27	4	4	2025-09-30 23:40:16.87589
27	5	4	2025-09-30 23:40:16.87589
27	6	9	2025-09-30 23:40:16.87589
27	7	3	2025-09-30 23:40:16.87589
27	8	8	2025-09-30 23:40:16.87589
27	9	10	2025-09-30 23:40:16.87589
27	10	15	2025-09-30 23:40:16.87589
27	11	11	2025-09-30 23:40:16.87589
27	12	9	2025-09-30 23:40:16.87589
27	13	11	2025-09-30 23:40:16.87589
27	14	15	2025-09-30 23:40:16.87589
27	15	4	2025-09-30 23:40:16.87589
27	16	8	2025-09-30 23:40:16.87589
27	17	5	2025-09-30 23:40:16.87589
27	18	10	2025-09-30 23:40:16.87589
27	20	3	2025-09-30 23:40:16.87589
27	21	14	2025-09-30 23:40:16.87589
27	22	4	2025-09-30 23:40:16.87589
27	23	4	2025-09-30 23:40:16.87589
28	1	5	2025-09-30 23:40:16.87589
28	2	12	2025-09-30 23:40:16.87589
28	3	6	2025-09-30 23:40:16.87589
28	4	10	2025-09-30 23:40:16.87589
28	5	14	2025-09-30 23:40:16.87589
28	6	10	2025-09-30 23:40:16.87589
28	7	6	2025-09-30 23:40:16.87589
28	8	15	2025-09-30 23:40:16.87589
28	9	5	2025-09-30 23:40:16.87589
28	10	13	2025-09-30 23:40:16.87589
28	11	7	2025-09-30 23:40:16.87589
28	12	7	2025-09-30 23:40:16.87589
28	13	14	2025-09-30 23:40:16.87589
28	14	5	2025-09-30 23:40:16.87589
28	15	6	2025-09-30 23:40:16.87589
28	16	7	2025-09-30 23:40:16.87589
28	17	11	2025-09-30 23:40:16.87589
28	18	14	2025-09-30 23:40:16.87589
28	20	15	2025-09-30 23:40:16.87589
28	21	15	2025-09-30 23:40:16.87589
28	22	15	2025-09-30 23:40:16.87589
28	23	4	2025-09-30 23:40:16.87589
29	1	7	2025-09-30 23:40:16.87589
29	2	6	2025-09-30 23:40:16.87589
29	3	12	2025-09-30 23:40:16.87589
29	4	10	2025-09-30 23:40:16.87589
29	5	6	2025-09-30 23:40:16.87589
29	6	10	2025-09-30 23:40:16.87589
29	7	14	2025-09-30 23:40:16.87589
29	8	3	2025-09-30 23:40:16.87589
29	9	12	2025-09-30 23:40:16.87589
29	10	12	2025-09-30 23:40:16.87589
29	11	4	2025-09-30 23:40:16.87589
29	12	13	2025-09-30 23:40:16.87589
29	13	5	2025-09-30 23:40:16.87589
29	14	10	2025-09-30 23:40:16.87589
29	15	9	2025-09-30 23:40:16.87589
29	16	8	2025-09-30 23:40:16.87589
29	17	6	2025-09-30 23:40:16.87589
29	18	6	2025-09-30 23:40:16.87589
29	20	12	2025-09-30 23:40:16.87589
29	21	12	2025-09-30 23:40:16.87589
29	22	15	2025-09-30 23:40:16.87589
29	23	9	2025-09-30 23:40:16.87589
30	1	11	2025-09-30 23:40:16.87589
30	2	14	2025-09-30 23:40:16.87589
30	3	15	2025-09-30 23:40:16.87589
30	4	8	2025-09-30 23:40:16.87589
30	5	4	2025-09-30 23:40:16.87589
30	6	9	2025-09-30 23:40:16.87589
30	7	7	2025-09-30 23:40:16.87589
30	8	11	2025-09-30 23:40:16.87589
30	9	15	2025-09-30 23:40:16.87589
30	10	3	2025-09-30 23:40:16.87589
30	11	4	2025-09-30 23:40:16.87589
30	12	7	2025-09-30 23:40:16.87589
30	13	6	2025-09-30 23:40:16.87589
30	14	14	2025-09-30 23:40:16.87589
30	15	8	2025-09-30 23:40:16.87589
30	16	10	2025-09-30 23:40:16.87589
30	17	9	2025-09-30 23:40:16.87589
30	18	6	2025-09-30 23:40:16.87589
30	20	14	2025-09-30 23:40:16.87589
30	21	11	2025-09-30 23:40:16.87589
30	22	3	2025-09-30 23:40:16.87589
30	23	10	2025-09-30 23:40:16.87589
31	1	10	2025-09-30 23:40:16.87589
31	2	10	2025-09-30 23:40:16.87589
31	3	5	2025-09-30 23:40:16.87589
31	4	7	2025-09-30 23:40:16.87589
31	5	6	2025-09-30 23:40:16.87589
31	6	7	2025-09-30 23:40:16.87589
31	7	11	2025-09-30 23:40:16.87589
31	8	11	2025-09-30 23:40:16.87589
31	9	4	2025-09-30 23:40:16.87589
31	10	13	2025-09-30 23:40:16.87589
31	11	7	2025-09-30 23:40:16.87589
31	12	8	2025-09-30 23:40:16.87589
31	13	9	2025-09-30 23:40:16.87589
31	14	3	2025-09-30 23:40:16.87589
31	15	14	2025-09-30 23:40:16.87589
31	16	14	2025-09-30 23:40:16.87589
31	17	5	2025-09-30 23:40:16.87589
31	18	7	2025-09-30 23:40:16.87589
31	20	9	2025-09-30 23:40:16.87589
31	21	5	2025-09-30 23:40:16.87589
31	22	6	2025-09-30 23:40:16.87589
31	23	4	2025-09-30 23:40:16.87589
32	1	6	2025-09-30 23:40:16.87589
32	2	11	2025-09-30 23:40:16.87589
32	3	13	2025-09-30 23:40:16.87589
32	4	4	2025-09-30 23:40:16.87589
32	5	6	2025-09-30 23:40:16.87589
32	6	6	2025-09-30 23:40:16.87589
32	7	15	2025-09-30 23:40:16.87589
32	8	4	2025-09-30 23:40:16.87589
32	9	14	2025-09-30 23:40:16.87589
32	10	11	2025-09-30 23:40:16.87589
32	11	15	2025-09-30 23:40:16.87589
32	12	15	2025-09-30 23:40:16.87589
32	13	4	2025-09-30 23:40:16.87589
32	14	13	2025-09-30 23:40:16.87589
32	15	3	2025-09-30 23:40:16.87589
32	16	15	2025-09-30 23:40:16.87589
32	17	3	2025-09-30 23:40:16.87589
32	18	12	2025-09-30 23:40:16.87589
32	20	5	2025-09-30 23:40:16.87589
32	21	5	2025-09-30 23:40:16.87589
32	22	12	2025-09-30 23:40:16.87589
32	23	5	2025-09-30 23:40:16.87589
33	1	7	2025-09-30 23:40:16.87589
33	2	8	2025-09-30 23:40:16.87589
33	3	7	2025-09-30 23:40:16.87589
33	4	6	2025-09-30 23:40:16.87589
33	5	3	2025-09-30 23:40:16.87589
33	6	10	2025-09-30 23:40:16.87589
33	7	14	2025-09-30 23:40:16.87589
33	8	5	2025-09-30 23:40:16.87589
33	9	9	2025-09-30 23:40:16.87589
33	10	9	2025-09-30 23:40:16.87589
33	11	9	2025-09-30 23:40:16.87589
33	12	11	2025-09-30 23:40:16.87589
33	13	6	2025-09-30 23:40:16.87589
33	14	10	2025-09-30 23:40:16.87589
33	15	8	2025-09-30 23:40:16.87589
33	16	11	2025-09-30 23:40:16.87589
33	17	11	2025-09-30 23:40:16.87589
33	18	10	2025-09-30 23:40:16.87589
33	20	11	2025-09-30 23:40:16.87589
33	21	4	2025-09-30 23:40:16.87589
33	22	5	2025-09-30 23:40:16.87589
33	23	4	2025-09-30 23:40:16.87589
34	1	13	2025-09-30 23:40:16.87589
34	2	11	2025-09-30 23:40:16.87589
34	3	4	2025-09-30 23:40:16.87589
34	4	3	2025-09-30 23:40:16.87589
34	5	7	2025-09-30 23:40:16.87589
34	6	10	2025-09-30 23:40:16.87589
34	7	4	2025-09-30 23:40:16.87589
34	8	9	2025-09-30 23:40:16.87589
34	9	4	2025-09-30 23:40:16.87589
34	10	8	2025-09-30 23:40:16.87589
34	11	14	2025-09-30 23:40:16.87589
34	12	15	2025-09-30 23:40:16.87589
34	13	5	2025-09-30 23:40:16.87589
34	14	13	2025-09-30 23:40:16.87589
34	15	5	2025-09-30 23:40:16.87589
34	16	10	2025-09-30 23:40:16.87589
34	17	12	2025-09-30 23:40:16.87589
34	18	8	2025-09-30 23:40:16.87589
34	20	4	2025-09-30 23:40:16.87589
34	21	7	2025-09-30 23:40:16.87589
34	22	10	2025-09-30 23:40:16.87589
34	23	5	2025-09-30 23:40:16.87589
35	1	4	2025-09-30 23:40:16.87589
35	2	14	2025-09-30 23:40:16.87589
35	3	15	2025-09-30 23:40:16.87589
35	4	6	2025-09-30 23:40:16.87589
35	5	11	2025-09-30 23:40:16.87589
35	6	15	2025-09-30 23:40:16.87589
35	7	3	2025-09-30 23:40:16.87589
35	8	12	2025-09-30 23:40:16.87589
35	9	11	2025-09-30 23:40:16.87589
35	10	13	2025-09-30 23:40:16.87589
35	11	9	2025-09-30 23:40:16.87589
35	12	8	2025-09-30 23:40:16.87589
35	13	3	2025-09-30 23:40:16.87589
35	14	7	2025-09-30 23:40:16.87589
35	15	8	2025-09-30 23:40:16.87589
35	16	8	2025-09-30 23:40:16.87589
35	17	14	2025-09-30 23:40:16.87589
35	18	6	2025-09-30 23:40:16.87589
35	20	14	2025-09-30 23:40:16.87589
35	21	8	2025-09-30 23:40:16.87589
35	22	5	2025-09-30 23:40:16.87589
35	23	5	2025-09-30 23:40:16.87589
36	1	8	2025-09-30 23:40:16.87589
36	2	14	2025-09-30 23:40:16.87589
36	3	12	2025-09-30 23:40:16.87589
36	4	11	2025-09-30 23:40:16.87589
36	5	15	2025-09-30 23:40:16.87589
36	6	15	2025-09-30 23:40:16.87589
36	7	5	2025-09-30 23:40:16.87589
36	8	9	2025-09-30 23:40:16.87589
36	9	10	2025-09-30 23:40:16.87589
36	10	15	2025-09-30 23:40:16.87589
36	11	15	2025-09-30 23:40:16.87589
36	12	7	2025-09-30 23:40:16.87589
36	13	8	2025-09-30 23:40:16.87589
36	14	15	2025-09-30 23:40:16.87589
36	15	3	2025-09-30 23:40:16.87589
36	16	12	2025-09-30 23:40:16.87589
36	17	14	2025-09-30 23:40:16.87589
36	18	5	2025-09-30 23:40:16.87589
36	20	9	2025-09-30 23:40:16.87589
36	21	11	2025-09-30 23:40:16.87589
36	22	12	2025-09-30 23:40:16.87589
36	23	5	2025-09-30 23:40:16.87589
37	1	6	2025-09-30 23:40:16.87589
37	2	14	2025-09-30 23:40:16.87589
37	3	4	2025-09-30 23:40:16.87589
37	4	8	2025-09-30 23:40:16.87589
37	5	15	2025-09-30 23:40:16.87589
37	6	7	2025-09-30 23:40:16.87589
37	7	15	2025-09-30 23:40:16.87589
37	8	6	2025-09-30 23:40:16.87589
37	9	4	2025-09-30 23:40:16.87589
37	10	15	2025-09-30 23:40:16.87589
37	11	6	2025-09-30 23:40:16.87589
37	12	11	2025-09-30 23:40:16.87589
37	13	9	2025-09-30 23:40:16.87589
37	14	7	2025-09-30 23:40:16.87589
37	15	15	2025-09-30 23:40:16.87589
37	16	4	2025-09-30 23:40:16.87589
37	17	13	2025-09-30 23:40:16.87589
37	18	11	2025-09-30 23:40:16.87589
37	20	15	2025-09-30 23:40:16.87589
37	21	10	2025-09-30 23:40:16.87589
37	22	8	2025-09-30 23:40:16.87589
37	23	7	2025-09-30 23:40:16.87589
38	1	15	2025-09-30 23:40:16.87589
38	2	5	2025-09-30 23:40:16.87589
38	3	12	2025-09-30 23:40:16.87589
38	4	8	2025-09-30 23:40:16.87589
38	5	9	2025-09-30 23:40:16.87589
38	6	3	2025-09-30 23:40:16.87589
38	7	4	2025-09-30 23:40:16.87589
38	8	6	2025-09-30 23:40:16.87589
38	9	10	2025-09-30 23:40:16.87589
38	10	11	2025-09-30 23:40:16.87589
38	11	6	2025-09-30 23:40:16.87589
38	12	6	2025-09-30 23:40:16.87589
38	13	10	2025-09-30 23:40:16.87589
38	14	7	2025-09-30 23:40:16.87589
38	15	11	2025-09-30 23:40:16.87589
38	16	13	2025-09-30 23:40:16.87589
38	17	5	2025-09-30 23:40:16.87589
38	18	4	2025-09-30 23:40:16.87589
38	20	14	2025-09-30 23:40:16.87589
38	21	8	2025-09-30 23:40:16.87589
38	22	5	2025-09-30 23:40:16.87589
38	23	13	2025-09-30 23:40:16.87589
200	1	10	2025-09-30 23:40:16.87589
200	2	14	2025-09-30 23:40:16.87589
200	3	9	2025-09-30 23:40:16.87589
200	4	11	2025-09-30 23:40:16.87589
200	5	4	2025-09-30 23:40:16.87589
200	6	12	2025-09-30 23:40:16.87589
200	7	5	2025-09-30 23:40:16.87589
200	8	9	2025-09-30 23:40:16.87589
200	9	9	2025-09-30 23:40:16.87589
200	10	7	2025-09-30 23:40:16.87589
200	11	4	2025-09-30 23:40:16.87589
200	12	7	2025-09-30 23:40:16.87589
200	13	3	2025-09-30 23:40:16.87589
200	14	15	2025-09-30 23:40:16.87589
200	15	13	2025-09-30 23:40:16.87589
200	16	13	2025-09-30 23:40:16.87589
200	17	10	2025-09-30 23:40:16.87589
200	18	7	2025-09-30 23:40:16.87589
200	20	12	2025-09-30 23:40:16.87589
200	21	11	2025-09-30 23:40:16.87589
200	22	3	2025-09-30 23:40:16.87589
200	23	7	2025-09-30 23:40:16.87589
3	5	17	2025-11-25 23:25:02.481281
112	21	9	2025-11-25 23:26:24.845602
39	24	20	2026-02-26 23:09:30.05933
554	24	20	2026-02-27 00:28:26.565948
554	21	1	2026-02-27 00:28:38.226909
\.


--
-- TOC entry 6001 (class 0 OID 44387)
-- Dependencies: 245
-- Data for Name: trang_thai_don_hang; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.trang_thai_don_hang (id_trang_thai, ma_trang_thai, ten_trang_thai, mo_ta, mau_sac, thu_tu) FROM stdin;
1	CHO_XAC_NHAN	Chờ xác nhận	Khách hàng vừa đặt hàng, chờ admin xác nhận	warning	1
2	DA_XAC_NHAN	Đã xác nhận	Admin đã xác nhận đơn hàng	info	2
3	DANG_CHUAN_BI	Đang chuẩn bị	Đang đóng gói sách	primary	3
4	DANG_GIAO_HANG	Đang giao hàng	Đã giao cho shipper/đang trên đường giao	primary	4
5	DA_GIAO	Đã giao	Khách hàng đã nhận được hàng	success	5
6	DA_HUY	Đã hủy	Đơn hàng bị hủy	danger	6
\.


--
-- TOC entry 5991 (class 0 OID 18775)
-- Dependencies: 235
-- Data for Name: vai_tro; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vai_tro (id_vaitro, ten_vaitro) FROM stdin;
1	admin
2	chu_quan
3	nguoi_dung
\.


--
-- TOC entry 6061 (class 0 OID 0)
-- Dependencies: 224
-- Name: binh_luan_id_binhluan_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.binh_luan_id_binhluan_seq', 10, true);


--
-- TOC entry 6062 (class 0 OID 0)
-- Dependencies: 242
-- Name: chi_tiet_don_hang_id_chi_tiet_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.chi_tiet_don_hang_id_chi_tiet_seq', 42, true);


--
-- TOC entry 6063 (class 0 OID 0)
-- Dependencies: 238
-- Name: danh_gia_id_danhgia_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.danh_gia_id_danhgia_seq', 6, true);


--
-- TOC entry 6064 (class 0 OID 0)
-- Dependencies: 240
-- Name: don_hang_id_don_hang_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.don_hang_id_don_hang_seq', 28, true);


--
-- TOC entry 6065 (class 0 OID 0)
-- Dependencies: 249
-- Name: khach_hang_id_khach_hang_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.khach_hang_id_khach_hang_seq', 10, true);


--
-- TOC entry 6066 (class 0 OID 0)
-- Dependencies: 246
-- Name: lich_su_don_hang_id_lich_su_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lich_su_don_hang_id_lich_su_seq', 32, true);


--
-- TOC entry 6067 (class 0 OID 0)
-- Dependencies: 226
-- Name: muon_sach_id_muonsach_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.muon_sach_id_muonsach_seq', 51, true);


--
-- TOC entry 6068 (class 0 OID 0)
-- Dependencies: 228
-- Name: nguoi_dung_id_user_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nguoi_dung_id_user_seq', 47, true);


--
-- TOC entry 6069 (class 0 OID 0)
-- Dependencies: 251
-- Name: payment_config_id_config_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payment_config_id_config_seq', 4, true);


--
-- TOC entry 6070 (class 0 OID 0)
-- Dependencies: 230
-- Name: sach_id_sach_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sach_id_sach_seq', 20, true);


--
-- TOC entry 6071 (class 0 OID 0)
-- Dependencies: 232
-- Name: the_loai_id_theloai_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.the_loai_id_theloai_seq', 15, true);


--
-- TOC entry 6072 (class 0 OID 0)
-- Dependencies: 234
-- Name: thu_vien_id_thuvien_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.thu_vien_id_thuvien_seq', 555, true);


--
-- TOC entry 6073 (class 0 OID 0)
-- Dependencies: 244
-- Name: trang_thai_don_hang_id_trang_thai_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.trang_thai_don_hang_id_trang_thai_seq', 6, true);


--
-- TOC entry 6074 (class 0 OID 0)
-- Dependencies: 236
-- Name: vai_tro_id_vaitro_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vai_tro_id_vaitro_seq', 2, true);


--
-- TOC entry 5749 (class 2606 OID 18788)
-- Name: binh_luan binh_luan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.binh_luan
    ADD CONSTRAINT binh_luan_pkey PRIMARY KEY (id_binhluan);


--
-- TOC entry 5781 (class 2606 OID 44370)
-- Name: chi_tiet_don_hang chi_tiet_don_hang_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chi_tiet_don_hang
    ADD CONSTRAINT chi_tiet_don_hang_pkey PRIMARY KEY (id_chi_tiet);


--
-- TOC entry 5771 (class 2606 OID 36130)
-- Name: danh_gia danh_gia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.danh_gia
    ADD CONSTRAINT danh_gia_pkey PRIMARY KEY (id_danhgia);


--
-- TOC entry 5776 (class 2606 OID 44356)
-- Name: don_hang don_hang_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.don_hang
    ADD CONSTRAINT don_hang_pkey PRIMARY KEY (id_don_hang);


--
-- TOC entry 5794 (class 2606 OID 44450)
-- Name: khach_hang khach_hang_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.khach_hang
    ADD CONSTRAINT khach_hang_pkey PRIMARY KEY (id_khach_hang);


--
-- TOC entry 5791 (class 2606 OID 44407)
-- Name: lich_su_don_hang lich_su_don_hang_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lich_su_don_hang
    ADD CONSTRAINT lich_su_don_hang_pkey PRIMARY KEY (id_lich_su);


--
-- TOC entry 5751 (class 2606 OID 18792)
-- Name: muon_sach muon_sach_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.muon_sach
    ADD CONSTRAINT muon_sach_pkey PRIMARY KEY (id_muonsach);


--
-- TOC entry 5753 (class 2606 OID 18794)
-- Name: nguoi_dung nguoi_dung_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nguoi_dung
    ADD CONSTRAINT nguoi_dung_email_key UNIQUE (email);


--
-- TOC entry 5755 (class 2606 OID 18796)
-- Name: nguoi_dung nguoi_dung_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nguoi_dung
    ADD CONSTRAINT nguoi_dung_pkey PRIMARY KEY (id_user);


--
-- TOC entry 5757 (class 2606 OID 18798)
-- Name: nguoi_dung nguoi_dung_tai_khoan_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nguoi_dung
    ADD CONSTRAINT nguoi_dung_tai_khoan_key UNIQUE (tai_khoan);


--
-- TOC entry 5798 (class 2606 OID 44482)
-- Name: payment_config payment_config_payment_method_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_config
    ADD CONSTRAINT payment_config_payment_method_key UNIQUE (payment_method);


--
-- TOC entry 5800 (class 2606 OID 44480)
-- Name: payment_config payment_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_config
    ADD CONSTRAINT payment_config_pkey PRIMARY KEY (id_config);


--
-- TOC entry 5759 (class 2606 OID 18800)
-- Name: sach sach_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sach
    ADD CONSTRAINT sach_pkey PRIMARY KEY (id_sach);


--
-- TOC entry 5761 (class 2606 OID 18802)
-- Name: the_loai the_loai_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.the_loai
    ADD CONSTRAINT the_loai_pkey PRIMARY KEY (id_theloai);


--
-- TOC entry 5763 (class 2606 OID 18804)
-- Name: thu_vien thu_vien_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thu_vien
    ADD CONSTRAINT thu_vien_pkey PRIMARY KEY (id_thuvien);


--
-- TOC entry 5769 (class 2606 OID 27953)
-- Name: thu_vien_sach thu_vien_sach_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thu_vien_sach
    ADD CONSTRAINT thu_vien_sach_pkey PRIMARY KEY (id_thuvien, id_sach);


--
-- TOC entry 5785 (class 2606 OID 44397)
-- Name: trang_thai_don_hang trang_thai_don_hang_ma_trang_thai_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trang_thai_don_hang
    ADD CONSTRAINT trang_thai_don_hang_ma_trang_thai_key UNIQUE (ma_trang_thai);


--
-- TOC entry 5787 (class 2606 OID 44395)
-- Name: trang_thai_don_hang trang_thai_don_hang_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trang_thai_don_hang
    ADD CONSTRAINT trang_thai_don_hang_pkey PRIMARY KEY (id_trang_thai);


--
-- TOC entry 5765 (class 2606 OID 18806)
-- Name: vai_tro vai_tro_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vai_tro
    ADD CONSTRAINT vai_tro_pkey PRIMARY KEY (id_vaitro);


--
-- TOC entry 5767 (class 2606 OID 18808)
-- Name: vai_tro vai_tro_ten_vaitro_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vai_tro
    ADD CONSTRAINT vai_tro_ten_vaitro_key UNIQUE (ten_vaitro);


--
-- TOC entry 5782 (class 1259 OID 44384)
-- Name: idx_chi_tiet_don_hang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chi_tiet_don_hang ON public.chi_tiet_don_hang USING btree (id_don_hang);


--
-- TOC entry 5783 (class 1259 OID 44385)
-- Name: idx_chi_tiet_sach; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chi_tiet_sach ON public.chi_tiet_don_hang USING btree (id_sach);


--
-- TOC entry 5772 (class 1259 OID 36137)
-- Name: idx_danh_gia_ngay; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_danh_gia_ngay ON public.danh_gia USING btree (ngay_danh_gia DESC);


--
-- TOC entry 5773 (class 1259 OID 36136)
-- Name: idx_danh_gia_thuvien; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_danh_gia_thuvien ON public.danh_gia USING btree (id_thuvien);


--
-- TOC entry 5774 (class 1259 OID 36138)
-- Name: idx_danh_gia_trangthai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_danh_gia_trangthai ON public.danh_gia USING btree (trang_thai);


--
-- TOC entry 5777 (class 1259 OID 44381)
-- Name: idx_don_hang_khach_hang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_don_hang_khach_hang ON public.don_hang USING btree (id_khach_hang);


--
-- TOC entry 5778 (class 1259 OID 44383)
-- Name: idx_don_hang_ngay_dat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_don_hang_ngay_dat ON public.don_hang USING btree (ngay_dat);


--
-- TOC entry 5779 (class 1259 OID 44382)
-- Name: idx_don_hang_trang_thai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_don_hang_trang_thai ON public.don_hang USING btree (trang_thai);


--
-- TOC entry 5792 (class 1259 OID 44468)
-- Name: idx_khach_hang_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_khach_hang_user ON public.khach_hang USING btree (id_user);


--
-- TOC entry 5788 (class 1259 OID 44413)
-- Name: idx_lich_su_don_hang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lich_su_don_hang ON public.lich_su_don_hang USING btree (id_don_hang);


--
-- TOC entry 5789 (class 1259 OID 44414)
-- Name: idx_lich_su_ngay; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lich_su_ngay ON public.lich_su_don_hang USING btree (ngay_thay_doi);


--
-- TOC entry 5795 (class 1259 OID 44484)
-- Name: idx_payment_config_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_config_active ON public.payment_config USING btree (is_active);


--
-- TOC entry 5796 (class 1259 OID 44483)
-- Name: idx_payment_config_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_config_method ON public.payment_config USING btree (payment_method);


--
-- TOC entry 5817 (class 2620 OID 18809)
-- Name: muon_sach reset_muonsach_ids; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reset_muonsach_ids AFTER INSERT OR DELETE ON public.muon_sach FOR EACH STATEMENT EXECUTE FUNCTION public.update_muonsach_ids();


--
-- TOC entry 5825 (class 2620 OID 18810)
-- Name: the_loai reset_theloai_ids; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reset_theloai_ids AFTER INSERT OR DELETE ON public.the_loai FOR EACH STATEMENT EXECUTE FUNCTION public.update_theloai_ids();


--
-- TOC entry 5822 (class 2620 OID 18811)
-- Name: sach set_slton_on_insert_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_slton_on_insert_trigger BEFORE INSERT ON public.sach FOR EACH ROW EXECUTE FUNCTION public.set_slton_on_insert();


--
-- TOC entry 5827 (class 2620 OID 44416)
-- Name: don_hang trigger_lich_su_don_hang; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_lich_su_don_hang AFTER INSERT OR UPDATE ON public.don_hang FOR EACH ROW EXECUTE FUNCTION public.ghi_lich_su_don_hang();


--
-- TOC entry 5818 (class 2620 OID 18812)
-- Name: muon_sach trigger_update_id_muonsach; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_id_muonsach AFTER DELETE ON public.muon_sach FOR EACH ROW EXECUTE FUNCTION public.update_id_muonsach_after_delete();


--
-- TOC entry 5823 (class 2620 OID 18813)
-- Name: sach trigger_update_id_sach; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_id_sach AFTER DELETE ON public.sach FOR EACH ROW EXECUTE FUNCTION public.update_id_sach_after_delete();


--
-- TOC entry 5826 (class 2620 OID 18814)
-- Name: thu_vien trigger_update_id_thuvien; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_id_thuvien AFTER DELETE ON public.thu_vien FOR EACH ROW EXECUTE FUNCTION public.update_id_thuvien_after_delete();


--
-- TOC entry 5821 (class 2620 OID 18815)
-- Name: nguoi_dung trigger_update_id_user; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_id_user AFTER DELETE ON public.nguoi_dung FOR EACH ROW EXECUTE FUNCTION public.update_id_user_after_delete();


--
-- TOC entry 5819 (class 2620 OID 18816)
-- Name: muon_sach trigger_update_slton; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_slton AFTER INSERT ON public.muon_sach FOR EACH ROW EXECUTE FUNCTION public.update_slton_on_borrow();


--
-- TOC entry 5820 (class 2620 OID 18817)
-- Name: muon_sach trigger_update_slton_on_return; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_slton_on_return AFTER UPDATE ON public.muon_sach FOR EACH ROW EXECUTE FUNCTION public.update_slton_on_return();


--
-- TOC entry 5824 (class 2620 OID 18818)
-- Name: sach update_slton_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_slton_trigger BEFORE UPDATE ON public.sach FOR EACH ROW WHEN ((old.tongsl IS DISTINCT FROM new.tongsl)) EXECUTE FUNCTION public.update_slton_on_tongsl_change();


--
-- TOC entry 5801 (class 2606 OID 18819)
-- Name: binh_luan binh_luan_id_thuvien_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.binh_luan
    ADD CONSTRAINT binh_luan_id_thuvien_fkey FOREIGN KEY (id_thuvien) REFERENCES public.thu_vien(id_thuvien);


--
-- TOC entry 5802 (class 2606 OID 18824)
-- Name: binh_luan binh_luan_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.binh_luan
    ADD CONSTRAINT binh_luan_id_user_fkey FOREIGN KEY (id_user) REFERENCES public.nguoi_dung(id_user);


--
-- TOC entry 5813 (class 2606 OID 44371)
-- Name: chi_tiet_don_hang fk_don_hang; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chi_tiet_don_hang
    ADD CONSTRAINT fk_don_hang FOREIGN KEY (id_don_hang) REFERENCES public.don_hang(id_don_hang) ON DELETE CASCADE;


--
-- TOC entry 5816 (class 2606 OID 44463)
-- Name: khach_hang fk_khach_hang_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.khach_hang
    ADD CONSTRAINT fk_khach_hang_user FOREIGN KEY (id_user) REFERENCES public.nguoi_dung(id_user) ON DELETE SET NULL;


--
-- TOC entry 5815 (class 2606 OID 44408)
-- Name: lich_su_don_hang fk_lich_su_don_hang; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lich_su_don_hang
    ADD CONSTRAINT fk_lich_su_don_hang FOREIGN KEY (id_don_hang) REFERENCES public.don_hang(id_don_hang) ON DELETE CASCADE;


--
-- TOC entry 5804 (class 2606 OID 18839)
-- Name: nguoi_dung fk_nguoi_dung_vaitro; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nguoi_dung
    ADD CONSTRAINT fk_nguoi_dung_vaitro FOREIGN KEY (id_vaitro) REFERENCES public.vai_tro(id_vaitro) ON DELETE SET NULL;


--
-- TOC entry 5811 (class 2606 OID 44485)
-- Name: don_hang fk_payment_config; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.don_hang
    ADD CONSTRAINT fk_payment_config FOREIGN KEY (id_payment_config) REFERENCES public.payment_config(id_config);


--
-- TOC entry 5814 (class 2606 OID 44376)
-- Name: chi_tiet_don_hang fk_sach; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chi_tiet_don_hang
    ADD CONSTRAINT fk_sach FOREIGN KEY (id_sach) REFERENCES public.sach(id_sach) ON DELETE RESTRICT;


--
-- TOC entry 5810 (class 2606 OID 36131)
-- Name: danh_gia fk_thuvien_danhgia; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.danh_gia
    ADD CONSTRAINT fk_thuvien_danhgia FOREIGN KEY (id_thuvien) REFERENCES public.thu_vien(id_thuvien) ON DELETE CASCADE;


--
-- TOC entry 5812 (class 2606 OID 44490)
-- Name: don_hang fk_trang_thai_don_hang; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.don_hang
    ADD CONSTRAINT fk_trang_thai_don_hang FOREIGN KEY (id_trang_thai) REFERENCES public.trang_thai_don_hang(id_trang_thai);


--
-- TOC entry 5803 (class 2606 OID 18844)
-- Name: muon_sach muon_sach_id_sach_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.muon_sach
    ADD CONSTRAINT muon_sach_id_sach_fkey FOREIGN KEY (id_sach) REFERENCES public.sach(id_sach) ON DELETE CASCADE;


--
-- TOC entry 5805 (class 2606 OID 18849)
-- Name: sach sach_id_theloai_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sach
    ADD CONSTRAINT sach_id_theloai_fkey FOREIGN KEY (id_theloai) REFERENCES public.the_loai(id_theloai) ON DELETE CASCADE;


--
-- TOC entry 5806 (class 2606 OID 27942)
-- Name: sach sach_id_thuvien_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sach
    ADD CONSTRAINT sach_id_thuvien_fkey FOREIGN KEY (id_thuvien) REFERENCES public.thu_vien(id_thuvien);


--
-- TOC entry 5807 (class 2606 OID 18854)
-- Name: the_loai the_loai_id_thuvien_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.the_loai
    ADD CONSTRAINT the_loai_id_thuvien_fkey FOREIGN KEY (id_thuvien) REFERENCES public.thu_vien(id_thuvien) ON DELETE CASCADE;


--
-- TOC entry 5808 (class 2606 OID 27959)
-- Name: thu_vien_sach thu_vien_sach_id_sach_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thu_vien_sach
    ADD CONSTRAINT thu_vien_sach_id_sach_fkey FOREIGN KEY (id_sach) REFERENCES public.sach(id_sach);


--
-- TOC entry 5809 (class 2606 OID 27954)
-- Name: thu_vien_sach thu_vien_sach_id_thuvien_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thu_vien_sach
    ADD CONSTRAINT thu_vien_sach_id_thuvien_fkey FOREIGN KEY (id_thuvien) REFERENCES public.thu_vien(id_thuvien);


-- Completed on 2026-03-26 23:20:20

--
-- PostgreSQL database dump complete
--

