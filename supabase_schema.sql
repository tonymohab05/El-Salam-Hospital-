-- ====================================================================
-- MASHFA EL SALAM ER SYSTEM - FULL SUPABASE SQL SCHEMA & PERMISSIVE RLS
-- ====================================================================
-- Copy and paste this script directly into your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql

-- 0. Enable UUID Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. CATEGORIES TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 2. SUPPLIERS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    contact_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 3. MEDICAL ITEMS (INVENTORY) TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medical_items (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    category_id INT4 REFERENCES categories(id) ON DELETE SET NULL,
    stock INT4 NOT NULL DEFAULT 0,
    safety_threshold INT4 NOT NULL DEFAULT 10,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 4. PATIENT INVOICES TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    grand_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    billing_officer_account TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 5. PATIENT INVOICE LINES TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES patient_invoices(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES medical_items(id) ON DELETE SET NULL,
    item_name_ar TEXT,
    item_name_en TEXT,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    quantity INT4 NOT NULL DEFAULT 1,
    line_total NUMERIC(10, 2) NOT NULL DEFAULT 0
);

-- --------------------------------------------------------------------
-- 6. RESTOCK INVOICES TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS restock_invoices (
    id TEXT PRIMARY KEY,
    supplier TEXT NOT NULL,
    officer TEXT NOT NULL,
    notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 7. RESTOCK INVOICE ITEMS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS restock_invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id TEXT REFERENCES restock_invoices(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES medical_items(id) ON DELETE CASCADE,
    quantity_added INT4 NOT NULL DEFAULT 0,
    expiry_date DATE
);

-- --------------------------------------------------------------------
-- 8. APP USERS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'RECEPTION', -- 'SUPER_ADMIN' or 'RECEPTION'
    full_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (PERMISSIVE FOR ANON & AUTHENTICATED)
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Grant permissions to public/anon roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "categories_policy" ON categories;
DROP POLICY IF EXISTS "suppliers_policy" ON suppliers;
DROP POLICY IF EXISTS "medical_items_policy" ON medical_items;
DROP POLICY IF EXISTS "patient_invoices_policy" ON patient_invoices;
DROP POLICY IF EXISTS "patient_invoice_lines_policy" ON patient_invoice_lines;
DROP POLICY IF EXISTS "restock_invoices_policy" ON restock_invoices;
DROP POLICY IF EXISTS "restock_invoice_items_policy" ON restock_invoice_items;
DROP POLICY IF EXISTS "app_users_policy" ON app_users;

-- Create ALL-access policies for anon and authenticated users
CREATE POLICY "categories_policy" ON categories FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "suppliers_policy" ON suppliers FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "medical_items_policy" ON medical_items FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "patient_invoices_policy" ON patient_invoices FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "patient_invoice_lines_policy" ON patient_invoice_lines FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "restock_invoices_policy" ON restock_invoices FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "restock_invoice_items_policy" ON restock_invoice_items FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "app_users_policy" ON app_users FOR ALL TO public USING (true) WITH CHECK (true);


-- ====================================================================
-- SEED DATA 1: CATEGORIES
-- ====================================================================
INSERT INTO categories (id, name_ar, name_en) VALUES
(1, 'مستهلكات وريدية', 'IV Consumables'),
(2, 'محاليل وريدية', 'IV Fluids'),
(3, 'حقن وسرنجات', 'Syringes'),
(4, 'قساطر وأنابيب', 'Catheters & Tubes'),
(5, 'مضادات للنزيف وجروح', 'Gauze & Bandages'),
(6, 'معدات طبية شخصية', 'Personal Protective'),
(7, 'علاج بالغازات والأكسجين', 'Oxygen Therapy'),
(8, 'أدوية وحقن طوارئ', 'Emergency Drugs'),
(9, 'محل أجهزة ومحركات', 'Fluids & Motors')
ON CONFLICT (id) DO UPDATE 
SET name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en;

SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));


-- ====================================================================
-- SEED DATA 2: SUPPLIERS
-- ====================================================================
INSERT INTO suppliers (id, name_ar, name_en, contact_phone) VALUES
(1, 'شركة النصر للمستلزمات الطبية', 'Al Nasr Medical Supplies Co.', '01001234567'),
(2, 'الشركة المصرية للأدوية والمحاليل', 'Egyptian Pharma & Fluids Co.', '01123456789'),
(3, 'شركة الأمل للأجهزة والغازات الطبية', 'Al Amal Medical Gas & Devices', '01234567890')
ON CONFLICT (id) DO UPDATE 
SET name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en;

SELECT setval('suppliers_id_seq', (SELECT MAX(id) FROM suppliers));


