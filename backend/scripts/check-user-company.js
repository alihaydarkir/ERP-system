const pool = require('../src/config/database');

async function checkUsers() {
  try {
    const result = await pool.query(`
      SELECT id, username, email, company_id, approval_status
      FROM users 
      WHERE id IN (1, 2, 18, 19, 20)
      ORDER BY id
    `);
    
    console.log('\n📊 Kullanıcı Company ID Durumu:\n');
    console.table(result.rows);
    
    const noCompany = result.rows.filter(u => !u.company_id);
    if (noCompany.length > 0) {
      console.log('\n⚠️ Company ID olmayan kullanıcılar:', noCompany.map(u => u.username).join(', '));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

checkUsers();
