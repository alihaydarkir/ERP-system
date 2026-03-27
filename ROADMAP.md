# 🗺️ Piyasaya Çıkış Yol Haritası

> Son güncelleme: 26.03.2026  
> Mevcut durum: **~%86 hazır**  
> Hedef: KOBİ pazarı (küçük-orta işletme) → Ücretli B2B beta → Genel piyasa

### 📌 Son Sprint Özeti
- AI katmanı provider-agnostic hale getirildi (`AI_PROVIDER=ollama/openai/azure`)
- Yüksek riskli AI mutasyonlarında human-in-the-loop onay akışı aktifleştirildi
- `approval_requests` tablosu + onay/execute/reject lifecycle tamamlandı
- WebSocket ile onay bildirimleri (approver + requester) devreye alındı
- Docker tarafında PostgreSQL günlük backup + retention (7 gün) eklendi
- Nginx tarafında HTTP → HTTPS redirect zorunlu hale getirildi
- Backend test kapsamı genişletildi (kritik approval akışlarında 21/21 passing)

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
- [x] Günlük `pg_dump` yedeği (docker `postgres_backup` servisi)
- [ ] Cloud storage: S3 veya Backblaze B2'ye yükle
- [ ] 30 günlük saklama + eski yedekleri otomatik sil (şu an 7 gün retention aktif)
- [ ] Yedek alındığında email bildirimi

---

## 🟡 Önemli (Market Öncesi Yapılmalı)

- [ ] Mobile uyumluluk testi (tüm sayfalar)
- [ ] Yük testi — kaç eşzamanlı kullanıcı taşır?
- [ ] Kullanıcı onboarding akışı (ilk girişte ne görsün?)
- [ ] Yardım / Dokümantasyon sayfası
- [ ] Kalan route'lar için Swagger JSDoc (customers, suppliers, warehouses, cheques)
- [ ] AI model stratejisi (şu an provider altyapısı hazır: Ollama/OpenAI/Azure)

---

## ✅ Tamamlananlar

- [x] Core modüller: Ürün, Sipariş, Fatura, Müşteri, Tedarikçi, Depo, Çek
- [x] Auth (JWT + 2FA tabloları)
- [x] Multi-tenancy (company_id)
- [x] Dashboard (tek API çağrısı ile)
- [x] AI-ready altyapı (Swagger, /health, /capabilities)
- [x] AI Gateway soyutlama katmanı (Ollama/OpenAI/Azure provider seçimi)
- [x] AI high-risk mutasyonlar için human approval flow (`approval_requests`)
- [x] AI approval event’leri için WebSocket bildirim altyapısı
- [x] Docker + CI/CD pipeline
- [x] Docker compose ile PostgreSQL otomatik günlük backup (7 gün retention, ayrı volume)
- [x] Nginx zorunlu HTTP → HTTPS redirect + aktif SSL server bloğu
- [x] Rate limiting, CORS, Helmet güvenliği
- [x] OpenAPI dokümantasyonu (16 endpoint)
- [x] Kritik AI approval akışları için test kapsamı genişletildi (service + controller + websocket)
