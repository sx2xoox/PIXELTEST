// RPG VFX 생성기 — 프레임 스프라이트(파티클 재텍스처·디스플레이 엔티티 아이템 모델·반복 애니메이션 텍스처용)
//
// 검증된 전제(바닐라 클라이언트 jar 1.21.4 / 26.3에서 직접 확인):
//  - 파티클 정의: assets/<ns>/particles/<id>.json = { "textures": ["ns:name_0", ...] }
//    sweep_attack = 32×32 × 8프레임, dust 등 25종 파티클이 generic_0..7(8×8)을 공유 → generic 교체 금지
//  - 파티클 텍스처도 .png.mcmeta 애니메이션 지원(vibration.png.mcmeta)
//  - 아이템 모델 정의(items/*.json)의 range_dispatch 속성과 tint 소스에 "custom_model_data"가 등록되어 있음
//    → 흑백 텍스처 1장을 서버가 colors로 원소별 색을 입히고, floats로 프레임을 고른다
// 모든 생성기는 기본이 "틴트용 흑백"(흰색 = 최대 밝기, 틴트는 곱연산). 투명 픽셀 RGB는 이웃 색으로 채워 밉맵 번짐을 막는다.
import { PixelCanvas } from '../pixel.js';
import { rng } from '../geom.js';
import { hexToRgb, rgbToHex } from '../color.js';

export const GRAY = ['#5c5c5c', '#8f8f8f', '#c4c4c4', '#ebebeb', '#ffffff']; // 어둠 → 밝음

/** 장(field) → 픽셀: 4×4 슈퍼샘플 평균 세기를 단계로 양자화(안티앨리어싱 없는 또렷한 픽셀) */
export function fieldToCanvas(size, field, { ramp = GRAY, cut = 0.14, ss = 4, alpha = 'cutout' } = {}) {
  const c = new PixelCanvas(size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let v = 0;
      for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) v += Math.max(0, Math.min(1, field(x + (i + 0.5) / ss, y + (j + 0.5) / ss)));
      v /= ss * ss;
      if (v < cut) continue;
      const t = (v - cut) / (1 - cut);
      const col = ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))];
      if (alpha === 'translucent') c.set(x, y, col + Math.round(80 + 175 * Math.min(1, t * 1.3)).toString(16).padStart(2, '0'));
      else c.set(x, y, col);
    }
  return bleedRGB(c);
}

/** 투명 픽셀의 RGB를 가장 가까운 불투명 이웃 색으로 채운다(알파 0 유지) — 밉맵/필터링 시 검은 테두리 방지 */
export function bleedRGB(c) {
  const d = c.data, w = c.w, h = c.h;
  for (let pass = 0; pass < 2; pass++) {
    const src = new Uint8ClampedArray(d);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (src[i + 3] !== 0) continue;
        let n = 0, r = 0, g = 0, b = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const k = (ny * w + nx) * 4;
          if (src[k + 3] === 0 && !(src[k] | src[k + 1] | src[k + 2])) continue;
          r += src[k]; g += src[k + 1]; b += src[k + 2]; n++;
        }
        if (n) { d[i] = r / n; d[i + 1] = g / n; d[i + 2] = b / n; }
      }
  }
  return c;
}

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/**
 * 베기 궤적(반달 검기). 프레임마다 호가 그려지며 펼쳐지고 끝부분부터 사라진다.
 * 굵기: 머리(최근) 굵고 꼬리 가늘게, 안쪽 가장자리가 가장 밝은 '칼날 심'.
 */
export function slashArc({ size = 32, frames = 6, start = -150, sweep = 200, radius = 0.4, width = 0.16 } = {}) {
  const out = [];
  const R = size * radius, cx = size / 2, cy = size / 2;
  for (let k = 0; k < frames; k++) {
    const p = frames === 1 ? 0.6 : k / (frames - 1);
    const head = start + sweep * Math.min(1, 0.25 + p * 1.1);      // 칼끝 진행
    const tail = start + sweep * Math.max(0, (p - 0.45) * 1.6);       // 뒤에서부터 소멸
    const fade = 1 - smooth(0.7, 1, p);
    out.push(fieldToCanvas(size, (x, y) => {
      const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
      const a = (Math.atan2(dy, dx) * 180) / Math.PI;
      const fromTail = ((a - tail + 720) % 360), span = ((head - tail + 720) % 360);
      if (fromTail > span) return 0;
      const u = span ? fromTail / span : 0;                           // 0 꼬리 → 1 머리
      const w = size * width * (0.25 + 0.75 * u ** 0.7);             // 머리로 갈수록 굵게
      const off = r - R;
      if (off < -w * 0.35 || off > w) return 0;
      const core = 1 - Math.abs(off - w * 0.05) / w;                  // 안쪽 가장자리가 가장 밝음
      return Math.max(0, core) * (0.35 + 0.65 * u) * fade * 1.25;
    }));
  }
  return out;
}

