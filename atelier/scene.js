// 장면 컴파일러: 디자인 DSL(JSON 또는 JS 객체) → SVG.
// Claude는 픽셀이 아니라 "의도"(형태, 빛, 질감, 타이포, 토큰)를 쓰고, 엔진이 그것을 고품질 벡터로 펼친다.

import * as G from './geom.js';
import { palette as makePalette, resolveColor } from './color.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const DEFAULT_FONT = "Pretendard, 'Pretendard Variable', 'WenQuanYi Zen Hei', 'DejaVu Sans', sans-serif";

export function buildTokens(scene) {
  let tokens = {};
  if (scene.palette) tokens = makePalette(scene.palette.seed, scene.palette.harmony);
  return { ...tokens, ...(scene.tokens || {}) };
}

class Ctx {
  constructor(scene) {
    this.scene = scene;
    this.tokens = buildTokens(scene);
    this.defs = [];
    this.n = 0;
    this.fonts = { default: DEFAULT_FONT, ...(scene.fonts || {}) };
    this.texts = [];
  }
  id(p) { return `${p}${++this.n}`; }
  color(v) { return resolveColor(v, this.tokens); }
}

// ---------- 칠하기 ----------
function stopsSvg(ctx, stops) {
  return stops
    .map(s => {
      const [off, col, op = 1] = Array.isArray(s) ? s : [s.offset, s.color, s.opacity ?? 1];
      return `<stop offset="${off}" stop-color="${ctx.color(col)}" stop-opacity="${op}"/>`;
    })
    .join('');
}

function paint(ctx, fill) {
  if (fill == null || fill === 'none') return 'none';
  if (typeof fill === 'string') return ctx.color(fill);
  if (fill.linear) {
    const { angle = 90, stops } = fill.linear;
    // angle: 0 = 왼→오, 90 = 위→아래 (CSS와 비슷하게 느껴지도록)
    const a = (angle * Math.PI) / 180;
    const dx = Math.cos(a) / 2, dy = Math.sin(a) / 2;
    const id = ctx.id('lg');
    ctx.defs.push(`<linearGradient id="${id}" x1="${0.5 - dx}" y1="${0.5 - dy}" x2="${0.5 + dx}" y2="${0.5 + dy}">${stopsSvg(ctx, stops)}</linearGradient>`);
    return `url(#${id})`;
  }
  if (fill.radial) {
    const { cx = 0.5, cy = 0.5, r = 0.5, fx, fy, stops } = fill.radial;
    const id = ctx.id('rg');
    ctx.defs.push(`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" fx="${fx ?? cx}" fy="${fy ?? cy}">${stopsSvg(ctx, stops)}</radialGradient>`);
    return `url(#${id})`;
  }
  throw new Error('Unknown fill: ' + JSON.stringify(fill));
}

