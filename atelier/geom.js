// 형태 엔진: Claude가 좌표 몇 개만 정하면 매끄러운 곡선, 유기적 형태, 붓 획이 나오게 한다.

export function rng(seed = 1) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const f = n => +n.toFixed(2);

/** Catmull-Rom → 3차 베지어 path d. tension 0.5 = 표준. */
export function spline(points, { closed = false, tension = 0.5 } = {}) {
  const P = points;
  const n = P.length;
  if (n < 2) return '';
  if (n === 2) return `M${f(P[0][0])},${f(P[0][1])}L${f(P[1][0])},${f(P[1][1])}${closed ? 'Z' : ''}`;
  const get = i => (closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))]);
  const k = tension / 3;
  let d = `M${f(P[0][0])},${f(P[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}

/** 스플라인 위의 점을 촘촘히 샘플링한다(붓 획 외곽선 계산용). */
export function sampleSpline(points, { closed = false, tension = 0.5, perSeg = 16 } = {}) {
  const P = points, n = P.length;
  const get = i => (closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))]);
  const out = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let s = 0; s < perSeg; s++) {
      const t = s / perSeg, t2 = t * t, t3 = t2 * t;
      const a = tension;
      const pt = [0, 1].map(j =>
        p1[j] +
        (-a * p0[j] + a * p2[j]) * t +
        (2 * a * p0[j] + (a - 3) * p1[j] + (3 - 2 * a) * p2[j] - a * p3[j]) * t2 +
        (-a * p0[j] + (2 - a) * p1[j] + (a - 2) * p2[j] + a * p3[j]) * t3
      );
      out.push(pt);
    }
  }
  if (!closed) out.push(P[n - 1]);
  return out;
}

/**
 * 붓 획: 중심선과 굵기 → 끝이 가늘어지는 채워진 외곽선.
 * width 하나 또는 [시작, 중간, 끝] 굵기. taper 0~1은 양 끝을 얼마나 뾰족하게 할지.
 */
export function brush(points, { width = 8, taper = 0.8, tension = 0.5, jitter = 0, seed = 1 } = {}) {
  const pts = sampleSpline(points, { tension, perSeg: 20 });
  const R = rng(seed);
  const N = pts.length;
  const widthAt = t => {
    let w;
    if (Array.isArray(width)) {
      const [a, b, c] = width.length === 3 ? width : [width[0], (width[0] + width[1]) / 2, width[1]];
      w = t < 0.5 ? a + (b - a) * (t / 0.5) : b + (c - b) * ((t - 0.5) / 0.5);
    } else w = width;
    const ends = Math.min(1, Math.sin(Math.PI * t) / 0.6);
    return w * (1 - taper + taper * Math.max(0.05, ends)) * (1 + (R() - 0.5) * jitter);
  };
  const L = [], Rr = [];
  for (let i = 0; i < N; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const w = widthAt(i / (N - 1)) / 2;
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
    Rr.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  const outline = [...L, ...Rr.reverse()];
  return 'M' + outline.map(p => `${f(p[0])},${f(p[1])}`).join('L') + 'Z';
}

/** 유기적 덩어리(구름, 덤불, 바위, 얼룩). wobble = 들쭉날쭉한 정도. */
export function blob({ cx, cy, r, rx, ry, points = 8, wobble = 0.25, seed = 1, rotate = 0 }) {
  const R = rng(seed);
  const ax = rx ?? r, ay = ry ?? r;
  const pts = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2 + (rotate * Math.PI) / 180;
    const k = 1 + (R() * 2 - 1) * wobble;
    pts.push([cx + Math.cos(a) * ax * k, cy + Math.sin(a) * ay * k]);
  }
  return spline(pts, { closed: true });
}

export function polygon({ cx, cy, r, sides = 6, rotate = -90 }) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = ((rotate + (360 / sides) * i) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return 'M' + pts.map(p => `${f(p[0])},${f(p[1])}`).join('L') + 'Z';
}

export function star({ cx, cy, r, inner = 0.45, points = 5, rotate = -90 }) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = ((rotate + (180 / points) * i) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return 'M' + pts.map(p => `${f(p[0])},${f(p[1])}`).join('L') + 'Z';
}

/** 아이콘에 쓰는 superellipse(스쿼클). n이 4~5 근처면 iOS 아이콘 모양에 가깝다. */
export function squircle({ x, y, w, h, n = 5 }) {
  const cx = x + w / 2, cy = y + h / 2, a = w / 2, b = h / 2;
  const pts = [];
  for (let i = 0; i < 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    pts.push([cx + a * Math.sign(c) * Math.abs(c) ** (2 / n), cy + b * Math.sign(s) * Math.abs(s) ** (2 / n)]);
  }
  return 'M' + pts.map(p => `${f(p[0])},${f(p[1])}`).join('L') + 'Z';
}

/** 지평선, 산, 파도 같은 능선 띠. 아래쪽(bottom)까지 채운다. */
export function ridge({ x = 0, w, y, bottom, amp = 40, freq = 3, octaves = 3, seed = 1, steps = 48 }) {
  const R = rng(seed);
  const phases = Array.from({ length: octaves }, () => R() * Math.PI * 2);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let v = 0, a = 1, fr = freq, norm = 0;
    for (let o = 0; o < octaves; o++) {
      v += Math.sin(t * fr * Math.PI * 2 + phases[o]) * a;
      norm += a; a *= 0.5; fr *= 2.1;
    }
    pts.push([x + t * w, y + (v / norm) * amp]);
  }
  return spline(pts) + `L${f(x + w)},${f(bottom)}L${f(x)},${f(bottom)}Z`;
}
