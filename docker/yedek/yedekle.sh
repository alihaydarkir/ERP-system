#!/bin/sh
# Günlük PostgreSQL yedeği. Yedek şifrelemesi kurulduysa (Ayarlar → Yedekler) dump yalnız
# AÇIK anahtarla (age) şifrelenir: bu container'da ve sunucuda yedeği açabilecek sır durmaz.
#   yedekle.sh            → her gün yedek al (container ana süreci)
#   yedekle.sh once [ad]  → hemen bir kez yedek al (ör. geri yüklemeden önce güvenlik yedeği)
set -eu
set -o pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
ALICI_FILE="$BACKUP_DIR/.alici"

log() { echo "[postgres_backup] $*"; }

backup_once() {
  label="${1:-}"
  ts=$(date +"%Y-%m-%d_%H-%M-%S")
  base="$BACKUP_DIR/${DB_NAME}_${ts}${label:+_$label}.dump"

  if [ -s "$ALICI_FILE" ]; then
    tmp="$base.age.tmp"
    if PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c \
      | age -R "$ALICI_FILE" -o "$tmp"; then
      mv "$tmp" "$base.age"
      log "şifreli yedek alındı: $base.age"
      # Şifreleme kurulmadan önce kalmış şifresiz yedekler artık gereksiz ve korumasız
      find "$BACKUP_DIR" -maxdepth 1 -type f -name "*.dump" -delete
    else
      rm -f "$tmp"
      log "HATA: yedek alınamadı"
      return 1
    fi
  else
    log "UYARI: yedek şifrelemesi kurulmamış, yedek ŞİFRESİZ alınıyor (Ayarlar → Yedekler)"
    PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -f "$base"
    log "yedek alındı: $base"
  fi

  find "$BACKUP_DIR" -maxdepth 1 -type f \( -name "*.dump" -o -name "*.dump.age" \) -mtime +"$RETENTION_DAYS" -delete
}

mkdir -p "$BACKUP_DIR"
# Backend (üretim imajında uid 1001 "erp") anahtar zarflarını bu klasöre yazar
chown "${BACKEND_UID:-1001}:${BACKEND_UID:-1001}" "$BACKUP_DIR" 2>/dev/null || true
chmod 0750 "$BACKUP_DIR" 2>/dev/null || true

if [ "${1:-}" = "once" ]; then
  backup_once "${2:-}"
  exit 0
fi

log "başladı — günlük yedek, $RETENTION_DAYS gün saklama"
while true; do
  backup_once || true
  sleep 86400
done
