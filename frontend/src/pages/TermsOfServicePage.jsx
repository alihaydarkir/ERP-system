import React from 'react';

const sections = [
  {
    title: 'Hizmetin Kapsamı',
    text: 'ERP Finaly, işletme süreçlerinin yönetimine yönelik dijital hizmetler sunar. Hizmet içeriği zaman içinde geliştirilebilir veya güncellenebilir.'
  },
  {
    title: 'Kullanıcı Yükümlülükleri',
    text: 'Kullanıcılar doğru bilgi sağlamak, şifre güvenliğini korumak ve platformu kötüye kullanmamakla yükümlüdür. Yetkisiz erişim girişimleri ve zararlı kullanım yasaktır.'
  },
  {
    title: 'Fikri Mülkiyet',
    text: 'Platforma ait yazılım, tasarım ve içerik üzerindeki tüm haklar saklıdır. İzinsiz kopyalama, dağıtım veya çoğaltma yapılamaz.'
  },
  {
    title: 'Sorumluluk Sınırlaması',
    text: 'Hizmet, mevzuatın izin verdiği ölçüde “olduğu gibi” sunulur. Dolaylı veya arızi zararlardan doğabilecek sorumluluklar sınırlandırılabilir.'
  },
  {
    title: 'Değişiklik Hakkı',
    text: 'Kullanım şartları gerekli görüldüğünde güncellenebilir. Güncel metin yayımlandığı tarihten itibaren geçerli olur.'
  },
  {
    title: 'İletişim',
    text: 'Şartlarla ilgili tüm sorularınız için: privacy@erpfinaly.com'
  }
];

function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto w-full max-w-4xl rounded-xl bg-white p-6 shadow-sm md:p-10">
        <h1 className="text-3xl font-bold text-gray-900">Kullanım Şartları</h1>
        <p className="mt-2 text-sm text-gray-500">Son güncelleme: 29 Mart 2026</p>

        <div className="mt-8 space-y-8 text-gray-700">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
              <p className="mt-3 leading-7">{section.text}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TermsOfServicePage;
