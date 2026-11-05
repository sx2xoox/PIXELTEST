// E4 — 골목의 고양이들 — 도시가 잠들면 시작되는 이야기 (lead illustration, 1600×1000, no text)
//
// STORY: 05:40, the last minutes of night in a hillside Seoul alley (달동네 계단길). The whole
// neighbourhood is asleep; one security lamp is still on. A cat has climbed the steep concrete
// stairs and sits on the top landing, back to us, watching the first light open in the valley
// between the mountains. Its tail hangs over the step edge. The night shift is ending — the
// story "begins" at the threshold between the sleeping alley and the waking sky.
//
// NOTAN (chosen from 3 thumbnails in notan/: A stair-crest / B rooftop / C lit window → A,
// strongest diagonal + place + backlit silhouette):
//   LIGHT  dawn sky band behind the crest (upper right)          ~25%
//   MID    villa walls on the left + upper sky + far mountains   ~40%
//   DARK   stair mass (diagonal, lower left) + far-side roofs    ~35%
//   Focal: darkest shape (cat) against the lightest, warmest spot (dawn core) at ≈(0.66,0.38).
// VALUE PLAN (L*): cat 10 · stairs 14–18 · right roofs 20 · villa walls 30–40 · upper sky 25–45 ·
//   far city 50 · mountains 60 · horizon 80 · dawn core 92.
// COLOR: cool indigo/lavender night (C 5–20); warm accent (peach/gold) only at the dawn core,
//   the security lamp and the cat's rim, all inside the focal ninth.
//
// ROUNDS
//   r1: first full build from notan A.
export default () => {
  const W = 1600, H = 1000;
  const T = {
    sky0: '#1d2449', sky1: '#323c6c', sky2: '#6a6c9a', sky3: '#b991a3', sky4: '#efc4a0', sky5: '#fde6c2',
    mtn: '#8d8db0', mtn2: '#a3a0bd', city: '#5d628e', cityD: '#4a4f7a',
    wallA: '#343c62', wallB: '#3d456b', wallDk: '#262c4b', win: '#1f2442', grille: '#3f4874',
    stair: '#1b1e35', stairTop: '#3a3f63', roofR: '#22263f', cat: '#141529', rim: '#ffd39a',
    lamp: '#fff3cf', lampGlow: '#ffb867', basin: '#6e3440', leaf: '#2c4440', pipe: '#8c7a48',
    wire: '#1c1f36',
  };
  const R = (() => { let a = 7; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();

  // ---------- stairs (elevation zigzag) ----------
  const landL = 960, landR = 1135, landY = 410, rise = 52, run = 88;
  const pts = [];
  let x = landL, y = landY;
  const nosings = [];
  while (y < H + rise) { nosings.push([x, y]); pts.push([x, y]); y += rise; pts.push([x, y]); x -= run; pts.push([x, y]); }
  const stairD = `M${landR},${landY} L${landL},${landY} ` + pts.map(p => `L${p[0]},${p[1]}`).join(' ') + ` L${x},${H + 60} L${landR},${H + 60} Z`;

  // right far-side roofs beyond the crest
  const roofD = `M${landR - 2},${landY} L${landR},${380} L1250,380 L1250,470 L1430,470 L1430,540 L1600,540 L1600,${H} L${landR - 2},${H}Z`;

  // ---------- helpers ----------
  const grilleWindow = (wx, wy, ww, wh, lit = false) => {
    const bars = [];
    const n = Math.round(ww / 16);
    for (let i = 1; i < n; i++) bars.push({ type: 'rect', x: wx + (i * ww) / n - 1.5, y: wy - 4, w: 3, h: wh + 8, fill: T.grille });
    return [
      { type: 'rect', x: wx - 6, y: wy - 6, w: ww + 12, h: wh + 12, fill: T.wallDk },
      { type: 'rect', x: wx, y: wy, w: ww, h: wh, fill: lit ? { linear: { angle: 90, stops: [[0, '#6c5a5a'], [1, '#4a3f4c']] } } : T.win },
      { type: 'rect', x: wx + ww / 2 - 1, y: wy, w: 2, h: wh, fill: T.wallDk },
      ...bars,
      { type: 'rect', x: wx - 4, y: wy - 6, w: ww + 8, h: 4, fill: T.grille },
      { type: 'rect', x: wx - 4, y: wy + wh + 2, w: ww + 8, h: 5, fill: T.grille },
    ];
  };
  const basin = (bx, by, bw, plant = 'onion', seed = 1) => {
    const h = bw * 0.42;
    const kids = [];
    const Rr = (() => { let a = seed * 97 + 3; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
    if (plant === 'onion') {
      for (let i = 0; i < 9; i++) {
        const px = bx + bw * (0.15 + 0.7 * Rr()), top = by - h - 30 - Rr() * 40;
        kids.push({ type: 'brush', points: [[px, by - h + 2], [px + (Rr() - 0.5) * 14, (by - h + top) / 2], [px + (Rr() - 0.5) * 30, top]], width: 4, taper: 0.7, fill: T.leaf });
      }
    } else {
      for (let i = 0; i < 4; i++) {
        kids.push({ type: 'blob', cx: bx + bw * (0.2 + 0.6 * Rr()), cy: by - h - 18 - Rr() * 22, r: 14 + Rr() * 10, points: 7, wobble: 0.35, seed: seed + i, fill: T.leaf });
      }
      kids.push({ type: 'brush', points: [[bx + bw * 0.5, by - h], [bx + bw * 0.48, by - h - 30]], width: 3, fill: T.leaf });
    }
    kids.push({ type: 'path', d: `M${bx},${by - h} L${bx + bw},${by - h} L${bx + bw * 0.9},${by} L${bx + bw * 0.1},${by}Z`, fill: T.basin });
    kids.push({ type: 'rect', x: bx - 3, y: by - h - 3, w: bw + 6, h: 6, r: 3, fill: '#7d3e48' });
    return kids;
  };

  // ---------- cat (facing right, sitting, local origin = ground under its body) ----------
  const catX = 1030, catY = landY, cs = 1.0;
  const P = (px, py) => `${(catX + px * cs).toFixed(1)},${(catY + py * cs).toFixed(1)}`;
  const catD =
    `M${P(-38, 0)} C${P(-50, -6)} ${P(-54, -34)} ${P(-44, -54)} C${P(-38, -68)} ${P(-28, -82)} ${P(-18, -94)} ` +
    `C${P(-16, -102)} ${P(-16, -110)} ${P(-14, -118)} C${P(-13, -122)} ${P(-12, -126)} ${P(-10, -129)} L${P(-8, -152)} L${P(4, -135)} ` +
    `C${P(8, -136)} ${P(12, -136)} ${P(15, -134)} L${P(24, -152)} L${P(26, -128)} C${P(31, -122)} ${P(35, -115)} ${P(37, -109)} ` +
    `C${P(37, -105)} ${P(34, -102)} ${P(31, -101)} C${P(27, -97)} ${P(23, -95)} ${P(19, -93)} C${P(23, -80)} ${P(25, -62)} ${P(23, -46)} ` +
    `C${P(22, -30)} ${P(21, -14)} ${P(23, -4)} C${P(27, -2)} ${P(33, -2)} ${P(35, 0)} Z`;
  const tailPts = [[-40, -6], [-58, -3], [-70, 10], [-74, 32], [-67, 48], [-56, 46]].map(([a, b]) => [catX + a * cs, catY + b * cs]);

  // ---------- wires ----------
  const sag = (x1, y1, x2, y2, s) => `M${x1},${y1} Q${(x1 + x2) / 2},${(y1 + y2) / 2 + s} ${x2},${y2}`;
  const poleX = 1420;
  const wires = [
    sag(poleX - 40, 168, 905, 214, 70), sag(poleX - 40, 168, 560, 92, 150), sag(poleX + 40, 168, 1600, 140, 30),
    sag(poleX - 10, 190, 905, 236, 55), sag(poleX + 10, 190, 1600, 230, 20), sag(poleX, 240, 905, 262, 40),
  ];

  return {
    width: W, height: H,
    tokens: T,
    background: { linear: { angle: 90, stops: [[0, T.sky0], [0.16, T.sky1], [0.3, T.sky2], [0.37, T.sky3], [0.42, T.sky4], [0.6, T.sky5]] } },
    post: { grain: 0.05, vignette: { amount: 0.28, color: '#0d0f22' } },
    children: [
      // dawn core glow
      { type: 'ellipse', cx: 1080, cy: 420, rx: 520, ry: 260, blend: 'screen', fill: { radial: { stops: [[0, T.sky5, 0.9], [0.35, T.sky4, 0.45], [1, T.sky3, 0]] } } },
      // faint stars high up
      { type: 'scatter', count: 28, seed: 4, area: { x: 560, y: 10, w: 1040, h: 170 }, scale: [0.3, 1], opacity: [0.25, 0.7], child: { type: 'circle', cx: 0, cy: 0, r: 2.2, fill: '#e8e6ff' } },
      // far mountains (Bukhansan-like granite peaks), lavender, low contrast
      { type: 'curve', closed: true, tension: 0.4, fill: T.mtn2, points: [[1110, 430], [1180, 380], [1240, 360], [1290, 330], [1330, 342], [1370, 312], [1400, 300], [1440, 326], [1500, 340], [1560, 330], [1620, 350], [1620, 440]] },
      { type: 'curve', closed: true, tension: 0.4, fill: T.mtn, points: [[1180, 440], [1260, 400], [1330, 390], [1400, 372], [1470, 384], [1540, 372], [1620, 390], [1620, 470]] },
      // haze band
      { type: 'rect', x: 900, y: 380, w: 700, h: 110, fill: { linear: { angle: 90, stops: [[0, T.sky4, 0], [0.5, T.sky4, 0.35], [1, T.sky4, 0]] } } },
      // far city blocks
      ...Array.from({ length: 16 }, (_, i) => {
        const bx = 1120 + i * 32 + R() * 10, bh = 30 + R() * 50;
        return { type: 'rect', x: bx, y: 470 - bh + 40, w: 22 + R() * 14, h: bh + 60, fill: T.city };
      }),
      // pole
      { type: 'path', d: `M${poleX - 9},${H} L${poleX - 6},120 L${poleX + 6},120 L${poleX + 9},${H}Z`, fill: T.roofR },
      { type: 'rect', x: poleX - 48, y: 164, w: 96, h: 8, fill: T.roofR },
      { type: 'rect', x: poleX - 30, y: 186, w: 60, h: 6, fill: T.roofR },
      { type: 'rect', x: poleX - 42, y: 210, w: 28, h: 52, r: 6, fill: T.roofR },
      { type: 'ellipse', cx: poleX + 18, cy: 300, rx: 22, ry: 10, fill: 'none', stroke: { color: T.roofR, width: 3 } },
      ...wires.map(d => ({ type: 'path', d, fill: 'none', stroke: { color: T.wire, width: 2.2 } })),

      // building A (far left, taller)
      { type: 'rect', x: -10, y: 80, w: 580, h: 900, fill: { linear: { angle: 0, stops: [[0, T.wallA], [1, '#3a4268']] } } },
      { type: 'rect', x: -10, y: 70, w: 580, h: 14, fill: T.wallDk },
      ...grilleWindow(70, 150, 120, 90), ...grilleWindow(300, 150, 120, 90, true),
      ...grilleWindow(70, 330, 120, 90), ...grilleWindow(300, 330, 120, 90),
      ...grilleWindow(70, 510, 120, 90),
      // rooftop water tank
      { type: 'rect', x: 380, y: 26, w: 92, h: 46, r: 14, fill: '#2a3150' },
      { type: 'rect', x: 388, y: 70, w: 6, h: 10, fill: '#2a3150' }, { type: 'rect', x: 458, y: 70, w: 6, h: 10, fill: '#2a3150' },

      // building B (closer to crest, lower)
      { type: 'rect', x: 540, y: 205, w: 365, h: 700, fill: { linear: { angle: 0, stops: [[0, T.wallB], [1, '#4b5178']] } } },
      { type: 'rect', x: 536, y: 196, w: 373, h: 12, fill: T.wallDk },
      ...grilleWindow(600, 270, 110, 86),
      ...grilleWindow(770, 270, 70, 100),
      // gas pipe + meters (the yellow pipes, muted in shadow)
      { type: 'rect', x: 560, y: 418, w: 300, h: 7, fill: T.pipe },
      { type: 'rect', x: 853, y: 300, w: 7, h: 125, fill: T.pipe },
      { type: 'rect', x: 620, y: 432, w: 34, h: 40, r: 3, fill: '#5c6182' }, { type: 'rect', x: 670, y: 432, w: 34, h: 40, r: 3, fill: '#5c6182' },
      // security lamp on B's corner
      { type: 'rect', x: 900, y: 300, w: 36, h: 5, fill: T.wallDk },
      { type: 'path', d: 'M920,303 L950,303 L944,316 L926,316Z', fill: T.wallDk },
      { type: 'ellipse', cx: 935, cy: 330, rx: 200, ry: 170, blend: 'screen', fill: { radial: { stops: [[0, T.lampGlow, 0.55], [0.4, T.lampGlow, 0.18], [1, T.lampGlow, 0]] } } },
      { type: 'ellipse', cx: 935, cy: 318, rx: 9, ry: 4, fill: T.lamp, effects: [{ type: 'glow', blur: 10, color: T.lampGlow, opacity: 0.9 }] },

      // far-side roofs + parapet
      { type: 'path', d: roofD, fill: T.roofR },
      ...basin(1150, 382, 50, 'chili', 3), ...basin(1200, 382, 40, 'onion', 5),
      { type: 'rect', x: 1250, y: 440, w: 70, h: 30, fill: '#262a45' },

      // stairs
      { type: 'path', d: stairD, fill: T.stair },
      // nosing highlights (sky + lamp light catching tread edges), fading downward
      ...nosings.map(([nx, ny], i) => ({ type: 'rect', x: nx - run, y: ny + rise - 1, w: run, h: 3, fill: T.stairTop, opacity: Math.max(0.15, 0.9 - i * 0.09) })),
      { type: 'rect', x: landL, y: landY - 1, w: landR - landL, h: 3, fill: '#b49485', opacity: 0.8 },
      // handrail
      { type: 'path', d: `M${landL - 20},${landY - 60} L${landL - 20 - 11 * run},${landY - 60 + 11 * rise}`, fill: 'none', stroke: { color: '#2d3253', width: 6 } },
      ...[0, 3, 6, 9].map(k => ({ type: 'rect', x: landL - 20 - k * run - 2, y: landY - 60 + k * rise, w: 5, h: 64, fill: '#2d3253' })),
      ...basin(560, 615, 70, 'onion', 9),

      // cat: warm rim (offset copy) → dark body → tail
      { type: 'path', d: catD, fill: T.rim, translate: [3, -2], opacity: 0.9 },
      { type: 'brush', points: tailPts, width: [12, 10, 7], taper: 0.25, fill: T.cat },
      { type: 'path', d: catD, fill: T.cat },
    ],
  };
};
