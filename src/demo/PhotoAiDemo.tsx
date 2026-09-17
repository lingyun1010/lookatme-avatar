import { useState, type FormEvent } from 'react';
import type { AvatarFrameSet } from '../index.js';
import { LookAtMeAvatar } from '../react.js';
import { avatarStyles } from '../producers/photo/styles.js';
import type { AvatarFramePreset, AvatarStyleId } from '../producers/photo/types.js';
import './photo-ai.css';
export function PhotoAiDemo() {
  const [file, setFile] = useState<File>(); const [style, setStyle] = useState<AvatarStyleId>('felt@1'); const [preset, setPreset] = useState<AvatarFramePreset>('balanced');
  const [status, setStatus] = useState('Choose a portrait to begin.'); const [frames, setFrames] = useState<AvatarFrameSet>(); const [busy, setBusy] = useState(false);
  async function generate(event: FormEvent) {
    event.preventDefault(); if (!file) return setStatus('Choose a PNG, JPEG, or WebP portrait first.');
    setBusy(true); setFrames(undefined); setStatus(`Generating the canonical center, then the ${preset} directional set…`);
    try { const form = new FormData(); form.set('image', file); form.set('style', style); form.set('preset', preset); const response = await fetch('/api/photo-avatar', { method: 'POST', body: form }); const value = await response.json(); if (!response.ok) throw new Error(value.error ?? 'Generation failed.'); setFrames(value); setStatus(`${value.directions.length + 1}-frame AvatarFrameSet ready — move your pointer around the avatar.`); }
    catch (error) { setStatus(error instanceof Error ? error.message : String(error)); } finally { setBusy(false); }
  }
  return <section className="photo-ai" aria-labelledby="photo-ai-title"><div><p className="eyebrow">PHOTO AI / SERVER-SIDE</p><h2 id="photo-ai-title">Portrait in. Choose your smoothness.</h2><p>The uploaded photo becomes one canonical styled center first. Every direction is generated from that center, then passed to the same renderer above.</p><form onSubmit={generate}><label>Portrait<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => setFile(event.target.files?.[0])}/></label><label>Style<select value={style} onChange={event => setStyle(event.target.value as AvatarStyleId)}>{Object.values(avatarStyles).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Smoothness<select value={preset} onChange={event => setPreset(event.target.value as AvatarFramePreset)}><option value="fast">Fast · 5 frames</option><option value="balanced">Balanced · 9 frames · Recommended</option><option value="smooth">Smooth · 13 frames</option></select></label><button disabled={busy || !file}>{busy ? 'Generating…' : 'Generate Avatar'}</button></form><output aria-live="polite">{status}</output></div><div className="photo-preview">{frames ? <LookAtMeAvatar frames={frames} size={420}/> : <span>Generated avatar preview</span>}</div></section>;
}
