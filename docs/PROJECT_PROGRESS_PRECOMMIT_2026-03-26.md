# ERP Projesi – Commit Öncesi Durum Özeti (26.03.2026)

Bu belge, commit atmadan önce mevcut çalışma alanının anlık durumunu özetler.

## 1) Genel İlerleme (Güncel Snapshot)
- Genel proje ilerlemesi: **~%84**
- Backend işlevsellik: **~%89**
- Frontend ekran/akış: **~%83**
- Güvenlik sertleştirme: **~%80**
- Test/QA olgunluğu: **~%62**

> Not: Bu yüzdeler teknik durum + açık işler dikkate alınarak güncellenmiş yaklaşık değerlerdir.

## 2) Bu Turda Net İlerlemiş Konular
- Sipariş oluşturma hatası (`items must be an array`) kök neden düzeltildi (body array sanitization bozulması giderildi).
- Sipariş tamamla/iptal akışında "işlem başarılı ama UI hata" davranışı düzeltildi.
- Quantity kontrol bileşenlerinde (sipariş ekranları) stil/erişilebilirlik/karanlık tema tutarlılığı artırıldı.
- Ürün silme 500 hatası için referanslı ürünlerde **arşivleme (soft deactivate)** fallback uygulandı.
- Ürün modalı dahil birden fazla ekranda dark mode okunabilirliği iyileştirildi.

## 3) Veri Bütünlüğü Kararı (Önemli)
- `order_items -> products` ilişkisindeki kısıt nedeniyle geçmiş siparişleri korumak adına:
  - Referanslı ürünlerde hard delete yerine arşivleme uygulanıyor.
  - Böylece sipariş geçmişi bozulmuyor, kullanıcı da 500 yerine anlamlı başarı mesajı alıyor.

## 4) Çalışma Ağacı (Commit Öncesi)
- Değişmiş dosya sayısı: **86**
- Yeni (untracked) dosya sayısı: **7**
- Toplam bekleyen değişiklik: **93 dosya**

Bu sayı tek commit için yüksek olduğundan, mantıksal commit dilimlerine bölmek daha güvenli olur.

## 5) Doğrulama Durumu
- Frontend build: **başarılı**
- Frontend lint: **hatasız**
- Backend lint: **error yok**, warning mevcut (çoğu `no-console`/kullanılmayan değişken tipi)

## 6) Commit Öncesi Risk/Öneri
### Risk
- Değişiklik seti çok geniş (93 dosya) → rollback ve inceleme zorlaşır.

### Önerilen commit sırası
1. **Kritik bugfix commit**
   - Sipariş create/cancel/complete düzeltmeleri
   - Product delete fallback (archive)
2. **UI/Theme commit**
   - Dark mode ve bileşen standardizasyonu
3. **Refactor/cleanup commit**
   - Yardımcı dosyalar, küçük düzenlemeler, stil temizliği

## 7) Kısa Sonuç
Proje şu an "kritik akışlar toparlanmış + UI stabilizasyonu ilerlemiş" durumda. Commit atılabilir, ancak mevcut diff büyüklüğü nedeniyle **parçalı ve konu bazlı commit** önerilir.

---

## 8) Bu sıraya göre pratik uygulama planı (Hemen yapılacaklar)

### A) 1. Commit — Kritik bugfix
Bu committe sadece akışı kıran düzeltmeler olmalı.

**Öncelikli dosyalar:**
- [backend/src/middleware/security.js](backend/src/middleware/security.js)
- [backend/src/controllers/orderController.js](backend/src/controllers/orderController.js)
- [backend/src/models/Product.js](backend/src/models/Product.js)
- [backend/src/controllers/productController.js](backend/src/controllers/productController.js)
- [frontend/src/pages/OrdersPage.jsx](frontend/src/pages/OrdersPage.jsx)
- [frontend/src/components/Orders/OrderCart.jsx](frontend/src/components/Orders/OrderCart.jsx)
- [frontend/src/components/Orders/AddProductToOrder.jsx](frontend/src/components/Orders/AddProductToOrder.jsx)
- [frontend/src/pages/ProductsPage.jsx](frontend/src/pages/ProductsPage.jsx)

**Commit mesajı (öneri):**
- `fix(core): stabilize order flow and product delete fallback`

### B) 2. Commit — UI/Theme
Bu committe sadece görünüm, dark mode, stil standardizasyonu olmalı.

**Dahil edilecek ana alanlar:**
- [frontend/src/index.css](frontend/src/index.css)
- [frontend/tailwind.config.js](frontend/tailwind.config.js)
- [frontend/src/components/UI/ConfirmDialog.jsx](frontend/src/components/UI/ConfirmDialog.jsx)
- [frontend/src/components/UI/Toast.jsx](frontend/src/components/UI/Toast.jsx)
- Sayfa/bileşen tarafındaki dark mode ve tasarım düzenlemeleri:
   - [frontend/src/pages](frontend/src/pages)
   - [frontend/src/components](frontend/src/components)

**Commit mesajı (öneri):**
- `feat(ui): dark mode consistency and component style standardization`

### C) 3. Commit — Refactor/Cleanup
Bu committe fonksiyonel etki düşük, düzenleyici/temizlik değişiklikleri olmalı.

**Örnek kapsam:**
- [frontend/src/services/authService.js](frontend/src/services/authService.js)
- [frontend/src/services/currencyService.js](frontend/src/services/currencyService.js)
- [frontend/src/store/userProfileStore.js](frontend/src/store/userProfileStore.js)
- [backend/src/config/env.js](backend/src/config/env.js)
- [backend/src/utils/helpers.test.js](backend/src/utils/helpers.test.js)
- [docs/PROJECT_PROGRESS_PRECOMMIT_2026-03-26.md](docs/PROJECT_PROGRESS_PRECOMMIT_2026-03-26.md)
- [package-lock.json](package-lock.json)

**Commit mesajı (öneri):**
- `chore: cleanup utilities, config, and docs`

### D) Her commit öncesi kısa kontrol
1. Sadece ilgili dosyalar stage’de mi kontrol et.
2. Diff’i hızlıca gözden geçir (commit konusu dışı dosya kalmasın).
3. Commit at.
4. Sonraki commit için stage’i temizle, aynı döngüyü tekrarla.

### E) Son kontrol
- 3 commit tamamlandıktan sonra çalışma ağacında bekleyen dosyaları tekrar gözden geçir.
- Konu dışı kalan dosya varsa ayrı bir 4. commit (`chore: leftover cleanup`) ile izole et.
