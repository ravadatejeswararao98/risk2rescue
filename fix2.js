const fs = require('fs');
let js = fs.readFileSync('public/js/authority.js', 'utf8');

const targetStr = unction openZoneInfoPanel(zone, lat, lng) {
  const panel = document.getElementById('zone-info-panel');
  if (!panel) return;;

const replaceStr = unction openZoneInfoPanel(zone, lat, lng) {
  const panel = document.getElementById('zone-info-panel');
  if (!panel) return;

  const zoneId = zone.id || zone.name || 'unknown';
  
  // STAGE 2: Dynamically calculate geospatial exposure for this zone using the new engine
  if (window.REFERENCE_DATA && typeof computeHazardExposure === 'function') {
     let targetZone = zone;
     if (!targetZone.polygon && window.authMapInstance && window.authMapInstance.hazardPolygons) {
       const matched = window.authMapInstance.hazardPolygons.find(hp => hp.id === zone.id || hp.name === zone.name);
       if (matched && matched.polygon) targetZone = matched;
     }
     
     if (targetZone.polygon) {
       const exp = computeHazardExposure([targetZone], window.REFERENCE_DATA.habitations || [], window.REFERENCE_DATA.safeSites || []);
       const stat = exp.zoneStats[zoneId];
       if (stat) {
         zone.stats = zone.stats || {};
         zone.stats.habitations = stat.habitations;
         zone.stats.shelters = stat.shelters;
         zone.stats.population = stat.population;
       }
     }
  };

js = js.replace(targetStr, replaceStr);
fs.writeFileSync('public/js/authority.js', js, 'utf8');
