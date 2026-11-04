---
name: minecraft-modeling
description: 마인크래프트용 블록/아이템 텍스처(16×16 픽셀아트)와 큐브 모델(.bbmodel, Java 블록 모델 JSON, 엔티티+애니메이션)을 Atelier로 만들 때의 절차와 감각. 마인크래프트, Blockbench, bbmodel, 텍스처팩, 리소스팩, 모드 모델, 몹/엔티티 모델 요청이면 먼저 읽는다.
---

# 마인크래프트 모델링 · 텍스처 감각

목표는 바닐라 옆에 놓아도 어색하지 않은 결과물이다. 그러면서 기존 몹이나 블록을 복제하지 않는 독자 디자인을 만든다.
Atelier의 다른 작업과 똑같이 **렌더 → 시트를 직접 본다 → 고친다**를 최소 2회 반복한다.

## 명령
```bash
node atelier/cli.js sprite examples/mc/items.mjs --out out/mc   # 16×16 텍스처/아이템 + 검수 시트
node atelier/cli.js mc examples/mc/mossling.mjs --out out/mc     # .bbmodel(+Java JSON) + 3D 미리보기 시트
```
- `sprite` 출력: `<name>.png`, `<name>@8x.png`, (아이템이면) `<name>.item.json`, `<file>.sheet.png`
- `mc` 출력: `<name>.bbmodel`(Blockbench 5.0 형식, 텍스처 내장), `<name>.texture.png`, `<name>.sheet.png`, 블록이면 `<name>.java.json`
- 리소스팩: `node atelier/cli.js pack examples/mc/lantern_post.mjs examples/mc/blocks.mjs examples/mc/items.mjs --out out/pack --ns atelier --pack-format 46`
  → `pack.mcmeta`, `assets/<ns>/{blockstates,models/block,models/item,items,textures}`, `.zip`.
  pack_format 46은 Java 1.21.4다. 다른 버전이면 바꾼다.
  리소스팩은 모습만 바꾼다. 새 블록을 실제로 등록하려면 모드나 데이터팩이 필요하다. 바닐라 블록을 다시 입히려면 `--ns minecraft`를 쓰고 이름을 바닐라 ID로 맞춘다.
  엔티티는 리소스팩 블록 모델이 아니므로 `.bbmodel`을 Blockbench에서 열어 bedrock geometry 등으로 내보낸다.

## 1. 단위와 좌표
- 1블록 = 16유닛 = 16텍셀. **텍셀 밀도는 모델 전체에서 하나**로 둔다(믹셀 금지). 큐브 크기는 정수 유닛으로 한다(비평기가 검사).
- 블록 모델: 좌표 0~16, 허용 범위 -16~32. Java 블록 회전은 **한 축만**, **-45/-22.5/0/22.5/45°**만 쓴다.
- 엔티티(bedrock 형식): 발이 y=0, 중심이 x=z=0이다. **얼굴은 북쪽(-z) 면**에 둔다. 회전은 자유롭다.
- 동쪽 면 텍스처는 왼쪽 끝이 남쪽, 서쪽 면은 왼쪽 끝이 북쪽이다. 북쪽 면을 밖에서 보면 왼쪽이 동쪽이다.

## 2. 텍스처 감각 (16×16)
- **게임이 면 음영을 넣는다**(위 1.0 / 남북 0.8 / 동서 0.6 / 아래 0.5). 블록 텍스처에는 방향 음영을 굽지 않는다. 미리보기도 같은 규칙으로 렌더한다.
- 한 텍스처는 램프 4~6색 + 포인트 1~2색이면 충분하다. `pixelRamp(base, n)`은 어두울수록 파랑·보라 쪽으로, 밝을수록 노랑 쪽으로 색상이 이동한다(hue shifting).
- 노이즈는 2~4px **덩어리**로 만든다. 1px 소금후추 노이즈는 지저분해 보인다. `tileNoise`/`MATERIALS`는 이음새 없이 타일링된다.
- 구조가 있는 패턴(판자, 벽돌)은 줄눈을 가장 어두운 단계로, 판·돌 윗면을 한 단계 밝게 칠한다.
- 블록 텍스처는 **반드시 타일링**되어야 한다. 시트의 3×3 타일링 패널로 확인한다. 의도한 테두리(철판 등)면 `tile:'none'`, 잔디 옆면처럼 가로로만 이어지면 `tile:'x'`.
- 잎·유리처럼 투명 픽셀이 있으면 cutout/translucent 렌더 타입이 필요하다.