// ---------- 효과(SVG 필터 체인) ----------
function filterFor(ctx, effects) {
  if (!effects || !effects.length) return '';
  const id = ctx.id('fx');
  const prim = [];
  let cur = 'SourceGraphic';
  const under = [], over = [];
  let k = 0;
  const r = () => `r${++k}`;
  for (const e of effects) {
    const t = e.type;
    if (t === 'rough') {
      const n = r(), o = r();
      prim.push(`<feTurbulence type="fractalNoise" baseFrequency="${e.freq ?? 0.04}" numOctaves="${e.octaves ?? 2}" seed="${e.seed ?? 1}" result="${n}"/>`);
      prim.push(`<feDisplacementMap in="${cur}" in2="${n}" scale="${e.scale ?? 6}" xChannelSelector="R" yChannelSelector="G" result="${o}"/>`);
      cur = o;
    } else if (t === 'blur') {
      const o = r();
      prim.push(`<feGaussianBlur in="${cur}" stdDeviation="${e.r ?? 4}" result="${o}"/>`);
      cur = o;
    }
  }
  for (const e of effects) {
    const t = e.type;
    if (t === 'shadow' || t === 'glow') {
      const fl = r(), cp = r(), bl = r(), of = r();
      const col = ctx.color(e.color ?? (t === 'glow' ? '#ffffff' : '#000000'));
      prim.push(`<feFlood flood-color="${col}" flood-opacity="${e.opacity ?? (t === 'glow' ? 0.6 : 0.25)}" result="${fl}"/>`);
      prim.push(`<feComposite in="${fl}" in2="${cur}" operator="in" result="${cp}"/>`);
      if (e.spread) {
        const m = r();
        prim.push(`<feMorphology in="${cp}" operator="dilate" radius="${e.spread}" result="${m}"/>`);
        prim.push(`<feGaussianBlur in="${m}" stdDeviation="${e.blur ?? 12}" result="${bl}"/>`);
      } else prim.push(`<feGaussianBlur in="${cp}" stdDeviation="${e.blur ?? 12}" result="${bl}"/>`);
      prim.push(`<feOffset in="${bl}" dx="${e.dx ?? 0}" dy="${e.dy ?? (t === 'glow' ? 0 : 8)}" result="${of}"/>`);
      under.push(of);
    } else if (t === 'innerShadow' || t === 'innerGlow') {
      const fl = r(), out = r(), bl = r(), of = r(), cl = r();
      const col = ctx.color(e.color ?? (t === 'innerGlow' ? '#ffffff' : '#000000'));
      prim.push(`<feFlood flood-color="${col}" flood-opacity="${e.opacity ?? 0.35}" result="${fl}"/>`);
      prim.push(`<feComposite in="${fl}" in2="${cur}" operator="out" result="${out}"/>`);
      prim.push(`<feGaussianBlur in="${out}" stdDeviation="${e.blur ?? 6}" result="${bl}"/>`);
      prim.push(`<feOffset in="${bl}" dx="${e.dx ?? 0}" dy="${e.dy ?? (t === 'innerGlow' ? 0 : 4)}" result="${of}"/>`);
      prim.push(`<feComposite in="${of}" in2="${cur}" operator="in" result="${cl}"/>`);
      over.push(cl);
    } else if (t === 'grain') {
      const n = r(), m = r(), gg = r();
      prim.push(`<feTurbulence type="fractalNoise" baseFrequency="${e.freq ?? 0.85}" numOctaves="2" seed="${e.seed ?? 3}" stitchTiles="stitch" result="${n}"/>`);
      const a = e.amount ?? 0.12;
      prim.push(`<feColorMatrix in="${n}" type="saturate" values="0" result="${gg}"/>`);
      const ga = r();
      prim.push(`<feComponentTransfer in="${gg}" result="${ga}"><feFuncA type="linear" slope="0" intercept="${a}"/></feComponentTransfer>`);
      prim.push(`<feComposite in="${ga}" in2="${cur}" operator="in" result="${m}"/>`);
      over.push({ blend: m });
    }
  }
  // 합성: 그림자류(아래) → 본체 → 안쪽 효과/질감(위)
  let main = cur;
  for (const o of over) {
    if (typeof o === 'object') {
      const b = r();
      prim.push(`<feBlend in="${o.blend}" in2="${main}" mode="overlay" result="${b}"/>`);
      const c = r();
      prim.push(`<feComposite in="${b}" in2="${main}" operator="in" result="${c}"/>`);
      main = c;
    }
  }
  const nodes = [...under, main, ...over.filter(o => typeof o === 'string')];
  prim.push(`<feMerge>${nodes.map(n => `<feMergeNode in="${n}"/>`).join('')}</feMerge>`);
  ctx.defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">${prim.join('')}</filter>`);
  return `url(#${id})`;
}

