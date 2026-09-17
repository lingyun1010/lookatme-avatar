import OpenAI, { toFile } from 'openai';
import type { GeneratedImage, ImageGenerationProvider, ImageGenerationRequest } from '../../producers/photo/types.js';

export interface OpenAIImageGenerationProviderOptions { apiKey?: string; model?: string; quality?: 'low' | 'medium' | 'high' }

export class OpenAIImageGenerationProvider implements ImageGenerationProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly quality: 'low' | 'medium' | 'high';
  constructor(options: OpenAIImageGenerationProviderOptions = {}) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is required on the server.');
    this.client = new OpenAI({ apiKey }); this.model = options.model ?? 'gpt-image-2'; this.quality = options.quality ?? 'medium';
  }
  async generate(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const image = await toFile(request.reference.data, 'reference.png', { type: request.reference.mimeType });
    const response = await this.client.images.edit({ model: this.model, image, prompt: request.prompt, size: '1024x1024', quality: this.quality, output_format: 'png'});
    const encoded = response.data?.[0]?.b64_json;
    if (!encoded) throw new Error('OpenAI returned no generated image data.');
    return { data: Buffer.from(encoded, 'base64'), mimeType: 'image/png' };
  }
}
