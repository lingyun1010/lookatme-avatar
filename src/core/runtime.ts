import type { AvatarOptions } from '../component/types.js';
import { pointerAngle } from './angle.js';
import { selectFrame, validateAngleMap } from './frameSelector.js';
import { preload } from './preload.js';
const length = (value: number | string) => typeof value === 'number' ? `${value}px` : value;
export function mountAvatar(element: HTMLElement, options: AvatarOptions) {
  const deadZone = options.deadZone ?? .12;
  if (!Number.isFinite(deadZone) || deadZone < 0 || deadZone > 1) throw new Error('deadZone must be between 0 and 1.');
  const container = document.createElement('div');
  Object.assign(container.style, { position: 'relative', width: length(options.width ?? options.size ?? 600), height: options.height === undefined ? 'auto' : length(options.height), aspectRatio: '1', maxWidth: '100%', pointerEvents: 'none', overflow: 'hidden' });
  container.setAttribute('role', 'img');
  container.setAttribute('aria-label', options.alt ?? 'Character following the pointer');
  container.setAttribute('aria-busy', 'true');
  element.append(container);
  const abort = new AbortController();
  let destroyed = false;
  let cleanup = () => {};
  const ready = (async () => {
    let data = options.angleMap;
    if (typeof data === 'string') {
      const response = await fetch(data, { signal: abort.signal });
      if (!response.ok) throw new Error(`Angle map request failed: ${response.status}`);
      data = await response.json();
    }
    const map = validateAngleMap(data);
    const images = await preload([map.center, ...map.directions], options.frameBasePath);
    if (destroyed) return;
    for (const image of images.values()) {
      image.alt = '';
      Object.assign(image.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: options.objectFit ?? 'contain', visibility: 'hidden', pointerEvents: 'none' });
      container.append(image);
    }
    let current = '';
    function show(angle: number, isCenter: boolean) {
      const frame = selectFrame(map, angle, isCenter);
      if (current !== frame.key) {
        if (current) images.get(current)!.style.visibility = 'hidden';
        images.get(frame.key)!.style.visibility = 'visible';
        current = frame.key;
        container.dataset.frame = current;
      }
      options.onFrameChange?.({ angle, isCenter, key: current });
    }
    let position: { x: number; y: number } | null = null;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (!position) return show(0, true);
      const rect = options.tracking === 'viewport' ? { left: 0, top: 0, width: innerWidth, height: innerHeight } : container.getBoundingClientRect();
      const state = pointerAngle(position.x, position.y, rect, deadZone);
      show(state.angle, state.isCenter);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    const move = (event: PointerEvent) => { position = { x: event.clientX, y: event.clientY }; schedule(); };
    const reset = () => { position = null; schedule(); };
    const visibility = () => { if (document.hidden) reset(); };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    window.addEventListener('pointercancel', reset);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    document.addEventListener('visibilitychange', visibility);
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    cleanup = () => {
      cancelAnimationFrame(raf); observer.disconnect();
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', reset);
      window.removeEventListener('blur', reset);
      window.removeEventListener('pointercancel', reset);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      document.removeEventListener('visibilitychange', visibility);
    };
    show(0, true);
    container.setAttribute('aria-busy', 'false');
  })().catch(error => {
    if (destroyed) return;
    container.setAttribute('aria-busy', 'false');
    container.dataset.error = 'true';
    options.onError?.(error instanceof Error ? error : new Error(String(error)));
    throw error;
  });
  return { ready, destroy() { destroyed = true; abort.abort(); cleanup(); container.remove(); } };
}