// ---------- 형태 → path d ----------
function geometry(node) {
  switch (node.type) {
    case 'rect': {
      const { x = 0, y = 0, w, h, r = 0 } = node;
      return { tag: 'rect', attrs: { x, y, width: w, height: h, rx: r, ry: r } };
    }
    case 'circle':
      return { tag: 'circle', attrs: { cx: node.cx, cy: node.cy, r: node.r } };
    case 'ellipse':
      return { tag: 'ellipse', attrs: { cx: node.cx, cy: node.cy, rx: node.rx, ry: node.ry } };
    case 'path':
      return { tag: 'path', attrs: { d: node.d } };
    case 'curve':
      return { tag: 'path', attrs: { d: G.spline(node.points, node) } };
    case 'line':
      return { tag: 'path', attrs: { d: 'M' + node.points.map(p => p.join(',')).join('L') + (node.closed ? 'Z' : '') } };
    case 'brush':
      return { tag: 'path', attrs: { d: G.brush(node.points, node) } };
    case 'blob':
      return { tag: 'path', attrs: { d: G.blob(node) } };
    case 'polygon':
      return { tag: 'path', attrs: { d: G.polygon(node) } };
    case 'star':
      return { tag: 'path', attrs: { d: G.star(node) } };
    case 'squircle':
      return { tag: 'path', attrs: { d: G.squircle(node) } };
    case 'ridge':
      return { tag: 'path', attrs: { d: G.ridge(node) } };
    default:
      return null;
  }
}

