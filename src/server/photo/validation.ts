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

/** Requires actual transparent pixels, not a checkerboard painted into an opaque PNG. */
export class TransparentPngValidator extends SharpGeneratedImageValidator {
  override async inspect(image: GeneratedImage): Promise<GeneratedImageInfo> {
    const info = await super.inspect(image);
    const metadata = await sharp(image.data).metadata();
    if (image.mimeType !== 'image/png' || metadata.format !== 'png' || !metadata.hasAlpha) {
      throw new Error('Generated avatar must be a PNG with an alpha channel.');
    }
    const alpha = (await sharp(image.data).stats()).channels[3];
    if (!alpha || alpha.min === 255) throw new Error('Generated avatar has no transparent pixels.');
    return info;
  }
}

export function assertCompatible(center: GeneratedImageInfo, candidate: GeneratedImageInfo): void {
  if (center.width !== candidate.width || center.height !== candidate.height || Math.abs(center.aspectRatio - candidate.aspectRatio) > .001) throw new Error('Generated image dimensions do not match the canonical center.');
}
