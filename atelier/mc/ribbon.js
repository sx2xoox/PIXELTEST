// 리본 궤적(ribbon trail) 이펙트 — 사용자 레퍼런스(굥 GYONG "매화검법", "소울 슬레이어" 썸네일)에서 배운 문법
//  · 넓게 칠한 초승달 한 장이 아니라 '가늘고 긴, 양끝이 뾰족한' 선 여러 가닥이 살짝 다른 반지름·각도로 겹친다
//  · 가닥 단면: 흰 심 → 분홍 → 원색 → 짙은 색 가장자리(빛나는 칼날의 잔상). 길이 방향: 머리가 가장 밝고 꼬리는 짙어지며 사라짐
//  · 시간: 머리가 빠르게 호를 그리고(앞 40%), 꼬리가 따라붙어 선이 짧아지며 가늘어져 사라진다(늘어지지 않는 깔끔한 끝)
//  · 꽃잎/파편 입자가 궤적의 머리에서 접선 방향으로 흩날린다
//  · 3D 감은 평면 여러 장을 서로 다른 기울기로 겹쳐서 만든다(타임라인 쪽에서)
import { PixelCanvas } from '../pixel.js';

export const SPEC = '#ffe4d0';
export const RAMPS = {
  blood: ['#2a0409', '#4f0a14', '#7d1020', '#b0182c', '#de2f45', '#f2708a', '#fbbccb', '#fff4f6'],
  // 액체 피(혈익 콘셉트): 빛이 아니라 피 — 가장 밝은 값도 흰색이 아니라 산호색, 크림은 겉면 반사선 전용
  liquid: ['#20040b', '#3a0715', '#590b1e', '#7e1027', '#a3162f', '#cc2238', '#ff4b46', '#ff9b84'],
  dark: ['#120206', '#220509', '#3a0a12', '#5a0d1a', '#7a1220', '#a01c30', '#c43a50', '#e07a8a'],
};
const rng = s => () => ((s = (s + 0x6d2b79f5) | 0), (((s ^ (s >>> 15)) * (1 | s)) >>> 0) / 4294967296);
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => B4[(y & 3) * 4 + (x & 3)] / 16;

/**
 * 원호 리본 궤적 프레임 생성.
 * start/sweep: 도(0 = 오른쪽, 90 = 아래, 화면 좌표). strands: [{ dr: 반지름 비율 오프셋, da: 시작각 지연(0~1), w: 굵기 배율, len: 길이 배율, tone: 밝기 배율 }]
 * spiral: 머리로 갈수록 반지름이 커지는 정도(나선 = 우아한 호)
 */
