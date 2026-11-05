// E5 — 『여름의 끝에서 우리는』 윤서해 · 파랑서가 — front cover 1200×1800
// CONCEPT "수평선 위의 끝": vertical NanumMyeongjo title set glyph-by-glyph. The horizon of a late-summer
//   sea is placed exactly on the ㅡ stroke of 끝 — the word "end" literally becomes the line where day meets
//   night. Above: ink on warm paper (summer day). Below: the same title continues in paper colour on the
//   deep blue sea (after the end — where "우리는" lives). One vermilion accent: a sun half-sunk on the horizon.
// Pairing: NanumMyeongjo (title, author) + Pretendard (small labels). 3 colours + accent.
// ROUND 1: base build.
const W = 1200, H = 1800;
const S = 190;                 // title size
const P = Math.round(S * 0.95); // vertical pitch (Myeongjo advance 0.95em, tightened)
const ASC = 0.79, DESC = 0.10;  // measured ink extents of NanumMyeongjo EB (em)
const C1 = 820, C2 = C1 - Math.round(S * 1.18);
const B0 = 470;                // baseline of 여
const GAP = Math.round(P * 0.42);
const col1 = ['여', '름', '의', null, '끝', '에', '서'];
const pos1 = []; { let b = B0; for (const g of col1) { if (g === null) { b += GAP; continue; } pos1.push([g, b]); b += P; } }
const bKkeut = pos1[3][1];
const HZ = Math.round(bKkeut - 0.45 * S);      // top of the ㅡ stroke = horizon
const col2 = ['우', '리', '는'].map((g, i) => [g, pos1[4][1] + i * P]);  // steps down one row: 우 beside 에

const glyphs = (fill) => [
  ...pos1.map(([g, b]) => ({ type: 'text', x: C1, y: b, size: S, font: 'm', weight: 800, align: 'center', text: g, fill, letterSpacing: 0 })),
  ...col2.map(([g, b]) => ({ type: 'text', x: C2, y: b, size: S, font: 'm', weight: 800, align: 'center', text: g, fill, letterSpacing: 0 })),
];

export default () => ({
  width: W, height: H,
  tokens: { paper: '#ece5d7', sea: '#1c2f47', sun: '#d6532e', mist: '#9aa6b4', ink2: '#5b6470' },
  fonts: { m: 'NanumMyeongjo', s: 'Pretendard' },
  background: '$paper',
  post: { grain: 0.045 },
  children: [
    { type: 'circle', cx: 250, cy: HZ, r: 58, fill: '$sun' },
    { type: 'rect', x: 0, y: HZ, w: W, h: H - HZ, fill: '$sea' },
    { type: 'group', clip: { type: 'rect', x: 0, y: 0, w: W, h: HZ }, children: glyphs('$sea') },
    { type: 'group', clip: { type: 'rect', x: 0, y: HZ, w: W, h: H - HZ }, children: glyphs('$paper') },
    // author: small vertical Myeongjo column in the upper paper field, top-aligned with the title
    { type: 'text', vertical: true, x: 1080, y: B0 - ASC * S, size: 40, font: 'm', weight: 700, text: '윤서해 장편소설', fill: '$sea', letterSpacing: 2 },
    // publisher in the sea
    { type: 'text', x: 96, y: 1704, size: 28, font: 's', weight: 600, text: '파랑서가', fill: '$mist', letterSpacing: 1.2 },
  ],
});
