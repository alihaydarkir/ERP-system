# .env Dosya Kurulum Rehberi

## ⚠️ ÖNEMLİ

Projeyi çalıştırmadan önce backend ve frontend için `.env` dosyaları oluşturmanız **mutlaka gereklidir**.

## 📝 Backend .env Oluşturma

### Windows PowerShell:

```powershell
cd backend
copy env.example .env
```

### Mac/Linux:

```bash
cd backend
cp env.example .env
```

### Manuel:

1. `backend/` klasöründeki `env.example` dosyasını kopyala
2. `.env` adıyla yapıştır
3. Şifreleri ve secret key'leri değiştir

## 📝 Frontend .env Oluşturma

Frontend için genelde .env dosyası gerekmez çünkü Vite otomatik olarak değişkenleri okur. Ancak özel durumlar için:

```powershell
cd frontend
copy env.example .env
```

## 🔧 .env Dosyasını Düzenleme

### Backend .env

**Mutlaka değiştirmeniz gereken değerler:**

```env
# JWT Secret - Mutlaka değiştirin!
JWT_SECRET=your_super_secret_key_change_this_to_something_random_min_32_chars

# Database şifresi - Güvenli bir şifre kullanın
DB_PASSWORD=secure_password
DATABASE_URL=postgresql://postgres:secure_password@localhost:5432/erp_db

# Email bilgileri (opsiyonel)
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### Frontend .env

Genelde default değerler yeterlidir:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## ⚠️ Güvenlik Uyarıları

1. **JWT_SECRET** mutlaka en az 32 karakterlik rastgele bir string olmalı
2. **DB_PASSWORD** gerçek bir şifre kullanın (şifreler güçlü olmalı)
3. `.env` dosyalarını asla Git'e commit etmeyin (.gitignore'da zaten var)
4. Production'da tamamen farklı değerler kullanın

## 🔍 Kontrol

.env dosyasını oluşturduktan sonra:

```powershell
# Backend kontrol
cd backend
type .env  # Windows
# veya
cat .env   # Mac/Linux

# Frontend kontrol
cd frontend
type .env  # Windows
```

Dosyanın içeriğini görmelisiniz!

## ✅ Doğrulama

Aşağıdaki komutları çalıştırın:

```powershell
# Backend
cd backend
node -e "require('dotenv').config(); console.log('PORT:', process.env.PORT)"
# Çıktı: PORT: 5000

# Frontend
cd frontend
# Vite otomatik olarak environment değişkenlerini okur
```

## 🆘 Sorun mu var?

### .env dosyası oluşturulamıyor

```powershell
# Alternatif yöntem
cd backend
New-Item -ItemType File -Path .env -Force
# Şimdi notepad ile açıp içeriği env.example'dan kopyalayın
notepad .env
```

### Değerler okunmuyor

- .env dosyası backend/ ve frontend/ klasörlerinin içinde olmalı
- Yol doğru mu kontrol edin
- .env.local yerine .env kullanın

## 📞 Yardım

Sorun yaşıyorsanız:
1. `PROJE_KURULUM_ADIMLARI.md` dosyasına bakın
2. README.md'deki Troubleshooting bölümüne bakın

