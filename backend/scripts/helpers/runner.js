/**
 * Test runner + assertion kütüphanesi
 */
const C = {
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m',
  reset:  '\x1b[0m',
  gray:   '\x1b[90m',
  blue:   '\x1b[34m',
  magenta:'\x1b[35m',
};

const ARGS    = process.argv.slice(2);
const VERBOSE = ARGS.includes('--verbose') || ARGS.includes('-v');
const BAIL    = ARGS.includes('--bail')    || ARGS.includes('-b');

/* ── Sonuç takibi ── */
const results = { pass: 0, fail: 0, skip: 0, errors: [] };

function getResults() { return { ...results }; }
function resetResults() {
  results.pass = 0; results.fail = 0; results.skip = 0; results.errors = [];
}

/* ── Tek test çalıştır ── */
async function test(name, fn) {
  try {
    await fn();
    results.pass++;
    process.stdout.write(`  ${C.green}✓${C.reset} ${name}\n`);
  } catch (err) {
    results.fail++;
    results.errors.push({ name, err: err.message });
    process.stdout.write(`  ${C.red}✗${C.reset} ${name} ${C.gray}→ ${err.message}${C.reset}\n`);
    if (VERBOSE) {
      console.error(err.stack);
    }
    if (BAIL) throw new Error('__bail__');
  }
}

/* ── Atla ── */
function skip(name, reason = '') {
  results.skip++;
  process.stdout.write(`  ${C.yellow}○${C.reset} ${C.gray}${name}${reason ? ` (${reason})` : ''}${C.reset}\n`);
}

/* ── Bölüm başlığı ── */
function section(name) {
  console.log(`\n${C.bold}${C.cyan}── ${name} ──${C.reset}`);
}

/* ── Alt bölüm ── */
function subsection(name) {
  console.log(`\n  ${C.bold}${C.blue}• ${name}${C.reset}`);
}

/* ── Özet yazdır ── */
function printSummary(suiteName = '') {
  const total = results.pass + results.fail;
  const color = results.fail === 0 ? C.green : C.red;
  const label = results.fail === 0 ? `${C.green}TAMAM ✓${C.reset}` : `${C.red}${results.fail} BAŞARISIZ${C.reset}`;

  console.log(`\n${C.bold}${color}${'═'.repeat(50)}${C.reset}`);
  if (suiteName) console.log(`${C.bold}  ${suiteName}${C.reset}`);
  console.log(`${C.bold}  Sonuç: ${results.pass}/${total} başarılı  ${label}`);
  if (results.skip > 0) console.log(`${C.gray}  Atlanan: ${results.skip}${C.reset}`);
  console.log(`${C.bold}${color}${'═'.repeat(50)}${C.reset}\n`);

  if (results.fail > 0) {
    console.log(`${C.red}${C.bold}Başarısız testler:${C.reset}`);
    results.errors.forEach(({ name, err }) => {
      console.log(`  ${C.red}✗${C.reset} ${name}`);
      console.log(`    ${C.gray}${err}${C.reset}`);
    });
    console.log();
  }

  return results.fail === 0;
}

/* ── Assertion kütüphanesi ── */
function expect(val) {
  const fmt = (v) => JSON.stringify(v);
  return {
    toBe:          (exp)    => { if (val !== exp) throw new Error(`Beklenen ${fmt(exp)}, alınan ${fmt(val)}`); },
    toNotBe:       (exp)    => { if (val === exp) throw new Error(`${fmt(val)} olmamalıydı`); },
    toBeOneOf:     (...opts) => { if (!opts.flat().includes(val)) throw new Error(`[${opts.flat().join(',')}] içinde olmalıydı, alınan ${fmt(val)}`); },
    toBeOk:        ()       => { if (!val) throw new Error(`Truthy beklendi, alınan ${fmt(val)}`); },
    toBeFalsy:     ()       => { if (val) throw new Error(`Falsy beklendi, alınan ${fmt(val)}`); },
    toContain:     (k)      => { if (!val?.includes?.(k)) throw new Error(`"${k}" içermeli, alınan ${fmt(val)}`); },
    toNotContain:  (k)      => { if (val?.includes?.(k)) throw new Error(`"${k}" içermemeli`); },
    toHaveKey:     (k)      => { if (!(k in (val || {}))) throw new Error(`"${k}" anahtarı beklendi, mevcut: ${Object.keys(val||{}).join(',')}`); },
    toNotHaveKey:  (k)      => { if (k in (val || {})) throw new Error(`"${k}" anahtarı olmamalı`); },
    toBeArray:     ()       => { if (!Array.isArray(val)) throw new Error(`Dizi beklendi, alınan ${typeof val}`); },
    toBeArrayOf:   (n)      => { if (!Array.isArray(val) || val.length !== n) throw new Error(`${n} elemanlı dizi beklendi, alınan ${Array.isArray(val) ? val.length : typeof val}`); },
    toHaveLength:  (n)      => { if (val?.length !== n) throw new Error(`Uzunluk ${n} beklendi, alınan ${val?.length}`); },
    toBeLte:       (n)      => { if (val > n) throw new Error(`≤ ${n} beklendi, alınan ${val}`); },
    toBeGte:       (n)      => { if (val < n) throw new Error(`≥ ${n} beklendi, alınan ${val}`); },
    toBeGt:        (n)      => { if (val <= n) throw new Error(`> ${n} beklendi, alınan ${val}`); },
    toBeLt:        (n)      => { if (val >= n) throw new Error(`< ${n} beklendi, alınan ${val}`); },
    toBeString:    ()       => { if (typeof val !== 'string') throw new Error(`String beklendi, alınan ${typeof val}`); },
    toBeNumber:    ()       => { if (typeof val !== 'number') throw new Error(`Sayı beklendi, alınan ${typeof val}`); },
    toBeObject:    ()       => { if (typeof val !== 'object' || val === null || Array.isArray(val)) throw new Error(`Nesne beklendi`); },
    toMatch:       (re)     => { if (!re.test(String(val))) throw new Error(`${fmt(val)}, /${re.source}/ ile eşleşmedi`); },
    toBeNull:      ()       => { if (val !== null) throw new Error(`null beklendi, alınan ${fmt(val)}`); },
    toBeUndefined: ()       => { if (val !== undefined) throw new Error(`undefined beklendi, alınan ${fmt(val)}`); },
  };
}

module.exports = { test, skip, section, subsection, printSummary, expect, getResults, resetResults, VERBOSE, BAIL, C };
