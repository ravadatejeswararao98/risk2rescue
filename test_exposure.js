const turf = require('@turf/turf');
// We just need basic testing
function computeHazardExposure(activeZones, habitations, safeSites) {
  const result = {
    habitations: [],
    districts: {},
    zoneStats: {}
  };
  
  // Initialize district tracking
  habitations.forEach(h => {
    if (!result.districts[h.district]) {
      result.districts[h.district] = { exposedCount: 0, maxSeverity: 'GREEN', affectedHabs: [], maxRank: 1 };
    }
  });
  
  const rankMap = { 'GREEN': 1, 'YELLOW': 2, 'MODERATE': 2, 'ORANGE': 3, 'HIGH': 3, 'RED': 4, 'CRITICAL': 4 };
  
  // Precompute points for habitations and safe sites
  const habPoints = habitations.map(h => ({ ...h, pt: turf.point([h.lng, h.lat]) }));
  const sitePoints = safeSites.map(s => ({ ...s, pt: turf.point([s.lng, s.lat]) }));
  
  activeZones.forEach(z => {
    if (!z.polygon) return;
    
    // Init zone stats
    result.zoneStats[z.id || z.name] = { habitations: [], shelters: [], population: 0 };
    
    // Check habitations
    habPoints.forEach(h => {
      if (turf.booleanPointInPolygon(h.pt, z.polygon)) {
        const level = (z.level || z.current_tier || 'GREEN').toUpperCase();
        // Update per-zone stats
        result.zoneStats[z.id || z.name].habitations.push(h);
        result.zoneStats[z.id || z.name].population += (h.pop || h.censusPopulation || 0);
        
        // Update per-habitation exposure (could attach to a Map or array)
        if (!h.exposedZones) h.exposedZones = [];
        h.exposedZones.push(z);
        if (!h.maxSeverity || rankMap[level] > rankMap[h.maxSeverity]) h.maxSeverity = level;
        
        // Update per-district stats
        const distStat = result.districts[h.district];
        if (distStat) {
          if (!distStat.affectedHabs.includes(h.name)) {
            distStat.exposedCount++;
            distStat.affectedHabs.push(h.name);
          }
          if (rankMap[level] > distStat.maxRank) {
            distStat.maxRank = rankMap[level];
            distStat.maxSeverity = level;
          }
        }
      }
    });
    
    // Check safe sites
    sitePoints.forEach(s => {
      if (turf.booleanPointInPolygon(s.pt, z.polygon)) {
        result.zoneStats[z.id || z.name].shelters.push(s);
      }
    });
  });
  
  result.habitations = habPoints;
  return result;
}

// Mock test
const poly = turf.circle([80.44, 16.3], 50, {steps: 10, units: 'kilometers'}); 
const mockZones = [{id: 'Z1', name: 'Guntur Cyclone', level: 'MODERATE', polygon: poly}];
const mockHabs = [
  {name: 'Guntur Urban', district: 'Guntur', lat: 16.3067, lng: 80.4365},
  {name: 'Bapatla Coastal', district: 'Guntur', lat: 15.9042, lng: 80.4674}, // ~45km away
  {name: 'Far Away', district: 'Guntur', lat: 14.0, lng: 80.0} // 200km away
];
const mockSites = [{name: 'Guntur Parade Ground', lat: 16.3, lng: 80.44, beds: 500}];

console.log(JSON.stringify(computeHazardExposure(mockZones, mockHabs, mockSites), null, 2));