## 3. 아이템 스프라이트 감각
- 16×16 캔버스의 75% 이상을 쓴다. 긴 물건(검, 도구, 막대)은 **왼쪽 아래 → 오른쪽 위 45° 대각선**으로 놓는다.
- 대각선은 1:1 계단으로 그린다. 칼날은 한 행에 [밝음, 중간, 어둠] 3픽셀이 계단을 이루게 한다(`examples/mc/items.mjs`).
- 부품 배치는 진행 방향 벡터를 기준으로 한다. 칼날 방향이 (-1,+1)이면 코등이는 그에 수직인 (+1,+1) 방향이다.
- 빛은 왼쪽 위에서 온다. 하이라이트 1px은 1~2개만 쓴다(반짝임). 나머지 1px 점은 지운다.
- 외곽선은 `outline('auto')`를 쓴다. 인접 재질의 어둡고 차가운 색으로 색상 계열마다 하나씩 만들어서 팔레트가 불어나지 않는다.
- 둥근 물체(보석, 열매, 병)는 `poly`/`ellipse`로 마스크를 만들고 `autoShade(mask, ramp)`로 입체를 준다. 그다음 깎인 면, 반사광, 하이라이트를 손으로 더한다.
- 확인 항목: 인벤토리 슬롯(×3)과 핫바(×2)에서 3초 안에 무엇인지 보이는가? 흑백으로 봐도 형태가 읽히는가?

## 4. 큐브 모델 감각
- **실루엣이 먼저다.** 시트의 흰색 실루엣 패널만 보고 무엇인지 알 수 있어야 한다. 사각 기둥처럼 보이면 비율을 과장한다.
- 귀여운 몹: 머리를 몸보다 넓게(머리 폭 ≥ 몸 폭 + 2), 다리는 짧게, 눈은 얼굴 중간보다 아래, 눈 사이를 넓게.
- 위협적인 몹: 어깨와 팔을 넓게, 머리는 작고 낮게, 앞으로 숙인 자세(body rotation x 10~20°).
- 명도 3단 분리: 머리(가장 밝음) / 몸(중간) / 팔다리(어둠). 같은 재질이어도 base를 바꿔서 덩어리가 구분되게 한다.
- 캐릭터 크기에서는 노이즈 대비를 낮춘다(`contrast 0.8~1`, `cracks:false`). 블록용 질감을 그대로 쓰면 지저분하다.
- 얇은 장식(풀, 새싹, 체인, 깃털)은 두께 0 평면 두 장을 ±45°로 교차시킨다. 텍스처는 `paint`로 투명 배경 위에 그린다.
- 같은 평면에 같은 방향으로 겹친 면은 z-fighting을 일으킨다. 겹치는 덮개는 `inflate` 0.25를 주거나 1텍셀 들인다. 비평기가 검사한다.
- 발광 부품은 `light: 15`. 게임처럼 미리보기에서도 음영 없이 렌더된다.
- 철창·창살은 테두리만 칠하고 가운데를 투명하게 둔 바깥 큐브 + 안쪽 발광 큐브로 만든다(`lantern_post`).

