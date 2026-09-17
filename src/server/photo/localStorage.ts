import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AvatarDirection, AvatarImageStorage, GeneratedImage, StoredImage } from '../../producers/photo/types.js';

const extensions = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as const;
const mimeTypes = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' } as const;

export class LocalAvatarImageStorage implements AvatarImageStorage {
  constructor(private readonly root: string, private readonly publicBase = '/generated') {}
  createFrameSetId(): string { return randomUUID(); }
  private directory(id: string) { if (!/^[a-f0-9-]+$/i.test(id)) throw new Error('Invalid frame set id.'); return path.join(this.root, id); }
  async put(id: string, key: 'center' | AvatarDirection, image: GeneratedImage): Promise<StoredImage> {
    const directory = this.directory(id); await mkdir(directory, { recursive: true });
    const filename = `${key}.${extensions[image.mimeType]}`; await writeFile(path.join(directory, filename), image.data);
    return { src: `${this.publicBase}/${id}/${filename}` };
  }
  async read(id: string, key: 'center' | AvatarDirection): Promise<GeneratedImage> {
    const directory = this.directory(id);
    for (const extension of Object.keys(mimeTypes) as Array<keyof typeof mimeTypes>) {
      try { return { data: await readFile(path.join(directory, `${key}.${extension}`)), mimeType: mimeTypes[extension] }; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    throw new Error(`Stored frame not found: ${key}`);
  }
}
