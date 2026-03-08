import axios from 'axios';

// TCMB API'den güncel kurları çek
const TCMB_API = 'https://evds2.tcmb.gov.tr/service/evds/';

// Alternatif olarak basit bir API kullanabiliriz
const EXCHANGE_API = 'https://api.exchangerate-api.com/v4/latest/TRY';

class CurrencyService {
  constructor() {
    this.rates = {
      USD: 34.50, // Varsayılan değer
      EUR: 37.20  // Varsayılan değer
    };
    this.lastUpdate = null;
    this.updateRates();
  }

  async updateRates() {
    try {
      // Exchange Rate API kullanıyoruz (ücretsiz, günlük güncellenir)
      const response = await axios.get(EXCHANGE_API);
      
      if (response.data && response.data.rates) {
        // TRY bazlı kur, USD ve EUR'a çevirmek için tersini alıyoruz
        this.rates.USD = 1 / response.data.rates.USD;
        this.rates.EUR = 1 / response.data.rates.EUR;
        this.lastUpdate = new Date();
      }
    } catch (error) {
      console.warn('Kur bilgisi güncellenemedi, varsayılan değerler kullanılıyor:', error.message);
      // Hata durumunda varsayılan değerleri kullan
    }
  }

  convertToUSD(tlAmount) {
    return tlAmount / this.rates.USD;
  }

  convertToEUR(tlAmount) {
    return tlAmount / this.rates.EUR;
  }

  formatCurrency(amount, currency = 'TRY') {
    const symbols = {
      TRY: '₺',
      USD: '$',
      EUR: '€'
    };

    return `${symbols[currency]}${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  getConversions(tlAmount) {
    return {
      usd: this.convertToUSD(tlAmount),
      eur: this.convertToEUR(tlAmount),
      usdFormatted: this.formatCurrency(this.convertToUSD(tlAmount), 'USD'),
      eurFormatted: this.formatCurrency(this.convertToEUR(tlAmount), 'EUR')
    };
  }

  getRates() {
    return {
      ...this.rates,
      lastUpdate: this.lastUpdate
    };
  }
}

export default new CurrencyService();
