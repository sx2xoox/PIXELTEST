// E1 "고요" 앱 아이콘
// 콘셉트: "잠든 달" — 아래로 누운 초승달이 곧 감은 눈꺼풀이다. 밤(달)과 잠(감은 눈)과
//   숨을 내려놓은 표정(편안히 휜 곡선)을 실루엣 하나에 겹친다. 16px에서는 웃는 그릇 모양 1색 곡선만 남아도 읽힌다.
// 썸네일 비교: A 감은 눈-달 / B 사인 파형으로 갈린 원(바다 공처럼 읽힘) / C 호흡 페이서 동심원(해·버튼처럼 흔함) → A 선택.
// r1: 초승달 = 바깥 원 − 위로 민 안쪽 원(정확한 path), 속눈썹 3개 가시형 path.
//     → 본 결과: 굵고 짧은 속눈썹 3개 + 가운데 하나 = '송곳니 웃음'(괴물 입)으로 읽힘. 속눈썹 색이 따로 놀아 이음매가 보임.
// r2: 속눈썹을 가늘고 길게, 바깥으로 휘게, 3/4/5개 비교 → 가운데가 빈 4개가 가장 '감은 눈'으로 읽힘.
//     초승달+속눈썹을 path 하나로 합쳐 그라데이션 한 몸(감김 방향 반대면 겹침이 구멍이 돼서 뒤집음).
// r3: 마크가 아래로 처져 위가 텅 빔 → 88px 올림. 그릇 안 빈 하늘에 작은 별 하나(밤 신호).
//     바깥 속눈썹이 수평으로 뻗어 고양이 수염처럼 보임 → 각도 ±42, 휨 1.0으로 줄임.
// r4/5: 따뜻한 반투명 달빛 번짐이 남색 위에서 회갈색으로 탁해짐 → 같은 계열의 차가운 밝은 남색 halo(screen)로 교체.
// r6: 16px 축소에서 초승달 가운데가 1px 남짓 → 두께 104→130(12.7%). 깊게 파면 말굽·소뿔로 읽혀서 뿔 높이는 낮게 유지.
//     별을 오른쪽 뿔에서 떼어 그릇 안쪽 위로(숨 쉴 틈).
// 실측(r6): 전경 폭 64.4%, 높이 43%(가로형 마크라 70~82% 미달 — 의도), 잉크 8%, 무게중심 (0.50, 0.49) 편차 0.018,
//     배경 2색 그라데이션 L 13.8→22.9(ΔL 9), 강조색 = 달빛 크림 하나, 디테일 3종(초승달·속눈썹·별), 텍스트·광택 없음.
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
const LASH = (process.env.LASH || '-42,-15,15,42').split(',').map(Number), LEN = +(process.env.LEN || 92), BASE = +(process.env.BASE || 22), BEND = +(process.env.BEND || 1.0);
export default function () {
  const cx = 512, cy = 300, R = 330, oy = -150, r = 350; // r6: 가운데 두께 104→130(12.7%) — 16px에서 2px 남게. 뿔은 낮게 유지(깊으면 말굽·소뿔로 읽힘)
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
        { type: 'star', cx: 664, cy: 236, r: 28, inner: 0.3, points: 4, fill: '$moon', opacity: 0.9 },
        // 초승달과 속눈썹을 path 하나로 합쳐 그라데이션이 한 몸에 이어지게 한다(r2)
        { type: 'path', d: [crescent(cx, cy, R, oy, r), ...LASH.map((d) => lash(cx, cy, R, 90 + d, LEN, BASE, d * BEND))].join(' '),
          fill: { linear: { angle: 90, stops: [[0.35, '$moon'], [1, '$moonDeep']] } } },
      ],
    }],
  };
}
