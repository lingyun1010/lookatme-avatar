export type AvatarSourceType = 'video' | 'photo' | 'manual' | (string & {});

export interface AvatarFrame {
  key: string;
  src: string;
  /** Optional producer provenance. The renderer ignores it. */
  frame?: number;
}

export interface DirectionalAvatarFrame extends AvatarFrame {
  /** Screen-coordinate angle: east 0, south 90, west 180, north 270. */
  angle: number;
}

export interface AvatarFrameSetMetadata {
  width?: number;
  height?: number;
  aspectRatio?: number;
  source?: { type: AvatarSourceType; [key: string]: unknown };
}

/** The only frame shape consumed by the directional renderer. */
export interface AvatarFrameSet {
  version: 2;
  center: AvatarFrame;
  directions: DirectionalAvatarFrame[];
  metadata?: AvatarFrameSetMetadata;
}

/** Original LookAtMe format. Accepted indefinitely by the compatibility adapter. */
export interface LegacyAngleMap {
  version: 1;
  center: AvatarFrame;
  directions: DirectionalAvatarFrame[];
}

export type AvatarFrameSetInput = AvatarFrameSet | LegacyAngleMap;

const validKey = (key: unknown) => typeof key === 'string' && /^[a-zA-Z0-9_-]+$/.test(key);
const validSource = (src: unknown) => typeof src === 'string' && src.trim().length > 0 && !/(^|[/\\])\.\.([/\\]|$)/.test(src);

export function normalizeFrameSet(value: unknown): AvatarFrameSet {
  const input = value as Partial<AvatarFrameSetInput>;
  const center = input?.center as AvatarFrame | undefined;
  const directions = input?.directions as DirectionalAvatarFrame[] | undefined;
  const validFrame = (frame: AvatarFrame | undefined) => !!frame && validKey(frame.key) && validSource(frame.src);
  if ((input?.version !== 1 && input?.version !== 2) || !validFrame(center) || !Array.isArray(directions) || !directions.length || directions.some(frame => !validFrame(frame) || !Number.isFinite(frame.angle) || frame.angle < 0 || frame.angle >= 360)) {
    throw new Error('Invalid AvatarFrameSet: expected a center frame and directions with angles in [0, 360).');
  }
  const all = [center!, ...directions];
  if (new Set(all.map(frame => frame.key)).size !== all.length || new Set(directions.map(frame => frame.angle)).size !== directions.length) {
    throw new Error('Duplicate frame keys or angles.');
  }
  const metadata = input.version === 2 ? input.metadata : undefined;
  if (metadata?.width !== undefined && (!Number.isFinite(metadata.width) || metadata.width <= 0)) throw new Error('Frame width must be positive.');
  if (metadata?.height !== undefined && (!Number.isFinite(metadata.height) || metadata.height <= 0)) throw new Error('Frame height must be positive.');
  if (metadata?.aspectRatio !== undefined && (!Number.isFinite(metadata.aspectRatio) || metadata.aspectRatio <= 0)) throw new Error('Frame aspect ratio must be positive.');
  return { version: 2, center: { ...center! }, directions: directions.map(frame => ({ ...frame })), ...(metadata ? { metadata: { ...metadata } } : {}) };
}

/** A producer creates frames; it never owns pointer tracking or DOM rendering. */
export interface AvatarFrameProducer<Input> {
  generate(input: Input): Promise<AvatarFrameSet>;
}
