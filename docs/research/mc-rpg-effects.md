# 마인크래프트 RPG 서버 시각 효과(VFX) 조사 — Atelier 에셋 파이프라인 관점

> 작성일: 2026-11-04 · 대상: Java Edition 1.21.4 ~ 26.x(주), Bedrock 차이 병기
> 목적: 외부 이미지 생성 AI 없이 **코드만으로** RPG 서버용 VFX 에셋(파티클 스프라이트, 디스플레이 엔티티용 아이템 모델, 애니메이션 텍스처, 폰트 HUD, ModelEngine 호환 .bbmodel)을 생성하기 위한 사실 정리와 구현 계획.
>
> 표기 규칙
> - **[확인]**: 1차 출처(minecraft.wiki, 공식 플러그인 문서)에서 직접 확인한 내용. URL을 붙였다.
> - **[코드 지식]**: 디컴파일 코드나 커뮤니티 관행으로 알려져 있으나 이번 조사에서 1차 문서로 확인하지 못한 내용.
> - **[미확인]** / **[버전 의존]**: 추측이 섞였거나 버전마다 다른 내용. 실서버 검증이 필요하다.
>
> 참고: 2026년부터 Java 판 번호가 연도식(26.1, 26.2, 26.3 …)으로 바뀌었다. 리소스팩 `pack_format`도 1.21.9부터 `major.minor` 형식(65.0 …)이다. 현재 `atelier/mc/pack.js` 기본값 `packFormat = 46`은 1.21.4에 해당한다.

---

## 0. 한눈 요약

| 기법 | 쓰임 | 핵심 제약 | Atelier가 만들 것 |
|---|---|---|---|
| 바닐라 파티클 + 리소스팩 재텍스처 | 스파크, 연기, 마법 가루, 궤적 | **새 파티클 종류는 추가할 수 없고** 기존 종류의 스프라이트만 교체할 수 있다. 교체하면 서버 전체의 같은 파티클이 함께 바뀐다 | N프레임 스프라이트 묶음 + `particles/<id>.json` |
| 플러그인 파티클 도형(MythicMobs, EffectLib) | 링, 구, 나선, 선, 이미지 | 파티클 수 한도(Java 16384), 패킷 부하 | 도형 수식(좌표 생성), EffectLib용 **PNG 이미지**(ImageEffect) |
| 디스플레이 엔티티(item/block/text_display) | 베기 궤적, 마법진, 충격파, 오라, 투사체, 데미지 숫자 | 보간은 틱 단위이고 변환 행렬만 보간된다. 텍스처 애니메이션은 전역 시계에 묶인다 | 평면/곡면 아이템 모델 + 알파 텍스처, 프레임별 모델, 변환 시퀀스 |
| ModelEngine / BetterModel | 보스, 커스텀 몹, 스킬 이펙트 모델 | Generic 모델, 큐브 회전 ±22.5/45 단일축, 본 이름 규약 | 규약을 지킨 .bbmodel(본, 애니메이션, 이펙트 키프레임) |
| 폰트(bitmap/space provider) | HUD, 화면 오버레이, 이모트, 데미지 숫자 | 글리프 높이/ascent, PUA 코드포인트 | 글리프 시트 PNG + `font/*.json` + 음수 공간 폰트 |
| 코어 셰이더 | 애니메이션 글리프, 색상 트리거 HUD, 발광 | 버전마다 깨진다. 팩끼리 병합이 안 된다 | (후순위) 셰이더 템플릿 |

---

## 1. 바닐라 파티클 시스템

### 1.1 리소스팩으로 파티클 다시 그리기

- 파티클 정의 파일: `assets/<ns>/particles/<particle_id>.json`. 그 파티클이 쓸 텍스처 목록이 들어 있다. 텍스처는 `assets/<ns>/textures/particle/*.png`에 둔다. **[확인]** https://minecraft.wiki/w/Resource_pack (디렉터리 구조 절. 19w09a에서 "Particles are now configurable")
- 파일 형식 **[코드 지식, 바닐라 팩 구조와 일치]**:
  ```json
  // assets/minecraft/particles/sweep_attack.json
  { "textures": ["minecraft:sweep_0", "minecraft:sweep_1", "...", "minecraft:sweep_7"] }
  ```
  `textures`의 각 항목은 `textures/particle/` 아래 경로다(확장자 없음).
- 파티클 텍스처는 `particles` 아틀라스로 스티칭된다. 이 아틀라스는 **밉맵을 쓰지 않는다**. **[확인]** https://minecraft.wiki/w/Atlas
- **아틀라스에 스티칭되는 모든 텍스처는 `.mcmeta` 애니메이션을 지원하고, 파티클 텍스처도 여기에 명시적으로 포함된다.** **[확인]** https://minecraft.wiki/w/Resource_pack (Texture animation 절)
- 프레임 선택 방식 **[코드 지식]**: 파티클은 대부분 둘 중 하나다.
  1. **나이 기반**(`setSpriteFromAge`): 수명에 비례해 `textures[0..N-1]`를 순서대로 넘긴다. 예: `poof`, `explosion`, `sweep_attack`, `sonic_boom`, `dust`, `smoke`(generic_7→0)
  2. **무작위 1장**(`pickSprite`): 스폰할 때 목록에서 한 장을 고른다. 예: `crit`, `enchant`(sga_a..z)
  → 어느 쪽인지는 파티클마다 다르므로 **파티클 ID별 동작표를 실클라이언트에서 확인해야 한다.**
- 텍스처 크기 **[미확인]**: 바닐라 파티클은 대부분 8×8이고 `sweep`, `sonic_boom` 등은 더 크다. 화면에 보이는 크기는 텍스처 해상도가 아니라 파티클 코드의 `quadSize`가 정한다. 해상도를 올리면 디테일만 늘어난다. 16×16, 32×32는 관행적으로 쓰인다.
- 렌더 타입: 파티클마다 opaque 또는 translucent 시트가 코드로 정해져 있다. 26.1 snapshot 5에서 glow 파티클이 opaque로 바뀐 이력이 있다("never actually used translucency"). **[확인]** https://minecraft.wiki/w/Resource_pack (history). → **반투명 픽셀을 넣어도 opaque 파티클에서는 잘려 나간다.** 파티클별 렌더 타입표가 필요하다. **[미확인: 전체 목록]**
- 함정: `dust`, `dust_color_transition`은 `generic_*` 스프라이트를 공유한다 **[코드 지식]**. generic을 바꾸면 연기, 포션 효과 등이 모두 함께 바뀐다. 그래서 RPG 서버는 **잘 안 쓰이는 파티클**(예: `glow`, `wax_on`, `scrape`, `electric_spark`)을 커스텀 스프라이트로 바꿔 쓰거나, 아예 디스플레이 엔티티를 쓴다.
- 동시 존재 한도: Java 16384개(이전 4000개). 넘치면 무작위로 렌더를 생략한다. 렌더 거리는 기본 32블록. **[확인]** https://minecraft.wiki/w/Particles

### 1.2 /particle 명령 (Java)

```
particle <name> [<pos>]
particle <name> <pos> <delta> <speed> <count> [force|normal] [<viewers>]
```
- `count=0`이면 파티클 1개를 만들고 `delta×speed`를 속도/방향 인자로 넘긴다. `count>0`이면 `delta`를 표준편차로 써서 정규분포로 흩뿌린다.
- `normal`은 32블록, `force`는 512블록까지 보내고 "Minimal" 설정을 무시한다.
- **[확인]** https://minecraft.wiki/w/Commands/particle
- 예: `/particle minecraft:dust{color:[1,0,1],scale:4} ~ ~ ~ 1 1 1 1 10`

