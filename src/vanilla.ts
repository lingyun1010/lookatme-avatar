import { mountAvatar } from './core/runtime.js';
import type { AvatarOptions } from './component/types.js';
export function createLookAtMeAvatar({ element, ...options }: AvatarOptions & { element: string | HTMLElement }) {
  const target = typeof element === 'string' ? document.querySelector<HTMLElement>(element) : element;
  if (!target) throw new Error(`Avatar mount element not found: ${element}`);
  return mountAvatar(target, options);
}
export type { AvatarOptions, AngleMap, DebugState } from './component/types.js';
