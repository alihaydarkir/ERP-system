#!/bin/sh
# Helix-Ware ERP — şifreli yedekten geri yükleme (Linux/macOS).
# ERP klasöründe (docker-compose.yml'nin olduğu yer) çalıştırın:  sh kurulum/geri-yukle.sh
# Yedek parolası ya da basılı kurtarma kodu gerekir. Çözülmüş döküm diske/host'a çıkmaz:
# şifre çözme ve pg_restore backend container'ında tek akışta yapılır.
set -eu
cd "$(dirname "$0")/.."
# Windows'ta Git Bash ile çalıştırılırsa container içi yolları (/backups) Windows yoluna çevirmesin
export MSYS_NO_PATHCONV=1

DC="docker compose"
COZ="node scripts/yedek-coz.js"

echo "Yedekler (en yenisi üstte):"
LISTE=$($DC exec -T backend $COZ --liste </dev/null)
[ -n "$LISTE" ] || { echo "Hiç yedek bulunamadı."; exit 1; }
echo "$LISTE" | awk -F'\t' '{ printf "  %d) %s  (%s, %s)\n", NR, $1, $2, $3 }'

printf "Hangi yedek? [1]: "
read -r SECIM
SECIM=${SECIM:-1}
DOSYA=$(echo "$LISTE" | sed -n "${SECIM}p" | cut -f1)
[ -n "$DOSYA" ] || { echo "Geçersiz seçim."; exit 1; }

printf "Yedek parolası (ya da kurtarma kodu): "
stty -echo 2>/dev/null || true
read -r SIR
stty echo 2>/dev/null || true
echo

if ! printf '%s\n' "$SIR" | $DC exec -T backend $COZ "$DOSYA" --kontrol; then
  echo "Yedek açılamadı; hiçbir şey değiştirilmedi."
  exit 1
fi

echo
echo "DİKKAT: Mevcut veritabanı '$DOSYA' içeriğiyle DEĞİŞTİRİLECEK."
echo "Önce mevcut hâlin şifreli bir güvenlik yedeği alınacak (geri-yukleme-oncesi)."
printf "Devam etmek için EVET yazın: "
read -r ONAY
[ "$ONAY" = "EVET" ] || { echo "Vazgeçildi."; exit 1; }

$DC exec -T postgres_backup yedekle.sh once geri-yukleme-oncesi </dev/null

echo "Uygulama durduruluyor..."
$DC stop frontend backend

DURUM=0
printf '%s\n' "$SIR" | $DC run --rm --no-deps -T --entrypoint node backend scripts/yedek-coz.js "$DOSYA" --geri-yukle || DURUM=$?
SIR=""

echo "Uygulama başlatılıyor..."
$DC start backend frontend

if [ "$DURUM" -ne 0 ]; then
  echo "Geri yükleme BAŞARISIZ (kod $DURUM). Veritabanı eski hâlinde bırakıldı."
  exit "$DURUM"
fi
echo "Geri yükleme tamamlandı: $DOSYA"
