import type { AvatarFrameSet, AvatarFrameSetInput, AvatarFrame, DirectionalAvatarFrame, LegacyAngleMap } from '../core/avatarFrameSet.js';
export type Frame = AvatarFrame;
export type DirectionalFrame = DirectionalAvatarFrame;
export type AngleMap = LegacyAngleMap;
export interface DebugState { angle: number; key: string; isCenter: boolean }
export interface AvatarOptions {
  /** v2 direct frame input. Sources may be relative paths or absolute URLs. */
  frames?: string | AvatarFrameSetInput;
  /** Optional base for relative frame sources. Defaults to document.baseURI. */
  frameBasePath?: string;
  /** @deprecated Use frames. Retained for v1 compatibility. */
  angleMap?: string | AngleMap;
  size?: number | string;
  width?: number | string;
  height?: number | string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /** Radius as a fraction of the shorter tracking dimension. */
  deadZone?: number;
  tracking?: 'avatar' | 'viewport';
  alt?: string;
  onFrameChange?: (state: DebugState) => void;
  onError?: (error: Error) => void;
}
export type { AvatarFrameSet, AvatarFrameSetInput, AvatarFrame, DirectionalAvatarFrame, LegacyAngleMap };
