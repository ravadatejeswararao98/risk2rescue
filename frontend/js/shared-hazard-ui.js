/**
 * Shared Hazard UI Module
 * Centralizes UI components duplicated across Citizen and Authority portals.
 */

window.toggleMapHazardDropdown = function(e) {
  if (e) e.stopPropagation();
  const dropdown = document.getElementById('map-hazard-dropdown');
  const btn = document.getElementById('btn-map-hazard');
  if (!dropdown) return;
  
  const isVisible = dropdown.style.display === 'block';
  
  if (!isVisible && typeof window.populateHazardDropdown === 'function') {
    window.populateHazardDropdown(window.currentHazardStatusFilter || 'ALL');
  }
  
  dropdown.style.display = isVisible ? 'none' : 'block';
  if (btn) {
    btn.setAttribute('aria-expanded', !isVisible);
    btn.classList.toggle('active', !isVisible);
  }
};

window.populateHazardDropdown = function(statusFilter = 'ALL') {
  const listContainer = document.getElementById('map-hazard-dropdown-list');
  if (!listContainer) return;
  
  let html = '';
  
  if (window.HAZARD_INTEL) {
    const keys = Object.keys(window.HAZARD_INTEL);
    let totalRenderedZones = 0;
    
    // Sort hazard keys by max severity of their zones
    keys.sort((a, b) => {
      const getSeverity = (k) => {
        const h = window.HAZARD_INTEL[k];
        if (!h || !h.zones) return 1;
        if (h.zones.some(z => { const t = (z.current_tier || z.level || '').toUpperCase(); return t === 'RED' || t === 'CRITICAL'; })) return 4;
        if (h.zones.some(z => { const t = (z.current_tier || z.level || '').toUpperCase(); return t === 'ORANGE' || t === 'HIGH ALERT' || t === 'HIGH'; })) return 3;
        if (h.zones.some(z => { const t = (z.current_tier || z.level || '').toUpperCase(); return t === 'YELLOW' || t === 'MODERATE'; })) return 2;
        return 1;
      };
      return getSeverity(b) - getSeverity(a);
    });

    keys.forEach(k => {
      const h = window.HAZARD_INTEL[k];
      if (!h) return;
      
      let zones = h.zones || [];
      if (statusFilter !== 'ALL') {
        zones = zones.filter(z => {
          const t = (z.current_tier || z.level || '').toUpperCase();
          if (statusFilter === 'Active' || statusFilter === 'Critical') return t === 'RED' || t === 'CRITICAL';
          if (statusFilter === 'Monitoring' || statusFilter === 'High Alert') return t === 'ORANGE' || t === 'HIGH ALERT' || t === 'HIGH';
          if (statusFilter === 'Moderate') return t === 'YELLOW' || t === 'MODERATE';
          if (statusFilter === 'Historical' || statusFilter === 'Normal' || statusFilter === 'Safe') return t === 'GREEN' || t === 'SAFE';
          return false;
        });
      }

      if (zones.length > 0) {
        const count = zones.length;
        const isExpanded = (statusFilter !== 'ALL');
        const displayStyle = isExpanded ? 'block' : 'none';
        const chevronClass = isExpanded ? 'fi-rr-angle-small-up' : 'fi-rr-angle-small-down';

        html += `
          <div class="hazard-accordion-group" data-hazard="${k}">
            <div class="hazard-accordion-header" style="padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none;" onclick="window.toggleHazardAccordion(this)">
              <span style="background:${h.accent || '#333'}15; color:${h.accent || '#333'}; padding:6px; border-radius:6px; font-size:14px;">${h.icon || '⚠️'}</span>
              <div style="font-weight: 700; font-size: 13px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; flex: 1;">${h.label || h.name || k}</div>
              <div style="font-size: 11px; font-weight: 600; color: #64748b; background: #e2e8f0; padding: 2px 6px; border-radius: 10px;">${count}</div>
              <i class="fi ${chevronClass}" style="color: #64748b; font-size: 14px; transition: transform 0.2s;"></i>
            </div>
            <div class="hazard-accordion-content" style="display: ${displayStyle};">
        `;
        
        // Render the filtered zones under this hazard
        zones.forEach(z => {
          totalRenderedZones++;
          const t = (z.current_tier || z.level || '').toUpperCase();
          let badgeColor = '#22c55e', badgeBg = 'rgba(34,197,94,0.15)', badgeText = 'Safe';
          if (t === 'RED' || t === 'CRITICAL') { badgeColor = '#ef4444'; badgeBg = 'rgba(239,68,68,0.15)'; badgeText = 'Critical'; }
          else if (t === 'ORANGE' || t === 'HIGH ALERT' || t === 'HIGH') { badgeColor = '#f97316'; badgeBg = 'rgba(249,115,22,0.15)'; badgeText = 'High Alert'; }
          else if (t === 'YELLOW' || t === 'MODERATE') { badgeColor = '#eab308'; badgeBg = 'rgba(234,179,8,0.15)'; badgeText = 'Moderate'; }
          
          html += `
            <div class="mhd-item" onclick="if(window.openSpecificZone) window.openSpecificZone('${k}', '${z.id || z.name}');" role="button" tabindex="0">
              <div class="mhd-item-left" style="display:flex; align-items:center; gap:10px;">
                <span class="mhd-item-icon" style="background:${badgeBg}; color:${badgeColor}; padding:8px; border-radius:50%; width:10px; height:10px; display:inline-block; border:1px solid ${badgeColor}66;"></span>
                <div>
                  <div class="mhd-item-name" style="font-weight:600; font-size:14px;">${z.village_name || z.name || 'Zone'}</div>
                  <div class="mhd-item-sub" style="font-size:12px; color:#64748b;">${z.mandal_name || h.label || k}</div>
                </div>
              </div>
              <span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:6px; background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeColor}40;">
                ${badgeText}
              </span>
            </div>
          `;
        });
        
        html += `</div></div>`;
      }
    });

    if (totalRenderedZones === 0) {
      html = `<div style="padding:16px;text-align:center;color:#94a3b8;font-size:13px;">No ${statusFilter !== 'ALL' ? statusFilter.toLowerCase() + ' ' : ''}hazards currently.</div>`;
    }
    listContainer.innerHTML = html;
  }
};

