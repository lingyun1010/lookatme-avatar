# LookAtMe

LookAtMe is an open-source mouse-follow avatar engine for web projects. Use AI-generated frames, video-derived frames, or your own images. The renderer is independent of how the avatar frames are created.

```text
AI photo generation ──┐
Video extraction ─────┼→ AvatarFrameSet → LookAtMe Renderer
Your own images ──────┘
```

[View the public sample](https://lingyun1010.github.io/lookatme-avatar/) · [Repository](https://github.com/lingyun1010/lookatme-avatar)

LookAtMe is a reusable SDK, not a permanently hosted backend. Applications install the package and choose only the pieces they need:

```text
LookAtMe SDK
├── browser/core       AvatarFrameSet, validation, vanilla renderer
├── react              React component adapter
├── producers          manual, video, and photo-generation contracts
└── server             photo orchestration, OpenAI adapter, local storage helpers
```

The development server in this repository exists only to demonstrate and test the SDK. A consuming application does not run or deploy the LookAtMe demo server.

## Installation

The package is not currently published to the npm registry. Install the current repository directly from GitHub:

```bash
npm install github:lingyun1010/lookatme
```

The installed package name is `lookatme-avatar`, so imports use that name. GitHub installation runs the package's library-only `prepare` build.

For local development of LookAtMe itself:

```bash
git clone https://github.com/lingyun1010/lookatme.git
cd lookatme
npm install
npm test
npm run build
```

## A. I already have avatar images

No API key, AI provider, Python, or LookAtMe server is required. Put the images in your application's public assets and provide an `AvatarFrameSet`:

```ts
import {
  createLookAtMeAvatar,
  type AvatarFrameSet
} from 'lookatme-avatar';

const frames: AvatarFrameSet = {
  version: 2,
  center: { key: 'center', src: '/avatar/center.png' },
  directions: [
    { key: 'right', angle: 0, src: '/avatar/right.png' },
    { key: 'down', angle: 90, src: '/avatar/down.png' },
    { key: 'left', angle: 180, src: '/avatar/left.png' },
    { key: 'up', angle: 270, src: '/avatar/up.png' }
  ],
  metadata: { source: { type: 'manual' } }
};

const avatar = createLookAtMeAvatar({
  container: '#avatar',
  frames,
  size: 480
});

await avatar.ready;
// Later: avatar.destroy();
```

Missing diagonals are fine: the renderer selects the nearest configured angle. Frame URLs may be relative, absolute, blob, or data URLs supported by the browser.

### React

React is isolated in its own entry point:

```tsx
import { LookAtMeAvatar } from 'lookatme-avatar/react';
import type { AvatarFrameSet } from 'lookatme-avatar';

export function Character({ frames }: { frames: AvatarFrameSet }) {
  return <LookAtMeAvatar frames={frames} width="100%" size={480} />;
}
```

### Standalone HTML

The framework-free bundled module is exported from `lookatme-avatar/vanilla`. It exposes the same `createLookAtMeAvatar()` adapter and contains no React or server dependency.

## B. I want LookAtMe to generate an avatar from my portrait

Photo generation runs inside **your application's server environment**. Your backend imports `lookatme-avatar/server`, supplies its own storage choice and `OPENAI_API_KEY`, and returns the resulting `AvatarFrameSet` to its frontend.

LookAtMe does not need a separate deployed service:

```ts
import {
  LocalAvatarImageStorage,
  OpenAIImageGenerationProvider,
  PhotoAIFrameProducer,
  SharpGeneratedImageValidator
} from 'lookatme-avatar/server';

const producer = new PhotoAIFrameProducer({
  provider: new OpenAIImageGenerationProvider({
    apiKey: process.env.OPENAI_API_KEY
  }),
  storage: new LocalAvatarImageStorage('./generated', '/generated'),
  validator: new SharpGeneratedImageValidator()
});

const frames = await producer.produce({
  image: uploadedImageBytes,
  mimeType: 'image/jpeg',
  style: 'felt@1',
  preset: 'balanced'
});
```

Do not import `lookatme-avatar/server` from browser code. It intentionally depends on Node.js, `openai`, `sharp`, and filesystem helpers. Production applications can replace local storage by implementing `AvatarImageStorage` for S3, Cloudflare R2, Vercel Blob, Supabase Storage, or another durable store.

### Generation flow

```text
Uploaded portrait
      ↓
Preprocess and normalize
      ↓
Generate canonical CENTER
      ↓
Generate every direction from CENTER
      ↓
Validate and store images
      ↓
AvatarFrameSet
```

The canonical center is always generated first. All directional frames use it as their identity and style reference.

| Preset | Total frames | Directional angles | Tradeoff |
| --- | ---: | --- | --- |
| `fast` | 5 | Every 90° | Quickest and cheapest |
| `balanced` | 9 | Every 45° | Recommended default |
| `smooth` | 13 | Every 30° | More directional fidelity and generation work |

Styles are versioned: `felt@1`, `cartoon@1`, `cinematic-3d@1`, and `anime@1`. Partial failures retain completed files. Use `regenerateFrame(frameSetId, style, angle)` to replace one diagonal or arbitrary-angle frame without regenerating the avatar.

The included OpenAI adapter uses the working `gpt-image-2` image-edit request with medium quality and PNG output. It deliberately does not send `input_fidelity`.

## C. Use LookAtMe with an AI coding agent

LookAtMe also supports an agent-assisted workflow that does not require the OpenAI API provider:

```text
AI coding environment
       ↓
Generate or prepare directional images
       ↓
LookAtMe manual frames / AvatarFrameSet
       ↓
LookAtMe renderer
```

1. Add LookAtMe to the target project.
2. Add or attach a portrait.
3. Ask Codex, Claude Code, or another coding agent to inspect this README and the package exports.
4. If that environment has an image-generation capability, ask it to create and save the directional frames in the target project.
5. Otherwise, generate the frames with any external image tool or provide them yourself.
6. Build an `AvatarFrameSet` and mount the existing renderer.

This workflow uses the coding environment's own tools and permissions. LookAtMe cannot programmatically consume Codex, Claude, ChatGPT, or other subscription quota.

Copy-paste prompt:

```text
Add a mouse-follow avatar to this project using LookAtMe.

Repository:
https://github.com/lingyun1010/lookatme

Inspect the LookAtMe README and package exports first.

Use my portrait to create the avatar frames if your environment has image-generation capability.
Otherwise tell me which directional images I need to provide.

Do not recreate the mouse-follow implementation.
Use LookAtMe's AvatarFrameSet and existing renderer.

Integrate the result naturally into this project's existing UI.

Do not deploy or commit anything.
```

## Video-to-frames workflow

LookAtMe retains the original local video workflow:

```text
Character rotation video
      ↓
Extract every decoded frame
      ↓
Inspect numbered contact sheets
      ↓
Select representative directions
      ↓
avatar-frame-set.json
      ↓
LookAtMe renderer
```

Do not infer angles from equal timeline intervals: generated videos can repeat, distort, or rotate unevenly. Select frames visually. The builder outputs reusable frames, a canonical `avatar-frame-set.json`, a legacy `angle-map.json`, a contact sheet, and a standalone preview.

The installable `lookatme-avatar` skill can run this workflow in compatible coding environments. It processes video locally; visual frame inspection may still be sent to the coding assistant's model provider.

## Public package entry points

| Import | Environment | Contents |
| --- | --- | --- |
| `lookatme-avatar` | Browser/core | `createLookAtMeAvatar`, `mountDirectionalAvatar`, frame contracts, normalizers, manual/video helpers, preset metadata |
| `lookatme-avatar/react` | Browser + React | `LookAtMeAvatar` |
| `lookatme-avatar/vanilla` | Browser | Standalone framework-free renderer adapter |
| `lookatme-avatar/server` | Node.js server only | `PhotoAIFrameProducer`, OpenAI provider, Sharp validation/preprocessing, local storage |

Browser/core imports do not load `openai`, `sharp`, filesystem modules, or demo middleware. Server helpers do not require the LookAtMe development server.

## AvatarFrameSet contract

```ts
interface AvatarFrameSet {
  version: 2;
  center: { key: string; src: string; frame?: number };
  directions: Array<{
    key: string;
    src: string;
    angle: number;
    frame?: number;
  }>;
  metadata?: {
    width?: number;
    height?: number;
    aspectRatio?: number;
    source?: { type: string; [key: string]: unknown };
  };
}
```

Screen-coordinate angles are right 0°, down 90°, left 180°, and up 270°. Direction arrays may be sparse or uneven. The renderer selects the closest circular angle and uses `center` inside its neutral dead zone.

## Development and demonstration tooling

The repository demo proves that video, manual, and Photo AI producers converge into the same renderer. It is not a backend deployment template or required runtime service.

```bash
cp .env.example .env
# Set OPENAI_API_KEY only if testing real Photo AI generation.
npm run dev
```

Open the localhost URL printed by Vite. Generated development assets are written beneath ignored `.lookatme/generated/`.

Without an API key, the video/manual demos and all browser renderer APIs continue to work. Unit tests use mock generation providers and never make paid OpenAI calls.

```bash
npm test
npm run build
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
```

## Lifecycle and compatibility

`createLookAtMeAvatar()` and `mountDirectionalAvatar()` return `{ ready, destroy() }`. Destruction removes listeners, animation-frame work, observers, fetches, and owned DOM.

Legacy v1 angle maps and the original `angleMap`, `frameBasePath`, and vanilla `element` options remain supported. New code should use `frames` and `container`.

## Scope

LookAtMe does not provide authentication, billing, user accounts, a database, production object storage, job queues, a hosted generation service, live webcam tracking, talking avatars, or a 3D mesh.

## Licence and sample assets

LookAtMe code is MIT licensed; see `LICENSE`. Sample character assets are demonstration material and have separate attribution in `example/ASSETS.md`.
