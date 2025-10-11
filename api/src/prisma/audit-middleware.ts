import { Prisma } from '@prisma/client';
import { RequestContextService } from '../common/request-context';

/**
 * Models to audit (mutations will be logged)
 */
const AUDITED_MODELS = new Set([
  'PolicyAlert',
  'ContentItem',
  'AppUser',
  'PlatformSettings',
  'Organization',
  'Course',
]);

/**
 * Actions to audit
 */
const AUDITED_ACTIONS = new Set(['create', 'update', 'delete', 'upsert']);

/**
 * Prisma middleware to automatically log all mutations on audited models
 * 
 * Usage: Call this in PrismaService.onModuleInit()
 */
export function createAuditMiddleware(prismaClient: any): Prisma.Middleware {
  return async (params: Prisma.MiddlewareParams, next) => {
    // Execute the query first
    const result = await next(params);

    // Only audit specific models and actions
    if (!AUDITED_MODELS.has(params.model || '')) {
      return result;
    }

    if (!AUDITED_ACTIONS.has(params.action)) {
      return result;
    }

    // Get request context
    const actorId = RequestContextService.getUserId();
    const traceId = RequestContextService.getTraceId();
    const ip = RequestContextService.getIp();
    const context = RequestContextService.toObject();

    // Extract entity ID
    let entityId: string | undefined;
    if (result && typeof result === 'object') {
      entityId = (result as any).id;
    } else if (params.args?.where?.id) {
      entityId = params.args.where.id;
    }

    // Build diff (before/after)
    const diff: any = {
      action: params.action,
    };

    if (params.action === 'update' || params.action === 'upsert') {
      diff.before = params.args?.where;
      diff.after = params.args?.data;
    } else if (params.action === 'create') {
      diff.created = params.args?.data;
    } else if (params.action === 'delete') {
      diff.deleted = params.args?.where;
    }

    // Create audit log (async, don't block response)
    // Use setImmediate to avoid blocking
    setImmediate(async () => {
      try {
        await prismaClient.auditLog.create({
          data: {
            entity: params.model!,
            entityId: entityId || 'unknown',
            action: params.action,
            actorId,
            diff,
            metadata: {
              traceId,
              ip,
              userAgent: context?.userAgent,
              method: context?.method,
              path: context?.path,
              timestamp: new Date().toISOString(),
            },
          },
        });
      } catch (error) {
        // Log error but don't fail the original operation
        console.error('Failed to create audit log:', error);
      }
    });

    return result;
  };
}

/**
 * Helper to query audit logs
 */
export interface AuditLogQuery {
  entity?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export function buildAuditLogWhere(query: AuditLogQuery): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (query.entity) {
    where.entity = query.entity;
  }

  if (query.entityId) {
    where.entityId = query.entityId;
  }

  if (query.actorId) {
    where.actorId = query.actorId;
  }

  if (query.action) {
    where.action = query.action;
  }

  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) {
      where.createdAt.gte = query.startDate;
    }
    if (query.endDate) {
      where.createdAt.lte = query.endDate;
    }
  }

  return where;
}
