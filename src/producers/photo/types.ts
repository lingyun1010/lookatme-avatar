import type { AvatarFrameSet } from '../../core/avatarFrameSet.js';

export type AvatarDirection = 'left' | 'right' | 'up' | 'down';
export type AvatarFramePreset = 'fast' | 'balanced' | 'smooth';
export interface DirectionFramePlan { key: string; angle: number; label: string }
export type AvatarStyleId = 'felt@1' | 'cartoon@1' | 'cinematic-3d@1' | 'anime@1';
export type PhotoBytes = Uint8Array;
export interface PhotoFrameProducerInput { image: PhotoBytes | string; style: AvatarStyleId; preset?: AvatarFramePreset; /** @deprecated Prefer preset. */ directions?: AvatarDirection[]; mimeType?: string }
export interface PhotoFrameProducer { produce(input: PhotoFrameProducerInput): Promise<AvatarFrameSet> }
export interface GeneratedImage { data: PhotoBytes; mimeType: 'image/png' | 'image/jpeg' | 'image/webp' }
export interface ImageGenerationRequest { reference: GeneratedImage; prompt: string }
export interface ImageGenerationProvider { generate(request: ImageGenerationRequest): Promise<GeneratedImage> }
export interface StoredImage { src: string }
export interface AvatarImageStorage {
  createFrameSetId(): string;
  put(frameSetId: string, key: string, image: GeneratedImage): Promise<StoredImage>;
  read(frameSetId: string, key: string): Promise<GeneratedImage>;
}
export interface GeneratedImageInfo { width: number; height: number; aspectRatio: number }
export interface GeneratedImageValidator { inspect(image: GeneratedImage): Promise<GeneratedImageInfo> }
