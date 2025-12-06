const Settings = require('../models/Settings');
const AuditLog = require('../models/AuditLog');
const ActivityLogService = require('../services/activityLogService');
const { formatSuccess, formatError } = require('../utils/formatters');
const { getClientIP } = require('../utils/helpers');
const nodemailer = require('nodemailer');

/**
 * Get all settings
 */
const getAllSettings = async (req, res) => {
  try {
    const settings = await Settings.findAll();
    res.json(formatSuccess(settings));
  } catch (error) {
    console.error('Get all settings error:', error);
    res.status(500).json(formatError('Failed to fetch settings'));
  }
};

/**
 * Get settings grouped by category
 */
const getSettingsByCategory = async (req, res) => {
  try {
    const grouped = await Settings.findAllGrouped();
    res.json(formatSuccess(grouped));
  } catch (error) {
    console.error('Get settings by category error:', error);
    res.status(500).json(formatError('Failed to fetch settings'));
  }
};

/**
 * Get single setting by key
 */
const getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Settings.findByKey(key);

    if (!setting) {
      return res.status(404).json(formatError('Setting not found'));
    }

    res.json(formatSuccess(setting));
  } catch (error) {
    console.error('Get setting by key error:', error);
    res.status(500).json(formatError('Failed to fetch setting'));
  }
};

/**
 * Update single setting
 */
const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const userId = req.user.id;

    // Check if setting exists
    const existing = await Settings.findByKey(key);
    if (!existing) {
      return res.status(404).json(formatError('Setting not found'));
    }

    const setting = await Settings.update(key, value, userId);

    // Log the action
    await AuditLog.create({
      user_id: userId,
      action: 'UPDATE_SETTING',
      entity_type: 'system_settings',
      entity_id: setting.id,
      ip_address: getClientIP(req),
      changes: { key, old_value: existing.value, new_value: value }
    });

    // Log to activity logs
    await ActivityLogService.log(
      userId,
      'update_setting',
      'settings',
      { key, old_value: existing.value, new_value: value },
      req
    );

    res.json(formatSuccess(setting, 'Setting updated successfully'));
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json(formatError('Failed to update setting'));
  }
};

/**
 * Bulk update settings
 */
const bulkUpdateSettings = async (req, res) => {
  try {
    const settings = req.body;
    const userId = req.user.id;

    const updatedSettings = await Settings.bulkUpdate(settings, userId);

    // Log the action
    await AuditLog.create({
      user_id: userId,
      action: 'BULK_UPDATE_SETTINGS',
      entity_type: 'system_settings',
      entity_id: null,
      ip_address: getClientIP(req),
      changes: { count: updatedSettings.length, keys: Object.keys(settings) }
    });

    // Log to activity logs
    await ActivityLogService.log(
      userId,
      'bulk_update_settings',
      'settings',
      { count: updatedSettings.length, keys: Object.keys(settings) },
      req
    );

    res.json(formatSuccess(updatedSettings, 'Settings updated successfully'));
  } catch (error) {
    console.error('Bulk update settings error:', error);
    res.status(500).json(formatError('Failed to update settings'));
  }
};

/**
 * Test email configuration
 */
const testEmail = async (req, res) => {
  try {
    const { to } = req.body;

    // Get email settings
    const smtpHost = await Settings.findByKey('emailSmtpHost');
    const smtpPort = await Settings.findByKey('emailSmtpPort');
    const smtpUsername = await Settings.findByKey('emailSmtpUsername');
    const smtpPassword = await Settings.findByKey('emailSmtpPassword');
    const fromAddress = await Settings.findByKey('emailFromAddress');
    const fromName = await Settings.findByKey('emailFromName');

    if (!smtpHost || !smtpPort || !fromAddress) {
      return res.status(400).json(formatError('Email settings not configured'));
    }

    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: smtpHost.value,
      port: parseInt(smtpPort.parsedValue),
      secure: parseInt(smtpPort.parsedValue) === 465,
      auth: smtpUsername.value && smtpPassword.value ? {
        user: smtpUsername.value,
        pass: smtpPassword.value
      } : undefined
    });

    // Send test email
    const info = await transporter.sendMail({
      from: `"${fromName?.value || 'ERP System'}" <${fromAddress.value}>`,
      to: to || req.user.email,
      subject: 'ERP System - Test Email',
      text: 'This is a test email from your ERP system. Email configuration is working correctly!',
      html: '<h2>ERP System Test Email</h2><p>This is a test email from your ERP system.</p><p><strong>Email configuration is working correctly!</strong></p>'
    });

    // Log the action
    await AuditLog.create({
      user_id: req.user.id,
      action: 'TEST_EMAIL',
      entity_type: 'system_settings',
      entity_id: null,
      ip_address: getClientIP(req),
      changes: { to: to || req.user.email, messageId: info.messageId }
    });

    res.json(formatSuccess({ messageId: info.messageId }, 'Test email sent successfully'));
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json(formatError(`Failed to send test email: ${error.message}`));
  }
};

/**
 * Create new setting
 */
const createSetting = async (req, res) => {
  try {
    const userId = req.user.id;
    const settingData = req.body;

    const setting = await Settings.create(settingData, userId);

    // Log the action
    await AuditLog.create({
      user_id: userId,
      action: 'CREATE_SETTING',
      entity_type: 'system_settings',
      entity_id: setting.id,
      ip_address: getClientIP(req),
      changes: { key: setting.key }
    });

    res.status(201).json(formatSuccess(setting, 'Setting created successfully'));
  } catch (error) {
    console.error('Create setting error:', error);

    if (error.code === '23505') {
      return res.status(400).json(formatError('Setting with this key already exists'));
    }

    res.status(500).json(formatError('Failed to create setting'));
  }
};

/**
 * Delete setting
 */
const deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const userId = req.user.id;

    const setting = await Settings.delete(key);

    if (!setting) {
      return res.status(404).json(formatError('Setting not found'));
    }

    // Log the action
    await AuditLog.create({
      user_id: userId,
      action: 'DELETE_SETTING',
      entity_type: 'system_settings',
      entity_id: setting.id,
      ip_address: getClientIP(req),
      changes: { key }
    });

    res.json(formatSuccess(null, 'Setting deleted successfully'));
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json(formatError('Failed to delete setting'));
  }
};

module.exports = {
  getAllSettings,
  getSettingsByCategory,
  getSettingByKey,
  updateSetting,
  bulkUpdateSettings,
  testEmail,
  createSetting,
  deleteSetting
};
