---
paths:
  - "backend/src/**"
  - "backend/scripts/**"
  - "backend/server.js"
---

# Backend kuralları

- **Çok kiracılılık:** Her sorgu ve kayıt `company_id` ile kapsamlanır (okuma, güncelleme, silme,
  import/export, `audit_log`). Geçmişte çek import/export ve işlem kaydında `company_id` eksiği
  şirketler arası veri sızıntısına yol açtı (PR #4, #5). Yeni model metodu → `company_id` parametresi.
- Yanıtlara `password_hash` veya başka gizli alan koyma (PR #2'deki sızıntı). Kullanıcı nesnesi
  dönerken alanları açıkça seç.
- Validator'lar (`src/validators/`, `src/utils/validators/`): formdan gelen boş string için
  `.empty('')`; boş integer FK → `NULL`.
- Backend hot-reload yok: kod değişince `docker compose restart backend`.
- Değişiklikten sonra `cd backend && npx jest` yeşil olmalı. Endpoint değişikliğini gerçek istekle
  doğrula (curl, `Origin: http://localhost:5173` + CSRF cookie).
- AI araçları (`src/services/tools/`): yeni araç → `toolSchemas` + `toolPermissionMatrix` (RBAC)
  birlikte güncellenir; ayrıntı `docs/SISTEM_HARITASI.md`.
