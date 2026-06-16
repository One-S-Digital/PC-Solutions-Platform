import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResultCacheService {
  constructor(private readonly prisma: PrismaService) {}

  async get<T>(cacheKey: string): Promise<{ payload: T; modelUsed: string } | null> {
    const row = await this.prisma.aiResultCache.findUnique({ where: { cacheKey } });
    if (!row) return null;
    if (row.expiresAt && row.expiresAt < new Date()) {
      await this.prisma.aiResultCache.delete({ where: { cacheKey } }).catch(() => {});
      return null;
    }
    return { payload: row.payload as T, modelUsed: row.modelUsed };
  }

  async set(
    cacheKey: string,
    agentName: string,
    payload: unknown,
    modelUsed: string,
    ttlSeconds?: number,
  ): Promise<void> {
    const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
    await this.prisma.aiResultCache.upsert({
      where: { cacheKey },
      create: { cacheKey, agentName, payload: payload as any, modelUsed, expiresAt },
      update: { payload: payload as any, modelUsed, expiresAt, createdAt: new Date() },
    });
  }
}
