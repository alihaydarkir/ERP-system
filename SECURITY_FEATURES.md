# 🔒 Güvenlik Özellikleri - ERP Sistemi

## ✅ Uygulanan Güvenlik Katmanları

### 1. **Rate Limiting (Hız Sınırlama)**
Backend'de 4 farklı seviyede hız sınırlayıcı aktif:

#### Genel Limiter
- **Kapsam**: Tüm API endpoint'leri
- **Limit**: 15 dakikada 100 istek
- **Amaç**: Genel API kötüye kullanımını önleme

#### Strict Limiter (Katı Limiter)
- **Kapsam**: Login ve Register endpoint'leri
- **Limit**: 15 dakikada 5 istek
- **Amaç**: Brute force saldırılarını engelleme

#### Password Reset Limiter
- **Kapsam**: Şifre sıfırlama endpoint'leri
- **Limit**: Saatte 3 istek
- **Amaç**: Şifre sıfırlama istismarını önleme

#### Sensitive Operations Limiter
- **Kapsam**: Kullanıcı yönetimi (oluşturma, güncelleme, silme)
- **Limit**: Saatte 10 istek
- **Amaç**: Kritik işlemlerde ekstra koruma

---

### 2. **IP Bazlı Erişim Kontrolü**

#### Blacklist Sistemi
- Veritabanı: `ip_blacklist` tablosu
- **Özellikler**:
  - Kalıcı veya geçici engelleme (expires_at)
  - Engelleme nedeni kaydetme
  - Kim tarafından engellendiği bilgisi
  - Otomatik süre dolma

#### Otomatik IP Engelleme
- 5 dakikada 10'dan fazla başarısız istek → Otomatik engelleme
- Şüpheli aktivite tespiti ve loglama
- IP bazlı takip ve analiz

---

### 3. **Login Güvenliği**

#### Login Attempts Tracking
- **Veritabanı**: `login_attempts` tablosu
- Her giriş denemesi kaydedilir:
  - IP adresi
  - Kullanıcı adı
  - Başarılı/Başarısız durumu
  - User Agent bilgisi
  - Zaman damgası

#### Brute Force Koruması
- Son 15 dakikada 5+ başarısız deneme → Bloke
- IP bazlı kontrol
- Türkçe hata mesajları

---

### 4. **Session Yönetimi**

#### Active Sessions Tracking
- **Veritabanı**: `user_sessions` tablosu
- Her kullanıcı oturumu kaydedilir:
  - Session token
  - IP adresi
  - User Agent
  - Son aktivite zamanı
  - Oluşturulma tarihi

#### Multi-Device Detection
- Aynı kullanıcının 5+ cihazdan giriş tespiti
- Şüpheli multi-device kullanımı uyarısı
- Oturum sonlandırma yetkisi (admin)

---

### 5. **SQL Injection Koruması**

Yaygın SQL injection pattern'leri tespit edilir:
- `UNION SELECT`
- `DROP TABLE`
- `INSERT INTO`
- `DELETE FROM`
- SQL yorumları (`--`, `/*`)
- Hex encoding denemeleri

---

### 6. **HTTP Security Headers (Helmet)**

#### Content Security Policy (CSP)
```javascript
defaultSrc: ["'self'"]
scriptSrc: ["'self'", "'unsafe-inline'"]
styleSrc: ["'self'", "'unsafe-inline'"]
imgSrc: ["'self'", "data:", "https:"]
connectSrc: ["'self'"]
```

#### Diğer Security Headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: no-referrer
- Strict-Transport-Security

---

### 7. **CORS Yapılandırması**

- İzin verilen origin: `http://localhost:5173` (frontend)
- İzin verilen metodlar: GET, POST, PUT, DELETE
- Credentials: Aktif
- Custom headers desteği (X-CSRF-Token)

---

### 8. **Request Size Limitleri**

- JSON: Maksimum 10MB
- URL-encoded: Maksimum 10MB
- Amaç: DoS saldırılarını önleme

---

## 📊 Güvenlik Monitoring API

### Yeni Endpoint'ler (Admin Yetkisi Gerekli)

#### 1. Güvenlik İstatistikleri
```
GET /api/security/stats
```
Dönen bilgiler:
- Bugünkü başarısız giriş denemeleri
- Aktif IP engellemeleri
- Son 24 saatteki aktif oturumlar
- Son 7 günün başarısız giriş trendi

#### 2. IP Blacklist Yönetimi
```
GET    /api/security/blacklist       # Liste görüntüleme
POST   /api/security/blacklist       # IP engelleme
DELETE /api/security/blacklist/:ip   # IP engelini kaldırma
```

#### 3. Login Attempts Monitoring
```
GET /api/security/login-attempts?limit=100&failed_only=true
```
Parametreler:
- `limit`: Maksimum kayıt sayısı
- `failed_only`: Sadece başarısız denemeleri göster

#### 4. Active Sessions Management
```
GET    /api/security/sessions           # Aktif oturumları listele
DELETE /api/security/sessions/:id       # Oturumu sonlandır
```

---

## 🔐 Activity Logging

Tüm kritik işlemler `activity_logs` tablosuna kaydedilir:
- **Auth**: Login, logout, register, password reset
- **Products**: Create, update, delete
- **Orders**: Create, update, delete
- **Customers**: Create, update, delete
- **Cheques**: Create, update, status change, delete
- **Settings**: Update, bulk update
- **Import**: Excel import işlemleri
- **User Management**: Create, update, delete, role change