/** 충격파 링: 반지름이 커지면서 얇아지고 흐려진다 */
export function shockRing({ size = 32, frames = 6, from = 0.08, to = 0.46, width = 0.12 } = {}) {
  const out = [];
  for (let k = 0; k < frames; k++) {
    const p = k / Math.max(1, frames - 1);
    const r = size * (from + (to - from) * (1 - (1 - p) ** 2)); // ease-out
    const w = size * width * (1 - 0.7 * p);
    const fade = 1 - smooth(0.55, 1, p);
    out.push(fieldToCanvas(size, (x, y) => {
      const d = Math.abs(Math.hypot(x - size / 2, y - size / 2) - r);
      return (1 - d / w) * fade * 1.2;
    }));
  }
  return out;
}

/** 타격 스파크: 4방향 광선 + 대각 짧은 광선, 빠르게 수축 */
export function hitSpark({ size = 16, frames = 4 } = {}) {
  const out = [];
  for (let k = 0; k < frames; k++) {
    const p = k / Math.max(1, frames - 1);
    const L = size * (0.48 - 0.3 * p), Ld = L * 0.55, t = 0.9 - 0.4 * p;
    out.push(fieldToCanvas(size, (x, y) => {
      const dx = Math.abs(x - size / 2), dy = Math.abs(y - size / 2);
      const axis = Math.max(dx < t ? 1 - dy / L : 0, dy < t ? 1 - dx / L : 0);
      const diag = Math.abs(dx - dy) < t * 0.8 ? 1 - Math.hypot(dx, dy) / Ld : 0;
      const core = 1 - Math.hypot(dx, dy) / (size * 0.12);
      return Math.max(axis, diag * 0.8, core) * (1 - 0.35 * p) * 1.2;
    }, { cut: 0.2 }));
  }
  return out;
}

/** 마법진: 동심원 + n각 별 + 룬 띠 + 눈금. frames>1이면 룬 띠가 회전하는 반복 애니메이션(대칭 덕에 끊김 없이 이어짐) */
export function magicCircle({ size = 64, folds = 6, frames = 1, seed = 3, runes = 12 } = {}) {
  const R = rng(seed);
  // 룬: 3×5 획 조합(시드 고정)
  const glyphs = Array.from({ length: runes }, () => {
    const g = [];
    const strokes = 2 + Math.floor(R() * 2);
    for (let s = 0; s < strokes; s++) {
      const vertical = R() < 0.5, pos = Math.floor(R() * 3), from = Math.floor(R() * 3), len = 2 + Math.floor(R() * 3);
      for (let i = 0; i < len; i++) g.push(vertical ? [pos, Math.min(4, from + i)] : [Math.min(2, from + i - 1 < 0 ? 0 : from + i - 1), Math.min(4, pos + 1)]);
    }
    return g;
  });
  const out = [];
  const c0 = size / 2;
  for (let k = 0; k < frames; k++) {
    const rot = (k / frames) * (2 * Math.PI / runes); // 룬 하나 간격만큼 돌면 다시 같은 그림 → 반복 이음 없음
    const base = fieldToCanvas(size, (x, y) => {
      const dx = x - c0, dy = y - c0, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const ring = (rr, w) => 1 - Math.abs(r - rr) / w;
      let v = Math.max(ring(size * 0.47, 0.9), ring(size * 0.4, 0.7), ring(size * 0.24, 0.7) * 0.85);
      // n각 별: 꼭짓점 사이를 잇는 직선
      for (let i = 0; i < folds; i++) {
        const a1 = (i / folds) * 2 * Math.PI - Math.PI / 2, a2 = ((i + 2) / folds) * 2 * Math.PI - Math.PI / 2;
        const p1 = [Math.cos(a1) * size * 0.4, Math.sin(a1) * size * 0.4], p2 = [Math.cos(a2) * size * 0.4, Math.sin(a2) * size * 0.4];
        const ex = p2[0] - p1[0], ey = p2[1] - p1[1], L = Math.hypot(ex, ey);
        const tproj = ((dx - p1[0]) * ex + (dy - p1[1]) * ey) / (L * L);
        if (tproj > 0 && tproj < 1) v = Math.max(v, (1 - Math.abs(((dx - p1[0]) * ey - (dy - p1[1]) * ex) / L) / 0.6) * 0.75);
      }
      // 바깥 띠 눈금
      const tick = Math.abs(angDiff(a * 24, 0)) < 0.35 && r > size * 0.42 && r < size * 0.46 ? 0.7 : 0;
      return Math.max(v, tick);
    });
    // 룬: 두 원 사이 띠에 배치(회전)
    for (let i = 0; i < runes; i++) {
      const a = (i / runes) * 2 * Math.PI + rot;
      const gx = Math.round(c0 + Math.cos(a) * size * 0.435 - 1), gy = Math.round(c0 + Math.sin(a) * size * 0.435 - 2);
      if (size >= 64) for (const [px, py] of glyphs[i]) base.set(gx + px, gy + py, GRAY[3]);
    }
    // 중심 표식
    base.set(c0, c0, '#ffffff'); base.set(c0 - 1, c0, GRAY[3]); base.set(c0, c0 - 1, GRAY[3]);
    out.push(bleedRGB(base));
  }
  return out;
}

