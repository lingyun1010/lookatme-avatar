"""Build static avatar assets from explicit, visually inspected frame selections."""
import argparse
import json
import math
import re
import shutil
import tempfile
from pathlib import Path
from PIL import Image
from make_contact_sheet import make_sheets


def build(frames, selection, output, max_size=768):
    if output.exists() and any(output.iterdir()):
        raise ValueError('Use an empty output directory; existing assets are never overwritten')
    if max_size < 1:
        raise ValueError('max-size must be positive')
    directions = selection.get('directions')
    if not isinstance(directions, list) or not directions:
        raise ValueError('directions must be a nonempty list')
    entries = [dict(selection['center'], key='center'), *directions]
    keys, angles, sources = set(), set(), []
    dimensions = None
    for index, entry in enumerate(entries):
        key, number = entry.get('key'), entry.get('frame')
        if not isinstance(key, str) or not re.fullmatch(r'[a-zA-Z0-9_-]+', key) or key in keys:
            raise ValueError('Frame keys must be unique safe names')
        keys.add(key)
        if type(number) is not int or number < 1:
            raise ValueError('Frame numbers must be positive integers')
        if index:
            angle = entry.get('angle')
            if type(angle) not in (int, float) or not math.isfinite(angle) or not 0 <= angle < 360 or angle in angles:
                raise ValueError('Angles must be unique finite numbers in [0, 360)')
            angles.add(angle)
        source = frames / f'{number:06d}.png'
        with Image.open(source) as image:
            if dimensions and image.size != dimensions:
                raise ValueError('All selected frames must have identical dimensions')
            dimensions = image.size
        sources.append(source)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output.parent) as temporary:
        staging = Path(temporary)
        (staging / 'frames').mkdir()
        mapped = []
        for entry, source in zip(entries, sources):
            filename = entry['key'] + '.png'
            with Image.open(source) as image:
                image = image.convert('RGBA')
                image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                image.save(staging / 'frames' / filename, optimize=True)
            mapped.append({**entry, 'src': filename})
        angle_map = {'version': 1, 'center': mapped[0], 'directions': mapped[1:]}
        with Image.open(staging / 'frames' / mapped[0]['src']) as center_image:
            output_width, output_height = center_image.size
        frame_set = {
            'version': 2,
            'center': mapped[0],
            'directions': mapped[1:],
            'metadata': {
                'width': output_width,
                'height': output_height,
                'aspectRatio': output_width / output_height,
                'source': {'type': 'video'},
            },
        }
        (staging / 'angle-map.json').write_text(json.dumps(angle_map, indent=2) + '\n')
        (staging / 'avatar-frame-set.json').write_text(json.dumps(frame_set, indent=2) + '\n')
        make_sheets([staging/'frames'/entry['src'] for entry in mapped], staging/'contact-sheet.jpg', labels=[f"{e['key']} / frame {e['frame']}" for e in mapped])
        shutil.copy2(Path(__file__).with_name('preview.html'), staging/'preview.html')
        bundle = Path(__file__).resolve().parents[1]/'lib/vanilla.js'
        if not bundle.is_file():
            raise ValueError('Run npm install and npm run build:lib before building assets')
        shutil.copy2(bundle, staging/'lookatme.js')
        output.mkdir(exist_ok=True)
        shutil.copytree(staging, output, dirs_exist_ok=True)
    return frame_set


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--frames', type=Path, required=True)
    parser.add_argument('--selection', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path('output'))
    parser.add_argument('--max-size', type=int, default=768)
    args = parser.parse_args()
    try:
        build(args.frames, json.loads(args.selection.read_text()), args.output, args.max_size)
        print(f'Avatar generated in {args.output}. Serve it over HTTP to open preview.html.')
    except (ValueError, KeyError, TypeError, OSError) as error:
        parser.error(str(error))
