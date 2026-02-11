import { Controller, Get, Headers, NotFoundException, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import * as os from 'node:os';
import * as v8 from 'node:v8';

@ApiTags('health')
@Controller('health')
export class RenderDebugController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('render-debug')
  @Public()
  @ApiOperation({ summary: 'Render backend debug (token-protected)' })
  @ApiResponse({ status: 200, description: 'Debug info' })
  async renderDebug(
    @Headers('x-render-debug-token') headerToken?: string,
    @Query('token') queryToken?: string,
  ) {
    const expected = process.env.RENDER_BACKEND_DEBUG_TOKEN;

    // Don’t expose anything unless explicitly configured.
    if (!expected) {
      throw new NotFoundException();
    }

    const provided = headerToken || queryToken;
    if (!provided || provided !== expected) {
      throw new NotFoundException();
    }

    const commit =
      process.env.RENDER_GIT_COMMIT ||
      process.env.SOURCE_VERSION ||
      process.env.GIT_SHA ||
      process.env.BUILD_COMMIT ||
      null;

    const databaseUrlSet = !!process.env.DATABASE_URL;
    const mem = process.memoryUsage();
    const heap = v8.getHeapStatistics();

    const db: Record<string, any> = {
      databaseUrlSet,
      connected: false,
      prismaMigrations: {
        tableExists: false,
        appliedCount: 0,
        latestFinishedAt: null as string | null,
        latestMigrationName: null as string | null,
      },
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db.connected = true;
    } catch (e: any) {
      db.connected = false;
      db.error = e?.message || String(e);
    }

    if (db.connected) {
      try {
        const rows = (await this.prisma.$queryRawUnsafe(
          `SELECT migration_name, finished_at
           FROM "_prisma_migrations"
           WHERE finished_at IS NOT NULL
           ORDER BY finished_at DESC
           LIMIT 1`,
        )) as Array<{ migration_name: string; finished_at: Date }>;

        const countRows = (await this.prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int AS count
           FROM "_prisma_migrations"
           WHERE finished_at IS NOT NULL`,
        )) as Array<{ count: number }>;

        db.prismaMigrations.tableExists = true;
        db.prismaMigrations.appliedCount = countRows?.[0]?.count ?? 0;
        db.prismaMigrations.latestFinishedAt = rows?.[0]?.finished_at
          ? new Date(rows[0].finished_at).toISOString()
          : null;
        db.prismaMigrations.latestMigrationName = rows?.[0]?.migration_name ?? null;
      } catch (e: any) {
        // Table probably doesn't exist yet (migrations not run)
        db.prismaMigrations.tableExists = false;
        db.prismaMigrations.error = e?.message || String(e);
      }
    }

    return {
      success: true,
      message: 'Render backend debug',
      timestamp: new Date().toISOString(),
      data: {
        build: {
          commit,
          node: process.version,
          uptimeSeconds: Math.round(process.uptime()),
        },
        memory: {
          // Process memory (bytes)
          rss: mem.rss,
          heapTotal: mem.heapTotal,
          heapUsed: mem.heapUsed,
          external: mem.external,
          arrayBuffers: (mem as any).arrayBuffers ?? null,
          // V8 heap stats (bytes)
          v8HeapSizeLimit: heap.heap_size_limit,
          v8TotalAvailableSize: heap.total_available_size,
          v8MallocedMemory: heap.malloced_memory,
          // Host memory (bytes)
          hostTotalMem: os.totalmem(),
          hostFreeMem: os.freemem(),
        },
        env: {
          NODE_ENV: process.env.NODE_ENV || null,
          RENDER_SERVICE_ID: process.env.RENDER_SERVICE_ID || null,
          RENDER_SERVICE_NAME: process.env.RENDER_SERVICE_NAME || null,
          RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL || null,
          PORT: process.env.PORT || null,
          RENDER_BACKEND_DEBUG: process.env.RENDER_BACKEND_DEBUG || null,
        },
        db,
      },
    };
  }
}

