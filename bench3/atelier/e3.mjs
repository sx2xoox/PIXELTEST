// E3 — 새벽 로스터리 / DAWN ROASTERY 로고 시스템 시트 (1600×1000)
//
// 콘셉트 "갈라진 원두 = 지평선의 해":
//   원두를 가르는 골(crease)이 그대로 지평선이 되고, 그 위로 반원의 해가 떠오른다.
//   해를 감싸는 틈(음각 링)이 두 번째 형상 — 새벽빛의 테두리 — 을 만든다.
//   요소 3개(하늘 조각·해·땅 조각), 색 2개(에스프레소 + 새벽 앰버), 장식 없는 정직한 기하.
// 구성 체계: 24단위 격자(U = 1/24), 타원 11U×9U(1.22:1) + 동심원 r 6U / 7.5U, 틈 1.5U(= 1/16 → 16px에서 정확히 1px).
// 서체: 한글 고운바탕 Bold(붓맛이 남은 부드러운 명조 = 손의 온기) + 라틴 Fraunces SemiBold 대문자(따뜻한 소프트 세리프).
//   두 줄은 잉크 폭을 실측해 같은 폭으로 맞춘다(영문 자간으로 양끝 맞춤). 시트 주석도 같은 두 서체만 쓴다.
//
// 라운드 0(스케치, sk/sketch.png): A 갈라진 원두=해 / B 성수동 톱니 지붕 / C D 모노그램 / D ㅅ 산.
//   B는 장소성이 좋지만 원두가 없고, C는 평범, D는 사람처럼 읽힘. A가 16px 실루엣이 가장 단단하고(타원 1덩어리)
//   원두·해돋이·지평선을 하나의 음각 아이디어로 묶어서 선택. 변형 4종(sk/var.png) 중 큰 해(r 6U)를 채택.
// 라운드 1: 전체 시트 첫 배치 — 구성 격자 패널, 가로 조합형, 한/영 워드마크, 어두운 바탕, 단색, 파비콘(실제 16/32px 래스터를 픽셀 확대), 팔레트·여백.
// (이후 라운드 기록은 아래에 이어서)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));

// ---------- 색 ----------
export const C = {
  espresso: '#2a1911', // 가장 어두운 색 L≈12 (순검정 금지)
  amber: '#e2762b',    // 새벽 앰버 — 해에만
  cream: '#f4ece0',    // 귀리 크림 바탕
  panel: '#ece2d3',
  line: '#d9cab5',
  mute: '#8b7260',
  dark: '#23150e',
  darkLine: '#4a3326',
};
const KO = 'Gowun Batang', EN = 'Fraunces';
const f2 = n => +n.toFixed(2);

// ---------- 심볼 (240단위 상자) ----------
export const MASTER = { cx: 120, cy: 120, rx: 110, ry: 90, yT: 130, g: 15, rs: 60 };
export function markPaths(p = MASTER) {
  const { cx, cy, rx, ry, yT, g, rs } = p;
  const yB = yT + g;
  const xe = y => rx * Math.sqrt(1 - ((y - cy) / ry) ** 2);
  return {
    sky: `M${f2(cx - xe(yT))},${yT} A${rx},${ry} 0 ${yT > cy ? 1 : 0} 1 ${f2(cx + xe(yT))},${yT} L${cx + rs + g},${yT} A${rs + g},${rs + g} 0 0 0 ${cx - rs - g},${yT} Z`,
    sun: `M${cx - rs},${yT} A${rs},${rs} 0 0 1 ${cx + rs},${yT} Z`,
    land: `M${f2(cx + xe(yB))},${yB} A${rx},${ry} 0 ${yB > cy ? 0 : 1} 1 ${f2(cx - xe(yB))},${yB} Z`,
  };
}
// 심볼 잉크 상자(240 상자 안): x 10..230, y 30..210
const INK = { x: 10, y: 30, w: 220, h: 180 };

