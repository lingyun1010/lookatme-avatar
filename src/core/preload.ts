import type { AvatarFrame } from './avatarFrameSet.js';
export async function preload(frames: AvatarFrame[], basePath = '.'): Promise<Map<string, HTMLImageElement>> {
  const base = new URL(basePath.replace(/\/?$/, '/'), document.baseURI);
  return new Map(await Promise.all(frames.map(async frame => {
    const image = new Image();
    image.src = new URL(frame.src, base).href;
    try { await image.decode(); } catch { throw new Error(`Could not decode avatar frame: ${image.src}`); }
    return [frame.key, image] as const;
  })));
}