-- ====================================================================
-- SEED DATA 3: DEFAULT USERS
-- ====================================================================
INSERT INTO app_users (username, password, role, full_name, is_active) VALUES
('admin', 'admin123', 'SUPER_ADMIN', 'مدير النظام الأعلى (Admin)', TRUE),
('reception', 'reception123', 'RECEPTION', 'مسؤول الاستقبال والطوارئ', TRUE)
ON CONFLICT (username) DO UPDATE 
SET password = EXCLUDED.password, role = EXCLUDED.role, full_name = EXCLUDED.full_name;


-- ====================================================================
-- SEED DATA 4: INITIAL MEDICAL ITEMS INVENTORY
-- ====================================================================
INSERT INTO medical_items (id, name_ar, name_en, unit_price, category_id, stock, safety_threshold, expiry_date) VALUES
('med_001', 'كانيولا وريدية مقاس 18 (خضراء)', 'IV Cannula 18G (Green)', 35.00, 1, 55, 10, '2027-12-31'),
('med_002', 'كانيولا وريدية مقاس 20 (وردية)', 'IV Cannula 20G (Pink)', 30.00, 1, 40, 10, '2027-12-31'),
('med_003', 'كانيولا وريدية مقاس 22 (زرقاء)', 'IV Cannula 22G (Blue)', 30.00, 1, 30, 10, '2027-12-31'),
('med_004', 'محلول ملح فسيولوجي 0.9% (500 مل)', 'Normal Saline 0.9% (500ml)', 45.00, 2, 120, 15, '2028-06-30'),
('med_005', 'محلول رينجر لاكتات (500 مل)', 'Ringer''s Lactate Solution (500ml)', 55.00, 2, 85, 15, '2028-06-30'),
('med_006', 'محلول جلوكوز 5% (500 مل)', 'Glucose 5% Solution (500ml)', 40.00, 2, 90, 15, '2028-06-30'),
('med_007', 'سرنجة معقمة 3 سم', 'Sterile Syringe 3ml', 6.00, 3, 300, 20, '2029-01-01'),
('med_008', 'سرنجة معقمة 5 سم', 'Sterile Syringe 5ml', 8.00, 3, 250, 20, '2029-01-01'),
('med_009', 'سرنجة معقمة 10 سم', 'Sterile Syringe 10ml', 12.00, 3, 150, 20, '2029-01-01'),
('med_010', 'جهاز إعطاء محاليل بالفلاتر', 'IV Infusion Set with Filter', 25.00, 1, 110, 15, '2028-12-31'),
('med_011', 'قسطرة بولية معقمة (فولي - مقاس 16)', 'Foley Urinary Catheter (12Fr-16Fr)', 75.00, 4, 45, 10, '2027-10-31'),
('med_012', 'كيس جمع بول معقم 2 لتر', 'Urinary Drainage Bag 2L', 35.00, 4, 70, 10, '2027-10-31'),
('med_013', 'رابط شاش معقم (10 سم * 4 م)', 'Sterile Gauze Bandage (10cm * 4m)', 15.00, 5, 180, 25, '2029-05-31'),
('med_014', 'رابط ضاغط للكسور (مقاس 10 سم)', 'Elastic Crepe Bandage (10cm)', 45.00, 5, 120, 15, '2029-05-31'),
('med_015', 'بلاستر حريري جراحي (متوسط)', 'Surgical Silk Tape (Medium)', 20.00, 5, 95, 15, '2029-05-31'),
('med_016', 'قفازات جراحية معقمة (زوج)', 'Pair of Sterile Surgical Gloves', 22.00, 6, 400, 30, '2028-08-31'),
('med_017', 'ماسك أكسجين للكبار بالخرطوم', 'Oxygen Therapy Mask (Adult)', 50.00, 7, 65, 10, '2028-03-31'),
('med_018', 'أمبول مسكن قوي (ديكلوفيناك الصوديوم)', 'Diclofenac Sodium Ampoule (Analgesic)', 18.00, 8, 140, 20, '2027-09-30'),
('med_019', 'فيال مضاد حيوي سيفوتراكسون 1 جم', 'Ceftriaxone 1g Injection (Antibiotic)', 65.00, 8, 115, 20, '2027-09-30'),
('med_020', 'أنبوبة حنجرية معقمة مقاس 7.5', 'Endotracheal Tube Sterile Size 7.5', 110.00, 7, 25, 5, '2028-03-31')
ON CONFLICT (id) DO UPDATE 
SET name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    unit_price = EXCLUDED.unit_price,
    category_id = EXCLUDED.category_id,
    stock = EXCLUDED.stock,
    safety_threshold = EXCLUDED.safety_threshold,
    expiry_date = EXCLUDED.expiry_date;
