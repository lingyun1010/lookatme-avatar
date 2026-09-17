import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { type AvatarFrameSet, type DebugState } from '../index.js';
import { LookAtMeAvatar } from '../react.js';
import './style.css';
import { PhotoAiDemo } from './PhotoAiDemo.js';
const manualFrames: AvatarFrameSet = {
  version: 2,
  center: { key: 'center', src: 'center.png' },
  directions: [
    { key: 'e', angle: 0, src: 'e.png' },
    { key: 's', angle: 90, src: 's.png' },
    { key: 'w', angle: 180, src: 'w.png' },
    { key: 'n', angle: 270, src: 'n.png' }
  ],
  metadata: { source: { type: 'manual' } }
};
function Demo() {
  const [debug, setDebug] = useState(true);
  const [source, setSource] = useState<'video' | 'manual'>('video');
  const [state, setState] = useState<DebugState>({ angle: 0, key: 'center', isCenter: true });
  const frames = source === 'video' ? './angle-map.json' : manualFrames;
  return <main><header><a className="brand" href="./">LookAtMe<span>↗</span></a><span className="badge">FRAME-BASED WEB AVATARS</span></header><section className="intro"><p className="eyebrow">A LITTLE CHARACTER. A LITTLE CODE.</p><h1>A familiar face.<br/><em>A new interaction.</em></h1><p>Feed video-produced, manually supplied, or photo-generated frames into one lightweight mouse-following renderer.</p></section><section className="playground" aria-label="Move your pointer here to explore the avatar"><div className="stage-label"><span className="dot"/> LIVE PLAYGROUND <span><button onClick={() => setSource('video')} disabled={source === 'video'}>VIDEO OUTPUT</button> <button onClick={() => setSource('manual')} disabled={source === 'manual'}>MANUAL FRAME SET</button></span></div><div className="avatar"><LookAtMeAvatar frameBasePath="./frames" frames={frames} size={440} onFrameChange={setState}/></div><div className="readout"><span>{debug ? `${source.toUpperCase()} · ${state.key.toUpperCase()} / ${state.isCenter ? 'NEUTRAL' : `${state.angle.toFixed(1)}°`}` : 'FOLLOWING YOUR LEAD'}</span><label><input type="checkbox" checked={debug} onChange={e => setDebug(e.target.checked)}/> Debug</label></div></section><PhotoAiDemo/><section className="notes"><div><span>01 / PRODUCE</span><h2>Choose any frame source.</h2><p>Video, photo AI, and manual fixtures all create the same AvatarFrameSet contract.</p></div><div><span>02 / NORMALIZE</span><h2>Keep provenance outside rendering.</h2><p>Frame metadata can identify its producer; the directional engine only needs image sources and angles.</p></div><div><span>03 / RENDER</span><h2>Reuse one interaction.</h2><p>React and standalone HTML are thin adapters over the shared lifecycle-aware renderer.</p></div></section><footer><span>2D frames. Any producer.</span><code>&lt;LookAtMeAvatar frames=&#123;frames&#125; /&gt;</code></footer></main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Demo/></React.StrictMode>);
