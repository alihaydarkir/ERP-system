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
- Tailwind v4 tüm kaynak metnini (yorumlar dahil) sınıf adayı olarak tarar: `[-:T]` gibi köşeli parantez
  içinde `:` olan regex/metin "arbitrary property" sanılır → `npm run build` "lightningcss minify
  Unexpected token Semicolon" ile kırılır (lint/vitest yakalamaz). Böyle bir şey yazınca build'i dene.
- Kontrol: `cd frontend && npm run lint && npx vitest run` (+ CSS/regex değişikliğinde `npm run build`).
