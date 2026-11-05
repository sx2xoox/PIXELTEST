import sys, json
from PIL import Image
for src, dst in zip(sys.argv[1::2], sys.argv[2::2]):
    im = Image.open(src).convert('RGB'); w, h = im.size
    px = ['#%02x%02x%02x' % im.getpixel((i, j)) for j in range(h) for i in range(w)]
    json.dump({'w': w, 'h': h, 'px': [[p, 1] for p in px]}, open(dst, 'w'))
