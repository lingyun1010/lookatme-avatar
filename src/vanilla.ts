import { mountDirectionalAvatar } from './core/runtime.js';
import type { AvatarOptions } from './component/types.js';
export function createLookAtMeAvatar({ container, element, ...options }: AvatarOptions & { container?: string | HTMLElement; element?: string | HTMLElement }) {
  const mount = container ?? element;
  const target = typeof mount === 'string' ? document.querySelector<HTMLElement>(mount) : mount;
  if (!target) throw new Error(`Avatar mount element not found: ${String(mount)}`);
  return mountDirectionalAvatar({ container: target, ...options });
}
export { mountDirectionalAvatar } from './core/runtime.js';
export { normalizeFrameSet } from './core/avatarFrameSet.js';
export type { AvatarOptions, AngleMap, DebugState, AvatarFrameSet, AvatarFrameSetInput } from './component/types.js';
