# Güvenlik Denetimi — 29.10.2026

Amaç: dışarıdan bir sızma testi gelmeden önce kendi sistemimizi savunma gözüyle taramak.
Kapsam: yerel Docker yığını (`DEPLOYMENT_MODE=cloud`, seed'li veri) + ikinci bir kiracı (`PENTEST_B`).
Yöntem: kod incelemesi + `backend/scripts/test_pentest.js` (219 kontrol, her biri **güvenli davranışı**
iddia eder; başarısız kontrol = bulgu). Ham sonuçlar: `backend/scripts/pentest-results.json`.

**İlk koşu:** 219 kontrol · 166 geçti · **53 başarısız** (15 kritik, 26 yüksek, 12 orta).
Aşağıdaki tablolar o koşunun kaydıdır; "Durum" sütunu düzeltme ilerledikçe güncellenir.

Çalıştırma: `cd backend && node scripts/test_pentest.js [--only=KIMLIK|KIRACI|RBAC|GIRDI|ALTYAPI|DOSYA|IS|AI|PERF]`
(yalnızca yerel/geliştirme ortamında; veritabanına test kullanıcıları ve kayıtları yazar).

## Düzeltme sonrası durum (4. koşu)

| Koşu | Kontrol | Geçti | Bulgu |
|---|---|---|---|
| 1 (denetim başı) | 219 | 166 | **53** (15 kritik, 26 yüksek, 12 orta) |
| 2 (kiracı/kayıt/istek katmanı düzeltmeleri) | 219 | 209 | 10 |
| 3 (test hataları giderildi, +17 olumlu yol kontrolü) | 236 | 228 | 8 — depo IDOR'u ve hesap kilitleme eksiği ortaya çıktı |
| **4 (depo + hesap kilitleme düzeltildi)** | **236** | **233** | **3 (karar/kurulum)** |

Birim testler: `npx jest` 211 → **237** (parola politikası, `originCheck` önek tuzağı, IP sahteciliği, girdi bekçisi,
DB'den kullanıcı doğrulaması, kayıt onay politikası).

Not: ilk koşuda depo ve fatura kayıtları test gövdesi eksikliğinden oluşturulamadığı için bu iki modülün izolasyonu
**denenmemişti**; üçüncü koşuda gövdeler düzelince depo sızıntısı (okuma/güncelleme/silme) görünür oldu ve kapatıldı.
Ayrıca ilk düzeltme denemesinde `User.update/findAll/count` içindeki bir `$` karakter kaybı yüzünden kapsamlı sorgular
500 veriyordu; "olumlu yol" kontrolleri (KENDI-*) bunu yakaladı. Bu yüzden her iki yön de (başkasının verisi kapalı,
kendi verin açık) ölçülüyor.

### Kapatılanlar

| Grup | Düzeltme | Başlıca dosya |
|---|---|---|
| A. Kiracı | `User.findAll/update/delete/count`, `AuditLog.findAll` şirket parametresi; admin ve user-management uçları, audit/etkinlik logları, oturumlar, giriş denemeleri, güvenlik istatistikleri, izin sorguları, tedarikçiler, **depolar** `company_id` ile kapsamlı; bulunamayan kayıt 404 | `adminController`, `userManagementController`, `securityController`, `permissionController`, `supplierController`, `warehouseController`, `activityLogService` |
| A. Küresel kaynaklar | IP kara listesi ve rol-izin şablonu yalnız `onprem` (tek şirket) ya da `super_admin` | `middleware/rbac.js` (`requirePlatformScope`) |
| A. Sipariş | Müşteri ve her ürün şirkete ait olmalı (istemci `price` verse de); stok güncellemesi `company_id` ile; negatif `price` 400 | `orderController`, `models/Order.js` |
| B. Kayıt | Varsayılan şirkete/kodla katılım `pending`; `onprem`'de kayıt kapalı (`ALLOW_SELF_REGISTRATION`); demo için `REGISTRATION_AUTO_APPROVE=true`; yeni şirket açan kendi şirketinin yöneticisi | `authController.register` |
| B. Parola | Ortak politika: 8–72 bayt, harf+rakam, yaygın parola listesi; kayıt, değiştirme, sıfırlama, yönetici atamasında | `utils/passwordPolicy.js` |
| B. Oturum | `authMiddleware` her istekte `is_active/deleted_at/role/company_id` değerini DB'den okur; giriş pasif/silinmiş hesaba kapalı | `middleware/auth.js`, `authController.login` |
| B. Giriş | Bilinmeyen kullanıcıda sahte bcrypt (zamanlama); hatalı denemeye `user_id`; hesap bazlı geçici kilit (15 dk'da `LOGIN_LOCK_MAX`=10) | `authController.login` |
| B. Audit | `AuditLog.create` `company_id`'yi kullanıcıdan türetir (kod ile katılım 500'ü) | `models/AuditLog.js` |
| C. İstek katmanı | `originCheck` tam köken eşitliği; `getClientIp`/`getClientIP` yalnız `req.ip` (`TRUST_PROXY` ile vekil); yanıtlarda yığın izi yok; CSP'den `script-src 'unsafe-inline'` kaldırıldı; `/api/docs` ve ayrıntılı sağlık (`/api/health/detail`) yalnız yönetici; `/api/health` yalnız `{status,timestamp}`; bozuk çerez 500 vermez | `middleware/security.js`, `utils/helpers.js`, `errorHandler.js`, `server.js` |
| D/E | Girdi bekçisi (null byte, derinlik 24, 20 bin düğüm, prototip anahtarları); fatura kalemi/KDV doğrulaması; `user-management` oluşturma/parola atama sütun hataları; `admin/stats` | `security.inputGuard`, `invoiceValidator`, `userManagementController`, `adminController` |
| E. Dosya | Avatar uzantısı MIME'dan türetilir, içerik imzası (JPEG/PNG/GIF/WEBP) doğrulanır, uymazsa dosya silinir ve 400 | `middleware/fileUpload.js` |
| F. Altyapı | Geliştirme override'ında DB/Redis portları `127.0.0.1`'e bağlı | `docker-compose.override.yml` |

### Açık kalanlar (karar / kurulum gerektirir)

| Test | Neden açık | Önerilen karar |
|---|---|---|
| KIMLIK-43 | `admin@erp.local / Admin123!` seed parolası | Kurulum betiği ilk girişte parola değişimini zorunlu kılar; seed yalnız demo/geliştirme |
| ALTYAPI-21 | Ollama `0.0.0.0:11434` (container erişimi için gerekli), kimliksiz | Kurulum betiği Windows/Linux güvenlik duvarında 11434'ü yalnız Docker alt ağına açar |
| IS-07 | Sipariş/fatura birim fiyatı ve toplamı istemciden geliyor (`price`, `total_amount`, `total_price`) | **Karar bekliyor:** iç kullanıcıların indirim girmesi tasarım ise yetkiye bağla (ör. `orders.discount` izni) ve sunucuda toplamı kalemlerden yeniden hesapla; değilse DB fiyatını zorunlu kıl |
| (tasarım) | Negatif stok bilinçli (`Order.js`: "tedarik gerektirir"); kontrol "atomik ve tutarlı düşer" olarak ölçülüyor | Değişiklik gerekmiyor |
| (tasarım) | Bulutta rol-izin şablonları artık yalnız `super_admin` değiştirebilir: demo'da Ayarlar → İzinler sekmesi kiracı yöneticisine kapalı | Gerekirse şirket bazlı rol-izin tablosu (ayrı iş) |

## Önem sırası ve özet

| Grup | Ne bozuk | Etki |
|---|---|---|
| **A. Kiracı izolasyonu** | Kullanıcı yönetimi, admin uçları, audit/etkinlik logları, oturumlar, IP kara listesi, tedarikçiler ve sipariş→müşteri bağı şirket kapsamı kullanmıyor | Bir şirketin yöneticisi başka şirketin kullanıcılarını görür/değiştirir/siler; verisi sızar |
| **B. Kayıt ve oturum** | Anonim kayıt otomatik onaylı ve zayıf parola kabul ediyor; devre dışı/silinen/rolü düşen kullanıcının token'ı geçerli kalıyor | Dışarıdan biri müşteri şirketinin içine girer; yetki geri alınamaz |
| **C. Ağ ve istek katmanı** | `Origin` önek eşleşmesi, `X-Forwarded-For` güveni, 500'de yığın izi, CSP `unsafe-inline` | CSRF/kara liste atlatma, bilgi sızıntısı |
| **D. İş mantığı** | Stok yarışı (aşırı satış), stok aşımı/negatif fiyat kabulü | Mali/stok tutarsızlığı |
| **E. Dayanıklılık** | Bozuk girdide 500 (null byte, derin JSON, bozuk çerez/param, bozuk dosya) | Hata yüzeyi, DoS riski |
| **F. Kurulum** | Seed parolası, DB/Redis portları (override), Ollama LAN, Swagger, sağlık ayrıntısı | Müşteri kurulumunda açık kapı |

## Bulgular (ilk koşu)

### A. Kiracı izolasyonu — KRİTİK

Kök neden: bu uçlar `users`, `audit_logs`, `user_sessions`, `ip_blacklist`, `role_permissions` tablolarını
`WHERE company_id = …` olmadan okuyup yazıyor. Ürün/müşteri/fatura/çek/depo gibi çekirdek modüller
doğru kapsamlı (testler geçti) — sorun yönetim yüzeyinde.

| Test | Bulgu | Dosya |
|---|---|---|
| KIRACI-21, 22 | `GET /api/admin/users` ve `GET /api/user-management/:id` tüm şirketlerin kullanıcılarını verir | `adminController.js`, `userManagementController.js`, `models/User.js` (`findAll/update/delete/count`) |
| KIRACI-23, 25 | `PUT/DELETE /api/user-management/:id` başka şirketin kullanıcısını değiştirir/**siler** (kurban kullanıcı gerçekten silindi) | `userManagementController.js` |
| KIRACI-24, 26, 27 | `change-password`, `admin/users/:id/role`, `admin/users/:id` kapsamsız (500 dönse de kapsam kontrolü yok) | aynı |
| KIRACI-28, 30 | `admin/audit-logs`, `activity-logs` tüm şirketlerin kayıtlarını döndürür | `adminController.js`, `activityLogService.js` |
| KIRACI-31, 32 | `GET/DELETE /api/security/sessions` başka şirketin oturumlarını listeler ve sonlandırır | `securityController.js` |
| KIRACI-33 | `POST /api/security/blacklist` **küresel** kara liste: bir kiracı tüm kiracıları etkiler | `securityController.js` |
| KIRACI-36 | `GET /api/permissions/user/:id` başka şirketin kullanıcı izinlerini verir | `permissionController.js` |
| KIRACI-09, 10, 11 | **Tedarikçiler**: başka şirketin kaydı okunur/güncellenir/silinir | `controllers/supplierController.js`, `models/Supplier.js` |
| IS-09 | Sipariş, **başka şirketin müşterisine** açılabiliyor | `orderController.js` / `models/Order.js` |
| (kod) | `PUT /api/permissions/role/:role` rol-izin tablosu küresel; bir kiracının yöneticisi tüm şirketlerin rol izinlerini değiştirebilir | `permissionService.js` |

Düzeltme ilkesi: tüm sorgulara `req.user.company_id` ekle; bulunamazsa 404 dön (varlığı sızdırma).
Küresel kaynaklar (kara liste, rol izinleri) kiracı yöneticisine kapatılır; `onprem`'de zaten tek şirket.

### B. Kayıt ve oturum

| Test | Önem | Bulgu | Düzeltme |
|---|---|---|---|
| KIMLIK-38 | KRİTİK | `POST /api/auth/register` kullanıcıyı **varsayılan şirkete, `approved`** olarak açar; hemen giriş yapılır | Kayıt varsayılan olarak `pending`; yönetici onayı olmadan giriş yok; `onprem`'de herkese açık kayıt kapalı (ayar) |
| KIMLIK-40 | YÜKSEK | Zayıf parola (`123456`) kabul | Kayıtta ve parola değişiminde ortak parola politikası |
| KIMLIK-25/26/27 | YÜKSEK | Devre dışı bırakılan, silinen veya rolü düşürülen kullanıcının token'ı süresi dolana dek çalışır (rol JWT'den okunuyor) | `authMiddleware` her istekte `is_active`, `deleted_at`, `role`, `company_id`'yi DB'den doğrular |
| KIMLIK-41 | ORTA | Kod ile başka şirkete katılım `audit_logs.company_id NOT NULL` yüzünden 500; yarım kullanıcı kalıyor | Audit kaydına şirketi ver, işlemi transaction'a al |
| KIMLIK-32 | ORTA | Bilinmeyen e-posta ~4 ms, bilinen ~67 ms (bcrypt): kullanıcı varlığı zamanlamayla anlaşılır | Bilinmeyen kullanıcıda da sahte bcrypt karşılaştırması |
| KIMLIK-43 | YÜKSEK | `admin@erp.local / Admin123!` geçerli | Kurulum betiği ilk girişte parola değişimini zorunlu kılar (plandaki `kurulum.ps1`) |
| KIMLIK-42 | — | `reset-password` denemesinde 429 | Test ortamı sınırı; reset akışı ayrıca doğrulanacak |

### C. Ağ ve istek katmanı

| Test | Önem | Bulgu | Düzeltme |
|---|---|---|---|
| ALTYAPI-01 | YÜKSEK | `Origin: http://localhost:5173.evil.com` kabul (`startsWith`) | Tam eşitlik (`URL.origin`) karşılaştırması — `middleware/security.js` `originCheck` |
| ALTYAPI-18 | YÜKSEK | `X-Forwarded-For` doğrudan IP sayılıyor: kara liste atlatılır, başkası kara listeye alınabilir | `getClientIp` yalnız `req.ip`; proxy arkasında `trust proxy` ile |
| ALTYAPI-14 | YÜKSEK | 500/4xx yanıtlarında `stack` alanı dönüyor | `errorHandler.js`: yığın izi yalnız loga; yanıtta `requestId` |
| ALTYAPI-11 | ORTA | CSP `script-src 'unsafe-inline'` | Swagger'ı kimlik doğrulamalı yap, CSP'den kaldır |
| ALTYAPI-15 | ORTA | `/api/docs` kimliksiz açık | Yalnız geliştirmede veya admin arkasında |
| ALTYAPI-17 | ORTA | `/api/health` sürüm/servis ayrıntısı veriyor | Ayrıntı yalnız yetkili `/api/health/detail`; dışarıya `{status}` |
| KIMLIK-24 | ORTA | Bozuk yüzde-kodlu çerez → 500 (`decodeURIComponent` yakalanmıyor) | `security.js`/`auth.js` çerez okuyucularında try/catch |

### D. İş mantığı

| Test | Önem | Bulgu | Düzeltme |
|---|---|---|---|
| IS-10 | YÜKSEK | Stok 1 iken 8 eşzamanlı sipariş **hepsi başarılı**, stok −7 | Sipariş oluştururken `UPDATE products SET stock = stock - $q WHERE id=$1 AND stock >= $q` aynı transaction'da |
| IS-05 | YÜKSEK | Stoktan fazla sipariş kabul | Aynı koşul |
| IS-06 | ORTA | Negatif birim fiyat kabul | Validator: `unit_price >= 0` |
| IS-13 | ORTA | Fatura negatif adet / aşırı KDV → 500 | Validator: `quantity > 0`, `tax_rate 0–100` |

### E. Dayanıklılık (500 yerine 4xx)

| Test | Bulgu |
|---|---|
| GIRDI-21 | `\u0000` içeren metin → 500 (PostgreSQL null byte reddi) |
| GIRDI-26 | 30.000 seviye iç içe JSON → 500 (`hppSanitize` özyinelemesi) |
| DOSYA-01/05/06 | Geçersiz avatar dosyaları reddediliyor ama 500 ile; 4xx olmalı |
| RBAC-23 | `POST /api/user-management` **hiç çalışmıyor**: olmayan `password` sütununa yazıyor, `company_id` eklemiyor |
| (kod) | `change-password` aynı nedenle bozuk (`password` sütunu) |
| KIRACI-29 | `GET /api/admin/stats` 500/bağlantı kopması (rapor sorguları kapsamsız ve hatalı) |

### F. Kurulum / altyapı

| Test | Önem | Bulgu | Düzeltme |
|---|---|---|---|
| ALTYAPI-20/19 | YÜKSEK/ORTA | PostgreSQL 5432 ve Redis 6379 dışarıya açık — `docker-compose.override.yml` (dev) **otomatik birleşir**, müşteri makinesinde de | Kurulum yalnız `docker compose -f docker-compose.yml …` kullanır; port eşlemeleri `127.0.0.1:` ile sınırlanır |
| ALTYAPI-21 | ORTA | Ollama `0.0.0.0:11434`: LAN'dan kimliksiz erişilebilir | Kurulumda `127.0.0.1`; container erişimi için Docker host ağı (belgelenecek) |
| DOSYA-09 | — | `/api/import/customers` yolu yok (404); test yolu düzeltilecek | — |

## Doğrulanması gerekenler (test kirliliği veya test hatası şüphesi)

İlk koşuda `KIRACI-25` kurban kullanıcıyı gerçekten sildiği için sonraki kontroller kirlendi. Düzeltmeden **önce**
kurban yeniden oluşturulup şu kontroller tekrar koşulmalı:

| Test | Neden şüpheli |
|---|---|
| RBAC-15 (super_admin atama) | Kurban silinmiş/rolü değişmişti; `Joi valid('admin','manager','user')` bunu engelliyor olmalı |
| RBAC-18 (düz kullanıcı fatura silme → 400) | 403 yerine 400: ID/validator sırası; yetki kontrolü ayrıca doğrulanacak |
| KIRACI-06, 14 (güncelleme → 400) | Gövde doğrulaması yetki kontrolünden önce çalışıyor; geçerli gövdeyle tekrar |
| KIRACI-38 (B raporunda `totalProducts: 1`) | B'nin kendi test ürünü; yanlış alarm olabilir — ölçüt A'ya özgü değerlere bakacak şekilde daraltılacak |

## Geçen (iyi) kontroller — özet

Token'sız erişim (18 uç), sahte/imzasız/yanlış imzalı JWT, çıkış sonrası token iptali, çerez bayrakları,
giriş hata mesajı eşitliği, NoSQL/tür karışıklığı, SQL enjeksiyon denemeleri (arama/sıralama), dosya yolu geçişi,
Excel formül enjeksiyonu, ürün/müşteri/fatura/çek/depo/sipariş **okuma-yazma-silme kiracı izolasyonu**,
CSRF başlığı kontrolleri, Host/CORS, yapay zekâ sohbetinde kiracılar arası sızıntı ve yetkisiz araç çalıştırma,
performans eşikleri.

## Düzeltme sırası

1. **Kiracı izolasyonu (A)** — her yönetim ucuna `company_id`; regresyon testleri zaten `test_pentest.js`'de.
2. **Kayıt/oturum (B)** — onaysız girişi kapat, token'da DB doğrulaması, parola politikası.
3. **İstek katmanı (C)** — `originCheck`, `getClientIp`, `errorHandler`, çerez ayrıştırma.
4. **İş mantığı (D) ve dayanıklılık (E)**.
5. **Kurulum (F)** — kurulum betiği/compose ile birlikte (onprem planı).

Her adımdan sonra: `npx jest` + `node scripts/test_pentest.js` + durum sütunu güncellenir.

## Performans ve ön yüz (tarayıcısız ölçüm, 29.10.2026)

Ölçüm: yerel Docker, 30 ardışık istek / uç, admin hesabı (seed verisi). Betik: bu denetimin scratchpad'i; tekrarlanabilir
sürümü `backend/scripts/test_performance.js` + `test_pentest.js --only=PERF`.

| Alan | Sonuç |
|---|---|
| API gecikmesi | 19 uç: **p50 3–6 ms, p95 4–8 ms, en kötü 14 ms** (`admin/stats`). En büyük yanıtlar: `activity-logs` 31,6 KB, `orders` 28 KB, `products` 17 KB |
| Eşzamanlılık | 50 paralel `/api/products` → 117 ms toplam, hepsi 200 |
| Sağlık ucu | yalnız `{status,timestamp}` |
| Rota erişimi | 11 SPA yolunun hepsi 200 |

> Seed verisi küçüktür (≈10 müşteri/ürün). Gerçek müşteri hacminde (on binlerce sipariş) `activity-logs`, `orders` listeleri ve
> `reports/*` için ayrıca yük testi gerekir; liste uçlarının sayfalama sınırı (≤1000) bu yüzden zaten zorunlu.

### Ön yüz bulguları

| Önem | Bulgu | Öneri |
|---|---|---|
| ORTA | Geliştirme override'ı ön yüzü **Vite dev sunucusu** olarak yayınlıyor: `/src/main.jsx` ve `/package.json` ham sunuluyor, `import.meta.env.DEV=true`, güvenlik başlığı yok | Müşteri kurulumu yalnız `docker compose -f docker-compose.yml …` (üretim imajı, nginx). `docker-compose.override.yml` otomatik birleştiği için kurulum betiği bunu açıkça `-f` ile verir |
| ORTA | Üretim `nginx/default.conf`'ta **CSP yok** (X-Frame-Options, nosniff, HSTS, Referrer-Policy var) | Tarayıcıda doğrulayarak ekle: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss:; frame-ancestors 'self'`. Chrome denetimi olmadan körlemesine eklenmedi (uygulamayı bozabilir) |
| DÜŞÜK | nginx sürümü yanıt başlığında açıktı | `server_tokens off` eklendi |
| YÜKSEK→kapandı | Backend artık `X-Forwarded-For`'u yok sayıyor; nginx arkasında herkes tek IP görünür ve IP oran sınırı/kara liste/giriş kilidi paylaşılırdı | `TRUST_PROXY=1` üretim compose varsayılanı (nginx `$proxy_add_x_forwarded_for` ile sağdaki girdi gerçek istemci); geliştirme override'ında boş |
| BİLGİ | `/dashboard` ilk açılışta 1,8 sn (Vite soğuk derleme) | Üretim imajında statik dosya; ölçülecek |
| İYİ | `/.env` 403, `/@fs/` ve `.git` yolları SPA'ya düşüyor (sızıntı yok) | — |

### Yapılamayan: Chrome ile işlevsel gezinti

Claude in Chrome uzantısına bağlanılamadı (`list_connected_browsers` boş). Bu yüzden şunlar **henüz yapılmadı**:
her sayfanın gerçek tarayıcıda açılması, formların doldurulması, konsol hataları, ağ istekleri, depolanan XSS'in arayüzde
(React kaçışı) doğrulanması, CSP'nin denenmesi, gerçek sayfa yükleme süreleri (LCP/TTI). Uzantı bağlanınca bu liste
uygulanacak.

### Test artıklarını temizleme

`test_pentest.js` ikinci bir şirket ve çok sayıda test kaydı bırakır. Temizlik (yalnız yerel ortam):

```bash
cd backend
node scripts/cleanup_pentest.js "2026-10-29 12:55:00"          # kuru çalışma: ne silinecek
node scripts/cleanup_pentest.js "2026-10-29 12:55:00" --yes    # siler (tek işlem)
```

Kesinti anı (UTC) testi başlatmadan hemen önceki bir andır; bu andan **önce** oluşan hiçbir kayıt silinmez, 7 günden eski
kesinti reddedilir. 29.10'daki koşuların artıkları temizlendi (26 kullanıcı, PENTEST_B şirketi, 52 ürün, 49 sipariş vb.).

## Chrome ile işlevsel gezinti (29.10.2026)

Claude in Chrome ile gerçek tarayıcıda, seed yöneticisiyle (yerel geliştirme sunucusu: Vite dev, `http://localhost:5173`).

### Sonuç özeti

| Alan | Sonuç |
|---|---|
| Sayfalar | 14 sayfanın (dashboard, ürünler, depolar, siparişler, müşteriler, tedarikçiler, ödemeler/çekler, faturalar, cari hesaplar, AI asistan, raporlar, tedarik uyarıları, kullanıcı yönetimi, ayarlar) hepsi hatasız açıldı; **konsolda hata yok** |
| Hız (dev, taze yükleme) | FCP 230–460 ms, LCP 460–1460 ms; her sayfa 4–14 API çağrısı, hepsi ≤ 45 ms |
| Çıkış / yönlendirme | Çıkıştan sonra `/dashboard` → `/login`; API 401; çerez temiz |
| Swagger | `unsafe-inline`'sız yeni CSP ile `/api/docs` düzgün açılıyor (oturum çerezi ile) |
| Depolanan XSS | Ürün adına `<img onerror=…>` yazıldı: arayüz **metin olarak** gösterdi, betik çalışmadı (React kaçışı). API ham saklıyor; dışa aktarma/e-posta gibi başka tüketiciler için temizleme yine önerilir |
| Kullanıcı oluşturma | Arayüzden çalışıyor (denetim öncesi 500 veriyordu); yeni kullanıcı kendi şirketine bağlandı |
| Ayarlar → Yedekler | Bulutta "yedek şifreleme bu kurulumda kullanılamıyor" mesajı doğru çıkıyor |
| AI asistan | ~10 sn'de yanıt; **ancak yanlış**: "toplam 3 ürün" dedi (gerçekte 6 ürün, 3'ü düşük stoklu) — bilinen model kalitesi sorunu (#3), güvenlik değil |

### Bulunan ve düzeltilenler

| Önem | Bulgu | Düzeltme |
|---|---|---|
| **YÜKSEK** | Giriş sayfası seed yönetici şifresini (`Admin123!`) **her derlemede** gösteriyor ve tek tıkla giriş yaptırıyordu — müşteri kurulumunda LAN'daki herkes yönetici olurdu | `LoginPage.jsx`: yalnız `import.meta.env.DEV` ya da `VITE_SHOW_DEMO_LOGIN=true` (demo derlemesi). Üretim `dist`'te `Admin123` artık yok (doğrulandı) |
| ORTA | Kayıt toast'ı "Giriş yapabilirsiniz" diyordu; hesap yönetici onayı bekliyor | `RegisterPage.jsx`: `requiresApproval` ise "yönetici onayından sonra giriş yapabilirsiniz" |
| ORTA | Parola ipucu "en az 6 karakter", backend 8 + harf/rakam istiyor | `authValidators.js` backend politikasıyla aynı; kayıt, şifre değiştirme, sıfırlama ekranları ortak doğrulayıcıyı kullanıyor |
| ORTA | Doğrulama hatasında kullanıcı yalnız "Validation error" görüyordu | `services/api.js` yanıt yakalayıcı alan mesajlarını gösterir |
| ORTA | Ürün formu tedarikçi seçilmeden "Validation error" veriyordu (`supplier_id: ''`) | `validators.js`: `supplier_id` `.empty('')` (+ birim testi) |

### Açık / karar bekleyen

| Önem | Bulgu |
|---|---|
| ORTA | **Depo seçimi kaydedilmiyor:** ürün formundaki "Depo" alanı backend'de hiçbir yerde işlenmiyor (validator `stripUnknown` ile siliyor); depo stoğu ayrı `warehouse_stock` akışında. Ya form alanını kaldırın ya da `products.warehouse_id` kaydını uygulayın |
| ORTA | Üretim derlemesinde `import.meta.env.DEV=false` olduğundan demo hesapları görünmez; **demo sitesi** (`app.helix-ware.com`) için derlemede `VITE_SHOW_DEMO_LOGIN=true` verilmeli ve backend'de `REGISTRATION_AUTO_APPROVE=true` |
| DÜŞÜK | Ödemeler sayfası açılışta 14 API çağrısı, kullanıcı yönetimi aynı uçları iki kez çağırıyor (geliştirmede React StrictMode çift efekti; üretimde ölçülmeli) |
| DÜŞÜK | Ayarlar → Şirket Adı alanı "My Company" varsayılanını gösteriyor, şirket kaydı "Varsayılan Şirket" |
| DÜŞÜK | Sipariş #4 kartında "Ürün yok": kalemi olmayan sipariş seed verisinde |
| BİLGİ | CSP (nginx) hâlâ eklenmedi; Swagger'ın yeni CSP'yi sorunsuz kabul etmesi uygulamanın da kabul edeceğinin kanıtı değil — üretim imajında `Content-Security-Policy-Report-Only` ile denenmeli |

---

## 2. tur — çok ajanlı kaynak denetimi + yerel sandbox doğrulaması (2026-10-29)

Cloudflare `security-audit` becerisiyle tüm depo tarandı (ajan başına kaynak incelemesi), bulgular dış
ağı olmayan Docker sandbox'ında (geçici Postgres, sahte iki şirket) yeniden üretildi, düzeltildi ve
aynı saldırılarla tekrar sınandı. Ham rapor: `~/security-audit-skill/ErpFinaly/run-1/` (REPORT.md,
FINDINGS-DETAIL.md, LOCAL-EVIDENCE.md).

| Önem | Bulgu | Düzeltme |
|---|---|---|
| Yüksek | `DELETE /api/activity-logs/cleanup` tüm kiracıların kayıtlarını siliyordu | `cleanup(companyId, days)`: `users.company_id` ile kapsamlı, bağlı parametre, en az 30 gün |
| Yüksek | Fatura yabancı `customer_id`/`product_id` kabul edip müşteri/ürün verisi döndürüyordu | Kontrolcüde şirket-kapsamlı doğrulama + birleşimlerde `company_id` koşulu |
| Orta | `server.js` TRUST_PROXY regex'i `\d` yerine `d` → tüm istemciler tek IP | Regex düzeltildi |
| Orta | Çek: admin için müşteri-şirket kontrolü atlanıyordu | Her rol için şirket kapsamlı; `given_to_customer_id` de doğrulanıyor; birleşimler kapsamlı |
| Orta | Soket: istemci `product:*`/`order:*` olayları tüm kiracılara yayınlanıyordu | İstemci olayları kaldırıldı; şirket odaları; kimlik/rol/şirket DB'den; `purpose` jetonu reddi; sohbet limiti |
| Orta | SMTP hedefi değişince kayıtlı parola yeni hosta gidiyordu (düz metin) | Hedef değişiminde parola yeniden girişi zorunlu; `requireTLS`; genel hata mesajı |
| Orta | `PUT /api/auth/profile` mevcut parola istemiyor, düz metin parolayı denetim kaydına yazıyordu | `currentPassword` zorunlu, denetim kaydında `[REDACTED]`; `/api/users/password` (hep hata veren `password` sütunu) `password_hash`'e düzeltildi + diğer oturumlar kapanır |
| Orta | `products.supplier_id` doğrulanmıyor, `supply-alerts` yabancı tedarikçi bilgisini döndürüyordu | Şirket doğrulaması + birleşimde `company_id` |
| Düşük | Rapor uçlarında `reports.view` yoktu (müşteri rolü okuyabiliyordu) | Tüm rapor rotalarında `requirePermission('reports.view')` |
| Düşük | Ürün içe aktarma doğrulaması kiracılar arası varlık sızdırıyordu (ve INSERT `company_id` yazmıyordu) | Sorgular/INSERT şirket kapsamlı, satır bazlı SAVEPOINT, istemci verisine temel doğrulama |
| Düşük | SKU / tedarikçi vergi no / depo kodu / çek seri+banka global UNIQUE | Migration 052: `(company_id, anahtar)` bileşik benzersiz |

Ek sertleştirme: destek yasak listesi `/i` (büyük/küçük harf atlatması), `audit-logs` okuma, `activity-logs`
ve `users/me` yazma kapalı; migration 053 `042`'nin demo müşteri hesaplarını pasifleştirir (belgelenen parola
zaten çalışmıyordu — bcrypt eşleşmedi). Regresyon: `src/security.regression.test.js` (jest) ve
`scripts/sandbox-regression/` (uçtan uca: 30 + 6 kontrol, hepsi geçti).

**Bilinen kalan işler / karar bekleyenler:** 2FA uçtan uca bağlı değil (`routes/twoFa.js`); JWT'lerde `typ`/`sid`
yok (2FA bağlanmadan önce eklenmeli); nginx `location /` güvenlik başlıkları + SPA CSP; `fineTuning` router'ı
bağlanırsa `execFile` + doğrulama; ertelenen tarama birimleri (müşteri toplu içe aktarma, müşteri/tedarikçi
CRUD, operasyonel/tohum dosyaları).

### 3. tur (ertelenen alanlar + küçük sertleştirmeler)
- **Müşteri toplu içe aktarma:** INSERT `company_id` yazmıyordu (müşteriler sahipsiz kalıyordu), tekrar kontrolü `user_id` ile yapılıyordu, istemci verisine güveniyordu → şirket kapsamlı, satır bazlı SAVEPOINT, satır doğrulaması.
- **Müşteri/tedarikçi CRUD ve müşteri rolü erişimi:** şirket kapsamı doğru; müşteri rolünde izin satırı olmadığından izinli uçlar varsayılan reddediyor, kalan açık uç rapor kapısıydı (2. turda kapandı).
- **Operasyonel dosyalar:** `scripts/reset-sessions.js` sabit `admin123` ile yönetici oluşturuyor/sıfırlıyordu → rastgele parola + üretim/onprem'de `--yes-reset-admin`; `migrate-db.js` üretimde varsayılan DB bağlantısına düşmüyor.
- **nginx:** `location /` ve statik varlıklarda güvenlik başlıkları miras alınmıyordu → tekrarlandı; SPA için `Content-Security-Policy-Report-Only` eklendi (konsolda ihlalleri gördükten sonra zorunlu CSP'ye çevir).
- **Sipariş:** `Order.update` artık şirket kapsamlı ve iş akışını zorlar (iptal yalnızca `cancel()`); `PATCH status=cancelled` stok iade eder; `cancel()` satır kilidi + durum yeniden kontrolü (çifte iptal = çifte stok iadesi engellendi).
- **AI onayları:** `AI_APPROVAL_TTL_HOURS` (24 sa) sonrası onay yürütülmez; talep eden pasifleşmişse yürütülmez. (Talep eden ≠ onaylayan kuralı bilinçli olarak uygulanmadı: tek yöneticili işletmelerde LLM işlemini insan onayı amacıyla onaylamak meşru.)
- **SMTP parolası** veritabanında AES-256-GCM ile şifreli (`SETTINGS_ENCRYPTION_KEY` > `ENCRYPTION_KEY` > `JWT_SECRET`); eski düz metin ilk okumada yükseltilir.
- **CI:** action'lar commit SHA'sına sabitlendi; `ci.yml` `permissions: contents: read`.

**Bilinen tutarsızlık (güvenlik dışı):** `orders.status` CHECK kısıtı yalnızca `pending/processing/completed/cancelled` kabul ediyor, iş akışı sabitleri ise `confirmed/shipped/delivered/refunded` da içeriyor → bu durumlara geçiş 500 veriyor (önceden var). Kasıtlıysa sabitler sadeleşmeli, değilse bir migration ile kısıt genişletilmeli.
