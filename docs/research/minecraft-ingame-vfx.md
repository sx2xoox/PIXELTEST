# 타임라인을 실제 마인크래프트에서 재생하는 방법 (Java 1.21.4+ / Bedrock)

근거:
- minecraft.wiki: Display, Pack_format, Pack.mcmeta, Function, Commands/summon
- Microsoft Learn: Bedrock 파티클 문서
- bedrock-samples 파티클 192개
- 기존 `docs/research/mc-rpg-effects.md`, `verification.md`(jar 검증)

**결론**
- **평면·리본 트랙:** Java에서 `item_display` + 프레임별 아이템 모델로 거의 그대로 재현된다.
- **이미터:** 바닐라 파티클로는 일부만 맞출 수 있다. 정확히 맞추려면 디스플레이 입자를 쓰거나 Bedrock으로 간다. Bedrock 파티클 JSON은 이미터 필드와 거의 1:1로 대응한다.
- **플레이어 자세 트랙:** 바닐라에서는 불가능하다(ModelEngine·BetterModel 등 플러그인 필요).

## 1. 개념별 매핑 (Java 1.21.4+)
| 타임라인 | 구현 |
|---|---|
| 원점·방향 | 빈 `item_display` 루트에 부품을 승객으로 붙인다(`execute on passengers`). 엔티티 yaw 0은 +Z인데 타임라인은 −Z가 앞이라 루트 yaw = 플레이어 yaw + 180이다: `execute as @e[tag=new] rotated as <caster> run rotate @s ~180 0`. `/summon`에는 회전 인자가 없다. |
| 평면 트랙 | `summon item_display ~ ~ ~ {Tags:["atl.p","atl.tr.<id>"],billboard:"fixed",brightness:{block:15,sky:15},shadow_radius:0f,view_range:1f,item:{id:"minecraft:paper",count:1,components:{"minecraft:item_model":"atelier:fx/<skill>/<id>","minecraft:custom_model_data":{floats:[0f],colors:[<RGB int>]}}},transformation:{translation:[x,y,z],left_rotation:[qx,qy,qz,qw],scale:[sx,sy,1f],right_rotation:[0f,0f,0f,1f]}}`. size는 scale에 곱한다. Euler XYZ(°) → q = qx·qy·qz를 `left_rotation`에 넣는다(디스플레이 행렬 T·L·S·R, R = 단위). |
| 키프레임 | 키 k의 틱에 `data merge entity @s {start_interpolation:0,interpolation_duration:<Δt>,transformation:{…키 k+1…}}`를 보낸다. 첫 키는 소환 다음 틱에 준다(소환 직후 1틱은 렌더되지 않음). **MC는 쿼터니언 slerp(최단 경로), 뷰어는 Euler 선형**이라 다축·180° 이상 회전은 결과가 다르다. 그래서 2~4틱 간격으로 다시 샘플링하고, 한 구간 회전은 90° 이하로 쪼갠다. |
| 플립북 | 트랙마다 `items/*.json`에서 `range_dispatch`(custom_model_data floats[0])로 프레임을 고른다. 교체는 `data merge entity @s {item:{components:{"minecraft:custom_model_data":{floats:[3f]}}}}`. `.mcmeta` 애니메이션은 전역 시계로 돌아서 일회성 연출에 쓸 수 없다. |
| billboard | fixed / center / vertical이 그대로 대응한다(MC에는 horizontal도 있음). |
| tint | 모델 면에 `"tintindex":0`, 아이템 정의에 `"tints":[{"type":"minecraft:custom_model_data","index":0,"default":-1}]`, 엔티티에 `colors:[0xRRGGBB]`(곱연산 = 뷰어와 같음). |
| 발광 | 모델 요소 `"light_emission":15` + 엔티티 `brightness 15`. 블룸이 없으므로 빛 번짐은 텍스처에 굽는다(현재 방식 유지). |
| 알파 페이드 | 보간되지 않는다. 프레임에 굽거나 scale→0 보간으로 대신한다. |

