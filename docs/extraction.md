# Extraction audit

Reference: https://github.com/lingyun1010/lingyun-zhao-ai-portfolio
Inspected its local checkout at commit `663fb67` (clean working tree).

The live frame interaction is inline in `index.html` (ANGLE_KEYS starts at line 1383). `src/main.tsx` contains a separate older pupil-overlay implementation, not the requested frame system.

| Concern | Reference behaviour | LookAtMe extraction |
| --- | --- | --- |
| Assets | 16 directional PNGs plus center; additional legacy direction aliases | Copy only the 17 referenced assets |
| Selection | Inspected contact sheets, 121 decoded visual frames; source notes one encoded I-frame | Explicit 1-based decoded frame selections; never infer pose from elapsed time |
| Angle keys | East 0°, clockwise in screen coordinates; 16 evenly spaced target angles mapped to uneven source indices | Arbitrary target angles supported; same inspected sample selections preserved |
| Distance | Circular shortest distance with stable first-entry ties | Pure selector, separately tested |
| Pointer origin | Viewport midpoint regardless of portrait location | Avatar midpoint by default, optional viewport mode |
| Dead zone | Distance < 13% of shorter viewport dimension | Configurable fraction, default 12%; boundary included |
| Swapping | Change one image src only when key changes | Decode all frames, retain image elements, atomically change visibility without opacity transitions |
| Preloading | Fire-and-forget Image objects | Await decoding; visible errors for missing/corrupt assets |
| Reset | Window pointerleave returns to center | Document exit, window blur/cancel and hidden document reset |
| Responsive | Hero-specific absolute positioning, clamp width, mobile top/translate overrides | Responsive max-width, explicit dimensions/object-fit; recalculate on scroll/resize |
| Asset paths | Inline relative paths; JSON uses root-relative paths and is not loaded by runtime | Runtime consumes validated JSON with filenames joined to explicit base path |

Cleanly extractable: selected PNGs, directional data, circular-distance calculation, nearest-angle choice, neutral-frame concept, preloading intent.

Portfolio coupling removed: `#characterFrame` DOM lookup, hero positioning and glow/shadow, global inline-script lifecycle, hardcoded viewport origin, hardcoded paths and constants. No GhostCursor, card effects, layout, biography, CV, projects, React pupil overlays, or Three.js is included.

The two reference contact sheets were visually inspected. Several neighbouring views are very similar; the sample intentionally preserves those human selections instead of claiming measured head-pose accuracy. `docs/selected-frames.jpg` preserves the selected reference sheet. Source image colour/exposure differences may remain; the runtime removes transition flicker, not differences baked into artwork.
