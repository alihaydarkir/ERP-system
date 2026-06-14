# ERP System — Proje Notları (Claude Code Handoff)

> Bu dosya, yeni bir Claude Code oturumunun projeyi hızlıca anlaması için otomatik yüklenir.
> İletişim **Türkçe**. Repo: https://github.com/alihaydarkir/ERP-system

## Proje nedir
Çok kiracılı (multi-tenant) **ERP sistemi** + **AI chatbot**.
- **Backend**: Node.js + Express (`backend/`), PostgreSQL (pgvector), Redis (opsiyonel)
- **Frontend**: React + Vite (`frontend/`)
- **LLM**: Yerel **Ollama** (chatbot). Ollama **container'da DEĞİL, host'ta native** çalışır.
- Kimlik: JWT (access+refresh cookie) + CSRF token cookie + 2FA.

## Çalıştırma (Docker + host Ollama)
```bash
# Ön koşul: host'ta Ollama 0.0.0.0'a bind olmalı (container erişimi için)
#   Windows: setx OLLAMA_HOST "0.0.0.0:11434"  + Ollama'yi yeniden baslat
#   macOS:   launchctl setenv OLLAMA_HOST "0.0.0.0:11434" + yeniden baslat
ollama pull qwen2.5:7b           # Önerilen (native tool calling + iyi Türkçe)
# Modelfile'dan custom model oluştur (opsiyonel):
# cd backend && ollama create erp-assistant-7b -f Modelfile && OLLAMA_MODEL=erp-assistant-7b

# .env'ler: root .env (DB_PASSWORD, REDIS_PASSWORD, OLLAMA_MODEL) + backend/.env (JWT_SECRET)
docker compose up -d             # postgres(pgvector)+redis+backend+frontend (Ollama HARIC)
docker compose exec backend npm run seed     # Turkce demo veri (idempotent degil, fresh DB icin)
```
- Frontend: **http://localhost:5173** · Backend API: http://localhost:5000
- Backend container → host Ollama: `OLLAMA_BASE_URL=http://host.docker.internal:11434`
- Migration backend açılışında otomatik çalışır (`scripts/migrate-db.js`, idempotent —
  `schema_migrations` takipli). `npm run seed` = `seed_presentation.js` (Türkçe demo).

## Giriş bilgileri (seed sonrası)
`admin@erp.local` / `Admin123!` · ayrıca `manager@erp.local`, `user@erp.local` (aynı şifre).

## Model
- **Önerilen**: `qwen2.5:7b` — native tool calling desteği var, Türkçe kalitesi 3b'den çok daha iyi.
- **Düşük VRAM (4GB)**: `qwen2.5:3b` (performans düşer, tool calling yine çalışır).
- `.env`'de `OLLAMA_MODEL=qwen2.5:7b`.

## AI chatbot mimarisi
`POST /api/chat` veya `/api/ai/chat` → `aiService.runAgent` (`backend/src/services/aiService.js`)
→ niyet tespiti (form/mutation/onay) → sorgu yolu `AgentOrchestrator`
(`backend/src/services/agentOrchestrator.js`): **planWithTools (Ollama tool calling API) →
deterministik güvenlik ağları → araç çalıştır → respond (LLM)**.

**planWithTools akışı:** `tools.toOllamaTools(role)` ile RBAC'e göre filtrelenmiş araç listesi
`aiGateway.chatWithTools()` aracılığıyla modele gönderilir. Model doğrudan `tool_calls` döndürür,
JSON parse gerekmez. `agentOrchestrator.js`'deki deterministik düzeltmeler artık nadir tetiklenir.
- Araçlar: `backend/src/services/tools/` (queryTools, mutationTools, toolSchemas, toolPermissionMatrix).
- Tam mimari + hata haritası: **`docs/SISTEM_HARITASI.md`**.

## Önemli geçmiş (bu projede yapıldı)
- **Docker'a taşıma**: Ollama harici (host); `.dockerignore` (4GB GGUF dışlandı);
  bcrypt→bcryptjs (native derleme yok, arm64 uyumlu); frontend dev build `target: build` +
  2G bellek (esbuild OOM); migration runner idempotency (`schema_migrations`).
- **Fresh-DB engelleyicileri**: migration 022/024 sıralama (company_id/companies atıfı kaldırıldı);
  seed çok-kiracılılık uyumu (staff users + user_id/order_number/received_date).
- **Frontend↔backend form bug'ları**: depo/çek/fatura/tedarikçi create endpoint'leri, boş-email
  reddi (security.js), tedarikçi ek alanları (migration 044: website/location/lead_time_days/
  min_order_quantity/risk_level).
- **Chatbot düzeltmeleri** (haritada): #1 aylık karşılaştırma, #2 envanter değeri aracı,
  #4 sipariş status enjeksiyonu, #5 migration idempotency. Kalan: #3 (3B model Türkçe kalitesi).
- **Müşteri formu**: telefon zorunlu (frontend + `validators.js` create/update, 10-20 hane).
- **Çek düzeltmeleri**: Excel export audit_log `company_id` eksiği (import de); update'te boş
  integer FK (`customer_id`/`given_to_customer_id`) → NULL; status şeması gerçek durumlarla
  hizalandı (`chequeValidator.js`: pending/paid/cancelled/teminat/musteriye_verildi) + durum
  değişiminde teminat bankası / müşteri alanları kaydediliyor (`Cheque.updateStatus` extra).
- **PDF/Excel export birleştirme**: TÜM liste export'ları (müşteri/ürün/sipariş/tedarikçi/çek +
  raporlar) tek backend kaynağından — `utils/pdfTable.js` + `utils/excelTable.js`, generic
  `POST /api/export/pdf|excel` (`exportController`/`routes/export.js`). Frontend
  `services/exportService.js` → `exportUtils.js` ham Türkçe veri gönderir (eski jsPDF
  transliterasyonu kalktı). Stil: Kurumsal Lacivert (`#1e3a5f`), DejaVu font (Türkçe + ₺,
  `Dockerfile.backend`'de `apk font-dejavu`), dar `#` kolonu, tek satır (`lineBreak:false`+ellipsis),
  TR saati (`Europe/Istanbul`), tek sayfa (footer alt-margin hilesi). **E-Fatura PDF hariç**
  (hâlâ frontend jsPDF, `exportInvoiceToPDF`). Raporlar `#` sütunu 1'den artan (ASC).

## Bilinen kalan işler
- 3B modelin Türkçe respond kalitesi (model kaynaklı; Mac'te büyük model çözer).
- Fatura listesi seed'de boş (form çalışıyor — UI'dan eklenebilir).
- Diğer modüllerde benzer form↔backend "drift" olabilir; test ederken çıkanlar tek tek düzeltiliyor.

## Çalışma konvansiyonları
- Değişiklikten sonra: `cd backend && npx jest` (**108 test**) yeşil olmalı; create/endpoint
  değişikliklerini gerçek istekle (curl, Origin: http://localhost:5173 + CSRF cookie) doğrula.
- Backend `node server.js` ile çalışır (hot-reload yok) → kod değişince `docker compose restart backend`.
- Commit mesajları Türkçe + `Co-Authored-By: Claude`. Komut timeout'larını kısa tut.
- Validator'larda formdan gelen boş string'ler için `.empty('')`; opsiyonel email'de boş atlanır.
