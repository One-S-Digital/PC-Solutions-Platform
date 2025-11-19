import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class TranslationMemoryService {
  private readonly logger = new Logger(TranslationMemoryService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get translation from memory if exists
   */
  async getFromMemory(
    sourceText: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string | null> {
    const sourceTextHash = this.hashText(sourceText);

    const memory = await this.prisma.translationMemory.findUnique({
      where: {
        sourceTextHash_sourceLang_targetLang: {
          sourceTextHash,
          sourceLang,
          targetLang,
        },
      },
    });

    if (memory) {
      // Update usage stats
      await this.prisma.translationMemory.update({
        where: { id: memory.id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      this.logger.log(
        `Translation memory hit: ${sourceLang} -> ${targetLang} (saved ${sourceText.length} chars)`,
      );
      return memory.translatedText;
    }

    return null;
  }

  /**
   * Save translation to memory
   */
  async saveToMemory(
    sourceText: string,
    sourceLang: string,
    targetLang: string,
    translatedText: string,
    mtProvider: string,
  ): Promise<void> {
    const sourceTextHash = this.hashText(sourceText);

    await this.prisma.translationMemory.upsert({
      where: {
        sourceTextHash_sourceLang_targetLang: {
          sourceTextHash,
          sourceLang,
          targetLang,
        },
      },
      update: {
        translatedText,
        mtProvider,
        lastUsedAt: new Date(),
      },
      create: {
        sourceTextHash,
        sourceLang,
        targetLang,
        translatedText,
        mtProvider,
      },
    });
  }

  private hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}

