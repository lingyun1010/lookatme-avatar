"""Create numbered, paginated contact sheets without distorting source aspect ratios."""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps


def make_sheets(files, output, columns=6, per_page=120, labels=None):
    if not files:
        raise ValueError('No frames found')
    output.parent.mkdir(parents=True, exist_ok=True)
    results = []
    for start in range(0, len(files), per_page):
        batch = files[start:start + per_page]
        sheet = Image.new('RGB', (columns * 180, ((len(batch) + columns - 1) // columns) * 204), '#eeeeea')
        draw = ImageDraw.Draw(sheet)
        for index, path in enumerate(batch):
            x, y = index % columns * 180, index // columns * 204
            with Image.open(path) as source:
                thumb = ImageOps.contain(source.convert('RGBA'), (168, 174))
                sheet.paste(thumb, (x + (180 - thumb.width)//2, y + 5), thumb)
            draw.text((x + 8, y + 182), labels[start + index] if labels else path.stem, fill='#222222')
        target = output if start == 0 else output.with_name(f'{output.stem}-{start//per_page + 1}{output.suffix}')
        sheet.save(target, quality=90)
        results.append(target)
    return results


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('frames', type=Path)
    parser.add_argument('--output', type=Path, default=Path('work/contact-sheet.jpg'))
    args = parser.parse_args()
    try:
        for path in make_sheets(sorted(args.frames.glob('*.png')), args.output):
            print(path)
    except ValueError as error:
        parser.error(str(error))
