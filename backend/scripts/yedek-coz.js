#!/usr/bin/env node
/**
 * Şifreli yedeği çözer (geri yükleme betikleri kullanır: kurulum/geri-yukle.ps1 | .sh).
 * Parola ya da kurtarma kodu stdin'in İLK satırından okunur (komut satırına/ortama yazılmaz).
 *
 *   node scripts/yedek-coz.js --liste                → yedekleri listeler (en yenisi önce)
 *   node scripts/yedek-coz.js <dosya> --kontrol      → yalnız açılabiliyor mu (stdout: TAMAM)
 *   node scripts/yedek-coz.js <dosya> --geri-yukle   → çözüp DATABASE_URL'e pg_restore (tek transaction)
 *   node scripts/yedek-coz.js <dosya>                → çözülmüş pg_dump akışı stdout'a
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Readable, Writable } = require('stream');
const backupCrypto = require('../src/services/backupCrypto');
const backupService = require('../src/services/backupService');

const fail = (message, code = 1) => {
  process.stderr.write(`HATA: ${message}\n`);
  process.exit(code);
};

const readFirstLine = () =>
  new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
      if (data.includes('\n')) {
        process.stdin.pause();
        resolve(data.split(/\r?\n/)[0]);
      }
    });
    process.stdin.on('end', () => resolve(data.split(/\r?\n/)[0]));
  });

(async () => {
  const args = process.argv.slice(2);

  if (args[0] === '--liste') {
    const backups = await backupService.listBackups();
    for (const b of backups) {
      process.stdout.write(`${b.name}\t${(b.size / 1048576).toFixed(1)} MB\t${b.created_at}\n`);
    }
    return;
  }

  const name = path.basename(args[0] || '');
  if (!name) fail('Yedek dosyası adı verilmedi (--liste ile görebilirsiniz).');
  const file = path.join(process.env.BACKUP_DIR || '/backups', name);
  if (!fs.existsSync(file)) fail(`Yedek bulunamadı: ${name}`);
  if (!name.endsWith('.age')) fail(`${name} şifreli değil; doğrudan pg_restore ile geri yüklenebilir.`);

  const keys = await backupService.readKeys();
  if (!keys) fail('Anahtar dosyası (.anahtar.json) yok: yedekler bu kurulumda şifrelenmemiş ya da dosya silinmiş.');

  const secret = await readFirstLine();
  const opened = await backupCrypto.openIdentity(keys, secret);
  if (!opened) fail('Parola ya da kurtarma kodu yanlış.', 2);

  const decrypted = await backupCrypto.decryptStream(opened.identity, Readable.toWeb(fs.createReadStream(file)));

  if (args.includes('--kontrol')) {
    const reader = decrypted.getReader();
    const { value } = await reader.read();
    await reader.cancel().catch(() => {});
    if (!value || Buffer.from(value).subarray(0, 5).toString('latin1') !== 'PGDMP') {
      fail('Yedek açıldı ama geçerli bir veritabanı dökümü değil.', 3);
    }
    process.stdout.write(`TAMAM (${opened.via === 'recovery' ? 'kurtarma kodu' : 'parola'})\n`);
    return;
  }

  if (args.includes('--geri-yukle')) {
    if (!process.env.DATABASE_URL) fail('DATABASE_URL tanımlı değil.');
    // --single-transaction: yarıda kalırsa veritabanı eski hâlinde kalır
    const restore = spawn(
      'pg_restore',
      ['--clean', '--if-exists', '--no-owner', '--single-transaction', '--exit-on-error', '-d', process.env.DATABASE_URL],
      { stdio: ['pipe', 'inherit', 'inherit'] }
    );
    const exited = new Promise((resolve) => restore.on('close', resolve));
    await decrypted.pipeTo(Writable.toWeb(restore.stdin));
    const code = await exited;
    if (code !== 0) fail(`pg_restore başarısız (çıkış kodu ${code}); veritabanı değiştirilmedi.`, 4);
    process.stdout.write('TAMAM: yedek geri yüklendi\n');
    return;
  }

  await decrypted.pipeTo(Writable.toWeb(process.stdout));
})().catch((error) => fail(`Yedek çözülemedi: ${error.message}`, 3));
