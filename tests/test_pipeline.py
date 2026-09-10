import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from PIL import Image
from build_angle_map import build
from make_contact_sheet import make_sheets

class PipelineTests(unittest.TestCase):
    def test_build_preserves_explicit_selections_and_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            frames = root/'frames'
            frames.mkdir()
            for number in (1, 7):
                Image.new('RGBA', (80, 100), (10, 20, 30, 0)).save(frames/f'{number:06d}.png')
            selection = {'center': {'frame': 7}, 'directions': [{'key': 'east', 'angle': 13, 'frame': 1}]}
            result = build(frames, selection, root/'output', 50)
            self.assertEqual(result['directions'][0]['frame'], 1)
            self.assertEqual(result['directions'][0]['angle'], 13)
            with Image.open(root/'output/frames/center.png') as image:
                self.assertEqual(image.size, (40,50))
                self.assertEqual(image.getpixel((0,0))[3], 0)
            self.assertTrue((root/'output/preview.html').exists())
            with self.assertRaises(ValueError): build(frames, selection, root/'output')
            selection['directions'][0]['key'] = '../bad'
            with self.assertRaises(ValueError): build(frames, selection, root/'bad')
            self.assertFalse((root/'bad').exists())

    def test_contact_sheet_pagination(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source=root/'000001.png'
            Image.new('RGB',(20,30)).save(source)
            result=make_sheets([source]*121,root/'sheet.jpg')
            self.assertEqual([p.name for p in result],['sheet.jpg','sheet-2.jpg'])

if __name__ == '__main__': unittest.main()
