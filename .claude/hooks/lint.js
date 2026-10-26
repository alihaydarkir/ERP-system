#!/usr/bin/env node
// PostToolUse (Edit|Write): düzenlenen backend/frontend JS dosyasını ESLint ile kontrol eder.
// Dosyayı DEĞİŞTİRMEZ (prettier/--fix yok: kodun çoğu prettier formatında değil, diff şişer).
// Hata varsa exit 2 + stderr → Claude çıktıyı görür ve düzeltir.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  let file;
  try {
    file = JSON.parse(input).tool_input?.file_path;
  } catch {
    process.exit(0);
  }
  if (!file || !/\.(c?js|jsx)$/.test(file)) process.exit(0);

  const root = path.resolve(__dirname, '..', '..');
  const abs = path.resolve(file);
  const rel = path.relative(root, abs).split(path.sep).join('/');
  const pkg = rel.match(/^(backend|frontend)\//)?.[1];
  if (!pkg || rel.includes('node_modules/')) process.exit(0);

  const dir = path.join(root, pkg);
  const bin = path.join(dir, 'node_modules', 'eslint', 'bin', 'eslint.js');
  if (!fs.existsSync(bin)) process.exit(0);

  try {
    // --quiet: yalnızca hatalar (uyarılar ve "dosya yok sayıldı" bildirimi gizlenir)
    execFileSync(process.execPath, [bin, '--quiet', path.relative(dir, abs)], {
      cwd: dir,
      stdio: 'pipe',
      timeout: 30000,
    });
  } catch (e) {
    const out = `${e.stdout || ''}${e.stderr || ''}`.trim();
    if (out) {
      process.stderr.write(`ESLint (${pkg}) hata buldu:\n${out}\n`);
      process.exit(2);
    }
  }
  process.exit(0);
});
