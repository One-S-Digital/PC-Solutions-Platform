import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHash } from 'crypto';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmClient } from '../llm-client';
import { KnowledgeArticle, PLATFORM_ARTICLES } from './platform-knowledge';

const SIMILARITY_THRESHOLD = 0.5;

@Injectable()
export class KnowledgeEmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeEmbeddingService.name);
  private _ready = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClient,
  ) {}

  get isReady(): boolean {
    return this._ready;
  }

  onModuleInit() {
    // Run in background — never block startup
    if (!process.env.VOYAGE_API_KEY) {
      this.logger.log('VOYAGE_API_KEY not set — semantic search disabled, using keyword fallback');
      return;
    }
    this.embedAll().catch((err) => {
      this.logger.warn(`Knowledge embedding init failed — keyword fallback active: ${err?.message}`);
    });
  }

  async searchSemantic(query: string, role: UserRole, limit = 3, activeFlags: Set<string> = new Set()): Promise<KnowledgeArticle[]> {
    if (!this._ready) return [];

    const { embedding } = await this.llm.embed(query);

    // Fetch top candidates by cosine distance (lower = more similar)
    const rows = await this.prisma.$queryRawUnsafe<{ article_id: string; similarity: number }[]>(
      `SELECT "articleId" AS article_id,
              1 - ("embedding" <=> $1::vector) AS similarity
       FROM   knowledge_article_embeddings
       ORDER  BY "embedding" <=> $1::vector
       LIMIT  $2`,
      JSON.stringify(embedding),
      limit * 3, // over-fetch, then filter by role, flags, and threshold
    );

    const accessibleIds = new Set(
      PLATFORM_ARTICLES.filter(
        (a) =>
          (!a.roles || a.roles.includes(role)) &&
          (!a.featureFlag || activeFlags.has(a.featureFlag)),
      ).map((a) => a.id),
    );

    // Map to articles first, then slice — avoids under-delivering when stale IDs exist in top rows
    return rows
      .filter((r) => r.similarity >= SIMILARITY_THRESHOLD && accessibleIds.has(r.article_id))
      .map((r) => PLATFORM_ARTICLES.find((a) => a.id === r.article_id))
      .filter((a): a is KnowledgeArticle => Boolean(a))
      .slice(0, limit);
  }

  private async embedAll(): Promise<void> {
    let embedded = 0;
    let skipped = 0;

    for (const article of PLATFORM_ARTICLES) {
      const text = `${article.title}\n${article.keywords.join(' ')}\n${article.content}`;
      const hash = createHash('sha256').update(text).digest('hex');

      const existing = await this.prisma.$queryRawUnsafe<{ contentHash: string }[]>(
        `SELECT "contentHash" FROM knowledge_article_embeddings WHERE "articleId" = $1`,
        article.id,
      );

      if (existing[0]?.contentHash === hash) {
        skipped++;
        continue;
      }

      const { embedding } = await this.llm.embed(text);

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO knowledge_article_embeddings ("id", "articleId", "contentHash", "embedding", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3::vector, NOW())
         ON CONFLICT ("articleId") DO UPDATE
           SET "contentHash" = EXCLUDED."contentHash",
               "embedding"   = EXCLUDED."embedding",
               "updatedAt"   = NOW()`,
        article.id,
        hash,
        JSON.stringify(embedding),
      );

      embedded++;
    }

    this._ready = true;
    this.logger.log(
      `Knowledge embeddings ready — embedded: ${embedded}, unchanged: ${skipped}, total: ${PLATFORM_ARTICLES.length}`,
    );
  }
}
