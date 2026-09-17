import type { AvatarDirection } from './types.js';
export const defaultPhotoDirections: readonly AvatarDirection[] = ['left', 'right', 'up', 'down'];
export const directionAngles: Readonly<Record<AvatarDirection, number>> = Object.freeze({ right: 0, down: 90, left: 180, up: 270 });
export function normalizeDirections(value: AvatarDirection[] | undefined): AvatarDirection[] { const directions = value ?? [...defaultPhotoDirections]; if (!directions.length) throw new Error('At least one avatar direction is required.'); if (directions.some(direction => !(direction in directionAngles))) throw new Error('Unsupported avatar direction.'); if (new Set(directions).size !== directions.length) throw new Error('Avatar directions must be unique.'); return [...directions]; }