## 5. 뼈대 · 애니메이션
- bone 피벗은 **관절 위치**에 둔다: 목(머리 아래 가운데), 어깨(팔 위쪽 안쪽), 엉덩이(다리 위 가운데).
- 계층: root → body → head/arms, root → legs. 몸이 위아래로 흔들려도 다리가 땅에 붙어 있다.
- 좌우 쌍은 `_l`/`_r`로 이름 짓고 피벗 x를 부호만 반대로 둔다(비평기가 대칭 검사).
- 걷기: 다리 ±20~30°를 반대 위상으로, 팔은 같은 쪽 다리와 반대로 ±15~20°, 몸통은 한 주기에 두 번 0.5유닛 튄다, 머리는 z ±3° 흔든다. 길이 1초, loop.
- 시트의 4프레임 애니메이션 패널로 동작이 자연스러운지 확인한다.

## 5.5 Bedrock · 블록스테이트 · 스킨/갑옷
- **Bedrock:** `mc`가 엔티티마다 `.geo.json`(1.12.0)과 `.animation.json`(1.8.0)을 함께 낸다.
  `node atelier/cli.js addon examples/mc/mossling.mjs --out out/addon`을 실행하면 `.mcaddon`(RP+BP)이 나오고, 게임에서 `/summon atelier:mossling`으로 소환한다.
  좌표 변환은 Blockbench 코덱과 같다(x 반전, 회전 x·y 반전, 위·아래 면 UV 반전). `node test/bedrock-roundtrip.mjs <엔티티...>`로 왕복 검증한다.
- **블록스테이트:** `cubes` 대신 `parts: { 이름: [큐브...] }`와 `blockstate`(Java 문법, model에 부품 이름)를 쓴다.
  - 방향 블록은 `variants`의 `facing=*`에 `y: 0/90/180/270`을 준다. 기본 모델은 북쪽 벽(z=0)에 붙인다(`wall_sconce`).
  - 연결 블록은 `multipart`를 쓴다. 기둥은 항상 붙이고, 가로대는 "북쪽으로 뻗은" 하나만 만들어 y 회전으로 재사용한다. `uvlock:true`(`garden_fence`).
  - 시트에 상태별 패널이 자동으로 붙는다(variants 각각, multipart 대표 조합).
- **스킨(64×64):** `new Skin({slim})` → `fillPart / chars / band / draw / shade / fold`. 면 이름은 north=정면, east=몹의 오른쪽.
  - 기본 층은 빈틈없이 칠한다(`critiqueSkin`). 후드·망토·소매처럼 두께 있는 것은 오버레이 층에 그린다.
  - **품질 핵심:** 평면 노이즈만 쓰면 아마추어처럼 보인다. 반드시 `shade(part)`(위는 밝게, 아래는 어둡게, 팔에 가려지는 안쪽 면은 AO)와 `fold`(주름)를 넣는다.
  - 얼굴은 눈 2px(흰자+눈동자), 코는 그림자 1~2px, 입은 1~2px. 머리카락은 앞이마 2줄과 옆머리로 처리한다.
- **갑옷(64×32):** `new Armor('humanoid' | 'humanoid_leggings')`. 왼쪽 팔다리는 오른쪽 UV를 거울로 재사용한다(바닐라와 동일).
  - `keepRows`로 부위 일부만 남긴다(견갑 = 팔 위 5줄, 부츠 = 다리 아래 4줄). 남기지 않은 부위의 **아래 면도 비워야** 손 높이에 판이 뜨지 않는다.
  - 투구는 얼굴 열린 형태 + 코 보호대 + 볼 보호대로 만든다. 눈높이 검은 띠는 선글라스처럼 보인다.
  - 트림(금색 띠)으로 덩어리를 나누고, 흉갑 중앙에 포인트(보석) 하나를 둔다.
  - `playerSpec(skin, { armor })`로 착용 모습을 미리 본다. 미리보기 텍스처는 64×128로 합친 것이고, 실제 파일은 `extraFiles`로 따로 저장된다.
  - 장비 텍스처 경로(`textures/entity/equipment/humanoid/…`)와 정의 JSON 위치는 버전마다 다르다(1.21.2 이후 변경). 쓰기 전에 대상 버전을 확인한다.

