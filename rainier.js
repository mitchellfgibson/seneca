'use strict';

/* ─────────────────────────────────────────────────────────────────────────────
   RAINIER · Swiss-passport topographic secret mode
   Builds an SVG contour map + clickable elevation markers.
   ───────────────────────────────────────────────────────────────────────────── */

const RAINIER_POINTS = [
  {
    id: 'columbia',
    name: 'Columbia Crest',
    elev: 14411,
    x: 50, y: 30,
    kicker: 'Summit',
    desc: 'The highest point in the Cascade Range. A rounded ice dome on the rim of a dormant stratovolcano — the actual crater is still warm enough to melt caves in the ice.',
    stamp: 'SUMMIT',
  },
  {
    id: 'liberty',
    name: 'Liberty Cap',
    elev: 14112,
    x: 41, y: 33,
    kicker: 'North Summit',
    desc: 'Rainier\'s second summit, separated from Columbia Crest by a broad saddle. Classic objective for the Liberty Ridge route — one of the fifty classic climbs of North America.',
    stamp: 'SUB-PEAK',
  },
  {
    id: 'disappointment',
    name: 'Disappointment Cleaver',
    elev: 12300,
    x: 58, y: 45,
    kicker: 'Waypoint · DC Route',
    desc: 'The rocky rib that splits the Ingraham and Emmons glaciers. Named by early climbers who thought the summit was right above it; it wasn\'t. Two thousand feet still to go.',
    stamp: 'DC ROUTE',
  },
  {
    id: 'muir',
    name: 'Camp Muir',
    elev: 10188,
    x: 55, y: 58,
    kicker: 'High Camp',
    desc: 'The stone hut and snow platforms where almost every summit bid begins. Named for John Muir, who bivvied here in 1888. Sleep at midnight, rope up at 1am, climb by headlamp.',
    stamp: 'BASECAMP',
  },
  {
    id: 'carbon',
    name: 'Carbon Glacier',
    elev: 6500,
    x: 32, y: 50,
    kicker: 'Glacier',
    desc: 'The thickest, longest, and lowest-terminating glacier in the contiguous United States. Heavy, old, and steadily retreating.',
    stamp: 'ICE',
  },
  {
    id: 'paradise',
    name: 'Paradise',
    elev: 5400,
    x: 52, y: 72,
    kicker: 'Visitor Center · South Side',
    desc: 'Where the road ends and the walking begins. In July, the meadows explode with avalanche lilies and lupine. Virginia Meany Longmire saw them in 1885 and said "Oh, what a paradise."',
    stamp: 'TRAILHEAD',
  },
  {
    id: 'sunrise',
    name: 'Sunrise',
    elev: 6400,
    x: 72, y: 56,
    kicker: 'Visitor Center · East Side',
    desc: 'The highest point you can drive to on the mountain. Stark, alpine, and underrated — the Emmons Glacier yawns open directly below.',
    stamp: 'TRAILHEAD',
  },
  {
    id: 'longmire',
    name: 'Longmire',
    elev: 2761,
    x: 45, y: 84,
    kicker: 'Park Entrance',
    desc: 'Old-growth forest, mineral springs, and the wooden National Park Inn. The first settlement in the park, and the gate through which most visitors pass.',
    stamp: 'GATEWAY',
  },
];

const FEET_TO_M = 0.3048;

