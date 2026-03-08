# 🗺️ Piyasaya Çıkış Yol Haritası

> Mevcut durum: ~%55-60 hazır  
> Hedef: KOBİ pazarı (küçük-orta işletme) → Ücretli B2B beta → Genel piyasa

---

## 💰 Fiyatlandırma Modeli

| Plan | Fiyat | Kitle |
|---|---|---|
| Starter (Bulut) | 399₺/ay | Küçük işletme (1-5 kullanıcı) |
| Professional (Bulut) | 799₺/ay | Orta işletme (5-20 kullanıcı) |
| Kurumsal Lisans | 12.000₺ tek seferlik + 2.500₺/yıl bakım | Tek seferlik satın almak isteyen KOBİ |

**Strateji:** İki model aynı anda sunulacak. KOBİ'ler genelde tek seferlik lisansı tercih eder ama aylık seçenek de açık kalacak.

---

## 🔴 Kritik Eksiklikler (Bunlar Olmadan Yayınlanmaz)

### 1. 🔑 Şifre Sıfırlama
- [ ] Backend: `POST /api/auth/forgot-password` → token üret + email gönder
- [ ] Backend: `POST /api/auth/reset-password` → token doğrula + şifre güncelle
- [ ] Frontend: "Şifremi Unuttum" sayfası
- [ ] Frontend: "Yeni Şifre Belirle" sayfası (token ile)

### 2. 📧 Email Doğrulama (Kayıt Sonrası)
- [ ] Backend: Kayıtta `is_verified = false` + doğrulama emaili gönder
- [ ] Backend: `GET /api/auth/verify-email/:token` endpoint
- [ ] Backend: Doğrulanmamış hesabı login'de engelle
- [ ] Frontend: "Email adresinizi doğrulayın" uyarı sayfası

### 3. 💳 Abonelik / Ödeme Sistemi
- [ ] Stripe entegrasyonu (veya iyzico — Türkiye için daha uygun)
- [ ] Plan tablosu: Starter / Pro / Enterprise
- [ ] Backend: webhook ile ödeme durumu güncelleme
- [ ] Frontend: Fiyatlandırma sayfası
- [ ] Frontend: Abonelik yönetim paneli

### 4. 📊 Hata Takibi & Monitoring
- [ ] Sentry hesabı aç (ücretsiz plan yeterli)
- [ ] Backend: `@sentry/node` entegrasyonu
- [ ] Frontend: `@sentry/react` entegrasyonu
- [ ] Uptime monitoring (UptimeRobot — ücretsiz)

### 5. 🛡️ KVKK Uyumu (Türkiye Zorunlu)
- [ ] Frontend: Gizlilik Politikası sayfası
- [ ] Frontend: Kullanım Şartları sayfası
- [ ] Frontend: Çerez onay banner'ı
- [ ] Backend: `DELETE /api/users/me/data` — kullanıcı verilerini sil
- [ ] Backend: `GET /api/users/me/export` — verileri indir (JSON)

### 6. 🗄️ Otomatik Veritabanı Yedekleme
- [ ] Cron job: Her gece `pg_dump` çalıştır
- [ ] Cloud storage: S3 veya Backblaze B2'ye yükle
- [ ] 30 günlük saklama + eski yedekleri otomatik sil
- [ ] Yedek alındığında email bildirimi

---

## 🟡 Önemli (Market Öncesi Yapılmalı)

- [ ] Mobile uyumluluk testi (tüm sayfalar)
- [ ] Yük testi — kaç eşzamanlı kullanıcı taşır?
- [ ] Kullanıcı onboarding akışı (ilk girişte ne görsün?)
- [ ] Yardım / Dokümantasyon sayfası
- [ ] Kalan route'lar için Swagger JSDoc (customers, suppliers, warehouses, cheques)
- [ ] AI model seçimi (Ollama qwen2.5 upgrade veya Hybrid OpenAI)

---

## ✅ Tamamlananlar

- [x] Core modüller: Ürün, Sipariş, Fatura, Müşteri, Tedarikçi, Depo, Çek
- [x] Auth (JWT + 2FA tabloları)
- [x] Multi-tenancy (company_id)
- [x] Dashboard (tek API çağrısı ile)
- [x] AI-ready altyapı (Swagger, /health, /capabilities)
- [x] Docker + CI/CD pipeline
- [x] Rate limiting, CORS, Helmet güvenliği
- [x] OpenAPI dokümantasyonu (16 endpoint)
