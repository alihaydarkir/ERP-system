# Şirket İçi Kurulum Modu (`DEPLOYMENT_MODE=onprem`)

Helix-Ware'in temel sözü: **müşteri verisi bizim altyapımızda durmaz.** Gerçek müşteri kurulumları
müşterinin kendi cihazında (ya da kendi adına açılmış bulut hesabında) çalışır. Bu mod, "veri dışarı
çıkmaz" sözünü yapılandırma hatasına bırakmadan **kodla** garanti eder.

## Açmak

Root `.env` (Docker Compose bunu backend'e aktarır):

```env
DEPLOYMENT_MODE=onprem
```

Varsayılan `cloud`'dur; bu durumda hiçbir davranış değişmez (demo ve geliştirme ortamı).

## onprem modunda ne değişir

| Konu | Davranış | Kod |
|---|---|---|
| Yapay zekâ sağlayıcısı | Yalnızca `AI_PROVIDER=ollama`. `openai` / `azure` seçilirse backend **açılmaz**. | `src/config/deployment.js`, `src/config/env.js` |
| Ollama adresi | `OLLAMA_BASE_URL` yerel/özel ağda olmalı (localhost, `host.docker.internal`, docker servis adı, 10.x, 172.16–31.x, 192.168.x, `*.local`). Dışarıdaki adres → backend açılmaz. | aynı |
| Ek savunma | Ayar sonradan değişse bile her AI çağrısında aynı kural tekrar kontrol edilir. | `src/services/aiGateway.js` (`ensureProviderSupported`) |
| Hata takibi (Sentry, backend) | `SENTRY_DSN` tanımlı olsa bile **kapalı** (hata kayıtlarında müşteri verisi olabilir). | `server.js`, `src/middleware/errorHandler.js` |
| super_admin rolü | Şirketler arası her şeyi gören rol müşteri cihazında arka kapı olurdu: giriş, token yenileme ve elde kalan token'lar **401**. | `src/config/deployment.js` (`superAdminAllowed`), `controllers/authController.js`, `middleware/auth.js` |
| Hata takibi (Sentry, frontend) | Frontend imajında Sentry yok: `.env*` dosyaları Docker derlemesine girmez (`.dockerignore`) ve `Dockerfile.frontend` `VITE_SENTRY_DSN` almaz. Müşteri imajına **eklenmemeli**. | `frontend/src/main.jsx` |

Kural ihlalinde açılış hatası örneği:

```
❌ Şirket içi kurulum (DEPLOYMENT_MODE=onprem) kuralları ihlal ediliyor:
- DEPLOYMENT_MODE=onprem iken AI_PROVIDER yalnızca "ollama" olabilir (şu an: "openai"). ...
```

## Dışarıya giden tek istek: döviz kuru

Chatbot'un kur aracı (`get_currency_rates`) `open.er-api.com` adresinden güncel USD/EUR/GBP kurunu
çeker. Bu istekte **hiçbir müşteri verisi gönderilmez** (yalnızca "USD kurları" istenir).
Varsayılan açıktır; müşteri isterse kapatır:

```env
ALLOW_EXTERNAL_RATES=false
```

Kapalıyken chatbot "Kur bilgisi bu kurulumda kapalı" der.

Müşterinin kendi SMTP sunucusu üzerinden giden e-postalar (Ayarlar → E-posta) müşterinin kendi
yapılandırmasıdır; biz bir adres sağlamayız.

## Testler

`backend/src/config/deployment.test.js`: mod varsayılanı, yerel adres tespiti, onprem + openai/azure
reddi, dış Ollama adresi reddi, Sentry'nin onprem'de kapalı kalması, kur aracının kapatılabilmesi.

## Süreli destek erişimi

Hata olduğunda müşteri yöneticisi **Ayarlar → Destek Erişimi**'nden Helix-Ware desteğine süreli izin verir.
İzin her iki modda da (`cloud`/`onprem`) çalışır; bağlantı yolundan (tünel, AnyDesk, VPN) bağımsızdır —
kontrol uygulamanın içindedir.

| Kural | Nasıl |
|---|---|
| Erişim müşteride | İzin yalnızca şirket yöneticisi tarafından açılır; süre 1 / 4 / 24 saat. Aynı anda tek izin. |
| Kalıcı şifre yok | Tek bir erişim kodu (`ABCD-EFGH-JKMN`) üretilir, ekranda bir kez gösterilir; DB'de yalnızca sha256 hash'i durur. Destek `/destek-girisi` sayfasından bu kodla girer. Destek hesabı normal girişle kullanılamaz. |
| Süre ve iptal | Her istekte izin kontrol edilir; süre dolunca veya "Şimdi iptal et" ile oturum anında düşer. Token yenileme izin bitişini aşamaz. |
| Yetki | Varsayılan **salt okunur** (yalnızca GET). "Düzeltme yapabilir" seçilirse kayıt değiştirebilir. |
| Hiçbir seviyede yapılamayanlar | Dışa aktarma (PDF/Excel), kendi iznini görme/uzatma, kullanıcı/rol/izin/şifre/2FA/güvenlik işlemleri. |
| Şeffaflık | Destek oturumunun **her isteği** (okuma dahil, reddedilenler dahil) `audit_logs`'a `is_support=true` ile yazılır; kartta "İşlemler" listesinde görünür. Destek girişinde yöneticilere anlık bildirim gider. Destek ekranında üstte "Destek oturumu" bandı vardır. |

Kod: `backend/src/services/supportAccessService.js`, `middleware/auth.js` (`applySupportSession`),
`routes/support.js`, `migrations/050_create_support_access_grants.sql`; arayüz
`components/Settings/SupportAccessSettings.jsx`, `pages/SupportLoginPage.jsx`.

### Uzaktan bağlantı (kademeli)

1. **Tanı paketi** — içeri girmeden: müşteri verisi içermeyen, maskelenmiş sistem özeti (aşağıda).
2. **Ekran paylaşımı** — fareyi müşteri kullanır (Meet/AnyDesk izleme modu); uygulamaya girmeyiz.
3. **Destek erişimi + geçici tünel** — gerçekten içeri girmek gerekirse: müşteri `destek-tuneli.ps1`
   ile yalnızca ERP'nin web arayüzünü açan geçici bir tünel başlatır (gelen port açılmaz, süre dolunca
   kapanır), üstüne yukarıdaki erişim koduyla girilir. Betik kurulum paketiyle gelecek.