window.toggleHazardAccordion = function(headerEl) {
  const content = headerEl.nextElementSibling;
  const chevron = headerEl.querySelector('i.fi:last-child');
  const isExpanded = content.style.display === 'block';
  
  if (isExpanded) {
    content.style.display = 'none';
    if (chevron) {
      chevron.classList.remove('fi-rr-angle-small-up');
      chevron.classList.add('fi-rr-angle-small-down');
    }
  } else {
    content.style.display = 'block';
    if (chevron) {
      chevron.classList.remove('fi-rr-angle-small-down');
      chevron.classList.add('fi-rr-angle-small-up');
    }
  }
};

window.openSpecificZone = function(hazardKey, zoneIdOrName) {
  if (!window.HAZARD_INTEL || !window.HAZARD_INTEL[hazardKey]) return;
  const h = window.HAZARD_INTEL[hazardKey];
  const z = (h.zones || []).find(zone => zone.id === zoneIdOrName || zone.name === zoneIdOrName);
  if (!z) return;

  // Switch to map view
  if (typeof window.switchView === 'function') {
    window.switchView('map-view');
  }
  
  // Close the dropdown
  const dropdown = document.getElementById('map-hazard-dropdown');
  if (dropdown) dropdown.style.display = 'none';

  // Fly to the zone
  const lat = z.epicenter ? z.epicenter.lat : z.lat;
  const lng = z.epicenter ? z.epicenter.lng : z.lng;
  
  if (typeof window.locateZoneOnMap === 'function') {
    window.locateZoneOnMap(lat, lng);
  } else if (window.authMapInstance && window.authMapInstance.getMap()) {
    window.authMapInstance.getMap().setView([lat, lng], 12);
  } else if (window.disasterMap && window.disasterMap.getMap()) {
    window.disasterMap.getMap().setView([lat, lng], 12);
  }

  // Open the inspector
  if (typeof window.openInspector === 'function') {
    setTimeout(() => window.openInspector(z, {lat, lng}), 800);
  }
};
