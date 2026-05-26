import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { KnowledgeEmbeddingService } from './knowledge-embedding.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmClient } from '../llm-client';
import { PLATFORM_ARTICLES } from './platform-knowledge';

const FAKE_EMBEDDING = new Array(512).fill(0.1);

describe('KnowledgeEmbeddingService', () => {
  let service: KnowledgeEmbeddingService;
  let prisma: any;
  let llm: any;
  const originalEnv = process.env.VOYAGE_API_KEY;

  beforeEach(async () => {
    process.env.VOYAGE_API_KEY = 'test-key';

    prisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
      $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
    };

    llm = {
      embed: jest.fn().mockResolvedValue({ embedding: FAKE_EMBEDDING, model: 'voyage-3-lite', totalTokens: 10 }),
    };

    const module = await Test.createTestingModule({
      providers: [
        KnowledgeEmbeddingService,
        { provide: PrismaService, useValue: prisma },
        { provide: LlmClient, useValue: llm },
      ],
    }).compile();

    service = module.get(KnowledgeEmbeddingService);
  });

  afterEach(() => {
    process.env.VOYAGE_API_KEY = originalEnv;
  });

  // ── embedAll on init ───────────────────────────────────────────────────────

  describe('onModuleInit', () => {
    it('skips embedding when VOYAGE_API_KEY is not set', async () => {
      delete process.env.VOYAGE_API_KEY;
      await service.onModuleInit();
      expect(llm.embed).not.toHaveBeenCalled();
      expect(service.isReady).toBe(false);
    });

    it('embeds all articles when none are cached', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]); // no existing embeddings
      await (service as any).embedAll();
      expect(llm.embed).toHaveBeenCalledTimes(PLATFORM_ARTICLES.length);
      expect(service.isReady).toBe(true);
    });

    it('skips articles whose contentHash is unchanged', async () => {
      // Simulate all articles already embedded with the current hash
      prisma.$queryRawUnsafe.mockImplementation(async (sql: string, articleId: string) => {
        const article = PLATFORM_ARTICLES.find((a) => a.id === articleId);
        if (!article) return [];
        const { createHash } = await import('crypto');
        const text = `${article.title}\n${article.keywords.join(' ')}\n${article.content}`;
        const hash = createHash('sha256').update(text).digest('hex');
        return [{ contentHash: hash }];
      });

      await (service as any).embedAll();
      expect(llm.embed).not.toHaveBeenCalled();
      expect(service.isReady).toBe(true);
    });

    it('upserts new embedding when contentHash differs', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ contentHash: 'old-hash' }]);
      await (service as any).embedAll();
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(PLATFORM_ARTICLES.length);
    });
  });

  // ── searchSemantic ─────────────────────────────────────────────────────────

  describe('searchSemantic()', () => {
    it('returns empty array when not ready', async () => {
      const results = await service.searchSemantic('job board', UserRole.EDUCATOR, 3);
      expect(results).toEqual([]);
      expect(llm.embed).not.toHaveBeenCalled();
    });

    it('queries pgvector and maps article IDs back to article objects', async () => {
      // Force ready
      (service as any)._ready = true;

      prisma.$queryRawUnsafe.mockResolvedValue([
        { article_id: 'job-board', similarity: 0.85 },
        { article_id: 'educator-profile', similarity: 0.72 },
      ]);

      const results = await service.searchSemantic('find a job', UserRole.EDUCATOR, 3);

      expect(llm.embed).toHaveBeenCalledWith('find a job');
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('job-board');
      expect(results[1].id).toBe('educator-profile');
    });

    it('excludes articles below the similarity threshold', async () => {
      (service as any)._ready = true;

      prisma.$queryRawUnsafe.mockResolvedValue([
        { article_id: 'job-board', similarity: 0.85 },
        { article_id: 'educator-profile', similarity: 0.3 }, // below 0.5 threshold
      ]);

      const results = await service.searchSemantic('find a job', UserRole.EDUCATOR, 3);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('job-board');
    });

    it('excludes articles the role cannot access', async () => {
      (service as any)._ready = true;

      // 'parent-leads' is only for FOUNDATION — should be filtered for EDUCATOR
      prisma.$queryRawUnsafe.mockResolvedValue([
        { article_id: 'parent-leads', similarity: 0.9 },
        { article_id: 'job-board', similarity: 0.8 },
      ]);

      const results = await service.searchSemantic('leads', UserRole.EDUCATOR, 3);
      expect(results.map((r) => r.id)).not.toContain('parent-leads');
      expect(results.map((r) => r.id)).toContain('job-board');
    });
  });
});
