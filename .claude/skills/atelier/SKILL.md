---
name: atelier
description: Claude가 외부 이미지 생성 서비스 없이 직접 디자인할 때 쓰는 작업 절차와 디자인 DSL 레퍼런스. 로고, 아이콘, 포스터, 일러스트, 배너, 카드, 썸네일 등 시각물을 "만들어 달라"는 요청이면 먼저 읽는다.
---

# Atelier — Claude 디자이너 모드

너는 픽셀을 찍는 손이 아니라 **아트 디렉터**다. 의도를 장면 DSL로 쓰고, 엔진이 그리고,
**렌더된 결과를 반드시 눈으로 본 뒤** 고친다. 보지 않고 넘기는 결과물은 없다.

## 0. 절대 규칙
1. 렌더 → `out/<name>.sheet.png`를 Read로 **직접 본다** → 비평 → 수정. 최소 2회 반복한다.
2. 규칙 점수 100점은 "기본 실수가 없다"는 뜻일 뿐이다. 콘셉트, 감정, 초점, 독창성은 네 눈으로 판단한다.
3. 색은 hex를 직접 쓰지 말고 토큰(`$primary.500`)을 쓴다. 팔레트는 시드 색 하나와 배색 규칙에서 나온다.
4. 버전을 남긴다(`name-v1`, `name-v2`…). 무엇을 왜 바꿨는지 파일 머리 주석에 적는다.
5. 실존 브랜드, 작가, 캐릭터, 기존 게임의 모습은 복제하지 않는다.

## 1. 작업 절차
1. **브리프:** 목적, 보는 사람, 사용되는 크기/매체, 느낌 키워드 3개, 꼭 들어갈 텍스트를 정리한다.
2. **콘셉트 3개:** 서로 다른 방향(예: 기하학적 / 유기적 / 타이포 중심)의 썸네일을 빠르게 만든다.
   `node atelier/cli.js compare a.json b.json c.json`로 나란히 비교해서 하나를 고른다.
3. **명도 먼저:** 흑백으로 봤을 때 밝음·중간·어둠 3덩어리가 읽히는지 확인한다. 색은 그다음이다.
4. **초점 하나:** 가장 강한 대비(명도·채도·온도·크기)는 주인공 한 곳에만 준다.
5. **디테일:** 입체(`shade`), 질감(`grain`, `texture`), 빛(`glow`), 대기원근(멀수록 밝고 흐리게).
6. **검수 루프:** 시트의 각 패널로 아래 질문에 답한다.
   - 원본: 3초 안에 무엇인지, 어떤 기분인지 전달되나?
   - 구도: 무게중심(●)이 의도한 곳에 있나? 3분할 교점을 활용했나?
   - 흑백: 주인공이 가장 밝거나 가장 어두운가?
   - 스퀸트: 흐리게 봐도 덩어리 3~5개로 정리되나?
   - 작은 크기: 24px에서도 알아보나? (아이콘/썸네일은 필수)
   - 확대: 가장자리가 지저분하거나, 의도치 않게 겹치거나, 글자가 잘린 곳은 없나?
7. **전달:** 최종 PNG(필요하면 `--scale 2`), SVG 원본, 사용 토큰을 함께 준다.

## 2. 명령
```bash
node atelier/cli.js render examples/x.json --out out      # png, svg, sheet.png, report.json
node atelier/cli.js render examples/x.mjs --out out --scale 2
node atelier/cli.js compare a.json b.mjs c.json --out out # out/compare.png
node atelier/cli.js palette "#e8590c" split --out out     # 토큰 확인
```
처음 실행하는 환경이면 `bash scripts/setup.sh`(Pretendard 폰트 설치)를 먼저 실행한다.

## 3. 장면 DSL
최상위: `width`, `height`, `palette: {seed, harmony}`, `tokens: {name: "#hex"}`, `background`,
`children`, `post: {grain, vignette}`, `critic: {safeMargin, balance, maxColors}`.
`.mjs` 파일은 `export default () => scene` 형태로 쓴다. 반복이나 계산이 필요하면 이쪽을 쓴다.

**배색 규칙(harmony):** `mono` `analogous` `complementary` `split` `triadic` `tetradic`
→ 토큰 `primary` `secondary` `accent` `neutral`, 각각 단계 `50 100 200 … 900 950`.

