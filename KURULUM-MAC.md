# ERP Sistemi — Mac Kurulumu (Basit)

Arkadaşının Mac'inde **tek komutla** çalıştırmak için.

## Gereken 2 program (bir kez kur)
1. **Docker Desktop** → https://www.docker.com/products/docker-desktop/ (kur ve **aç**)
2. **Ollama** → https://ollama.com/download

## Adımlar (toplam ~3 komut)
Terminal'i aç, proje klasörünün içinde:

```bash
chmod +x setup-mac.sh
./setup-mac.sh
```

Script otomatik olarak:
- Ollama'yı ayarlar + **modeli indirir** (`qwen3:30b-a3b` — Mac 36GB için)
- Şifreleri rastgele üretir (`.env` dosyaları)
- Tüm servisleri kurar ve başlatır
- Türkçe demo verisini yükler

Bittiğinde: **http://localhost:5173** adresini aç.

## Giriş (giriş sayfasında tek-tık demo butonları var)
- **Admin** → `admin@erp.local` / `Admin123!`
- **Yönetici** → `manager@erp.local` / `Admin123!`
- **Kullanıcı** → `user@erp.local` / `Admin123!`

## Sık komutlar
```bash
docker compose down       # durdur
docker compose up -d      # tekrar başlat
docker compose logs -f backend   # logları izle
```

## Model notu
Varsayılan model **`qwen3:30b-a3b`** (Mac M3 Pro / 36GB RAM için).
Daha az RAM varsa script'i şöyle çalıştır:
```bash
OLLAMA_MODEL=qwen2.5:3b ./setup-mac.sh
```

## Sorun olursa
- "Docker çalışmıyor" → Docker Desktop'ı aç, balina ikonu üstte görünsün.
- Model indirme yavaş → ilk sefer büyük (birkaç GB), internet hızına bağlı.
- Chatbot cevap vermiyor → Ollama açık mı kontrol et; script'i tekrar çalıştır.