### 1.3 파티클 옵션 (1.20.5+ SNBT 형식)

**[확인]** https://minecraft.wiki/w/Particle_format
| 파티클 | 옵션 | 예 |
|---|---|---|
| `dust` | `color` [r,g,b] 0~1 또는 정수 RGB, `scale` 0.01~4 | `dust{color:[1.0,0.2,0.2],scale:1.5}` |
| `dust_color_transition` | `from_color`, `to_color`, `scale` | `dust_color_transition{from_color:[1,1,0],to_color:[1,0,0],scale:1}` |
| `entity_effect` | `color` **RGBA** 4 float 또는 ARGB 정수 | `entity_effect{color:[1,0,0,0.5]}` |
| `block` / `block_marker` / `falling_dust` / `dust_pillar` | `block_state` (문자열 축약 가능) | `block{block_state:"minecraft:stone"}` |
| `item` | `item` (문자열 축약 가능, 컴포넌트 포함 가능) | `item{item:"minecraft:diamond"}` |
| `trail` (1.21.4+) | `target` 좌표, `color` RGB int, `duration` 틱 | `trail{target:[10d,64d,-5d],color:16711680,duration:40}` |
| `vibration` | `destination{type:"block",pos:[..]}`, `arrival_in_ticks` | |
| `shriek` | `delay` | |
| `sculk_charge` | `roll`(라디안) | |

버전 변화:
- 1.20.5-pre1: SNBT로 전환하고 `value`를 `item`/`block_state`/`color`로, `fromColor`를 `from_color`로 바꿨다.
- 1.21.4: `trail`, `block_crumble` 추가.
- 1.21.5: `tinted_leaves`에 `color` 추가.
- 1.21.9(25w36a): `effect`/`instant_effect`에 `power`와 `color` 추가, `dragon_breath`에 `power` 추가, `flash`는 `color`가 **필수**가 됐다.

**`item` 파티클은 RPG 서버에서 특히 중요하다.** 1.21.4+에서 `item{item:{id:"paper",components:{"minecraft:item_model":"atelier:vfx/spark"}}}`처럼 커스텀 모델 아이템을 지정하면, 그 아이템 텍스처의 조각이 파편 파티클로 튄다. 새 파티클 종류를 만들지 않고도 **커스텀 텍스처 파편을 낼 수 있는 유일한 바닐라 경로**다. **[미확인: 컴포넌트를 포함한 item 파티클 렌더를 실클라이언트에서 확인해야 함]**

### 1.4 Bedrock 차이
- Bedrock 파티클은 완전히 데이터 드리븐이다. 리소스팩 `particles/*.json`에 이미터, 수명, 속도, 빌보드 외형(UV 또는 **flipbook**)을 Molang으로 정의하고, **새 파티클을 추가할 수 있다.** 저작 도구는 Snowstorm(Blockbench 플러그인/웹앱). **[확인]** https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/particlesintroduction , https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/particlecomponents/minecraftparticle_appearance_billboard
- Java 서버가 Geyser로 Bedrock 유저를 받으면, Java 파티클 일부만 매핑되고 디스플레이 엔티티와 코어 셰이더는 그대로 전달되지 않는다. **[미확인: Geyser의 디스플레이 엔티티 지원 범위는 버전마다 다르다]**

---

## 2. 플러그인 기반 효과

### 2.1 MythicMobs
- 파티클 관련 메커닉 목록 **[확인]** https://wiki.mythiccraft.io/mythicmobs/Skills/Mechanics :
  `Particle, ParticleBox, ParticleEquation, ParticleLine, ParticleLineHelix, ParticleLineRing, ParticleOrbital, ParticleRing, ParticleSphere, ParticleTornado, Atom, Smoke, SmokeSwirl, Firework, Flames, Glow, Ender, EnderBeam, GuardianBeam`
  투사체: `Projectile, Missile, Shoot, Volley, ChainMissile(Premium)`, `SetProjectileBulletModel`
  지속형: `Totem, Aura, StatAura`
  디스플레이/텍스트: `Hologram, SetTextDisplay, DisplayTransformation, setDisplayEntityItem, SetInteractionSize`
- `Particle` 공통 속성 **[확인]** https://wiki.mythiccraft.io/mythicmobs/Skills/Mechanics/Particle : `particle(p)`, `amount(a)=10`, `hSpread/vSpread/xSpread/zSpread`, `speed(s)`, `yOffset`, `viewDistance(vd)=128`, `directional`, `direction`, `color(c)`, `audience`, `useEyeLocation`, `forwardOffset`, `sideOffset` 등
- `ParticleRing`: `points(pts)=8`, `radius(r)=10`. 예: `particlering{particle=flame;radius=20;points=32;amount=1;hS=1;vS=0} @target` **[확인]** https://wiki.mythiccraft.io/mythicmobs/Skills/Mechanics/ParticleRing
- Atelier와의 접점: MythicMobs 도형은 **좌표 생성기**일 뿐이다. 모양을 좌우하는 건 결국 파티클 스프라이트와, 1.3절의 `item` 파티클이나 투사체 bullet 모델(`SetProjectileBulletModel`이 커스텀 아이템 모델을 탄환으로 쓴다)이다. → Atelier는 **투사체용 아이템 모델과 스프라이트**를 만들고, 스킬 YAML 템플릿은 선택 사항으로 둔다.

### 2.2 EffectLib
- 효과 클래스 **[확인]** https://github.com/elBukkit/EffectLib/tree/master/EffectLib/src/main/java/de/slikey/effectlib/effect :
  `AnimatedBall, Arc, Atom, BigBang, Bleed, Circle, Cloud, ColoredImage, Cone, Cube, Cuboid, Cylinder, DiscoBall, Dna, Donut, Dragon, Earth, Equation, Explode, Flame, Fountain, Grid, Heart, Helix, Hill, Icon, Image, Jump, Line, Love, Modified, Music, Particle, Plot, Pyramid, Shield, SkyRocket, Smoke, Sound, Sphere, Square, Star, Text, Tornado, Trace, Turn, Vortex, Warp, Wave`
- 공통 파라미터 이름(`particle`, `iterations`, `period`, `duration`, `color`, `particleCount`, `radius` 등)은 소스 기준이다. README에는 목록이 없다. **[코드 지식]**
- **`ImageEffect`/`ColoredImageEffect`는 PNG를 읽어 픽셀마다 파티클을 찍는다.** Atelier의 PixelCanvas로 만든 룬이나 마법진 PNG(예: 32×32, 투명 배경)를 바로 쓸 수 있는 경로다. MagicSpells는 EffectLib을 내장해 `effectlib` 효과 타입으로 이 클래스들을 쓴다. **[코드 지식/미확인: MagicSpells 현행 문서]**
- 유지 상태: elBukkit 포크가 활발하다(617 커밋). Maven 예시는 `11.1-SNAPSHOT`이다. **[확인]** https://github.com/elBukkit/EffectLib

