require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../db');

async function seed() {
  // Take command line arguments or use defaults
  const args = process.argv.slice(2);
  const email = args[0] || 'admin@risk2rescue.local';
  const password = args[1] || 'secure_password_123';
  const district = args[2] || 'Visakhapatnam';
  
  // You might want to adjust the role based on your schema (e.g., 'admin', 'viewer')
  const role = 'admin'; 

  console.log(`Seeding authority account...`);
  console.log(`Email: ${email}`);
  console.log(`District: ${district}`);

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO authorities (email, password_hash, district, role, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, email, district, role, created_at
    `;
    
    const result = await db.query(query, [email, passwordHash, district, role]);

    console.log('\nSuccess! Created the following row:');
    console.log(result.rows[0]);

  } catch (error) {
    console.error('\nFailed to seed authority:', error.message);
  } finally {
    process.exit(0);
  }
}

seed();