/**
 * 세로 빛기둥(루트 빔/치유 기둥). v2: 사인 변조가 폭까지 출렁여 '꽃병'처럼 보였음 →
 * 폭은 고정(밝은 심 + 은은한 가장자리), 아래가 진하고 위로 갈수록 흐려지며, 흐름은 위로 올라가는 빛 입자로만 표현.
 * 입자는 프레임마다 h/frames씩 올라가 마지막 프레임 다음이 첫 프레임과 이어진다(끊김 없는 반복).
 */
export function beam({ w = 16, h = 64, frames = 4, motes = 7, seed = 2 } = {}) {
  const R = rng(seed);
  const pts = Array.from({ length: motes }, () => [1 + Math.floor(R() * (w - 2)), Math.floor(R() * h), R() < 0.4 ? 2 : 1]);
  const out = [];
  for (let k = 0; k < frames; k++) {
    const c = new PixelCanvas(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const d = Math.abs(x + 0.5 - w / 2) / (w / 2);                 // 0 중심 → 1 가장자리
        const vfade = 0.25 + 0.75 * (y / (h - 1)) ** 1.2;               // 위(0)는 흐리게, 아래는 진하게
        const glow = (1 - d) ** 1.6 * vfade;
        const core = d < 0.14 ? 0.35 * vfade + 0.6 : 0;
        const v = Math.max(glow, core * vfade);
        if (v < 0.16) continue;
        c.set(x, y, GRAY[Math.min(4, Math.floor(v * 5))]);
      }
    for (const [x, y0, s] of pts) {
      const y = ((y0 - Math.round((k * h) / frames)) % h + h) % h;     // 위로 이동
      for (let i = 0; i < s; i++) c.set(x, (y + i) % h, '#ffffff');
    }
    out.push(bleedRGB(c));
  }
  return out;
}

/** 프레임 → 세로 스트립(.png.mcmeta 반복 애니메이션용) */
export function strip(frames) {
  const w = frames[0].w, h = frames[0].h;
  if (frames.some(f => f.w !== w || f.h !== h)) throw new Error('모든 프레임은 같은 크기여야 함');
  const c = new PixelCanvas(w, h * frames.length);
  frames.forEach((f, i) => c.paste(f, 0, i * h));
  return c;
}
export const mcmeta = ({ frametime = 2, interpolate = false } = {}) => ({ animation: { frametime, interpolate } });

