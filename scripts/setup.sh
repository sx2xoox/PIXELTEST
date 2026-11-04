#!/usr/bin/env bash
# 로컬 폰트 설치(1회). 외부 '디자인 서비스'가 아니라 오픈 라이선스 폰트 파일만 받는다.
set -euo pipefail
FONT_DIR="${HOME}/.local/share/fonts/atelier"
mkdir -p "$FONT_DIR"
TMP="$(mktemp -d)"
( cd "$TMP" && npm pack pretendard@1.3.9 --silent >/dev/null && tar xzf pretendard-*.tgz )
cp "$TMP"/package/dist/public/static/*.otf "$FONT_DIR"/ 2>/dev/null || true
rm -rf "$TMP"
fc-cache -f "$FONT_DIR" >/dev/null
fc-list | grep -c "Pretendard" | xargs -I{} echo "Pretendard faces installed: {}"
