# 비교 과제 2: 직업 "피의 군주(Blood Lord)" — 마인크래프트 RPG 에셋 세트

양쪽(일반 Claude / Atelier)에 똑같이 주는 브리프다. 외부 이미지 생성 서비스나 AI는 쓰지 않고, 코드로 직접 만든다.

## 세계관
피의 군주는 피를 낫에 깃들여 싸우는 근접 직업이다. 무대는 핏빛 하늘, 붉은 늪, 뼈와 흑요석이 널린 "피의 땅"이다.
색은 검붉은 피, 흑철(어두운 금속), 뼈색 정도를 기준으로 하되, 세부는 자유다.

## 대상 플랫폼
Java Edition 리소스팩 + ModelEngine(플러그인) 서버. 텍셀 밀도는 바닐라(1유닛 = 1텍셀)를 기준으로 한다.

## 산출물 (6가지) — 형식을 지켜야 같은 뷰어로 비교할 수 있다
모든 파일은 각자의 폴더(`bench2/<side>/`) 아래에 아래 경로로 둔다.

1. **3D 무기 "피의 낫":** `weapon/blood_scythe.bbmodel`
   - Blockbench 프로젝트 형식(.bbmodel, JSON)이고 텍스처는 내장(data URL)한다.
   - 좌표: **손으로 쥐는 지점이 원점(0,0,0)**, 자루는 **+Y 방향**(위로 길게), 낫날은 위쪽 끝에서 **-Z(앞) 방향**으로 휜다.
   - 선택: `weapon/blood_scythe.png`(16×16 인벤토리 아이콘)
2. **갑옷 풀세트(투구·흉갑·레깅스·부츠):**
   - `armor/humanoid.png`(64×32, 바닐라 갑옷 레이어1 배치: 투구·흉갑·팔·부츠)
   - `armor/humanoid_leggings.png`(64×32, 레이어2: 레깅스)
   - `armor/icons/helmet.png`, `chestplate.png`, `leggings.png`, `boots.png`(각 16×16)
3. **기본 공격 3연타 이펙트:** `fx/basic_attack/timeline.json` + 이 파일이 참조하는 PNG 프레임들. **1타·2타·3타가 눈으로 구분되어야 한다.**
4. **직업 스킬 1종(자유):** `fx/skill/timeline.json` + PNG. `timeline.json`의 `name`에 스킬 이름과 한 줄 설명을 적는다.
5. **펫 1종:** `pet/pet.bbmodel`. 엔티티는 북쪽(-Z)을 바라보고 발이 y=0에 닿는다. 애니메이션은 최소 `idle`, `walk`.
6. **보스 1종(피의 땅 보스, 일반 몹의 2~3배 크기):** `boss/boss.bbmodel`. 엔티티 규칙은 펫과 같다. 애니메이션은 최소 `idle`, `walk`, `attack`.

`.bbmodel`의 애니메이션은 Blockbench 5.0 형식(meta.format_version "5.0")이다. 회전값은 Blockbench 화면에 보이는 값 그대로 쓴다.

## timeline.json 형식 (이펙트 공통)
단위는 블록, 틱은 20 tick = 1초. 좌표는 플레이어 발 기준이고, 플레이어는 북쪽(-Z)을 바라본다. 이펙트는 서버가 item_display 평면으로 띄운다고 가정한다.
```json
{
  "name": "스킬 이름 — 한 줄 설명",
  "duration_ticks": 40,
  "tracks": [
    {
      "id": "hit1_slash",
      "frames": ["hit1_0.png", "hit1_1.png"],
      "ticks_per_frame": 1,
      "start_tick": 0,
      "end_tick": 8,
      "size": [3, 3],
      "billboard": "fixed",
      "tint": "#ff2030",
      "keys": [
        { "tick": 0, "translation": [0, 1.2, -1.5], "rotation": [0, 0, 0], "scale": [1, 1, 1] },
        { "tick": 8, "translation": [0, 1.2, -1.8], "rotation": [0, 0, 30], "scale": [1.3, 1.3, 1] }
      ]
    }
  ],
  "player": [
    { "tick": 0, "arm_r": [-120, 0, 0], "body": [0, 20, 0] }
  ]
}
```
- `frames` 경로는 timeline.json 기준 상대경로다. 평면은 기본으로 XY 평면(앞을 봄)이고, `rotation`(도, X→Y→Z 순서)으로 눕히거나 돌린다.
- `billboard`: `fixed` | `center`(항상 카메라를 봄) | `vertical`
- `tint`: 텍스처에 곱하는 색(선택). 흑백 텍스처를 쓰면 원소 색을 입힐 수 있다.
- `player`(선택): 연출 중 플레이어 자세 키프레임(도). `arm_r`, `arm_l`, `body`, `head`. 뷰어가 낫을 든 플레이어를 이 자세로 움직인다.
- 키프레임 사이는 선형 보간이다(디스플레이 엔티티 보간과 같다).

## 평가
- 출처를 모르는 평가자가 같은 뷰어로 렌더한 결과를 블라인드로 비교한다.
- 기준: 브리프 적합성, 형태·실루엣, 색·명도, 디테일·완성도, 전문성(출시 가능성), 그리고 이펙트는 **3연타 구분과 타격감**.
