import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private visionModel: any;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('gemini.apiKey') ?? '';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });
    this.visionModel = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });
  }

  async generateText(prompt: string): Promise<string> {
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  async generateWithImage(
    prompt: string,
    imageBase64: string,
    mimeType: string,
  ): Promise<string> {
    const result = await this.visionModel.generateContent([
      {
        inlineData: {
          data: imageBase64,
          mimeType,
        },
      },
      prompt,
    ]);
    return result.response.text();
  }

  parseJSON<T>(text: string): T {
    const clean = text
      .trim()
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(clean) as T;
  }
}
