require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../db');

async function resetPassword() {
  const args = process.argv.slice(2);
  const email = args[0] || 'admin@risk2rescue.local';
  const password = args[1] || 'TestPass123!';

  console.log(`Resetting password for email: ${email}`);

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const query = `
      UPDATE authorities 
      SET password_hash = $1
      WHERE email = $2
      RETURNING id, email, role
    `;
    
    const result = await db.query(query, [passwordHash, email]);

    if (result.rows.length === 0) {
      console.log(`No user found with email ${email}`);
    } else {
      console.log(`Successfully reset password for ${email}.`);
      console.log(`New password is: ${password}`);
    }
  } catch (error) {
    console.error('Failed to reset password:', error.message);
  } finally {
    process.exit(0);
  }
}

resetPassword();
