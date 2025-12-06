# 🚀 HIZLI BAŞLANGIÇ REHBERİ

Bu doküman, projeyi **5 dakikada** ayağa kaldırmak için gereken komutları içerir.

## ⚡ HEMEN YAP

### 1️⃣ Environment Dosyaları Oluştur

```powershell
# Backend
cd backend
copy env.example .env

# .env dosyasını açıp JWT_SECRET değerini değiştir (en az 32 karakter)
notepad .env

# Frontend (opsiyonel)
cd ../frontend
copy env.example .env
```

### 2️⃣ Docker Başlat

```powershell
cd ../devops
docker-compose up -d
```

Bu komut PostgreSQL ve Redis'i başlatır (yaklaşık 1 dakika sürer).

### 3️⃣ Backend Bağımlılıklarını Yükle

```powershell
cd ../backend
npm install
```

### 4️⃣ Frontend Bağımlılıklarını Yükle

```powershell
cd ../frontend
npm install
```

### 5️⃣ Backend'i Çalıştır

Yeni bir terminal aç ve:

```powershell
cd backend
npm run dev
```

Backend http://localhost:5000 adresinde çalışacak.

### 6️⃣ Frontend'i Çalıştır

Başka bir terminal aç ve:

```powershell
cd frontend
npm run dev
```

Frontend http://localhost:3000 adresinde açılacak.

## ✅ KONTROL ET

Tarayıcıda aç:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

## 🐛 SORUN mu?

### Docker çalışmıyor
```powershell
docker ps  # Container'ları göster
docker logs erp_postgres  # Hata logları
docker logs erp_redis
```

### Backend başlamıyor
```powershell
# .env dosyası var mı?
cd backend
type .env

# npm install çalıştırdınız mı?
npm list
```

### Frontend boş sayfa
- Backend çalışıyor mu kontrol et
- Browser console aç (F12) ve hataları kontrol et

## 📚 DAHA FAZLA BİLGİ

- **QUICK_START.md** - Hızlı başlangıç rehberi
- **PROJE_KURULUM_ADIMLARI.md** - Detaylı adımlar
- **ENV_KURULUM.md** - .env ayarları
- **OZET.md** - Proje durumu özeti

## 🎉 BAŞARILI!

Eğer her şey çalışıyorsa, artık geliştirmeye başlayabilirsiniz!

**Sonraki adımlar:**
1. Authentication sistemi geliştirin
2. Products CRUD tamamlayın
3. UI komponentleri oluşturun

İyi çalışmalar! 🚀

