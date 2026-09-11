# LookAtMe

### Turn an AI Character Video into a Mouse-Following Web Avatar

Turn an AI-generated character video into a lightweight mouse-following web avatar — no rigged 3D model required.

LookAtMe is a small, reusable **pseudo-3D, 2D frame-based interaction**. It selects a still image that faces the pointer. It is not a rigged 3D model, a video player, or a portfolio generator.

```text
Character Image
      ↓
AI Rotation Video             Bring your own video
      ↓
Frame Extraction              FFmpeg: every decoded frame
      ↓
Contact Sheet                 Numbered visual candidates
      ↓
Directional Frame Selection   Human-inspected representative views
      ↓
Angle Map                     Explicit angles → filenames
      ↓
Mouse-Following Web Avatar     Static images + JavaScript
```

## Demo screenshots

The standalone playground with the sample character:

![LookAtMe demo with the neutral character and setup overview](docs/demo.png)

Move the pointer to switch to an inspected directional frame. The debug readout shows the selected direction and pointer angle:

![LookAtMe character looking southeast with the live angle debug readout](docs/interaction.png)

## Try the included character

Requires Node.js 22.12+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Move the cursor around the portrait; its middle is a neutral dead zone. The debug checkbox shows the chosen frame and cursor angle. On touch devices, moving a touch pointer updates the frame without preventing page scrolling.

```bash
npm test
npm run build
npm run preview
# Optional processing-tool tests, after installing Python requirements:
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
```

`dist/` is the standalone demo. `lib/` contains the reusable React library, types, and a bundled vanilla module. No Python, FFmpeg, AI service, API key, or server is needed at runtime.

## Prepare your own video

Install FFmpeg (including `ffprobe`) and Python 3.10+. Then, from the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r tools/requirements.txt
npm run build:lib
python tools/extract_frames.py character-video.mp4 --output work
python tools/make_contact_sheet.py work/frames --output work/contact-sheet.jpg
```

Extraction saves `work/video-info.json` containing video stream metadata, and `work/frames/000001.png`, etc. Frame numbers are **1-based decoded visual frame order**, not encoded I-frame indices. All frames are extracted at source cadence. Large videos need substantial disk space; use a short input clip. Contact sheets paginate every 120 candidates (`contact-sheet.jpg`, `contact-sheet-2.jpg`, …).

Inspect the sheets and write `selection.json`:

```json
{
  "center": { "frame": 121 },
  "directions": [
    { "key": "e", "angle": 0, "frame": 44 },
    { "key": "s", "angle": 90, "frame": 61 },
    { "key": "w", "angle": 180, "frame": 78 },
    { "key": "n", "angle": 270, "frame": 106 }
  ]
}
```

These example indices belong to the original sample video only. Choose your own indices for your video. `example/selection.json` preserves all 16 inspected sample directions.

**Never assume equal time intervals mean equal rotation angles.** AI videos may repeat poses, distort faces, or rotate inconsistently. Choose representative images visually. Four directions work; more views can make changes more subtle. Target angles may be unevenly spaced. Use a front-facing center frame, consistent framing and lighting, and reject distorted views. This tool does not remove backgrounds or automatically detect head poses.

```bash
python tools/build_angle_map.py --frames work/frames --selection selection.json --output output --max-size 768
python -m http.server 8080 --directory output
```

Open [the generated preview](http://localhost:8080/preview.html). Serve over HTTP; browsers may block JSON/modules when opened with `file://`.

```text
output/
├── frames/              Optimised PNGs; alpha preserved; no upscaling
│   ├── center.png
│   ├── e.png
│   └── ...
├── angle-map.json
├── contact-sheet.jpg    Selected views, labelled with source indices
├── preview.html
└── lookatme.js          Standalone vanilla runtime for the preview
```

The builder validates keys, source files, identical image dimensions, unique angles and positive frame indices. A frame may deliberately serve multiple directions. Existing nonempty output folders are refused to prevent mixing old and new assets. Use a fresh output directory when revising selections.

To run the main demo with your assets, replace `example/frames/` and `example/angle-map.json` with the generated versions, then restart `npm run dev`.

## React integration

The package is not published to npm. Either copy `src/core/`, `src/component/`, and `src/index.ts` into your project's `src/lookatme/`, or build and install a local package:

```bash
# Inside LookAtMe
npm run build
npm pack
# Inside the consuming React application
npm install /absolute/path/to/lookatme/lookatme-avatar-0.1.0.tgz
```

Copy the generated `frames/` and `angle-map.json` into your application's `public/avatar/` directory.

```tsx
import { LookAtMeAvatar } from 'lookatme-avatar';
// If copying source: import { LookAtMeAvatar } from './lookatme';

export function Character() {
  return (
    <LookAtMeAvatar
      frameBasePath="./avatar/frames"
      angleMap="./avatar/angle-map.json"
      size={600}
      deadZone={0.12}
    />
  );
}
```

For a Vite site deployed under `/my-site/`, use its deployment base explicitly:

