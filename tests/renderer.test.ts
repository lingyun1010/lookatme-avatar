import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mountDirectionalAvatar } from '../src/core/runtime.js';
import { createLookAtMeAvatar } from '../src/vanilla.js';

class TrackedTarget extends EventTarget {
  listeners = new Map<string, number>();
  override addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
    this.listeners.set(type, (this.listeners.get(type) ?? 0) + 1);
    super.addEventListener(type, listener, options);
  }
  override removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean) {
    this.listeners.set(type, Math.max(0, (this.listeners.get(type) ?? 0) - 1));
    super.removeEventListener(type, listener, options);
  }
}

class FakeElement extends TrackedTarget {
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};
  children: FakeElement[] = [];
  parent?: FakeElement;
  attributes = new Map<string, string>();
  append(child: FakeElement) { child.parent = this; this.children.push(child); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  setAttribute(key: string, value: string) { this.attributes.set(key, value); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 200, height: 200 }; }
}

test('renderer accepts user URLs, switches directions, and removes all lifecycle listeners', async () => {
  const fakeWindow = new TrackedTarget() as any;
  const fakeDocument = new TrackedTarget() as any;
  fakeDocument.baseURI = 'https://app.example/demo/';
  fakeDocument.hidden = false;
  fakeDocument.documentElement = new TrackedTarget();
  fakeDocument.createElement = () => new FakeElement();
  const decoded: string[] = [];
  class FakeImage extends FakeElement { src = ''; alt = ''; async decode() { decoded.push(this.src); } }
  let observerDisconnected = false;
  class FakeResizeObserver { constructor(_callback: () => void) {} observe(_element: unknown) {} disconnect() { observerDisconnected = true; } }
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  Object.assign(globalThis, {
    window: fakeWindow,
    document: fakeDocument,
    Image: FakeImage,
    ResizeObserver: FakeResizeObserver,
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: (id: number) => frames.delete(id)
  });
  const root = new FakeElement();
  const avatar = mountDirectionalAvatar({
    container: root as unknown as HTMLElement,
    frames: { version: 2, center: { key: 'center', src: 'https://cdn.example/neutral.png' }, directions: [{ key: 'right', src: 'right.png', angle: 0 }] }
  });
  await avatar.ready;
  assert.deepEqual(decoded, ['https://cdn.example/neutral.png', 'https://app.example/demo/right.png']);
  assert.equal((root.children[0] as FakeElement).dataset.frame, 'center');
  const move = new Event('pointermove');
  Object.defineProperties(move, { clientX: { value: 250 }, clientY: { value: 100 } });
  fakeWindow.dispatchEvent(move);
  for (const callback of [...frames.values()]) callback(0);
  assert.equal((root.children[0] as FakeElement).dataset.frame, 'right');
  avatar.destroy();
  assert.equal(root.children.length, 0);
  assert.equal(observerDisconnected, true);
  assert.equal([...fakeWindow.listeners.values()].reduce((a, b) => a + b, 0), 0);
  assert.equal([...fakeDocument.listeners.values()].reduce((a, b) => a + b, 0), 0);
  assert.equal([...fakeDocument.documentElement.listeners.values()].reduce((a: number, b: number) => a + b, 0), 0);

  const adapterRoot = new FakeElement();
  const adapter = createLookAtMeAvatar({ container: adapterRoot as unknown as HTMLElement, frames: { version: 2, center: { key: 'center', src: 'center.png' }, directions: [{ key: 'left', src: 'left.png', angle: 180 }] } });
  await adapter.ready;
  assert.equal(adapterRoot.children.length, 1);
  adapter.destroy();
});
