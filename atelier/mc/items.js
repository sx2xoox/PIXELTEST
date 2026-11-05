// RPG 재료 아이콘 생성기(16×16) — 바닐라 재료 아이콘 실측 문법(docs/research/minecraft-items.md)
//  · 색 6~10 · 캔버스 채움 30~55%(실루엣 10~14px) · 외곽선 = 재질의 가장 어두운 색(검정 아님) · 빛은 왼쪽 위 · 반짝임은 순백 1~3px
//  · 형태(family)는 재료 종류를, 램프(색)·장식(tier)은 등급을 나타낸다 → 세트 전체가 일관된다
// 사용: icon('gem', { color:'#d0283c', tier:3, seed:1 }) → PixelCanvas(16)
import { PixelCanvas } from '../pixel.js';
import { fineRamp } from './shade.js';
import { slotShift, placeInSlot } from './slotfit.js';
import { ART } from './itemart.js';

const W = '#ffffff';
const rnd = s => () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

/** 재질 램프 6단(0 가장 어두움 = 외곽선 … 5 가장 밝음). chroma로 선명도 보장(color-vividness.md) */
export function materialRamp(color, { chroma = 0.13, dL = 0.105, hueShift = 24 } = {}) {
  return fineRamp(color, { steps: 6, dL, hueShift, chroma });
}

