# 🚀 Proje Kurulum Adımları

Projeyi ayağa kaldırmak için aşağıdaki adımları izleyin.

## ✅ Tamamlanan İşlemler

1. ✅ Backend dizin yapısı oluşturuldu
2. ✅ Frontend dizin yapısı oluşturuldu
3. ✅ DevOps dosyaları (Docker) hazırlandı
4. ✅ Database migration dosyaları oluşturuldu
5. ✅ Temel config dosyaları hazırlandı

## 📝 Sonraki Adımlar

### 1️⃣ Docker ile PostgreSQL ve Redis Başlat

```powershell
cd devops
docker-compose up -d
```

Bu komut iki container başlatır:
- PostgreSQL (Port 5432) - Veritabanı
- Redis (Port 6379) - Cache

### 2️⃣ Backend Kurulumu

```powershell
cd backend

# Bağımlılıkları yükle
npm install

# .env dosyası oluştur (env.example dosyasını kopyalayarak)
copy env.example .env

# .env dosyasını düzenle (gerekirse)
notepad .env
```

**.env dosyasında kontrol edin:**
- `DATABASE_URL` - PostgreSQL bağlantı bilgileri
- `REDIS_URL` - Redis bağlantı bilgileri  
- `JWT_SECRET` - En az 32 karakterlik gizli anahtar

### 3️⃣ Frontend Kurulumu

```powershell
cd frontend

# Bağımlılıkları yükle
npm install
```

### 4️⃣ Database Migration (Opsiyonel - İlk Kurulumda)

İlk kurulumda veritabanı şemasını oluşturmak için:

```powershell
cd ..
npm run migrate
```

### 5️⃣ Projeyi Çalıştır

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

Backend http://localhost:5000 adresinde çalışmalı.

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

Frontend http://localhost:3000 adresinde açılmalı.

### 6️⃣ Tarayıcıda Test Et

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

## 🎉 Başarılı!

Proje çalışıyor! Şimdi geliştirmeye başlayabilirsiniz.

## 📚 Ek Kaynaklar

- **QUICK_START.md** - Hızlı başlangıç rehberi
- **SETUP.md** - Detaylı kurulum rehberi
- **README.md** - Proje genel bilgileri

## 🔧 Ollama Kurulumu (Opsiyonel)

AI chatbot özelliklerini kullanmak için:

1. Ollama'yı indirin: https://ollama.ai/download
2. Llama2 modelini indirin:
   ```powershell
   ollama pull llama2
   ```
3. Ollama'yı başlatın:
   ```powershell
   ollama serve
   ```

## ❓ Sorun mu var?

### PostgreSQL bağlanamıyorum
- Docker container çalışıyor mu kontrol edin: `docker ps`
- PostgreSQL portu 5432'yi kullanıyor mu?

### Backend başlamıyor
- .env dosyası doğru mu?
- `npm install` çalıştırdınız mı?

### Frontend boş sayfa gösteriyor
- Backend çalışıyor mu kontrol edin
- Browser console'da hata var mı bakın (F12)

## 📞 Yardım İçin

Detaylı bilgi için `README.md` dosyasındaki "Troubleshooting" bölümüne bakın.


