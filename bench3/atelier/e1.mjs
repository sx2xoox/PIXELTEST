// E1 "고요" 앱 아이콘
// 콘셉트: "잠든 달" — 아래로 누운 초승달이 곧 감은 눈꺼풀이다. 밤(달)과 잠(감은 눈)과
//   숨을 내려놓은 표정(편안히 휜 곡선)을 실루엣 하나에 겹친다. 16px에서는 웃는 그릇 모양 1색 곡선만 남아도 읽힌다.
// 썸네일 비교: A 감은 눈-달 / B 사인 파형으로 갈린 원(바다 공처럼 읽힘) / C 호흡 페이서 동심원(해·버튼처럼 흔함) → A 선택.
// r1: 초승달 = 바깥 원 − 위로 민 안쪽 원(정확한 path), 속눈썹 3개는 끝이 뾰족한 가시형 path.
function crescent(cx, cy, R, oy, r) {
  // 바깥 원(cx,cy,R)에서 (cx, cy+oy, r) 원을 뺀 아래쪽 초승달
  const a = (R * R - r * r + oy * oy) / (2 * oy); // 교점의 y(상대)
  const h = Math.sqrt(R * R - a * a);
  const p1 = [cx - h, cy + a], p2 = [cx + h, cy + a];
  return `M${p1[0]},${p1[1]} A${R},${R} 0 ${a < 0 ? 1 : 0} 0 ${p2[0]},${p2[1]} A${r},${r} 0 0 1 ${p1[0]},${p1[1]} Z`;
}
function lash(cx, cy, R, deg, len, base, bend) {
  const t = (deg * Math.PI) / 180, n = [Math.cos(t), Math.sin(t)], tg = [-n[1], n[0]];
  const P = (rad, side) => [cx + n[0] * rad + tg[0] * side, cy + n[1] * rad + tg[1] * side];
  const b1 = P(R - 30, -base / 2), b2 = P(R - 30, base / 2);
  const tip = P(R + len, bend);
  const c1 = P(R + len * 0.45, -base * 0.42 + bend * 0.3), c2 = P(R + len * 0.45, base * 0.42 + bend * 0.3);
  const f = (p) => p.map((v) => v.toFixed(1)).join(',');
  return `M${f(b2)} Q${f(c2)} ${f(tip)} Q${f(c1)} ${f(b1)} Z`; // 초승달과 같은 감김 방향(겹침이 구멍이 되지 않게)
}
const LASH = (process.env.LASH || '-40,-13,13,40').split(',').map(Number), LEN = +(process.env.LEN || 92), BASE = +(process.env.BASE || 24), BEND = +(process.env.BEND || 1.0);
export default function () {
  const cx = 512, cy = 322, R = 330, oy = -118, r = 344;
  return {
    width: 1024, height: 1024,
    tokens: { bg0: '#1a2046', bg1: '#28326a', moon: '#f6e6bd', moonDeep: '#e9c98c', halo: '#5a6bb8' },
    background: '#ffffff',
    critic: { safeMargin: 0.02 },
    children: [{
      type: 'group', clip: { type: 'squircle', x: 0, y: 0, w: 1024, h: 1024, n: 5 },
      children: [
        { type: 'rect', x: 0, y: 0, w: 1024, h: 1024, fill: { linear: { angle: 90, stops: [[0, '$bg0'], [1, '$bg1']] } } },
        // r3: 달빛 번짐 → r5: 따뜻한 반투명이 남색 위에서 회갈색으로 탁해짐 → 같은 계열의 차가운 밝은 남색으로 바꾸고 약하게
        { type: 'ellipse', cx, cy: cy + 230, rx: 440, ry: 340, fill: { radial: { stops: [[0, '$halo', 0.22], [1, '$halo', 0]] } }, blend: 'screen' },
        // r3: 그릇 안쪽 빈 하늘에 작은 별 하나(밤의 신호, 오른쪽 위 3분할점 근처)
        { type: 'star', cx: 690, cy: 286, r: 28, inner: 0.3, points: 4, fill: '$moon', opacity: 0.9 },
        // 초승달과 속눈썹을 path 하나로 합쳐 그라데이션이 한 몸에 이어지게 한다(r2)
        { type: 'path', d: [crescent(cx, cy, R, oy, r), ...LASH.map((d) => lash(cx, cy, R, 90 + d, LEN, BASE, d * BEND))].join(' '),
          fill: { linear: { angle: 90, stops: [[0.35, '$moon'], [1, '$moonDeep']] } } },
      ],
    }],
  };
}