### 리본 트랙
- **(A) 평면 리본** (`rise=0`, `points` 없음): 띠가 경로 평면 안에 있다. 그 평면에 평면 1장을 띄우고 틱마다 구운 텍스처를 플립북으로 돌리면 정확히 같다. 엔티티 1개, 프레임 수 = 지속 틱 수.
- **(B) 비평면 리본** (rise·spiral·points): N = 12~16 세그먼트 디스플레이로 만든다. 세그먼트 i는 창의 고정 구간 t ∈ [i/N, (i+1)/N]를 그리므로 정적 모델 `seg_i`를 쓴다. 매 틱 계산은 다음과 같다.
  - s_j = tail + (head − tail)·j/N, P_j = at(s_j)
  - tan = norm(P_{i+1} − P_i), side = norm(up_q × tan), n = tan × side
  - `left_rotation` = 기저 [tan | side | n]의 쿼터니언, `translation` = (P_i + P_{i+1})/2
  - `scale` = [|P_{i+1} − P_i| × 1.05(5% 겹침으로 이음새 가림), w_i, 1]
  - `interpolation_duration:1`로 매 틱 갱신한다. 비용은 리본 하나당 업데이트 약 320회(16 × 20틱)다.
- 모델 요소 회전은 ±45°/22.5°만 되므로 곡면 메시를 모델 하나에 굽는 방식은 불가능하다.

### 이미터 트랙
1. **바닐라 파티클:**
   - 가능한 것: `dust{color,scale≤4}`(1색), `dust_color_transition`(2색 전이), `trail{target,color,duration}`(직선 궤적).
   - 불가능한 것: drag·gravity·수명·크기 곡선·3색 이상 그라디언트는 코드 상수라 바꿀 수 없다. 커스텀 텍스처는 기존 파티클을 서버 전체에서 재텍스처하는 방법뿐이다. dust·trail은 `generic_*`를 공유하니 건드리지 않는다.
   - 근사: 정지 위치 p0 + v0/k를 trail target으로, 수명을 duration으로 둔다.
2. **디스플레이 입자(권장, 주인공 입자용):** 입자 하나 = `billboard:"center"` item_display 하나. 해석해 p(t) = p0 + (v0 − g/k)(1 − e^{−kt})/k + gt/k를 2~3틱마다 샘플링해 translation·scale 키로 보낸다. 색은 colors를 계단식으로, 프레임은 floats로, spin은 Z 회전으로 준다.
3. **혼합:** 핵심 입자 10~30개는 디스플레이로, 가루·불티 채움은 dust로.

## 2. 리소스팩·데이터팩 구조
**리소스팩**
- `assets/atelier/items/fx/<skill>/<track>.json`
- `assets/atelier/models/fx/<skill>/<track>/f<k>.json`
- `assets/atelier/textures/item/fx/<skill>/<track>/f<k>.png`
- `textures/item/` 아래에 두면 아틀라스 JSON이 필요 없다.

```json
{"model":{"type":"minecraft:range_dispatch","property":"minecraft:custom_model_data","index":0,
 "entries":[{"threshold":0,"model":{"type":"minecraft:model","model":"atelier:fx/sk/hit1/f0",
   "tints":[{"type":"minecraft:custom_model_data","index":0,"default":-1}]}}],
 "fallback":{"type":"minecraft:empty"}}}
```
```json
{"textures":{"0":"atelier:item/fx/sk/hit1/f0"},"elements":[{"from":[0,0,8],"to":[16,16,8],"light_emission":15,
 "faces":{"north":{"uv":[16,0,0,16],"texture":"#0","tintindex":0},"south":{"uv":[0,0,16,16],"texture":"#0","tintindex":0}}}]}
```
- 회전 중심은 모델 중심이고, `item_display:"none"`에서 16px = 1블록이다.
- 텍스처는 2의 거듭제곱, 256px 이하로 한다. 1.21.11 이전에는 아이템이 밉맵이 걸리는 blocks 아틀라스에 들어가므로 크기를 통일한다.

**포맷 번호**
| 판 | 리소스 | 데이터 |
|---|---|---|
| 1.21.4 | 46 | 61 |
| 1.21.5 | 55 | 71 |
| 1.21.6 | 63 | 80 |
| 1.21.7 / 1.21.8 | 64 | 81 |
| 1.21.9 / 1.21.10 | 69.0 | 88.0 |
| 1.21.11 | 75.0 | 94.1 |
| 26.1 | 84.0 | 101.1 |
| 26.2 | 88.0 | 107.1 |
| 26.3 | 97.1 | 121.0 |

1.21.9부터 `min_format`/`max_format`이 필수다. 구판도 지원하려면 `pack_format`을 함께 쓴다. 예: `{"pack":{"description":"…","pack_format":46,"min_format":46,"max_format":[97,1]}}`

