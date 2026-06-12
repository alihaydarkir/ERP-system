const pool = require('../src/config/database');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
const EMBEDDING_DIM = parseInt(process.env.RAG_EMBEDDING_DIM, 10) || 768;

const RAG_ENTRIES = [
  // 1) Sipariş yönetimi kuralları
  {
    title: 'Sipariş iptal politikası',
    category: 'sipariş_yönetimi',
    source: 'erp_policy_manual_tr_v1',
    content:
      'Müşteri siparişleri, sipariş oluşturma zamanından itibaren 48 saat içinde cezasız olarak iptal edilebilir. 48 saat sonrasında iptal yalnızca operasyon birimi onayı ile yapılır ve hazırlık/lojistik maliyetleri uygulanabilir.',
  },
  {
    title: 'İade süreci ve 14 gün iade garantisi',
    category: 'sipariş_yönetimi',
    source: 'erp_policy_manual_tr_v1',
    content:
      'Teslim edilen ürünler için 14 gün iade garantisi uygulanır. İade talebi müşteri hizmetleri kaydı ile başlatılır, ürün kalite kontrolünden sonra iade onayı verilir ve ödeme iadesi 3-7 iş günü içinde tamamlanır.',
  },
  {
    title: 'Gecikmiş sipariş prosedürü',
    category: 'sipariş_yönetimi',
    source: 'erp_policy_manual_tr_v1',
    content:
      'Planlanan teslim tarihini aşan siparişler gecikmiş sipariş olarak işaretlenir. Sistem otomatik uyarı üretir, müşteri bilgilendirilir, yeni tahmini teslim tarihi paylaşılır ve gecikme nedeni operasyon notlarına eklenir.',
  },
  {
    title: 'Minimum sipariş tutarı kuralları',
    category: 'sipariş_yönetimi',
    source: 'erp_policy_manual_tr_v1',
    content:
      'B2B müşteriler için minimum sipariş tutarı 1.000 TL olarak uygulanır. Bu tutarın altındaki siparişlerde sabit işlem/lojistik ücreti tanımlanabilir. VIP müşteriler ve kampanya dönemleri için istisna tanımlanabilir.',
  },

  // 2) Fatura ve ödeme kuralları
  {
    title: 'Standart vade süresi seçenekleri',
    category: 'fatura_ve_ödeme',
    source: 'erp_finance_rules_tr_v1',
    content:
      'Kurumsal satışlarda standart vade seçenekleri 30, 45 ve 60 gündür. Müşteri risk skoru ve geçmiş ödeme performansına göre uygun vade ERP üzerinde atanır ve sözleşme kayıtları ile doğrulanır.',
  },
  {
    title: 'KDV hesaplama kuralları',
    category: 'fatura_ve_ödeme',
    source: 'erp_finance_rules_tr_v1',
    content:
      'Genel ürün ve hizmetlerde KDV oranı %18, temel gıda ürünlerinde %8 olarak uygulanır. Fatura satır bazında KDV hesaplanır, satır toplamları üzerinden belge geneli vergi toplamı oluşturulur.',
  },
  {
    title: 'Erken ödeme indirimi politikası',
    category: 'fatura_ve_ödeme',
    source: 'erp_finance_rules_tr_v1',
    content:
      'Vade tarihinden önce yapılan ödemelerde müşteri segmentine göre %1 ila %3 erken ödeme indirimi uygulanabilir. İndirim, ödeme dekontu doğrulandıktan sonra ERP\'de muhasebe fişine yansıtılır.',
  },
  {
    title: 'Gecikme faizi kuralları',
    category: 'fatura_ve_ödeme',
    source: 'erp_finance_rules_tr_v1',
    content:
      'Vadesi geçen alacaklar için sözleşme şartlarına bağlı gecikme faizi uygulanır. Faiz hesaplaması günlük bazda yürütülür, müşteri ekstresinde ayrı satır olarak gösterilir ve tahsilat planına eklenir.',
  },

  // 3) Stok yönetimi kuralları
  {
    title: 'Minimum stok seviyesi belirleme yöntemi',
    category: 'stok_yönetimi',
    source: 'erp_inventory_rules_tr_v1',
    content:
      'Minimum stok seviyesi; ortalama günlük tüketim, tedarik süresi ve güvenlik stoğu parametreleri ile hesaplanır. Formül: Minimum Stok = (Günlük Tüketim x Tedarik Süresi) + Güvenlik Stoğu.',
  },
  {
    title: 'Stok sayım prosedürü',
    category: 'stok_yönetimi',
    source: 'erp_inventory_rules_tr_v1',
    content:
      'Döngüsel sayım aylık, tam envanter sayımı yıllık yapılır. Sayım farkları ERP\'de tutanak ile kaydedilir, onay sonrası düzeltme hareketi oluşturulur ve finans ekipleri bilgilendirilir.',
  },
  {
    title: 'Hasarlı ürün prosedürü',
    category: 'stok_yönetimi',
    source: 'erp_inventory_rules_tr_v1',
    content:
      'Hasarlı ürünler satılabilir stoktan derhal ayrılır ve "karantina" statüsüne alınır. Hasar nedeni, fotoğraf ve sorumlu kayıtları ile raporlanır; iade, tamir veya hurda kararı kalite birimi onayı ile verilir.',
  },
  {
    title: 'Tedarikçi sipariş eşiği kuralları',
    category: 'stok_yönetimi',
    source: 'erp_inventory_rules_tr_v1',
    content:
      'Tedarikçi bazında minimum sipariş adedi/tutarı ERP\'de tanımlanır. Yeniden sipariş önerisi bu eşiklerin altına düşmeyecek şekilde otomatik oluşturulur ve satın alma onay akışına gönderilir.',
  },

  // 4) Müşteri yönetimi
  {
    title: 'Yeni müşteri kredi limiti belirleme',
    category: 'müşteri_yönetimi',
    source: 'erp_customer_policy_tr_v1',
    content:
      'Yeni müşteriler için başlangıç kredi limiti finansal beyan, sektör riski ve referans bilgilerine göre belirlenir. Varsayılan düşük risk limiti atanır, 3 aylık performans sonrası limit revize edilir.',
  },
  {
    title: 'VIP müşteri kriterleri',
    category: 'müşteri_yönetimi',
    source: 'erp_customer_policy_tr_v1',
    content:
      'Yıllık toplam net alışverişi 50.000 TL ve üzeri olan müşteriler VIP olarak sınıflandırılır. VIP müşterilere öncelikli destek, esnek vade ve özel kampanya koşulları tanımlanabilir.',
  },
  {
    title: 'Müşteri şikayet prosedürü',
    category: 'müşteri_yönetimi',
    source: 'erp_customer_policy_tr_v1',
    content:
      'Müşteri şikayetleri talep numarası ile kayıt altına alınır, öncelik seviyesi atanır ve en geç 24 saat içinde ilk geri dönüş yapılır. Çözüm adımları kapanış notu ile ERP üzerinde kapatılır.',
  },
  {
    title: 'Müşteri hesap dondurma koşulları',
    category: 'müşteri_yönetimi',
    source: 'erp_customer_policy_tr_v1',
    content:
      'Uzun süreli ödeme gecikmesi, sözleşme ihlali veya riskli işlem tespiti durumunda müşteri hesabı geçici olarak dondurulabilir. Dondurma kararı finans ve yönetici onayı ile uygulanır.',
  },

  // 5) Genel sistem kullanımı
  {
    title: 'Kullanıcı yetki seviyeleri açıklaması',
    category: 'genel_sistem',
    source: 'erp_system_guide_tr_v1',
    content:
      'Sistemde temel roller Admin, Manager ve User olarak tanımlanır. Admin tam yetkilidir, Manager operasyonel yönetim yetkilerine sahiptir, User yalnızca tanımlı modüllerde işlem yapabilir.',
  },
  {
    title: 'Raporlama sıklığı ve türleri',
    category: 'genel_sistem',
    source: 'erp_system_guide_tr_v1',
    content:
      'Operasyonel raporlar günlük, yönetim raporları haftalık, finansal özet raporlar aylık üretilir. Stok, satış, tahsilat, gecikme ve performans raporları standart rapor setinde yer alır.',
  },
  {
    title: 'Veri yedekleme politikası',
    category: 'genel_sistem',
    source: 'erp_system_guide_tr_v1',
    content:
      'Veritabanı yedekleri günlük olarak otomatik alınır, en az 7 günlük saklama uygulanır. Kritik konfigürasyonlar ve dokümanlar ayrı yedek politikasına tabidir, geri dönüş testleri periyodik yapılır.',
  },
  {
    title: 'Sistem bakım penceresi',
    category: 'genel_sistem',
    source: 'erp_system_guide_tr_v1',
    content:
      'Planlı bakım penceresi pazar günleri 02:00-04:00 arasıdır. Bu süreçte sürüm güncellemeleri, performans optimizasyonları ve güvenlik yamaları uygulanır; kullanıcılar önceden bilgilendirilir.',
  },

  // ── Finansal KPI ve Analiz ────────────────────────────────────────────
  {
    title: 'Sağlıklı çek/ciro oranı ve likidite hedefleri',
    category: 'finansal_kpi',
    source: 'erp_finance_guide_tr_v1',
    content:
      'Sağlıklı bir işletmede vadeli çek tutarının aylık ciroya oranı %30\'u geçmemelidir. Vadesi 30 günden uzun gecikmiş çekler likit varlık kabul edilmez. Aylık nakit akışının en az 3 aylık gideri karşılaması önerilir. Vadesi 60 günü aşan çekler için hukuki takip başlatılmalıdır.',
  },
  {
    title: 'Temel finansal oran analizi ve ERP takibi',
    category: 'finansal_kpi',
    source: 'erp_finance_guide_tr_v1',
    content:
      'Brüt kâr marjı = (Satış geliri - Satılan malın maliyeti) / Satış geliri. Hedef brüt marj sektöre göre değişir; elektronik için %15-25, gıda için %20-35 tipiktir. Ay sonu envanter değeri ile başlangıç değerinin karşılaştırılması stok devir hızını verir. Stok devir hızı düşükse aşırı stok veya talep düşüşü sinyali olabilir.',
  },
  {
    title: 'Aylık gelir tahmin ve sapma analizi',
    category: 'finansal_kpi',
    source: 'erp_finance_guide_tr_v1',
    content:
      'Aylık gelir hedefinden ±%10 sapma normal kabul edilir. ±%20 sapma yönetim dikkatini gerektiren alarm seviyesidir. Sapma tespitinde geçen yılın aynı ayı ve önceki 3 ay ortalaması referans alınır. Mevsimsel etkiler (tatil dönemleri, ekonomik konjonktür) normalizasyon hesaplamasında dikkate alınmalıdır.',
  },

  // ── Müşteri Segmentasyonu ─────────────────────────────────────────────
  {
    title: 'ABC müşteri segmentasyonu kriterleri',
    category: 'müşteri_yönetimi',
    source: 'erp_customer_guide_tr_v1',
    content:
      'A segmenti: yıllık 100.000 TL ve üzeri alışveriş, öncelikli hizmet, özel fiyatlandırma. B segmenti: 30.000-100.000 TL arası alışveriş, standart hizmet. C segmenti: 30.000 TL altı alışveriş, otomatik süreçler. Her segmentin iletişim sıklığı farklıdır: A için haftalık, B için aylık, C için üç aylık takip önerilir.',
  },
  {
    title: 'Müşteri churn (kayıp) risk uyarı kriterleri',
    category: 'müşteri_yönetimi',
    source: 'erp_customer_guide_tr_v1',
    content:
      'Son 3 ayda sipariş vermemiş müşteriler churn riski taşır. Son 6 ayda sipariş vermeyen müşteriler pasif kabul edilir. Risk uyarı kriterleri: sipariş sıklığında %50 düşüş, ortalama sipariş tutarında %30 düşüş, veya son 2 faturada ödeme gecikmesi. Bu durumlarda proaktif müşteri iletişimi başlatılmalıdır.',
  },

  // ── Stok Optimizasyonu ────────────────────────────────────────────────
  {
    title: 'EOQ (Ekonomik sipariş miktarı) ve güvenlik stoğu hesabı',
    category: 'stok_yönetimi',
    source: 'erp_inventory_guide_tr_v1',
    content:
      'Güvenlik stoğu = Günlük ortalama tüketim × Tedarik süresi (gün) × Güvenlik katsayısı (genellikle 1.5). Kritik ürünler için minimum stok seviyesi güvenlik stoğunun 2 katı olarak belirlenir. EOQ formülü: √(2 × Yıllık talep × Sipariş maliyeti / Elde tutma maliyeti). Aylık satış hızının 2 katı stok bulundurmak genel kural olarak önerilir.',
  },
  {
    title: 'Sezonluk stok planlaması ve kampanya öncesi hazırlık',
    category: 'stok_yönetimi',
    source: 'erp_inventory_guide_tr_v1',
    content:
      'Yoğun satış dönemlerinden (yılbaşı, okullar açılışı, bayramlar) 6-8 hafta önce kritik ürünlerde stok 2-3 katına çıkarılmalıdır. Geçen yılın aynı dönem satış verileri baz alınarak %20 büyüme payı hesaplanır. Tedarikçi teslim süresi mevsimsel dönemlerde uzayabilir, bu nedenle sipariş 2 hafta öne alınmalıdır.',
  },

  // ── Satış Politikaları ────────────────────────────────────────────────
  {
    title: 'İskonto yetki seviyeleri ve onay prosedürü',
    category: 'satış_politikaları',
    source: 'erp_sales_guide_tr_v1',
    content:
      'Satış temsilcisi (kullanıcı rolü): %5\'e kadar iskonto bağımsız uygulayabilir. Satış müdürü (yönetici rolü): %5-15 arası iskonto için onay verebilir. Genel müdür/admin: %15 ve üzeri iskontolar için onay gerektirir. Toplu alımlar (20+ adet) için ayrıca %5 ek indirim politikası mevcuttur. Tüm iskontolar faturaya yansıtılır ve raporlanır.',
  },
  {
    title: 'Kredi limiti ve ödeme vadesi yönetimi',
    category: 'satış_politikaları',
    source: 'erp_sales_guide_tr_v1',
    content:
      'Yeni müşteriler ilk 3 ayda peşin ödeme ile çalışır. 3 ay düzenli alışveriş sonrası Net 30 vade açılabilir. Kredi limiti başlangıçta aylık ortalama alışverişin 2 katı olarak belirlenir. Vadesi geçmiş borçlar varken yeni vadeli sipariş alınmaz. Limit artışları için son 6 ay ödeme sicili temiz olmalı ve yönetici onayı gerekir.',
  },

  // ── Tedarikçi Yönetimi ────────────────────────────────────────────────
  {
    title: 'Tedarikçi değerlendirme kriterleri ve skor kartı',
    category: 'tedarikçi_yönetimi',
    source: 'erp_supplier_guide_tr_v1',
    content:
      'Tedarikçi skor kartı 5 boyutta değerlendirilir: (1) Zamanında teslimat oranı (%35 ağırlık), (2) Ürün kalitesi/fire oranı (%25), (3) Fiyat rekabetçiliği (%20), (4) İletişim/yanıt süresi (%10), (5) Belgeler ve uyumluluk (%10). 100 puan üzerinden 80+ puan alan tedarikçiler tercihli, 60-79 arası standart, 60 altı değerlendirme listesine alınır.',
  },
  {
    title: 'Alternatif tedarikçi ve tedarik zinciri risk yönetimi',
    category: 'tedarikçi_yönetimi',
    source: 'erp_supplier_guide_tr_v1',
    content:
      'Kritik ürünler için en az 2 alternatif tedarikçi tanımlanmalıdır. Tek tedarikçiye bağımlılık oranı %60\'ı geçmemelidir. Tedarikçi değişikliği kararı: fiyat farkı %15 veya üzerinde ise veya son 6 ayda 3\'ten fazla gecikmiş teslimat durumunda gündeme gelir. Tedarikçi geçiş süreci minimum 30 gündür.',
  },
];