// ── 형태들: (u, v) = 픽셀 중심 좌표(0~16). 반환: 램프 단계(0~5, 실수 허용) 또는 null(빈칸)
const F = {
  // 컷 보석: 윗면(크라운)은 밝고 아랫면(파빌리온)은 왼쪽 밝음/오른쪽 어두움으로 나뉜 면
  gem(u, v) {
    const x = (u - 8) / 6.4, y = (v - 8) / 6.6;
    if (y < -0.66 || Math.abs(x) + Math.max(0, y) * 1.05 > 1 || Math.abs(x) > 1 - Math.max(0, -y - 0.3) * 1.1) return null;
    if (y < -0.3) return Math.abs(x) < 0.32 ? 4.8 : x < 0 ? 4.1 : 3.3;           // 테이블(가장 밝음)·크라운 좌우
    if (y < -0.14) return x < 0 ? 3.4 : 2.6;                                      // 거들
    // 파빌리온: 가운데에서 뻗는 면 4개(왼쪽 밝음 → 오른쪽 어두움) + 중심선
    if (Math.abs(x) < 0.07) return 3.9;
    return x < -0.45 ? 3.6 : x < 0 ? 3 : x < 0.45 ? 2.3 : 1.6;
  },
  // 결정 파편: 대각선으로 선 길쭉한 결정 2개(큰 것 + 작은 것), 왼쪽 면 밝음
  shard(u, v) {
    const one = (cx, cy, len, wid) => {
      const a = (u - cx + (v - cy)) / Math.SQRT2, b = (u - cx - (v - cy)) / Math.SQRT2;   // a: 결정 축(왼아래 → 오른위가 -), b: 폭
      const t = (-a + len / 2) / len; if (t < 0 || t > 1) return null;
      const half = wid * (t < 0.8 ? 1 : (1 - t) / 0.2);
      if (Math.abs(b) > half) return null;
      return b < -half * 0.2 ? 4.2 - t * 0.6 : b < half * 0.45 ? 3 : 1.9;
    };
    return one(6.6, 8.0, 16.5, 3) ?? one(10.6, 11.6, 9, 1.8);   // v2(칸 맞춤): 12px → 13~14px 대각선   // 큰 결정 + 나란히 선 작은 결정(겹치지 않게 축에 수직으로 비킴)
  },
  // 주괴: 위·앞·옆 세 면이 보이는 막대. v2(칸 맞춤): 바닐라 주괴처럼 크게(14×10, 채움 약 0.5) — 이전 12×8은 칸에서 작고 한쪽으로 쏠렸다
  ingot(u, v) {
    const x = Math.floor(u), y = Math.floor(v);
    if (y >= 3 && y <= 6) {                                       // 윗면: 한 줄 내려갈 때마다 왼쪽으로 1px 기움
      const x0 = 5 - (y - 3), x1 = 14 - (y - 3);
      if (x >= x0 && x <= x1) return y === 3 ? 4.6 : x === x0 + 1 && y === 4 ? 5 : 4.4 - (y - 3) * 0.25;
    }
    if (y >= 7 && y <= 12 && x >= 2 && x <= 11) return y === 7 ? 3.6 : 3.1 - (y - 8) * 0.25;   // 앞면
    const sx0 = { 3: 15, 4: 14, 5: 13 }[y] ?? 12, sx1 = y <= 9 ? 15 : 15 - (y - 9);              // 옆면(오른쪽)
    if (y >= 3 && y <= 12 && x >= sx0 && x <= sx1 && !(y <= 6 && x <= 14 - (y - 3))) return 1.9 - (y >= 10 ? 0.3 : 0);
    return null;
  },
  // 가루 무더기: 둥근 봉우리 + 반점
  dust(u, v) {
    const x = (u - 8) / 6.6, y = (v - 13.2) / 9.5;             // v2(칸 맞춤): 납작한 6px 무더기 → 바닐라 가루처럼 9~10px 봉우리
    if (y > 0.05 || y < -0.9 * Math.pow(Math.max(0, 1 - x * x), 0.75) || Math.abs(x) > 1) return null;   // 둥근 봉우리(포물선은 삼각뿔처럼 보였다)
    return 3 - y * 1.2 - x * 0.8;
  },
  // 구슬: 왼쪽 위 광원 + 오른쪽 아래 반사광(가장자리 한 단 밝게)
  orb(u, v) {
    const dx = u - 8, dy = v - 8.5, r = Math.hypot(dx, dy);
    if (r > 6.3) return null;
    const lit = (-dx - dy) / 6.3;
    return 2.4 + lit * 1.6 + (r > 5 && lit < -0.4 ? 0.9 : 0);
  },
  // 금속 조각: 작은 덩어리
  nugget(u, v) {
    const lump = (cx, cy, rr) => { const dx = u - cx, dy = v - cy, r = Math.hypot(dx * 1.1, dy * 1.2) + Math.sin(Math.atan2(dy, dx) * 3) * 0.4; return r > rr ? null : 2.8 + (-dx - dy) / rr * 1.4; };
    const dx = u - 8, dy = v - 8.6, a = Math.atan2(dy, dx), R = 5 + Math.cos(a * 4 + 0.9) * 0.9 + Math.sin(a * 7) * 0.35;   // 각진 덩어리 하나(네더라이트 파편 문법)
    if (Math.hypot(dx, dy) > R) return null;
    return 2.7 + (-dx - dy) / R * 1.5;
  },
  // 막대: 대각선 2px(왼쪽 밝음) + 양끝 마디
  rod(u, v) {
    const a = (u + v - 16) / Math.SQRT2, b = (u - v) / Math.SQRT2;
    if (Math.abs(a) > 1.6 || Math.abs(b) > 7) return null;
    const knot = Math.abs(b) > 5.6;
    return (a < 0 ? 3.8 : 2.4) + (knot ? -0.8 : 0);
  },
  // 송곳니·뿔: 아래 넓은 뿌리에서 위로 휘며 가늘어짐
  fang(u, v) {
    // v2(칸 맞춤): 아래가 넓은 뿔은 세로로 세우면 질량이 아래로 쏠려(세로 중심 +1.9) 칸에서 내려앉아 보인다 → 30° 눕혀 대각선으로(바닐라 뼈·블레이즈 막대 문법)
    { const a = -0.45, cx0 = 8, cy0 = 8.5, du = u - cx0, dv = v - cy0; u = cx0 + du * Math.cos(a) - dv * Math.sin(a); v = cy0 + du * Math.sin(a) + dv * Math.cos(a); }
    const t = (14.5 - v) / 13; if (t < 0 || t > 1) return null;
    const cx = 6 + Math.sin(t * 1.7) * 4.2, half = 4.6 * (1 - t) ** 0.8 + 0.45;   // v2(칸 맞춤): 채움 0.23 → 0.28+
    const d = u - cx; if (Math.abs(d) > half) return null;
    return (d < 0 ? 4 : 2.6) - (t < 0.15 ? 1.2 : 0);
  },
  // 비늘: 방패꼴 + 가운데 능선 + 아래쪽 어두움
  scale(u, v) {
    const x = (u - 8) / 6.2, y = (v - 7.6) / 6.8;
    if (y < -0.8 || Math.abs(x) > Math.sqrt(Math.max(0, 1 - Math.max(0, y) ** 1.4))) return null;
    if (Math.abs(x) < 0.12) return 4.4 - y;
    return 3.2 - y * 1.1 - x * 0.6;
  },
  // 정수 병: 유리병 + 코르크 + 안의 액체(재질색) — 유리는 회색으로 따로 칠함
  essence(u, v) {
    const dx = u - 8, dy = v - 10, r = Math.hypot(dx, dy);
    if (r <= 5.2) return dy > -1.5 ? 3.2 - dy * 0.35 + (dx < -1 ? 0.8 : 0) : 'glass';
    if (Math.abs(dx) <= 1.6 && v >= 3.5 && v < 6.2) return 'glass';
    if (Math.abs(dx) <= 1.6 && v >= 2 && v < 3.5) return 'cork';
    return null;
  },
  // 주화: 원 + 안쪽 테 + 가운데 문양
  coin(u, v) {
    const dx = u - 8, dy = v - 8.5, r = Math.hypot(dx, dy * 1.05);
    if (r > 6.2) return null;
    if (r > 5.1) return 2.2 + (-dx - dy) / 5.4 * 1.2;
    if (r > 4.2) return 1.6;
    return Math.abs(dx) < 0.9 && Math.abs(dy) < 2.4 ? 4.4 : 3.2 + (-dx - dy) / 4 * 0.6;
  },
  // 강화석: 거친 다각형 돌(무채 회색) + 재질색 룬이 빛남
  stone(u, v) {
    const dx = u - 8, dy = v - 8.6, a = Math.atan2(dy, dx), r = Math.hypot(dx, dy);
    const R = 6.2 + Math.cos(a * 5 + 0.6) * 0.7 + Math.sin(a * 3) * 0.4;
    if (r > R) return null;
    const rune = (Math.abs(dx) < 0.6 && Math.abs(dy) < 3.4) || (Math.abs(dy + 0.6) < 0.6 && Math.abs(dx) < 2.6) || (Math.abs(dx - dy * 0.0) < 0 );
    return rune ? 'rune' : 'rock:' + (2.6 + (-dx - dy) / R * 1.4);
  },
};
export const FAMILIES = Object.keys(F);
/** 형태 → 칸 맞춤 기준(slotfit.js FIT). nugget은 네더라이트 파편급 덩어리라 material */
export const fitKind = f => f === 'rod' ? 'rod' : 'material';

