# Atelier

외부 이미지 생성 서비스 없이 **Claude가 혼자 디자인**하게 만드는 로컬 엔진입니다.
그래픽(포스터, 아이콘, 일러스트, SNS 카드)과 **마인크래프트 텍스처·큐브 모델(.bbmodel)**을 만듭니다.

- **손:** 고수준 그리기 DSL(곡선, 붓 획, 유기적 형태, 입체 음영, 질감, 빛, 절차적 배치), 픽셀아트 엔진, 큐브 모델 DSL
- **눈:** 로컬 Chromium·three.js 렌더 → 비평 시트(흑백, 스퀸트, 축소, 확대, 실루엣, 애니메이션 프레임, 타일링) → Claude가 직접 보고 수정
- **감각:** OKLCH 색 토큰, 실측 타이포 레이아웃, 자동 비평기, 스킬 문서 2종
  (`.claude/skills/atelier`, `.claude/skills/minecraft-modeling`)

| 그래픽 | 반응형(1개 함수 → 4개 규격) |
|---|---|
| <img src="docs/showcase/icon-v1.png" width="120"> → <img src="docs/showcase/icon-v2.png" width="120"> <img src="docs/showcase/poster-v1.png" width="96"> → <img src="docs/showcase/poster-v2.png" width="96"> | <img src="docs/showcase/market.formats.png" width="420"> |

| 마인크래프트 블록 모델 | 엔티티 모델 + 걷기 애니메이션 |
|---|---|
| <img src="docs/showcase/mc/lantern_post.sheet.png" width="380"> | <img src="docs/showcase/mc/mossling.sheet.png" width="380"> |

## 사용법

폰트 설치(1회):
```bash
bash scripts/setup.sh
```
```bash
npm install
```

그래픽:
```bash
node atelier/cli.js render examples/poster-v2.mjs --out out
```
```bash
node atelier/cli.js render examples/market.mjs --formats square,portrait,story,landscape --out out
```
```bash
node atelier/cli.js compare examples/icon-v1.json examples/icon-v2.json --out out
```

마인크래프트:
```bash
node atelier/cli.js sprite examples/mc/blocks.mjs examples/mc/items.mjs --out out/mc
```
```bash
node atelier/cli.js mc examples/mc/lantern_post.mjs examples/mc/mossling.mjs --out out/mc
```
```bash
node atelier/cli.js pack examples/mc/lantern_post.mjs examples/mc/blocks.mjs examples/mc/items.mjs --out out/pack
```

생성 파일
- 그래픽: `png`, `svg`, `sheet.png`(비평 시트), `report.json`
- 마인크래프트: `.bbmodel`(Blockbench 5.0), Java 블록 모델 JSON, 텍스처 PNG, 3D 미리보기 시트, 리소스팩 폴더와 zip

## 기존 Claude와 비교 (블라인드 평가)
같은 브리프 5개(앱 아이콘, 한글 포스터, 16×16 아이템, 타일링 블록, 엔티티 모델)를 두 방식으로 만들어 비교했습니다. 출처를 모르는 평가자 2명이 채점했습니다.

| | 기존 방식(한 번에 작성) | Atelier |
|---|---|---|
| 평가자1 합계/250 | 110 | **160** |
| 평가자2 합계/250 | 117 | **168** |
| 승패 | 0승 | **10승** |

자세한 내용과 한계는 [bench/RESULTS.md](bench/RESULTS.md)에 있습니다. 아직 출시 가능 수준(기준당 8점)에는 못 미치고, 지금은 기준당 6.4~6.7점입니다.

## RPG 이펙트
```bash
node atelier/cli.js vfx examples/mc/rpg_vfx.mjs --out out/vfx
```
베기 궤적, 충격파, 타격 스파크, 마법진(반복), 빛기둥(반복)을 흑백으로 만들고, 서버가 원소 색을 입힙니다.
리소스팩에는 `range_dispatch`와 `tints`, `.mcmeta`로 들어갑니다.
조사 내용은 [docs/research/mc-rpg-effects.md](docs/research/mc-rpg-effects.md), 바닐라 jar로 검증한 결과는 [docs/research/verification.md](docs/research/verification.md)에 있습니다.

기획과 로드맵은 [docs/PLAN.md](docs/PLAN.md)에 있습니다.
