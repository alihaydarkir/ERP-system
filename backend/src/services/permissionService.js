const pool = require('../config/database');

class PermissionService {
  // Check if user has a specific permission
  static async hasPermission(userId, permissionName) {
    try {
      const query = `
        SELECT EXISTS (
          SELECT 1 
          FROM users u
          JOIN role_permissions rp ON u.role = rp.role
          JOIN permissions p ON rp.permission_id = p.id
          WHERE u.id = $1 AND p.name = $2
        ) as has_permission
      `;
      
      const result = await pool.query(query, [userId, permissionName]);
      return result.rows[0].has_permission;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  // Check multiple permissions (user needs at least one)
  static async hasAnyPermission(userId, permissionNames) {
    try {
      const query = `
        SELECT EXISTS (
          SELECT 1 
          FROM users u
          JOIN role_permissions rp ON u.role = rp.role
          JOIN permissions p ON rp.permission_id = p.id
          WHERE u.id = $1 AND p.name = ANY($2)
        ) as has_permission
      `;
      
      const result = await pool.query(query, [userId, permissionNames]);
      return result.rows[0].has_permission;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  // Get all permissions for a user
  static async getUserPermissions(userId) {
    try {
      const query = `
        SELECT p.name, p.description, p.module, p.action
        FROM users u
        JOIN role_permissions rp ON u.role = rp.role
        JOIN permissions p ON rp.permission_id = p.id
        WHERE u.id = $1
        ORDER BY p.module, p.action
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Get user permissions error:', error);
      return [];
    }
  }

  // Get all permissions grouped by module
  static async getAllPermissions() {
    try {
      const query = `
        SELECT id, name, description, module, action
        FROM permissions
        ORDER BY module, action
      `;
      
      const result = await pool.query(query);
      
      // Group by module
      const grouped = {};
      result.rows.forEach(permission => {
        if (!grouped[permission.module]) {
          grouped[permission.module] = [];
        }
        grouped[permission.module].push(permission);
      });
      
      return grouped;
    } catch (error) {
      console.error('Get all permissions error:', error);
      return {};
    }
  }

  // Get permissions for a role
  static async getRolePermissions(role) {
    try {
      const query = `
        SELECT p.id, p.name, p.description, p.module, p.action
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role = $1
        ORDER BY p.module, p.action
      `;
      
      const result = await pool.query(query, [role]);
      return result.rows;
    } catch (error) {
      console.error('Get role permissions error:', error);
      return [];
    }
  }

  // Update role permissions
  static async updateRolePermissions(role, permissionIds) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete existing permissions
      await client.query('DELETE FROM role_permissions WHERE role = $1', [role]);
      
      // Insert new permissions
      if (permissionIds && permissionIds.length > 0) {
        const values = permissionIds.map((permId, idx) => 
          `($1, $${idx + 2})`
        ).join(', ');
        
        const query = `
          INSERT INTO role_permissions (role, permission_id)
          VALUES ${values}
        `;
        
        await client.query(query, [role, ...permissionIds]);
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update role permissions error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = PermissionService;
