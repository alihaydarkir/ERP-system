import { useState, useEffect } from 'react';
import api from '../services/api';
import useUIStore from '../store/uiStore';
import usePermissionStore from '../store/permissionStore';
import UserStatsCards from '../components/UserManagement/UserStatsCards';
import PendingApprovalsBox from '../components/UserManagement/PendingApprovalsBox';
import UserFiltersBar from '../components/UserManagement/UserFiltersBar';
import UserList from '../components/UserManagement/UserList';
import UserForm from '../components/UserManagement/UserForm';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [showPendingBox, setShowPendingBox] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const { showSuccess, showError, showConfirm } = useUIStore();
  const { hasPermission } = usePermissionStore();

  const canCreate = hasPermission('users.create');
  const canEdit = hasPermission('users.edit');
  const canDelete = hasPermission('users.delete');

  useEffect(() => {
    fetchUsers();
    fetchStatistics();
    fetchPendingApprovals();
  }, [search, roleFilter]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      
      const response = await api.get(`/api/user-management?${params}`);
      if (response?.data?.data) {
        setUsers(response.data.data);
      }
    } catch (error) {
      showError('Kullanıcılar yüklenemedi');
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/api/user-management/statistics');
      if (response?.data?.data) {
        setStatistics(response.data.data);
      }
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const response = await api.get('/api/employee-approval/pending');
      if (response?.data?.data?.requests) {
        setPendingApprovals(response.data.data.requests);
        // Otomatik olarak kutuyu göster eğer pending approval varsa
        if (response.data.data.requests.length > 0) {
          setShowPendingBox(true);
        }
      }
    } catch (error) {
      console.error('Pending approvals yüklenemedi:', error);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await api.post(`/api/employee-approval/${userId}/approve`);
      showSuccess('Kullanıcı onaylandı');
      fetchPendingApprovals();
      fetchUsers();
      fetchStatistics();
    } catch (error) {
      showError('Kullanıcı onaylanamadı');
    }
  };

  const handleReject = async (userId) => {
    const confirmed = await showConfirm(
      'Bu kullanıcıyı reddetmek istediğinizden emin misiniz?',
      'Kullanıcıyı Reddet',
      'danger'
    );

    if (confirmed) {
      try {
        await api.post(`/api/employee-approval/${userId}/reject`);
        showSuccess('Kullanıcı reddedildi');
        fetchPendingApprovals();
        fetchUsers();
        fetchStatistics();
      } catch (error) {
        showError('Kullanıcı reddedilemedi');
      }
    }
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId) => {
    const confirmed = await showConfirm(
      'Bu kullanıcıyı silmek istediğinizden emin misiniz?',
      'Kullanıcıyı Sil',
      'danger'
    );

    if (confirmed) {
      try {
        await api.delete(`/api/user-management/${userId}`);
        showSuccess('Kullanıcı başarıyla silindi');
        fetchUsers();
        fetchStatistics();
      } catch (error) {
        showError('Kullanıcı silinemedi');
      }
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Kullanıcı Yönetimi</h1>
        <p className="text-gray-600 dark:text-gray-300">Sistem kullanıcılarını yönetin</p>
      </div>

      <UserStatsCards statistics={statistics} />

      <PendingApprovalsBox
        pendingApprovals={pendingApprovals}
        showPendingBox={showPendingBox}
        onToggle={() => setShowPendingBox((prev) => !prev)}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <UserFiltersBar
        search={search}
        roleFilter={roleFilter}
        canCreate={canCreate}
        onSearchChange={setSearch}
        onRoleChange={setRoleFilter}
        onCreate={handleCreateUser}
      />

      <UserList
        users={users}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
      />

      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-900/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <UserForm
              user={selectedUser}
              onCancel={() => setShowUserModal(false)}
              onSuccess={() => {
                setShowUserModal(false);
                fetchUsers();
                fetchStatistics();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
