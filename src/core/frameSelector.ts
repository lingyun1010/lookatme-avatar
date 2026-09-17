import type { AvatarFrameSet, AvatarFrameSetInput, AvatarFrame } from './avatarFrameSet.js';
import { normalizeFrameSet } from './avatarFrameSet.js';
import { angleDistance } from './angle.js';
export const validateAngleMap = (value: unknown) => normalizeFrameSet(value);
export function selectFrame(map: AvatarFrameSetInput | AvatarFrameSet, angle: number, isCenter: boolean): AvatarFrame {
  if (isCenter) return map.center;
  return map.directions.reduce((best, f) => angleDistance(f.angle, angle) < angleDistance(best.angle, angle) ? f : best);
}