const GLASS0 = ['#3a4450', '#6b7a86', '#a9bac4', '#dfe9ee'], CORK0 = ['#4a2e1c', '#7a5236', '#a8774f'];
const ROCK0 = fineRamp('#77727c', { steps: 6, dL: 0.1, hueShift: 10, chroma: 0.015 });

/**
 * 아이콘 하나. tier(1~5): 1 기본 · 2 반짝임 1px 추가 · 3 가장자리 빛(밝은 단계 강화) · 4 별 반짝임 · 5 별 반짝임 2개 + 테두리 한 단 밝게
 */
export function icon(family, { color = '#c0283c', tier = 1, chroma, seed = 1, ramp, pal } = {}) {
  // ramp = setRamp(...) 결과({R, spec})를 주면 세트 팔레트를 쓴다(권장, palette.js). 없으면 예전 방식(색 하나 → 독립 램프)
  const R = ramp ? ramp.R.slice() : materialRamp(color, { chroma: chroma ?? (0.1 + tier * 0.012) });
  const SPEC = ramp ? ramp.spec : W;
  const GLASS = pal ? pal.ramps.glass.R.filter((_, i) => i % 2 === 0 || i === 5).slice(0, 4) : GLASS0;
  const CORK = pal ? pal.ramps.cork.R.slice(0, 5).filter((_, i) => i === 0 || i === 2 || i === 4) : CORK0;
  const ROCK = pal ? pal.ramps.rock.R : ROCK0;
  // v3: 손 픽셀 원본이 있으면 그것을 쓴다(itemart.js). 수식 형태(F)는 원본이 없는 형태의 예비용.
  if (ramp && ART[family]) {
    const G = pal.ramps.glass.R, K = pal.ramps.cork.R, Rk = pal.ramps.rock.R;
    const map = { w: SPEC, a: G[0], b: G[2], c: G[3], d: G[5], k: K[0], K: K[3], o: Rk[0], p: Rk[1], q: Rk[2], r: Rk[3], s: Rk[4], t: Rk[5] };
    const h = new PixelCanvas(16);
    for (const [y, [x0, str]] of Object.entries(ART[family])) [...str].forEach((ch, i) => { if (ch !== '.') h.set(x0 + i, +y, /[0-5]/.test(ch) ? R[+ch] : map[ch]); });
    const out = placeInSlot(h, fitKind(family));
    const filled = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && !!out.get(x, y);
    const star = (sx, sy) => { out.set(sx, sy, SPEC); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!filled(sx + dx, sy + dy)) out.set(sx + dx, sy + dy, R[4]); };
    if (tier >= 4) { const sp = [[13, 2], [12, 2], [2, 2]].find(([x, y]) => !filled(x, y) && !filled(x + 1, y) && !filled(x - 1, y) && !filled(x, y + 1)); if (sp) star(...sp); }
    if (tier >= 5) { const sp = [[2, 13], [3, 13], [13, 13]].find(([x, y]) => !filled(x, y) && !filled(x + 1, y) && !filled(x - 1, y) && !filled(x, y - 1)); if (sp) star(...sp); }
    return out;
  }
  const c = new PixelCanvas(16), rand = rnd(seed * 97 + tier);
  const val = new Map();
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const k = F[family](x + 0.5, y + 0.5);
    if (k === null || k === undefined) continue;
    val.set(y * 16 + x, k);
  }
  // 칸 맞춤(slotfit.js): 그린 형태의 질량 중심을 바닐라 기준 위치로 정수 이동(가로 0, 세로 약간 아래, 여백 ≥1)
  {
    const m = new PixelCanvas(16); for (const i of val.keys()) m.set(i % 16, (i / 16) | 0, '#000000');
    const [dx, dy] = slotShift(m, fitKind(family));
    if (dx || dy) { const moved = new Map(); for (const [i, k] of val) moved.set((((i / 16) | 0) + dy) * 16 + (i % 16) + dx, k); val.clear(); for (const [i, k] of moved) val.set(i, k); }
  }
  const has = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && val.has(y * 16 + x);
  for (const [i, k] of val) {
    const x = i % 16, y = (i / 16) | 0;
    const edge = !has(x - 1, y) || !has(x + 1, y) || !has(x, y - 1) || !has(x, y + 1);
    let col;
    if (k === 'glass') col = edge ? GLASS[0] : x < 8 ? GLASS[2] : GLASS[1];
    else if (k === 'cork') col = edge ? CORK[0] : x < 8 ? CORK[2] : CORK[1];
    else if (k === 'rune') col = tier >= 3 ? R[5] : R[4];
    else if (typeof k === 'string' && k.startsWith('rock:')) { const v = +k.slice(5) + (rand() < 0.18 ? (rand() < 0.5 ? -1 : 1) : 0); col = edge ? ROCK[0] : ROCK[Math.max(1, Math.min(5, Math.round(v)))]; }
    else {
      let v = k + (family === 'dust' && rand() < 0.35 ? (rand() < 0.5 ? -1.2 : 1.2) : 0);
      if (tier >= 3) v += 0.3;
      col = edge ? (tier >= 5 && (x + y) % 3 === 0 ? R[1] : R[0]) : R[Math.max(1, Math.min(5, Math.round(v)))];
    }
    c.set(x, y, col);
  }
  // 반짝임: 실루엣 왼쪽 위 안쪽의 가장 밝은 픽셀 근처 1~2px을 순백으로
  let best = null;
  for (const [i, k] of val) { if (typeof k !== 'number') continue; const x = i % 16, y = (i / 16) | 0; const s = k - (x + y) * 0.08; if (!best || s > best.s) best = { x, y, s }; }
  if (best && family !== 'dust') { c.set(best.x, best.y, SPEC); if (tier >= 2 && has(best.x + 1, best.y)) c.set(best.x + 1, best.y, R[5]); }
  // 등급 장식: 4~5등급은 실루엣 밖 대각선 위치에 4갈래 별 반짝임
  const star = (sx, sy) => { c.set(sx, sy, SPEC); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!has(sx + dx, sy + dy)) c.set(sx + dx, sy + dy, R[4]); };
  if (tier >= 4) star(13, 2);
  if (tier >= 5) star(2, 13);
  return c;
}

/** 등급 체계(색 = 이름 색, 램프 기준색). 일반적인 RPG 관례(흰·초록·파랑·보라·금·빨강) */
export const RARITY = [
  { key: 'common', ko: '일반', name: '#ffffff', mc: 'white' },
  { key: 'uncommon', ko: '고급', name: '#55ff55', mc: 'green' },
  { key: 'rare', ko: '희귀', name: '#5555ff', mc: 'blue' },
  { key: 'epic', ko: '영웅', name: '#aa00aa', mc: 'dark_purple' },
  { key: 'legendary', ko: '전설', name: '#ffaa00', mc: 'gold' },
];
