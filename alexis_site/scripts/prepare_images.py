"""One-time technical decoding of the provisional PDF-extracted JPEGs.

Raw files remain untouched. These particular untagged CMYK JPEGs have reversed
channel polarity. This is NOT a creative filter; do not apply this conversion
to future originals. No original ICC profile was supplied, so absolute color
matching still requires the artist's source photographs.
Requires Pillow (available in the Codex bundled Python runtime).
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageCms, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets' / 'web'
DEST.mkdir(parents=True, exist_ok=True)
profile = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
manifest = {}
for source in sorted((ROOT / 'assets' / 'raw').glob('*.jpg')):
    with Image.open(source) as raw:
        if raw.mode != 'CMYK' or raw.info.get('icc_profile') or raw.info.get('adobe'):
            raise ValueError(f'Unexpected image encoding: {source}; review manually.')
        decoded = Image.merge('CMYK', tuple(channel.point(lambda value: 255-value) for channel in raw.split())).convert('RGB')
        variants = []
        for width in sorted(set([min(480, decoded.width), min(960, decoded.width), decoded.width])):
            output = DEST / f'{source.stem}-{width}.jpg'
            scaled = decoded.resize((width, round(decoded.height * width / decoded.width)), Image.Resampling.LANCZOS)
            scaled.save(output, quality=94, subsampling=0, icc_profile=profile, optimize=True)
            variants.append({'src': output.relative_to(ROOT).as_posix(), 'width': width})
        manifest[source.name] = {'src': variants[-1]['src'], 'width': decoded.width, 'height': decoded.height, 'sources': variants, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest()}
(ROOT / 'data' / 'images.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(f'Prepared {len(manifest)} images; raw files preserved.')
