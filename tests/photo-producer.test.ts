import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { normalizeFrameSet } from '../src/core/avatarFrameSet.js';
import { selectFrame } from '../src/core/frameSelector.js';
import { avatarFramePresets, directionAngles, getPresetPlan } from '../src/producers/photo/directions.js';
import { avatarStyles, getAvatarStyle } from '../src/producers/photo/styles.js';
import type { AvatarDirection, AvatarImageStorage, GeneratedImage, ImageGenerationProvider, ImageGenerationRequest } from '../src/producers/photo/types.js';
import { PartialPhotoGenerationError, PhotoAIFrameProducer } from '../src/server/photo/PhotoAIFrameProducer.js';
import { preprocessPortrait } from '../src/server/photo/preprocess.js';
import { SharpGeneratedImageValidator, TransparentPngValidator } from '../src/server/photo/validation.js';

class MemoryStorage implements AvatarImageStorage {
  images = new Map<string, GeneratedImage>();
  createFrameSetId() { return 'set-1'; }
  async put(id: string, key: string, image: GeneratedImage) { this.images.set(`${id}/${key}`, image); return { src: `/generated/${id}/${key}.png` }; }
  async read(id: string, key: string) { const image = this.images.get(`${id}/${key}`); if (!image) throw new Error('missing'); return image; }
}
class MockProvider implements ImageGenerationProvider {
  calls: ImageGenerationRequest[] = []; count = 0;
  constructor(private readonly output: GeneratedImage, private readonly failAt = 0) {}
  async generate(request: ImageGenerationRequest) { this.calls.push(request); this.count++; if (this.count === this.failAt) throw new Error('provider unavailable'); return this.output; }
}
async function fixture(width = 512, height = 512): Promise<GeneratedImage> { return { data: await sharp({ create: { width, height, channels: 3, background: '#78906a' } }).png().toBuffer(), mimeType: 'image/png' }; }
function producer(provider: ImageGenerationProvider, storage = new MemoryStorage()) { return { instance: new PhotoAIFrameProducer({ provider, storage, validator: new SharpGeneratedImageValidator() }), storage }; }

test('versioned style registry exposes four stable non-trademark ids', () => { assert.deepEqual(Object.keys(avatarStyles), ['felt@1', 'cartoon@1', 'cinematic-3d@1', 'anime@1']); assert.equal(getAvatarStyle('felt@1').version, 1); assert.throws(() => getAvatarStyle('unknown')); });
test('frame presets map exactly to 5, 9, and 13 total frames', () => {
  assert.deepEqual(getPresetPlan('fast').map(frame => frame.angle), [0, 90, 180, 270]);
  assert.deepEqual(getPresetPlan('balanced').map(frame => frame.angle), [0, 45, 90, 135, 180, 225, 270, 315]);
  assert.deepEqual(getPresetPlan('smooth').map(frame => frame.angle), [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]);
  assert.deepEqual(Object.fromEntries(Object.entries(avatarFramePresets).map(([key, frames]) => [key, frames.length + 1])), { fast: 5, balanced: 9, smooth: 13 });
});

test('portrait preprocessing rejects invalid input and normalizes a valid portrait', async () => {
  await assert.rejects(() => preprocessPortrait({ image: new Uint8Array([1, 2, 3]), style: 'felt@1' }), /readable image/);
  const portrait = await fixture(300, 500); const normalized = await preprocessPortrait({ image: portrait.data, style: 'felt@1', mimeType: 'image/png' });
  const info = await sharp(normalized.data).metadata(); assert.deepEqual([info.width, info.height, info.format], [1024, 1024, 'png']);
});

test('producer generates canonical center first and uses it for every direction', async () => {
  const portrait = await fixture(400, 500); const generated = await fixture(); const provider = new MockProvider(generated); const { instance } = producer(provider);
  const frames = await instance.produce({ image: portrait.data, style: 'cartoon@1' });
  assert.equal(provider.calls.length, 5); assert.notDeepEqual(provider.calls[0].reference.data, generated.data);
  for (const call of provider.calls) {
    assert.match(call.prompt, /fully transparent background/); assert.match(call.prompt, /no scenery/); assert.match(call.prompt, /no floor or background surface/); assert.match(call.prompt, /no cast or drop shadow/); assert.match(call.prompt, /clean alpha edges/);
  }
  for (const call of provider.calls.slice(1)) assert.equal(call.reference, generated);
  assert.deepEqual(frames.directions.map(frame => [frame.key, frame.angle]), [['right', 0], ['down', 90], ['left', 180], ['up', 270]]);
  assert.equal(frames.metadata?.source?.type, 'photo-ai'); assert.equal(frames.metadata?.source?.frameSetId, 'set-1');
  assert.deepEqual(normalizeFrameSet(frames), frames); assert.equal(selectFrame(frames, directionAngles.left, false).key, 'left');
});