/** 틴트 미리보기: 흑백 × 색(게임의 곱연산과 동일) */
export function tint(c, hex) {
  const [tr, tg, tb] = hexToRgb(hex);
  const o = new PixelCanvas(c.w, c.h);
  o.data.set(c.data);
  for (let i = 0; i < o.data.length; i += 4) { o.data[i] *= tr; o.data[i + 1] *= tg; o.data[i + 2] *= tb; }
  return o;
}
export const ELEMENTS = { fire: '#ff8a3c', ice: '#8fd8ff', poison: '#8be36a', holy: '#ffe9a0', shadow: '#a77bff', blood: '#ff4a5a' };
export const intColor = hex => parseInt(hex.slice(1), 16);
void rgbToHex;

/** VFX 프레임 검사 */
export function critiqueFrames(name, frames, { use = 'item' } = {}) {
  const issues = [];
  const add = (severity, msg, fix = '') => issues.push({ severity, msg, fix });
  const { w, h } = frames[0];
  const pow2 = v => (v & (v - 1)) === 0;
  if (!pow2(w) || !pow2(h)) add('warn', `${name}: ${w}×${h} — 2의 거듭제곱이 아님`, '아틀라스/밉맵 안정성을 위해 8·16·32·64…');
  if (frames.some(f => f.w !== w || f.h !== h)) add('error', `${name}: 프레임 크기 불일치`);
  const cover = frames.map(f => { let n = 0; f.each((x, y) => { if (f.alpha(x, y) > 0) n++; }); return n / (w * h); });
  if (cover.some(v => v === 0) && use !== 'particle') add('info', `${name}: 빈 프레임 있음`, '일회성 연출의 마지막 프레임이면 정상');
  if (frames.length > 1) {
    const diffs = frames.slice(1).map((f, i) => { let d = 0; f.each((x, y) => { if ((f.alpha(x, y) > 0) !== (frames[i].alpha(x, y) > 0)) d++; }); return d / (w * h); });
    if (Math.max(...diffs) > 0.35) add('warn', `${name}: 인접 프레임 변화가 큼(${(Math.max(...diffs) * 100).toFixed(0)}%) → 깜빡임처럼 보일 수 있음`, '프레임 수를 늘리거나 변화량을 줄이세요.');
  }
  if (use === 'particle' && w > 32) add('info', `${name}: 파티클 ${w}px — 바닐라는 8~32px`, '화면 크기는 텍스처가 아니라 파티클 코드가 정한다.');
  return issues;
}

// ---------------------------------------------------------------------------
// 피(액체) 계열 이펙트
// ---------------------------------------------------------------------------
/** 피 베기: slashArc + 바깥 가장자리 톱니(찢김) + 꼬리에서 떨어지는 방울. 방향(sweep 부호)으로 1·2타를 구분한다 */
export function bloodSlash({ size = 32, frames = 6, start = -150, sweep = 200, radius = 0.4, width = 0.17, seed = 1, drops = 6 } = {}) {
  const R = rng(seed);
  const jag = Array.from({ length: 24 }, () => 0.75 + R() * 0.5);
  const dr = Array.from({ length: drops }, () => [R(), 0.6 + R() * 0.8]);
  const out = [];
  const cx = size / 2, cy = size / 2, Rr = size * radius;
  const dir = Math.sign(sweep) || 1, sw = Math.abs(sweep);
  for (let k = 0; k < frames; k++) {
    const p = frames === 1 ? 0.6 : k / (frames - 1);
    const headU = Math.min(1, 0.2 + p * 1.15), tailU = Math.max(0, (p - 0.4) * 1.7), fade = 1 - smooth(0.72, 1, p);
    const c = fieldToCanvas(size, (x, y) => {
      const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
      let a = (Math.atan2(dy, dx) * 180) / Math.PI;
      const rel = (((a - start) * dir) % 360 + 360) % 360;   // 시작각부터 진행 방향으로 잰 각도
      const u = rel / sw;
      if (u < tailU || u > headU) return 0;
      const lu = (u - tailU) / Math.max(1e-3, headU - tailU);
      const w = size * width * (0.2 + 0.8 * lu ** 0.6) * jag[Math.floor(u * 23)];
      const off = r - Rr;
      if (off < -w * 0.3 || off > w) return 0;
      return Math.max(0, 1 - Math.abs(off - w * 0.08) / w) * (0.4 + 0.6 * lu) * fade * 1.3;
    });
    // 꼬리 쪽에서 아래로 떨어지는 방울(중력)
    if (p > 0.3) for (const [ru, sp] of dr) {
      const ang = ((start + dir * sw * Math.max(tailU, ru * headU)) * Math.PI) / 180;
      const x = Math.round(cx + Math.cos(ang) * Rr), y = Math.round(cy + Math.sin(ang) * Rr + (p - 0.3) * size * 0.35 * sp);
      if (y < size && p < 0.98) { c.set(x, y, GRAY[3]); if (sp > 1) c.set(x, y - 1, GRAY[2]); }
    }
    out.push(bleedRGB(c));
  }
  return out;
}