/** 잉크 기준으로 배치: (x,y) = 잉크 왼쪽 위, h = 잉크 높이 */
export function mark(x, y, h, ink = C.espresso, sun = C.amber, p = MASTER) {
  const k = h / INK.h;
  const P = markPaths(p);
  return { type: 'group', transform: `translate(${f2(x - INK.x * k)},${f2(y - INK.y * k)}) scale(${f2(k * 1000) / 1000})`, children: [
    { type: 'path', d: P.sky, fill: ink }, { type: 'path', d: P.land, fill: ink }, { type: 'path', d: P.sun, fill: sun },
  ] };
}
const markW = h => (h * INK.w) / INK.h;

// ---------- 워드마크 (실측: sk/measure.mjs, 100px 기준) ----------
// 고운바탕 700 '새벽 로스터리' 자간 -0.02em: 잉크 폭 5.44, 위 0.88, 아래 0.10
// Fraunces 600 'DAWN ROASTERY' 자간 0: 잉크 왼쪽 0.05, 오른쪽 9.2145 (13자 → 12 간격), 대문자 0.70(O 0.73)
const KOW = 5.44, KOA = 0.88, KOD = 0.10;
const ENL = 0.05, ENR = 9.2145, ENA = 0.70;

/** 한글 워드마크: (x = 잉크 왼쪽, base = 베이스라인) */
const koText = (x, base, K, fill, align = 'left') => ({ type: 'text', x: align === 'center' ? x : x, y: base, text: '새벽 로스터리', font: KO, weight: 700, size: K, letterSpacing: f2(-0.02 * K), fill, align });
/** 영문 워드마크를 잉크 폭 W로 양끝 맞춤 */
function enText(x, base, E, W, fill, align = 'left') {
  const ls = (W - (ENR - ENL) * E) / 12;
  // SVG는 마지막 글자 뒤에도 자간을 넣는다 → 가운데 정렬이면 ls/2만큼 보정
  return { type: 'text', x: f2(align === 'center' ? x + ls / 2 : x - ENL * E), y: base, text: 'DAWN ROASTERY', font: EN, weight: 600, size: E, letterSpacing: f2(ls), fill, align };
}

/** 가로 조합형. K = 한글 크기. 반환: 노드 + 폭/높이 */
export function lockupH(x, y, K, col = {}) {
  const ink = col.ink ?? C.espresso, sun = col.sun ?? C.amber, text = col.text ?? ink;
  const E = 0.48 * K, W = KOW * K;
  const gapKE = 0.3 * K;
  const blockH = (KOA + KOD) * K + gapKE + ENA * E;
  const h = blockH * 1.06;               // 심볼은 글 덩어리보다 6% 크게(타원은 작아 보인다)
  const mw = markW(h), gap = 0.36 * h;
  const tx = x + mw + gap, ty = y + (h - blockH) / 2;
  const kb = ty + KOA * K, eb = kb + KOD * K + gapKE + ENA * E;
  return { w: mw + gap + W, h, node: { type: 'group', children: [
    mark(x, y, h, ink, sun),
    koText(tx, kb, K, text),
    enText(tx, eb, E, W, text),
  ] } };
}

/** 세로 조합형(가운데 축) */
export function lockupV(cx, y, K, col = {}) {
  const ink = col.ink ?? C.espresso, sun = col.sun ?? C.amber, text = col.text ?? ink;
  const E = 0.48 * K, W = KOW * K;
  const h = 1.05 * W * INK.h / INK.w * 0.62;
  const mw = markW(h);
  const kb = y + h + 0.42 * K + KOA * K;
  const eb = kb + KOD * K + 0.3 * K + ENA * E;
  return { h: eb - y, node: { type: 'group', children: [
    mark(cx - mw / 2, y, h, ink, sun),
    koText(cx - W / 2, kb, K, text),
    enText(cx - W / 2, eb, E, W, text),
  ] } };
}

