-- ============================================================
-- ERP Demo Data Seed Script — Company 1 (admin user)
-- Tarih referansı: 2026-06-07
-- ============================================================

BEGIN;

-- ── 1. Mevcut verileri temizle (FK sırasına göre) ────────────
DELETE FROM cheque_transactions WHERE cheque_id IN (SELECT id FROM cheques WHERE company_id = 1);
DELETE FROM cheques WHERE company_id = 1;
DELETE FROM invoices WHERE company_id = 1;
DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE company_id = 1);
DELETE FROM orders WHERE company_id = 1;
DELETE FROM ai_agent_approvals WHERE company_id = 1;
DELETE FROM products WHERE company_id = 1;
DELETE FROM customers WHERE company_id = 1 AND user_id = 1;

-- ── 2. Müşteriler (8 adet) ───────────────────────────────────
INSERT INTO customers (user_id, company_id, full_name, company_name, tax_office, tax_number, phone_number, company_location) VALUES
(1, 1, 'Ahmet Yılmaz',    'Yılmaz İnşaat A.Ş.',       'Kadıköy VD',    '1234567801', '0532 111 2233', 'İstanbul'),
(1, 1, 'Fatma Kaya',      'Kaya Tekstil Ltd. Şti.',    'Nilüfer VD',    '2345678902', '0542 222 3344', 'Bursa'),
(1, 1, 'Mehmet Demir',    'Demir Otomotiv San. Tic.',  'Çankaya VD',    '3456789003', '0553 333 4455', 'Ankara'),
(1, 1, 'Ayşe Şahin',     'Şahin Market Zinciri',      'Bornova VD',    '4567890104', '0564 444 5566', 'İzmir'),
(1, 1, 'Mustafa Öztürk', 'Öztürk Elektrik A.Ş.',      'Şahinbey VD',   '5678901205', '0505 555 6677', 'Gaziantep'),
(1, 1, 'Zeynep Arslan',  'Arslan Gıda San. Tic. A.Ş.','Gebze VD',      '6789012306', '0543 666 7788', 'Kocaeli'),
(1, 1, 'İbrahim Çelik', 'Çelik Makine İmalat Ltd.',   'Selçuklu VD',   '7890123407', '0534 777 8899', 'Konya'),
(1, 1, 'Hatice Yıldız',  'Yıldız Lojistik A.Ş.',      'Ortahisar VD',  '8901234508', '0555 888 9900', 'Trabzon');

-- ── 3. Ürünler (15 adet) ─────────────────────────────────────
-- NOT: low_stock_threshold = stok uyarı eşiği
-- Bazıları düşük stoklu (chatbot testi için)
INSERT INTO products (company_id, name, description, sku, category, price, stock_quantity, low_stock_threshold, reorder_level, is_active) VALUES
-- Elektronik
(1, 'Laptop HP ProBook 450', '15.6" FHD, i5-12. nesil, 8GB RAM, 256GB SSD', 'ELK-LP-001', 'Elektronik', 18500.00, 3,  10, 10, true),  -- DÜŞÜK STOK
(1, 'iPhone 15 Pro 128GB',   'A17 Pro çip, titanyum gövde, 3x optik zoom',   'ELK-PH-002', 'Elektronik', 54900.00, 7,  10, 10, true),  -- DÜŞÜK STOK
(1, 'Samsung 4K TV 55"',     '55 inç UHD OLED, Tizen OS, 120Hz',             'ELK-TV-003', 'Elektronik', 22750.00, 25, 10, 10, true),
(1, 'Yazıcı Canon i-SENSYS', 'A4 lazer, dubleks baskı, WiFi',                'ELK-PR-004', 'Elektronik',  3200.00, 12, 10, 10, true),

-- Tekstil
(1, 'Pamuklu Kumaş 100m',    'Yüzde yüz pamuk, beyaz, 150cm en',             'TKS-KM-001', 'Tekstil',     850.00,  4,  20, 20, true),  -- DÜŞÜK STOK
(1, 'Denim Kot Kumaş 50m',   'İndigo boyalı, stretch, 160cm en',             'TKS-DN-002', 'Tekstil',    1250.00, 30, 20, 20, true),
(1, 'Viskon Elbiselik 80m',  'Hafif dökümlü, çiçek desenli',                 'TKS-VS-003', 'Tekstil',     680.00, 45, 20, 20, true),