const attrStr = o =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}="${typeof v === 'string' ? esc(v) : v}"`)
    .join(' ');

function transformOf(n) {
  const t = [];
  if (n.translate) t.push(`translate(${n.translate[0]},${n.translate[1]})`);
  if (n.rotate) t.push(`rotate(${n.rotate}${n.origin ? `,${n.origin[0]},${n.origin[1]}` : ''})`);
  if (n.scale != null && n.type !== 'scatter') {
    const s = Array.isArray(n.scale) ? n.scale : [n.scale, n.scale];
    if (n.origin) t.push(`translate(${n.origin[0]},${n.origin[1]}) scale(${s[0]},${s[1]}) translate(${-n.origin[0]},${-n.origin[1]})`);
    else t.push(`scale(${s[0]},${s[1]})`);
  }
  if (n.transform) t.push(n.transform);
  return t.join(' ') || undefined;
}

function styleOf(n) {
  const s = [];
  if (n.blend) s.push(`mix-blend-mode:${n.blend}`);
  return s.join(';') || undefined;
}

function strokeAttrs(ctx, st) {
  if (!st) return {};
  if (typeof st === 'string') st = { color: st };
  return {
    stroke: paint(ctx, st.color ?? st.paint ?? '#000'),
    'stroke-width': st.width ?? 2,
    'stroke-linecap': st.cap ?? 'round',
    'stroke-linejoin': st.join ?? 'round',
    'stroke-dasharray': st.dash ? st.dash.join(' ') : undefined,
    'stroke-opacity': st.opacity,
    'vector-effect': st.fixed ? 'non-scaling-stroke' : undefined,
  };
}

/**
 * shade: 형태에 입체감을 준다. 같은 형태를 다시 그려 빛 방향 그라디언트를 겹친다.
 * { light: 315(빛이 오는 방향, 도), strength: 0~1, highlight: 색, shadow: 색, spec: 0~1 }
 */
function shadeLayers(ctx, g, n) {
  const sh = n.shade === true ? {} : n.shade;
  const light = ((sh.light ?? 315) * Math.PI) / 180;
  const k = sh.strength ?? 0.6;
  const hl = ctx.color(sh.highlight ?? '#ffffff');
  const sc = ctx.color(sh.shadow ?? '#1a1030');
  const lx = Math.cos(light), ly = Math.sin(light);
  const id = ctx.id('sh');
  ctx.defs.push(
    `<linearGradient id="${id}" x1="${0.5 + lx / 2}" y1="${0.5 + ly / 2}" x2="${0.5 - lx / 2}" y2="${0.5 - ly / 2}">` +
      `<stop offset="0" stop-color="${hl}" stop-opacity="${0.55 * k}"/>` +
      `<stop offset="0.45" stop-color="${hl}" stop-opacity="0"/>` +
      `<stop offset="0.6" stop-color="${sc}" stop-opacity="0"/>` +
      `<stop offset="1" stop-color="${sc}" stop-opacity="${0.6 * k}"/></linearGradient>`
  );
  const out = [`<${g.tag} ${attrStr({ ...g.attrs, fill: `url(#${id})`, style: 'mix-blend-mode:soft-light' })}/>`];
  out.push(`<${g.tag} ${attrStr({ ...g.attrs, fill: `url(#${id})`, opacity: 0.5 })}/>`);
  if ((sh.spec ?? 0.5) > 0) {
    const sid = ctx.id('sp');
    ctx.defs.push(
      `<radialGradient id="${sid}" cx="${0.5 + lx * 0.28}" cy="${0.5 + ly * 0.28}" r="0.35">` +
        `<stop offset="0" stop-color="${hl}" stop-opacity="${(sh.spec ?? 0.5) * k}"/><stop offset="1" stop-color="${hl}" stop-opacity="0"/></radialGradient>`
    );
    out.push(`<${g.tag} ${attrStr({ ...g.attrs, fill: `url(#${sid})`, style: 'mix-blend-mode:screen' })}/>`);
  }
  // 반사광(rim): 반대편 가장자리에 얇게
  if (sh.rim) {
    const rid = ctx.id('rim');
    ctx.defs.push(
      `<linearGradient id="${rid}" x1="${0.5 - lx / 2}" y1="${0.5 - ly / 2}" x2="${0.5 + lx / 2}" y2="${0.5 + ly / 2}">` +
        `<stop offset="0" stop-color="${ctx.color(sh.rim)}" stop-opacity="0.7"/><stop offset="0.18" stop-color="${ctx.color(sh.rim)}" stop-opacity="0"/></linearGradient>`
    );
    out.push(`<${g.tag} ${attrStr({ ...g.attrs, fill: `url(#${rid})`, style: 'mix-blend-mode:screen' })}/>`);
  }
  return out.join('');
}

// ---------- 텍스트 ----------
function estimateWidth(str, size, ls = 0) {
  let w = 0;
  for (const ch of str) {
    const c = ch.codePointAt(0);
    w += (c > 0x2e80 ? 0.92 : /[A-Z0-9]/.test(ch) ? 0.64 : ch === ' ' ? 0.28 : 0.52) * size + ls;
  }
  return w;
}

function wrap(text, size, maxWidth, ls) {
  const words = text.split(/(\s+)/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const cand = line + w;
    if (line && estimateWidth(cand.trimEnd(), size, ls) > maxWidth) {
      lines.push(line.trimEnd());
      line = w.trimStart();
    } else line = cand;
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

function textNode(ctx, n) {
  const size = n.size ?? 32;
  const lh = n.lineHeight ?? 1.25;
  const ls = n.letterSpacing ?? (size >= 48 ? -0.02 * size : 0);
  let lines = n.lines ?? (n.maxWidth ? wrap(n.text, size, n.maxWidth, ls) : String(n.text).split('\n'));
  if (n.upper) lines = lines.map(l => l.toUpperCase());
  const anchor = { left: 'start', center: 'middle', right: 'end' }[n.align ?? 'left'] ?? 'start';
  const fillCol = paint(ctx, n.fill ?? '#111');
  const tid = n.id ?? ctx.id('t');
  ctx.texts.push({ id: tid, lines, fill: typeof n.fill === 'string' ? ctx.color(n.fill) : null, size, role: n.role ?? (size >= 40 ? 'display' : 'body'), weight: n.weight ?? 400 });
  const attrs = {
    id: tid,
    'data-atelier': 'text',
    x: n.x,
    y: n.y,
    fill: fillCol,
    'font-family': ctx.fonts[n.font ?? 'default'] ?? n.font,
    'font-size': size,
    'font-weight': n.weight ?? 400,
    'font-style': n.italic ? 'italic' : undefined,
    'letter-spacing': ls ? +ls.toFixed(2) : undefined,
    'text-anchor': anchor,
    opacity: n.opacity,
    filter: filterFor(ctx, n.effects) || undefined,
    transform: transformOf(n),
    style: styleOf(n),
    ...strokeAttrs(ctx, n.stroke),
    'paint-order': n.stroke ? 'stroke' : undefined,
  };
  if (n.vertical) {
    // 세로쓰기(책 표지·전통 타이포): 글자는 세운 채 위→아래, 줄은 오른쪽→왼쪽. y는 첫 글자의 위쪽, x는 첫 줄의 중심
    attrs.style = [attrs.style, 'writing-mode:vertical-rl', 'text-orientation:upright'].filter(Boolean).join(';');
    attrs['text-anchor'] = { left: 'start', center: 'middle', right: 'end' }[n.align ?? 'left'] ?? 'start';
    const cols = lines.map((l, i) => `<tspan x="${+(n.x - i * size * lh).toFixed(2)}" y="${n.y}">${esc(l)}</tspan>`).join('');
    return `<text ${attrStr(attrs)}>${cols}</text>`;
  }
  const spans = lines
    .map((l, i) => `<tspan x="${n.x}" dy="${i === 0 ? 0 : +(size * lh).toFixed(2)}">${esc(l)}</tspan>`)
    .join('');
  return `<text ${attrStr(attrs)}>${spans}</text>`;
}

/** 원호 위 글자(배지·스탬프 로고): side 'top'이면 원 위쪽을 시계 방향으로, 'bottom'이면 아래쪽을 반시계 방향으로(글자가 바로 서게) */
function arcTextNode(ctx, n) {
  const { cx, cy, r, side = 'top', size = 24 } = n;
  const id = ctx.id('arc');
  const d = side === 'top'
    ? `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
    : `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`;
  ctx.defs.push(`<path id="${id}" d="${d}"/>`);
  ctx.texts.push({ id: id + 't', lines: [n.text], fill: typeof n.fill === 'string' ? ctx.color(n.fill) : null, size, role: 'label', weight: n.weight ?? 400 });
  const attrs = {
    'font-family': ctx.fonts[n.font ?? 'default'] ?? n.font, 'font-size': size, 'font-weight': n.weight ?? 400,
    'letter-spacing': n.letterSpacing, fill: paint(ctx, n.fill ?? '#111'), opacity: n.opacity, 'text-anchor': 'middle',
    'dominant-baseline': side === 'top' ? 'auto' : 'hanging', transform: transformOf(n),
  };
  return `<text ${attrStr(attrs)}><textPath href="#${id}" startOffset="${n.offset ?? 50}%">${esc(n.upper ? String(n.text).toUpperCase() : n.text)}</textPath></text>`;
}

