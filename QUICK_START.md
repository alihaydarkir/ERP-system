# 🚀 Hızlı Başlangıç

Bu projeyi ayağa kaldırmak için gereken adımlar:

## ⚡ Hızlı Kurulum (5 Dakika)

### 1. Sistem Gereksinimlerini Kontrol Et

```bash
# Node.js kurulu mu?
node --version  # v18 veya üzeri olmalı

# PostgreSQL kurulu mu?
psql --version

# Git kurulu mu?
git --version
```

### 2. Docker ile PostgreSQL ve Redis Başlat

```bash
cd devops
docker-compose up -d
```

Bu komut PostgreSQL ve Redis'i başlatır.

### 3. Backend Kurulumu

```bash
cd backend
npm install

# .env dosyası oluştur
echo DATABASE_URL=postgresql://postgres:secure_password@localhost:5432/erp_db > .env
echo REDIS_URL=redis://localhost:6379 >> .env
echo JWT_SECRET=your_super_secret_key_min_32_chars >> .env
echo PORT=5000 >> .env
```

### 4. Frontend Kurulumu

```bash
cd frontend
npm install
```

### 5. Projeyi Çalıştır

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 6. Tarayıcıda Aç

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## ✅ Başarılı!

Proje çalışıyor! 🎉

## 🔍 Sonraki Adımlar

1. **Ollama Kurulumu** (Opsiyonel - AI özellikleri için)
2. **Database Migration** (Schema oluşturmak için)
3. **Authentication** (Giriş sistemi geliştirmek için)

Detaylı bilgi için `SETUP.md` dosyasına bakın.

## 📞 Yardım

Sorun mu yaşıyorsunuz? `README.md` dosyasındaki Troubleshooting bölümüne bakın.

