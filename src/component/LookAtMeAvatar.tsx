import { useEffect, useRef, useState } from 'react';
import { mountAvatar } from '../core/runtime.js';
import type { AvatarOptions } from './types.js';
export function LookAtMeAvatar(props: AvatarOptions) {
  const root = useRef<HTMLDivElement>(null);
  const callbacks = useRef(props);
  callbacks.current = props;
  const [error, setError] = useState('');
  const { frameBasePath, angleMap, size, width, height, objectFit, deadZone, tracking, alt } = props;
  useEffect(() => {
    let active = true;
    setError('');
    let avatar: ReturnType<typeof mountAvatar> | undefined;
    try {
      avatar = mountAvatar(root.current!, { frameBasePath, angleMap, size, width, height, objectFit, deadZone, tracking, alt, onFrameChange: state => callbacks.current.onFrameChange?.(state) });
      avatar.ready.catch(report);
    } catch (e) { report(e); }
    function report(e: unknown) {
      if (!active) return;
      const failure = e instanceof Error ? e : new Error(String(e));
      setError(failure.message); callbacks.current.onError?.(failure);
    }
    return () => { active = false; avatar?.destroy(); };
  }, [frameBasePath, angleMap, size, width, height, objectFit, deadZone, tracking, alt]);
  return <div ref={root} style={{ maxWidth: '100%', pointerEvents: 'none' }}>{error && <span role="alert">Avatar unavailable: {error}</span>}</div>;
}
