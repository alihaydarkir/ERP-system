const glossary = require('./glossaryService');

// Sohbette şirket jargonu: terimleri çözer, tanımadığını sorar, onayla öğrenir.
// aiService.runAgent bunu çağırır; hata olursa sohbet normal akışa düşer (bkz. aiService).

const STATE_TTL_MS = 5 * 60 * 1000;
const WRITE_ROLES = new Set(['admin', 'manager', 'super_admin']);
const pending = new Map(); // `${company}:${user}` → bekleyen soru

// "mavi200", "su-400" gibi kod benzeri ifadeler (boşluksuz harf + 2-4 rakam)
const CODE_RE = /(?<![\p{L}\d])\p{L}{2,12}-?\d{2,4}(?![\p{L}\d])/gu;
const CODE_STOP = new Set(['kdv', 'tl', 'usd', 'eur', 'gbp', 'gb', 'mb', 'tb', 'kg', 'cm', 'mm', 'no', 'id', 'sku', 'vd', 'tc', 'iban', 'adet', 'koli', 'ocak', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik', 'subat']);

const typeLabel = (t) => glossary.ENTITY_LABELS[t] || 'kayıt';
const cleanQuoted = (s) => String(s || '').trim().replace(/^["“”'‘’`]+|["“”'‘’`.,!?:;]+$/g, '').trim();

// ── Öğretme komutu: "X = Y", "X Y demek", "X'i Y olarak kaydet", "X dediğimde Y'yi kastediyorum"
function parseTeach(message) {
  const m = String(message || '').trim();
  if (m.length < 5 || m.length > 200) return null;
  let r = m.match(/^(.{2,60}?)\s*=\s*(.{2,120})$/u);
  if (r) return finish(r[1], r[2]);

  const head = '(?:["“‘\']([^"”’\']{2,40})["”’\']|(\\S{2,40}?))(?:[\'’]\\p{L}+)?';
  const patterns = [
    new RegExp(`^${head}[\\s,:-]+(.{2,120}?)\\s+(?:demek|demektir|anlam[ıi]na\\s+gel(?:ir|iyor)|diye\\s+ge[çc]er|diyoruz|diye\\s+okunur)\\.?$`, 'iu'),
    new RegExp(`^${head}\\s+(.{2,120}?)\\s+olarak\\s+(?:kaydet|ekle|tan[ıi]mla|öğren|ogren)\\.?$`, 'iu'),
    new RegExp(`^(?:["“‘']([^"”’']{2,40})["”’']|(.{2,40}?))\\s+dediğimde\\s+(.{2,120}?)(?:['’]\\p{L}+)?\\s+(?:kastediyorum|demek\\s+istiyorum)\\.?$`, 'iu')
  ];
  for (const re of patterns) {
    r = m.match(re);
    if (r) return finish(r[1] || r[2], r[3]);
  }
  return null;

  function finish(term, target) {
    const t = cleanQuoted(term);
    const g = cleanQuoted(target);
    if (!t || !g || !/[\p{L}\d]/u.test(t) || !/\p{L}/u.test(g)) return null;
    if (t.split(/\s+/).length > 3 || t.length > 40) return null;
    return { term: t, target: g };
  }
}

function parseDelete(message) {
  const folded = glossary.fold(message);
  const r = folded.match(/^(.{2,60}?)\s+sozlukten\s+(?:sil|kaldir|cikar)\.?$/);
  if (!r) return null;
  const term = cleanQuoted(String(message).slice(0, r[1].length)).replace(/['’]\p{L}+$/u, '');
  return term ? { term } : null;
}

const isListCommand = (message) =>
  /^(sozluk|sozlugu goster|sozlukte neler var|sozlugumuz|sozlugu listele|kisaltmalar|takma adlar|jargon|terimler|kayitli terimler)\??$/.test(glossary.fold(message).replace(/[^a-z\s]/g, '').trim());

// Otomatik seçim: yalnızca tek aday, sorudaki kelimelerin hepsini kapsıyor ve diğerleri kapsamıyorsa
// (ya da puanı belirgin öndeyse). Emin değilse null döner ve kullanıcıya sorulur.
function pickUnique(cands) {
  if (!cands.length) return null;
  const [a, b] = cands;
  if (!b) return a.coverage >= 0.6 ? a : null;
  if (a.coverage === 1 && b.coverage < 1) return a;
  return a.score - b.score >= 3 ? a : null;
}

function candidateLines(cands) {
  return cands.map((c, i) => `${i + 1}) ${c.name}${c.extra ? ` (${c.extra})` : ''} · ${typeLabel(c.type)}`).join('\n');
}

const reply = (answer, meta = {}) => ({
  response: { success: true, answer, steps: [], meta: { glossary: true, ...meta } }
});

// Terimi mesajda gerçek adıyla değiştirir (kaydedilmemiş olsa bile bu soru için)
function replaceTerm(message, term, canonical) {
  const re = glossary.buildTermPattern(term);
  if (!re) return message;
  const folded = glossary.fold(message);
  const spans = [];
  let m;
  while ((m = re.exec(folded)) !== null) {
    spans.push([m.index, m.index + m[0].length]);
    if (m[0].length === 0) re.lastIndex += 1;
  }
  let out = message;
  for (const [s, e] of spans.reverse()) out = `${out.slice(0, s)}${canonical}${out.slice(e)}`;
  return out;
}

async function save({ companyId, userId, role, term, cand }) {
  if (!WRITE_ROLES.has(role)) return false;
  await glossary.add({ companyId, term, entityType: cand.type, entityId: cand.id, userId });
  return true;
}

async function chooseCandidate({ key, pend, cand, companyId, userId, role }) {
  const saved = await save({ companyId, userId, role, term: pend.term, cand });
  pending.delete(key);
  const savedText = saved
    ? `✅ Kaydettim: "${pend.term}" = ${cand.name} (${typeLabel(cand.type)}). Bir daha sormam.`
    : `"${pend.term}" için ${cand.name} kullanıyorum. (Sözlüğe yalnızca yönetici ve müdür terim ekleyebilir.)`;
  if (!pend.originalMessage) return reply(savedText, { glossary_saved: saved, term: pend.term });
  return {
    message: replaceTerm(pend.originalMessage, pend.term, cand.name),
    matches: [{ term: pend.term, canonical: cand.name }],
    preface: savedText
  };
}

async function handlePending({ key, pend, message, companyId, userId, role }) {
  const folded = glossary.fold(message).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  if (/^(vazgec|iptal|hayir|bos ver|yok|istemiyorum)$/.test(folded)) {
    pending.delete(key);
    return reply('Tamam, vazgeçtim.', { glossary_cancelled: true });
  }

  if (pend.candidates.length) {
    const num = folded.match(/^(\d)$/);
    if (num && pend.candidates[Number(num[1]) - 1]) {
      return chooseCandidate({ key, pend, cand: pend.candidates[Number(num[1]) - 1], companyId, userId, role });
    }
    if (pend.candidates.length === 1 && /^(evet|e|tamam|olur|dogru|aynen|evet o|o)$/.test(folded)) {
      return chooseCandidate({ key, pend, cand: pend.candidates[0], companyId, userId, role });
    }
    const byName = pend.candidates.filter((c) => glossary.fold(c.name).includes(folded) && folded.length >= 3);
    if (byName.length === 1) return chooseCandidate({ key, pend, cand: byName[0], companyId, userId, role });
  }

  // Yeni, ilgisiz bir soru geldiyse bekleyen soruyu bırak ve normal akışa dön
  if (/\?\s*$/.test(message) || folded.split(' ').length > 8) {
    pending.delete(key);
    return null;
  }

  // Serbest metin: "kum zımparası 200'lük" → ada göre ara
  const cands = await glossary.findCandidates(companyId, message, { limit: 5 });
  const unique = pickUnique(cands);
  if (unique) return chooseCandidate({ key, pend, cand: unique, companyId, userId, role });
  if (cands.length) {
    pend.candidates = cands;
    pend.createdAt = Date.now();
    return reply(`Hangisini kastettiniz?\n${candidateLines(cands)}\nNumarasını yazın.`, { glossary_clarification: true, term: pend.term });
  }
  return reply(`"${message}" ile eşleşen bir kayıt bulamadım. Ürün ya da müşterinin adını biraz farklı yazar mısınız? (Vazgeçmek için "vazgeç" yazın.)`, { glossary_clarification: true, term: pend.term });
}

async function findUnknownToken(companyId, message) {
  const tokens = [...String(message).matchAll(CODE_RE)].map((m) => m[0]);
  for (const token of tokens) {
    const letters = glossary.fold(token).replace(/[^a-z]/g, '');
    if (CODE_STOP.has(letters)) continue;
    if (await glossary.existsInSystem(companyId, token)) continue;
    return token;
  }
  return null;
}

async function process({ message, context }) {
  const companyId = context.company_id;
  const userId = context.user_id || 0;
  const role = context.role || 'user';
  if (!companyId || role === 'customer') return { message };

  const key = `${companyId}:${userId}`;
  const original = String(message || '');

  // 1) Bekleyen "ne demek?" sorusuna cevap
  const pend = pending.get(key);
  if (pend) {
    if (Date.now() - pend.createdAt > STATE_TTL_MS) pending.delete(key);
    else {
      const handled = await handlePending({ key, pend, message: original, companyId, userId, role });
      if (handled) return handled;
    }
  }

  // 2) Komutlar: listele / sil / öğret
  if (isListCommand(original)) {
    const rows = await glossary.list(companyId);
    if (!rows.length) {
      return reply('Şirket sözlüğünüz henüz boş. Terim öğretmek için "mavi200 = kum zımparası 200" yazabilir ya da tanımadığım bir terimde sorduğumda cevaplayabilirsiniz.');
    }
    const lines = rows.slice(0, 40).map((r) => `• ${r.term} → ${r.canonical_text} (${typeLabel(r.entity_type)})`).join('\n');
    return reply(`Şirket sözlüğünüzde ${rows.length} terim var:\n${lines}`, { glossary_count: rows.length });
  }

  const del = parseDelete(original);
  if (del) {
    if (!WRITE_ROLES.has(role)) return reply('Sözlükten terim silmek için yönetici ya da müdür yetkisi gerekir.');
    const removed = await glossary.remove(companyId, del.term);
    return reply(removed ? `"${removed.term}" sözlükten silindi.` : `Sözlükte "${del.term}" diye bir terim bulamadım.`);
  }

  const teach = parseTeach(original);
  if (teach) {
    if (!WRITE_ROLES.has(role)) return reply('Sözlüğe terim eklemek için yönetici ya da müdür yetkisi gerekir.');
    const cands = await glossary.findCandidates(companyId, teach.target, { limit: 5 });
    if (!cands.length) {
      return reply(`"${teach.target}" ile eşleşen bir ürün, müşteri ya da tedarikçi bulamadım. Adı biraz farklı yazar mısınız?`);
    }
    const unique = pickUnique(cands);
    const state = { term: teach.term, candidates: cands, originalMessage: null, createdAt: Date.now() };
    if (unique) return chooseCandidate({ key, pend: state, cand: unique, companyId, userId, role });
    pending.set(key, state);
    return reply(`"${teach.term}" için hangisini kastediyorsunuz?\n${candidateLines(cands)}\nNumarasını yazın.`, { glossary_clarification: true, term: teach.term });
  }

  // 3) Sözlükteki terimleri çöz
  const resolved = await glossary.resolveMessage(companyId, original);
  const msg = resolved.message;

  // 4) Tanımadığı kod benzeri terim → sor
  const unknown = await findUnknownToken(companyId, msg);
  if (unknown) {
    const cands = await glossary.findCandidates(companyId, '', { limit: 5, code: unknown });
    pending.set(key, { term: unknown, candidates: cands, originalMessage: msg, createdAt: Date.now() });
    const tail = WRITE_ROLES.has(role)
      ? 'Doğru olanı seçerseniz sözlüğe kaydederim, bir daha sormam.'
      : 'Seçtiğinizi bu soru için kullanırım.';
    if (cands.length) {
      return reply(`"${unknown}" ne demek? Şunlardan biri mi?\n${candidateLines(cands)}\nNumarasını yazın ya da doğru adı söyleyin. ${tail}`, { glossary_clarification: true, term: unknown });
    }
    return reply(`"${unknown}" ne demek? Sistemde eşleşen bir ürün ya da müşteri bulamadım. Hangisini kastettiğinizi yazar mısınız? (Örn: kum zımparası 200)`, { glossary_clarification: true, term: unknown });
  }

  return { message: msg, matches: resolved.matches };
}

module.exports = { process, parseTeach, parseDelete, isListCommand, replaceTerm, pickUnique, _pending: pending };
