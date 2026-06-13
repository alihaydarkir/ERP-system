# ERP Sistemi — Mimari & Hata Haritası

> Oluşturma: 2026-06-13 · Kapsam: backend (özellikle AI chatbot alt sistemi) + canlı test bulguları
> Model: `qwen2.5:3b` (Ollama, yerel) · DB: PostgreSQL `erp_db` · company_id=1 demo verisi

Bu belge "ne nereye bağlı, ne işe yarar" sorusuna cevap verir ve sistemde tespit edilen
yanlış kodlamaları/eksikleri önem derecesiyle listeler.

---

## 1. Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| API | Node.js + Express (`server.js`) |
| Veritabanı | PostgreSQL (pgvector opsiyonel) |
| Kimlik | JWT (access+refresh cookie) + CSRF token cookie + 2FA |
| Gerçek zamanlı | WebSocket (`src/websocket/`) |
| LLM | Ollama gateway (`aiGateway.js`) — varsayılan `qwen2.5:3b` |
| Çok kiracılılık | `company_id` ile satır-seviyesi izolasyon |
| Frontend | React (`frontend/`) |

---

## 2. Yüksek Seviye Mimari

```
                    ┌─────────────┐
  React (frontend)  │  Tarayıcı   │
                    └──────┬──────┘
                           │ HTTPS / WS
                    ┌──────▼───────────────────────────────────┐
                    │  server.js (Express)                      │
                    │  - rate limit, helmet, cors, csrf, auth   │
                    └──────┬───────────────────────────────────┘
            ┌──────────────┼───────────────────────────────┐
            │              │                                │
      ┌─────▼─────┐  ┌─────▼─────┐                    ┌─────▼──────┐
      │  routes/  │  │ websocket │                    │ middleware │
      │ (28 dosya)│  │  notifier │                    │ auth/rbac  │
      └─────┬─────┘  └───────────┘                    └────────────┘
            │
      ┌─────▼───────┐
      │ controllers │  (her kaynak için: products, orders, cheques, ai, ...)
      └─────┬───────┘
            │
      ┌─────▼───────┐      ┌──────────────┐
      │  services   │─────▶│  models/     │──────▶ PostgreSQL
      │ (iş mantığı)│      │ (SQL erişim) │
      └─────────────┘      └──────────────┘
```

---

## 3. AI Chatbot — İstek Akışı (çekirdek)

İki giriş kapısı da **aynı motora** (`aiService.runAgent`) bağlanır:

```
POST /api/chat/message ──▶ chatController.sendMessage ─┐
POST /api/ai/chat ───────▶ aiController.agentChat ─────┼─▶ aiService.runAgent()
                                                        │
                                                        ▼
  ┌───────────────────────────────────────────────────────────────────────┐
  │ aiService.runAgent (src/services/aiService.js)                          │
  │  0. enforceRateLimit + sanitizeUserInput                               │
  │  1. isConfirmationMessage → bekleyen mutation'ı uygula                  │
  │  2. detectFormTool → create niyeti varsa form döndür                    │
  │  3. detectMutationIntent → yazma niyeti → ONAY akışı (aiApprovalService)│
  │  4. (sorgu yolu) orchestrator.run() ────────────┐                       │
  └─────────────────────────────────────────────────┼──────────────────────┘
                                                     ▼
  ┌───────────────────────────────────────────────────────────────────────┐
  │ AgentOrchestrator.run (src/services/agentOrchestrator.js)              │
  │  a. plan()      → LLM'e araç seçtir (JSON {steps:[...]})               │
  │  b. deterministik düzeltmeler:                                         │
  │       - "vadesi dolacak" → get_due_soon_cheques                        │
  │       - "ödeme riski"    → get_payment_risk_assessment  ★(yeni)        │
  │  c. mutation adımlarını sorgu yolundan ELE (güvenlik)                  │
  │  d. RBAC anahtar-kelime kontrolü (rol bazlı)                           │
  │  e. execute() → tools.execute() ile araçları çalıştır                  │
  │  f. verify() → veri tutarlılık kontrolü (hasActualData)                │
  │  g. respond() → LLM'e Türkçe doğal cevap yazdır (veri system prompt'ta)│
  └───────────────────────────────────────────────────────────────────────┘
                                                     ▼
                                         tools/ (query + mutation araçları)
                                                     ▼
                                              PostgreSQL
```

**Araç kayıt sistemi** (`src/services/tools/index.js` → `tools.execute`):
her araç çağrısında sırayla: `validateToolArgs` → `isToolAllowed` (RBAC) →
mutation ise `hasMutationPermission` → fonksiyonu `company_id/user_id/role` ile çalıştır.

---

## 4. AI Alt Sistemi — Dosya Sorumlulukları