## 5.6 RPG 이펙트(VFX)
조사 보고서는 `docs/research/mc-rpg-effects.md`, jar로 직접 확인한 사실은 `docs/research/verification.md`에 있다.
```bash
node atelier/cli.js vfx examples/mc/rpg_vfx.mjs --out out/vfx
```
```bash
node atelier/cli.js pack examples/mc/rpg_vfx.mjs --out out/pack --name atelier_rpg
```
- **생성기**(`atelier/mc/vfx.js`): `slashArc` `shockRing` `hitSpark` `magicCircle` `beam`. 모두 흑백(흰색 = 최대 밝기)으로 만든다. 서버가 원소 색을 곱해서 입힌다.
- **용도(use)별 방식:**
  - `item`(일회성 연출): 프레임별 양면 평면 모델 + `items/vfx_<name>.json`. `range_dispatch`로 `custom_model_data.floats[0]` = 프레임 번호, `tints`로 `colors[0]` = 원소 색.
  - `loop`(마법진, 빔 등 반복): 세로 스트립 + `.png.mcmeta`. 프레임이 정사각형이 아니면 `width`/`height`를 반드시 넣는다.
  - `particle`: 바닐라 파티클을 재텍스처한다. 그 파티클 **전체가 바뀐다.** `generic_*`를 공유하는 25종(연기, 구름, 포탈, dust…)은 건드리지 않는다. 프레임 수와 크기는 바닐라와 같게 한다(sweep_attack은 32×32 × 8).
- **감각:**
  - 일회성 연출은 "커짐 → 정점 → 꼬리부터 소멸" 순서로 진행한다. 인접 프레임의 변화가 35%를 넘으면 깜빡이는 것처럼 보인다.
  - 반복 효과는 대칭을 이용해 마지막 프레임과 첫 프레임이 이어지게 한다(마법진은 룬 한 칸 간격만큼 회전).
  - 빛기둥처럼 흐르는 효과는 **형태를 바꾸지 말고**, 위로 흐르는 입자로만 움직임을 준다. 폭을 출렁이게 하면 꽃병처럼 보인다.
  - 흰 하이라이트는 틴트(곱연산)를 넘을 수 없다. 더 밝은 심이 필요하면 별도 요소나 레이어로 분리한다.
- **실서버 확인이 필요한 항목:** 파티클 프레임 선택 방식과 렌더 타입, `.mcmeta`의 전역 시계 여부, 디스플레이 반투명 정렬, `/summon` SNBT 세부 문법.

## 5.7 블라인드 평가에서 배운 디테일 규칙 (`bench/RESULTS.md`)
- **아이템:** 외곽선 색을 하나로 통일하고, 캔버스 가장자리에 1px 여백을 둔다(비평기가 검사). 실루엣 밖에 떠 있는 반짝임 픽셀은 지운다.
- **아이템 결정·보석:** 자동 음영 램프의 가장 어두운 단계(남색)는 가장자리 노이즈가 된다. 밝은 4단만 쓴다. 넓은 결정 묶음은 도끼날처럼 보이므로 진행 방향으로 길쭉하게 만든다.
- **블록:** 구조(줄눈)를 먼저 확정하고 끝까지 연속시킨다. 이끼나 때는 구조를 덮지 말고 어두운 톤으로 얹는다. 큰 덩어리 하나는 타일링에서 대각선 반복으로 보이므로 작은 덩어리로 분산한다.
- **엔티티:** 2단 갓·지붕은 케이크처럼 보이므로 3단 이상 돔으로 만든다. 다리 사이를 띄워 실루엣을 분리한다. 디더 재질은 큐브 면에서 체크 노이즈가 된다. 텍스처 밀도는 부위마다 고르게 한다.

