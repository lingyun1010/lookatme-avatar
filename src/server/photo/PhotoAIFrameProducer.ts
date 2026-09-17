import { normalizeFrameSet, type AvatarFrameSet } from '../../core/avatarFrameSet.js';
import { framePlanForAngle, getGenerationPlan } from '../../producers/photo/directions.js';
import { centerPrompt, directionPrompt } from '../../producers/photo/prompts.js';
import { getAvatarStyle } from '../../producers/photo/styles.js';
import type { AvatarDirection, AvatarImageStorage, DirectionFramePlan, GeneratedImageValidator, ImageGenerationProvider, PhotoFrameProducer, PhotoFrameProducerInput } from '../../producers/photo/types.js';
import { preprocessPortrait } from './preprocess.js';
import { assertCompatible } from './validation.js';

export class PartialPhotoGenerationError extends Error {
  readonly failedDirection: string; readonly failedAngle: number; readonly completedDirections: string[];
  constructor(public readonly frameSetId: string, public readonly failedFrame: DirectionFramePlan, public readonly completedFrames: DirectionFramePlan[], cause: unknown) {
    super(`Avatar generation stopped at ${failedFrame.label}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause }); this.name = 'PartialPhotoGenerationError';
    this.failedDirection = failedFrame.key; this.failedAngle = failedFrame.angle; this.completedDirections = completedFrames.map(frame => frame.key);
  }
}

export interface PhotoAIFrameProducerDependencies { provider: ImageGenerationProvider; storage: AvatarImageStorage; validator: GeneratedImageValidator }

export class PhotoAIFrameProducer implements PhotoFrameProducer {
  constructor(private readonly dependencies: PhotoAIFrameProducerDependencies) {}
  async produce(input: PhotoFrameProducerInput): Promise<AvatarFrameSet> {
    const style = getAvatarStyle(input.style); const generation = getGenerationPlan(input.preset, input.directions); const frameSetId = this.dependencies.storage.createFrameSetId();
    const portrait = await preprocessPortrait(input);
    const centerImage = await this.dependencies.provider.generate({ reference: portrait, prompt: centerPrompt(style) });
    const centerInfo = await this.dependencies.validator.inspect(centerImage);
    const center = await this.dependencies.storage.put(frameSetId, 'center', centerImage);
    const generated: Array<{ key: string; angle: number; src: string }> = []; const completed: DirectionFramePlan[] = [];
    for (const frame of generation.frames) {
      try {
        const image = await this.dependencies.provider.generate({ reference: centerImage, prompt: directionPrompt(style, frame) });
        assertCompatible(centerInfo, await this.dependencies.validator.inspect(image));
        const stored = await this.dependencies.storage.put(frameSetId, frame.key, image);
        generated.push({ key: frame.key, angle: frame.angle, src: stored.src }); completed.push(frame);
      } catch (error) { throw new PartialPhotoGenerationError(frameSetId, frame, completed, error); }
    }
    if (generated.length !== generation.frames.length || generated.some((frame, index) => frame.key !== generation.frames[index].key || frame.angle !== generation.frames[index].angle)) throw new Error(`Generated frames do not match the ${generation.preset} preset plan.`);
    return normalizeFrameSet({ version: 2, center: { key: 'center', src: center.src }, directions: generated, metadata: { width: centerInfo.width, height: centerInfo.height, aspectRatio: centerInfo.aspectRatio, source: { type: 'photo-ai', frameSetId, style: style.id, preset: generation.preset, generatedAngles: generated.map(frame => frame.angle) } } });
  }
  async regenerateDirection(frameSetId: string, styleId: PhotoFrameProducerInput['style'], direction: AvatarDirection) {
    const angles = { right: 0, down: 90, left: 180, up: 270 } as const; return this.regenerateFrame(frameSetId, styleId, angles[direction]);
  }
  async regenerateFrame(frameSetId: string, styleId: PhotoFrameProducerInput['style'], angle: number) {
    const style = getAvatarStyle(styleId); const center = await this.dependencies.storage.read(frameSetId, 'center'); const frame = framePlanForAngle(angle);
    const image = await this.dependencies.provider.generate({ reference: center, prompt: directionPrompt(style, frame) });
    assertCompatible(await this.dependencies.validator.inspect(center), await this.dependencies.validator.inspect(image));
    return this.dependencies.storage.put(frameSetId, frame.key, image);
  }
}