```tsx
const base = import.meta.env.BASE_URL;
<LookAtMeAvatar
  frameBasePath={`${base}avatar/frames`}
  angleMap={`${base}avatar/angle-map.json`}
  width="100%"
  height={480}
  objectFit="contain"
  tracking="avatar"
/>
```

A leading `/avatar` always refers to the domain root; it will not automatically include a GitHub Pages repository path. Relative URLs resolve against `document.baseURI`, so nested router routes should use an explicit deployment base. `angleMap` also accepts an already-loaded `AngleMap` object; keep its reference stable across renders.

| Prop | Default | Meaning |
| --- | --- | --- |
| `frameBasePath` | required | Directory holding frame images |
| `angleMap` | required | JSON URL or validated map object |
| `size` | `600` | Width in pixels or CSS length; square when height omitted |
| `width`, `height` | unset | Override dimensions; width is capped at 100% of parent |
| `objectFit` | `contain` | Image fitting mode |
| `deadZone` | `0.12` | Radius / shorter tracking dimension, range 0–1 |
| `tracking` | `avatar` | `avatar` midpoint or `viewport` midpoint |
| `alt` | Character following the pointer | Accessible image description |
| `onFrameChange` | unset | Debug callback `{ angle, key, isCenter }`, at most once per animation frame |
| `onError` | unset | Load/validation error callback; React also displays an error |

The component never intercepts pointer events. Without pointer movement it stays neutral. It resets on pointer exit or window blur. Unmounting removes observers/listeners; prop changes reload the runtime. Render it in a dimensioned parent when using percentage heights.

## Vanilla JavaScript integration

Copy `lib/vanilla.js` into your website alongside your generated assets. It has no React dependency and no external imports.

```html
<div id="lookatme-avatar"></div>
<script type="module">
  import { createLookAtMeAvatar } from './vanilla.js';
  const avatar = createLookAtMeAvatar({
    element: '#lookatme-avatar',
    frameBasePath: './avatar/frames',
    angleMap: './avatar/angle-map.json',
    size: 600,
    deadZone: 0.12
  });
  await avatar.ready; // catch errors in your application's UI
  // On page teardown: avatar.destroy();
</script>
```

Bundler consumers can import from `lookatme-avatar/vanilla`. Options match React. `element` accepts a selector or HTMLElement; only the owned avatar child is removed on teardown.

## Angle map and architecture

```json
{
  "version": 1,
  "center": { "key": "center", "src": "center.png", "frame": 121 },
  "directions": [
    { "key": "e", "angle": 0, "src": "e.png", "frame": 44 },
    { "key": "n", "angle": 270, "src": "n.png", "frame": 106 }
  ]
}
```

Angles use screen coordinates: **east 0°, south 90°, west 180°, north 270°**. The runtime picks the smallest circular angular distance. Equal distances prefer the first configured entry. `frame` is provenance only. Sources are image filenames, joined to `frameBasePath`; supported formats are PNG, WebP and JPEG. Keys and angles must be unique.

- `tools/`: video inspection/extraction, paginated contact sheets, explicit selections → optimised static output.
- `example/`: reusable sample assets and mappings; Vite serves this as its public asset directory.
- `src/core/`: pure geometry, map validation, decoding, shared pointer/render lifecycle.
- `src/component/`: typed React adapter. Pointer lifecycle stays in the shared runtime instead of a React-specific hook.
- `src/vanilla.ts`: framework-free adapter; builds to a single ES module.
- `src/demo/`: neutral playground, isolated from library code.
- `docs/extraction.md`: reference implementation findings and removed portfolio coupling.

All frames are decoded before interaction starts and retained in the DOM. Visibility changes occur in one animation frame, with no opacity fades or brightness blending. Startup waits for the full set; one bad image fails the load with a clear error. Keeping many large decoded images costs memory (approximately width × height × 4 bytes each). Downsize assets during preparation. Lighting changes already present in source images still need editorial correction.

## GitHub Pages

The demo uses relative deployment paths. `.github/workflows/pages.yml` tests, builds and deploys `dist/` on pushes to `main`.

1. Create a GitHub repository named `lookatme` and push this standalone repository to it.
2. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
3. Run the workflow or push to `main`. The deployment job reports the live URL.

The repository and workflow are ready locally; a live GitHub deployment requires pushing to a remote and enabling Pages. To test a sub-path locally, serve the parent of a directory containing `dist/` and visit that directory's URL.

## Attribution and licence

New LookAtMe code is MIT licensed; see `LICENSE`. Sample character assets and the selected-frame contact sheet were supplied by Lingyun Zhao's [reference portfolio](https://github.com/lingyun1010/lingyun-zhao-ai-portfolio). They are included as demonstration material and excluded from the code licence; see `example/ASSETS.md`. Use your own character assets for redistribution where you need an explicit asset licence.

No authentication, database, AI generation APIs, payments, portfolio content or automatic pose estimation are included.
