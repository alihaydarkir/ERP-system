import React from 'react';

const sections = [
  {
    title: 'Toplanan Veriler',
    items: ['Ad ve soyad bilgisi', 'E-posta adresi', 'Şirket bilgisi', 'IP adresi', 'Sistem log kayıtları']
  },
  {
    title: 'Verilerin Kullanım Amacı',
    items: ['Hizmetlerin sunulması ve geliştirilmesi', 'Güvenlik ve kötüye kullanımın önlenmesi', 'Kullanıcı ile iletişim süreçlerinin yürütülmesi']
  },
  {
    title: 'Verilerin Saklanması',
    items: ['Veriler şifreli ve güvenli sunucularda saklanır', 'Yetkisiz erişime karşı teknik/idari tedbirler uygulanır', 'Yasal zorunluluk olmadıkça 3. taraflarla paylaşılmaz']
  },
  {
    title: 'Kullanıcı Hakları',
    items: ['Verilere erişim hakkı', 'Verileri düzeltme hakkı', 'Verileri silme hakkı', 'Veri taşınabilirliği hakkı']
  },
  {
    title: 'İletişim',
    items: ['KVKK ve gizlilik talepleri için: privacy@erpfinaly.com']
  }
];

function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto w-full max-w-4xl rounded-xl bg-white p-6 shadow-sm md:p-10">
        <h1 className="text-3xl font-bold text-gray-900">Gizlilik Politikası</h1>
        <p className="mt-2 text-sm text-gray-500">Son güncelleme: 29 Mart 2026</p>

        <div className="mt-8 space-y-8 text-gray-700">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicyPage;