export function ribbonArc({ size = 128, frames = 7, start = 200, sweep = -220, radius = 0.36, width = 0.045, spiral = 0.12,
  strands = [{ dr: 0, da: 0, w: 1, len: 1, tone: 1 }, { dr: 0.07, da: 0.06, w: 0.55, len: 0.85, tone: 0.75 }, { dr: -0.06, da: 0.1, w: 0.4, len: 0.7, tone: 0.6 }],
  ramp = RAMPS.blood, petals = 10, seed = 1, petalRamp = null, liquid = false, wisp = false, particle: shape = 'petal' } = {}) {
  const R = rng(seed), cx = size / 2, cy = size / 2, Rr = size * radius, dir = Math.sign(sweep) || 1, sw = Math.abs(sweep);
  const pr = petalRamp ?? ramp;
  const P = Array.from({ length: petals }, () => ({ u: 0.25 + R() * 0.75, born: 0.08 + R() * 0.35, out: 0.08 + R() * 0.22, along: (R() - 0.3) * 0.25, rot: R() * Math.PI, spin: (R() - 0.5) * 6, len: 2.5 + R() * 3, tone: 0.55 + R() * 0.45 }));
  const out = [];
  for (let k = 0; k < frames; k++) {
    const p = frames === 1 ? 0.45 : k / (frames - 1);
    const c = new PixelCanvas(size);
    const head = 0.12 + 0.88 * smooth(0, 0.42, p);                        // 머리 진행(0~1)
    const tail = smooth(0.18, 1, p);                               // 꼬리 진행
    const energy = 1 - smooth(0.6, 1, p);                          // 마지막에 어두워지며 가늘어짐
    // 픽셀마다 가장 밝은 가닥을 고른다(가닥끼리 겹치면 밝은 쪽이 위)
    const best = new Float32Array(size * size).fill(-1);
    for (const s of strands) {
      const h = head * s.len - s.da * (1 - p), tl = tail * s.len - s.da * (1 - p) * 0.5 + 0.02;
      if (h <= tl) continue;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
        const a = (Math.atan2(dy, dx) * 180) / Math.PI;
        const u = (((((a - start) * dir) % 360) + 360) % 360) / sw; // 0 시작 → 1 끝
        if (u > h || u < tl) continue;
        const lu = (u - tl) / (h - tl);                            // 0 꼬리 → 1 머리
        let rr = Rr * (1 + s.dr + spiral * (u - 0.5));
        if (wisp) rr += Math.sin(u * 26 + p * 9 + s.dr * 40) * size * width * 0.9 * (1 - lu);   // 연기: 꼬리 쪽일수록 출렁임
        const prof = Math.sin(Math.PI * Math.min(1, lu * 1.08)) ** 0.55 * (0.35 + 0.65 * lu); // 양끝 뾰족, 머리 쪽 두꺼움
        const w = size * width * s.w * prof * (0.45 + 0.55 * energy);
        if (w < 0.35) continue;
        const sd = (r - rr) / w, d = Math.abs(sd);
        if (wisp && lu < 0.45 && bayer(x, y) > lu / 0.45) continue;                                 // 연기: 꼬리는 디더로 흩어짐                 // 0 심 → 1 가장자리(sd > 0 바깥쪽)
        if (d > 1) continue;
        if (liquid && lu < 0.32) {                                 // 액체: 꼬리가 방울로 끊어짐
          const arc = u * sw * Math.PI / 180 * rr, step = Math.max(3, w * 2.6), ph = ((arc % step) + step) % step - step / 2;
          const br = w * (0.35 + lu * 2);
          if (Math.hypot(ph, sd * w) > br) continue;
        }
        if (liquid && lu > 0.3 && sd > 0.25 && sd < 0.62 && s.tone > 0.9) { best[y * size + x] = 9; continue; } // 겉면 크림 반사선
        const I = Math.min(1, (1 - d * d) ** 0.6 * (0.45 + 0.75 * lu) * s.tone * (0.35 + 0.65 * energy) * 1.15) + (lu > 0.9 && d < 0.5 ? 0.2 : 0); // 심은 길게 흰빛
        const i = y * size + x;
        if (I > best[i]) best[i] = I;
      }
    }
    for (let i = 0; i < best.length; i++) {
      if (best[i] < 0) continue;
      const x = i % size, y = (i / size) | 0;
      if (best[i] === 9) { c.set(x, y, SPEC); continue; }
      const v = best[i] * (ramp.length - 0.01) + (bayer(x, y) - 0.5) * 0.6; // 단계 경계에만 살짝 디더
      if (v < 0.15) continue;
      c.set(x, y, ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(v)))]);
    }
    // 꽃잎: 머리가 지나간 자리에서 태어나 바깥·접선 방향으로 흩날리며 회전, 끝에는 작아짐
    for (const q of P) {
      if (p < q.born || q.u > head) continue;
      const t = (p - q.born) / (1 - q.born);
      const ang = ((start + dir * sw * q.u) * Math.PI) / 180;
      const tx = -Math.sin(ang) * dir, ty = Math.cos(ang) * dir;
      const rr = Rr * (1 + spiral * (q.u - 0.5)) + size * q.out * t;
      const px = cx + Math.cos(ang) * rr + tx * size * q.along * t, py = cy + Math.sin(ang) * rr + ty * size * q.along * t + size * 0.05 * t * t;
      particle(c, shape, px, py, Math.atan2(ty, tx) + (spins(shape) ? q.rot + q.spin * t : 0), q.len * (1 - 0.6 * t) * (size / 128), pr, q.tone * (1 - 0.5 * t), k);
    }
    out.push(c);
  }
  return out;
}