Her log kaydı içerir:
- Kullanıcı ID
- İşlem tipi
- Modül adı
- Detaylar (JSON)
- IP adresi
- User Agent
- Zaman damgası

---

## 🛡️ Güvenlik Kontrol Listesi

### ✅ Tamamlanan
- [x] Rate limiting (4 seviye)
- [x] IP blacklist sistemi
- [x] Login attempts tracking
- [x] Session management
- [x] SQL injection koruması
- [x] Helmet security headers
- [x] CORS yapılandırması
- [x] Request size limitleri
- [x] Activity logging (tüm modüller)
- [x] Güvenlik monitoring API
- [x] Database migrations (021_create_security_tables.sql)

### 🔄 Geliştirilebilir
- [ ] Email notifications (şüpheli aktivite bildirimleri)
- [ ] 2FA zorunlu hale getirme seçeneği
- [ ] IP geolocation tracking
- [ ] Advanced threat detection (ML tabanlı)
- [ ] Security dashboard (frontend UI)
- [ ] Automated security reports
- [ ] API key management
- [ ] OAuth2 integration

---

## 📝 Kullanım Örnekleri

### Admin: IP Engelleme
```bash
POST /api/security/blacklist
Authorization: Bearer <admin_token>

{
  "ip_address": "192.168.1.100",
  "reason": "Multiple failed login attempts",
  "expires_at": "2025-12-07T00:00:00Z"  # veya null (kalıcı)
}
```

### Admin: Güvenlik İstatistiklerini Görme
```bash
GET /api/security/stats
Authorization: Bearer <admin_token>
```

Yanıt:
```json
{
  "success": true,
  "data": {
    "failedLoginsToday": 23,
    "activeBlocks": 5,
    "activeSessions": 12,
    "weeklyTrend": [
      { "date": "2025-12-06", "count": 23 },
      { "date": "2025-12-05", "count": 15 }
    ]
  }
}
```

### Admin: Oturumu Sonlandırma
```bash
DELETE /api/security/sessions/123
Authorization: Bearer <admin_token>
```

---

## 🚨 Güvenlik Olayları

### Otomatik Tetikleyiciler

1. **Çok Fazla Başarısız Giriş**
   - Durum: 15 dakikada 5+ başarısız deneme
   - Aksiyon: IP otomatik bloke, HTTP 429 döner
   - Mesaj: "Çok fazla başarısız giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin."

2. **Şüpheli Aktivite**
   - Durum: 5 dakikada 10+ başarısız istek
   - Aksiyon: IP otomatik blacklist'e eklenir
   - Log: activity_logs tablosuna kaydedilir

3. **SQL Injection Denemesi**
   - Durum: Request'te SQL injection pattern
   - Aksiyon: HTTP 403 döner, log kaydedilir
   - Mesaj: "Geçersiz istek içeriği tespit edildi"

4. **Rate Limit Aşımı**
   - Durum: Belirlenen limit aşıldı
   - Aksiyon: HTTP 429 döner
   - Mesaj: "Çok fazla istek. Lütfen daha sonra tekrar deneyin."

---

## 🔧 Yapılandırma

### Environment Variables
```env
# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/erp_db

# Rate Limiting (middleware içinde ayarlanmış)
# Değiştirmek için: backend/src/middleware/rateLimit.js
```

### Middleware Sıralaması (server.js)
```javascript
1. Helmet (Security headers)
2. Request size limits
3. IP Access Control
4. SQL Injection Protection
5. Suspicious Activity Detection
6. Rate Limiting (route bazlı)
7. Authentication
8. Permissions
```

---

## 📈 Monitoring ve Reporting

### Önerilen Kontroller

1. **Günlük Kontroller**
   - Başarısız giriş denemeleri
   - Yeni IP engellemeleri
   - Anormal session aktivitesi

2. **Haftalık Kontroller**
   - Güvenlik trend analizi
   - Blacklist temizliği (süresi dolanlar)
   - Session temizliği (24 saatten eski)

3. **Aylık Kontroller**
   - Activity logs analizi
   - Security policy review
   - Performance impact değerlendirmesi

---

## ⚠️ Önemli Notlar

1. **Permission Gerekliliği**
   - Tüm security endpoint'leri `admin.security` yetkisi gerektirir
   - Permission sistemi aktif olmalı

2. **Database Migration**
   - 021_create_security_tables.sql başarıyla çalıştırıldı
   - 3 yeni tablo: ip_blacklist, login_attempts, user_sessions

3. **Performance**
   - Her request için IP kontrolü yapılır
   - Database query'leri optimize edilmiş (indexed)
   - Cache sistemi kullanılıyor

4. **Backup**
   - Security tabloları düzenli yedeklenmeli
   - Activity logs arşivleme stratejisi belirlenebilir

---

## 🎯 Sonuç

ERP sistemi artık **kurumsal seviye güvenlik** özellikleriyle donatılmıştır:
- ✅ Multi-layer security (7 katman)
- ✅ Real-time monitoring
- ✅ Automated threat detection
- ✅ Comprehensive logging
- ✅ Admin control panel ready

Sistem production ortamına hazırdır! 🚀
