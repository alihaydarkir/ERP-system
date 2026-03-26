import { Edit2, Trash2, Eye, Star } from 'lucide-react';

export default function SupplierList({ suppliers, onEdit, onDelete, onViewDetails, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!suppliers || suppliers.length === 0) {
    return (
      <div className="text-center py-12">
         <div className="flex flex-col items-center justify-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-3">
                 <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                 </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Henüz tedarikçi kaydı bulunmuyor</p>
            <p className="text-gray-400 dark:text-gray-400 text-sm mt-1">Yeni bir tedarikçi eklemek için yukarıdaki butona tıklayın</p>
         </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Şirket Adı
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              İletişim Kişi
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Telefon
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Ödeme Vadesi
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Vergi Dairesi
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Rating
            </th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Durum
            </th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {suppliers.map((supplier) => (
            <tr key={supplier.id} className="hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-700/50 transition-colors duration-150">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {supplier.supplier_name}
                </div>
                {supplier.address && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-xs" title={supplier.address}>{supplier.address}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-gray-300">
                  {supplier.contact_person || '-'}
                </div>
                {supplier.email && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{supplier.email}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-gray-300 font-mono">
                  {supplier.phone || '-'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-gray-300">
                  {supplier.payment_terms || '-'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-gray-300">
                  {supplier.tax_office || '-'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm font-medium text-gray-900 dark:text-white">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1.5" />
                  {parseFloat(supplier.rating || 0).toFixed(1)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                  supplier.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800'
                }`}>
                  {supplier.is_active ? 'Aktif' : 'Pasif'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                <div className="flex items-center justify-end gap-2">
                  {onViewDetails && (
                    <button
                      onClick={() => onViewDetails(supplier)}
                      className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Detay"
                    >
                      <Eye size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(supplier)}
                    className="p-2 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    title="Düzenle"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(supplier)}
                    className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:bg-red-900/20 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Sil"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
