import React, { useState } from 'react';
import useUserProfileStore from '../../store/userProfileStore';
import useUIStore from '../../store/uiStore';
import './ChangePasswordTab.css';

const ChangePasswordTab = () => {
  const { changePassword, isLoading } = useUserProfileStore();
  const { showSuccess, showError } = useUIStore();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Mevcut şifre gerekli';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'Yeni şifre gerekli';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Şifre en az 6 karakter olmalı';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifre tekrarı gerekli';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }

    if (formData.currentPassword && formData.newPassword && formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'Yeni şifre mevcut şifreden farklı olmalı';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await changePassword(formData);
      showSuccess('Şifre başarıyla değiştirildi');
      // Reset form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      showError(error.response?.data?.message || 'Şifre değiştirilemedi');
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    const levels = [
      { label: 'Çok Zayıf', color: '#dc3545' },
      { label: 'Zayıf', color: '#fd7e14' },
      { label: 'Orta', color: '#ffc107' },
      { label: 'İyi', color: '#20c997' },
      { label: 'Güçlü', color: '#28a745' }
    ];

    return { strength, ...levels[strength] };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <div className="change-password-tab">
      <div className="tab-header">
        <h3>Şifre Değiştir</h3>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="currentPassword">Mevcut Şifre *</label>
          <div className="password-input-wrapper">
            <input
              type={showPasswords.current ? 'text' : 'password'}
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              disabled={isLoading}
              className={errors.currentPassword ? 'input-error' : ''}
            />
            <button
              type="button"
              className="btn-toggle-password"
              onClick={() => togglePasswordVisibility('current')}
              disabled={isLoading}
            >
              {showPasswords.current ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {errors.currentPassword && (
            <span className="error-message">{errors.currentPassword}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="newPassword">Yeni Şifre *</label>
          <div className="password-input-wrapper">
            <input
              type={showPasswords.new ? 'text' : 'password'}
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              disabled={isLoading}
              className={errors.newPassword ? 'input-error' : ''}
            />
            <button
              type="button"
              className="btn-toggle-password"
              onClick={() => togglePasswordVisibility('new')}
              disabled={isLoading}
            >
              {showPasswords.new ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {formData.newPassword && (
            <div className="password-strength">
              <div className="strength-bar">
                <div
                  className="strength-fill"
                  style={{
                    width: `${(passwordStrength.strength / 5) * 100}%`,
                    backgroundColor: passwordStrength.color
                  }}
                />
              </div>
              <span style={{ color: passwordStrength.color }}>
                {passwordStrength.label}
              </span>
            </div>
          )}
          {errors.newPassword && (
            <span className="error-message">{errors.newPassword}</span>
          )}
          <small>En az 6 karakter olmalı</small>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Yeni Şifre Tekrar *</label>
          <div className="password-input-wrapper">
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
              className={errors.confirmPassword ? 'input-error' : ''}
            />
            <button
              type="button"
              className="btn-toggle-password"
              onClick={() => togglePasswordVisibility('confirm')}
              disabled={isLoading}
            >
              {showPasswords.confirm ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {errors.confirmPassword && (
            <span className="error-message">{errors.confirmPassword}</span>
          )}
        </div>

        <div className="password-requirements">
          <h4>Şifre Gereksinimleri:</h4>
          <ul>
            <li className={formData.newPassword.length >= 6 ? 'valid' : ''}>
              En az 6 karakter
            </li>
            <li className={/[A-Z]/.test(formData.newPassword) ? 'valid' : ''}>
              En az bir büyük harf (önerilen)
            </li>
            <li className={/\d/.test(formData.newPassword) ? 'valid' : ''}>
              En az bir rakam (önerilen)
            </li>
            <li className={/[^a-zA-Z0-9]/.test(formData.newPassword) ? 'valid' : ''}>
              En az bir özel karakter (önerilen)
            </li>
          </ul>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-save"
            disabled={isLoading}
          >
            {isLoading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChangePasswordTab;
