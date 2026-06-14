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
ollama pull qwen2.5:3b           # Windows (4GB VRAM). Mac M3 Pro: ollama pull qwen3:30b-a3b

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
- **Windows**: `qwen2.5:3b` (4GB VRAM sınırı; 7B+ sığmaz).
- **Mac M3 Pro (36GB)**: `qwen3:30b-a3b` önerilir (asıl kalite sıçraması). `.env`'de `OLLAMA_MODEL`.

## AI chatbot mimarisi
`POST /api/chat` veya `/api/ai/chat` → `aiService.runAgent` (`backend/src/services/aiService.js`)
→ niyet tespiti (form/mutation/onay) → sorgu yolu `AgentOrchestrator`
(`backend/src/services/agentOrchestrator.js`): **plan (LLM) → deterministik düzeltmeler →
mutation'ları ele → araç çalıştır → respond (LLM)**.
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
