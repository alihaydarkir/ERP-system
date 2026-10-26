---
paths:
  - "backend/migrations/**"
  - "backend/scripts/migrate-db.js"
---

# Migration kuralları

- Dosya adı: sıradaki 3 haneli numara + `_snake_case.sql` (ör. `050_...sql`). Runner dosyaları
  ada göre sıralayıp çalıştırır; `schema_migrations` tablosuna yazar, her dosya tek transaction.
- Uygulanmış bir migration'ı **düzenleme**; düzeltme için yeni dosya ekle.
- İdempotent yaz: `IF NOT EXISTS` / `IF EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`.
- Önceki bir numarada henüz oluşmamış tabloya/kolona atıf yapma (022/024'teki fresh-DB hatası).
- Yeni iş tablosu → `company_id` kolonu + index.
- Dosya başına Türkçe 1-3 satır açıklama yorumu (mevcut dosyalar gibi).
- Fresh DB'de dene: migration backend açılışında otomatik çalışır; sonra `npm run seed`.
