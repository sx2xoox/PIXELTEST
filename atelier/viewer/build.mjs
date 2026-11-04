// 뷰어 HTML 빌더: 데이터(.bbmodel, 텍스처, 타임라인)를 한 장의 HTML에 넣는다.
//  - 공유용(아티팩트): three.js는 jsDelivr 고정 버전에서 불러온다
//  - 캡처용(헤드리스): 로컬 three.min.js를 HTML에 직접 넣는다
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

const CSS = `
/* 레이아웃: 상단 머리 + 가로 탭 → 섹션마다 패널 격자(비교는 좌우 2열). 어두운 작업대 단일 테마(모델 색을 정확히 보기 위해 의도적으로 어둡게) */
:root{
  --bg:#141216; --panel:#1d1a20; --stage:#0f0d11; --line:#2e2933; --fg:#ebe6ee; --muted:#a59cab; --accent:#3fd0a8; --blood:#d23a48;
  --display:'Silkscreen','JetBrains Mono',monospace; --body:'IBM Plex Sans KR','Pretendard',system-ui,sans-serif; --mono:'JetBrains Mono',ui-monospace,monospace;
  color-scheme:dark;
}
html,body{background:var(--bg);color:var(--fg)}
body{font:15px/1.6 var(--body);padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:20px 48px}
.top{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 16px;max-width:1280px;margin:0 auto 14px}
.top h1{font:400 22px/1.2 var(--display);letter-spacing:.02em;margin:0;text-wrap:balance}
.top p{margin:0;color:var(--muted);font-size:13px;max-width:70ch}
#nav{display:flex;gap:6px;overflow-x:auto;max-width:1280px;margin:0 auto 18px;padding-bottom:4px}
#nav button{flex:none;font:500 13px var(--body);color:var(--muted);background:transparent;border:1px solid var(--line);border-radius:999px;padding:6px 12px;cursor:pointer}
#nav button[aria-current=true]{color:var(--bg);background:var(--accent);border-color:var(--accent)}
#nav button:focus-visible,.ctl button:focus-visible,.ctl select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
#main{max-width:1280px;margin:0 auto}
.sec-h h2{font:400 17px/1.3 var(--display);margin:0 0 4px}
.sec-h p{margin:0 0 14px;color:var(--muted);max-width:75ch;font-size:14px}
.panes{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:14px}
.pane{background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden;min-width:0;display:flex;flex-direction:column}
.pane-h{display:flex;gap:10px;align-items:baseline;padding:10px 12px 6px;flex-wrap:wrap}
.tag{font:400 13px var(--display);color:var(--accent);letter-spacing:.04em}
.note{color:var(--muted);font-size:12px}
.stage{aspect-ratio:4/3;max-width:100%;background:radial-gradient(ellipse at 50% 35%,#25202a,var(--stage) 70%);touch-action:none;cursor:grab}
.stage canvas{width:100%;height:100%;display:block}
.ctl{display:flex;align-items:center;gap:8px;padding:8px 12px;border-top:1px solid var(--line);flex-wrap:wrap;font:12px var(--mono);color:var(--muted)}
.ctl button{font:13px var(--mono);background:var(--line);color:var(--fg);border:0;border-radius:6px;width:34px;height:28px;cursor:pointer}
.ctl .scrub{flex:1;min-width:120px;accent-color:var(--accent)}
.ctl select{background:var(--stage);color:var(--fg);border:1px solid var(--line);border-radius:6px;font:12px var(--mono);padding:3px 4px;max-width:180px}
.ctl .time{min-width:58px;font-variant-numeric:tabular-nums}
.sil{display:flex;gap:4px;align-items:center}
.desc{margin:0;padding:8px 12px 12px;color:var(--muted);font-size:13px}
.tex{display:flex;flex-wrap:wrap;gap:12px;padding:12px;align-items:flex-end}
.tex figure{margin:0;background:repeating-conic-gradient(#2a2530 0 25%,#221e27 0 50%) 0 0/12px 12px;border-radius:4px;max-width:100%}
.tex img{image-rendering:pixelated;display:block;max-width:100%}
.tex figcaption{font:11px var(--mono);color:var(--muted);padding:3px 6px;background:var(--stage)}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
`;

export function buildViewer(data, outPath, { inlineThree = false, title = 'Atelier Viewer', subtitle = '' } = {}) {
  const client = fs.readFileSync(path.join(HERE, 'client.js'), 'utf8');
  const three = inlineThree
    ? `<script>${fs.readFileSync(path.join(ROOT, 'node_modules/three/build/three.min.js'), 'utf8')}</script>`
    : '<script src="https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js"></script>';
  const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;700&family=JetBrains+Mono:wght@400;500&family=Silkscreen&display=swap">';
  const html = `<title>${title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
${inlineThree ? '' : fonts}
<style>${CSS}</style>
<div class="top"><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</div>
<nav id="nav" aria-label="섹션"></nav>
<main id="main"></main>
${three}
<script>window.__VIEWER_DATA=${JSON.stringify(data)};</script>
<script>${client}</script>`;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, inlineThree ? `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>` : html);
  return outPath;
}

export const dataURL = (file, mime = 'image/png') => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