AnyDesk ile tam kontrol önerilmez: ERP'yi değil bütün bilgisayarı açar.

### Tanı paketi

Müşteri yöneticisi **Ayarlar → Destek Erişimi → Tanı paketi indir** ile `helix-tani-YYYYMMDDHHmm.json`
indirir ve desteğe e-postayla gönderir (`GET /api/support/diagnostics`). Destek oturumu ve yönetici
olmayan kullanıcılar indiremez; her indirme `audit_logs`'a `DIAGNOSTICS_DOWNLOAD` olarak yazılır.

| İçerir | İçermez |
|---|---|
| Uygulama sürümü, Node/OS, bellek, çalışma süresi | Müşteri, ürün, sipariş, çek, fatura, kullanıcı kayıtları (bu tablolar sorgulanmaz) |
| Yapılandırma özeti: mod, AI sağlayıcı/model, Ollama yerel mi, Sentry/Redis/SMTP açık mı | Şifre, JWT secret, DSN, SMTP sunucu adı, Ollama adresi |
| Sağlık: DB sürümü/boyutu, Redis, AI (yüklü modeller) | |
| Migration durumu: uygulanan sayı, son 3, bekleyenler | |
| Son 300 `console.error`/`warn` kaydı + `logs/error.log` son 200 satır, **maskeli** | |

Maskeleme kayıt halkaya **yazılırken** yapılır, ham hali saklanmaz (`src/services/diagnosticsService.js`):
e-posta, JWT, `password=`/`token:` gibi sırlar, IBAN, 9+ haneli numaralar (telefon, vergi no), IP,
URL parametreleri, Postgres `Key (x)=(değer)` detayları ve tırnak içi değerler (`'id'`, `"company_id"`
gibi kod tanımlayıcıları okunabilir kalır). Halka bellekte durur; backend yeniden başlayınca boşalır.

### KVKK / veri işleyen sözleşmesine girecek maddeler

- Helix-Ware müşteri verisine varsayılan olarak erişemez; veri müşterinin cihazında/hesabında durur.
- Erişim yalnızca müşteri yöneticisinin açtığı, süreli (en fazla 24 saat) izinle ve yalnızca hata giderme amacıyla yapılır.
- Varsayılan erişim salt okunurdur; değişiklik yetkisi müşterinin ayrıca seçmesiyle verilir.
- Destek oturumunda veri dışa aktarılamaz, kopyalanıp saklanmaz.
- Her destek işlemi müşterinin kendi sisteminde kayıt altındadır ve müşteri tarafından görülebilir.
- Müşteri izni istediği an iptal edebilir.

## Şifreli yedek

`postgres_backup` servisi her gün `pg_dump` alır, 7 gün saklar (`docker/yedek/yedekle.sh`). Yalnız
**onprem** modunda müşteri yöneticisi **Ayarlar → Yedekler**'den şifrelemeyi kurar; kurulana kadar
yedekler şifresiz alınır ve ekran/log uyarır. İki hedef birlikte: parola müşteride kalır, **ve**
parola unutulsa bile veri kaybolmaz.