/** 모티프 입자: 'petal' 꽃잎 | 'drop' 핏방울(진행 방향으로 꼬리) | 'bat' 박쥐(날갯짓 2프레임) */
export const spins = shape => shape === 'petal' || Array.isArray(shape);
export function particle(c, shape, x, y, rot, len, ramp, tone, frame = 0) {
  if (Array.isArray(shape)) { const sp = shape[Math.floor(tone * 997) % shape.length]; return stamp(c, sp, x, y, rot, Math.max(0.4, len / 4)); } // 스프라이트 입자(집기 등): 회전하며 날아감
  if (shape === 'bat') return bat(c, x, y, Math.max(1, Math.round(len / 2.5)), frame);
  if (shape === 'drop') return drop(c, x, y, rot, len, ramp, tone);
  return petal(c, x, y, rot, len, ramp, tone);
}
/** 스프라이트를 회전·확대해 찍기(최근접 샘플링 → 픽셀 유지) */
export function stamp(c, sp, x, y, rot, scale = 1) {
  const cs = Math.cos(rot), sn = Math.sin(rot), R = Math.ceil(Math.hypot(sp.w, sp.h) * scale / 2) + 1;
  for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
    const u = (cs * i + sn * j) / scale + sp.w / 2, v = (-sn * i + cs * j) / scale + sp.h / 2;
    const col = sp.get(Math.floor(u), Math.floor(v));
    if (col) c.set(Math.round(x + i), Math.round(y + j), col);
  }
}
/** 핏방울: 둥근 머리 + 진행 반대쪽으로 가늘어지는 꼬리, 머리에 크림 반사점 */
export function drop(c, x, y, rot, len, ramp, tone = 1) {
  len *= 1.5; const ux = Math.cos(rot), uy = Math.sin(rot), r = Math.max(0.8, len * 0.38), L = Math.ceil(len + r + 1);
  for (let j = -L; j <= L; j++) for (let i = -L; i <= L; i++) {
    const a = i * ux + j * uy, b = -i * uy + j * ux;
    const inHead = Math.hypot(a, b) <= r, inTail = a < 0 && a > -len && Math.abs(b) <= r * (1 + a / len);
    if (!inHead && !inTail) continue;
    const lit = inHead ? (a - b) / (r * 2) + 0.5 : 0.2;
    c.set(Math.round(x + i), Math.round(y + j), ramp[Math.max(2, Math.min(ramp.length - 1, Math.round(3 + tone * 3 * lit)))]);
  }
  if (r >= 1.4) c.set(Math.round(x + ux * r * 0.3 - uy * r * 0.4), Math.round(y + uy * r * 0.3 + ux * r * 0.4), SPEC);
}
/** 박쥐: 작은 실루엣(몸 + 두 날개), 프레임마다 날개를 올리고 내림 */
export function bat(c, x, y, s = 1, frame = 0) {
  const up = frame % 2 === 0;
  // 몸 = 흑자색, 날개 막 = 와인, 날개 끝 = 진홍, 눈 = 주홍 → 어두운 배경에서도 읽히게
  const rows = up ? ['r.......r', 'ww.....ww', '.wwbobww.', '..wbbbw..', '....b....'] : ['.........', '....o....', 'rwwbbbwwr', 'ww.bbb.ww', 'r...b...r'];
  const col = { b: '#46324f', w: '#7e1027', r: '#cc2238', o: '#ff4b46' };
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '.') return; for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) c.set(Math.round(x + (i - 4) * s + a), Math.round(y + (j - 2) * s + b), col[ch]); }));
}

/** 꽃잎 하나: 물방울 모양(한쪽이 뾰족), 밝은 쪽에 흰 점 */
export function petal(c, x, y, rot, len, ramp, tone = 1) {
  if (len < 0.8) { c.set(Math.round(x), Math.round(y), ramp[Math.round(3 + tone * 2)]); return; }
  const ux = Math.cos(rot), uy = Math.sin(rot);
  const L = Math.ceil(len + 1);
  for (let j = -L; j <= L; j++) for (let i = -L; i <= L; i++) {
    const a = i * ux + j * uy, b = -i * uy + j * ux;            // a: 길이 방향, b: 폭
    const t = (a + len) / (2 * len); if (t < 0 || t > 1) continue;
    const half = len * 0.48 * Math.sin(Math.PI * t) ** 0.8 * (1 - 0.35 * t);
    if (Math.abs(b) > half + 0.15) continue;
    const lit = (1 - Math.abs(b) / (half + 0.5)) * 0.6 + (1 - t) * 0.4;
    const k = Math.round(2 + tone * (ramp.length - 4) * lit + (b < 0 ? 0.6 : -0.4));
    c.set(Math.round(x + i), Math.round(y + j), ramp[Math.max(1, Math.min(ramp.length - 1, k))]);
  }
}