## 6. DSL 요약 (`atelier/mc/model.js`)
```js
export default {
  name, type: 'block' | 'entity', density: 1,
  materials: { key: { mat: 'stone|dirt|sand|grass|planks|log|cobble|leaves|ore|bricks|metal|cloth|fur|skin|moss|glass|glow|solid', base, ...옵션 } },
  bones: [{ name, pivot:[x,y,z], parent, rotation }],
  cubes: [{ name, bone, from, to, material, light, inflate,
            rotation: { axis, angle, origin } | [x,y,z] (+pivot),
            faces: { north: { material, chars:{x,y,rows,legend}, draw:c=>{}, hidden, share } } }],
  animations: { walk: { length, loop, bones: { leg_l: { rotation: { 0:[..], 0.5:[..] }, position: {...} } } } },
}
```
`material: { paint: (w, h, face) => PixelCanvas }`로 면 텍스처를 직접 그릴 수 있다.

## 7. 픽셀 캔버스 API (`atelier/pixel.js`)
`new PixelCanvas(16)` → `set get rect line ellipse poly chars hline vline` · `outline('auto')` ·
`autoShade(mask, ramp, {light, radius})` · `noiseFill(ramp, {cell, contrast})` · `speckle` ·
`paste crop flipX rotate90 scale(k)` · `toPNG()` / `pixelRamp(base, n, {hueShift, spread})` / `tileNoise` / `bayer`

## 사용자 레퍼런스에서 배운 문법 (고해상도 복셀 무기 3종 + 굥 GYONG RPG 스킬 영상 썸네일)
**무기 — "고해상도 스프라이트를 그리고 두께 있게 뽑는다"** (`atelier/mc/voxel.js` extrude)
- 재질 칠한 큰 큐브 10여 개(v3)는 장난감처럼 보인다. 레퍼런스는 64px급 픽셀아트를 레이어별 두께(자루 4~5px, 코등이 6px, 날 등 2.5px, 날 1px, 보석 7px)로 돌출한 것.
- 색: 한 색 계열에서 **거의 검정 → 원색 → 분홍 → 흰색까지 전 명도**를 쓴다. 중간 명도 3~4단만 쓰면 단조롭다.
- 날: 톱니(앞으로 기운 비대칭 이빨), 경사면 경계를 따라 **끊기지 않는 1px 흰 하이라이트 선**(비율이 아니라 날에서의 거리로 정해야 끝에서도 안 끊김), 홈(어두운 선 + 바로 아래 밝은 턱).
- 대비: 원색 날은 **거의 검은 금속의 가시 코등이·등 가시**로 감싼다(명도 대비 + 실루엣 장식). 길이 방향으로 뿌리 어둡고 끝 밝게.
- 가림 제거: 두꺼운 레이어 안에 묻히는 픽셀은 지운다(같은 평면 z-fighting 방지, 큐브 수 절약).
**이펙트 — "가는 리본 여러 가닥"** (`atelier/mc/ribbon.js`)
- 넓게 칠한 초승달 한 장 = 2010년대 느낌. 레퍼런스는 **가늘고 긴, 양끝 뾰족한 선 2~4가닥**이 반지름·시작이 살짝 다르게 겹친다. 단면은 흰 심 → 분홍 → 원색 → 짙은 가장자리.
- 시간: 머리가 앞 40%에 호를 다 그리고, 꼬리가 따라붙으며 가늘어져 깔끔히 사라진다(늘어지는 잔상 금지).
- 3D: 한 베기를 기울기가 10~25° 다른 평면 2~4장으로 1틱씩 어긋나게 겹치면 몸을 휘감는 궤적이 된다.
- 입자: 궤적 머리에서 접선 방향으로 꽃잎(물방울형, 밝은 쪽 흰 점)이 흩날린다. 피 웅덩이·원뿔 가시보다 훨씬 고급스럽다.
- 연타 구분: 가닥 수(2→3→4)·크기·착지 연출(가는 고리 2겹, 솟는 빛줄기, 꽃잎 폭발)로 단계적으로 키운다.
