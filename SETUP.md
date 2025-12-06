# 🚀 Proje Kurulum Rehberi

Bu doküman, ERP projesini kurmak için adım adım talimatlar içerir.

## 📋 Gereksinimler

### Ana Geliştirici (Windows)
- **Node.js**: 18 LTS veya üzeri
- **PostgreSQL**: 14+ (veya Docker)
- **Redis**: 7+ (Docker önerilir)
- **Ollama**: En son sürüm
- **Git**: Kurulu olmalı

### İkincil Geliştirici
- **Node.js**: 18 LTS veya üzeri
- **Git**: Kurulu olmalı
- **Docker Desktop** (Opsiyonel)

## 🔧 Adım Adım Kurulum

### 1. Repository Klonlama

```bash
git clone <repo-url>
cd ErpFinaly
```

### 2. Backend Kurulumu

```bash
cd backend

# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur
cp .env.example .env

# .env dosyasını düzenle (gerekli bilgileri girin)
# Özellikle DATABASE_URL, REDIS_URL, JWT_SECRET değerlerini değiştirin
```

### 3. PostgreSQL ve Redis Kurulumu

#### Docker ile (Önerilir):

```bash
cd devops
docker-compose up -d
```

Bu komut şunları başlatır:
- PostgreSQL (Port 5432)
- Redis (Port 6379)

#### Manuel Kurulum:

**PostgreSQL:**
- Windows: https://www.postgresql.org/download/windows/
- Kurulumdan sonra bir veritabanı oluşturun:
```bash
psql -U postgres
CREATE DATABASE erp_db;
```

**Redis:**
```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

### 4. Ollama Kurulumu (Backend Geliştiricisi)

```bash
# Ollama'yı indirin ve kurun
# https://ollama.ai/download

# Llama 2 modelini indirin
ollama pull llama2

# Ollama'yı başlatın
ollama serve
```

### 5. Frontend Kurulumu

```bash
cd ../frontend

# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur (opsiyonel)
echo "VITE_API_URL=http://localhost:5000" > .env
```

### 6. Projeyi Çalıştırma

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

**Terminal 3 - Ollama (Backend Developer):**
```bash
ollama serve
```

### 7. Tarayıcıda Test

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## ✅ Kontrol Listesi

Kurulumun başarılı olduğunu kontrol edin:

```bash
# Node.js versiyonu
node --version  # v18 veya üzeri olmalı

# PostgreSQL bağlantısı
psql -U postgres -c "SELECT version();"

# Redis bağlantısı
docker ps | grep redis  # veya redis-cli ping

# Backend çalışıyor mu?
curl http://localhost:5000

# Frontend çalışıyor mu?
curl http://localhost:3000
```

## 🐛 Sorun Giderme

### Backend başlamıyor

- PostgreSQL çalışıyor mu? `docker ps` ile kontrol edin
- .env dosyası doğru mu? DATABASE_URL'i kontrol edin
- Port 5000 kullanımda mı? `netstat -ano | findstr :5000`

### Frontend başlamıyor

- Node.js versiyonunu kontrol edin
- `node_modules` temizleyip tekrar yükleyin: `rm -rf node_modules && npm install`

### Ollama bağlantı hatası

- Ollama çalışıyor mu? `ollama list` ile kontrol edin
- Model indirilmiş mi? `ollama pull llama2`

## 📞 Destek

Sorun yaşarsanız:
1. README.md'deki Troubleshooting bölümüne bakın
2. GitHub Issues'a bakın
3. Takım üyelerine danışın

## 🎉 Sonraki Adımlar

Kurulum tamamlandıktan sonra:

1. **Backend Geliştiricisi**: API endpoint'lerini geliştirmeye başlayın
2. **Frontend Geliştiricisi**: UI komponentlerini geliştirmeye başlayın
3. İkisi beraber: İlk feature'ı birleştirin

**İyi çalışmalar!** 🚀

