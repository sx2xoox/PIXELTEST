// E5 — 『여름의 끝에서 우리는』 윤서해 · 파랑서가 — front cover 1200×1800
// CONCEPT "수평선 위의 끝": vertical NanumMyeongjo title set glyph-by-glyph. The horizon of a late-summer
//   sea is placed exactly on the ㅡ stroke of 끝 — the word "end" literally becomes the line where day meets
//   night. Above: ink on warm paper (summer day). Below: the same title continues in paper colour on the
//   deep blue sea (after the end — where "우리는" lives). One vermilion accent: a sun half-sunk on the horizon.
// Pairing: NanumMyeongjo (title, author) + Pretendard (small labels). 3 colours + accent.
// ROUND 1: base build. Horizon-on-ㅡ reads; but block 73% tall (>66), empty 73%, gravity dy .24 (sea too heavy),
//   author column spacing loose, publisher orphaned bottom-left.
// ROUND 2: S 190→170, horizon pushed down to ~59% (sea 41%); author split 윤서해(Myeongjo)/장편소설(Pretendard);
//   publisher moved to vertical column on the author axis x=1080 (one right axis frames title top & bottom);
//   sun moved to left third with irregular fading reflection strokes in the sea.
// ROUND 3: reflection strokes read as a retro 'sunset icon' cliché and go muddy brown → removed (one accent, pure).
//   "우리는" now begins exactly at the horizon (we begin where summer ends) instead of a full step down → block
//   shortened ~100px, title grows S 170→185 for thumbnail legibility, horizon lowered to ~62% (lighter sea mass).
//   Publisher bottom aligned to the ink bottom of 는 (shared baseline).
// ROUND 4: zoom check — the ㅡ of 끝 now glints in paper colour just under the horizon (reads as 끝, and as light on
//   water). Thumbnail (200px) title still reads. Added: faint warm afterglow in the sky toward the horizon (late
//   afternoon, ΔL small so midtones stay <5%); small horizon-dash publisher mark above 파랑서가.
//   B0 600→510: title block hugged the bottom edge (120px) while 25% sky sat empty; lifted 90px.
//   Kept: gravity dy≈.25 is intentional (sea anchors the page; type & sun sit on the horizon).
const W = 1200, H = 1800;
const S = 185;                 // title size
const P = Math.round(S * 0.95); // vertical pitch (Myeongjo advance 0.95em, tightened)
const ASC = 0.79, DESC = 0.10;  // measured ink extents of NanumMyeongjo EB (em)
const C1 = 820, C2 = C1 - Math.round(S * 1.18);
const B0 = 510;                // baseline of 여
const GAP = Math.round(P * 0.38);
const col1 = ['여', '름', '의', null, '끝', '에', '서'];
const pos1 = []; { let b = B0; for (const g of col1) { if (g === null) { b += GAP; continue; } pos1.push([g, b]); b += P; } }
const bKkeut = pos1[3][1];
const HZ = Math.round(bKkeut - 0.45 * S);      // top of the ㅡ stroke = horizon
const U0 = Math.round(HZ + 0.30 * S + ASC * S);   // 우 starts just below the horizon
const col2 = ['우', '리', '는'].map((g, i) => [g, U0 + i * P]);
const BOT = col2[2][1] + DESC * S;               // ink bottom of the title

const SX = 330, SR = 62, AX = 1080;

const glyphs = (fill) => [
  ...pos1.map(([g, b]) => ({ type: 'text', x: C1, y: b, size: S, font: 'm', weight: 800, align: 'center', text: g, fill, letterSpacing: 0 })),
  ...col2.map(([g, b]) => ({ type: 'text', x: C2, y: b, size: S, font: 'm', weight: 800, align: 'center', text: g, fill, letterSpacing: 0 })),
];

export default () => ({
  width: W, height: H,
  tokens: { paper: '#ece5d7', sea: '#1c2f47', sun: '#d6532e', mist: '#9aa6b4', ink2: '#5b6470' },
  fonts: { m: 'NanumMyeongjo', s: 'Pretendard' },
  background: { linear: { angle: 90, stops: [[0, '#ede7db'], [0.45, '#ece5d7'], [0.62, '#efdcc8']] } },
  post: { grain: 0.045 },
  children: [
    { type: 'circle', cx: SX, cy: HZ, r: SR, fill: '$sun' },
    { type: 'rect', x: 0, y: HZ, w: W, h: H - HZ, fill: '$sea' },
    { type: 'group', clip: { type: 'rect', x: 0, y: 0, w: W, h: HZ }, children: glyphs('$sea') },
    { type: 'group', clip: { type: 'rect', x: 0, y: HZ, w: W, h: H - HZ }, children: glyphs('$paper') },
    // right axis AX: author (top, paper) and publisher (bottom, sea) share one vertical axis
    { type: 'text', vertical: true, x: AX, y: B0 - ASC * S, size: 46, font: 'm', weight: 700, text: '윤서해', fill: '$sea', letterSpacing: 4 },
    { type: 'text', vertical: true, x: AX, y: B0 - ASC * S + 3 * 50 + 34, size: 24, font: 's', weight: 500, text: '장편소설', fill: '$ink2', letterSpacing: 3 },
    { type: 'rect', x: AX - 13, y: BOT - 4 * 27 - 26, w: 26, h: 3, fill: '$mist' },
    { type: 'text', vertical: true, x: AX, y: BOT - 4 * 27 + 4, size: 24, font: 's', weight: 600, text: '파랑서가', fill: '$mist', letterSpacing: 3 },
  ],
});
