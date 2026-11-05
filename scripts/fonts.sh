#!/usr/bin/env bash
# 타이포그래피 연습용 오픈 라이선스(SIL OFL 1.1) 폰트 설치. 출처: google/fonts 저장소(jsDelivr 경유).
# 역할별로 고름 — 한 디자인에 2종(제목용 + 본문용)만 섞는 것이 원칙이다.
#   한글 명조(격식·문학): Nanum Myeongjo, Gowun Batang(부드러운 명조), Song Myung(붓맛 제목)
#   한글 제목(강함·귀여움·손글씨): Black Han Sans(두꺼운 고딕), Do Hyeon(둥근 고딕), Gowun Dodum(부드러운 고딕), Gaegu(손글씨)
#   라틴 세리프: Playfair Display(고대비 디스플레이), DM Serif Display, Cormorant Garamond(우아함), Fraunces(편집용, 가변)
#   라틴 산세리프/디스플레이: Space Grotesk(기하·테크), Archivo Black(포스터 굵기), Bebas Neue(좁은 대문자)
#   (기존) Pretendard·Inter = 중립 본문, JetBrains Mono = 고정폭
set -euo pipefail
DIR="${HOME}/.local/share/fonts/atelier"
mkdir -p "$DIR"
B="https://cdn.jsdelivr.net/gh/google/fonts@main/ofl"
FILES=(
  nanummyeongjo/NanumMyeongjo-Regular.ttf nanummyeongjo/NanumMyeongjo-Bold.ttf nanummyeongjo/NanumMyeongjo-ExtraBold.ttf
  gowunbatang/GowunBatang-Regular.ttf gowunbatang/GowunBatang-Bold.ttf songmyung/SongMyung-Regular.ttf
  blackhansans/BlackHanSans-Regular.ttf dohyeon/DoHyeon-Regular.ttf gowundodum/GowunDodum-Regular.ttf
  gaegu/Gaegu-Regular.ttf gaegu/Gaegu-Bold.ttf
  dmserifdisplay/DMSerifDisplay-Regular.ttf dmserifdisplay/DMSerifDisplay-Italic.ttf
  "playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf" "playfairdisplay/PlayfairDisplay-Italic%5Bwght%5D.ttf"
  "cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf" "fraunces/Fraunces%5BSOFT,WONK,opsz,wght%5D.ttf"
  "spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf" archivoblack/ArchivoBlack-Regular.ttf bebasneue/BebasNeue-Regular.ttf
)
for f in "${FILES[@]}"; do
  out="$DIR/$(basename "$f" | sed 's/%5B/[/g; s/%5D/]/g')"
  [ -s "$out" ] || curl -fsSL -o "$out" "$B/$f"
done
fc-cache -f "$DIR" >/dev/null
echo "installed: $(ls "$DIR" | wc -l) files"