**칠하기(fill):** `"$primary.500"` | `"#hex"` | `{linear:{angle, stops:[[0,c,op],[1,c]]}}` | `{radial:{cx,cy,r,stops}}`
(angle 0 = 왼쪽→오른쪽, 90 = 위→아래)

**형태 노드**
| type | 주요 속성 | 쓰임 |
|---|---|---|
| rect | x y w h r | 판, 카드 |
| circle / ellipse | cx cy r / rx ry | 해, 달, 빛 웅덩이 |
| squircle | x y w h n | 앱 아이콘 외곽 |
| polygon / star | cx cy r sides / points inner | 기하 모티프 |
| curve | points [[x,y]…], closed, tension | 점 몇 개로 매끄러운 곡선 |
| brush | points, width(숫자 또는 [시작,중간,끝]), taper, jitter | 붓 획, 머리카락, 풀잎, 서명 |
| blob | cx cy r(또는 rx ry) points wobble seed | 구름, 덤불, 바위, 얼룩 |
| ridge | w y bottom amp freq octaves seed | 산맥, 파도, 언덕 레이어 |
| path | d | 직접 그린 SVG 경로 |
| text | x y text/lines size weight fill align maxWidth letterSpacing upper role | 타이포 |

**공통 속성:** `fill` `stroke:{color,width,dash,cap}` `opacity` `blend`(multiply/screen/overlay/soft-light)
`rotate` `scale` `origin` `translate` `transform`
- `shade:{light:도, strength, highlight, shadow, spec, rim}` → 입체감. light는 빛이 오는 방향이다(315 = 왼쪽 위).
- `effects:[…]` → `shadow{dx,dy,blur,color,opacity,spread}` `glow` `innerShadow` `innerGlow` `blur{r}` `rough{scale,freq}` `grain{amount}`
- `texture: node` → 형태 안에만 그려지는 패턴(해칭, 점, 줄무늬)

**구조 노드**
- `group{children, clip: shapeNode, effects}`
- `scatter{count, seed, area{x,y,w,h}, child(또는 배열), scale[a,b], rotate[a,b], opacity[a,b], sortY}` → 별, 풀, 꽃잎, 군중
- `repeat{count, child, dx, dy, drot, origin, fade}` → 리듬, 패턴, 방사형

## 3.5 레이아웃 엔진 (텍스트가 있는 디자인은 이것을 쓴다)
- **실측 줄바꿈:** `text`에 `maxWidth`를 주면 실제 폰트로 재서 어절 단위로 끊는다. 줄머리 금칙(. , ) 」 등)과 고아 단어 방지가 자동으로 적용된다.
- **`balance: true`:** 제목을 고른 길이로 끊는다. 2줄이면 `— , · :` 뒤에서 끊는 것을 강하게 선호하고, 필요하면 글자 크기를 최대 15% 줄인다. 원치 않으면 `semantic:false`.
- **`fit: { maxLines, minSize }`:** 줄 수나 너비를 넘으면 글자 크기를 자동으로 줄인다.
- **`stack`:** `{ type:'stack', x, y, w, gap, align:'left|center|right', anchor:'top|bottom|middle', children }`
  자식은 `text`(maxWidth=w 자동), `rect`(h, w 기본=w), `space{h}`이고, 자식마다 `gapBefore`를 줄 수 있다.
  `anchor:'bottom'`이면 y가 블록의 아래 끝이 된다(포스터 하단 정보 블록).
- **반응형:** `.mjs` 장면 함수는 `({ width, height, format })`를 받는다.
  `render x.mjs --formats square,portrait,story,landscape`(또는 `1500x500`)로 규격별 결과와 비교 시트(`x.formats.png`)를 만든다.
  짧은 변의 1%를 단위 `u`로 잡고, 가로형이면 좌우 배치, 세로형이면 상하 배치로 분기한다(`examples/market.mjs`).

