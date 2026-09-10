import type { AngleMap, Frame } from '../component/types.js';
import { angleDistance } from './angle.js';
export function validateAngleMap(value: unknown): AngleMap {
  const map = value as AngleMap;
  const validFrame = (f: Frame) => f && typeof f.key === 'string' && /^[a-zA-Z0-9_-]+$/.test(f.key) && typeof f.src === 'string' && /^[a-zA-Z0-9_-]+\.(png|webp|jpe?g)$/i.test(f.src);
  if (!map || map.version !== 1 || !validFrame(map.center) || !Array.isArray(map.directions) || !map.directions.length || map.directions.some(f => !validFrame(f) || !Number.isFinite(f.angle) || f.angle < 0 || f.angle >= 360)) throw new Error('Invalid angle map: expected version 1, center, and directions with angles in [0, 360).');
  const all = [map.center, ...map.directions];
  if (new Set(all.map(f => f.key)).size !== all.length || new Set(map.directions.map(f => f.angle)).size !== map.directions.length) throw new Error('Duplicate frame keys or angles.');
  return map;
}
export function selectFrame(map: AngleMap, angle: number, isCenter: boolean): Frame {
  if (isCenter) return map.center;
  return map.directions.reduce((best, f) => angleDistance(f.angle, angle) < angleDistance(best.angle, angle) ? f : best);
}
