#!/bin/bash
# 파비콘 래스터 → 시트 렌더
set -e
cd /home/user/PIXELTEST
D=bench3/atelier
node atelier/cli.js render $D/fav/fav16.mjs $D/fav/fav32.mjs $D/fav/fav16d.mjs --out $D/fav/out >/dev/null
python3 -I $D/fav/topx.py $D/fav/out/fav16.png $D/out/fav16.json $D/fav/out/fav32.png $D/out/fav32.json $D/fav/out/fav16d.png $D/out/fav16d.json
node atelier/cli.js render $D/e3.mjs --out $D/out
