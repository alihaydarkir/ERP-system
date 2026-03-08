# Docker Configuration Archive

Bu klasör, projenin Docker yapılandırma dosyalarını içermektedir.

## 📦 İçerik

- `devops/docker-compose.yml` - PostgreSQL ve Redis servisleri
- `devops/Dockerfile.backend` - Backend için Dockerfile
- `devops/Dockerfile.frontend` - Frontend için Dockerfile  
- `devops/nginx.conf` - Nginx yapılandırması

## 🔄 Docker'a Geri Dönüş

İleride Docker'ı kullanmaya karar verdiğinizde:

### Adım 1: Dosyaları Geri Yükle
```powershell
# Proje root dizininde
Move-Item -Path "docker-archive\devops" -Destination "devops" -Force
```

### Adım 2: Docker Servislerini Başlat
```powershell
cd devops
docker-compose up -d
```

### Adım 3: Backend .env Güncellemesi
Backend `.env` dosyasındaki bağlantı bilgilerini Docker servislerine göre güncelle:

```env
# Local yerine Docker servisleri
DB_HOST=postgres  # localhost yerine
REDIS_URL=redis://redis:6379  # localhost yerine
```

### Adım 4: Migration'ları Çalıştır
```powershell
cd backend
npm run migrate
```

### Adım 5: Backend ve Frontend'i Başlat
```powershell
# Backend
cd backend
npm start

# Frontend (yeni terminal)
cd frontend
npm run dev
```

## 📝 Notlar

- **Şu anki durum**: Local PostgreSQL (Port 5432) ve local development kullanılıyor
- **Docker'a geçişte**: PostgreSQL ve Redis Docker containerlarında çalışacak
- **Güvenlik**: PostgreSQL şifresi `secure_password` olarak ayarlandı (hem local hem Docker için)
- **Yedek**: Local PostgreSQL ayarları `C:\Program Files\PostgreSQL\18\data\pg_hba.conf.backup`

## 🔍 Arşivlenme Tarihi
**Tarih**: 3 Ocak 2026  
**Sebep**: Local development tercih edildi, Docker ileride kullanılacak