**데이터팩**
- 폴더는 `function/`, `tags/function/`(단수)이다.
- `tick.json` → `atelier:tick` → `execute as @e[type=item_display,tag=atl.root] at @s run function atelier:step`
- `step`의 순서:
  1. 틱 카운터를 올린다(`atl.t` +1).
  2. storage `atl:c`에 t와 skill을 넣는다.
  3. `function atelier:run with storage atl:c`
- `run`은 매크로 `$function atelier:fx/$(skill)/t$(t)`다. 변수가 없으면 함수 전체가 실패하므로 빈 틱도 빈 파일로 만든다.
- 틱 파일에서는 트랙별로 `execute on passengers if entity @s[tag=atl.tr.<id>] run data merge entity @s {...}`를 쓴다.
- 마지막 틱에 `execute on passengers run kill @s` 다음 `kill @s`를 실행한다. `load`에서 찌꺼기를 정리한다.
- `schedule function`은 실행 문맥을 잃으므로 틱 카운터 방식을 권장한다. 한도는 `max_command_sequence_length`(65536)다.

## 3. 성능 예산(경험칙, 실측 필요)
- 스킬 하나에 동시 디스플레이 20~60개, 궁극기도 100개 이하.
- 메타데이터 업데이트는 시전당 틱당 30~80회 이하. transformation과 item을 같은 `data merge`에 묶는다.
- 키는 2~4틱 간격으로 보내고 사이는 클라이언트 보간에 맡긴다. `on passengers`로 순회한다.
- `view_range` 0.5~1, `shadow_radius:0`.
- 파티클은 클라이언트 동시 16384개가 한도이고, 32블록 밖은 보이지 않는다.

## 4. Bedrock 경로 (이미터 ≈ 1:1)
| 우리 필드 | Bedrock |
|---|---|
| shape point/sphere/disc/ring/line | `emitter_shape_point` / `_sphere{radius,surface_only,direction:"outwards"}` / `_disc{plane_normal}` / disc + surface_only / `_custom` |
| count, emit_ticks | 0이면 `emitter_rate_instant`. 아니면 `emitter_rate_steady{spawn_rate,max_particles}` + `emitter_lifetime_once{active_time}` |
| speed, spread | `particle_initial_speed:"math.random(a,b)"`, spread는 direction 식에 난수 |
| drag, gravity | `particle_motion_dynamic{linear_drag_coefficient,linear_acceleration}`(뷰어 모델과 같은 dv/dt = g − kv) |
| lifetime | `particle_lifetime_expression{max_lifetime:"math.random(a,b)"}` |
| size, sizeEnd, spin | billboard `size` Molang, `particle_initial_spin` |
| colors | `particle_appearance_tinting.color.gradient`, interpolant = age/lifetime |
| frames, fps | 가로 아틀라스 + `flipbook`(fps가 없으면 `stretch_to_lifetime`) |
| 발광 | `particle_appearance_lighting` 생략 |

Bedrock에는 디스플레이 엔티티가 없어서, 평면·리본 트랙은 커스텀 엔티티 + geometry + animation으로 바꿔야 한다.

## 5. 익스포터 설계와 위험
- **입력:** timeline.json, PNG, 옵션(ns, skill, targetVersion, particleMode vanilla|display|mixed, keyStep 2).
- **변환:**
  1. 좌표 정규화(yaw+180)
  2. Euler → 쿼터니언, 키 재샘플링(구간 90° 이하)
  3. 리본 분류(평면 = 틱별 텍스처, 비평면 = 세그먼트)
  4. 이미터 시뮬레이션(같은 RNG·해석해)
  5. 틱별 명령 수집
- **출력:** 리소스팩, 데이터팩(start/tick/step/run/t0..tN/load/정리), 선택적으로 Bedrock particles, 검증 리포트(엔티티 최댓값, 틱당 업데이트, slerp 오차).
- **뷰어 "MC 모드":** slerp, 틱 단위 보간, 알파 단계화로 내보낸 결과를 미리 본다.
- **인게임 테스트가 필요한 위험:**
  1. 방향 부호(item_display Y축 180°, yaw+180, 양면 UV 미러링)
  2. 보간 중 프레임 교체 시 보간이 끊기는지
  3. 반투명 정렬·밉맵·세그먼트 이음새
  4. 시전 여러 개가 겹칠 때 패킷·FPS·mspt
  5. 바닐라 파티클 근사의 한계, Bedrock billboard size(반폭/전폭)
