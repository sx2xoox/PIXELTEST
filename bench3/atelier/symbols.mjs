// 새벽 로스터리 — 심볼 후보 (240단위 상자, U = 10 = 1/24)
const f = n => +n.toFixed(2);

// A. 갈라진 원두 = 지평선 위 해 (타원·원 체계)
export function beanSun(o = {}) {
  const { cx = 120, cy = 120, rx = 108, ry = 90, h0 = 136, g = 12, rs = 50 } = o;
  const yT = h0 - g / 2, yB = h0 + g / 2;
  const xe = y => rx * Math.sqrt(1 - ((y - cy) / ry) ** 2);
  const top = `M${f(cx - xe(yT))},${yT} A${rx},${ry} 0 ${yT > cy ? 1 : 0} 1 ${f(cx + xe(yT))},${yT} L${cx + rs + g},${yT} A${rs + g},${rs + g} 0 0 0 ${cx - rs - g},${yT} Z`;
  const bot = `M${f(cx + xe(yB))},${yB} A${rx},${ry} 0 ${yB > cy ? 0 : 1} 1 ${f(cx - xe(yB))},${yB} Z`;
  const sun = `M${cx - rs},${yT} A${rs},${rs} 0 0 1 ${cx + rs},${yT} Z`;
  return { ink: [top, bot], accent: [sun] };
}

// B. 성수동 톱니 지붕 + 해 (1:2 경사 모듈)
export function sawtooth() {
  const roof = `M16,224 L16,104 L120,156 L120,104 L224,156 L224,224 Z`;
  const sun = `M${172 - 34},92 A34,34 0 1 1 ${172 + 34},92 A34,34 0 1 1 ${172 - 34},92 Z`;
  return { ink: [roof], accent: [sun] };
}

// C. D 모노그램, 속공간이 해돋이 (원+사각)
export function dMono() {
  const d = `M36,24 L120,24 A96,96 0 0 1 120,216 L36,216 Z M80,164 L184,164 L184,152 L172,152 A44,44 0 0 0 84,152 L80,152 Z`;
  return { ink: [d], accent: [] };
}

// D. ㅅ(새벽의 초성) 산/지붕 + 해 (60° 모듈)
export function siot() {
  const T = 34;
  const h = 128, w = h / Math.tan(Math.PI / 3);   // 60°
  const ax = 120, ay = 96;
  const k = T / Math.sin(Math.PI / 3);            // 수평 폭
  const L = `M${ax},${ay} L${f(ax + k / 2)},${ay} L${f(ax - w + k / 2)},${ay + h} L${f(ax - w - k / 2)},${ay + h} L${f(ax - k / 2)},${ay} Z`;
  const R = `M${f(ax - 20)},${ay + 34} L${f(ax - 20 + k)},${ay + 34} L${f(ax - 20 + k + w * 0.73)},${ay + h} L${f(ax - 20 + w * 0.73)},${ay + h} Z`;
  const sun = `M${120 - 30},52 A30,30 0 1 1 ${150},52 A30,30 0 1 1 ${90},52 Z`;
  return { ink: [L, R], accent: [sun] };
}

/** 심볼을 (x,y)에 크기 s로 그린다 */
export function place(sym, x, y, s, ink, accent = ink) {
  const k = s / 240;
  return { type: 'group', transform: `translate(${x},${y}) scale(${k})`, children: [
    ...sym.ink.map(d => ({ type: 'path', d, fill: ink })),
    ...sym.accent.map(d => ({ type: 'path', d, fill: accent })),
  ] };
}
