export const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;
export function angleDistance(a: number, b: number) {
  const delta = normalizeAngle(a - b);
  return Math.min(delta, 360 - delta);
}
export function pointerAngle(x: number, y: number, rect: { left: number; top: number; width: number; height: number }, deadZone: number) {
  const dx = x - rect.left - rect.width / 2;
  const dy = y - rect.top - rect.height / 2;
  return { angle: normalizeAngle(Math.atan2(dy, dx) * 180 / Math.PI), isCenter: Math.hypot(dx, dy) <= Math.min(rect.width, rect.height) * deadZone };
}
