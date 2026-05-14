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