// ---------- 시트 부품 ----------
const label = (x, y, num, ko, en, dark = false) => [
  { type: 'text', x, y, text: num, font: EN, weight: 600, size: 13, fill: dark ? C.amber : C.amber, letterSpacing: 1 },
  { type: 'text', x: x + 26, y, text: en, font: EN, weight: 600, size: 12, fill: dark ? '#cdbba8' : C.mute, letterSpacing: 1.6 },
  { type: 'text', x: x + 26 + en.length * 9.6 + 8, y, text: ko, font: KO, weight: 700, size: 13, fill: dark ? '#cdbba8' : C.mute },
];
const panel = (x, y, w, h, fill = C.panel) => ({ type: 'rect', x, y, w, h, r: 4, fill });

function favicon(file, x, y, cell, grid = true) {
  const fp = path.join(HERE, 'out', file);
  if (!fs.existsSync(fp)) return [];
  const { w, h, px } = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const out = [{ type: 'rect', x, y, w: w * cell, h: h * cell, fill: '#ffffff' }];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const p = px[j * w + i];
    if (p && p[1] > 0.02) out.push({ type: 'rect', x: x + i * cell, y: y + j * cell, w: cell, h: cell, fill: p[0], opacity: +p[1].toFixed(3) });
  }
  if (grid) {
    for (let i = 1; i < w; i++) out.push({ type: 'rect', x: x + i * cell - 0.5, y, w: 1, h: h * cell, fill: '#ffffff', opacity: 0.35 });
    for (let j = 1; j < h; j++) out.push({ type: 'rect', x, y: y + j * cell - 0.5, w: w * cell, h: 1, fill: '#ffffff', opacity: 0.35 });
  }
  out.push({ type: 'rect', x, y, w: w * cell, h: h * cell, fill: 'none', stroke: { color: C.line, width: 1 } });
  return out;
}

// ---------- 구성 격자 패널 ----------
function construction(px, py, S) {
  const U = S / 24, k = S / 240;
  const X = v => px + v * k, Y = v => py + v * k;
  const M = MASTER;
  const out = [];
  for (let i = 0; i <= 24; i++) {
    const major = i % 6 === 0;
    out.push({ type: 'rect', x: f2(px + i * U - 0.5), y: py, w: 1, h: S, fill: major ? '#cdb9a0' : '#dfd2bf' });
    out.push({ type: 'rect', x: px, y: f2(py + i * U - 0.5), w: S, h: 1, fill: major ? '#cdb9a0' : '#dfd2bf' });
  }
  out.push(mark(X(INK.x), Y(INK.y), INK.h * k));
  const guide = { color: C.cream, width: 1.2, dash: [4, 4] };
  const g2 = { color: C.amber, width: 1.2 };
  out.push(
    { type: 'ellipse', cx: X(M.cx), cy: Y(M.cy), rx: M.rx * k, ry: M.ry * k, fill: 'none', stroke: g2 },
    { type: 'circle', cx: X(M.cx), cy: Y(M.yT), r: (M.rs + M.g) * k, fill: 'none', stroke: guide },
    { type: 'circle', cx: X(M.cx), cy: Y(M.yT), r: M.rs * k, fill: 'none', stroke: { ...guide, color: C.espresso } },
    { type: 'rect', x: X(-6), y: Y(M.yT) - 0.6, w: (252) * k, h: 1.2, fill: C.amber, opacity: 0.9 },
    { type: 'rect', x: X(M.cx) - 0.6, y: Y(-6), w: 1.2, h: 252 * k, fill: C.amber, opacity: 0.5 },
    { type: 'circle', cx: X(M.cx), cy: Y(M.yT), r: 3.5, fill: C.amber },
  );
  // 치수 주석
  const dim = (t, x, y, a = 'left') => ({ type: 'text', x, y, text: t, font: EN, weight: 600, size: 12, fill: C.mute, align: a, letterSpacing: 0.4 });
  out.push(
    dim('22U', X(M.cx), Y(INK.y + INK.h) + 26, 'center'),
    dim('18U', X(240) + 10, Y(M.cy) + 4),
    dim('r 6U', X(M.cx) + 4, Y(M.yT - M.rs) + 22),
    dim('1.5U', X(240) + 10, Y(M.yT + M.g / 2) + 4),
  );
  // 22U / 18U 치수선
  out.push(
    { type: 'rect', x: X(INK.x), y: Y(INK.y + INK.h) + 12, w: INK.w * k, h: 1, fill: C.mute },
    { type: 'rect', x: X(240) + 4, y: Y(INK.y), w: 1, h: INK.h * k, fill: C.mute },
  );
  return out;
}

