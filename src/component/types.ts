export interface Frame { key: string; src: string; frame?: number }
export interface DirectionalFrame extends Frame { angle: number }
export interface AngleMap { version: 1; center: Frame; directions: DirectionalFrame[] }
export interface DebugState { angle: number; key: string; isCenter: boolean }
export interface AvatarOptions {
  frameBasePath: string;
  angleMap: string | AngleMap;
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
