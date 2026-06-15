# ERP Sistemi — Teknik Sunum Belgesi

> Bu belge, projenin mimarisini, teknoloji tercihlerini ve iş modüllerini
> sunum sırasında "neyi neden kullandık?" sorularına yanıt verebilecek
> şekilde açıklamak için hazırlanmıştır.

---

## İçindekiler

1. [Proje Özeti](#1-proje-özeti)
2. [Altyapı & Teknoloji Seçimleri](#2-altyapı--teknoloji-seçimleri)
3. [Backend Mimarisi](#3-backend-mimarisi)
4. [Güvenlik Katmanları](#4-güvenlik-katmanları)
5. [AI / Chatbot Sistemi](#5-ai--chatbot-sistemi)
6. [İş Modülleri](#6-iş-modülleri)
7. [Frontend Mimarisi](#7-frontend-mimarisi)
8. [Gerçek Zamanlı Özellikler](#8-gerçek-zamanlı-özellikler)
9. [Raporlama & Export](#9-raporlama--export)
10. [CI/CD & Deployment](#10-cicd--deployment)
11. [Test Stratejisi](#11-test-stratejisi)
12. [Sık Sorulan Sorular](#12-sık-sorulan-sorular)

---

## 1. Proje Özeti

### Ne Yapar?

Çok kiracılı (multi-tenant) bir **Kurumsal Kaynak Planlama (ERP) sistemi**dir.
Küçük-orta ölçekli işletmelerin aşağıdaki süreçlerini tek platformda yönetmesini sağlar:

- Ürün katalogu & stok yönetimi
- Sipariş & sevkiyat takibi
- Müşteri & tedarikçi ilişkileri
- Fatura & ödeme yönetimi (çek + banka havalesi)
- Finansal raporlama & cari hesap
- **AI destekli chatbot** (Türkçe doğal dil ile sorgu ve işlem)

### Multi-Tenant Neden?

Her işletmenin (`company_id`) verisi veritabanında birbirinden izole edilir.
Tek bir uygulama sunucusu birden fazla firmaya hizmet verebilir; bu sayede
altyapı maliyeti düşer ve ölçeklenmesi kolaylaşır.

---

## 2. Altyapı & Teknoloji Seçimleri

### Genel Mimari

```
İnternet
    │
    ▼
┌─────────┐     ┌──────────┐     ┌──────────────┐
│  Nginx  │────▶│ Backend  │────▶│  PostgreSQL  │
│(Proxy)  │     │(Node.js) │     │  + pgvector  │
└─────────┘     └──────────┘     └──────────────┘
    │                │
    │           ┌────┴─────┐
    │           │  Redis   │
    │           └──────────┘
    │
    ▼
┌─────────┐
│ React   │  (Nginx tarafından statik olarak sunulur)
│ (SPA)   │
└─────────┘

Host Makinede:
┌──────────┐
│  Ollama  │  (LLM — GPU erişimi için container dışında)
└──────────┘
```

---

### Docker Compose

**Neden Docker?**
- Geliştirici ortamı ile üretim ortamı arasındaki "bende çalışıyor" sorununu ortadan kaldırır.
- Tüm servisler tek komutla (`docker compose up -d`) ayağa kalkar.
- Her servis için kaynak limiti (memory) tanımlanabilir.
- Sürüm yükseltmesi sadece image tag değiştirmek anlamına gelir.

**Servisler:**

| Servis | Image | Bellek Limiti | Rol |
|--------|-------|---------------|-----|
| `postgres` | `pgvector/pgvector:pg16` | — | Veritabanı |
| `postgres_backup` | `postgres:16-alpine` | — | Günlük yedek (7 gün saklama) |
| `redis` | `redis:7-alpine` | 256 MB | Cache & oturum |
| `backend` | Özel Node.js 20 | 512 MB (prod) | API sunucusu |
| `frontend` | Özel Nginx 1.27 | 128 MB | SPA + reverse proxy |

**Ollama neden container dışında?**
LLM çıkarımı (inference) GPU gerektirir. Docker içinde GPU sürücüsü
paylaşımı karmaşıktır ve platforma göre değişir. Ollama'yı doğrudan
host'ta çalıştırıp backend'e `host.docker.internal:11434` üzerinden
erişmek en güvenilir çözümdür.

---

### PostgreSQL 16 + pgvector

**Neden PostgreSQL?**
- Açık kaynak, ACID uyumlu, olgun ve güvenilir.
- Karmaşık sorgular (CTE, window functions, JSON) için zengin SQL desteği.
- `pg` kütüphanesi ile Node.js entegrasyonu çok olgunlaşmış durumda.
- Multi-tenancy için satır düzeyinde izolasyon (`company_id` filtresi) kolaydır.

**Neden pgvector eklentisi?**
AI chatbot, belgeleri vektör (embedding) olarak depolar ve anlamsal benzerlik
araması yapar. pgvector, bu vektörleri PostgreSQL içinde saklamayı ve
`<->` operatörüyle hızlı benzerlik sorgusu yapmayı sağlar. Ayrı bir
vektör veritabanı (Pinecone, Weaviate vb.) kurmak yerine zaten var olan
PostgreSQL'i kullanmak altyapıyı sadeleştirir.

**Veritabanı yapısı:**
- ~50 migration dosyası (idempotent, `schema_migrations` tablosuyla takip)
- 25+ tablo (users, products, orders, customers, suppliers, warehouses,
  invoices, cheques, bank_transfers, rag_knowledge, approval_requests vb.)
- Tüm tablolarda `company_id` (multi-tenancy) ve `created_at`/`updated_at`
- Soft delete: `deleted_at` kolonu

---

### Redis 7

**Neden Redis?**
- **Cache:** Sık sorgulanan verileri (dashboard, ürün listesi) bellekte tutar;
  her istekte PostgreSQL'e gitmek gerekmez. TTL (süre sonu) ile otomatik geçersizleştirme.
- **Rate limiting:** İsteklerin sayısını IP veya kullanıcı bazında sayar.
  Dağıtık ortamda birden fazla backend instance aynı Redis'i kullanabilir.
- **Oturum yönetimi:** Aktif oturumların `last_activity` takibi.
- **İş kuyruğu (Bull):** Arka planda çalışması gereken görevler (toplu import,
  e-posta gönderimi) Redis üzerinden kuyruklanır.

**Bellek politikası:** `allkeys-lru` — bellek dolduğunda en uzun süredir
kullanılmayan veri otomatik silinir; sistem çökmez.

**Redis opsiyonel:** Uygulama, Redis bağlanamasa da çalışmaya devam eder;
cache ve rate limiting in-memory fallback ile sürdürülür.

---

### Nginx 1.27

**Neden reverse proxy?**
- **SSL/TLS sonlandırma:** Sertifika yönetimi tek noktada (Nginx). Backend
  HTTPS'den habersiz, sadece HTTP konuşur.
- **Rate limiting:** Nginx düzeyinde IP başına istek sınırı (auth: 10/dk,
  API: 120/dk, genel: 60/dk). Backend'e ulaşmadan önce aşırı istekler reddedilir.
- **Statik dosya sunumu:** React build çıktısı Nginx'ten doğrudan sunulur;
  Node.js'e yük bindirmez.
- **Gzip sıkıştırma:** JS/CSS/JSON otomatik sıkıştırılır, bant genişliği düşer.
- **SPA fallback:** `/index.html`'e yönlendirme ile React Router çalışır.
- **WebSocket proxy:** `/socket.io` trafiği backend'e yönlendirilir.
- **Güvenlik başlıkları:** `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy` Nginx'ten eklenir.

**HSTS:** `Strict-Transport-Security: max-age=63072000` (2 yıl, subdomain dahil, preload).
Tarayıcı bir kez HTTPS gördükten sonra hiçbir zaman HTTP denemez.

---

### Node.js 20 (LTS)

**Neden Node.js?**
- **Async I/O:** ERP'nin ana yükü I/O ağırlıklıdır (DB sorguları, dosya okuma,
  dış API çağrıları). Node.js'in olay döngüsü bu senaryoda çok verimlidir;
  her istek için yeni thread açmaz.
- **Full-stack JavaScript:** Frontend ve backend aynı dil; kod paylaşımı
  (validator mantığı, sabitler) kolaylaşır.
- **Ekosistem:** npm'de ihtiyaç duyulan her kütüphane mevcuttur.
- **LTS seçimi:** Node.js 20, uzun dönem destek sürümüdür; üretimde
  güvenli bir seçimdir.

---

## 3. Backend Mimarisi

### Klasör Yapısı

```
backend/src/
├── config/          # DB, Redis, Ollama, Swagger yapılandırması
├── middleware/      # Auth, güvenlik, rate limit, RBAC, dosya yükleme
├── routes/          # 30+ route dosyası (her modül ayrı)
├── controllers/     # Route handler'ları (iş mantığı yok, sadece HTTP katmanı)
├── services/        # İş mantığı + AI servisleri
│   └── tools/       # AI araçları (query / mutation / şemalar / izin matrisi)
├── models/          # Veritabanı sorgu sınıfları (12 model)
├── validators/      # Joi şema doğrulama (her modül için ayrı)
├── utils/           # Yardımcı fonksiyonlar, PDF/Excel üreticileri
└── websocket/       # Socket.IO event handler'ları
```

### Neden Controller / Service / Model Ayrımı?

- **Controller:** Yalnızca HTTP'yi anlar. İsteği alır, doğrulatır, servisi çağırır, yanıt döner.
- **Service:** İş mantığı burada. HTTP'den habersiz; test edilmesi kolay.
- **Model:** Yalnızca SQL sorgularını bilir. Servis katmanından çağrılır.
- Bu ayrım sayesinde her katman bağımsız test edilebilir ve değiştirilebilir.

### Middleware Stack (Sırayla)

```
İstek gelir
    ↓
Helmet          → HTTP güvenlik başlıkları (CSP, HSTS, MIME sniffing koruması)
    ↓
CORS            → Hangi origin'lerden istek kabul edilecek
    ↓
Body Parser     → JSON / URL-encoded body (max 10 MB)
    ↓
HPP Sanitize    → HTTP Parameter Pollution: query duplikasyonları engellenir
    ↓
IP Blacklist    → Kara listedeki IP'ler reddedilir
    ↓
SQL Injection   → UNION SELECT, DROP TABLE vb. desenleri engeller
    ↓
Şüpheli Aktivite → 5 dk'da 10+ hatalı istek → IP otomatik engellenir
    ↓
Host / Origin   → DNS rebinding ve sahte origin saldırılarını önler
    ↓
CSRF            → State-changing isteklerde token doğrulaması
    ↓
Rate Limit      → Global + endpoint bazlı istek sınırı
    ↓
Auth (JWT)      → Token doğrulama, oturum güncelleme
    ↓
RBAC            → Role göre endpoint erişimi
    ↓
Route Handler   → İş mantığı çalışır
    ↓
Error Handler   → Tüm hatalar tek noktada işlenir (Sentry'ye iletilir)
```

### Temel Kütüphaneler

| Kütüphane | Versiyon | Neden? |
|-----------|----------|--------|
| `express` | 4.18 | Olgun, esnek HTTP framework |
| `pg` | 8.11 | PostgreSQL resmi Node.js client |
| `redis` | 4.6 | Cache, rate limit, kuyruk |
| `bull` | 4.11 | Redis üzerinde iş kuyruğu |
| `jsonwebtoken` | 9.0 | JWT oluşturma ve doğrulama |
| `bcryptjs` | 3.0 | Şifre hashleme (bcrypt, native derleme gerektirmeyen saf JS versiyonu) |
| `speakeasy` | 2.0 | TOTP 2FA token üretimi |
| `joi` | 17.11 | Şema tabanlı giriş doğrulama |
| `helmet` | 7.1 | HTTP güvenlik başlıkları |
| `express-rate-limit` | 7.1 | Rate limiting middleware |
| `winston` | 3.11 | Yapılandırılmış loglama |
| `@sentry/node` | 8.38 | Üretimde hata takibi |
| `socket.io` | 4.7 | WebSocket sunucu |
| `multer` | 2.0 | Dosya yükleme |
| `exceljs` | 4.4 | Excel okuma/yazma |
| `pdfkit` | 0.15 | PDF oluşturma |
| `nodemailer` | 6.9 | SMTP e-posta gönderimi |
| `@sendgrid/mail` | 8.1 | SendGrid entegrasyonu (yedek) |
| `swagger-ui-express` | 5.0 | `/api/docs` Swagger UI |

---

## 4. Güvenlik Katmanları

> ⚠️ Bu bölüm sunum sırasında özellikle vurgulanmalıdır.

### 4.1 Kimlik Doğrulama: JWT Çift Token

**Access Token (kısa ömürlü):**
- Her API isteğinde gönderilir (HTTP-only cookie veya Authorization header).
- Kısa ömürlüdür (örn. 15 dk); çalınsa bile az süre geçerlidir.

**Refresh Token (uzun ömürlü):**
- Sadece token yenileme endpoint'ine gönderilir.
- Süresi dolunca kullanıcı tekrar giriş yapar.

**Neden çift token?**
Tek ve uzun ömürlü token kullanılsaydı, çalınan token uzun süre geçerli olurdu.
Çift token yapısı bu riski minimize eder.

**Token iptali:** `revoked_access_tokens` tablosu — çıkış yapıldığında veya
şüpheli aktivitede token kara listeye alınır.

---

### 4.2 CSRF Koruması

Tarayıcı tabanlı saldırılara (Cross-Site Request Forgery) karşı koruma.
Sunucu, giriş sırasında bir CSRF token cookie'si atar. State-changing isteklerde
(POST, PUT, DELETE) bu token `X-CSRF-Token` başlığıyla geri gönderilmek zorundadır.
Başka bir siteden tetiklenen istek bu header'ı taşıyamayacağından reddedilir.

---

### 4.3 İki Faktörlü Kimlik Doğrulama (2FA)

`speakeasy` kütüphanesi ile TOTP (Time-based One-Time Password) desteklenir.
- Kullanıcı QR kodu tarar (Google Authenticator, Authy vb.).
- Her 30 saniyede bir yenilenen 6 haneli kod ek doğrulama katmanı sağlar.
- Yedek (backup) kodlar da oluşturulur; telefon kaybolduğunda kullanılır.

---

### 4.4 RBAC — Rol Tabanlı Erişim Kontrolü

5 rol hiyerarşisi:

```
super_admin > admin > manager > user > customer
```

| Rol | Temel Yetki |
|-----|-------------|
| `super_admin` | Her şey |
| `admin` | Her şey |
| `manager` | Finans dahil çoğu işlem; analitik raporların bir kısmı |
| `user` | Standart ERP işlemleri; finansal özetler kısıtlı |
| `customer` | Yalnızca kendi siparişleri, çekleri ve ürün araması |

Her endpoint `requirePermission()` middleware'i ile korunur.
İzin tanımları `role_permissions` tablosunda tutulur; kod değiştirmeden
veritabanından güncellenebilir.

---

### 4.5 Rate Limiting

8 farklı limiter, Redis destekli (dağıtık ortamda tutarlı):

| Limiter | Limit | Hedef |
|---------|-------|-------|
| Genel API | 100 istek / 15 dk | Tüm endpoint'ler |
| Giriş | 10 istek / 15 dk | Brute force koruması |
| Kayıt | 5 istek / saat | Spam hesap oluşturmayı önler |
| Şifre sıfırlama | 3 istek / saat | Hesap ele geçirme koruması |
| Hassas işlemler | 10 istek / saat | Silme, iptal vb. |
| AI sorgu | 20 istek / dk (kullanıcı başına) | LLM aşırı yüklenmesini önler |
| AI mutation | 8 istek / 10 dk (kullanıcı başına) | Yazma işlemlerini kısıtlar |

---

### 4.6 Diğer Güvenlik Önlemleri

- **Helmet:** `Content-Security-Policy`, `X-Content-Type-Options`,
  `X-Frame-Options` gibi başlıklar otomatik eklenir.
- **SQL Injection Koruması:** Tüm sorgular parametreli (`$1`, `$2` placeholders).
  Ek olarak regex tabanlı desen tespiti middleware katmanında çalışır.
- **HPP (HTTP Parameter Pollution):** Aynı parametre birden fazla gönderildiğinde
  ilki alınır; array injection engellenir.
- **IP Kara Liste:** `ip_blacklist` tablosu; 5 dakikada 10+ hatalı istek
  gelen IP otomatik engellenir (1 saatlik TTL).
- **Dosya Yükleme Güvenliği:** Multer ile MIME whitelist (jpeg, png, pdf, xlsx, csv),
  max 10 MB, path traversal koruması.
- **Sentry:** Üretimde beklenmedik hatalar otomatik raporlanır.

---

## 5. AI / Chatbot Sistemi

> ⚠️ Bu bölüm projenin en özgün parçasıdır.

### Neden AI Chatbot?

Kullanıcılar "Bu ay en çok satan 5 ürün nedir?" veya "Müşteri ABC'nin açık siparişlerini iptal et"
gibi doğal Türkçe cümlelerle sistemle etkileşime girebilir. Formlar yerine
diyalog tabanlı arayüz, ERP kullanım eşiğini önemli ölçüde düşürür.

---

### Ollama + Yerel LLM

**Neden Ollama?**
- **Ücretsiz:** OpenAI/Azure gibi bulut sağlayıcılarına aylık ücret ödenmez.
- **Veri Gizliliği:** Kullanıcı verileri dışarı çıkmaz; şirket verisi sunucuda kalır.
- **Esneklik:** Model değiştirmek sadece `.env`'de `OLLAMA_MODEL` değerini
  güncellemek anlamına gelir.

**Model seçimi:**
- Windows (4 GB VRAM): `qwen2.5:3b` — düşük kaynak tüketimi
- Mac M3 Pro (36 GB): `qwen3:30b-a3b` — çok daha iyi Türkçe kalitesi

**Çoklu sağlayıcı desteği:** `aiGateway.js` sayesinde Ollama yerine
OpenAI veya Azure OpenAI da kullanılabilir; sadece environment değişkeni değişir.

---

### RAG (Retrieval-Augmented Generation)

LLM'nin genel bilgisi yerine sisteme özgü bilgileri (ürün açıklamaları,
şirket politikaları vb.) önce vektör olarak PostgreSQL'e (pgvector) kaydedilir.
Kullanıcı sorusu geldiğinde:

1. Soru vektöre dönüştürülür (embedding).
2. PostgreSQL'de kosinüs benzerliği araması yapılır.
3. En yakın belgeler context olarak LLM'e verilir.
4. LLM bu bağlamı kullanarak doğru yanıt üretir.

**Neden RAG?**
LLM halüsinasyon yapabilir (var olmayan bilgi üretebilir). RAG,
LLM'i gerçek verilerle sınırlar; yanıtların doğruluğunu artırır.

---

### Agent Orchestrator (Orkestratör)

Basit soru-cevap yerine **araç çağırma** (tool calling) mimarisi kullanılır:

```
Kullanıcı mesajı
    ↓
[1] PLAN  — LLM hangi araçları çağıracağını belirler
    ↓
[2] DETERMİNİSTİK DÜZELTME  — anahtar kelime tespiti (Türkçe)
    bazı yanılmaları düzeltir (ör. "vadesi dolacak" → get_due_soon_cheques)
    ↓
[3] MUTATION TESPİTİ  — yazma işlemi mi? Onay gerekiyor mu?
    ↓
[4] ARAÇ ÇALIŞTIRIR  — RBAC kontrollü, parametre doğrulamalı
    ↓
[5] YANIT  — LLM gerçek verilerle Türkçe yanıt oluşturur
```

---

### AI Araçları (39 Araç)

**22 Sorgu Aracı (read-only):**
Ürün arama, sipariş listesi, çek durumu, dashboard özeti, finansal rapor,
müşteri detayı, envanter değeri, aylık karşılaştırma, stok uyarıları vb.

**17 Mutasyon Aracı (yazma işlemi):**

| Risk Seviyesi | Araçlar | Onay Gerekir mi? |
|---------------|---------|-----------------|
| 🔴 Yüksek | `cancel_order`, `set_cheque_status`, `deactivate_product` | Evet (manager/admin) |
| 🟠 Orta | `create_order`, `set_order_status`, `create_customer` vb. | Moda göre |
| 🟡 Düşük | `set_product_stock`, `activate_product` | Hayır |

**3 çalışma modu:**
- `copilot` — tüm mutasyonlar onay ister
- `guarded` — orta ve yüksek risk onay ister
- `transactional` — sadece yüksek risk onay ister

---

### AI Güvenlik Middleware

- **Input sanitasyonu:** Max 2000 karakter, jailbreak desenleri ("ignore instructions",
  "system prompt", "you are now") engellenir.
- **PII maskeleme:** Şifre, vergi numarası, IBAN, e-posta, telefon numaraları
  LLM'e gönderilmeden maskelenir.
- **Output filtreleme:** `company_id`, `password`, `secret`, ham SQL sorguları
  yanıtta görünürse çıkarılır.

---

## 6. İş Modülleri

### 6.1 Ürün Yönetimi

- Ürün CRUD (ad, SKU, kategori, fiyat, KDV oranı)
- Stok takibi: `stock_quantity` (mevcut) + `incoming_stock` (sipariş edilmiş, henüz teslim alınmamış)
- Stok girişi: Eğer stok negatifse (açık sipariş var), gelen stok önce açığı kapatır; fazlası stoka geçer
- Tedarik Uyarıları sayfası: Stoku negatif olan ürünler + tedarikçi bilgisi + eksik adet
- Toplu import: Excel/CSV
- AI: `search_products`, `get_low_stock_products`, `get_inventory_value`, `create_product`, `update_product`

### 6.2 Müşteri Yönetimi

- Müşteri CRUD (şirket adı, yetkili kişi, vergi bilgileri, telefon, lokasyon)
- Telefon zorunlu (10-20 hane, Türkiye formatı)
- Toplu import: Excel/CSV
- Cari hesap: Her müşteri için toplam satış − toplam ödeme = bakiye (borç)
- AI: `search_customers`, `get_customer_detail`, `get_top_customers`, `get_debt_aging_report`

### 6.3 Sipariş Yönetimi

- Sipariş oluşturma: Müşteri seç → ürün ekle → iskonto/birim fiyat düzenle → kaydet
- Stok aşımına izin verilir; stok negatife düşer, Tedarik Uyarıları'nda görünür
- **Kısmi Sevkiyat:** "Tamamla" butonu her ürün için sevk edilecek adedi sorar;
  kalanı yeni "bekleyen" sipariş olarak oluşturulur
- Durum akışı: `pending → processing → completed / cancelled`
- AI: `create_order`, `set_order_status`, `cancel_order` (yüksek risk)

### 6.4 Fatura & Faturalandırma

- Otomatik fatura numarası (INV-{YIL}-{RASTGELE})
- KDV hesaplama (varsayılan %18, yapılandırılabilir)
- İskonto yönetimi
- Durum: `draft → sent → paid / overdue / cancelled`
- PDF dışa aktarma
- AI: `get_invoices_summary`, `set_invoice_status`

### 6.5 Çek & Banka Havalesi (Ödemeler)

**Çek modülü:**
- Çek seri no, vade tarihi, tutar, banka, durum takibi
- Durum: `pending`, `paid`, `cancelled`, `teminat`, `musteriye_verildi`
- Vadesi yaklaşan çekler için e-posta bildirimi
- Toplu import
- AI: `search_cheques`, `get_overdue_cheques`, `get_due_soon_cheques`

**Banka Havalesi modülü:**
- Müşteri, banka, dekont no, tarih, tutar
- Onaylı havaleler cari hesap bakiyesini düşürür
- Çek sekmesiyle aynı sayfada (Ödemeler)

### 6.6 Tedarikçi Yönetimi

- Tedarikçi CRUD (şirket, yetkili, iletişim, vergi bilgileri, IBAN)
- Ödeme vadesi (Net 30 vb.), para birimi tercihi (TRY/USD/EUR)
- Risk seviyesi, minimum sipariş miktarı, temin süresi
- AI: `get_suppliers_list`, `create_supplier`, `update_supplier`

### 6.7 Depo & Stok

- Çok depolu yapı (lokasyon, şehir, ülke, kapasite, sorumlu kişi)
- Depo bazlı stok görünümü
- AI: `get_warehouse_stock`, `create_warehouse`, `update_warehouse`

### 6.8 Finansal Raporlar & Cari Hesap

- **Dashboard KPI'ları:** Toplam gelir, sipariş sayısı, müşteri sayısı, kritik stok
- **Günlük / Haftalık / Aylık raporlar**
- **Aylık karşılaştırma:** Önceki ayla gelir, sipariş, müşteri karşılaştırması
- **Müşteri borç yaşlandırma:** Hangi müşteri ne kadar ödeme bekliyor
- **Ödeme risk değerlendirmesi:** Gecikme riski taşıyan müşteriler
- **Cari hesap:** Müşteri bazında toplam satış, toplam tahsilat, net bakiye
- AI: `get_dashboard_summary`, `get_financial_summary`, `get_monthly_comparison`, `get_payment_risk_assessment`

---

## 7. Frontend Mimarisi

### Teknoloji Seçimleri

**React 18**
- Bileşen tabanlı UI; her sayfa küçük, tekrar kullanılabilir parçalardan oluşur.
- Geniş ekosistem ve topluluk desteği.
- Hooks API ile durum yönetimi sade kalır.

**Vite 5 — Neden Vite, neden Webpack değil?**
- Geliştirme sırasında hot-reload anında gerçekleşir (ESM native).
- Webpack'e kıyasla 10-100x daha hızlı başlangıç süresi.
- Build çıktısı Rollup ile optimize edilmiş küçük dosyalar üretir.

**Tailwind CSS — Neden utility-first?**
- CSS dosyaları yazmak yerine HTML'de doğrudan sınıflar kullanılır.
- Tasarım sistemi tutarlılığı: renkler, boşluklar, tipografi tek yerden.
- Build zamanı kullanılmayan sınıflar atılır (purge); çok küçük CSS çıktısı.

**Zustand — Neden Redux değil?**
- Redux'un boilerplate yükü (action, reducer, selector) yoktur.
- Tek satırda store oluşturulur; bileşenlerden hook ile erişilir.
- Sadece gerçekten global state için kullanılır (auth, izinler, UI durumu).

**TanStack Query (React Query) — Neden?**
- Sunucu verisi (API response) için özel cache yönetimi.
- Otomatik yeniden getirme (refetch), yükleme/hata durumları yerleşik.
- `useQuery` ile her bileşen kendi verisini yönetir; global store'a gerek kalmaz.

**Sayılar:**
- 27 sayfa
- 89 bileşen
- 19 API servis modülü
- 8 Zustand store
- 10 custom hook

---

## 8. Gerçek Zamanlı Özellikler

### Socket.IO — Neden WebSocket?

HTTP, istemci-sunucu modeli üzerine kurulmuştur; sunucu istemciye kendi
başına veri gönderemez. WebSocket kalıcı çift yönlü bağlantı kurar;
sunucu anlık bildirim gönderebilir.

**Kullanım alanları:**
- Sipariş durumu değiştiğinde anlık bildirim
- Yeni sipariş oluşturulduğunda dashboard güncelleme
- AI chatbot mesajlarının stream şeklinde gelmesi (akıcı yanıt deneyimi)

### Döviz Ticker

Ekranın üst bandında USD/TRY, EUR/TRY, GBP/TRY kurları gösterilir.
- Kaynak: `open.er-api.com` (ücretsiz, API anahtarsız)
- 60 saniyede bir otomatik yenileme
- Erişilemezse önceki değer korunur (fallback)

---

## 9. Raporlama & Export

### Neden Tek Endpoint?

Eski yapıda her modülün kendi PDF/Excel kodu vardı → kod tekrarı, tutarsız
stil. Yeni yapıda `POST /api/export/pdf` ve `POST /api/export/excel`
tüm modüllere hizmet eder. Frontend ham veriyi gönderir, backend
formatlar.

### PDF (PDFKit)

- **DejaVu font:** Türkçe karakterler (İ, Ş, Ğ, Ü, Ö, Ç) ve ₺ sembolünü doğru göstermek
  için özel font gereklidir. Docker image'ına `font-dejavu` paketi eklenmiştir.
- Kurumsal lacivert (#1e3a5f) başlık rengi
- Tek satır (ellipsis ile kesilir), dar `#` kolonu, TR saati (`Europe/Istanbul`)
- Her sayfa altında toplam satırı

### Excel (ExcelJS)

- Sütun genişlikleri içeriğe göre otomatik ayarlanır
- Başlık satırı kalın ve renkli
- Para birimleri ve tarihler Türkçe formatlanır

### Rapor Türleri

- Günlük, haftalık, aylık satış raporları
- Müşteri listesi (bakiye dahil)
- Ürün listesi (stok, değer)
- Sipariş listesi (filtreli)
- Tedarikçi listesi
- Çek listesi (durum bazlı)

---

## 10. CI/CD & Deployment

### GitHub Actions — İki Pipeline

**CI (ci.yml) — Her push ve PR'da:**
```
1. Backend lint + 108 Jest testi
2. Frontend lint + Vite build + Vitest + Playwright E2E
```
Test geçmeden merge edilemez.

**Deploy (deploy.yml) — main branch veya tag (v*.*.*):**
```
1. Sırları doğrula (Docker Hub, SSH erişim bilgileri)
2. Testleri çalıştır (PostgreSQL servis container'ı ile)
3. Multi-platform image oluştur (amd64 + arm64) → Docker Hub'a push
4. VPS'e SSH: docker compose pull → restart → eski image'ları temizle
```

**Neden multi-platform image?**
Geliştirme çoğunlukla Mac (arm64) üzerinde yapılır; üretim sunucusu
genellikle x86 (amd64). Tek image her iki mimaride de çalışır.

### SSL/TLS

- TLS 1.2 ve 1.3 (eski sürümler reddedilir)
- Mozilla Intermediate cipher suite (güvenli + uyumlu denge)
- HSTS: 2 yıl, subdomain dahil, preload listesine eklenebilir

### Veritabanı Yedekleme

`postgres_backup` servisi günlük `pg_dump` alır; son 7 günün yedeği saklanır.
Eski yedekler otomatik silinir.

---

## 11. Test Stratejisi

| Tür | Araç | Adet / Kapsam |
|-----|------|---------------|
| Backend birim + entegrasyon | Jest + Supertest | 108 test |
| Frontend birim | Vitest + Testing Library | Bileşen testleri |
| E2E (uçtan uca) | Playwright | Kritik kullanıcı akışları |

**Backend test prensibi:**
Her route, mock veritabanı ile test edilir; gerçek PostgreSQL gerekmez.
CI'da servis container'ı ile tam entegrasyon testi de çalışır.

---

## 12. Sık Sorulan Sorular

**S: Neden bulut veritabanı kullanmadınız?**
C: Self-hosted PostgreSQL veri egemenliği sağlar. Bulut DB maliyeti ve
vendor lock-in riski taşır. Yedekleme stratejisi kendi kontrolümüzdedir.

**S: Neden mikroservis değil monolitik backend?**
C: Ekip boyutu ve proje ölçeği için monolitik mimari daha verimlidir.
Mikroservisler network latency, distributed tracing, ayrı deployment
karmaşıklığı getirir. İleride gerekirse modüller bağımsız servise ayrılabilir.

**S: AI chatbot internete bağlanıyor mu?**
C: Hayır. Ollama tamamen yerel çalışır. Kullanıcı verileri hiçbir dış
sunucuya gönderilmez. Döviz kuru için yalnızca `open.er-api.com`'a GET
isteği atılır (hassas veri içermez).

**S: Sistem ne kadar kullanıcıyı kaldırır?**
C: Redis cache ve connection pooling sayesinde single Node.js instance
yüzlerce eşzamanlı kullanıcıya hizmet verebilir. Horizontal scaling için
birden fazla backend instance + Redis Cluster mimarisine geçilebilir.

**S: Türkçe karakter sorunlarını nasıl çözdünüz?**
C: PDF'de DejaVu font (Docker image'ına eklendi). Veritabanında `UTF-8`
encoding. Nginx ve Node.js `Content-Type: charset=utf-8`. Excel'de
ExcelJS otomatik UTF-8 yönetir.

**S: Neden bcryptjs, bcrypt değil?**
C: `bcrypt` native C++ addon gerektirir. ARM64 ve Alpine Linux gibi
farklı ortamlarda derleme sorunları yaşanır. `bcryptjs` saf JavaScript
ile aynı algoritmayı uygular; her ortamda sorunsuz çalışır.

---

*Son güncelleme: 15 Haziran 2026*