// ---------- 절차적 반복 ----------
function expandScatter(n) {
  const R = G.rng(n.seed ?? 7);
  const { x = 0, y = 0, w, h } = n.area;
  const [s0, s1] = Array.isArray(n.scale) ? n.scale : [n.scale ?? 1, n.scale ?? 1];
  const [r0, r1] = n.rotate ?? [0, 0];
  const out = [];
  for (let i = 0; i < (n.count ?? 20); i++) {
    const px = x + R() * w, py = y + R() * h;
    const s = s0 + R() * (s1 - s0);
    const rot = r0 + R() * (r1 - r0);
    const pick = Array.isArray(n.child) ? n.child[Math.floor(R() * n.child.length)] : n.child;
    const op = n.opacity ? n.opacity[0] + R() * (n.opacity[1] - n.opacity[0]) : undefined;
    out.push({ type: 'group', transform: `translate(${px.toFixed(1)},${py.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${s.toFixed(3)})`, opacity: op, children: [pick] });
  }
  if (n.sortY) out.sort((a, b) => parseFloat(a.transform.split(',')[1]) - parseFloat(b.transform.split(',')[1]));
  return out;
}

function expandRepeat(n) {
  const out = [];
  for (let i = 0; i < (n.count ?? 3); i++) {
    const t = [];
    t.push(`translate(${(n.dx ?? 0) * i},${(n.dy ?? 0) * i})`);
    if (n.drot) t.push(`rotate(${n.drot * i}${n.origin ? `,${n.origin[0]},${n.origin[1]}` : ''})`);
    const op = n.fade ? 1 - (n.fade * i) / Math.max(1, n.count - 1) : undefined;
    out.push({ type: 'group', transform: t.join(' '), opacity: op, children: [n.child] });
  }
  return out;
}