-- İnşaat Malzemesi
(1, 'Çimento 50kg (Palet)',  'Portland çimento CEM I 42.5R, 40 torba/palet', 'INS-CM-001', 'İnşaat',      420.00,  8,  50, 50, true),  -- DÜŞÜK STOK
(1, 'Demir Profil 6m IPE 80','S235 çelik, galvanizli yüzey',                 'INS-DP-002', 'İnşaat',      185.00, 120, 50, 50, true),
(1, 'Seramik 60x60 Kutu',   'Mat beyaz, 1.44m2/kutu, donmaya dayanıklı',    'INS-SR-003', 'İnşaat',      210.00, 200, 50, 50, true),

-- Gıda (Toptan)
(1, 'Un 50kg Çuval (A Kalite)', 'Ekmeklik tip 550 un, hijyenik ambalaj',      'GDA-UN-001', 'Gıda',        650.00, 80, 30, 30, true),
(1, 'Ayçiçek Yağı 5lt Bidon',  'Rafine, 0.1mg/kg E-vitamini takviyeli',       'GDA-YG-002', 'Gıda',        195.00, 60, 30, 30, true),
(1, 'Şeker 25kg Çuval',        'Kristal beyaz şeker, standart saflık',         'GDA-SK-003', 'Gıda',        480.00, 5,  30, 30, true),  -- DÜŞÜK STOK

-- Makine / Ekipman
(1, 'Kaynak Makinesi MIG 200', 'MIG/MAG, 200A, dijital panel, taşınabilir',   'MKN-KY-001', 'Makine',     4800.00, 6,  10, 10, true),  -- DÜŞÜK STOK
(1, 'Kompresör 50lt 2HP',      '8 bar, yağlı, dikey tank, 230V',               'MKN-KP-002', 'Makine',     2950.00, 18, 10, 10, true);

