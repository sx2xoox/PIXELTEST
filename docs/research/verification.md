# 1차 출처 검증 기록 (바닐라 클라이언트 jar)

리서치 보고서(`mc-rpg-effects.md`)에서 "코드 지식"이나 "미확인"으로 표시된 주장을, Mojang 공식 배포 서버(piston-meta / piston-data)의 **클라이언트 jar**로 직접 확인했습니다.
대상은 1.21.4와 26.3입니다. 2026-11 기준 최신 정식판은 26.3이고, 최신 스냅샷은 26.4-snapshot-7입니다.
jar는 검증에만 썼고 저장소에는 넣지 않았습니다.

| 주장 | 결과 | 근거(jar 내부) |
|---|---|---|
| 리소스팩 포맷 1.21.4 = 46 | ✅ | `version.json` → `pack_version.resource: 46` |
| 최신 26.3의 리소스팩 포맷 | ✅ **97.1** (major/minor 형식) | `version.json` → `resource_major: 97, resource_minor: 1` |
| 파티클 정의 형식 `{"textures":[...]}` | ✅ | `assets/minecraft/particles/*.json` (1.21.4: 101개, 26.3: 115개) |
| sweep_attack = 32×32 × 8프레임 | ✅ | `particles/sweep_attack.json`, `textures/particle/sweep_0..7.png` |
| dust가 generic 스프라이트를 공유 | ✅ 보고서보다 범위가 넓음: **25종**이 `generic_*` 공유 | ash, cloud, dust, poof, portal, smoke, snowflake, squid_ink, trail 등 |
| 파티클 텍스처도 `.mcmeta` 애니메이션 지원 | ✅ | `textures/particle/vibration.png.mcmeta` |
| 1.21.4에 `items/*.json`(아이템 모델 정의) 존재 | ✅ | 1.21.4: 1385개, 26.3: 1658개 |
| `range_dispatch`, `tints` 사용 | ✅ | `items/bow.json`(range_dispatch), `items/acacia_leaves.json`(tints) |
| tint 소스·range 속성 `custom_model_data` | ✅ | 26.3 클래스 `client/color/item/CustomModelDataSource`, `renderer/item/properties/numeric/CustomModelDataProperty`, 등록 문자열 `custom_model_data` |
| 장비(갑옷) 정의 위치·형식 | ✅ `assets/<ns>/equipment/<name>.json` = `{"layers":{"humanoid":[{"texture":"ns:name"}],"humanoid_leggings":[...]}}`, 텍스처 `textures/entity/equipment/humanoid/<name>.png` | 1.21.4·26.3 둘 다 존재. 26.3에는 `humanoid_baby`, `trim_overrides` 추가 |

## 아직 실서버(클라이언트 실행)가 필요한 항목
- 파티클별 프레임 선택 방식(나이 순서 vs 무작위)과 렌더 타입(불투명/반투명). 이건 코드 상수라 에셋만으로는 알 수 없습니다.
  - 그래서 예제는 이미 8프레임 시퀀스인 `sweep_attack`만 교체합니다.
- `.mcmeta` 애니메이션이 전역 시계를 따르는지. 그래서 일회성 연출은 `range_dispatch` 프레임 선택 방식으로 만들었습니다.
- 아이템 디스플레이에서 반투명 정렬, 밉맵 영향.
- `/summon item_display ... components:{"minecraft:custom_model_data":{floats:[..],colors:[..]}}`의 SNBT 세부 문법.

## Atelier에 반영한 것
- `.mcmeta`: 프레임이 정사각형이 아니면 `width`/`height`를 명시합니다(빛기둥 16×64에서 발견).
- 파티클 재텍스처 예제는 `sweep_attack` 하나로 한정했습니다. `generic_*` 공유 25종은 피하라고 스킬에 기록했습니다.
- VFX 아이템: 양면 평면 모델 + `light_emission 15` + `range_dispatch`(floats[0] = 프레임) + `tints`(custom_model_data, 기본 흰색)
- 리소스팩 포맷: 기본값 46(1.21.4)을 유지하고 `--pack-format`으로 바꿀 수 있습니다. 26.3은 97.1인데, 1.21.9 이후 `pack.mcmeta`의 min/max 형식 필드는 실클라이언트로 확인하기 전까지 쓰지 않습니다.
