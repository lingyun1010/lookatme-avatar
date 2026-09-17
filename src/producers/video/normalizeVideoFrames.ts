import { normalizeFrameSet, type AvatarFrameSet, type LegacyAngleMap } from '../../core/avatarFrameSet.js';

/** Converts the existing extraction/build result into the shared renderer contract. */
export function normalizeVideoFrames(map: LegacyAngleMap): AvatarFrameSet {
  const frames = normalizeFrameSet(map);
  return { ...frames, metadata: { ...frames.metadata, source: { type: 'video' } } };
}
