#!/usr/bin/env bash
# =============================================================================
# ERP Sistemi — Mac Tek-Komut Kurulum
# Kullanım:  chmod +x setup-mac.sh && ./setup-mac.sh
# =============================================================================
# Bu script HİÇBİR gizli bilgi içermez — şifreleri/secret'ları senin makinende
# rastgele üretir (.env dosyalarına yazar). O yüzden bu script'i paylaşmak güvenli.
# =============================================================================
set -euo pipefail

# ── Ayarlar ──────────────────────────────────────────────────────────────────
# Mac M3 Pro (36GB) için güçlü model. Daha az RAM'in varsa "qwen2.5:3b" yap.
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen3:30b-a3b}"

cd "$(dirname "$0")"
green(){ printf "\033[0;32m%s\033[0m\n" "$1"; }
yellow(){ printf "\033[0;33m%s\033[0m\n" "$1"; }
red(){ printf "\033[0;31m%s\033[0m\n" "$1"; }

green "==> ERP Sistemi kurulum başlıyor (model: $OLLAMA_MODEL)"

# ── 1) Ön koşul kontrolü ─────────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  red "✗ Docker bulunamadı. Önce Docker Desktop kur: https://www.docker.com/products/docker-desktop/"
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  red "✗ Docker çalışmıyor. Docker Desktop'ı aç ve tekrar dene."
  exit 1
fi
if ! command -v ollama >/dev/null 2>&1; then
  red "✗ Ollama bulunamadı. Önce kur: https://ollama.com/download  (ya da: brew install ollama)"
  exit 1
fi
green "✓ Docker ve Ollama hazır"

# ── 2) Ollama'yı container'dan erişilebilir yap (0.0.0.0) + modeli indir ──────
green "==> Ollama 0.0.0.0'a bağlanacak şekilde ayarlanıyor..."
launchctl setenv OLLAMA_HOST "0.0.0.0:11434" || true
# Ollama uygulamasını yeniden başlat (ayarın etkili olması için)
osascript -e 'tell application "Ollama" to quit' >/dev/null 2>&1 || pkill -x Ollama 2>/dev/null || true
sleep 2
open -a Ollama >/dev/null 2>&1 || (OLLAMA_HOST=0.0.0.0:11434 ollama serve >/dev/null 2>&1 &)
sleep 4

green "==> Model indiriliyor (ilk sefer büyük olabilir, sabret): $OLLAMA_MODEL"
ollama pull "$OLLAMA_MODEL"

# ── 3) .env dosyalarını oluştur (yoksa) — secret'lar rastgele üretilir ───────
gen(){ openssl rand -base64 "$1" | tr -d '\n/+=' | cut -c1-"$2"; }

if [ ! -f .env ]; then
  green "==> Root .env oluşturuluyor (rastgele şifrelerle)"
  DB_PW="$(gen 48 32)"; REDIS_PW="$(gen 48 32)"
  cat > .env <<EOF
DB_USER=erp_user
DB_PASSWORD=${DB_PW}
DB_NAME=erp_db
REDIS_PASSWORD=${REDIS_PW}
OLLAMA_MODEL=${OLLAMA_MODEL}
OLLAMA_BASE_URL=http://host.docker.internal:11434
VITE_API_URL=
EOF
else
  yellow "• .env zaten var — dokunulmadı"
fi

mkdir -p backend
if [ ! -f backend/.env ]; then
  green "==> backend/.env oluşturuluyor (rastgele JWT secret ile)"
  JWT="$(gen 64 48)"
  cat > backend/.env <<EOF
NODE_ENV=production
JWT_SECRET=${JWT}
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
EOF
else
  yellow "• backend/.env zaten var — dokunulmadı"
fi

# ── 4) Konteynerleri kur ve başlat ───────────────────────────────────────────
green "==> Docker servisleri kuruluyor (postgres + redis + backend + frontend)..."
docker compose up -d --build

# ── 5) Backend hazır olana kadar bekle ───────────────────────────────────────
green "==> Backend'in açılması bekleniyor..."
for i in $(seq 1 60); do
  if curl -fs http://localhost:5000/api/health >/dev/null 2>&1; then break; fi
  sleep 3
done

# ── 6) Demo verisini yükle (sadece ilk kurulumda) ────────────────────────────
if docker compose exec -T postgres psql -U erp_user -d erp_db -tAc "SELECT 1 FROM users LIMIT 1" 2>/dev/null | grep -q 1; then
  yellow "• Veritabanı zaten dolu — seed atlandı"
else
  green "==> Demo verisi yükleniyor (Türkçe)..."
  docker compose exec -T backend npm run seed || yellow "• Seed çalıştırılamadı, manuel deneyebilirsin: docker compose exec backend npm run seed"
fi

# ── Bitti ────────────────────────────────────────────────────────────────────
green ""
green "================================================================"
green "  ✓ KURULUM TAMAM"
green "================================================================"
echo "  Arayüz:    http://localhost:5173"
echo "  API:       http://localhost:5000"
echo ""
echo "  Giriş (giriş sayfasındaki demo butonlarıyla tek tık):"
echo "    Admin    : admin@erp.local    / Admin123!"
echo "    Yönetici : manager@erp.local  / Admin123!"
echo "    Kullanıcı: user@erp.local     / Admin123!"
echo ""
echo "  Durdurmak için:   docker compose down"
echo "  Tekrar başlatmak: docker compose up -d"
green "================================================================"
