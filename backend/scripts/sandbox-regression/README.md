# Sandbox regresyon betikleri (güvenlik denetimi 2026-10)

İki sahte şirketle (A/B) kiracı sızıntısı, rapor kapısı, SMTP, profil parolası, aktivite günlüğü ve
WebSocket düzeltmelerini uçtan uca doğrular. **Gerçek veritabanına karşı çalıştırma** — yalnızca
geçici bir Postgres + arka uç içeren, dış ağı olmayan Docker ağında.

Beklenen: `2fa-regression.js` → `30 passed` (arka ucu `NODE_ENV=development` ile başlatın: üretim modundaki IP/dakika sınırları test sıklığıyla çakışır); `orders-import-smtp-regression.js` → `14 passed`; `tenant-regression.js` → `RESULT: 30 passed, 0 failed`; `websocket-regression.js` → `6 passed`.

Kurulum özeti:
1. `docker network create --internal audit-net`
2. `pgvector/pgvector:pg16` (`--network-alias pg`, tmpfs veri, `POSTGRES_DB=erp_audit`, parola `auditpw`)
3. Arka uç imajı bu depodaki `server.js/src/migrations/scripts` salt-okunur bağlanarak
   (`NODE_ENV=production`, `TRUST_PROXY=1`, `ALLOWED_HOSTS=audit-be`, `CORS_ORIGINS=http://audit-be:5000`,
   `--network-alias audit-be`, `docker-entrypoint.sh` migration'ları çalıştırır).
4. Betikler `node` ile aynı ağda (`-e NODE_PATH=/app/node_modules`) çalıştırılır; WebSocket betiği için
   `socket.io-client` bulunan frontend imajı kullanılır.
