import { readFile } from 'node:fs/promises';
import sharp, { type Metadata } from 'sharp';
import type { GeneratedImage, PhotoFrameProducerInput } from '../../producers/photo/types.js';

const supported = new Set(['jpeg', 'png', 'webp']);
const maxBytes = 20 * 1024 * 1024;

async function inputBytes(input: PhotoFrameProducerInput): Promise<Uint8Array> {
  if (typeof input.image !== 'string') return input.image;
  const dataUrl = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/i.exec(input.image);
  if (dataUrl) return Buffer.from(dataUrl[2], 'base64');
  return readFile(input.image);
}

export async function preprocessPortrait(input: PhotoFrameProducerInput): Promise<GeneratedImage> {
  const bytes = await inputBytes(input);
  if (!bytes.byteLength || bytes.byteLength > maxBytes) throw new Error('Portrait must be a non-empty image no larger than 20 MB.');
  let metadata: Metadata;
  try { metadata = await sharp(bytes, { failOn: 'error' }).metadata(); }
  catch { throw new Error('Portrait is not a readable image.'); }
  if (!metadata.format || !supported.has(metadata.format)) throw new Error('Portrait must be PNG, JPEG, or WebP.');
  if (!metadata.width || !metadata.height || metadata.width < 256 || metadata.height < 256 || metadata.width > 10000 || metadata.height > 10000) throw new Error('Portrait dimensions must be between 256 and 10,000 pixels.');
  const declared = input.mimeType?.toLowerCase();
  if (declared && !['image/png', 'image/jpeg', 'image/webp'].includes(declared)) throw new Error('Unsupported portrait MIME type.');
  const data = await sharp(bytes).rotate().resize(1024, 1024, { fit: 'cover', position: 'centre', withoutEnlargement: false }).png().toBuffer();
  return { data, mimeType: 'image/png' };
}
