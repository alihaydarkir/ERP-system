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

1. **Tanı paketi** — içeri girmeden: müşteri verisi içermeyen, maskelenmiş sistem logları (sonraki PR).
2. **Ekran paylaşımı** — fareyi müşteri kullanır (Meet/AnyDesk izleme modu); uygulamaya girmeyiz.
3. **Destek erişimi + geçici tünel** — gerçekten içeri girmek gerekirse: müşteri `destek-tuneli.ps1`
   ile yalnızca ERP'nin web arayüzünü açan geçici bir tünel başlatır (gelen port açılmaz, süre dolunca
   kapanır), üstüne yukarıdaki erişim koduyla girilir. Betik kurulum paketiyle gelecek.

AnyDesk ile tam kontrol önerilmez: ERP'yi değil bütün bilgisayarı açar.

### KVKK / veri işleyen sözleşmesine girecek maddeler

- Helix-Ware müşteri verisine varsayılan olarak erişemez; veri müşterinin cihazında/hesabında durur.
- Erişim yalnızca müşteri yöneticisinin açtığı, süreli (en fazla 24 saat) izinle ve yalnızca hata giderme amacıyla yapılır.
- Varsayılan erişim salt okunurdur; değişiklik yetkisi müşterinin ayrıca seçmesiyle verilir.
- Destek oturumunda veri dışa aktarılamaz, kopyalanıp saklanmaz.
- Her destek işlemi müşterinin kendi sisteminde kayıt altındadır ve müşteri tarafından görülebilir.
- Müşteri izni istediği an iptal edebilir.

## Sonraki adımlar (ayrı PR'lar)

1. **Tanı paketi + `super_admin` kısıtı:** müşteri verisi içermeyen, maskelenmiş "tanı paketi" indirme;
   onprem'de `super_admin` rolünün devre dışı kalması.
2. **Şifreli yedek:** Dump'lar müşterinin parolasıyla şifrelenir, geri yükleme betiği.
3. **Kurulum betiği:** `kurulum.ps1` / `install.sh`; şifreler müşterinin makinesinde üretilir,
   güncellemeler GHCR'den çekilir (müşteriden bize bağlantı açılmaz).
