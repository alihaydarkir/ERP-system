import { FileDown, FileSpreadsheet, Plus, Upload } from 'lucide-react';
import PermissionButton from '../PermissionButton';

export default function ProductsHeader({
  onExportPdf,
  onExportExcel,
  onOpenImport,
  onOpenCreate
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Ürünler</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Ürün yönetimi ve stok takibi</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onExportPdf}
          className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow-sm hover:from-red-600 hover:to-red-700 hover:shadow-red-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          title="PDF olarak indir"
        >
          <FileDown className="w-5 h-5 mr-2" />
          <span>PDF</span>
        </button>

        <button
          onClick={onExportExcel}
          className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-sm hover:from-green-600 hover:to-green-700 hover:shadow-green-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          title="Excel olarak indir"
        >
          <FileSpreadsheet className="w-5 h-5 mr-2" />
          <span>Excel</span>
        </button>

        <PermissionButton
          permission="products.create"
          deniedText="Ürün içe aktarma yetkiniz yok."
          onClick={onOpenImport}
          className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg shadow-sm hover:from-indigo-600 hover:to-indigo-700 hover:shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Upload className="w-5 h-5 mr-2" />
          <span>Excel'den Yükle</span>
        </PermissionButton>

        <PermissionButton
          permission="products.create"
          deniedText="Ürün oluşturma yetkiniz yok."
          onClick={onOpenCreate}
          className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-5 h-5 mr-2" />
          <span>Yeni Ürün</span>
        </PermissionButton>
      </div>
    </div>
  );
}
