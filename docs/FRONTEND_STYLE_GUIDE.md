# Frontend Style Guide

## 1) Tasarım Prensipleri
- Tek tip boş/yüklenme/hata durumları için ortak bileşen kullanın.
- Ana aksiyonlar için renk semantiği sabit olmalı:
  - Primary: mavi
  - Success: yeşil
  - Danger: kırmızı
  - Info: indigo

## 2) Form Standardı
- Tüm alanlarda görünür label zorunlu.
- Hata mesajları input altına ve `aria-describedby` ile bağlanmalı.
- Submit öncesi client-side validation çalışmalı.

## 3) Erişilebilirlik
- Modal bileşenlerinde:
  - `role="dialog"`, `aria-modal="true"`
  - Escape ile kapatma
  - İlk odaklanabilir elemana otomatik focus
- Butonlar ve interaktif ikonlar klavye ile erişilebilir olmalı.

## 4) Permission UX
- Yetkisiz aksiyonlar tamamen kaybolmak yerine kritik ekranlarda disabled görünmeli.
- Disabled butonda açıklayıcı tooltip/title olmalı.

## 5) Routing ve Performans
- Sayfa route bileşenleri `React.lazy` ile yüklenmeli.
- `Suspense` fallback olarak standart `PageLoader` kullanılmalı.

## 6) Test Stratejisi
- E2E (Playwright): login, auth navigation, temel smoke akışları.
- Unit/Component (Vitest): form validator fonksiyonları, küçük UI yardımcı bileşenler.

## 7) Dosya Organizasyonu
- `src/components/UI`: yeniden kullanılabilir UI atom/molekülleri.
- `src/utils/validators`: domain bazlı form doğrulama fonksiyonları.
- `e2e/`: kritik kullanıcı akışı senaryoları.