function buildRainier(rootId) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const now = new Date();
  const dateStamp = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }).toUpperCase();

  root.innerHTML = `
    <div class="passport-frame"></div>

    <div class="rainier-header">
      <div>
        <div class="rainier-title">Mount <em>Rainier</em></div>
        <div class="rainier-subtitle">Cascade Range · 46.8523° N · 121.7603° W</div>
      </div>
      <div class="rainier-meta">
        <div>Sheet No. <strong>XIV · 411</strong></div>
        <div>Scale <strong>1 : 62,500</strong></div>
        <div>Issued <strong>${dateStamp}</strong></div>
      </div>
    </div>

    <div class="rainier-crest">
      <div class="rainier-crest-badge">MG</div>
      <div class="rainier-crest-label">Bureau of Ascent</div>
    </div>

    <div class="rainier-map-wrap">
      <svg class="rainier-map" viewBox="0 0 100 90" preserveAspectRatio="xMidYMid meet" id="rainier-svg">
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="1.2" height="1.2" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="1.2" stroke="#8b1a1a" stroke-width="0.12" opacity="0.35"/>
          </pattern>
        </defs>
        ${buildContourPaths()}
        ${buildGlaciers()}
        ${buildRidges()}
        ${buildRivers()}
        ${buildMarkers()}
        ${buildCompass()}
        ${buildScaleBar()}
      </svg>
    </div>

    <div class="rainier-legend">
      <div class="legend-item"><span class="legend-swatch"></span>Ridge</div>
      <div class="legend-item"><span class="legend-swatch contour"></span>Contour · 1,000 ft</div>
      <div class="legend-item"><span class="legend-swatch glacier"></span>Glacier</div>
    </div>

    <div class="rainier-footer"></div>

    <div class="elev-card" id="elev-card">
      <div class="elev-card-header">
        <div class="elev-card-elev" id="ec-elev"></div>
        <button class="elev-card-close" id="ec-close">✕</button>
      </div>
      <div class="elev-card-body">
        <div class="elev-card-kicker" id="ec-kicker"></div>
        <div class="elev-card-name" id="ec-name"></div>
        <div class="elev-card-desc" id="ec-desc"></div>
        <div class="elev-card-stamp">
          <span id="ec-coords">46.8523° N  121.7603° W</span>
          <span class="elev-card-stamp-badge" id="ec-stamp"></span>
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll('.elev-marker').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      showElevCard(el.dataset.id);
    });
  });

  document.getElementById('ec-close').addEventListener('click', hideElevCard);

  root.addEventListener('click', e => {
    if (e.target.closest('.elev-marker')) return;
    if (e.target.closest('.elev-card')) return;
    hideElevCard();
  });
}

function showElevCard(id) {
  const point = RAINIER_POINTS.find(p => p.id === id);
  if (!point) return;

  document.querySelectorAll('.elev-marker').forEach(m => m.classList.toggle('active', m.dataset.id === id));

  const m = Math.round(point.elev * FEET_TO_M);
  document.getElementById('ec-elev').innerHTML = `${point.elev.toLocaleString()}<small>ft · ${m.toLocaleString()}m</small>`;
  document.getElementById('ec-kicker').textContent = point.kicker;
  document.getElementById('ec-name').textContent = point.name;
  document.getElementById('ec-desc').textContent = point.desc;
  document.getElementById('ec-stamp').textContent = point.stamp;

  document.getElementById('elev-card').classList.add('visible');
}

function hideElevCard() {
  document.querySelectorAll('.elev-marker').forEach(m => m.classList.remove('active'));
  const card = document.getElementById('elev-card');
  if (card) card.classList.remove('visible');
}

// ─── SVG builders ─────────────────────────────────────────────────────────────

function buildContourPaths() {
  const cx = 50, cy = 35;
  const rings = [
    { r: 6,  wob: 0.8, weight: 0.22, op: 0.75 },
    { r: 10, wob: 1.2, weight: 0.18, op: 0.60 },
    { r: 15, wob: 1.8, weight: 0.16, op: 0.50 },
    { r: 21, wob: 2.4, weight: 0.14, op: 0.42 },
    { r: 28, wob: 3.2, weight: 0.13, op: 0.36 },
    { r: 35, wob: 4.0, weight: 0.12, op: 0.30 },
    { r: 42, wob: 5.0, weight: 0.11, op: 0.24 },
  ];

  return rings.map((ring, idx) => {
    const pts = [];
    const n = 80;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      const wobble =
        ring.wob * 0.50 * Math.sin(t * 3 + idx * 0.7) +
        ring.wob * 0.35 * Math.sin(t * 5 + idx * 1.3) +
        ring.wob * 0.20 * Math.sin(t * 8 + idx * 0.2);
      const rx = ring.r + wobble;
      const ry = (ring.r + wobble) * 0.78;
      const x = cx + Math.cos(t) * rx;
      const y = cy + Math.sin(t) * ry;
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    const path = 'M ' + pts.join(' L ') + ' Z';
    const isThousand = idx % 2 === 0;
    return `<path d="${path}"
      fill="${idx === 0 ? 'url(#hatch)' : 'none'}"
      stroke="#7a6e5c"
      stroke-width="${ring.weight}"
      stroke-opacity="${ring.op}"
      stroke-linejoin="round"
      stroke-dasharray="${isThousand ? 'none' : '0.6,0.4'}"/>`;
  }).join('');
}

function buildGlaciers() {
  const tongues = [
    { path: 'M 52,33 Q 62,40 72,54 Q 74,60 70,62 Q 62,54 55,44 Z', label: 'EMMONS',    lx: 68, ly: 50 },
    { path: 'M 48,33 Q 38,42 30,52 Q 28,58 32,60 Q 40,52 46,44 Z', label: 'CARBON',    lx: 30, ly: 54 },
    { path: 'M 49,36 Q 50,50 52,66 Q 54,72 50,74 Q 46,66 47,46 Z', label: 'NISQUALLY', lx: 48, ly: 74 },
    { path: 'M 47,35 Q 40,48 33,62 Q 32,68 36,70 Q 42,58 48,44 Z', label: 'TAHOMA',    lx: 32, ly: 70 },
    { path: 'M 49,30 Q 46,20 42,12 Q 46,10 50,18 Q 52,24 51,30 Z', label: 'WINTHROP',  lx: 44, ly: 10 },
  ];
  return tongues.map(g => `
    <path d="${g.path}" fill="#c8dff0" stroke="#7a98b0" stroke-width="0.15" stroke-opacity="0.6"/>
    <text x="${g.lx}" y="${g.ly}" font-family="JetBrains Mono, monospace" font-size="1.6" fill="#4a6780" letter-spacing="0.3" text-anchor="middle">${g.label}</text>
  `).join('');
}

function buildRidges() {
  const ridges = [
    'M 50,32 Q 44,40 38,48 Q 34,54 30,62',
    'M 51,32 Q 58,42 64,52 Q 68,58 72,64',
    'M 49,32 Q 46,24 44,16 Q 42,10 40,6',
    'M 51,33 Q 54,22 56,14',
  ];
  return ridges.map(d => `<path d="${d}" fill="none" stroke="#5a4a3a" stroke-width="0.18" stroke-dasharray="0.3,0.5" stroke-opacity="0.5"/>`).join('');
}

function buildRivers() {
  const rivers = [
    { d: 'M 50,74 Q 48,78 44,82 Q 40,86 36,89', label: 'Nisqually R.', lx: 33, ly: 89 },
    { d: 'M 72,62 Q 78,68 84,74 Q 88,80 92,85', label: 'White R.',     lx: 92, ly: 87 },
    { d: 'M 32,60 Q 26,66 20,72 Q 14,78 10,83', label: 'Carbon R.',    lx: 10, ly: 85 },
  ];
  return rivers.map(r => `
    <path d="${r.d}" fill="none" stroke="#4a6780" stroke-width="0.22" stroke-opacity="0.65"/>
    <text x="${r.lx}" y="${r.ly}" font-family="Instrument Serif, serif" font-style="italic" font-size="1.8" fill="#4a6780" text-anchor="start">${r.label}</text>
  `).join('');
}

function buildMarkers() {
  return RAINIER_POINTS.map(p => {
    const labelAbove = p.y > 50;
    const dy = labelAbove ? -2.8 : 3.8;
    const dy2 = labelAbove ? -5.2 : 6.2;
    return `
      <g class="elev-marker" data-id="${p.id}" transform="translate(${p.x}, ${p.y})">
        <circle class="marker-dot" cx="0" cy="0" r="1"/>
        <circle cx="0" cy="0" r="2.2" fill="none" stroke="#8b1a1a" stroke-width="0.2" stroke-opacity="0.4"/>
        <text x="0" y="${dy}" text-anchor="middle" class="elev-num">${p.elev.toLocaleString()}</text>
        <text x="0" y="${dy2}" text-anchor="middle">${p.name}</text>
      </g>
    `;
  }).join('');
}

function buildCompass() {
  return `
    <g transform="translate(8, 80)">
      <circle cx="0" cy="0" r="3.2" fill="none" stroke="#8b1a1a" stroke-width="0.18"/>
      <line x1="0" y1="-3.6" x2="0" y2="3.6" stroke="#1a1713" stroke-width="0.12"/>
      <line x1="-3.6" y1="0" x2="3.6" y2="0" stroke="#1a1713" stroke-width="0.12"/>
      <polygon points="0,-3.8 -0.8,-0.5 0,0 0.8,-0.5" fill="#8b1a1a"/>
      <text x="0" y="-4.4" font-family="JetBrains Mono, monospace" font-size="1.4" fill="#8b1a1a" text-anchor="middle" letter-spacing="0.3">N</text>
    </g>
  `;
}

function buildScaleBar() {
  return `
    <g transform="translate(82, 82)">
      <rect x="0" y="0" width="4" height="0.5" fill="#1a1713"/>
      <rect x="4" y="0" width="4" height="0.5" fill="none" stroke="#1a1713" stroke-width="0.1"/>
      <rect x="8" y="0" width="4" height="0.5" fill="#1a1713"/>
      <text x="0" y="2" font-family="JetBrains Mono, monospace" font-size="1.2" fill="#1a1713" letter-spacing="0.2">0</text>
      <text x="12" y="2" font-family="JetBrains Mono, monospace" font-size="1.2" fill="#1a1713" text-anchor="end" letter-spacing="0.2">3 MI</text>
    </g>
  `;
}

window.buildRainier = buildRainier;
window.hideElevCard = hideElevCard;
