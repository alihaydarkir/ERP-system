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

## Sonraki adımlar (ayrı PR'lar)

1. **Süreli destek erişimi:** Hata durumunda müşteri yöneticisi süreli (örn. 4 saat) destek erişimi
   açar; her işlem audit log'a `support=true` ile yazılır, süre dolunca erişim kapanır. Ek olarak
   müşteri verisi içermeyen "tanı paketi" indirme.
2. **Şifreli yedek:** Dump'lar müşterinin parolasıyla şifrelenir, geri yükleme betiği.
3. **Kurulum betiği:** `kurulum.ps1` / `install.sh`; şifreler müşterinin makinesinde üretilir,
   güncellemeler GHCR'den çekilir (müşteriden bize bağlantı açılmaz).
