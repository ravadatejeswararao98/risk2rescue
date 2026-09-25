const express = require('express');
const router = express.Router();
const db = require('../db');
const hazardService = require('../services/hazardService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { requireAuthority, JWT_SECRET } = require('../middleware/auth');

// Middleware to parse JSON
router.use(express.json());

// ==========================================
// 1. Hazard / Risk Zones
// ==========================================

// GET /api/hazard-zones (Replaces .onSnapshot() for zones)
router.get('/hazard-zones', async (req, res) => {
  try {
    const mergedZones = await hazardService.getMergedHazardZones();
    // Return standard feature collection
    res.json(mergedZones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hazard-zones (Replaces .doc(id).set(zone))
router.post('/hazard-zones', async (req, res) => {
  try {
    const zone = req.body;
    // Assuming zone has tier, source, and a GeoJSON string/object in geometry
    const geom = typeof zone.geometry === 'object' ? JSON.stringify(zone.geometry) : zone.geometry;
    
    await db.query(
      `INSERT INTO hazard_zones (tier, source, geom) 
       VALUES ($1, $2, ST_GeomFromGeoJSON($3))`,
      [zone.tier, zone.source || 'api', geom]
    );
    res.json({ success: true, id: zone.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/hazard-zones/:id (Replaces .doc(id).delete())
router.delete('/hazard-zones/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM hazard_zones WHERE id = $1', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. Hazard Readings
// ==========================================

// GET /api/hazard-readings (Replaces .onSnapshot())
router.get('/hazard-readings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const { rows } = await db.query(
      `SELECT time as timestamp, source, ST_Y(location) as lat, ST_X(location) as lng, value, unit 
       FROM hazard_readings 
       ORDER BY time DESC LIMIT $1`, 
      [limit]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hazard-readings
router.post('/hazard-readings', async (req, res) => {
  try {
    const reading = req.body;
    await db.query(
      `INSERT INTO hazard_readings (time, source, location, value, unit) 
       VALUES (to_timestamp($1 / 1000.0), $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6)`,
      [reading.timestamp || Date.now(), reading.source, reading.lng, reading.lat, reading.value, reading.unit]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. Citizen Reports
// ==========================================

// GET /api/citizen-reports
router.get('/citizen-reports', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const { rows } = await db.query(
      `SELECT data FROM citizen_reports ORDER BY timestamp DESC LIMIT $1`,
      [limit]
    );
    // Return an array of the exact JSON data stored
    res.json(rows.map(r => r.data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/citizen-reports (Replaces .set())
router.post('/citizen-reports', async (req, res) => {
  try {
    const report = req.body;
    const id = report.id;
    const timestamp = report.timestamp || Date.now();
    let locSql = 'NULL';
    let params = [id, timestamp, JSON.stringify(report)];
    
    if (report.location && report.location.lat && report.location.lng) {
      locSql = 'ST_SetSRID(ST_MakePoint($4, $5), 4326)';
      params.push(report.location.lng, report.location.lat);
    }

    await db.query(
      `INSERT INTO citizen_reports (id, timestamp, data, location) 
       VALUES ($1, $2, $3, ${locSql})
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, timestamp = EXCLUDED.timestamp, location = EXCLUDED.location`,
      params
    );
    
    // Publish to Redis for real-time WebSocket sync
    db.redisClient.publish('new-report', JSON.stringify({ ...report, id, timestamp }));
    
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/citizen-reports/:id (Replaces .set(updates, { merge: true }))
router.patch('/citizen-reports/:id', async (req, res) => {
  try {
    const updates = req.body;
    const id = req.params.id;
    
    // JSONB || concatenation merges the top-level keys
    await db.query(
      `UPDATE citizen_reports 
       SET data = data || $1::jsonb 
       WHERE id = $2`,
      [JSON.stringify(updates), id]
    );
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/:id/verify
router.post('/reports/:id/verify', async (req, res) => {
  try {
    const id = req.params.id;
    const { officerNotes } = req.body;
    const updates = {
      status: 'Verified',
      verificationStatus: 'VERIFIED',
      lifecycleStatus: 'VERIFIED',
      officerNotes: officerNotes || 'Confirmed by Incident Command.',
      verifiedAt: new Date().toLocaleTimeString(),
      verifiedTimestamp: Date.now()
    };
    
    await db.query(
      `UPDATE citizen_reports SET data = data || $1::jsonb WHERE id = $2`,
      [JSON.stringify(updates), id]
    );
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/:id/reject
router.post('/reports/:id/reject', async (req, res) => {
  try {
    const id = req.params.id;
    const { reason } = req.body;
    const updates = {
      status: 'Rejected',
      lifecycleStatus: 'REJECTED',
      verificationStatus: 'REJECTED',
      rejectReason: reason || 'Rejected by authority'
    };
    
    await db.query(
      `UPDATE citizen_reports SET data = data || $1::jsonb WHERE id = $2`,
      [JSON.stringify(updates), id]
    );
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. Emergency Alerts
// ==========================================

// GET /api/emergency-alerts
router.get('/emergency-alerts', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT data FROM emergency_alerts ORDER BY timestamp DESC LIMIT 50`
    );
    res.json(rows.map(r => r.data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/emergency-alerts
router.post('/emergency-alerts', async (req, res) => {
  try {
    const alert = req.body;
    const id = alert.id;
    const timestamp = alert.timestamp || Date.now();
    
    await db.query(
      `INSERT INTO emergency_alerts (id, timestamp, data) 
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [id, timestamp, JSON.stringify(alert)]
    );
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. Datasources (Health)
// ==========================================

// GET /api/datasources
router.get('/datasources', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT data FROM datasources`);
    res.json(rows.map(r => r.data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /api/authorities/me (Protected route example)
router.get('/authorities/me', requireAuthority, async (req, res) => {
  try {
    // Queries via req.dbClient are now strictly isolated to the user's district!
    const { rows } = await req.dbClient.query('SELECT id, email, district, role, created_at FROM authorities WHERE id = $1', [req.user.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Authority not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
