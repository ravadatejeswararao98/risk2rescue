const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const http = require('http');

async function checkSilo() {
  console.log('[Check] Verifying Object Storage (Silo) reachability...');
  const siloHost = process.env.MINIO_ENDPOINT || 'object-storage';
  const siloPort = process.env.MINIO_PORT || 9000;
  
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${siloHost}:${siloPort}/minio/health/live`, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Silo service is reachable.');
        resolve();
      } else {
        reject(new Error(`Silo health check returned status ${res.statusCode}`));
      }
    });
    req.on('error', (err) => {
      // Fail loudly as requested.
      reject(new Error(`Could not reach Silo service at ${siloHost}:${siloPort}: ${err.message}`));
    });
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Silo health check timed out.'));
    });
  });
}

async function checkTimescale() {
  console.log('[Check] Verifying TimescaleDB service reachability and extension...');
  const tsHost = process.env.TIMESCALEDB_HOST || 'timescaledb';
  const tsPort = process.env.TIMESCALEDB_PORT || 5432;
  const tsUser = process.env.TIMESCALEDB_USER || 'postgres';
  const tsPassword = process.env.TIMESCALEDB_PASSWORD || process.env.POSTGRES_PASSWORD;
  
  if (!tsPassword) {
    console.warn('⚠️ No TIMESCALEDB_PASSWORD provided. Assuming it is reachable or using default auth.');
  }

  const tsPool = new Pool({
    host: tsHost,
    port: tsPort,
    user: tsUser,
    password: tsPassword,
    database: 'postgres', // default DB
    connectionTimeoutMillis: 5000
  });

  try {
    const tsRes = await tsPool.query('SELECT 1 as ok;');
    if (tsRes.rows[0].ok === 1) {
      console.log('✅ TimescaleDB service is reachable.');
    }
    
    // Ensure extension is enabled on the timescale service
    await tsPool.query('CREATE EXTENSION IF NOT EXISTS timescaledb;');
    console.log('✅ TimescaleDB extension confirmed on private service.');
  } catch (err) {
    throw new Error(`Could not reach or configure TimescaleDB service at ${tsHost}:${tsPort}: ${err.message}`);
  } finally {
    await tsPool.end();
  }
}

async function runMigrations() {
  console.log('[Check] Connecting to Primary Database...');
  const poolConfig = process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'risk2rescue'
      };

  const pool = new Pool(poolConfig);

  try {
    // 1. Check PostGIS
    console.log('[Migrate] Ensuring PostGIS is enabled on primary database...');
    await pool.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('✅ PostGIS extension confirmed.');

    // 2. Run schema migrations
    const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
    const files = ['01_base_schema.sql', '02_roles_and_rls.sql', '03_additional_tables.sql'];

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      if (fs.existsSync(filePath)) {
        console.log(`[Migrate] Running migration: ${file}...`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await pool.query(sql);
        console.log(`✅ ${file} applied successfully.`);
      } else {
        console.warn(`⚠️ Migration file not found: ${file}`);
      }
    }
  } catch (err) {
    throw new Error(`Database migration failed: ${err.message}`);
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('--- RENDER PREDEPLOY CHECKS START ---');
  try {
    
    // Pings
    await checkSilo().catch(err => {
        console.error('❌ ' + err.message);
        process.exit(1);
    });

    await checkTimescale().catch(err => {
        console.error('❌ ' + err.message);
        process.exit(1);
    });

    // Migrations
    await runMigrations().catch(err => {
        console.error('❌ ' + err.message);
        process.exit(1);
    });

    console.log('--- ALL PREDEPLOY CHECKS PASSED ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Unexpected predeploy error:', err);
    process.exit(1);
  }
}

main();
