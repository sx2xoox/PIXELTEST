// 레이아웃 엔진: 실제 폰트로 측정한 줄바꿈 + 한글 금칙 + 균형/고아 방지 + 자동 맞춤 + 스택 배치.
// 컴파일 전에 장면 트리를 풀어서(text.lines 확정, stack → 좌표가 정해진 group) scene.js에 넘긴다.

const DEFAULT_FONT = "Pretendard, 'WenQuanYi Zen Hei', 'DejaVu Sans', sans-serif";
const ASCENT = 0.8; // 글자 윗선 ≈ 베이스라인 - 0.8em (Pretendard 기준 시각적 높이)

/** 브라우저 안에서 실행되는 줄바꿈기 */
function pageWrap() {
  const ctx = document.createElement('canvas').getContext('2d');
  const NO_START = new Set([...'.,!?)]}」』〉》:;%·…”’、。'+"'"]);
  window.wrapText = async ({ text, family, weight, size, ls, maxWidth, balance, avoidWidow = true }) => {
    const font = `${weight} ${size}px ${family}`;
    await document.fonts.load(font, text);
    ctx.font = font;
    const W = s => ctx.measureText(s).width + ls * [...s].length;
    const wrapAt = mw => {
      const lines = [];
      for (const para of String(text).split('\n')) {
        const words = para.split(' ').filter(w => w.length);
        let line = '';
        for (const w of words) {
          const cand = line ? line + ' ' + w : w;
          if (W(cand) <= mw || !line) {
            if (!line && W(w) > mw) {
              // 한 어절이 너비보다 길면 글자 단위로 자른다
              let part = '';
              for (const ch of w) { if (part && W(part + ch) > mw) { lines.push(part); part = ch; } else part += ch; }
              line = part;
            } else line = cand;
          } else { lines.push(line); line = w; }
        }
        lines.push(line);
      }
      // 줄머리 금칙: 마침표·닫는 괄호 등이 줄 처음에 오면 앞 줄 끝으로 올린다
      for (let i = 1; i < lines.length; i++)
        while (lines[i] && NO_START.has(lines[i][0])) { lines[i - 1] += lines[i][0]; lines[i] = lines[i].slice(1).trimStart(); }
      return lines.filter((l, i) => l.length || i === 0);
    };
    let lines = wrapAt(maxWidth);
    if (balance && lines.length === 2 && !String(text).includes('\n')) {
      // 두 줄 제목: 모든 어절 경계를 평가. 길이 차이가 작을수록, 문장부호(— , · :) 뒤에서 끊을수록 좋다
      const words = String(text).split(' ').filter(Boolean);
      let best = null;
      for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
        const wa = W(a), wb = W(b);
        if (wa > maxWidth || wb > maxWidth || NO_START.has(b[0])) continue;
        const semantic = /[—,·:–]$/.test(a) ? 0.15 : 1; // 의미 단위 끊기를 강하게 선호
        const score = (Math.abs(wa - wb) / maxWidth + 0.05) * semantic;
        if (!best || score < best.score) best = { score, lines: [a, b] };
      }
      if (best) lines = best.lines;
    } else if (balance && lines.length > 1) {
      // 같은 줄 수를 유지하는 가장 좁은 너비 → 줄 길이가 고르게
      let lo = maxWidth * 0.4, hi = maxWidth;
      for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (wrapAt(mid).length > lines.length) lo = mid; else hi = mid; }
      lines = wrapAt(hi);
    } else if (avoidWidow && lines.length > 1 && W(lines[lines.length - 1]) < maxWidth * 0.3) {
      // 고아 단어 방지: 앞 줄의 마지막 어절을 내려 보낸다
      const prev = lines[lines.length - 2].split(' ');
      if (prev.length > 1) {
        const moved = prev.pop();
        const last = moved + ' ' + lines[lines.length - 1];
        if (W(last) <= maxWidth) { lines[lines.length - 2] = prev.join(' '); lines[lines.length - 1] = last; }
      }
    }
    const semantic = lines.length > 1 && lines.slice(0, -1).every(l => /[—,·:–.!?]$/.test(l));
    return { lines, widths: lines.map(W), semantic };
  };
}

export async function makeMeasurer(browser) {
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: `(${pageWrap.toString()})()` });
  return {
    wrap: opts => page.evaluate(o => window.wrapText(o), opts),
    close: () => page.close(),
  };
}

const textHeight = n => (n.lines.length - 1) * n.size * (n.lineHeight ?? 1.25) + n.size * (ASCENT + 0.18); // 아랫부분(받침/디센더) 포함