/** 직선 찌르기/가르기 리본(X자 베기·관통): 가는 선이 한쪽에서 쭉 그어지고 꼬리부터 사라짐 */
export function ribbonLine({ size = 128, frames = 6, angle = -30, length = 0.95, width = 0.028, strands = [{ off: 0, w: 1, tone: 1 }, { off: 0.04, w: 0.45, tone: 0.7 }, { off: -0.035, w: 0.35, tone: 0.6 }], ramp = RAMPS.blood, petals = 8, seed = 3, particle: shape = 'petal' } = {}) {
  const R = rng(seed), cx = size / 2, cy = size / 2, ux = Math.cos((angle * Math.PI) / 180), uy = Math.sin((angle * Math.PI) / 180);
  const P = Array.from({ length: petals }, () => ({ u: R(), born: 0.1 + R() * 0.3, side: R() < 0.5 ? -1 : 1, out: 0.04 + R() * 0.16, rot: R() * 6, spin: (R() - 0.5) * 6, len: 2.5 + R() * 3, tone: 0.6 + R() * 0.4 }));
  const out = [];
  for (let k = 0; k < frames; k++) {
    const p = k / Math.max(1, frames - 1);
    const head = 0.15 + 0.85 * smooth(0, 0.3, p), tail = smooth(0.15, 1, p), energy = 1 - smooth(0.55, 1, p);
    const c = new PixelCanvas(size), best = new Float32Array(size * size).fill(-1);
    for (const s of strands) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const a = (dx * ux + dy * uy) / (size * length) + 0.5, b = -dx * uy + dy * ux - s.off * size;
      if (a > head || a < tail) continue;
      const lu = (a - tail) / Math.max(1e-3, head - tail);
      const w = size * width * s.w * Math.sin(Math.PI * Math.min(1, lu)) ** 0.5 * (0.4 + 0.6 * energy);
      const d = Math.abs(b) / Math.max(w, 1e-3); if (d > 1) continue;
      const I = Math.min(1, (1 - d * d) ** 0.6 * (0.45 + 0.75 * lu) * s.tone * (0.35 + 0.65 * energy) * 1.15);
      if (I > best[y * size + x]) best[y * size + x] = I;
    }
    for (let i = 0; i < best.length; i++) {
      if (best[i] < 0) continue;
      const x = i % size, y = (i / size) | 0, v = best[i] * (ramp.length - 0.01) + (bayer(x, y) - 0.5) * 0.6;
      if (v >= 0.15) c.set(x, y, ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(v)))]);
    }
    for (const q of P) {
      if (p < q.born || q.u > head) continue;
      const t = (p - q.born) / (1 - q.born), base = (q.u - 0.5) * size * length;
      particle(c, shape, cx + ux * base - uy * q.side * size * q.out * t, cy + uy * base + ux * q.side * size * q.out * t + size * 0.04 * t * t, spins(shape) ? q.rot + q.spin * t : Math.atan2(ux * q.side, -uy * q.side), q.len * (1 - 0.6 * t) * (size / 128), ramp, q.tone * (1 - 0.5 * t), k);
    }
    out.push(c);
  }
  return out;
}

/** 얇은 충격 고리(바닥용): 가는 흰-분홍 선 2겹이 퍼지며 가늘어짐 */
export function thinRing({ size = 128, frames = 6, ramp = RAMPS.blood, from = 0.08, to = 0.47 } = {}) {
  const out = [];
  for (let k = 0; k < frames; k++) {
    const p = k / Math.max(1, frames - 1), c = new PixelCanvas(size), e = 1 - p;
    for (const [lag, wmul, tone] of [[0, 1, 1], [0.12, 0.5, 0.65]]) {
      const r0 = size * (from + (to - from) * Math.max(0, smooth(0, 1, p) - lag)), w = size * 0.022 * wmul * (0.3 + e);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const d = Math.abs(Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) - r0) / w; if (d > 1) continue;
        const v = (1 - d * d) * tone * (0.3 + 0.7 * e) * (ramp.length - 0.01) + (bayer(x, y) - 0.5) * 0.6;
        if (v >= 0.2) c.set(x, y, ramp[Math.min(ramp.length - 1, Math.floor(v))]);
      }
    }
    out.push(c);
  }
  return out;
}

/** 꽃잎 폭발(빌보드용): 중심에서 사방으로 흩어지는 꽃잎 + 흰 섬광 점 */
export function petalBurst({ size = 64, frames = 7, count = 16, ramp = RAMPS.blood, seed = 5, particle: shape = 'petal', flash = true } = {}) {
  const R = rng(seed);
  const P = Array.from({ length: count }, () => ({ a: R() * Math.PI * 2, sp: 0.18 + R() * 0.3, rot: R() * 6, spin: (R() - 0.5) * 8, len: 2.2 + R() * 2.6, tone: 0.5 + R() * 0.5 }));
  const out = [];
  for (let k = 0; k < frames; k++) {
    const t = k / Math.max(1, frames - 1), c = new PixelCanvas(size), h = size / 2;
    if (flash && t < 0.35) { // 4갈래 가는 섬광(원판 대신)
      const L = size * 0.28 * (1 - t / 0.35);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const dx = Math.abs(x + 0.5 - h), dy = Math.abs(y + 0.5 - h), q = Math.min(dx, dy), m = Math.max(dx, dy);
        if (m > L || q > 1.6 * (1 - m / L) + 0.3) continue;
        c.set(x, y, ramp[m < L * 0.35 ? 7 : m < L * 0.7 ? 6 : 5]);
      }
    }
    const e = 1 - (1 - t) ** 2;
    for (const q of P) particle(c, shape, h + Math.cos(q.a) * size * q.sp * e, h + Math.sin(q.a) * size * q.sp * e + size * 0.08 * t * t, spins(shape) ? q.rot + q.spin * t : q.a, q.len * (1 - 0.55 * t) * Math.sqrt(size / 64), ramp, q.tone * (1 - 0.4 * t), k);
    out.push(c);
  }
  return out;
}
