// Dağıtım modu: "cloud" (varsayılan, bugünkü davranış) veya "onprem" (müşterinin kendi cihazı).
// onprem'de müşteri verisi dışarı çıkmaz: AI yalnızca yerel Ollama, Sentry kapalı.
// Fonksiyonlar env'i çağrı anında okur (testlerde process.env değiştirilebilsin diye).

const DEPLOYMENT_MODES = ['cloud', 'onprem'];

const getDeploymentMode = (env = process.env) =>
  String(env.DEPLOYMENT_MODE || 'cloud').trim().toLowerCase();

const isOnPrem = (env = process.env) => getDeploymentMode(env) === 'onprem';

// Yerel/özel ağ adresi mi? (localhost, docker servis adı, 10/172.16-31/192.168, *.local)
const isPrivateHost = (hostname = '') => {
  const host = String(hostname).toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return false;
  if (['localhost', 'host.docker.internal', '::1', '0.0.0.0'].includes(host)) return true;
  if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan')) return true;
  if (!host.includes('.') && !host.includes(':')) return true; // tek etiketli ad: docker servisi ("ollama")

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }

  // IPv6 unique-local (fc00::/7) ve link-local (fe80::/10)
  return /^(fc|fd)[0-9a-f]{2}:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host);
};

// onprem kuralları ihlal ediliyorsa hata mesajlarını döner (boş dizi = sorun yok).
const getOnPremViolations = (env = process.env) => {
  if (!isOnPrem(env)) return [];

  const violations = [];
  const provider = String(env.AI_PROVIDER || env.OLLAMA_PROVIDER || 'ollama').trim().toLowerCase();
  if (provider !== 'ollama') {
    violations.push(
      `DEPLOYMENT_MODE=onprem iken AI_PROVIDER yalnızca "ollama" olabilir (şu an: "${provider}"). ` +
        'Müşteri verisi dış yapay zekâ sağlayıcısına gönderilemez.'
    );
  }

  const ollamaUrl = env.OLLAMA_BASE_URL || 'http://localhost:11434';
  let hostname = '';
  try {
    hostname = new URL(ollamaUrl).hostname;
  } catch {
    violations.push(`OLLAMA_BASE_URL geçersiz: "${ollamaUrl}".`);
  }
  if (hostname && !isPrivateHost(hostname)) {
    violations.push(
      `DEPLOYMENT_MODE=onprem iken OLLAMA_BASE_URL yerel ağda olmalı (şu an: "${ollamaUrl}").`
    );
  }

  return violations;
};

const isSentryEnabled = (env = process.env) =>
  env.NODE_ENV === 'production' && Boolean(env.SENTRY_DSN) && !isOnPrem(env);

// super_admin şirketler arası her şeyi görür; müşteri cihazında bu bir arka kapı olur.
// onprem'de bu rolle giriş, token yenileme ve mevcut token'lar reddedilir.
const superAdminAllowed = (env = process.env) => !isOnPrem(env);

// Döviz kuru aracı (open.er-api.com): müşteri verisi göndermez; varsayılan açık.
const externalRatesAllowed = (env = process.env) =>
  String(env.ALLOW_EXTERNAL_RATES ?? 'true').trim().toLowerCase() !== 'false';

module.exports = {
  DEPLOYMENT_MODES,
  getDeploymentMode,
  isOnPrem,
  isPrivateHost,
  getOnPremViolations,
  isSentryEnabled,
  superAdminAllowed,
  externalRatesAllowed,
};