async function generateEmbedding(text) {
  try {
    const response = await axios.post(
      `${OLLAMA_URL}/api/embeddings`,
      {
        model: EMBEDDING_MODEL,
        prompt: text,
      },
      {
        timeout: 60000,
      }
    );

    const embedding = response.data?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIM) {
      throw new Error(
        `Embedding boyutu geçersiz. Beklenen: ${EMBEDDING_DIM}, gelen: ${Array.isArray(embedding) ? embedding.length : 'null'}`
      );
    }

    return embedding;
  } catch (error) {
    const serverMessage = error.response?.data?.error || error.response?.data?.message;
    throw new Error(serverMessage || error.message || 'Embedding üretilemedi');
  }
}

async function ensureRagSchema() {
  const migrationPath = path.join(__dirname, '..', 'migrations', '038_add_embedding_to_rag_knowledge.sql');

  if (fs.existsSync(migrationPath)) {
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(migrationSql);
    return;
  }

  // Fallback if migration file is not found
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS vector;
    ALTER TABLE rag_knowledge
      ADD COLUMN IF NOT EXISTS title VARCHAR(255),
      ADD COLUMN IF NOT EXISTS category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS source VARCHAR(255),
      ADD COLUMN IF NOT EXISTS embedding vector(${EMBEDDING_DIM})
  `);
}

async function ensureVectorIndex() {
  await pool.query(`
    DO $$
    DECLARE
      vector_count BIGINT;
    BEGIN
      SELECT COUNT(*) INTO vector_count
      FROM rag_knowledge
      WHERE embedding IS NOT NULL;

      IF vector_count > 0 THEN
        IF to_regclass('public.idx_rag_knowledge_embedding') IS NULL THEN
          EXECUTE 'CREATE INDEX idx_rag_knowledge_embedding
                   ON rag_knowledge USING ivfflat (embedding vector_cosine_ops)
                   WITH (lists = 10)';
        END IF;
      END IF;
    END $$;
  `);
}

async function seedRagKnowledge() {
  try {
    console.log('🌱 RAG bilgi tabanı seed işlemi başlatıldı...');
    console.log(`📡 Embedding modeli: ${EMBEDDING_MODEL}`);

    await ensureRagSchema();

    let insertedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const entry of RAG_ENTRIES) {
      const exists = await pool.query(
        'SELECT id FROM rag_knowledge WHERE title = $1 AND source = $2 LIMIT 1',
        [entry.title, entry.source]
      );

      if (exists.rows.length > 0) {
        skippedCount++;
        continue;
      }

      try {
        process.stdout.write(`  ⏳ Embedding üretiliyor: "${entry.title}"...`);
        const embedding = await generateEmbedding(entry.content);
        process.stdout.write(' ✓\n');

        const metadata = { language: 'tr', seeded_by: 'scripts/seedRag.js' };

        await pool.query(
          `INSERT INTO rag_knowledge (title, content, category, source, metadata, embedding)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::vector)`,
          [entry.title, entry.content, entry.category, entry.source, JSON.stringify(metadata), `[${embedding.join(',')}]`]
        );

        insertedCount++;
      } catch (entryError) {
        failedCount++;
        console.error(` ✗ (${entry.title})`, entryError.message);
      }
    }

    await ensureVectorIndex();

    if (insertedCount === 0 && failedCount > 0) {
      throw new Error('Hiç kayıt eklenemedi. Ollama ve embedding model ayarlarını kontrol edin.');
    }

    console.log(`\n✅ RAG seed tamamlandı. ${insertedCount} kayıt eklendi, ${skippedCount} kayıt atlandı, ${failedCount} kayıt başarısız.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ RAG seed hatası:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedRagKnowledge();
