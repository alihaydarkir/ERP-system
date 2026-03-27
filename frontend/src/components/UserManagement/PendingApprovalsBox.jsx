import { UserPlus, X, Check } from 'lucide-react';

export default function PendingApprovalsBox({
  pendingApprovals,
  showPendingBox,
  onToggle,
  onApprove,
  onReject
}) {
  if (pendingApprovals.length === 0) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          <UserPlus className="w-6 h-6 text-yellow-600" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-yellow-800 mb-1">
              Bekleyen Onaylar ({pendingApprovals.length})
            </h3>
            <p className="text-sm text-yellow-700 mb-3">Şirketinize katılmak isteyen kullanıcılar var</p>

            {showPendingBox && (
              <div className="space-y-2 mt-3">
                {pendingApprovals.map((user) => (
                  <div key={user.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-100">{user.username}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Talep: {new Date(user.created_at).toLocaleString('tr-TR')}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => onApprove(user.id)}
                          className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                          title="Onayla"
                        >
                          <Check className="w-4 h-4" />
                          Onayla
                        </button>

                        <button
                          onClick={() => onReject(user.id)}
                          className="flex items-center gap-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors"
                          title="Reddet"
                        >
                          <X className="w-4 h-4" />
                          Reddet
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onToggle}
          className="ml-4 text-yellow-700 hover:text-yellow-900 font-medium text-sm"
        >
          {showPendingBox ? 'Gizle' : 'Göster'}
        </button>
      </div>
    </div>
  );
}
