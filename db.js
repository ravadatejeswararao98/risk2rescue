const { Pool } = require('pg');
const Redis = require('ioredis');

// ==========================================
// 1. PostgreSQL Connection Pool
// ==========================================
const poolConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.DB_USER || 'risk2rescue',
      password: process.env.DB_PASSWORD || 'secret_password',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'risk2rescue_db',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
    };
const pool = new Pool(poolConfig);

// Log pool errors but don't crash the Node.js process
pool.on('error', (err, client) => {
  console.error('[PostgreSQL] Unexpected error on idle client:', err.message);
});

/**
 * Execute a Postgres query
 * @param {string} text - SQL query string
 * @param {Array} params - Array of parameter values
 */
async function query(text, params) {
  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Optional: console.log(`[PostgreSQL] executed query in ${duration}ms`);
    return res;
  } catch (err) {
    console.error(`[PostgreSQL] Query error: ${err.message}`, { text, params });
    throw err;
  }
}

// ==========================================
// 2. Redis Client
// ==========================================
const redisOptions = {
  // Reconnect-on-failure strategy
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    console.warn(`[Redis] Connection lost. Reconnecting in ${delay}ms...`);
    return delay;
  },
  maxRetriesPerRequest: null,
};

const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL, redisOptions)
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || 'secret_redis_password',
      ...redisOptions
    });

// Log Redis errors but don't crash the Node.js process
redis.on('error', (err) => {
  console.error('[Redis] Client error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

/**
 * Fetch and parse a JSON value from Redis
 * @param {string} key - Redis key
 * @returns {any|null} Parsed object or null if not found/error
 */
async function getCached(key) {
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    console.error(`[Redis] getCached error for key "${key}":`, err.message);
    return null; // Fail open gracefully (act as cache miss)
  }
}

/**
 * Serialize and store a JSON value in Redis with optional TTL
 * @param {string} key - Redis key
 * @param {any} value - Value to cache
 * @param {number} [ttlSeconds] - Optional expiration in seconds
 */
async function setCached(key, value, ttlSeconds) {
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await redis.set(key, serialized);
    }
  } catch (err) {
    console.error(`[Redis] setCached error for key "${key}":`, err.message);
  }
}

module.exports = {
  pool,
  redisClient: redis, // exported for direct access if needed
  query,
  getCached,
  setCached
};