-- ── 4. Siparişler (15 adet) ──────────────────────────────────
-- Müşteri ID'leri: CURRVAL ile alınan son insert'ten sonra sorgulanacak
-- Müşteri sıraları: Yılmaz=1, Kaya=2, Demir=3, Şahin=4, Öztürk=5, Arslan=6, Çelik=7, Yıldız=8 (company 1'in ilk müşterileri)

DO $$
DECLARE
  c1 INT; c2 INT; c3 INT; c4 INT; c5 INT; c6 INT; c7 INT; c8 INT;
BEGIN
  SELECT id INTO c1 FROM customers WHERE company_id=1 AND full_name='Ahmet Yılmaz' LIMIT 1;
  SELECT id INTO c2 FROM customers WHERE company_id=1 AND full_name='Fatma Kaya' LIMIT 1;
  SELECT id INTO c3 FROM customers WHERE company_id=1 AND full_name='Mehmet Demir' LIMIT 1;
  SELECT id INTO c4 FROM customers WHERE company_id=1 AND full_name='Ayşe Şahin' LIMIT 1;
  SELECT id INTO c5 FROM customers WHERE company_id=1 AND full_name='Mustafa Öztürk' LIMIT 1;
  SELECT id INTO c6 FROM customers WHERE company_id=1 AND full_name='Zeynep Arslan' LIMIT 1;
  SELECT id INTO c7 FROM customers WHERE company_id=1 AND full_name='İbrahim Çelik' LIMIT 1;
  SELECT id INTO c8 FROM customers WHERE company_id=1 AND full_name='Hatice Yıldız' LIMIT 1;

  -- BEKLEYEN (pending) — 5 adet, Haziran 2026
  INSERT INTO orders (user_id, company_id, customer_id, order_number, status, total_amount, items, created_at) VALUES
  (1, 1, c1, 'ORD-2026-001', 'pending',    37000.00, '[{"product":"Laptop HP ProBook 450","qty":2,"price":18500}]',              '2026-06-01 09:15:00'),
  (1, 1, c4, 'ORD-2026-002', 'pending',     8400.00, '[{"product":"Pamuklu Kumaş 100m","qty":6,"price":850},{"product":"Şeker 25kg Çuval","qty":4,"price":480}]', '2026-06-03 11:30:00'),
  (1, 1, c6, 'ORD-2026-003', 'pending',    19500.00, '[{"product":"Un 50kg Çuval","qty":20,"price":650},{"product":"Ayçiçek Yağı 5lt","qty":25,"price":195}]',     '2026-06-05 14:00:00'),
  (1, 1, c7, 'ORD-2026-004', 'pending',    19200.00, '[{"product":"Kaynak Makinesi MIG 200","qty":4,"price":4800}]',             '2026-06-06 10:00:00'),
  (1, 1, c3, 'ORD-2026-005', 'pending',    54900.00, '[{"product":"iPhone 15 Pro 128GB","qty":1,"price":54900}]',               '2026-06-07 08:45:00'),

  -- İŞLEMDE (processing) — 3 adet, Mayıs-Haziran 2026
  (1, 1, c2, 'ORD-2026-006', 'processing', 25000.00, '[{"product":"Denim Kot Kumaş 50m","qty":20,"price":1250}]',               '2026-05-28 13:00:00'),
  (1, 1, c5, 'ORD-2026-007', 'processing', 15450.00, '[{"product":"Demir Profil 6m IPE 80","qty":50,"price":185},{"product":"Çimento 50kg (Palet)","qty":10,"price":420}]', '2026-06-02 10:30:00'),
  (1, 1, c8, 'ORD-2026-008', 'processing', 22750.00, '[{"product":"Samsung 4K TV 55\"","qty":1,"price":22750}]',                '2026-06-04 16:00:00'),

  -- TAMAMLANDI (completed) — 5 adet, Nisan-Mayıs 2026
  (1, 1, c1, 'ORD-2026-009', 'completed',  42000.00, '[{"product":"Seramik 60x60 Kutu","qty":200,"price":210}]',                '2026-04-10 09:00:00'),
  (1, 1, c3, 'ORD-2026-010', 'completed',  16000.00, '[{"product":"Yazıcı Canon i-SENSYS","qty":5,"price":3200}]',              '2026-04-18 11:00:00'),
  (1, 1, c6, 'ORD-2026-011', 'completed',  52000.00, '[{"product":"Un 50kg Çuval","qty":80,"price":650}]',                      '2026-05-05 08:00:00'),
  (1, 1, c4, 'ORD-2026-012', 'completed',  44250.00, '[{"product":"Viskon Elbiselik 80m","qty":65,"price":680}]',               '2026-05-15 14:30:00'),
  (1, 1, c2, 'ORD-2026-013', 'completed',  28750.00, '[{"product":"Kompresör 50lt 2HP","qty":7,"price":2950},{"product":"Kaynak Makinesi MIG 200","qty":2,"price":4800}]', '2026-05-22 10:00:00'),

  -- İPTAL (cancelled) — 2 adet
  (1, 1, c5, 'ORD-2026-014', 'cancelled',   9750.00, '[{"product":"Çimento 50kg (Palet)","qty":15,"price":420},{"product":"Demir Profil 6m IPE 80","qty":15,"price":185}]', '2026-05-10 11:00:00'),
  (1, 1, c7, 'ORD-2026-015', 'cancelled',  54900.00, '[{"product":"iPhone 15 Pro 128GB","qty":1,"price":54900}]',               '2026-05-20 09:00:00');

  -- completed_at güncelle
  UPDATE orders SET completed_at = created_at + INTERVAL '2 days' WHERE company_id=1 AND status='completed';

  -- ── 5. Çekler (15 adet) ──────────────────────────────────────
  -- Geçerli statüler: 'pending', 'paid', 'cancelled', 'beklemede', 'teminat', vs.
  -- VADESİ GEÇMİŞ = pending + due_date < bugün

  INSERT INTO cheques (user_id, company_id, customer_id, check_serial_no, check_issuer, bank_name, received_date, due_date, amount, currency, status, notes) VALUES
  -- Vadesi GEÇMİŞ (overdue) — 4 adet (pending, due_date < 2026-06-07)
  (1, 1, c1, 'CHK-2026-001', 'Ahmet Yılmaz',   'Ziraat Bankası',   '2026-03-01', '2026-04-30', 37000.00, 'TRY', 'pending', 'ORD-2026-009 karşılığı çek — VADESİ GEÇTİ'),
  (1, 1, c3, 'CHK-2026-002', 'Mehmet Demir',   'İş Bankası',       '2026-03-15', '2026-05-15', 16000.00, 'TRY', 'pending', 'ORD-2026-010 karşılığı — VADESİ GEÇTİ'),
  (1, 1, c6, 'CHK-2026-003', 'Zeynep Arslan',  'Garanti BBVA',     '2026-04-01', '2026-05-31', 26000.00, 'TRY', 'pending', 'ORD-2026-011 1. taksit — VADESİ GEÇTİ'),
  (1, 1, c2, 'CHK-2026-004', 'Fatma Kaya',     'Yapı Kredi',       '2026-04-10', '2026-06-01', 14375.00, 'TRY', 'pending', 'ORD-2026-013 1. taksit — VADESİ GEÇTİ'),

  -- YAKLAŞAN VADELİ (pending, due_date > bugün) — 5 adet
  (1, 1, c1, 'CHK-2026-005', 'Ahmet Yılmaz',   'Ziraat Bankası',   '2026-06-01', '2026-07-15', 37000.00, 'TRY', 'pending', 'ORD-2026-001 avansı'),
  (1, 1, c4, 'CHK-2026-006', 'Ayşe Şahin',     'Akbank',           '2026-06-03', '2026-07-30', 8400.00,  'TRY', 'pending', 'ORD-2026-002 kapanış çeki'),
  (1, 1, c7, 'CHK-2026-007', 'İbrahim Çelik',  'Halkbank',         '2026-06-05', '2026-08-05', 9600.00,  'TRY', 'pending', 'ORD-2026-004 1. taksit'),
  (1, 1, c5, 'CHK-2026-008', 'Mustafa Öztürk', 'Denizbank',        '2026-06-06', '2026-08-31', 7725.00,  'TRY', 'pending', 'ORD-2026-007 peşinat çeki'),
  (1, 1, c6, 'CHK-2026-009', 'Zeynep Arslan',  'Garanti BBVA',     '2026-06-07', '2026-09-15', 26000.00, 'TRY', 'pending', 'ORD-2026-011 2. taksit'),

  -- TAHSİL EDİLDİ (paid) — 4 adet
  (1, 1, c1, 'CHK-2026-010', 'Ahmet Yılmaz',   'Ziraat Bankası',   '2026-01-10', '2026-03-10', 42000.00, 'TRY', 'paid',    'ORD-2026-009 tamamı — tahsil edildi'),
  (1, 1, c3, 'CHK-2026-011', 'Mehmet Demir',   'İş Bankası',       '2026-02-01', '2026-04-01', 8000.00,  'TRY', 'paid',    'ORD-2026-010 1. taksit — tahsil edildi'),
  (1, 1, c6, 'CHK-2026-012', 'Zeynep Arslan',  'Garanti BBVA',     '2026-02-15', '2026-04-15', 26000.00, 'TRY', 'paid',    'ORD-2026-011 avans — tahsil edildi'),
  (1, 1, c4, 'CHK-2026-013', 'Ayşe Şahin',     'Akbank',           '2026-03-01', '2026-05-01', 22125.00, 'TRY', 'paid',    'ORD-2026-012 tamamı — tahsil edildi'),

  -- İPTAL / KARŞILIKSIZ — 2 adet
  (1, 1, c5, 'CHK-2026-014', 'Mustafa Öztürk', 'Denizbank',        '2026-03-20', '2026-05-20', 9750.00,  'TRY', 'cancelled','ORD-2026-014 iptal — sipariş iptaliyle birlikte'),
  (1, 1, c2, 'CHK-2026-015', 'Fatma Kaya',     'Yapı Kredi',       '2026-04-05', '2026-06-05', 14375.00, 'TRY', 'cancelled','Müşteri talebiyle iptal edildi');

END $$;

COMMIT;

-- ── Özet rapor ───────────────────────────────────────────────
SELECT 'ÖZET' as tablo, '' as detay
UNION ALL SELECT 'Müşteriler', COUNT(*)::text FROM customers WHERE company_id=1
UNION ALL SELECT 'Ürünler', COUNT(*)::text FROM products WHERE company_id=1
UNION ALL SELECT 'Siparişler (toplam)', COUNT(*)::text FROM orders WHERE company_id=1
UNION ALL SELECT '  → pending', COUNT(*)::text FROM orders WHERE company_id=1 AND status='pending'
UNION ALL SELECT '  → processing', COUNT(*)::text FROM orders WHERE company_id=1 AND status='processing'
UNION ALL SELECT '  → completed', COUNT(*)::text FROM orders WHERE company_id=1 AND status='completed'
UNION ALL SELECT '  → cancelled', COUNT(*)::text FROM orders WHERE company_id=1 AND status='cancelled'
UNION ALL SELECT 'Çekler (toplam)', COUNT(*)::text FROM cheques WHERE company_id=1
UNION ALL SELECT '  → pending (vadesi geçmiş)', COUNT(*)::text FROM cheques WHERE company_id=1 AND status='pending' AND due_date < CURRENT_DATE
UNION ALL SELECT '  → pending (yaklaşan)', COUNT(*)::text FROM cheques WHERE company_id=1 AND status='pending' AND due_date >= CURRENT_DATE
UNION ALL SELECT '  → paid', COUNT(*)::text FROM cheques WHERE company_id=1 AND status='paid'
UNION ALL SELECT '  → cancelled', COUNT(*)::text FROM cheques WHERE company_id=1 AND status='cancelled'
UNION ALL SELECT 'Düşük Stok Ürünler', COUNT(*)::text FROM products WHERE company_id=1 AND stock_quantity <= low_stock_threshold AND is_active=true;
