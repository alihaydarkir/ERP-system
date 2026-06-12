DELETE FROM warehouses WHERE company_id = 1;

INSERT INTO warehouses (company_id, warehouse_name, warehouse_code, location, city, manager_name, phone, capacity, current_stock_level, is_active) VALUES
(1, 'Ana Depo Istanbul',   'WH-IST-01', 'Beylikduzu OSB',      'Istanbul',   'Kadir Yilmaz', '0212 555 1001', 5000, 3420, true),
(1, 'Bursa Tekstil Depo',  'WH-BRS-01', 'Nilufer Organize',    'Bursa',      'Serap Kaya',   '0224 555 2002', 2000,  890, true),
(1, 'Ankara Merkez Depo',  'WH-ANK-01', 'Ostim OSB Blok 4',    'Ankara',     'Murat Demir',  '0312 555 3003', 3000, 1750, true),
(1, 'Izmir Liman Deposu',  'WH-IZM-01', 'Alsancak Liman',      'Izmir',      'Deniz Sahin',  '0232 555 4004', 1500,  440, false);

SELECT warehouse_name, warehouse_code, city, capacity, current_stock_level, is_active FROM warehouses WHERE company_id=1 ORDER BY id;
