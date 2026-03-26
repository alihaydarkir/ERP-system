# ERP Release Notes — 26.03.2026

## Özet
Bu sürümde kritik sipariş akışı hataları giderildi, ürün silme davranışı veri bütünlüğünü koruyacak şekilde güçlendirildi, UI/Dark Mode tutarlılığı büyük ölçüde iyileştirildi ve yardımcı/config temizliği yapıldı.

## Commitler

### 1) fix(core): stabilize order flow and product delete fallback
**Commit:** 9c7cfb7

#### Dahil edilen ana iyileştirmeler
- Sipariş oluşturma akışında `items` array bozulmasına neden olan sanitize etkisi düzeltildi.
- Sipariş tamamla/iptal sonrası işlem başarılıyken görülen hatalı UI hata durumları düzeltildi.
- Ürün silme sırasında FK kaynaklı 500 hatasında hard delete yerine archive fallback uygulandı.
- Sipariş ve ürün akışlarında kullanıcıya dönen mesajlar daha anlamlı hale getirildi.

#### Etki
- Sipariş yaşam döngüsü daha stabil.
- Geçmiş sipariş verisi korunuyor.
- Ürün silme kaynaklı kritik hata oranı düşüyor.

---

### 2) feat(ui): dark mode consistency and component style standardization
**Commit:** 6dd0f95

#### Dahil edilen ana iyileştirmeler
- Çok sayıda sayfa ve bileşende dark mode kontrast/okunabilirlik iyileştirildi.
- Ortak UI bileşenleri standardize edildi (`Button`, `Card`, `Input`, `ConfirmDialog`, `Toast`).
- Tablo, kart, modal ve form alanlarında stil tutarlılığı artırıldı.
- Tailwind tema genişletmeleri ve ortak tasarım dili iyileştirmeleri uygulandı.

#### Etki
- Ekranlar arası görsel bütünlük arttı.
- Karanlık temada okunabilirlik belirgin şekilde iyileşti.
- Bakım maliyeti (UI tarafı) azaldı.

---

### 3) chore: cleanup utilities, config, and docs
**Commit:** 52dccbc

#### Dahil edilen ana iyileştirmeler
- Backend config/env yapısında düzenleme ve ek doğrulama dosyaları.
- Yardımcı fonksiyon testleri ve utility düzenlemeleri.
- Servis/store seviyesinde küçük temizlikler.
- Proje durum ve precommit rapor dokümanları eklendi.

#### Etki
- Kod tabanı daha düzenli ve sürdürülebilir.
- Konfigürasyon ve yardımcı katman daha net.
- Dokümantasyon güncelliği arttı.

## Risk ve Geri Dönüş Notu
- Değişiklikler 3 ayrı commit’e bölündüğü için gerektiğinde seçici rollback mümkündür.
- En kritik iş kuralı değişimi: referanslı ürünlerde fiziksel silme yerine arşivleme.

## Önerilen Doğrulama (Smoke)
1. Sipariş oluştur (çoklu item ile).
2. Sipariş tamamla/iptal et (UI ve backend yanıtı tutarlılığı).
3. Referanslı ürünü silmeyi dene (archive mesajı beklenir).
4. Referanssız ürünü silmeyi dene (normal silme beklenir).
5. Dark mode’da ürün/sipariş/fatura/satın alma ekranlarını hızlı gez.
