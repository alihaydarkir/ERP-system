---
paths:
  - "frontend/src/**"
---

# Frontend kuralları

- React 18 + Vite, yeni JSX dönüşümü: `import React` gerekmez.
- Store (zustand, `src/store/`) fonksiyonlarını kullanmadan önce hook'tan destructure et.
  (`EmailSettings.jsx` tanımsız `bulkUpdateSettings`/`testEmail` çağırıyordu → ESLint `no-undef`.)
- Liste/rapor export'ları backend'den: `services/exportService.js` → `POST /api/export/pdf|excel`.
  Frontend'de jsPDF ile yeni export yazma (tek istisna: E-Fatura PDF).
- Form alanları backend validator'ıyla aynı olmalı (form↔backend "drift" bu projede sık hata kaynağı);
  yeni alan → `backend/src/validators/` ile birlikte değiştir.
- Kontrol: `cd frontend && npm run lint && npx vitest run`.
