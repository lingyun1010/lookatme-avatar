import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { avatarStyles, getAvatarStyle } from '../../producers/photo/styles.js';
import { centerPrompt } from '../../producers/photo/prompts.js';
import { preprocessPortrait } from './preprocess.js';
import type { AvatarStyleId } from '../../producers/photo/types.js';
import { LocalAvatarImageStorage } from './localStorage.js';
import { OpenAIImageGenerationProvider } from './openaiProvider.js';

import { TransparentPngValidator } from './validation.js';

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
      const image = form.get('image'); const style = form.get('style');
      if (!(image instanceof File) || typeof style !== 'string') return json(response, 400, { error: 'An image and style are required.' });
      // Temporary local transparency test: generate CENTER ONLY; leave SDK production presets unchanged.
      const portrait = await preprocessPortrait({ image: new Uint8Array(await image.arrayBuffer()), mimeType: image.type, style: style as AvatarStyleId });
      const center = await new OpenAIImageGenerationProvider({ model: 'gpt-image-2', size: '1024x1024', quality: 'low', background: 'transparent' }).generate({ reference: portrait, prompt: centerPrompt(getAvatarStyle(style as AvatarStyleId)) });
      await new TransparentPngValidator().inspect(center);
      const frameSetId = storage.createFrameSetId();
      const stored = await storage.put(frameSetId, 'center', center);
      return json(response, 200, { center: { key: 'center', src: stored.src }, directions: [] });
    } catch (error) {
      return json(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
  };
}
