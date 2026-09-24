const db = require('../db');

/**
 * Merges overlapping hazard zones grouped by tier using PostGIS.
 * Results are cached in Redis for 10 seconds.
 * 
 * @returns {Promise<Array>} Array of GeoJSON features
 */
async function getMergedHazardZones() {
  const cacheKey = 'hazard_zones_merged';
  
  // 1. Try fetching from Redis cache
  const cached = await db.getCached(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. If cache miss, execute PostGIS query to merge geometries
  // ST_Union aggregates overlapping geometries of the same tier into a single geometry.
  const sql = `
    SELECT
      tier,
      ST_AsGeoJSON(ST_Union(geom))::json AS geometry
    FROM hazard_zones
    WHERE tier IN ('RED', 'ORANGE', 'YELLOW')
    GROUP BY tier;
  `;

  try {
    const { rows } = await db.query(sql);

    // 3. Format as a FeatureCollection array for the frontend
    const features = rows.map(row => ({
      type: 'Feature',
      properties: {
        tier: row.tier
      },
      geometry: row.geometry
    }));

    // 4. Cache the result in Redis for 10 seconds
    await db.setCached(cacheKey, features, 10);

    return features;
  } catch (err) {
    console.error('Error in getMergedHazardZones:', err);
    throw err;
  }
}

module.exports = {
  getMergedHazardZones
};
