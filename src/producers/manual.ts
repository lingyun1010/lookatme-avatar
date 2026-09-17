import { normalizeFrameSet, type AvatarFrameProducer, type AvatarFrameSet, type AvatarFrameSetInput } from '../core/avatarFrameSet.js';

/** Useful for uploaded/static frames and for exercising the future photo path. */
export class ManualFrameProducer implements AvatarFrameProducer<AvatarFrameSetInput> {
  async generate(input: AvatarFrameSetInput): Promise<AvatarFrameSet> {
    return normalizeFrameSet(input);
  }
}
