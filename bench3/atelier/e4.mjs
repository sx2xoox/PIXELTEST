// E4 — 골목의 고양이들 — 도시가 잠들면 시작되는 이야기 (lead illustration, 1600×1000, no text)
//
// STORY: 05:40, the last minutes of night on a hillside Seoul alley (달동네 계단길). The neighbourhood
// is asleep; one security lamp is still on. A cat has climbed the steep concrete stairs and sits on
// the top landing, back to us, watching first light open in the valley between the granite peaks.
// A second, younger cat is still climbing; a third keeps watch from a rooftop. The night shift of
// the alley cats is ending — the story begins at the threshold between sleeping alley and waking sky.
//
// NOTAN (3 thumbnails in notan/: A stair-crest / B rooftop / C lit window → chose A for the strongest
// diagonal, clearest place and a backlit silhouette):
//   LIGHT  dawn sky band behind the crest (upper right)          ~20–25%
//   MID    villa walls (left) + upper sky + far mountains/city   ~35–40%
//   DARK   stair mass (diagonal, lower left) + far-side roofs    ~35–40%
//   Focal: darkest shape (cat) against the lightest, warmest spot (dawn core) near the upper-right third.
// VALUE PLAN (L*): cat ~10 · stairs 16–26 · right roofs 24 · villa walls 38–48 · upper sky 25–55 ·
//   far city 55 · mountains 62–70 · horizon 82 · dawn core 93.
// COLOR: cool indigo/lavender night (C 5–20); warm accent (peach/gold) only at the dawn core, the
//   security lamp and the cat's rim — all within the focal ninth. Rubber basins = muted brick red.
//
// ROUNDS
//   r1: first full build from notan A. → 86% dark, 65% empty, flat stair slab, parapet block crowding
//       the cat, gas meters too light, building-A windows a regular grid, single cat.
//   r2: lifted walls & sky into mid values; stairs given tread tops (oblique depth), formwork lines and a
//       lighter landing; far-side roofs lowered so the valley city shows; parapet removed from beside
//       the cat; added a climbing cat (0.6×) and a rooftop cat (0.3×) for "cats" + 1:0.6:0.3 motif;
//       varied building-A windows (AC unit, laundry, one dim lit window); cat head enlarged.
//   r3: r2 measured light 5% / range 50 / C>30 15% (saturated night blue). → sky became a radial
//       night→dawn field centred on the crest (night upper-left, dawn behind the cat), desaturated
//       blues; crescent moon redrawn as a true crescent (r2 showed a dark disc); handrail raised so it
//       clears the climbing cat, lamp moved up; diagonal "formwork" lines (read as cracks/wires)
//       replaced by a house façade with a blue steel gate under the landing; far-side roofs rebuilt
//       as one silhouette with a pitched tile roof; city as one hazy silhouette (no light slits).
//   r4: r3 light still 7%, empty 54%, rail cut through the climbing cat's back. → dawn field widened
//       (more of the sky above L66), rail raised clear of cat B, red-brick coursing on villa A
//       (적벽돌 빌라) at very low contrast, AC unit/boxes darkened, a parked delivery scooter by the
//       gate to give the dark lower-right a quiet second read.
//   r5: r4 scooter body vanished into the wall (only wheels + box read) → lifted one value step with
//       a sky-lit top edge; far mountains/city lifted toward the sky (+L, aerial perspective) to grow
//       the light group; warm lamp spill added on the top treads/landing; backlit whiskers on the
//       hero cat (hard-edge detail concentrated at the focus).
//   r6: zoomed focal crop showed a thick cable running straight through the hero's ears (tangent) →
//       removed it and lifted the next wire clear; lamp spill made the landing look like a rounded
//       bench → smaller/softer; weed tufts in the stair joints along the diagonal (leads the eye up to
//       the cat), a rain downpipe on villa A to break its flat wall (placed clear of the AC unit).
// FINAL (r6) analyze: notan 3 · range 61 · dark/mid/light 46/42/12 · C>40 0% (C>30 0.9%) · focal
//   (0.65,0.31) 0.031 from thirds · dominance 8.0 · symmetry 0.24 · CoG offset 0.05 · darkest L≈11
//   (p0.5) · empty 53% (over the 25–45% target: big flat villa wall + dark stair mass).
export default () => {
  const W = 1600, H = 1000;
  const T = {
    sky0: '#272b4a', sky1: '#444a74', sky2: '#8583ab', sky3: '#cba6b3', sky4: '#f0c8a8', sky5: '#fdebd0',
    mtn: '#a19fc0', mtn2: '#b7b1cc', city: '#6f73a0', cityD: '#5d6290',
    wallA: '#4a5281', wallA2: '#535b8a', wallB: '#5a6290', wallB2: '#666c98', wallDk: '#363d66', win: '#2a3056', grille: '#59628f',
    stair: '#202440', stairSide: '#262a49', tread: '#3f4470', roofR: '#2a2e4c', roofR2: '#33385a', cat: '#1a1b31', rim: '#ffd59e',
    lamp: '#fff4d2', lampGlow: '#ffb867', basin: '#7a3c47', basinRim: '#8c4652', leaf: '#34504c', pipe: '#a08c50',
    wire: '#22263f',
  };
  const rng = seed => { let a = seed * 9301 + 49297; return () => ((a = (a * 16807) % 2147483647) / 2147483647); };
  const R = rng(7);

  // ---------- stairs (elevation zigzag + oblique tread tops) ----------
  const landL = 960, landR = 1190, landY = 410, rise = 52, run = 88, ox = 16, oy = -10; // oblique depth offset
  const pts = [];
  let x = landL, y = landY;
  const steps = [];
  while (y < H + rise) { pts.push([x, y]); steps.push([x - run, y + rise, x]); y += rise; pts.push([x, y]); x -= run; pts.push([x, y]); }
  const stairD = `M${landR},${landY} L${landL},${landY} ` + pts.map(p => `L${p[0]},${p[1]}`).join(' ') + ` L${x},${H + 60} L${landR},${H + 60} Z`;
  const treadTops = steps.map(([x0, ty, x1], i) => ({
    type: 'path', d: `M${x0},${ty} L${x1},${ty} L${x1 + ox},${ty + oy} L${x0 + ox},${ty + oy}Z`,
    fill: T.tread, opacity: Math.max(0.35, 1 - i * 0.07),
  }));
  // riser faces in oblique (the vertical front of each step, seen edge-on → thin darker strip)
  const landingTop = { type: 'path', d: `M${landL},${landY} L${landR},${landY} L${landR + ox},${landY + oy} L${landL + ox},${landY + oy}Z`, fill: '#c9a596' };

  // far-side roofs beyond the crest, stepping down into the valley
  const roofD = `M${landR},${landY} L${landR},${H} L1610,${H} L1610,628 L1470,628 L1470,598 L1442,598 L1442,560 L1350,560 L1350,526 L1236,526 L1236,474 L${landR + 18},474 L${landR + 18},${landY}Z`;
  // old house with a pitched tile roof (기와) between the flat villa roofs
  const tileRoofD = 'M1336,560 L1372,520 L1470,520 L1506,560 L1490,560 L1490,640 L1352,640 L1352,560Z';

  // ---------- helpers ----------
  const grilleWindow = (wx, wy, ww, wh, opt = {}) => {
    const bars = [];
    const n = Math.max(3, Math.round(ww / 15));
    for (let i = 1; i < n; i++) bars.push({ type: 'rect', x: wx + (i * ww) / n - 1.5, y: wy - 3, w: 3, h: wh + 6, fill: T.grille });
    const pane = opt.lit
      ? { linear: { angle: 90, stops: [[0, '#8a7088'], [1, '#5d5078']] } }
      : { linear: { angle: 90, stops: [[0, '#353c66'], [1, T.win]] } };
    return [
      { type: 'rect', x: wx - 7, y: wy - 7, w: ww + 14, h: wh + 14, fill: T.wallDk },
      { type: 'rect', x: wx, y: wy, w: ww, h: wh, fill: pane },
      { type: 'rect', x: wx + ww * 0.55, y: wy, w: 3, h: wh, fill: T.wallDk },
      ...(opt.grille === false ? [] : bars),
      ...(opt.grille === false ? [] : [{ type: 'rect', x: wx - 3, y: wy - 3, w: ww + 6, h: 3, fill: T.grille }, { type: 'rect', x: wx - 3, y: wy + wh, w: ww + 6, h: 3, fill: T.grille }]),
      { type: 'rect', x: wx - 10, y: wy + wh + 7, w: ww + 20, h: 6, fill: T.wallDk },
    ];
  };
  const basin = (bx, by, bw, plant = 'onion', seed = 1, dark = false) => {
    const h = bw * 0.42;
    const kids = [];
    const Rr = rng(seed);
    const leaf = dark ? '#283a3c' : T.leaf;
    if (plant === 'onion') {
      for (let i = 0; i < 10; i++) {
        const px = bx + bw * (0.15 + 0.7 * Rr()), top = by - h - bw * 0.5 - Rr() * bw * 0.6;
        kids.push({ type: 'brush', points: [[px, by - h + 2], [px + (Rr() - 0.5) * 8, (by - h + top) / 2], [px + (Rr() - 0.5) * bw * 0.4, top]], width: Math.max(2.5, bw * 0.05), taper: 0.7, fill: leaf });
      }
    } else {
      kids.push({ type: 'brush', points: [[bx + bw * 0.5, by - h], [bx + bw * 0.46, by - h - bw * 0.7]], width: 3, fill: leaf });
      for (let i = 0; i < 5; i++) {
        kids.push({ type: 'blob', cx: bx + bw * (0.15 + 0.7 * Rr()), cy: by - h - bw * (0.3 + Rr() * 0.5), r: bw * (0.16 + Rr() * 0.1), points: 6, wobble: 0.3, seed: seed + i, fill: leaf });
      }
    }
    kids.push({ type: 'path', d: `M${bx},${by - h} L${bx + bw},${by - h} L${bx + bw * 0.88},${by} L${bx + bw * 0.12},${by}Z`, fill: dark ? '#4a2c3c' : T.basin });
    kids.push({ type: 'rect', x: bx - 3, y: by - h - 3, w: bw + 6, h: 6, r: 3, fill: dark ? '#55324a' : T.basinRim });
    return kids;
  };

  // ---------- cat A (hero): sitting, facing right, local origin = ground under its body ----------
  const catPath = (cx, cy, s, flip = 1) => {
    const P = (px, py) => `${(cx + px * s * flip).toFixed(1)},${(cy + py * s).toFixed(1)}`;
    return `M${P(-38, 0)} C${P(-52, -6)} ${P(-56, -36)} ${P(-45, -56)} C${P(-38, -70)} ${P(-30, -82)} ${P(-22, -92)} ` +
      `C${P(-22, -100)} ${P(-23, -110)} ${P(-20, -120)} C${P(-18, -126)} ${P(-16, -130)} ${P(-14, -133)} L${P(-12, -160)} L${P(2, -141)} ` +
      `C${P(7, -142)} ${P(12, -142)} ${P(16, -140)} L${P(27, -159)} L${P(29, -132)} C${P(35, -125)} ${P(40, -117)} ${P(42, -110)} ` +
      `C${P(42, -105)} ${P(39, -102)} ${P(35, -101)} C${P(31, -97)} ${P(26, -94)} ${P(21, -92)} C${P(25, -80)} ${P(26, -62)} ${P(24, -46)} ` +
      `C${P(23, -30)} ${P(22, -14)} ${P(24, -4)} C${P(28, -2)} ${P(34, -2)} ${P(36, 0)} Z`;
  };
  const catX = 1040, catY = landY;
  const heroD = catPath(catX, catY, 1.0);
  const tailPts = [[-40, -6], [-58, -3], [-72, 10], [-77, 34], [-70, 52], [-58, 52]].map(([a, b]) => [catX + a, catY + b]);

  // ---------- cat B: climbing the stairs (walking profile, facing up-right) ----------
  const walker = (gx, gy, s, rot) => ({
    type: 'group', transform: `translate(${gx},${gy}) rotate(${rot}) scale(${s})`,
    children: [
      { type: 'brush', points: [[-46, -52], [-62, -70], [-70, -98], [-60, -118], [-48, -116]], width: [11, 9, 6], taper: 0.3, fill: T.cat },
      // legs: back pair, front pair (one lifted onto the next step)
      { type: 'brush', points: [[-36, -40], [-42, -20], [-40, 0]], width: [16, 10, 8], taper: 0.15, fill: T.cat },
      { type: 'brush', points: [[-24, -40], [-18, -20], [-26, -2]], width: [14, 9, 8], taper: 0.15, fill: T.cat },
      { type: 'brush', points: [[22, -42], [24, -22], [22, 0]], width: [12, 8, 8], taper: 0.15, fill: T.cat },
      { type: 'brush', points: [[34, -44], [46, -30], [52, -24]], width: [12, 8, 7], taper: 0.15, fill: T.cat },
      { type: 'curve', closed: true, fill: T.cat, points: [[-50, -52], [-40, -66], [0, -66], [30, -64], [46, -58], [44, -38], [20, -34], [-20, -34], [-46, -38]] },
      { type: 'path', fill: T.cat, d: 'M38,-62 C40,-74 48,-82 58,-82 L56,-98 L66,-86 C70,-86 74,-86 77,-85 L86,-96 L85,-80 C92,-74 94,-66 92,-60 C86,-52 72,-50 60,-52 C50,-54 42,-56 38,-62Z' },
    ],
  });

  // ---------- wires ----------
  const sag = (x1, y1, x2, y2, s) => `M${x1},${y1} Q${(x1 + x2) / 2},${(y1 + y2) / 2 + s} ${x2},${y2}`;
  const poleX = 1430;
  const wires = [
    [sag(poleX - 44, 172, 905, 212, 62), 2.4], [sag(poleX - 44, 172, 560, 92, 150), 2.2], [sag(poleX + 44, 172, 1610, 130, 26), 2.4],
    [sag(poleX - 12, 192, 905, 226, 40), 1.8], [sag(poleX + 12, 194, 1610, 236, 16), 1.8],
  ];

  // far city: hazy apartment-block skyline silhouettes in the valley (one path per layer → no light slits)
  const skyline = (seed, x0, base, hmin, hmax, bw) => {
    const Rr = rng(seed);
    let d = `M${x0},${base + 200} L${x0},${base}`;
    for (let bx = x0; bx < 1620;) {
      const w = bw * (0.6 + Rr() * 0.8), h = hmin + Rr() * (hmax - hmin);
      d += ` L${bx.toFixed(0)},${(base - h).toFixed(0)} L${(bx + w).toFixed(0)},${(base - h).toFixed(0)}`;
      bx += w;
    }
    return d + ` L1620,${base + 200}Z`;
  };
  const cityLayer = (seed, y0, hmin, hmax, fill, n, w0, x0 = 1180) => {
    const Rr = rng(seed);
    return Array.from({ length: n }, (_, i) => {
      const bx = x0 + (i * (1620 - x0)) / n + Rr() * 8, bh = hmin + Rr() * (hmax - hmin);
      return { type: 'rect', x: bx, y: y0 - bh, w: w0 + Rr() * w0 * 0.6, h: bh + 300, fill };
    });
  };

  return {
    width: W, height: H,
    tokens: T,
    background: { radial: { cx: 0.69, cy: 0.42, r: 0.86, stops: [[0, T.sky5], [0.12, T.sky4], [0.3, T.sky3], [0.5, T.sky2], [0.72, T.sky1], [1, T.sky0]] } },
    post: { grain: 0.05, vignette: { amount: 0.22, color: '#1a1d3a' } },
    children: [
      // dawn core glow
      { type: 'ellipse', cx: 1090, cy: 400, rx: 600, ry: 300, blend: 'screen', fill: { radial: { stops: [[0, T.sky5, 0.85], [0.3, T.sky4, 0.45], [1, T.sky3, 0]] } } },
      // fading stars + thin old moon (waning crescent, rises before dawn)
      { type: 'scatter', count: 30, seed: 4, area: { x: 580, y: 12, w: 1010, h: 160 }, scale: [0.3, 1], opacity: [0.2, 0.65], child: { type: 'circle', cx: 0, cy: 0, r: 2.2, fill: '#e8e6ff' } },
      { type: 'group', children: [
        { type: 'path', d: 'M1228.7,101.3 A16,16 0 0 0 1251.3,78.7 A19,19 0 0 1 1228.7,101.3Z', fill: '#f4ecd8', opacity: 0.9 },
      ], effects: [{ type: 'glow', blur: 6, color: '#f4ecd8', opacity: 0.4 }] },
      // far mountains (granite peaks), lavender, low contrast
      { type: 'curve', closed: true, tension: 0.35, fill: T.mtn2, points: [[1150, 440], [1220, 392], [1270, 372], [1320, 336], [1352, 348], [1390, 318], [1418, 306], [1452, 330], [1506, 346], [1566, 334], [1620, 352], [1620, 460]] },
      { type: 'curve', closed: true, tension: 0.4, fill: T.mtn, points: [[1210, 460], [1290, 420], [1360, 410], [1430, 392], [1500, 404], [1560, 392], [1620, 404], [1620, 480]] },
      // haze band over the valley
      { type: 'rect', x: 900, y: 390, w: 720, h: 140, fill: { linear: { angle: 90, stops: [[0, T.sky4, 0], [0.45, T.sky4, 0.4], [1, T.sky4, 0]] } } },
      { type: 'path', d: skyline(11, 1180, 470, 10, 40, 16), fill: '#a5a1c1' },
      { type: 'path', d: skyline(12, 1180, 505, 16, 64, 26), fill: '#8b8ab1' },
      { type: 'rect', x: 1180, y: 440, w: 440, h: 140, fill: { linear: { angle: 90, stops: [[0, T.sky4, 0.0], [0.5, T.sky4, 0.22], [1, T.sky4, 0]] } } },
      // a few windows still awake in the valley
      { type: 'scatter', count: 7, seed: 21, area: { x: 1250, y: 470, w: 330, h: 60 }, child: { type: 'rect', x: 0, y: 0, w: 4, h: 3, fill: '#ffd8a0' }, opacity: [0.5, 0.9] },

      // pole + transformer + cable coil
      { type: 'path', d: `M${poleX - 10},${H} L${poleX - 6},120 L${poleX + 6},120 L${poleX + 10},${H}Z`, fill: T.roofR },
      { type: 'rect', x: poleX - 52, y: 166, w: 104, h: 8, fill: T.roofR },
      { type: 'rect', x: poleX - 30, y: 189, w: 60, h: 6, fill: T.roofR },
      { type: 'rect', x: poleX - 44, y: 214, w: 28, h: 54, r: 6, fill: T.roofR },
      { type: 'ellipse', cx: poleX + 20, cy: 300, rx: 22, ry: 10, fill: 'none', stroke: { color: T.roofR, width: 3 } },
      { type: 'ellipse', cx: poleX + 20, cy: 304, rx: 20, ry: 9, fill: 'none', stroke: { color: T.roofR, width: 2 } },
      ...wires.map(([d, w]) => ({ type: 'path', d, fill: 'none', stroke: { color: T.wire, width: w } })),

      // ---------- building A (far left, 4-storey villa) ----------
      { type: 'rect', x: -10, y: 84, w: 580, h: 900, fill: { linear: { angle: 0, stops: [[0, '#4f5180'], [1, '#585a88']] } },
        texture: { type: 'group', children: Array.from({ length: 75 }, (_, i) => ({ type: 'rect', x: -10, y: 90 + i * 12, w: 590, h: 1.5, fill: '#454775', opacity: 0.55 })) } },
      { type: 'rect', x: -10, y: 72, w: 584, h: 14, fill: T.wallDk },
      // storey bands
      ...[252, 432, 612].map(by => ({ type: 'rect', x: -10, y: by, w: 580, h: 6, fill: T.wallDk, opacity: 0.6 })),
      ...grilleWindow(60, 140, 140, 80), ...grilleWindow(330, 132, 74, 96, { lit: true }),
      ...grilleWindow(60, 320, 92, 84), ...grilleWindow(300, 320, 150, 76),
      // AC outdoor unit on bracket
      { type: 'rect', x: 196, y: 352, w: 74, h: 54, r: 3, fill: '#565d88' },
      { type: 'circle', cx: 222, cy: 379, r: 18, fill: '#434a75' },
      { type: 'rect', x: 196, y: 406, w: 74, h: 4, fill: T.wallDk },
      // laundry on a line between grilles
      { type: 'path', d: 'M300,300 Q375,312 450,300', fill: 'none', stroke: { color: T.wallDk, width: 1.5 } },
      { type: 'path', d: 'M318,304 L346,307 L344,346 L320,342Z', fill: '#7d82ab' },
      { type: 'path', d: 'M394,307 L420,305 L424,334 L398,338Z', fill: '#6c5f8a' },
      ...grilleWindow(60, 500, 140, 80),
      // rain downpipe
      { type: 'rect', x: 279, y: 86, w: 8, h: 900, fill: '#41447a' }, ...[200, 440, 620].map(py => ({ type: 'rect', x: 275, y: py, w: 17, h: 6, fill: '#3a3d70' })),
      // rooftop water tank + rooftop cat
      { type: 'rect', x: 380, y: 30, w: 92, h: 44, r: 14, fill: '#3b4372' },
      { type: 'rect', x: 388, y: 70, w: 6, h: 8, fill: '#3b4372' }, { type: 'rect', x: 458, y: 70, w: 6, h: 8, fill: '#3b4372' },
      { type: 'path', d: catPath(150, 73, 0.3, -1), fill: '#1c1f3a' },
      { type: 'brush', points: [[150 + 12, 72], [150 + 20, 80], [150 + 21, 92]], width: 4, taper: 0.4, fill: '#1c1f3a' },

      // ---------- building B (closer to crest) ----------
      { type: 'rect', x: 540, y: 206, w: 366, h: 700, fill: { linear: { angle: 0, stops: [[0, T.wallB], [0.8, T.wallB2], [1, '#7a7aa0']] } } },
      { type: 'rect', x: 536, y: 196, w: 374, h: 12, fill: T.wallDk },
      ...grilleWindow(596, 262, 118, 84),
      ...grilleWindow(784, 262, 64, 104),
      // gas pipe + meters (Korea's yellow gas pipes, muted in the blue hour)
      { type: 'rect', x: 556, y: 420, w: 304, h: 7, fill: T.pipe },
      { type: 'rect', x: 853, y: 214, w: 7, h: 213, fill: T.pipe },
      { type: 'rect', x: 622, y: 434, w: 30, h: 36, r: 3, fill: '#4b527e' }, { type: 'rect', x: 666, y: 434, w: 30, h: 36, r: 3, fill: '#4b527e' },
      { type: 'circle', cx: 637, cy: 448, r: 6, fill: '#6a6f98' }, { type: 'circle', cx: 681, cy: 448, r: 6, fill: '#6a6f98' },
      // rooftop basins on B (against the mid sky, low contrast)
      ...basin(640, 196, 46, 'onion', 13, true),
      // security lamp on B's corner + its warm pool
      { type: 'rect', x: 902, y: 252, w: 38, h: 5, fill: T.wallDk },
      { type: 'path', d: 'M922,255 L952,255 L946,268 L928,268Z', fill: T.wallDk },
      { type: 'ellipse', cx: 930, cy: 330, rx: 240, ry: 230, blend: 'screen', fill: { radial: { stops: [[0, T.lampGlow, 0.45], [0.35, T.lampGlow, 0.14], [1, T.lampGlow, 0]] } } },
      { type: 'ellipse', cx: 937, cy: 270, rx: 9, ry: 4, fill: T.lamp, effects: [{ type: 'glow', blur: 10, color: T.lampGlow, opacity: 0.9 }] },

      // ---------- far-side roofs ----------
      { type: 'path', d: roofD, fill: { linear: { angle: 90, stops: [[0, T.roofR2], [0.5, T.roofR]] } } },
      { type: 'rect', x: 1236, y: 472, w: 114, h: 4, fill: '#5a5e84' },
      { type: 'rect', x: 1470, y: 626, w: 140, h: 4, fill: '#4c5076' },
      { type: 'path', d: tileRoofD, fill: '#2f3352' },
      ...[0, 1, 2, 3, 4, 5, 6].map(i => ({ type: 'path', d: `M${1378 + i * 14},522 L${1350 + i * 22},558`, fill: 'none', stroke: { color: '#3c4063', width: 2 } })),
      { type: 'path', d: 'M1368,520 L1474,520', fill: 'none', stroke: { color: '#6a6c90', width: 3 } },
      { type: 'rect', x: 1262, y: 436, w: 40, h: 36, r: 10, fill: T.roofR2 },
      ...basin(1252, 526, 44, 'onion', 7, true), ...basin(1530, 628, 50, 'chili', 8, true),
      // dim windows of the houses below
      { type: 'rect', x: 1270, y: 580, w: 40, h: 50, fill: '#232741' }, { type: 'rect', x: 1530, y: 700, w: 46, h: 54, fill: '#232741' },

      // ---------- stairs ----------
      { type: 'path', d: stairD, fill: { linear: { angle: 90, stops: [[0, T.stairSide], [1, T.stair]] } } },
      // formwork lines on the side wall
      // house façade under the landing: blue steel gate, grilled window, number plate, styrofoam garden
      { type: 'rect', x: 990, y: 470, w: 200, h: 540, fill: { linear: { angle: 90, stops: [[0, '#2b2f50'], [1, '#22263f']] } } },
      { type: 'rect', x: 986, y: 462, w: 208, h: 10, fill: '#1c1f37' },
      { type: 'rect', x: 1050, y: 700, w: 104, h: 300, fill: '#2f3a63' },
      { type: 'rect', x: 1050, y: 700, w: 104, h: 300, fill: 'none', stroke: { color: '#1d2440', width: 4 } },
      ...[0, 1, 2, 3].map(i => ({ type: 'rect', x: 1060, y: 712 + i * 22, w: 84, h: 3, fill: '#3c4874' })),
      { type: 'rect', x: 1101, y: 700, w: 3, h: 300, fill: '#1d2440' },
      { type: 'circle', cx: 1092, cy: 860, r: 4, fill: '#4a5482' },
      { type: 'rect', x: 1016, y: 690, w: 22, h: 14, r: 2, fill: '#3a4572' },
      ...grilleWindow(1030, 540, 120, 70),
      { type: 'rect', x: 1004, y: 950, w: 40, h: 40, fill: '#2c3050' },
      // parked delivery scooter (rider asleep somewhere up the hill)
      { type: 'group', translate: [1240, 0], children: [
        { type: 'path', d: 'M8,952 C16,906 64,892 118,896 L168,896 C186,878 196,850 192,822 L212,818 C222,860 224,912 236,952 Z', fill: '#363c63', stroke: { color: '#4a5080', width: 2 } },
        { type: 'path', d: 'M36,894 C58,878 112,876 146,884 L146,898 L40,902Z', fill: '#262a47' },
        { type: 'path', d: 'M40,882 C62,872 110,870 144,878', fill: 'none', stroke: { color: '#6a6e98', width: 2.5 } },
        { type: 'rect', x: -4, y: 806, w: 100, h: 80, r: 6, fill: '#3b4168' },
        { type: 'rect', x: -4, y: 806, w: 100, h: 3, r: 1, fill: '#7275a0' },
        { type: 'rect', x: 42, y: 886, w: 12, h: 12, fill: '#2a2e4c' },
        { type: 'brush', points: [[194, 824], [176, 806], [150, 800]], width: 7, taper: 0.2, fill: '#2a2e4c' },
        { type: 'brush', points: [[205, 820], [212, 800]], width: 4, taper: 0.2, fill: '#2a2e4c' },
        { type: 'ellipse', cx: 222, cy: 846, rx: 8, ry: 11, fill: '#4c527c' },
        { type: 'circle', cx: 30, cy: 962, r: 30, fill: '#1a1d33' }, { type: 'circle', cx: 30, cy: 962, r: 11, fill: '#3a3f63' },
        { type: 'circle', cx: 204, cy: 962, r: 30, fill: '#1a1d33' }, { type: 'circle', cx: 204, cy: 962, r: 11, fill: '#3a3f63' },
      ] },
      { type: 'path', d: 'M988,996 L988,470', fill: 'none', stroke: { color: '#191c32', width: 3 } },
      // concrete drips on the stair wall
      ...[[320, 900, 70], [520, 700, 120], [760, 560, 150], [880, 520, 90]].map(([dx, dy, dl]) => ({ type: 'rect', x: dx, y: dy, w: 10, h: dl, fill: { linear: { angle: 90, stops: [[0, '#2a2e4e', 0.8], [1, '#2a2e4e', 0]] } } })),
      ...treadTops,
      landingTop,
      { type: 'rect', x: landL, y: landY - 1, w: landR - landL, h: 3, fill: '#f0c8a0', opacity: 0.85 },
      // handrail (pipe) + posts
      { type: 'path', d: `M${landL - 50},${landY - 136 + rise} L${landL - 50 - 11 * run},${landY - 136 + 12 * rise}`, fill: 'none', stroke: { color: '#3d4371', width: 6 } },
      { type: 'path', d: `M${landL - 50},${landY - 138 + rise} L${landL - 50 - 4 * run},${landY - 138 + 5 * rise}`, fill: 'none', stroke: { color: '#a0899a', width: 1.5 }, opacity: 0.8 },
      ...[0, 3, 6, 9].map(k => ({ type: 'rect', x: landL - 50 - k * run - 2, y: landY - 136 + (k + 1) * rise, w: 5, h: 138, fill: '#3d4371' })),
      // weeds in the stair joints (sparser and darker downhill)
      ...steps.slice(0, 9).flatMap(([x0, ty, x1], i) => (i % 2 === 1 && i !== 3 ? [] : [0, 1, 2].map(k => ({
        type: 'brush', points: [[x1 - 6 - k * 5, ty], [x1 - 4 - k * 7 + (k - 1) * 4, ty - 10 - k * 3], [x1 - 2 - k * 9 + (k - 1) * 9, ty - 18 - (k % 2) * 8]],
        width: 3, taper: 0.8, fill: i < 3 ? '#4d6660' : '#344a4a', opacity: 0.9 })))),
      // basins on the steps
      ...basin(196, 868, 74, 'onion', 9), ...basin(282, 816, 52, 'chili', 10),

      // warm lamp + dawn spill on the top treads and landing
      { type: 'ellipse', cx: 920, cy: 440, rx: 130, ry: 70, blend: 'screen', fill: { radial: { stops: [[0, T.lampGlow, 0.2], [1, T.lampGlow, 0]] } } },

      // cat B climbing (step 4) — dark against the mid wall
      walker(704, 566, 0.62, -12),

      // hero cat: warm rim (offset copy) → tail → dark body → eye glint
      { type: 'path', d: heroD, fill: T.rim, translate: [3, -2], opacity: 0.95 },
      { type: 'brush', points: tailPts, width: [12, 10, 7], taper: 0.25, fill: T.cat },
      { type: 'path', d: heroD, fill: T.cat },
      ...[[-6, 0], [0, 6], [5, 12]].map(([dy, ey], i) => ({ type: 'brush', points: [[catX + 33, catY - 104 + i * 3], [catX + 52, catY - 108 + dy + i * 2], [catX + 70, catY - 106 + ey]], width: 1.6, taper: 0.8, fill: '#ffdcaa', opacity: 0.85 })),
      { type: 'ellipse', cx: catX + 29, cy: catY - 118, rx: 3.2, ry: 1.6, fill: '#ffe1a8', rotate: -12, origin: [catX + 29, catY - 118] },
    ],
  };
};