export default () => {
  const W = 1600, H = 1000, m = 56;
  const kids = [];

  // 머리
  kids.push(
    mark(m, 50, 26),
    { type: 'text', x: m + 44, y: 72, text: 'DAWN ROASTERY', font: EN, weight: 600, size: 15, fill: C.espresso, letterSpacing: 3 },
    { type: 'text', x: m + 214, y: 72, text: '로고 시스템 · Logo System Sheet', font: KO, weight: 700, size: 15, fill: C.mute },
    { type: 'text', x: W - m, y: 72, text: '서울 성수동 · 매일 새벽 5시에 볶습니다', font: KO, weight: 700, size: 15, fill: C.mute, align: 'right' },
    { type: 'rect', x: m, y: 96, w: W - 2 * m, h: 1, fill: C.line },
  );

  // 01 심볼 구성
  kids.push(panel(m, 120, 480, 480), ...label(m + 24, 150, '01', '심볼', 'SYMBOL'));
  kids.push(...construction(m + 64, 188, 336));
  kids.push({ type: 'text', x: m + 24, y: 580, text: '원두의 골 = 지평선, 그 위로 해가 뜬다. U = 1/24 · 틈 1.5U = 1/16', font: KO, weight: 700, size: 13, fill: C.mute });

  // 02 가로 조합형
  kids.push(panel(552, 120, 992, 300), ...label(576, 150, '02', '가로 조합형', 'HORIZONTAL LOCKUP'));
  {
    const K = 76;
    const L = lockupH(0, 0, K);
    const x = 552 + (992 - L.w) / 2, y = 120 + 24 + (276 - L.h) / 2;
    kids.push({ type: 'group', translate: [f2(x), f2(y)], children: [L.node] });
  }

  // 03 한글 워드마크 / 04 영문 워드마크
  kids.push(panel(552, 436, 488, 164), ...label(576, 466, '03', '한글 워드마크', 'KOREAN'));
  {
    const K = 64, w = KOW * K;
    kids.push(koText(552 + (488 - w) / 2, 436 + 112, K, C.espresso));
  }
  kids.push(panel(1056, 436, 488, 164), ...label(1080, 466, '04', '영문 워드마크', 'ENGLISH'));
  {
    const E = 40, w = 380;
    kids.push(enText(1056 + (488 - w) / 2, 436 + 110, E, w, C.espresso));
  }

  // 05 어두운 바탕
  const R2 = 616, RH = 328;
  kids.push(panel(m, R2, 568, RH, C.dark), ...label(m + 24, R2 + 30, '05', '어두운 바탕', 'ON DARK', true));
  {
    const K = 52;
    const L = lockupH(0, 0, K, { ink: C.cream, sun: C.amber, text: C.cream });
    kids.push({ type: 'group', translate: [f2(m + (568 - L.w) / 2), f2(R2 + 30 + (RH - 30 - L.h) / 2)], children: [L.node] });
  }

  // 06 단색
  kids.push(panel(640, R2, 272, RH), ...label(664, R2 + 30, '06', '단색', 'ONE COLOR'));
  {
    const L = lockupV(640 + 136, R2 + 74, 34, { ink: C.espresso, sun: C.espresso });
    kids.push(L.node);
  }

  // 07 파비콘
  kids.push(panel(928, R2, 328, RH), ...label(952, R2 + 30, '07', '파비콘', 'FAVICON'));
  {
    const y0 = R2 + 60;
    kids.push(...favicon('fav32.json', 952, y0, 4), ...favicon('fav16.json', 1104, y0, 8));
    kids.push(
      { type: 'text', x: 952, y: y0 + 150, text: '32 px  ×4', font: EN, weight: 600, size: 12, fill: C.mute, letterSpacing: 0.6 },
      { type: 'text', x: 1104, y: y0 + 150, text: '16 px  ×8', font: EN, weight: 600, size: 12, fill: C.mute, letterSpacing: 0.6 },
    );
    // 실제 크기 + 브라우저 탭
    const ty = y0 + 176;
    kids.push({ type: 'rect', x: 952, y: ty, w: 280, h: 40, r: 8, fill: '#ffffff' });
    kids.push(...favicon('fav16.json', 964, ty + 12, 1, false));
    kids.push({ type: 'text', x: 990, y: ty + 25, text: '새벽 로스터리 — Dawn Roastery', font: KO, weight: 700, size: 13, fill: C.espresso });
    kids.push({ type: 'rect', x: 952, y: ty + 52, w: 280, h: 40, r: 8, fill: '#2b2724' });
    kids.push(...favicon('fav16d.json', 964, ty + 64, 1, false));
    kids.push(...favicon('fav32.json', 1192, ty - 0, 1, false));
    kids.push({ type: 'text', x: 990, y: ty + 77, text: '새벽 로스터리 — Dawn Roastery', font: KO, weight: 700, size: 13, fill: '#e8e2da' });
  }

  // 08 색·여백
  kids.push(panel(1272, R2, 272, RH), ...label(1296, R2 + 30, '08', '색 · 여백', 'COLOR & SPACE'));
  {
    const s = 72, x = 1296 + 40, y = R2 + 70;
    const cs = s * 6 / 18; // 여백 = 해 반지름(6U)
    kids.push(
      { type: 'rect', x: x - cs, y: y - cs, w: markW(s) + 2 * cs, h: s + 2 * cs, fill: 'none', stroke: { color: C.amber, width: 1, dash: [3, 3] } },
      mark(x, y, s),
      { type: 'text', x: x + markW(s) + cs + 8, y: y + s / 2 + 4, text: '여백 = 6U', font: KO, weight: 700, size: 12, fill: C.mute },
    );
    const sw = [['에스프레소', C.espresso], ['새벽 앰버', C.amber], ['귀리 크림', C.cream]];
    sw.forEach(([n, c], i) => {
      const sx = 1296 + i * 76, sy = R2 + 214;
      kids.push(
        { type: 'rect', x: sx, y: sy, w: 68, h: 56, r: 3, fill: c, stroke: c === C.cream ? { color: C.line, width: 1 } : undefined },
        { type: 'text', x: sx, y: sy + 74, text: n, font: KO, weight: 700, size: 12, fill: C.espresso },
        { type: 'text', x: sx, y: sy + 90, text: c.toUpperCase(), font: EN, weight: 600, size: 11, fill: C.mute, letterSpacing: 0.4 },
      );
    });
  }

  // 바닥글
  kids.push(
    { type: 'text', x: m, y: 976, text: 'WARMTH · HONESTY · CRAFTSMANSHIP', font: EN, weight: 600, size: 12, fill: C.mute, letterSpacing: 2.4 },
    { type: 'text', x: W - m, y: 976, text: '37.544° N  127.056° E  —  Seongsu-dong, Seoul', font: EN, weight: 600, size: 12, fill: C.mute, align: 'right', letterSpacing: 0.6 },
  );

  return { width: W, height: H, background: C.cream, children: kids };
};