**Zarf şifreleme** ([age](https://age-encryption.org)):

- Kurulumda rastgele bir age anahtar çifti üretilir. Açık anahtar `/backups/.alici`'ye yazılır;
  yedek container'ı dump'ı **yalnız açık anahtarla** şifreler — sunucuda/container'da yedeği açabilecek
  bir sır durmaz.
- Özel anahtar iki ayrı "zarfa" sarılıp `/backups/.anahtar.json`'a yazılır (0600): (1) müşterinin
  **yedek parolası**, (2) kurulumda ekranda **bir kez** gösterilen, basılıp saklanacak **kurtarma kodu**
  (`XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`). Açık özel anahtar diske yazılmaz.
- Parola değişimi, "parolamı unuttum" (kurtarma koduyla yeni parola) ve yeni kurtarma kodu üretimi
  yalnız zarfları yeniler: **eski yedekler yeni parolayla/kodla açılmaya devam eder.**
- Şifreleme kurulunca eski şifresiz `.dump` dosyaları silinir.

| Kural | Nasıl |
|---|---|
| Kim yapar | Yalnız şirket yöneticisi; destek oturumu yedek ekranına giremez (`routes/backups.js`). |
| 2FA | Kurulum, parola değişimi, kurtarma kodu kullanımı/yenileme ve "son yedeği doğrula" 2FA kodu ister. 2FA kurulu değilse `TWO_FA_REQUIRED`. |
| Kaba kuvvet | Bu uçlar `sensitiveOperationsLimiter` ile sınırlı. |
| Kayıt | Her işlem `audit_logs` (`entity_type='backup_encryption'`); parola/kod asla loglanmaz. |
| Bildirim | Şirket yöneticilerine anlık + e-posta (müşterinin kendi SMTP'si, yoksa `.env` SMTP). `HELIX_BILDIRIM_EPOSTA` tanımlıysa Helix-Ware'e **yalnız** "firma, olay, zaman" gider — anahtar, parola, kod, veri asla. Boş bırakılırsa bize hiçbir şey gitmez. |
| Doğrulama | "Son yedeği doğrula": son yedek parolayla açılıp `PGDMP` başlığı okunur; veri ekrana çıkmaz. |

### Geri yükleme (cihazdaki betik)

Geri yükleme bilinçli olarak web arayüzünde **yok**: çalışan uygulamanın kendi veritabanını ezmesi
yerine ERP klasöründe yönetici bir betik çalıştırır.

```powershell
powershell -ExecutionPolicy Bypass -File kurulum\geri-yukle.ps1   # Windows
```
```bash
./kurulum/geri-yukle.sh                                            # Linux/macOS
```

Akış: yedekleri listele → seç → yedek parolası **ya da** kurtarma kodu (gizli girilir) → önce
`--kontrol` ile açılabildiği doğrulanır (açılmazsa hiçbir şey değişmez) → `EVET` onayı → mevcut hâlin
şifreli **güvenlik yedeği** (`..._geri-yukleme-oncesi.dump.age`) → frontend/backend durdurulur →
şifre çözme + `pg_restore` backend container'ında tek akışta yapılır (çözülmüş döküm diske/host'a
çıkmaz) → uygulama yeniden başlatılır. Araç: `backend/scripts/yedek-coz.js`
(`--liste` / `--kontrol` / `--geri-yukle`, sır stdin'den okunur).

Kod: `backend/src/services/{backupCrypto,backupService,backupNotifications}.js`,
`controllers/backupController.js`, `routes/backups.js`; `Dockerfile.backup`, `docker/yedek/yedekle.sh`;
arayüz `components/Settings/BackupSettings.jsx`.

> **Not:** 2FA'nın **sunucu tarafı** hazır (`/api/2fa/*`, girişte `/api/auth/2fa/verify`); kurulum ve giriş
> **arayüzü** henüz yok (sonraki PR). O gelene kadar yedek şifrelemesi ekrandan kurulamaz; müşteriye bu ikisi birlikte gider.

### KVKK maddesine ek

- Yedekler müşterinin parolasıyla açılabilen biçimde şifrelenir; Helix-Ware'de parola, kurtarma kodu
  ya da yedek bulunmaz ve Helix-Ware yedekleri açamaz.

## Sonraki adımlar (ayrı PR'lar)

1. **2FA arayüzü:** Profil/güvenlik sekmesinde QR ile kurulum + yedek kod gösterimi, girişte kod adımı (`requiresTwoFa` → `/api/auth/2fa/verify`).
   (Sunucu tarafı tamam: TOTP, yedek kodlar, tekrar kullanım koruması, deneme kilidi.)
2. **Kurulum betiği:** `kurulum.ps1` / `install.sh`; şifreler müşterinin makinesinde üretilir,
   güncellemeler GHCR'den çekilir (müşteriden bize bağlantı açılmaz).