test('partial direction failure preserves completed assets and identifies retry target', async () => {
  const generated = await fixture(); const provider = new MockProvider(generated, 3); const { instance, storage } = producer(provider);
  await assert.rejects(() => instance.produce({ image: generated.data, style: 'felt@1' }), error => {
    assert.ok(error instanceof PartialPhotoGenerationError); assert.equal(error.frameSetId, 'set-1'); assert.equal(error.failedDirection, 'down'); assert.equal(error.failedAngle, 90); assert.deepEqual(error.completedDirections, ['right']); return true;
  });
  assert.ok(storage.images.has('set-1/center')); assert.ok(storage.images.has('set-1/right')); assert.equal(storage.images.has('set-1/down'), false);
});

test('dimension mismatch fails only the affected direction', async () => {
  const center = await fixture(); const wrong = await fixture(512, 768); let call = 0;
  const provider: ImageGenerationProvider = { async generate() { return ++call === 1 ? center : wrong; } };
  const { instance } = producer(provider);
  await assert.rejects(() => instance.produce({ image: center.data, style: 'anime@1', directions: ['up'] }), /dimensions do not match/);
});

test('an individual direction can be regenerated from stored center', async () => {
  const generated = await fixture(); const provider = new MockProvider(generated); const storage = new MemoryStorage(); storage.images.set('set-1/center', generated);
  const { instance } = producer(provider, storage); const result = await instance.regenerateDirection('set-1', 'cinematic-3d@1', 'right');
  assert.equal(result.src, '/generated/set-1/right.png'); assert.equal(provider.calls.length, 1); assert.equal(provider.calls[0].reference, generated);
});

test('balanced and smooth plans keep center-first identity references and renderer compatibility', async () => {
  const generated = await fixture();
  for (const preset of ['balanced', 'smooth'] as const) {
    const provider = new MockProvider(generated); const { instance } = producer(provider); const frames = await instance.produce({ image: generated.data, style: 'felt@1', preset });
    assert.equal(frames.directions.length + 1, preset === 'balanced' ? 9 : 13); assert.equal(provider.calls.length, frames.directions.length + 1);
    for (const call of provider.calls.slice(1)) assert.equal(call.reference, generated);
    assert.deepEqual(frames.metadata?.source?.generatedAngles, getPresetPlan(preset).map(frame => frame.angle)); assert.equal(frames.metadata?.source?.preset, preset);
    for (const frame of frames.directions) assert.equal(selectFrame(frames, frame.angle, false).key, frame.key);
  }
});

test('arbitrary-angle frame regeneration supports smooth preset frames', async () => {
  const generated = await fixture(); const provider = new MockProvider(generated); const storage = new MemoryStorage(); storage.images.set('set-1/center', generated);
  const { instance } = producer(provider, storage); const result = await instance.regenerateFrame('set-1', 'anime@1', 30);
  assert.equal(result.src, '/generated/set-1/angle-030.png'); assert.match(provider.calls[0].prompt, /30 degrees/);
});

test('strict transparency validator rejects opaque PNG and accepts alpha transparency', async () => {
  const opaque = await fixture(24, 24);
  await assert.rejects(() => new TransparentPngValidator().inspect(opaque), /alpha channel/);
  const transparent: GeneratedImage = {
    data: await sharp({ create: { width: 24, height: 24, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer(),
    mimeType: 'image/png',
  };
  assert.equal((await new TransparentPngValidator().inspect(transparent)).width, 24);
  const fakeAlpha: GeneratedImage = {
    data: await sharp({ create: { width: 24, height: 24, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toBuffer(),
    mimeType: 'image/png',
  };
  await assert.rejects(() => new TransparentPngValidator().inspect(fakeAlpha), /no transparent pixels/);
});

test('optional image processor runs before validation and persistence on every frame', async () => {
  const opaque = await fixture(512, 512);
  const provider = new MockProvider(opaque);
  const storage = new MemoryStorage();
  const transparent: GeneratedImage = {
    data: await sharp({ create: { width: 24, height: 24, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer(),
    mimeType: 'image/png',
  };
  let processed = 0;
  const producer = new PhotoAIFrameProducer({
    provider, storage, validator: new TransparentPngValidator(),
    processor: { async process(image) { assert.equal(image, opaque); processed++; return transparent; } },
  });
  const frameSet = await producer.produce({ image: opaque.data, style: 'felt@1', preset: 'fast' });
  assert.equal(processed, 5);
  assert.equal(frameSet.directions.length, 4);
  assert.equal(storage.images.size, 5);
  for (const call of provider.calls.slice(1)) assert.equal(call.reference, transparent);
});

test('native OpenAI transparency is requested and demo rejects opaque frames', async () => {
  const { readFile } = await import('node:fs/promises');
  const providerSource = await readFile(new URL('../src/server/photo/openaiProvider.ts', import.meta.url), 'utf8');
  const demoSource = await readFile(new URL('../src/server/photo/demoMiddleware.ts', import.meta.url), 'utf8');
  assert.match(providerSource, /this\.background = options\.background \?\? 'transparent'/);
  assert.match(providerSource, /output_format: 'png', background: this\.background/);
  assert.match(demoSource, /validator: new TransparentPngValidator\(\)/);
  assert.doesNotMatch(demoSource, /RemoveBgProcessor/);
});