## 4. 디자인 기본기 (빠른 참조)
- **타입 스케일:** 기준 크기 × 1.25ⁿ(차분함) 또는 1.333ⁿ / 1.5ⁿ(극적). 제목은 부제의 1.5배 이상. 글자 크기는 3~4단계만 쓴다.
- **큰 제목:** 자간을 -2~-3%로 좁힌다(엔진이 48px 이상에서 자동 적용). 대문자 라벨은 자간을 +5~10% 넓힌다.
- **여백:** 캔버스 짧은 변의 6~8%를 바깥 여백으로 둔다. 요소 간격은 8의 배수를 쓴다. 관련된 것은 가깝게, 다른 것은 멀게 둔다.
- **색 비율:** 주조색 60 / 보조색 30 / 강조색 10. 강조색은 초점에만 쓴다.
- **온도 대비:** 차가운 배경 위에 따뜻한 주인공을 두면 즉시 초점이 생긴다(반대도 가능).
- **대기원근:** 먼 레이어일수록 배경색에 가깝게, 대비를 약하게, 위쪽에 둔다.
- **빛 일관성:** 한 장면의 모든 `shade.light`는 같은 방향이어야 한다.
- **그림자:** 순검정 대신 배경색을 어둡게 한 색을 쓴다. 빛 반대 방향으로 오프셋한다.
- **질감:** 평평한 벡터 느낌을 줄이려면 `post.grain` 0.04~0.08을 쓴다. 더 넣으면 지저분해진다.
- **아이콘:** 실루엣이 먼저다. 요소는 3개 이하로 하고, 24px에서 테스트한다. 외곽은 squircle n=5.
- **포스터:** 큰 이미지 하나 + 큰 제목 하나 + 작은 정보 덩어리 하나. 정보는 한쪽 정렬로 묶는다.

## 4.5 블라인드 평가에서 배운 규칙 (`bench/RESULTS.md`)
- **반복 요소:** 규칙적인 막대 반복은 UI 아이콘(햄버거 메뉴)처럼 보인다. 반사나 물결은 길이·위치·굵기를 불규칙하게, 아래로 갈수록 가늘고 흐리게 만든다.
- **정렬 기준:** 원 중심이 아니라 **실제 시각적 덩어리**(초승달은 두꺼운 쪽)에 맞춘다.
- **빛 표현:** 어두운 배경 위에 반투명 따뜻한 색을 그냥 얹으면 갈색으로 탁해진다. `blend:'screen'` + glow + 밝은 심을 쓰고, 넓고 흐린 빛 번짐을 바탕에 깐다.
- **프레임 경계:** 빛줄기, 곡선, 구름이 캔버스 밖으로 굵게 잘리면 미완성처럼 보인다. 양 끝을 가늘게 해서 프레임 안에서 끝낸다.
- **축 정렬:** 중앙에 일러스트를 두면 글 블록도 중앙 정렬해 축을 맞춘다. 왼쪽 정렬이면 일러스트도 왼쪽 축에 맞춘다.
- **수평선 실루엣:** 능선(ridge)은 시작점이 수직으로 잘린다. 섬이나 산은 양 끝이 수평선으로 내려오는 닫힌 `curve`로 그린다.
- **무게중심:** 주 요소가 한쪽으로 쏠리면 반대편에 낮은 대비의 보조 덩어리를 둔다(대기원근).
- **공백:** 일러스트와 텍스트 사이에 죽은 공간이 생기면 일러스트를 키우거나 내린다.
- **자간:** 영문 대문자 라벨의 자간은 크기의 6% 안팎으로 한다. 과하면 흩어져 보인다.

## 5. 일러스트 요령 (코드로 "그리기")
- 큰 덩어리(blob, ridge)를 먼저 깔고, 중간 형태(curve, polygon)를 올리고, 마지막에 디테일(brush, scatter)을 넣는다.
- 유기물(나무, 구름, 캐릭터 몸)은 `blob`/`curve`로 그리고 `shade`로 입체를 준다. 직선 도형만 쓰면 딱딱해진다.
- 선화는 `brush`에 `taper` 0.6~0.9를 주면 손맛이 난다. `jitter` 0.1로 미세하게 흔든다.
- 반복 요소(별, 풀, 빗방울)는 `scatter`로 뿌린다. 크기와 투명도에 범위를 줘서 깊이감을 만든다.
- 빛은 `glow` + `blend:"screen"` 원형 그라디언트, 어둠은 `blend:"multiply"`로 표현한다.
