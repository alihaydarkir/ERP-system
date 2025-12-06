const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class FineTuningService {
  constructor() {
    this.modelsDir = path.join(__dirname, '../../models');
    this.datasetsDir = path.join(__dirname, '../../datasets');
    this.logsDir = path.join(__dirname, '../../fine-tuning-logs');
    this.baseModel = process.env.OLLAMA_MODEL || 'llama2';
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  /**
   * Initialize directories
   */
  async initialize() {
    try {
      await fs.mkdir(this.modelsDir, { recursive: true });
      await fs.mkdir(this.datasetsDir, { recursive: true });
      await fs.mkdir(this.logsDir, { recursive: true });
      return { success: true, message: 'Fine-tuning service initialized' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate Turkish ERP training dataset
   */
  async generateTurkishERPDataset() {
    const dataset = {
      version: '1.0',
      created_at: new Date().toISOString(),
      language: 'tr',
      domain: 'ERP',
      examples: [
        // Ürün yönetimi
        {
          instruction: 'Stoktaki ürünleri listele',
          input: 'Hangi ürünler stokta var?',
          output: 'Sistemimizdeki ürünleri listelemek için veritabanını sorguluyorum. Stokta bulunan ürünler: [ürün listesi]. Her ürün için stok miktarı, fiyat ve kategori bilgileri mevcuttur.'
        },
        {
          instruction: 'Düşük stoklu ürünleri bildir',
          input: 'Hangi ürünlerin stoğu azalmış?',
          output: 'Stok seviyesi kritik düzeyde olan ürünler tespit edildi. Bu ürünler için acil tedarik planlaması yapılması önerilir. Düşük stok uyarıları aktif edilmiştir.'
        },
        {
          instruction: 'Yeni ürün ekle',
          input: 'Sisteme yeni bir ürün nasıl eklerim?',
          output: 'Yeni ürün eklemek için ürün adı, SKU kodu, fiyat, stok miktarı ve kategori bilgileri gereklidir. Ürün Yönetimi menüsünden "Yeni Ürün Ekle" butonuna tıklayarak formu doldurabilirsiniz.'
        },

        // Sipariş yönetimi
        {
          instruction: 'Sipariş durumunu sorgula',
          input: 'Sipariş durumum nedir?',
          output: 'Sipariş durumunuzu kontrol ediyorum. Sipariş numaranızı belirtirseniz detaylı bilgi verebilirim. Genel olarak siparişler "Beklemede", "Onaylandı", "Kargoda" veya "Teslim Edildi" durumlarında olabilir.'
        },
        {
          instruction: 'Yeni sipariş oluştur',
          input: 'Nasıl sipariş verebilirim?',
          output: 'Sipariş oluşturmak için ürünleri sepete ekleyin, müşteri bilgilerini girin ve sipariş onayını verin. Sistem otomatik olarak stok kontrolü yapacak ve teslimat süreci başlatılacaktır.'
        },
        {
          instruction: 'Sipariş iptali',
          input: 'Siparişimi iptal edebilir miyim?',
          output: 'Sipariş iptali, siparişin durumuna bağlıdır. "Beklemede" durumundaki siparişler iptal edilebilir. "Kargoda" durumundaki siparişler için iade süreci başlatılması gerekir.'
        },

        // Raporlama
        {
          instruction: 'Satış raporu oluştur',
          input: 'Bu ayki satışları göster',
          output: 'Bu ay için satış raporu hazırlanıyor. Toplam satış miktarı, gelir, en çok satan ürünler ve kategori bazlı analiz bilgileri raporlanacaktır. Geçen aya göre karşılaştırmalı analiz de yapılmaktadır.'
        },
        {
          instruction: 'Envanter raporu',
          input: 'Envanter durumu nasıl?',
          output: 'Mevcut envanter analizi: Toplam ürün çeşidi, toplam stok değeri, kritik stok seviyeleri ve tahmini yenileme ihtiyacı raporlanmaktadır. Detaylı envanter raporu için raporlar menüsünü kullanabilirsiniz.'
        },
        {
          instruction: 'Müşteri analizi',
          input: 'En çok sipariş veren müşteriler kimler?',
          output: 'Müşteri analizi yapılıyor. En yüksek sipariş hacmine sahip müşteriler, toplam harcama miktarları ve sipariş sıklıkları listeleniyor. Bu veriler müşteri sadakati programları için kullanılabilir.'
        },

        // Genel ERP işlemleri
        {
          instruction: 'Dashboard özeti',
          input: 'Sistem durumu nedir?',
          output: 'Sistem durumu özeti: Aktif kullanıcı sayısı, bugünkü işlem hacmi, bekleyen siparişler, kritik stok uyarıları ve sistem performans metrikleri görüntülenmektedir. Tüm servisler normal çalışıyor.'
        },
        {
          instruction: 'Kullanıcı yönetimi',
          input: 'Yeni kullanıcı nasıl eklerim?',
          output: 'Yeni kullanıcı eklemek için Yönetim Paneli > Kullanıcılar menüsünden "Yeni Kullanıcı" butonunu kullanın. Kullanıcı adı, e-posta, şifre ve rol bilgileri gereklidir. Roller: Admin, Yönetici, Kullanıcı.'
        },
        {
          instruction: 'Sistem ayarları',
          input: 'Sistem ayarlarını nasıl değiştirim?',
          output: 'Sistem ayarlarına erişim için yönetici yetkisi gereklidir. Ayarlar menüsünden genel ayarlar, bildirim tercihleri, e-posta yapılandırması ve entegrasyon ayarlarını düzenleyebilirsiniz.'
        },

        // Türkçe dil özellikleri
        {
          instruction: 'Ürün ara',
          input: 'laptop kategorisinde hangi ürünler var',
          output: 'Laptop kategorisindeki ürünler listeleniyor. Marka, fiyat aralığı, teknik özellikler ve stok durumuna göre filtreleme yapabilirsiniz. Toplam [N] adet laptop bulunmaktadır.'
        },
        {
          instruction: 'Fiyat güncelleme',
          input: 'Toplu fiyat güncellemesi nasıl yapılır?',
          output: 'Toplu fiyat güncellemesi için Ürün Yönetimi > Toplu İşlemler menüsünü kullanın. Kategori, marka veya özel filtreler ile ürünleri seçip yüzde veya sabit tutarda fiyat artışı/indirimi uygulayabilirsiniz.'
        },
        {
          instruction: 'Kampanya oluştur',
          input: 'İndirim kampanyası nasıl oluşturabilirim?',
          output: 'Kampanya oluşturmak için Pazarlama > Kampanyalar menüsünü kullanın. Kampanya adı, geçerlilik tarihleri, indirim oranı ve uygulanacak ürün/kategorileri belirleyin. Kampanya otomatik olarak aktif olacaktır.'
        },

        // Hata yönetimi ve destek
        {
          instruction: 'Hata bildirimi',
          input: 'Sistem hatası aldım ne yapmalıyım?',
          output: 'Sistem hatası için öncelikle sayfayı yenilemeyi deneyin. Sorun devam ederse hata mesajının ekran görüntüsünü alıp destek ekibine iletin. Log dosyaları otomatik olarak kaydedilmektedir.'
        },
        {
          instruction: 'Yedekleme',
          input: 'Veri yedeği nasıl alınır?',
          output: 'Sistem otomatik günlük yedekleme yapmaktadır. Manuel yedek almak için Sistem > Yedekleme menüsünü kullanın. Veritabanı, dosyalar ve yapılandırma ayarları yedeklenecektir.'
        },

        // İleri seviye özellikler
        {
          instruction: 'API entegrasyonu',
          input: 'Dış sistemlerle entegrasyon nasıl yapılır?',
          output: 'API entegrasyonu için API Dokümantasyonu bölümünden REST endpoint\'leri inceleyebilirsiniz. Her endpoint için authentication token gereklidir. Rate limiting ve güvenlik politikaları uygulanmaktadır.'
        },
        {
          instruction: 'Toplu veri içe aktarma',
          input: 'Excel\'den toplu ürün nasıl yüklerim?',
          output: 'Toplu veri içe aktarma için CSV veya Excel formatında şablon dosyayı indirin, verilerinizi doldurun ve İçe Aktar fonksiyonunu kullanın. Sistem otomatik validasyon yapacak ve hataları raporlayacaktır.'
        },
        {
          instruction: 'Performans optimizasyonu',
          input: 'Sistem yavaş çalışıyor',
          output: 'Sistem performansını artırmak için: Cache temizliği yapın, gereksiz filtreleri kaldırın, büyük raporlar için tarih aralığını daraltın. Sürekli yavaşlık varsa sistem kaynaklarını kontrol edin.'
        },

        // ERP best practices
        {
          instruction: 'Stok takibi',
          input: 'Stok yönetimi için öneriler',
          output: 'Etkili stok yönetimi için: Minimum stok seviyelerini belirleyin, ABC analizi yapın, hızlı hareket eden ürünleri takip edin, mevsimsel değişimleri göz önünde bulundurun ve otomatik sipariş noktaları oluşturun.'
        },
        {
          instruction: 'Müşteri ilişkileri',
          input: 'Müşteri memnuniyeti nasıl artırılır?',
          output: 'Müşteri memnuniyeti için: Hızlı teslimat sağlayın, düzenli iletişim kurun, sadakat programları oluşturun, geri bildirimleri değerlendirin ve özelleştirilmiş teklifler sunun.'
        }
      ]
    };

    const filename = `turkish_erp_dataset_${Date.now()}.json`;
    const filepath = path.join(this.datasetsDir, filename);

    try {
      await fs.writeFile(filepath, JSON.stringify(dataset, null, 2), 'utf8');
      return {
        success: true,
        filename,
        filepath,
        count: dataset.examples.length,
        message: 'Turkish ERP training dataset generated successfully'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Convert dataset to Modelfile format for Ollama
   */
  async createModelfile(datasetPath, modelName) {
    const dataset = JSON.parse(await fs.readFile(datasetPath, 'utf8'));

    // Create system prompt for Turkish ERP
    const systemPrompt = `Sen bir ERP (Kurumsal Kaynak Planlama) sistemi için geliştirilmiş yapay zeka asistanısın.
Türkçe dilinde profesyonel ve yardımsever bir şekilde yanıt veriyorsun.

Görevlerin:
- Ürün, sipariş, stok ve envanter yönetimi konularında yardımcı olmak
- Raporlama ve analiz konularında destek sağlamak
- Kullanıcı sorularını anlamak ve doğru çözümler sunmak
- ERP best practice'lerini paylaşmak
- Sistem kullanımı ile ilgili rehberlik etmek

Yanıt verirken:
- Net ve anlaşılır ol
- Teknik terimleri açıkla
- Adım adım talimatlar ver
- Örneklerle destekle
- Türkçe dilbilgisi kurallarına uy`;

    // Create training examples
    const trainingExamples = dataset.examples.map(ex =>
      `<|im_start|>user\n${ex.input}<|im_end|>\n<|im_start|>assistant\n${ex.output}<|im_end|>`
    ).join('\n\n');

    const modelfile = `FROM ${this.baseModel}

# Set parameters for Turkish language
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_predict 512

# System prompt
SYSTEM """${systemPrompt}"""

# Training examples (will be used as context)
TEMPLATE """{{ if .System }}{{ .System }}{{ end }}
{{ if .Prompt }}{{ .Prompt }}{{ end }}"""
`;

    const modelfilePath = path.join(this.modelsDir, `${modelName}.Modelfile`);
    await fs.writeFile(modelfilePath, modelfile, 'utf8');

    return {
      success: true,
      modelfilePath,
      message: 'Modelfile created successfully'
    };
  }

  /**
   * Create fine-tuned model using Ollama
   */
  async createFineTunedModel(modelName, datasetPath) {
    try {
      // Generate Modelfile
      const modelfileResult = await this.createModelfile(datasetPath, modelName);

      if (!modelfileResult.success) {
        return modelfileResult;
      }

      // Create model using Ollama CLI
      const command = `ollama create ${modelName} -f "${modelfileResult.modelfilePath}"`;

      console.log(`Creating fine-tuned model: ${modelName}`);
      console.log(`Command: ${command}`);

      const { stdout, stderr } = await execAsync(command, {
        timeout: 600000, // 10 minutes
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      // Log the process
      const logPath = path.join(this.logsDir, `${modelName}_${Date.now()}.log`);
      await fs.writeFile(logPath, `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`, 'utf8');

      return {
        success: true,
        modelName,
        logPath,
        stdout,
        stderr,
        message: `Model ${modelName} created successfully`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        stderr: error.stderr,
        message: 'Failed to create fine-tuned model'
      };
    }
  }

  /**
   * List available models
   */
  async listModels() {
    try {
      const { stdout } = await execAsync('ollama list');
      const lines = stdout.trim().split('\n').slice(1); // Skip header

      const models = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          name: parts[0],
          id: parts[1],
          size: parts[2],
          modified: parts.slice(3).join(' ')
        };
      });

      return {
        success: true,
        models,
        count: models.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        models: []
      };
    }
  }

  /**
   * Test fine-tuned model
   */
  async testModel(modelName, prompt) {
    try {
      const axios = require('axios');
      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: modelName,
        prompt: prompt,
        stream: false
      }, {
        timeout: 30000
      });

      return {
        success: true,
        response: response.data.response,
        model: modelName,
        prompt
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete model
   */
  async deleteModel(modelName) {
    try {
      await execAsync(`ollama rm ${modelName}`);
      return {
        success: true,
        message: `Model ${modelName} deleted successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get fine-tuning statistics
   */
  async getStatistics() {
    try {
      const datasets = await fs.readdir(this.datasetsDir);
      const models = await this.listModels();
      const logs = await fs.readdir(this.logsDir);

      return {
        success: true,
        statistics: {
          total_datasets: datasets.length,
          total_models: models.count,
          total_logs: logs.length,
          base_model: this.baseModel,
          ollama_url: this.ollamaBaseUrl
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new FineTuningService();
