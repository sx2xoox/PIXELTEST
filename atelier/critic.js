// 비평기: 디자이너가 "눈으로 체크하는 것"을 숫자로 바꾼 규칙들.
// 비전 비평(Claude가 시트를 직접 보는 것)과 함께 쓴다. 규칙은 놓치기 쉬운 구멍을 막는 그물이다.

export function critique(metrics, scene = {}) {
  const issues = [];
  const add = (severity, code, msg, fix) => issues.push({ severity, code, msg, fix });
  const W = metrics.width, H = metrics.height;
  const margin = Math.min(W, H) * (scene.critic?.safeMargin ?? 0.05);

  for (const t of metrics.texts) {
    const large = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700);
    const need = large ? 3 : 4.5;
    if (t.contrastP10 != null && t.contrastP10 < need) {
      add('error', 'contrast', `텍스트 "${t.sample}" 대비 ${t.contrastP10.toFixed(2)}:1 (기준 ${need}:1)`,
        '글자색과 배경의 명도 차이를 키우세요. 배경에 그라디언트가 있으면 글자 뒤 영역을 정리하거나 그림자/판을 까세요.');
    } else if (t.contrastP10 != null && t.contrastP10 < need * 1.4 && t.role !== 'display') {
      add('warn', 'contrast-tight', `텍스트 "${t.sample}" 대비 ${t.contrastP10.toFixed(2)}:1 → 겨우 통과`, '조금 더 여유를 두세요.');
    }
    const b = t.box;
    if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H)
      add('error', 'overflow', `텍스트 "${t.sample}"가 캔버스 밖으로 넘침`, 'maxWidth를 줄이거나 글자 크기를 줄이세요.');
    else if (b.x < margin || b.y < margin || b.x + b.w > W - margin || b.y + b.h > H - margin)
      add('warn', 'margin', `텍스트 "${t.sample}"가 안전 여백(${Math.round(margin)}px) 안으로 들어옴`, '가장자리에서 더 떨어뜨리세요.');
    if (t.lines && t.lines.length > 1) {
      const last = t.lines[t.lines.length - 1].length;
      const avg = t.lines.slice(0, -1).reduce((a, l) => a + l.length, 0) / (t.lines.length - 1);
      if (last <= 3 || last < avg * 0.25)
        add('warn', 'widow', `텍스트 "${t.sample}" 마지막 줄 "${t.lines[t.lines.length - 1]}"이 홀로 떨어짐(고아 단어)`, 'maxWidth를 조정하거나 lines로 직접 줄을 나누세요.');
    }
    if (t.size < Math.min(W, H) * 0.012)
      add('warn', 'tiny-text', `텍스트 "${t.sample}" ${t.size}px → 이 캔버스에서 너무 작음`, '최소 크기를 올리세요.');
  }
  // 텍스트끼리 겹침
  const T = metrics.texts;
  for (let i = 0; i < T.length; i++)
    for (let j = i + 1; j < T.length; j++) {
      const a = T[i].box, b = T[j].box;
      const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
      const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      if (ix * iy > 0.08 * Math.min(a.w * a.h, b.w * b.h))
        add('error', 'text-overlap', `"${T[i].sample}"와 "${T[j].sample}"가 겹침`, '간격을 띄우세요.');
    }
  // 위계: 가장 큰 글자와 다음 글자의 비율
  const sizes = [...new Set(T.map(t => t.size))].sort((a, b) => b - a);
  if (sizes.length >= 2 && sizes[0] / sizes[1] < 1.3)
    add('warn', 'hierarchy', `제목/부제 크기 비율 ${(sizes[0] / sizes[1]).toFixed(2)} → 위계가 약함`, '1.5배 이상으로 대비를 주세요(모듈러 스케일 1.25^2 이상).');
  if (sizes.length > 5) add('info', 'type-sizes', `글자 크기 ${sizes.length}종 → 많음`, '타입 스케일 3~4단계로 정리하세요.');

  // 명도 구조(흑백 변환 테스트)
  const v = metrics.value;
  if (v.std < 0.12) add('warn', 'flat-value', `명도 분산 ${v.std.toFixed(3)} → 흑백으로 보면 밋밋함`, '가장 밝은 곳/가장 어두운 곳을 하나씩 확실히 만드세요(명암 3단계: 밝음·중간·어둠).');
  if (v.dark > 0.02 && v.light > 0.02 && v.mid > 0.85) add('info', 'mid-heavy', '중간 톤이 85% 이상', '초점 영역에 명도 대비를 집중시키세요.');

  // 균형
  const off = Math.hypot(metrics.balance.dx, metrics.balance.dy);
  if (off > (scene.critic?.balance ?? 0.18))
    add('info', 'balance', `시각적 무게중심이 중앙에서 ${(off * 100).toFixed(0)}% 치우침 (dx ${metrics.balance.dx.toFixed(2)}, dy ${metrics.balance.dy.toFixed(2)})`,
      '의도한 비대칭이 아니라면 반대쪽에 요소를 두거나 주 요소를 옮기세요.');
  if (metrics.coverage > 0.9) add('info', 'crowded', `채워진 면적 ${(metrics.coverage * 100).toFixed(0)}% → 숨 쉴 여백이 부족`, '여백을 확보하세요.');
  if (metrics.coverage < 0.04) add('warn', 'empty', `채워진 면적 ${(metrics.coverage * 100).toFixed(0)}% → 너무 비어 보임`, '주 요소를 키우세요.');

  // 색 절제
  if (metrics.colors.length > (scene.critic?.maxColors ?? 7))
    add('info', 'palette', `면적 1.5% 이상인 색 덩어리 ${metrics.colors.length}개`, '주조색·보조색·강조색 60/30/10 비율로 정리하세요.');

  const penalty = { error: 15, warn: 6, info: 2 };
  const score = Math.max(0, 100 - issues.reduce((s, i) => s + penalty[i.severity], 0));
  return { score, issues };
}
