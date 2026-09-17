import type { AvatarDirection, AvatarFramePreset, DirectionFramePlan } from './types.js';
export const defaultPhotoDirections: readonly AvatarDirection[] = ['left', 'right', 'up', 'down'];
export const directionAngles: Readonly<Record<AvatarDirection, number>> = Object.freeze({ right: 0, down: 90, left: 180, up: 270 });
export function normalizeDirections(value: AvatarDirection[] | undefined): AvatarDirection[] { const directions = value ?? [...defaultPhotoDirections]; if (!directions.length) throw new Error('At least one avatar direction is required.'); if (directions.some(direction => !(direction in directionAngles))) throw new Error('Unsupported avatar direction.'); if (new Set(directions).size !== directions.length) throw new Error('Avatar directions must be unique.'); return [...directions]; }
const namedPlans: Record<number, DirectionFramePlan> = {
  0: { key: 'right', angle: 0, label: 'Right' }, 45: { key: 'down-right', angle: 45, label: 'Down-right' }, 90: { key: 'down', angle: 90, label: 'Down' }, 135: { key: 'down-left', angle: 135, label: 'Down-left' },
  180: { key: 'left', angle: 180, label: 'Left' }, 225: { key: 'up-left', angle: 225, label: 'Up-left' }, 270: { key: 'up', angle: 270, label: 'Up' }, 315: { key: 'up-right', angle: 315, label: 'Up-right' }
};
const arbitraryPlan = (angle: number): DirectionFramePlan => namedPlans[angle] ?? { key: `angle-${String(angle).padStart(3, '0')}`, angle, label: `${angle}°` };
const plan = (angles: number[]) => angles.map(arbitraryPlan);
export const avatarFramePresets: Readonly<Record<AvatarFramePreset, readonly DirectionFramePlan[]>> = Object.freeze({ fast: Object.freeze(plan([0, 90, 180, 270])), balanced: Object.freeze(plan([0, 45, 90, 135, 180, 225, 270, 315])), smooth: Object.freeze(plan([0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330])) });
export function getPresetPlan(preset: AvatarFramePreset): DirectionFramePlan[] { const frames = avatarFramePresets[preset]; if (!frames) throw new Error(`Unknown avatar frame preset: ${preset}`); return frames.map(frame => ({ ...frame })); }
export function getGenerationPlan(preset: AvatarFramePreset | undefined, legacyDirections?: AvatarDirection[]): { preset: AvatarFramePreset; frames: DirectionFramePlan[] } { if (legacyDirections) return { preset: 'fast', frames: normalizeDirections(legacyDirections).map(direction => ({ key: direction, angle: directionAngles[direction], label: direction })) }; const selected = preset ?? 'fast'; return { preset: selected, frames: getPresetPlan(selected) }; }
export function framePlanForAngle(angle: number): DirectionFramePlan { if (!Number.isFinite(angle) || angle < 0 || angle >= 360) throw new Error('Frame angle must be in [0, 360).'); return { ...arbitraryPlan(angle) }; }