// ---------- 노드 ----------
function node(ctx, n) {
  if (!n || n.hidden) return '';
  if (Array.isArray(n)) return n.map(c => node(ctx, c)).join('');
  if (n.type === 'text') return textNode(ctx, n);
  if (n.type === 'arcText') return arcTextNode(ctx, n);
  if (n.type === 'scatter') return node(ctx, { type: 'group', children: expandScatter(n), opacity: n.groupOpacity, blend: n.blend, effects: n.effects });
  if (n.type === 'repeat') return node(ctx, { type: 'group', children: expandRepeat(n), effects: n.effects, blend: n.blend });
  if (n.type === 'group') {
    let clip;
    if (n.clip) {
      const cg = geometry(n.clip);
      const cid = ctx.id('clip');
      ctx.defs.push(`<clipPath id="${cid}"><${cg.tag} ${attrStr({ ...cg.attrs, transform: transformOf(n.clip) })}/></clipPath>`);
      clip = `url(#${cid})`;
    }
    const inner = (n.children || []).map(c => node(ctx, c)).join('');
    const g = `<g ${attrStr({ transform: transformOf(n), opacity: n.opacity, filter: filterFor(ctx, n.effects) || undefined, style: styleOf(n) })}>${inner}</g>`;
    return clip ? `<g clip-path="${clip}">${g}</g>` : g;
  }
  const g = geometry(n);
  if (!g) throw new Error('Unknown node type: ' + n.type);
  const isOpen = ['line', 'curve'].includes(n.type) && !n.closed;
  const fill = n.fill === undefined ? (isOpen ? 'none' : '#888') : paint(ctx, n.fill);
  const body = `<${g.tag} ${attrStr({
    ...g.attrs,
    id: n.id,
    fill,
    'fill-opacity': n.fillOpacity,
    ...strokeAttrs(ctx, n.stroke),
  })}/>`;
  let inner = body;
  if (n.shade) inner += shadeLayers(ctx, g, n);
  if (n.texture) {
    // 형태 안에만 그려지는 질감 패턴(줄무늬, 점, 해칭)
    const cid = ctx.id('tc');
    ctx.defs.push(`<clipPath id="${cid}"><${g.tag} ${attrStr(g.attrs)}/></clipPath>`);
    inner += `<g clip-path="url(#${cid})">${node(ctx, n.texture)}</g>`;
  }
  const wrapNeeded = n.shade || n.texture || n.effects || n.opacity != null || n.blend || transformOf(n);
  if (!wrapNeeded) return body;
  return `<g ${attrStr({ transform: transformOf(n), opacity: n.opacity, filter: filterFor(ctx, n.effects) || undefined, style: styleOf(n) })}>${inner}</g>`;
}

export function compile(scene) {
  const ctx = new Ctx(scene);
  const W = scene.width ?? 1024, H = scene.height ?? 1024;
  const parts = [];
  if (scene.background) parts.push(node(ctx, { type: 'rect', x: 0, y: 0, w: W, h: H, fill: scene.background }));
  parts.push(node(ctx, scene.children || []));
  const post = scene.post || {};
  if (post.vignette) {
    const v = typeof post.vignette === 'number' ? { amount: post.vignette } : post.vignette;
    parts.push(node(ctx, { type: 'rect', x: 0, y: 0, w: W, h: H, blend: 'multiply', fill: { radial: { r: 0.75, stops: [[0.45, '#ffffff', 0], [1, v.color ?? '#000000', v.amount ?? 0.35]] } } }));
  }
  if (post.grain) {
    const id = ctx.id('grain');
    const a = typeof post.grain === 'number' ? post.grain : 0.08;
    ctx.defs.push(`<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="11" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0" intercept="${a}"/></feComponentTransfer></filter>`);
    parts.push(`<rect x="0" y="0" width="${W}" height="${H}" filter="url(#${id})" style="mix-blend-mode:overlay"/>`);
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs>${ctx.defs.join('')}</defs>${parts.join('')}</svg>`;
  return { svg, width: W, height: H, texts: ctx.texts, tokens: ctx.tokens };
}
