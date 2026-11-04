# Atelier

외부 이미지 생성 서비스 없이 **Claude가 혼자 디자인**하게 만드는 로컬 엔진입니다.

- **손:** 고수준 그리기 DSL(곡선, 붓 획, 유기적 형태, 입체 음영, 질감, 빛, 절차적 배치, 타이포)
- **눈:** 로컬 Chromium 렌더 → 비평 시트(흑백, 스퀸트, 축소, 확대, 구도 오버레이) → Claude가 직접 보고 수정
- **감각:** OKLCH 색 토큰, 자동 규칙 비평, `.claude/skills/atelier/SKILL.md` 작업 절차

| 아이콘 v1 → v2 | 포스터 v1(52점) → v2(100점) |
|---|---|
| <img src="docs/showcase/icon-v1.png" width="180"> <img src="docs/showcase/icon-v2.png" width="180"> | <img src="docs/showcase/poster-v1.png" width="150"> <img src="docs/showcase/poster-v2.png" width="150"> |

## 사용법
```bash
bash scripts/setup.sh
```
```bash
node atelier/cli.js render examples/poster-v2.mjs --out out
```
```bash
node atelier/cli.js compare examples/icon-v1.json examples/icon-v2.json --out out
```
```bash
node atelier/cli.js palette "#e8590c" split --out out
```

실행하면 `out/`에 `png`, `svg`, `sheet.png`(비평 시트), `report.json`이 생깁니다.
기획과 로드맵은 [docs/PLAN.md](docs/PLAN.md)에 있습니다.