### 2.3 ModelEngine (R4) / BetterModel
- 모델 생성 규칙 **[확인]** https://wiki.mythiccraft.io/modelengine/Modeling/Creating-a-Model :
  - Blockbench **Generic Model** 프로젝트를 쓴다. 파일 이름이 곧 모델 ID다. `.bbmodel`에 모델, 텍스처, 애니메이션이 모두 들어간다.
  - **큐브 회전은 0, ±22.5, ±45 중 하나, 한 축만** 허용된다. 본 회전은 제한이 없다.
  - 정면은 north. 1블록 = 16px.
  - `hitbox` 본(큐브 1개): 가장 큰 가로폭만 읽는다(X=Z). 최대 64×64×64블록. 피벗 Y가 눈높이다. 애니메이션은 불가하고 로드할 때 제거된다.
  - `shadow` 본(큐브 1개): 가장 큰 폭이 그림자 지름이다.
  - 발광: 별도 텍스처의 Render Mode를 **Emissive**로 두면 그 면이 `light_emission:15`로 출력된다. **1.21.2+ 클라이언트에서만** 적용된다.
  - 문서상으로는 "모델이 있는 본마다 아머스탠드 1개"라고 적혀 있다(구문서 표현). R4는 디스플레이 엔티티를 쓴다고 알려져 있다(ItemsAdder 비교 페이지: https://itemsadder.devs.beer/faq/modelengine-vs-itemsadder). **[미확인: 현행 R4.1의 렌더 방식은 1차 문서에 명시돼 있지 않다]**
- 본 태그 **[확인]** https://wiki.mythiccraft.io/modelengine/Modeling/Bone-Behaviors :
  `h_`(머리), `hi_`(상속 머리), `h[yaw=60;pitch=30;speed=10]_`, `mount`(조종석, 빈 본), `p_`(승객석), `ih_/ir_/il_`(아이템 표시: 머리/주손/보조손), `g_`(ghost), `tag_`(이름표/HP바), `l_`(리드줄), `seg_/segf_`(세그먼트), `tl_/tlf_`(꼬리, 큐브 없는 본만), `ik[...]_`, `jig_`(물리 흔들림), `b_`(AABB 서브히트박스, 정사각 바닥), `ob_`(OBB 서브히트박스), `phead_/prarm_/plarm_/pbody_/prleg_/plleg_`(플레이어 스킨 파트), `limb[type=X]`
- 애니메이션 **[확인]** https://wiki.mythiccraft.io/modelengine/Modeling/Animating-a-Model :
  - 보간은 linear, smooth(=catmullrom), step만 지원한다. **bezier는 읽기만 하고 linear로 처리한다.**
  - 루프 모드: once, loop, hold. 내부 20FPS.
  - 기본 상태 이름: `idle, walk, jump_start, jump, jump_end, spawn, death`
- 스크립트 키프레임 **[확인]** https://wiki.mythiccraft.io/modelengine/Modeling/Scriptable-Keyframes : Blockbench Effects 타임라인의 **Instructions** 채널에 `mm:<skill>`(MythicMobs 스킬) 또는 MEG 명령(`partvis, tint, enchant, tag, changepart, changeparent, remap`)을 적는다. → **이펙트 본**(빈 본 위치에서 파티클 스킬 실행)과 `partvis`로 이펙트 메시를 켜고 끄는 방식이 RPG 스킬 연출의 표준 패턴이다.
- 텍스처 애니메이션(.mcmeta) 지원은 ME 문서에 언급이 없다. **[미확인]**
- **BetterModel**(오픈소스, toxicity188/bettermodel): item_display 패킷 기반이고, Molang, IK, 플레이어 스킨을 지원한다. 1.19.4 ~ 26.1. **[확인: 2차]** https://modrinth.com/plugin/bettermodel
- **Atelier 현 상태와의 차이**: `atelier/mc/export.js`의 `toBBModel`은 엔티티를 `model_format: 'bedrock'`으로 쓴다. ModelEngine에는 Generic(`free`) 포맷이 필요하다. 큐브 회전 제약 검증도 추가해야 한다.

### 2.4 ItemsAdder / Oraxen / Nexo
- **폰트 이미지(글리프)**: PNG와 YAML(`path`, `scale`/`height`, `y_position`/`ascent`)을 주면 플러그인이 `font/*.json`의 bitmap provider와 PUA 문자를 자동으로 할당한다. ItemsAdder는 글리프 1장 최대 256×256이라고 안내한다. **[확인]** https://itemsadder.devs.beer/adding-content/font-images/font-images
- **HUD**: ItemsAdder FRAMES HUD는 값마다 텍스처 1장을 쓴다(체력바 0~N 프레임). **[확인]** https://itemsadder.devs.beer/adding-content/font-images/huds/creating-huds/frames-hud
- **Nexo 글리프**: `<glyph:id>` 태그, multi-bitmap(행/열 격자로 여러 글리프), **애니메이션 GIF 글리프는 코어 셰이더에 의존한다**(버전 업데이트 시 깨질 수 있음). **[확인]** https://docs.nexomc.com/configuration/glyphs/animated-glyphs , https://docs.nexomc.com/configuration/glyphs/multi-bitmap-glyph
- **Oraxen**: 텍스트 이펙트 팩이 `rendertype_text` 코어 셰이더를 교체하므로 애니메이션 글리프와 충돌한다. 코어 셰이더는 자동 병합이 불가능하다. **[확인]** https://docs.oraxen.com/configuration/texteffects/
- **ItemsAdder 이모트**: 전용 Blockbench 확장("ItemsAdder Entity Model")으로 플레이어 본을 애니메이션한다. 기본 본 크기를 바꾸면 안 되고, 숨길 때는 scale 0을 쓴다. 신규 방식은 1.21.4+이고 바닐라 셰이더를 덮어쓰지 않는다. **[확인]** https://itemsadder.devs.beer/adding-content/player-emotes
- Atelier와의 접점: 플러그인이 YAML을 읽고 팩을 빌드하므로, Atelier는 **PNG(글리프/텍스처/프레임) + 플러그인별 YAML 스니펫**만 내면 된다. 바닐라 팩도 직접 내보낼 수 있게 두 경로를 모두 지원한다.

### 2.5 Citizens / 홀로그램 / 데미지 인디케이터 / 보스바
- 홀로그램과 데미지 숫자는 1.19.4+에서 `text_display`가 표준이다. 예전에는 투명 아머스탠드 이름표를 썼다. MythicMobs `Hologram`/`SetTextDisplay` 메커닉이 있다(2.1).
- 보스바 텍스처는 `textures/gui/sprites/boss_bar/*.png`(gui 아틀라스, 1.20.2+)를 교체한다. 커스텀 보스 UI는 **보스바 제목에 폰트 글리프와 음수 공간을 넣어** 화면 상단에 큰 이미지를 그리는 트릭이 흔하다. **[코드 지식, gui 아틀라스 자체는 확인: https://minecraft.wiki/w/Atlas]**
- Citizens는 NPC(플레이어 스킨) 담당이고 VFX 에셋과는 관련이 적다. 3D 골격 애니메이션은 ME/BetterModel이 맡는다.

---

## 3. 디스플레이 엔티티 (1.19.4+)

### 3.1 공통 필드 **[확인]** https://minecraft.wiki/w/Template:Nbt_inherit/display_entity/template , https://minecraft.wiki/w/Java_Edition_1.19.4
| 필드 | 의미 / 기본값 |
|---|---|
| `transformation` | **행렬형**(16 float, row-major) 또는 **분해형** `{translation, left_rotation, scale, right_rotation}`. 회전은 쿼터니언 `[x,y,z,w]`(실수부가 마지막, 비단위 쿼터니언은 스케일도 준다) 또는 `{angle(rad), axis}`. 저장할 때는 분해형과 쿼터니언형만 쓴다. **보간 대상** |
| `interpolation_duration` | 보간 틱 수 |
| `start_interpolation` | 보간 시작 지연(저장되지 않음). 0이면 다음 클라이언트 틱에 시작한다 |
| `teleport_duration` | 위치/회전 이동 보간 틱. **0~59로 고정**(1.20.2+) |
| `billboard` | `fixed`(기본) / `vertical` / `horizontal` / `center` |
| `brightness` | `{block:0-15, sky:0-15}`. 생략하면 주변 광원을 따른다. **15/15로 두면 사실상 바닐라 "풀브라이트"** |
| `glow_color_override` | -1이면 팀 색. `Glowing:1b`와 함께 쓴다. **text_display에는 발광이 동작하지 않는다** |
| `view_range` | 기본 1.0(×64×entityDistanceScaling) |
| `shadow_radius`/`shadow_strength` | 0/1. 보간 대상 |
| `width`/`height` | 컬링 박스. 0이면 컬링하지 않는다(기본) |

- 피벗: item_display는 아이템 모델 중심, block_display는 블록의 북서쪽 아래 모서리, text_display는 아래 중앙이다. 텍스트는 한쪽 면에서만 보이고, 기본 크기는 1px당 1/40m다. **[확인]** https://minecraft.wiki/w/Display
- `item_display` 필드 값: `none`(기본), `thirdperson_lefthand/righthand`, `firstperson_*`, `head`, `gui`, `ground`, `fixed`. 모델 JSON의 `display` 변환이 적용된다. 1.20(23w16a)에서 아이템이 Y축으로 180° 회전됐다. **[확인]** https://minecraft.wiki/w/Display
- text_display: `text`, `alignment`, `background`(ARGB, 기본 0x40000000, 보간됨), `default_background`, `line_width`=200, `see_through`, `shadow`, `text_opacity`(보간됨; 4~26은 버려지고 0~3은 불투명 처리). 배경 alpha가 26 미만이면 투명해진다. **[확인]** https://minecraft.wiki/w/Display
- 보간 동작: 같은 틱 안의 여러 변경은 1회로 합쳐진다. 새 보간은 현재 상태에서 시작한다. `interpolation_duration=0`이면 이전 값을 버린다. 스폰 직후 1틱 동안은 보이지 않으므로, 소환 다음 틱에 목표 변환을 주면 "0에서 커지는" 연출이 된다. **[확인]** https://minecraft.wiki/w/Java_Edition_1.19.4 , https://minecraft.wiki/w/Display

### 3.2 RPG 연출 패턴과 명령 예

**(a) 베기 궤적(slash arc)**: 평면 반달 텍스처를 가진 아이템 모델을 item_display로 띄운다. 크게 펼친 뒤 회전시키고 사라지게 한다.
```mcfunction
# 1.21.4+ : item_model 컴포넌트로 커스텀 모델 지정
summon item_display ^ ^1.2 ^1.5 {Tags:["vfx","slash"],billboard:"fixed",brightness:{block:15,sky:15},
  item:{id:"minecraft:paper",count:1,components:{"minecraft:item_model":"atelier:vfx/slash_arc"}},
  transformation:{left_rotation:[0f,0f,0.3827f,0.9239f],right_rotation:[0f,0f,0f,1f],translation:[0f,0f,0f],scale:[0.2f,0.2f,0.2f]}}
# 다음 틱: 4틱 동안 3배로 펼치면서 Y축 90도 회전
execute as @e[tag=slash,limit=1,sort=nearest] run data merge entity @s {start_interpolation:0,interpolation_duration:4,
  transformation:{left_rotation:{angle:1.5708f,axis:[0f,1f,0f]},right_rotation:[0f,0f,0f,1f],translation:[0f,0f,0f],scale:[3f,3f,3f]}}
# 이후: 프레임 모델 교체로 페이드 아웃하고(3.3 참고) 8틱 뒤 kill
```
**(b) 마법진/회전 링**: 바닥에 수평으로 눕힌 평면 모델(`left_rotation` x축 −90°). `interpolation_duration`을 길게 주고 각도를 반복 갱신하면 회전한다. 보간은 쿼터니언 slerp라서 **한 번에 180° 이상 돌리면 반대 방향으로 돈다** **[코드 지식]**. 그래서 90° 이하 단위로 나눠 갱신한다.
**(c) 충격파 링**: 링 텍스처 평면을 scale 0.1에서 6으로 5틱 보간한다. 알파 페이드는 보간되지 않으므로(text_opacity만 보간됨) **프레임별 모델 교체** 또는 **알파가 단계적으로 줄어드는 텍스처 세트**가 필요하다.
**(d) 투사체**: item_display에 `teleport_duration:1~3`을 주고 매 틱 tp한다. 꼬리는 `trail`/`dust` 파티클이나 뒤에 남기는 작은 디스플레이를 쓴다.
**(e) 데미지 숫자**: `summon text_display ~ ~2 ~ {billboard:"center",text:{text:"-127",color:"#ff5555",bold:true},see_through:true,background:0}` 다음 틱에 translation y+0.8, scale 1.5로 10틱 보간한다. 숫자 모양을 바꾸려면 커스텀 비트맵 폰트(`"font":"atelier:dmg"`)를 쓴다.
**(f) 오라**: 플레이어에 `ride`(passenger)로 붙인 billboard `fixed` 원판과 오라 텍스처. 또는 플레이어 머리 위 `center` 빌보드 링.

### 3.3 텍스처 애니메이션과 디스플레이의 함정
- `.mcmeta` 애니메이션은 **아틀라스 전역 시계로 돌기 때문에** 엔티티가 생성된 시점과 상관없이 아무 프레임에서나 시작한다 **[코드 지식; 실클라이언트 검증 필요]**. 그래서 **반복형**(오라, 마법진의 흐르는 룬, 불꽃 루프)에만 적합하다. **일회성 연출**(베기, 폭발)은 다음 중 하나를 쓴다.
  1. 프레임별 모델 N개(`slash_f0..f7`)를 만들고 서버가 매 틱 `item` 또는 `item_model`을 교체한다.
  2. `items/*.json`의 `range_dispatch`에 `custom_model_data` floats를 연결하고 서버가 `floats:[k]`만 바꾼다(4절).
  3. 보간(스케일/회전)만으로 움직임을 만들고, 텍스처는 정지 이미지를 쓴다.
- 반투명 정렬: 여러 반투명 디스플레이가 겹치면 정렬 오류가 생긴다. 같은 평면에 두 장을 겹치면 z-fighting이 난다. → 층마다 translation을 0.01씩 띄운다.
- 아이템 모델 큐브 회전 제한(±45°, 22.5° 단위, 아이템 요소 기준; 블록은 1.21.6에 22.5° 제한, 1.21.11에 다축 제한이 풀림. 아이템 요소에 적용되는지는 **[미확인]**) → 곡면 아크는 여러 평면을 22.5° 단위로 이어 붙이거나, **평면 1장에 곡선을 그린 텍스처**로 처리한다(권장).
- 디스플레이 transform 제한: 모델 `display` 스케일은 최대 4, translation은 ±80이다. 엔티티 `transformation`에는 이런 제한이 없으므로 크기 조절은 엔티티 쪽에서 한다. **[확인]** https://minecraft.wiki/w/Model

---

## 4. 리소스팩 기법

### 4.1 아이템 모델 선택 (1.21.4+)
- `assets/<ns>/items/<id>.json`(item model definition). 아이템은 `minecraft:item_model` 컴포넌트(1.21.2, 24w36a에 추가)로 이를 가리킨다. **[확인]** https://minecraft.wiki/w/Items_model_definition , https://minecraft.wiki/w/Java_Edition_24w36a
- 타입: `model`(+`tints`), `composite`, `condition`, `select`, `range_dispatch`, `empty`, `special`, `bundle/selected_item`.
- `custom_model_data`는 4개 리스트를 가진다: **`floats`(range_dispatch), `flags`(condition), `strings`(select), `colors`(tint)**. 각각 `index`로 읽는다.
  ```json
  { "model": { "type": "minecraft:range_dispatch", "property": "minecraft:custom_model_data", "index": 0,
      "entries": [ {"threshold": 0, "model": {"type":"minecraft:model","model":"atelier:vfx/slash_f0"}},
                   {"threshold": 1, "model": {"type":"minecraft:model","model":"atelier:vfx/slash_f1"}} ],
      "fallback": {"type":"minecraft:model","model":"atelier:vfx/slash_f0"} } }
  ```
  `tints`에 `{"type":"minecraft:custom_model_data","index":0,"default":16777215}`를 넣으면 **흑백 VFX 텍스처 1장을 서버가 원하는 색으로 칠할 수 있다**(원소별 색 변형에 핵심).
- 이후 버전: 1.21.6 `oversized_in_gui`, 1.21.11 `swap_animation_scale`, 26.1 루트 `transformation` 필드 추가. **[확인]** 같은 페이지
- 1.21.3 이하는 구식 `overrides` + 정수 `CustomModelData`를 쓴다. 1.21.4 이후로는 사라졌다(24w45a). 구버전 서버까지 지원하려면 두 형식을 함께 출력한다. **[확인]** https://minecraft.wiki/w/Model

### 4.2 애니메이션 텍스처 `.png.mcmeta` **[확인]** https://minecraft.wiki/w/Resource_pack
```json
{ "animation": { "frametime": 2, "interpolate": false, "width": 16, "height": 16,
                 "frames": [0, 1, {"index": 2, "time": 4}, 3] } }
```
- 프레임은 세로(또는 가로)로 이어 붙이거나, `width`/`height`를 지정하면 격자로 행 우선 배치할 수 있다. 크기가 나누어떨어지지 않으면 missing texture가 나온다.
- 아틀라스에 들어가는 텍스처(블록, 아이템, 파티클, GUI 스프라이트, 맵 장식 등)는 모두 애니메이션을 지원한다.
- `interpolate: true`는 프레임 사이를 알파 블렌딩한다. 픽셀아트에서는 번져 보일 수 있으니 기본 false를 권장한다.

### 4.3 발광(emissive)
- **바닐라**: (1) 모델 요소의 `light_emission` 0~15(1.21.2, 24w33a) — 최소 광량을 올려 줄 뿐 블룸은 없다. (2) 디스플레이 `brightness:{block:15,sky:15}`. (3) `Glowing` 외곽선(팀 색/`glow_color_override`). **[확인]** https://minecraft.wiki/w/Model , 3.1절 출처
- **OptiFine**: `optifine/emissive.properties`의 `suffix.emissive=_e`. `foo_e.png` 오버레이가 풀브라이트로 그려진다. 블록, 아이템, 몹에 적용되고 **파티클에는 적용되지 않는다.** **[확인]** https://optifine.readthedocs.io/emissive_textures.html
- **Iris/셰이더팩**: OptiFine `_e` 규약을 기본 지원하지 않는다. LabPBR `_s` 스펙큘러 텍스처의 alpha 채널로 발광을 표현하는 셰이더팩이 많다. **[미확인: 셰이더팩마다 다름]**
- **코어 셰이더 트릭**: 특정 alpha 값(예: 254)을 발광 마스크로 해석하도록 `rendertype_entity_translucent` 같은 셰이더를 바꾸는 커뮤니티 관행이 있다. **[미확인; 버전마다 깨짐]**
- → Atelier 기본은 **(a) 발광 부분을 따로 뺀 텍스처 + `light_emission` 요소, (b) 디스플레이 brightness 15**로 하고, `_e.png`는 선택 출력으로 둔다.

### 4.4 코어 셰이더
- `assets/minecraft/shaders/{core,include,post}`. 25w10a(1.21.5) 전역 유니폼, 25w16a(1.21.6) 모든 유니폼이 uniform block으로 바뀜, 25w44a 이후 구조 변경 등 **버전마다 호환이 깨진다.** 로드 오류가 나면 팩 전체가 비활성화된다. **[확인]** https://minecraft.wiki/w/Resource_pack , https://bugs-legacy.mojang.com/browse/MC-264637
- 서버들이 쓰는 트릭: `rendertype_text.vsh`에서 **특정 텍스트 색을 트리거로 써서** 글리프를 화면 좌표에 고정(HUD)하거나, GameTime으로 애니메이션(Nexo GIF 글리프), 그림자 제거, 무지개 텍스트 등을 만든다. `rendertype_text`는 지도 렌더에도 쓰인다. **[확인: 일부]** https://docs.oraxen.com/configuration/texteffects/ , https://pickytweaks.gitbook.io/wanderer-project-showcase/the-theory/understanding-the-shader
- → Atelier에서는 **후순위**다. 에셋 생성은 셰이더 없이 동작하도록 설계한다.

### 4.5 폰트 (HUD, 화면 효과)
- provider 종류: `bitmap`, `space`(22w11a/1.19), `ttf`, `unihex`, `reference`(1.20). 텍스트 컴포넌트의 `font` 키로 지정하며 기본값은 `minecraft:default`. **[확인]** https://minecraft.wiki/w/Font
- bitmap provider 형식 **[코드 지식, 널리 쓰이는 형식]**:
  ```json
  { "providers": [
    { "type": "bitmap", "file": "atelier:font/hud/hp_bar.png", "ascent": 8, "height": 9, "chars": [""] },
    { "type": "space", "advances": { "": -1, "": -8, "": -64 } } ] }
  ```
  `chars` 문자열 하나가 이미지의 한 행이다. 모든 셀 크기는 같고, `ascent ≤ height`여야 한다. 글리프 폭은 불투명 픽셀 범위로 자동 계산된다(space는 예외).
- 음수 공간 폰트(AmberWat NegativeSpaceFont, 번역 키 `space.-11`, `offset.<w>`)로 커서를 되돌려 글리프를 겹친다. 이렇게 액션바, 보스바 제목, 타이틀, 인벤토리 제목에 HUD, 비네팅, 피격 붉은 화면 등 **풀스크린 오버레이**를 그린다. **[확인: 2차]** https://github.com/AmberWat/NegativeSpaceFont , https://docs.xenondevs.xyz/nova/addon/fonts/fonts
- 화면 효과(타이틀로 전체 화면 비네팅이나 피격 플래시)는 큰 글리프(예: 256×256 × N장)에 height 값을 크게 주고 `/title`로 띄운다. 알파 그라디언트가 그대로 그려진다. **[코드 지식]**
- 1.21.4+ 텍스트 `shadow_color`, 1.21.9+ 텍스트 `object` 컴포넌트(아틀라스 스프라이트를 8×8 문자로 표시)도 있다. **[확인]** https://minecraft.wiki/w/Text_component_format

### 4.6 sounds.json (간단히)
`assets/<ns>/sounds.json`: `{"vfx.slash": {"sounds": [{"name": "atelier:vfx/slash1", "volume": 0.8, "pitch": 1.0}], "subtitle": "..."}}`. 파일은 `sounds/vfx/slash1.ogg`(Ogg Vorbis). Atelier에는 사운드 합성 기능이 없다. 필요하면 별도 모듈(절차적 합성 + ogg 인코더)이 있어야 해서 **범위 밖**으로 둔다. **[코드 지식]**

---

## 5. RPG VFX 카탈로그

| 효과 | 서버들이 쓰는 기법 | 저작해야 할 에셋 |
|---|---|---|
| 베기 궤적 | ① `sweep_attack` 파티클 재텍스처(8프레임, 나이 기반) ② item_display + 반달 평면 모델 + 스케일/회전 보간 ③ ME 모델의 이펙트 본 + `partvis` | 32×32 또는 64×32 아크 텍스처(알파 그라디언트), 프레임 3~8장, 평면 아이템 모델 |
| 타격 스파크 | `crit`/`enchanted_hit`/`electric_spark`, `item` 파편 파티클, 짧은 item_display 별 모양 | 8×8~16×16 스파크 스프라이트 4~6프레임 |
| 마법진/룬 | item_display 평면을 바닥에 눕혀 회전 보간, 반복형 `.mcmeta`, EffectLib ImageEffect | 64×64~128×128 원형 텍스처(대칭 룬, 알파), 흐름 애니메이션 프레임 |
| 오라 | 파티클 링/나선(MM `ParticleOrbital`/`ParticleRing`), 탑승한 디스플레이 원판, ME 모델 | 반복형 애니메이션 텍스처(불꽃, 바람), 원기둥/원판 모델 |
| 레벨업 폭발 | `totem_of_undying` + 불꽃놀이 + 상승하는 링 디스플레이 + 타이틀 글리프 | 링 텍스처, "LEVEL UP" 글리프 PNG(폰트) |
| 힐/버프 | `heart`, `happy_villager`, `dust` 녹색 상승 나선, 플러스 모양 item_display | 십자/잎 스프라이트, 상승 프레임 |
| 투사체+꼬리 | MM `Projectile`/`Missile` + `SetProjectileBulletModel`, item_display tp + `teleport_duration`, 꼬리 `trail`/`dust` | 투사체 모델(구, 화살, 오브), 반복 텍스처 |
| 충격파 링 | 평면 링 디스플레이 스케일 보간, MM `ParticleRing` 확장 | 링 텍스처(굵기별, 알파 감쇠 단계 3~5장) |
| 번개 | `lightning_bolt` 효과(데미지 없는 strikeLightningEffect), `electric_spark`, 지그재그 block_display/평면 체인 | 번개 띠 텍스처(세로 32×128, 프레임 2~4장) 또는 세그먼트 모델 |
| 원소(불/얼음/독/신성/암흑) | 각각 `flame`/`soul_fire_flame`, `snowflake`, `dust` 녹색과 `entity_effect`, `end_rod`/`glow`, `squid_ink`/`smoke`/`portal` + 디스플레이 | **흑백 마스크 + tint**로 색만 바꾸는 공용 스프라이트 세트(4.1 tints) |
| 루트 빔/등급 발광 | 아이템 엔티티 `Glowing` + 팀 색, 위로 늘린 block_display 빔, `end_rod` 기둥 | 세로 그라디언트 빔 텍스처(16×64, 알파), 등급별 색 |
| 데미지 숫자 | text_display + 상승 보간, 커스텀 숫자 폰트 | 숫자/기호 글리프 시트(0-9, +, -, 치명타 아이콘) + font json |
| 텔레포트 | `portal`, `reverse_portal`, `witch`, 세로 링 여러 장의 순차 스케일, 화면 플래시 글리프 | 링/소용돌이 텍스처, 풀스크린 비네팅 글리프 |

---

## 6. Atelier 구현 분석

### 6.1 에셋 유형별 생성 사양
| 에셋 | 파일/경로 | 생성 규칙 | 함정 |
|---|---|---|---|
| 파티클 스프라이트 묶음 | `assets/minecraft/textures/particle/<name>_<i>.png`, `assets/minecraft/particles/<vanilla_id>.json` | 8/16/32 정사각, N장, 프레임 i는 수명 t=i/(N-1)에서 그린다(확장→소멸) | 새 ID 추가 불가. 같은 ID 공유 범위(generic 등). opaque 파티클은 반투명 픽셀이 잘린다 |
| 애니메이션 텍스처 | `textures/item/vfx/<name>.png` + `.png.mcmeta` | 세로 스트립, 모든 프레임 동일 크기, `frametime` | 전역 시계라 일회성 연출에는 부적합. interpolate는 번짐 |
| VFX 평면 아이템 모델 | `models/item/vfx/<name>.json`, `items/vfx/<name>.json` | 두께 0 요소 하나(`from:[0,0,8] to:[16,16,8]`), north와 south 두 면(양면), `display.fixed`/`none` 정리, `light_emission:15` | 아이템 요소 회전 ±45°. 양면을 만들지 않으면 뒤에서 안 보인다. z-fighting |
| 프레임별 모델 + range_dispatch | `items/vfx/<name>.json` + `models/item/vfx/<name>_f{k}.json` | floats 임계값 0..N-1 | 서버가 매 틱 컴포넌트를 바꿔야 한다(패킷) |
| 틴트 가능한 흑백 VFX | 위와 같고 `tints[custom_model_data]` 추가 | 명도만 있는 텍스처(흰색=최대) | 틴트는 곱연산이라 흰색 하이라이트를 넣을 수 없다 → 하이라이트 레이어를 별도 요소로 분리 |
| 마법진/링 텍스처 | `textures/item/vfx/circle_*.png` (64~256) | 극좌표 대칭, 룬 글리프, 알파 | 큰 텍스처는 아틀라스 공간을 쓴다. 밉맵 이슈(아래) |
| 폰트 HUD/숫자 | `textures/font/*.png`, `font/<name>.json` | 셀 격자, PUA U+E000~, space provider | ascent ≤ height. 256px 초과 시 플러그인 제약 |
| ModelEngine .bbmodel | 플러그인 `blueprints/` 폴더 **[미확인: 경로 문서화 안 됨]** | Generic(`free`) 포맷, `hitbox`/`shadow`/`mount`/이펙트 빈 본, 애니메이션 linear/step/catmullrom, Instructions 키프레임 | bezier 미지원, 큐브 회전 제한, hitbox 애니메이션 불가 |
| EffectLib 이미지 | 서버 플러그인 폴더의 PNG | 32×32 이하 권장, 투명 배경 | 픽셀 수 = 파티클 수(성능) |

밉맵 주의: 아틀라스 문서상 밉맵은 `blocks` 아틀라스만 쓴다. `items` 아틀라스는 25w45a(1.21.11)에 생겼다. **그 이전 버전에서는 아이템 텍스처가 blocks 아틀라스(밉맵 적용)에 있었으므로**, 멀리서 볼 때 알파 가장자리가 번지거나 사라질 수 있다 **[확인: 아틀라스 역사 / 렌더 결과는 미확인]**. 블록 아틀라스용 스프라이트는 16×16 이상, 2의 배수여야 밉맵 레벨이 제한되지 않는다. → **VFX 텍스처는 2의 거듭제곱 크기, 알파 가장자리 1px 패딩(색 번짐 방지용으로 투명 픽셀의 RGB를 이웃 색으로 채우기)** 을 기본으로 한다.

반투명 렌더: "블록에 대응하지 않는 아이템은 반투명을 지원한다." **[확인]** https://minecraft.wiki/w/Resource_pack . item_display로 띄운 커스텀 아이템 모델도 반투명 아이템 시트로 그려질 것으로 보지만 **[미확인: 실클라이언트 검증 필요]**, 블록 모델을 부모로 쓰면 컷아웃/불투명이 될 수 있다. 26.1 snapshot 7부터 모든 블록 모델이 컷아웃/반투명 텍스처를 쓸 수 있다.

### 6.2 로컬 검증 가능 vs 실서버 필요
| 항목 | 로컬(Atelier, Node + headless Chromium + three.js) | 실서버/클라이언트 |
|---|---|---|
| 스프라이트 프레임 품질 | 프레임 스트립과 비평 시트, GIF 미리보기, 알파 히스토그램 | — |
| mcmeta 유효성 | 크기 나눗셈, frames 인덱스 범위, JSON 스키마 검사 | 실제 재생 속도 |
| 디스플레이 변환 | **three.js `Matrix4.set()`은 row-major 16개 인자를 받으므로 행렬형을 그대로 넣을 수 있다.** 분해형은 T·L·S·R 순서로 합성한다. 20TPS 틱 단위 lerp/slerp 시뮬레이션으로 타임라인 콘택트 시트를 만든다 | 보간 끊김, 네트워크 지연 |
| 평면 모델 | 양면, z-fighting 간격, UV 범위, 회전 제약 정적 검사 | 반투명 정렬, 밉맵 |
| range_dispatch 연결 | 참조 경로가 모두 존재하는지 링크 검사 | 컴포넌트 교체 동작 |
| 틴트 | 곱연산 미리보기(원소 색별 그리드) | — |
| 폰트 HUD | 글리프 배치 시뮬레이션(advance 합산, 음수 공간), 화면 해상도와 GUI 스케일별 미리보기 | 실제 GUI 스케일 반올림, 셰이더 상호작용 |
| .bbmodel | JSON 구조, 본 이름 규약 린트, Blockbench로 열어 보기(수동) | ModelEngine import 성공 여부, 본 엔티티 수, 애니메이션 |
| 파티클 렌더 타입/프레임 방식 | 불가(코드 상수) | **필수**: ID별 동작표 작성 |
| 발광/셰이더 | 미리보기 근사(풀브라이트) | 필수 |

실서버 검증 루틴 제안: Paper 최신 + 바닐라 클라이언트 + `/reload` 대신 `/minecraft:reload`와 F3+T로 팩 재로드. 테스트용 mcfunction 데이터팩(Atelier가 함께 출력)으로 효과마다 소환 명령을 1개씩 둔다.

### 6.3 우선순위 구현 계획 (모듈과 함수)

**P0 — 기반 (1~2일)**
1. `atelier/mc/pack.js` 확장: `buildPack({…, particles:[], vfxItems:[], fonts:[], mcmeta})`
   - `textures/particle/*` + `particles/<id>.json` 출력
   - `.png.mcmeta` 출력(`animation:{frametime,interpolate,frames}`)
   - `pack_format` 표(1.21.4=46, 1.21.5=55, 1.21.6=63, 1.21.7/8=64, 1.21.9=69.0, 1.21.11=75.0, 26.x…) **[확인: Resource_pack 페이지의 snapshot별 번호이므로 정식판 값은 다시 확인할 것]**과 `supported_formats`/`min_format`/`max_format` 처리 **[미확인: 1.21.9+ 신규 필드 형식]**
2. `atelier/vfx/frames.js`: `frameStrip(frames[], {layout:'vertical'})`, `mcmeta({frametime, frames})`, `validateStrip()`
3. `atelier/vfx/alpha.js`: 투명 픽셀 색 번짐 방지 패딩(`bleedRGB`), 알파 양자화(opaque 파티클용 컷아웃 임계값 미리보기)

**P1 — 핵심 VFX 생성기 (높은 실현성)**
4. `atelier/vfx/shapes.js` (PixelCanvas 기반 절차 생성)
   - `slashArc({w,h,angle,thickness,taper,frames})` — 반달 궤적, 프레임별 확장과 소멸
   - `ring({r,width,falloff,frames})` — 충격파와 오라 링
   - `magicCircle({size,folds,runes,seed})` — 극좌표 대칭, 룬은 seed 기반 획 생성
   - `spark({size,rays,frames})`, `burst()`, `beam({h,gradient})`, `lightning({h,seed,branches,frames})`, `flame({frames})`(노이즈 스크롤 루프)
   - 모든 생성기는 흑백 마스크 모드(`tintable:true`)를 지원한다
5. `atelier/mc/vfxmodel.js`
   - `planeModel({texture, size, doubleSided:true, light:15, axis:'z'})` → Java 아이템 모델 JSON
   - `frameModels(name, n)` + `rangeDispatchItem(name, n, {tint:true})` → `items/*.json`
   - `legacyOverrides()`(1.21.3 이하 선택)
6. `atelier/mc/particles.js`: `particleSet(vanillaId, frames, {mode:'age'|'random'})` + 재정의할 때 영향받는 바닐라 ID 경고표(generic 공유 등)

**P2 — 미리보기와 검증**
7. `atelier/mc/display.js`: `displayTransform({translation,left,scale,right})` ↔ 16 float 행렬, `timeline(keys, tps=20)` 보간 시뮬레이터, `toSummon(entitySpec)`/`toDataMerge()` 명령 생성기
8. `render3d.js` 확장: 디스플레이 엔티티 장면(평면 모델 + 알파 + billboard 근사 + brightness 15)을 틱마다 렌더해 콘택트 시트로 만든다. 프레임 애니메이션 GIF 출력
9. `atelier/mc/lint.js`: mcmeta 나눗셈, 모델 참조 무결성, 아이템 요소 회전, UV 0~16, 양면 확인, 텍스처 2의 거듭제곱 확인

**P3 — HUD/폰트 (중간 실현성)**
10. `atelier/mc/font.js`: `glyphSheet(images, {cell, ascent, height, startCodepoint:0xE000})` → PNG + bitmap provider, `spaceProvider(range)`, 숫자 폰트 생성기(`damageDigits({style})`), HUD 레이아웃 시뮬레이터
11. 플러그인 어댑터(선택): `toItemsAdderYaml()`, `toNexoGlyphYaml()`

**P4 — ModelEngine (중간 실현성)**
12. `export.js` 수정: `toBBModel(m, {format:'free'})` 추가, ME 린트(큐브 회전 0/±22.5/±45 단일축, `hitbox` X=Z, bezier 금지), 빈 이펙트 본(`fx_*`) + Instructions 키프레임(`effects` 애니메이터, `mm:skill`) 생성
13. 이펙트 메시 프리셋: 회전 링, 소환 마법진, 검기 모델(본 하나에 평면 여러 장)

**P5 — 후순위/범위 밖**
- 코어 셰이더(애니메이션 글리프, emissive alpha 트릭), OptiFine `_e.png` 출력, Bedrock 파티클 JSON(Snowstorm 호환 flipbook), 사운드 합성

---

## 7. 요약표 — 효과 → 기법 → 생성 에셋 → Atelier 실현성 → 검증 방법

| 효과 | 기법(권장) | Atelier가 생성할 에셋 | 실현성 | 검증 |
|---|---|---|---|---|
| 베기 궤적 | item_display + 평면 모델 + 보간, 프레임 모델 교체 | 아크 텍스처 N프레임, 평면 모델, range_dispatch items json, 소환 mcfunction | **높음** | 로컬: 프레임 시트와 three.js 타임라인 / 서버: 반투명, 밉맵 |
| 타격 스파크 | 파티클 재텍스처(희귀 ID) 또는 item 파편 파티클 | 8~16px 스프라이트 4~6장, particles json | **높음** | 로컬: 시트 / 서버: 렌더 타입, 프레임 방식 |
| 마법진/룬 | 바닥 평면 디스플레이 회전 보간 + 반복 mcmeta | 64~128px 원형 텍스처, mcmeta, 평면 모델 | **높음** | 로컬: 회전 시뮬레이션 / 서버: 정렬, 크기 |
| 충격파 링 | 평면 링 스케일 보간 + 알파 단계 모델 | 링 텍스처 3~5단계, 모델 | **높음** | 로컬 / 서버 |
| 오라 | 파티클 도형 + 탑승 디스플레이 | 반복 애니메이션 텍스처, 원판/원기둥 모델 | 중간 | 로컬: 루프 이음매 / 서버: 탑승 위치 |
| 레벨업 | 파티클 + 링 + 타이틀 글리프 | 링, 글리프 PNG + font json | 중간 | 로컬: 글리프 배치 / 서버 |
| 힐/버프 | 파티클 + 상승 아이콘 디스플레이 | 십자/잎 스프라이트, 틴트용 흑백 | **높음** | 로컬 |
| 투사체+꼬리 | item_display tp + teleport_duration, MM bullet model | 투사체 모델(큐브/평면), 반복 텍스처 | **높음** | 로컬: 모델 / 서버: 이동 보간 |
| 번개 | 바닐라 번개 효과 + 띠 텍스처 평면 체인 | 지그재그 텍스처 2~4프레임 | 중간 | 로컬 / 서버 |
| 원소 변형 | 흑백 마스크 + custom_model_data 틴트 | 공용 마스크 세트 + tints 정의 | **높음** | 로컬: 틴트 그리드 |
| 루트 빔/등급 발광 | Glowing + 팀 색, 세로 빔 디스플레이 | 그라디언트 빔 텍스처, 등급 색표 | **높음** | 서버: 발광 외곽선 |
| 데미지 숫자 | text_display + 커스텀 숫자 폰트 | 숫자 글리프 시트 + font json + 명령 템플릿 | **높음** | 로컬: 레이아웃 / 서버: 스케일 |
| 텔레포트 | 순차 링 + 파티클 + 풀스크린 글리프 | 링/소용돌이, 비네팅 글리프 | 중간 | 서버 |
| 보스 HUD | 보스바 제목 글리프 + 음수 공간 | 큰 글리프, space provider | 중간 | 서버 필수(GUI 스케일) |
| 커스텀 보스 이펙트 모델 | ModelEngine/BetterModel | 규약 준수 .bbmodel + 애니메이션 + 이펙트 키프레임 | 중간 | 로컬: 린트, Blockbench / 서버: ME import |
| 애니메이션 글리프/발광 셰이더 | 코어 셰이더 | 셰이더 템플릿 | **낮음** | 서버 필수, 버전마다 깨짐 |

---

## 8. 검증하지 못한 주장 / 버전 의존 목록
1. `particles/<id>.json`의 정확한 스키마(`textures` 배열)는 위키 본문에서 확인하지 못했다. 바닐라 팩 구조 지식에 근거한다.
2. 파티클별 프레임 선택 방식(나이 기반 vs 무작위)과 렌더 타입(opaque/translucent) 전체 목록 — 코드 상수라 실클라이언트로 확인해야 한다.
3. 파티클 텍스처 크기 제한 — 명시된 제한을 찾지 못했다.
4. `.mcmeta` 애니메이션이 전역 시계로 동기화된다는 점(엔티티별 시작 프레임 제어 불가).
5. item_display에서 커스텀 아이템 모델의 반투명 렌더 여부, 1.21.11 이전 아이템 텍스처 밉맵이 VFX에 주는 영향.
6. 아이템 모델 요소에 1.21.6/1.21.11의 회전 제한 완화가 적용되는지.
7. ModelEngine R4.1의 실제 렌더 엔티티(디스플레이 엔티티 여부), blueprints 경로, 텍스처 애니메이션 지원 여부.
8. 쿼터니언 보간이 180° 이상에서 반대로 도는 현상(slerp 최단 경로) — 코드 지식.
9. bitmap 폰트 provider 필드 제약(ascent ≤ height 등) — 위키 Font 페이지 본문에서 확인하지 못했다.
10. Geyser를 쓸 때 Bedrock 유저에게 보이는 디스플레이 엔티티와 커스텀 파티클 범위.
11. 1.21.9+ `pack.mcmeta`의 `min_format`/`max_format` 필드 형식, 정식판별 정확한 pack_format 값.
12. EffectLib 파라미터 이름(README에 없고 소스 기준), MagicSpells의 현행 EffectLib 연동 방식.

## 출처 모음
- https://minecraft.wiki/w/Particle_format
- https://minecraft.wiki/w/Commands/particle
- https://minecraft.wiki/w/Particles
- https://minecraft.wiki/w/Resource_pack
- https://minecraft.wiki/w/Atlas
- https://minecraft.wiki/w/Model
- https://minecraft.wiki/w/Items_model_definition
- https://minecraft.wiki/w/Display
- https://minecraft.wiki/w/Template:Nbt_inherit/display_entity/template
- https://minecraft.wiki/w/Java_Edition_1.19.4 , https://minecraft.wiki/w/Java_Edition_23w31a , https://minecraft.wiki/w/Java_Edition_24w33a , https://minecraft.wiki/w/Java_Edition_24w36a
- https://minecraft.wiki/w/Font , https://minecraft.wiki/w/Text_component_format
- https://wiki.mythiccraft.io/mythicmobs/Skills/Mechanics (+ /Particle, /ParticleRing)
- https://wiki.mythiccraft.io/modelengine/Modeling/Creating-a-Model , /Bone-Behaviors , /Animating-a-Model , /Scriptable-Keyframes
- https://github.com/elBukkit/EffectLib
- https://modrinth.com/plugin/bettermodel
- https://itemsadder.devs.beer/adding-content/font-images/font-images , https://itemsadder.devs.beer/adding-content/player-emotes , https://itemsadder.devs.beer/faq/modelengine-vs-itemsadder
- https://docs.nexomc.com/configuration/glyphs/animated-glyphs , https://docs.nexomc.com/configuration/glyphs/multi-bitmap-glyph
- https://docs.oraxen.com/configuration/texteffects/
- https://optifine.readthedocs.io/emissive_textures.html
- https://github.com/AmberWat/NegativeSpaceFont , https://docs.xenondevs.xyz/nova/addon/fonts/fonts
- https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/particlesintroduction
