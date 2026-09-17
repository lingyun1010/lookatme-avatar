import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { avatarStyles } from '../../producers/photo/styles.js';
import type { AvatarFramePreset, AvatarStyleId } from '../../producers/photo/types.js';
import { LocalAvatarImageStorage } from './localStorage.js';
import { OpenAIImageGenerationProvider } from './openaiProvider.js';
import { PartialPhotoGenerationError, PhotoAIFrameProducer } from './PhotoAIFrameProducer.js';
import { SharpGeneratedImageValidator } from './validation.js';

const maxRequestBytes = 21 * 1024 * 1024;
async function body(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of request) { const bytes = Buffer.from(chunk); size += bytes.length; if (size > maxRequestBytes) throw new Error('Upload is too large.'); chunks.push(bytes); }
  return Buffer.concat(chunks);
}
function json(response: ServerResponse, status: number, value: unknown) { response.statusCode = status; response.setHeader('content-type', 'application/json'); response.end(JSON.stringify(value)); }

export function createPhotoDemoMiddleware(root = path.resolve('.lookatme/generated')) {
  const storage = new LocalAvatarImageStorage(root);
  return async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (request.method === 'GET' && pathname === '/api/photo-styles') return json(response, 200, Object.values(avatarStyles).map(({ prompt: _prompt, negativePrompt: _negative, ...publicStyle }) => publicStyle));
    if (request.method === 'GET' && pathname.startsWith('/generated/')) {
      const relative = pathname.slice('/generated/'.length); const file = path.resolve(root, relative);
      if (!file.startsWith(`${path.resolve(root)}${path.sep}`)) return json(response, 400, { error: 'Invalid generated asset path.' });
      try { const bytes = await readFile(file); response.statusCode = 200; response.setHeader('content-type', file.endsWith('.webp') ? 'image/webp' : file.endsWith('.jpg') ? 'image/jpeg' : 'image/png'); return response.end(bytes); } catch { return json(response, 404, { error: 'Generated asset not found.' }); }
    }
    if (request.method !== 'POST' || pathname !== '/api/photo-avatar') return next();
    try {
      const raw = await body(request); const requestBody = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer; const form = await new Request('http://localhost/api/photo-avatar', { method: 'POST', headers: request.headers as HeadersInit, body: requestBody }).formData();
      const image = form.get('image'); const style = form.get('style'); const preset = form.get('preset') ?? 'balanced';
      if (!(image instanceof File) || typeof style !== 'string' || typeof preset !== 'string') return json(response, 400, { error: 'An image, style, and preset are required.' });
      const producer = new PhotoAIFrameProducer({ provider: new OpenAIImageGenerationProvider(), storage, validator: new SharpGeneratedImageValidator() });
      const frames = await producer.produce({ image: new Uint8Array(await image.arrayBuffer()), mimeType: image.type, style: style as AvatarStyleId, preset: preset as AvatarFramePreset });
      return json(response, 200, frames);
    } catch (error) {
      if (error instanceof PartialPhotoGenerationError) return json(response, 502, { error: error.message, frameSetId: error.frameSetId, failedDirection: error.failedDirection, failedAngle: error.failedAngle, completedDirections: error.completedDirections });
      return json(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
  };
}
