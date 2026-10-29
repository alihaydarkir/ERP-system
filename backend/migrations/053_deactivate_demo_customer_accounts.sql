-- 042 her kurulumda company 1'e iki "onaylı" demo müşteri hesabı ekliyordu. Hesaplar üretim
-- kurulumlarında bulunmamalı: hiç giriş yapmamışsa pasifleştir (silmez; müşteri kayıtları korunur).
UPDATE users
   SET is_active = false
 WHERE email IN ('ahmet@yilmazinsaat.com', 'fatma@kayatekstil.com')
   AND role = 'customer'
   AND last_login IS NULL;