| Dosya | Görevi | Bağlı olduğu |
|-------|--------|--------------|
| `aiService.js` | Ana orkestratör; rate limit, niyet tespiti (form/mutation/onay), mutation onay akışı | orchestrator, tools, aiApprovalService, notifier, PermissionService |
| `agentOrchestrator.js` | Sorgu yolu: planla→düzelt→ele→çalıştır→doğrula→yanıtla | aiGateway, tools, toolPermissionMatrix |
| `aiGateway.js` | LLM sağlayıcı soyutlaması (ollama/openai/azure), chat/generate/embeddings | Ollama HTTP |
| `tools/index.js` | Araç kayıt + `execute()` (validation+RBAC+permission sarmalayıcı) | queryTools, mutationTools, toolSchemas, toolPermissionMatrix |
| `tools/queryTools.js` | 21 salt-okuma aracı (raporlar, listeler, analizler) | PostgreSQL (parametreli) |
| `tools/mutationTools.js` | 17 yazma aracı (create/update/cancel/set) | models |
| `tools/toolSchemas.js` | Araç tanımları, parametre şemaları, `validateToolArgs`, `isMutationTool` | — |
| `tools/toolPermissionMatrix.js` | Rol→araç erişim matrisi (RBAC) | — |
| `aiApprovalService.js` | Yüksek riskli mutation'lar için onay kaydı | ApprovalRequest modeli |
| `ragService.js` | RAG bilgi getirme (pgvector embeddings) | RAGKnowledge, aiGateway |

---

## 5. Araç Kataloğu

### Salt-okuma (query) — 21 araç
`get_dashboard_summary` · `search_cheques` · `get_overdue_cheques` · `get_due_soon_cheques` ·
`get_financial_summary` · `get_low_stock_products` · `search_products` · `search_customers` ·
`get_orders_summary` · `get_orders_list` · `search_orders` · `get_suppliers_list` ·
`get_invoices_summary` · `get_warehouse_stock` · `get_top_customers` · `get_top_products` ·
`get_customer_detail` · `get_debt_aging_report` · `get_monthly_comparison` ·
`recommend_reorder` · `get_payment_risk_assessment`

### Yazma (mutation) — 17 araç (hepsi izin + çoğu onay gerektirir)
`set_product_stock` · `deactivate_product` · `cancel_order` · `set_cheque_status` ·
`create_customer` · `update_customer` · `create_product` · `update_product` ·
`create_supplier` · `update_supplier` · `create_warehouse` · `update_warehouse` ·
`create_cheque` · `set_order_status` · `create_order` · `activate_product` · `set_invoice_status`

**Yüksek riskli (her zaman onay):** `cancel_order`, `set_cheque_status`, `deactivate_product`

---

## 6. Canlı Test Sonuçları (qwen2.5:3b, gerçek DB)

10 senaryo `aiService.runAgent` üzerinden gerçek pipeline'dan geçirildi:

| # | Soru | Seçilen Araç | Sonuç |
|---|------|--------------|-------|
| 1 | Ödeme riski | `get_payment_risk_assessment` | ✅ Doğru araç + doğru veri |
| 2 | Tamamlanan siparişler neler? | `get_orders_list` | ✅ Sorgu (mutation değil), liste döndü |
| 3 | Depo stoklarını göster | `get_warehouse_stock` | ⚠️ Veri doğru (352/61/31) ama cevap Türkçesi bozuk, Istanbul deposu düşürüldü |
| 4 | Bu ayı geçen ayla karşılaştır | `get_monthly_comparison` | ❌ "veri bulunamadı" (bkz. Hata #1) |
| 5 | Envanter değeri nedir? | `get_warehouse_stock` | ❌ Yanlış araç + aritmetik halüsinasyon "352+61=413" (bkz. Hata #2) |
| 6 | Düşük stoklu ürünler | `get_low_stock_products` | ✅ Doğru |
| 7 | En iyi müşteriler | `get_top_customers` | ✅ Doğru |
| 8 | Vadesi yaklaşan çekler | `get_due_soon_cheques` | ✅ Doğru |
| 9 | Finansal özet | `get_financial_summary` | ✅ Doğru |
| 10 | merhaba | (selamlama) | ✅ Doğru |

**Özet:** Araç seçimi (önceki hataların kaynağı) artık **8/10 doğru**. Kalan 2 sorun
kısmen kod (Hata #1, #2), kısmen 3B model kalitesi.

---

## 7. HATA HARİTASI

### 🔴 Hata #1 — Aylık karşılaştırma "veri bulunamadı" diyor (KOD)
- **Konum:** `agentOrchestrator.js` → `hasActualData()` / `respond()` (satır ~275-303)
- **Neden:** `hasActualData` yalnızca sayısal `> 0` değer arar. `get_monthly_comparison`
  her zaman anlamlı bir `summary_text` döndürür; ama bu ay/geçen ay 0 tamamlanmış sipariş
  olunca tüm sayılar 0 → araç "boş" sayılıyor ve `respond()` "kayıt bulunamadı" basıyor.
- **Etki:** Geçerli "0 vs 0" / düşük hacimli karşılaştırmalar kullanıcıya yansımıyor.
- **Öneri:** `hasActualData` veya `respond`, bir araç `summary_text` içeriyorsa onu veri
  saysın; ya da karşılaştırma/özet araçlarını özel olarak ele alsın.

### 🟠 Hata #2 — "Envanter değeri" yanlış araca gidiyor + aritmetik (KOD/KAPSAM)
- **Konum:** Araç kataloğu (`queryTools.js` / `toolSchemas.js`) — `get_inventory_value` YOK.
- **Neden:** Parasal envanter değeri (Σ fiyat×stok) hesaplayan araç yok. Planner en yakın
  araç olarak `get_warehouse_stock` (adet) seçiyor; model adetleri toplayıp ("352+61=413")
  "asla aritmetik yapma" kuralını ihlal ediyor ve adet ile değeri karıştırıyor.
- **Öneri:** `get_inventory_value` aracı ekle: `SUM(price * stock_quantity)` (kategori kırılımı
  opsiyonel). Alternatif: "envanter değeri" için deterministik yönlendirme.

### 🟡 Hata #3 — Depo cevabında bozuk Türkçe / eksik depo (MODEL KALİTESİ)
- **Konum:** Veri katmanı doğru (`get_warehouse_stock` Ana Depo Istanbul=31, Ankara=352,
  Bursa=61 döndürüyor). Sorun `respond()` LLM çıktısında.
- **Neden:** 3B model çok-kayıtlı listeyi düzgün aktaramıyor, bir depoyu düşürüp anlamsız
  cümle kuruyor.
- **Öneri:** Kod hatası değil. Çözüm: (a) liste-tipi araçlar için cevabı LLM'e bırakmadan
  şablonla biçimlendir, ya da (b) `aya-expanse:8b`/`qwen2.5:7b`'ye geç (4GB VRAM kısıtı var).

### 🟡 Hata #4 — "Tamamlanan siparişler" status filtresi garanti değil (PLANNER)
- **Konum:** `get_orders_list` `status` parametresini destekliyor ama planner her zaman
  `status:'completed'` geçmeyebiliyor; model son siparişleri "tamamlandı" diye etiketliyor.
- **Öneri:** "tamamlanan/iptal/bekleyen sipariş" ifadeleri için deterministik `status`
  enjeksiyonu (Hata #1'in çözüldüğü düzeltme deseniyle aynı yerde).

### 🟡 Hata #5 — Migration runner idempotent değil (ALTYAPI)
- **Konum:** `scripts/migrate-db.js` (satır 16-23)
- **Neden:** Uygulanmış migration takibi yok; her çağrıda TÜM `.sql`'ler baştan çalışıyor.
  Idempotent olmayan tek bir migration tüm zinciri kırar (028'in `customer` rolünü dışlayan
  CHECK constraint'i bu yüzden patlıyordu — düzeltildi).
- **Öneri:** `schema_migrations` tablosu ile "uygulandı mı" takibi ekle; her migration'ı
  ayrı transaction'da çalıştır.

---

## 8. Doğrulanan Sağlıklı Alanlar ✅

- **Tenant izolasyonu:** `queryTools.js`'teki tüm sorgular `company_id = $1` ile filtreli.
- **SQL injection yok:** Tüm sorgular parametreli (`$1, $2...`).
- **Çok-katmanlı RBAC:** `toolPermissionMatrix` + `isToolAllowed` + `hasMutationPermission`
  + rol anahtar-kelime kontrolleri (customer/user/manager kısıtları).
- **Mutation güvenliği:** Sorgu yolunda mutation araçları eleniyor; yazma işlemleri ayrı
  onay akışında (yüksek risk → `aiApprovalService` + WebSocket bildirimi).
- **Türkçe-duyarlı arama:** `trLike()` → `LOWER(TRANSLATE(...))` (İ/ı, Ş, Ç vb.).
- **Para/format temizliği:** `sanitizeCurrencyInAnswer` (₺, binlik ayırıcı).
- **Testler:** 17/17 süit, 106/106 test yeşil.

---

## 9. Öncelikli Öneriler

1. **Hata #1** (aylık karşılaştırma) — küçük, net kod düzeltmesi; en görünür kullanıcı hatası.
2. **Hata #2** — `get_inventory_value` aracı ekle (kapsam boşluğu).
3. **Hata #5** — migration runner'a idempotency tablosu (gelecekteki kırılmaları önler).
4. **Hata #3/#4** — liste/özet araçları için şablon-tabanlı biçimlendirme (3B model
   bağımlılığını azaltır) veya donanım izin verirse daha büyük model.
