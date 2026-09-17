import sharp, { type Metadata } from 'sharp';
import type { GeneratedImage, GeneratedImageInfo, GeneratedImageValidator } from '../../producers/photo/types.js';

export class SharpGeneratedImageValidator implements GeneratedImageValidator {
  async inspect(image: GeneratedImage): Promise<GeneratedImageInfo> {
    let metadata: Metadata;
    try { metadata = await sharp(image.data, { failOn: 'error' }).metadata(); }
    catch { throw new Error('Generated image is not readable.'); }
    if (!metadata.width || !metadata.height) throw new Error('Generated image has no dimensions.');
    return { width: metadata.width, height: metadata.height, aspectRatio: metadata.width / metadata.height };
  }
}

export function assertCompatible(center: GeneratedImageInfo, candidate: GeneratedImageInfo): void {
  if (center.width !== candidate.width || center.height !== candidate.height || Math.abs(center.aspectRatio - candidate.aspectRatio) > .001) throw new Error('Generated image dimensions do not match the canonical center.');
}
