import { normalizeFrameSet, type AvatarFrameSet } from '../../core/avatarFrameSet.js';
import { directionAngles, normalizeDirections } from '../../producers/photo/directions.js';
import { centerPrompt, directionPrompt } from '../../producers/photo/prompts.js';
import { getAvatarStyle } from '../../producers/photo/styles.js';
import type { AvatarDirection, AvatarImageStorage, GeneratedImageValidator, ImageGenerationProvider, PhotoFrameProducer, PhotoFrameProducerInput } from '../../producers/photo/types.js';
import { preprocessPortrait } from './preprocess.js';
import { assertCompatible } from './validation.js';

export class PartialPhotoGenerationError extends Error {
  constructor(public readonly frameSetId: string, public readonly failedDirection: AvatarDirection, public readonly completedDirections: AvatarDirection[], cause: unknown) {
    super(`Avatar generation stopped at ${failedDirection}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause }); this.name = 'PartialPhotoGenerationError';
  }
}

export interface PhotoAIFrameProducerDependencies { provider: ImageGenerationProvider; storage: AvatarImageStorage; validator: GeneratedImageValidator }

export class PhotoAIFrameProducer implements PhotoFrameProducer {
  constructor(private readonly dependencies: PhotoAIFrameProducerDependencies) {}
  async produce(input: PhotoFrameProducerInput): Promise<AvatarFrameSet> {
    const style = getAvatarStyle(input.style); const directions = normalizeDirections(input.directions); const frameSetId = this.dependencies.storage.createFrameSetId();
    const portrait = await preprocessPortrait(input);
    const centerImage = await this.dependencies.provider.generate({ reference: portrait, prompt: centerPrompt(style) });
    const centerInfo = await this.dependencies.validator.inspect(centerImage);
    const center = await this.dependencies.storage.put(frameSetId, 'center', centerImage);
    const generated: Array<{ key: AvatarDirection; angle: number; src: string }> = []; const completed: AvatarDirection[] = [];
    for (const direction of directions) {
      try {
        const image = await this.dependencies.provider.generate({ reference: centerImage, prompt: directionPrompt(style, direction) });
        assertCompatible(centerInfo, await this.dependencies.validator.inspect(image));
        const stored = await this.dependencies.storage.put(frameSetId, direction, image);
        generated.push({ key: direction, angle: directionAngles[direction], src: stored.src }); completed.push(direction);
      } catch (error) { throw new PartialPhotoGenerationError(frameSetId, direction, completed, error); }
    }
    return normalizeFrameSet({ version: 2, center: { key: 'center', src: center.src }, directions: generated, metadata: { width: centerInfo.width, height: centerInfo.height, aspectRatio: centerInfo.aspectRatio, source: { type: 'photo-ai', frameSetId, style: style.id } } });
  }
  async regenerateDirection(frameSetId: string, styleId: PhotoFrameProducerInput['style'], direction: AvatarDirection) {
    const style = getAvatarStyle(styleId); const center = await this.dependencies.storage.read(frameSetId, 'center');
    const image = await this.dependencies.provider.generate({ reference: center, prompt: directionPrompt(style, direction) });
    assertCompatible(await this.dependencies.validator.inspect(center), await this.dependencies.validator.inspect(image));
    return this.dependencies.storage.put(frameSetId, direction, image);
  }
}
