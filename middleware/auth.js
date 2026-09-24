const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'risk2rescue_super_secret';

/**
 * Express middleware to verify JWT and set up Postgres RLS connection
 * This scopes all database queries on req.dbClient to the authority's district
 */
async function requireAuthority(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains { id, email, district, role }

    // Acquire a dedicated database client from the pool
    const client = await db.pool.connect();
    
    // Begin a transaction to safely scope the local settings to this request only
    await client.query('BEGIN');
    
    // 1. Switch to the authority role
    await client.query('SET LOCAL ROLE app_authority_portal');
    // 2. Set the custom session variable used in our RLS policy
    await client.query(`SET LOCAL app.current_district = $1`, [decoded.district]);
    
    // Attach the securely scoped client to the request
    req.dbClient = client;

    // Hook into the response finish event to ensure the transaction is completed 
    // and the client is released back to the pool, regardless of success or error.
    res.on('finish', async () => {
      try {
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    next();
  } catch (err) {
    console.error('JWT Verification error:', err.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

module.exports = {
  requireAuthority,
  JWT_SECRET
};