async function resolveText(n, ms, fonts) {
  if (!n.maxWidth || n.lines) return n;
  const family = fonts[n.font ?? 'default'] ?? n.font ?? DEFAULT_FONT;
  let size = n.size ?? 32;
  const ls0 = n.letterSpacing;
  for (;;) {
    const ls = ls0 ?? (size >= 48 ? -0.02 * size : 0);
    const r = await ms.wrap({ text: n.text, family, weight: n.weight ?? 400, size, ls, maxWidth: n.maxWidth, balance: n.balance });
    const fit = n.fit;
    const tooMany = fit?.maxLines && r.lines.length > fit.maxLines;
    const tooWide = Math.max(...r.widths) > n.maxWidth + 0.5;
    if (fit && (tooMany || tooWide) && size > (fit.minSize ?? 12)) { size = Math.max(fit.minSize ?? 12, Math.floor(size * 0.94)); continue; }
    // 의미 단위 줄바꿈: 제목에 — , · : 가 있는데 그 뒤에서 끊기지 않았다면 최대 15%까지 줄여서 시도
    const hasBreakMark = /[—,·:–]\s/.test(n.text);
    if (n.balance && hasBreakMark && !r.semantic && n.semantic !== false && size > (n.size ?? 32) * 0.86) {
      const smaller = Math.floor(size * 0.95);
      const r2 = await ms.wrap({ text: n.text, family, weight: n.weight ?? 400, size: smaller, ls: ls0 ?? (smaller >= 48 ? -0.02 * smaller : 0), maxWidth: n.maxWidth, balance: true });
      if (r2.semantic && r2.lines.length <= r.lines.length) return { ...n, size: smaller, lines: r2.lines, _widths: r2.widths };
      size = smaller;
      if (size > (n.size ?? 32) * 0.86) continue;
      size = n.size ?? 32; // 실패하면 원래 크기로
      const r0 = await ms.wrap({ text: n.text, family, weight: n.weight ?? 400, size, ls, maxWidth: n.maxWidth, balance: n.balance });
      return { ...n, size, lines: r0.lines, _widths: r0.widths };
    }
    return { ...n, size, lines: r.lines, _widths: r.widths };
  }
}

/** 장면 트리를 순회하며 텍스트 줄바꿈과 stack 배치를 확정한다 */
export async function resolveLayout(scene, ms) {
  const fonts = { default: DEFAULT_FONT, ...(scene.fonts || {}) };
  const walk = async n => {
    if (!n || typeof n !== 'object') return n;
    if (Array.isArray(n)) return Promise.all(n.map(walk));
    if (n.type === 'text') return resolveText(n, ms, fonts);
    if (n.type === 'stack') return stack(n);
    if (n.children) return { ...n, children: await walk(n.children) };
    return n;
  };
  /**
   * stack: { x, y, w, gap, align:'left|center|right', anchor:'top|bottom|middle', children }
   * 자식: text(자동 maxWidth=w), rect(h, w 기본=w), space{h}, 그 밖에 h가 있는 노드
   */
  const stack = async n => {
    const { x = 0, w, gap = 0, align = 'left', anchor = 'top' } = n;
    const kids = [];
    for (const c of n.children) {
      if (c.type === 'text') kids.push(await resolveText({ maxWidth: w, align, ...c }, ms, fonts));
      else kids.push(await walk(c));
    }
    const heights = kids.map(c => (c.type === 'text' ? textHeight(c) : c.h ?? 0));
    const gaps = kids.map((c, i) => (i === 0 ? 0 : c.gapBefore ?? gap));
    const total = heights.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
    let cur = anchor === 'bottom' ? n.y - total : anchor === 'middle' ? n.y - total / 2 : n.y;
    const ax = align === 'center' ? x + w / 2 : align === 'right' ? x + w : x;
    const out = kids.map((c, i) => {
      cur += gaps[i];
      let r;
      if (c.type === 'text') r = { ...c, x: ax, y: cur + c.size * ASCENT, align: c.align ?? align };
      else if (c.type === 'space') r = null;
      else if (c.type === 'rect') {
        const cw = c.w ?? w;
        r = { ...c, w: cw, x: align === 'center' ? x + (w - cw) / 2 : align === 'right' ? x + w - cw : x, y: cur };
      } else r = { ...c, transform: `translate(${x},${cur}) ${c.transform ?? ''}` };
      cur += heights[i];
      return r;
    });
    return { type: 'group', children: out.filter(Boolean), _box: { x, y: cur - total, w, h: total } };
  };
  return { ...scene, children: await walk(scene.children || []) };
}

export const FORMATS = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  story: [1080, 1920],
  landscape: [1920, 1080],
  banner: [1500, 500],
  thumb: [1280, 720],
};
