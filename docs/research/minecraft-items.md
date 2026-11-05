# RPG 서버 재료 아이템 연구

## 1. 바닐라 재료 아이콘 실측(16×16, 32종: 보석·파편·주괴·가루·막대·몹 드롭·구슬·병)
| 항목 | 값 |
|---|---|
| 색 수 | 중앙값 8(대부분 6~10) |
| 캔버스 채움 | 중앙값 38%(13~61%), 실루엣 12~14px |
| 외곽선 | 가장자리 픽셀의 67%가 재질의 가장 어두운 단계, 안쪽보다 ΔL 22 어두움. 검정이 아니다 |
| 빛 | 왼쪽 위가 오른쪽 아래보다 명도 +5~16 |
| 명도 폭 | 보석·금속은 40 → 100(순백 반짝임 1~3px) |
| 채도(p90) | 유색 재질 13~22 |

**형태 문법:**
- 긴 결정: 대각선으로 선다.
- 컷 보석: 크라운은 밝고, 파빌리온은 면이 나뉜다(왼쪽 밝음, 오른쪽 어두움).
- 주괴: 위·앞·옆 세 면이 보이는 막대.
- 가루: 둥근 무더기 + 반점.
- 구슬: 둥근 명암 + 흰 점.
- 막대: 대각선 1:1.

## 2. RPG 서버 아이템 체계(조사: minecraft.wiki, MMOItems·Nexo·ItemsAdder 문서, Wynncraft wiki, 국내 1.21.5 변경 정리 글)
- **재료 분류:**
  - 몬스터 드롭(1~3등급)
  - 광석·주괴(채광→제련, 3~5)
  - 보석·파편(소켓·강화)
  - 정수(분해·보스)
  - 강화석·주문서(하급·중급·상급·최상급)
  - 화폐·토큰
  - 퀘스트 아이템(겹침 1, 거래 불가)
  - 보스 재료
- **등급 색(국내 관례·Hypixel):** 일반 §f 흰색 → 고급 §a 초록 → 희귀 §9 파랑 → 영웅 §5 보라 → 전설 §6 금 → 신화 §c/§d.
  - Wynncraft는 다르다(Unique 노랑, Rare 연보라, Legendary 하늘색, Fabled 빨강, Mythic 보라).
  - 바닐라 `rarity` 컴포넌트는 common/uncommon/rare/epic 4개뿐이다.
- **등급 표시 수단:** 이름 색, 로어 맨 아래 등급 줄, 상위 등급 glint, GUI 등급 프레임(폰트 이미지), 1.21.2+ `tooltip_style`(`textures/gui/sprites/tooltip/<id>_background|_frame.png`).
- **로어:** 종류 줄 → 설명 → 획득처 → 등급 줄. 기호는 ◆★✦▶─를 쓴다. 바닐라 lore는 기본이 이탤릭 진보라라 `italic:false`가 필수다.
- **아이콘 관례:**
  - 세트 안 해상도를 통일한다(바닐라와 섞을 거면 16×16).
  - 같은 분류는 같은 실루엣으로 한다.
  - 등급은 같은 형태에 색·장식만 바꾸고(Hypixel 압축 재료, Wynncraft 품질), 압축 단계(원석→주괴→블록)는 형태를 바꾼다.
- **지역(던전)당 규모(업계 관례 추정):**
  - 재료 4~8 + 채집 2~4 + 엘리트 희귀 1~2 + 보스 확정 1 + 희귀 1
  - 소모품 3~6, 퀘스트 2~5
  - 합계 약 15~25 아이콘
  - 강화석·화폐는 지역 공통 계열을 이어서 쓴다.

## 3. 구현(플러그인 없이 1.21.4+)
- **리소스팩:** `assets/<ns>/items/<id>.json` → `models/item/<id>.json`(item/generated) → `textures/item/<id>.png`.
- **1.21.4:** `/give @p paper[item_model="ns:id",item_name='{"text":"…","color":"gold","italic":false}',lore=['{…}'],rarity="rare",custom_data={ns:{id:"…",tier:3}}]`
- **1.21.5+:** 텍스트 컴포넌트를 SNBT로 직접 쓴다(`item_name={text:"…",color:"gold"}`). 예전 문자열도 읽힌다.
- **플러그인 서버:** Nexo / ItemsAdder / MMOItems YAML로 같은 텍스처를 쓸 수 있다(텍스처 경로만 맞추면 된다).

## 4. Atelier 구현
- `atelier/mc/items.js`: 형태 12종(gem, shard, ingot, dust, orb, nugget, rod, fang, scale, essence, coin, stone) × 등급 1~5. 위 실측 문법을 따른다.
- `atelier/mc/rpgitems.js`: 정의 목록 → 아이콘 + 리소스팩 + /give(1.21.4·1.21.5+) + 게임 화면 미리보기(인벤토리·툴팁, Unifont).
- `atelier/mc/palette.js`: 지역 팔레트(공유 잉크·빛 + 역할) → 세트 색 조화. 규칙과 실측은 `color-harmony.md`.
- `rpg/materials.mjs`: 시연(피의 땅·유령 저택 각 10종). 아이템 색은 hex가 아니라 역할 이름이다.