/** 핏방울 비산: 중심에서 방사형으로 튀고 아래로 떨어지며 작아진다 */
export function bloodSplatter({ size = 32, frames = 6, count = 14, seed = 4 } = {}) {
  const R = rng(seed);
  const ps = Array.from({ length: count }, () => { const a = R() * Math.PI * 2; return { a, v: 0.25 + R() * 0.5, s: 1 + Math.floor(R() * 3) }; });
  const out = [];
  for (let k = 0; k < frames; k++) {
    const p = k / Math.max(1, frames - 1);
    const c = new PixelCanvas(size);
    // 중심 폭발(초반)
    if (p < 0.45) { const rr = size * (0.1 + p * 0.35); for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2); if (d < rr) c.set(x, y, GRAY[d < rr * 0.5 ? 4 : 3 - Math.floor(p * 4)] ?? GRAY[1]); } }
    for (const q of ps) {
      const d = q.v * size * 0.5 * (1 - (1 - p) ** 2);
      const x = Math.round(size / 2 + Math.cos(q.a) * d), y = Math.round(size / 2 + Math.sin(q.a) * d + p * p * size * 0.25);
      const s = Math.max(1, Math.round(q.s * (1 - p * 0.7)));
      if (p < 0.97) c.rect(x, y, s, s, GRAY[s > 1 ? 4 : 3]);
    }
    out.push(bleedRGB(c));
  }
  return out;
}

/** 혈창: 바닥에서 솟아오르는 뾰족한 가시(세로 스프라이트). 솟음 → 정지 → 가라앉음 */
export function bloodSpike({ w = 16, h = 32, frames = 6 } = {}) {
  const out = [];
  for (let k = 0; k < frames; k++) {
    const p = k / Math.max(1, frames - 1);
    const rise = p < 0.35 ? p / 0.35 : p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    const top = h - Math.round(h * 0.95 * rise);
    out.push((() => {
      const c = new PixelCanvas(w, h);
      for (let y = top; y < h; y++) {
        const t = (y - top) / Math.max(1, h - top);          // 0 끝 → 1 바닥
        const half = (w / 2) * (0.12 + 0.88 * t ** 0.9);
        for (let x = 0; x < w; x++) {
          const d = Math.abs(x + 0.5 - w / 2);
          if (d > half) continue;
          const edge = d / half;
          const v = edge > 0.75 ? 1 : t < 0.15 ? 4 : x + 0.5 < w / 2 ? 3 : 2;  // 왼쪽(빛)이 밝고 가장자리 어둡게
          c.set(x, y, GRAY[v]);
        }
      }
      return bleedRGB(c);
    })());
  }
  return out;
}

/** 피의 소용돌이(반복): 나선 팔 n개가 회전. 회전량이 팔 간격과 같아 끊김 없이 반복된다 */
export function bloodVortex({ size = 64, frames = 8, arms = 3, seed = 2 } = {}) {
  const out = [];
  for (let k = 0; k < frames; k++) {
    const rot = (k / frames) * (2 * Math.PI / arms);
    out.push(fieldToCanvas(size, (x, y) => {
      const dx = x - size / 2, dy = y - size / 2, r = Math.hypot(dx, dy) / (size / 2);
      if (r > 1) return 0;
      const a = Math.atan2(dy, dx) - rot + r * 4.2;
      const arm = Math.cos(a * arms) * 0.5 + 0.5;
      return arm ** 3 * (1 - r ** 2) * 1.6 + (r < 0.15 ? 0.9 : 0);
    }));
  }
  void seed;
  return out;
}
