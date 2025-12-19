import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildAuditLogWhere, AuditLogQuery } from '../prisma/audit-middleware';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get audit logs with pagination and filters
   */
  async getAuditLogs(query: AuditLogQuery & { page?: number; limit?: number }) {
    const { page = 1, limit = 50, ...filterQuery } = query;
    const skip = (page - 1) * limit;

    const where = buildAuditLogWhere(filterQuery);

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Get list of all entities that have been audited
   */
  async getAuditedEntities() {
    const entities = await this.prisma.auditLog.findMany({
      select: { entity: true },
      distinct: ['entity'],
      orderBy: { entity: 'asc' },
    });

    return {
      entities: entities.map(e => e.entity),
    };
  }

  /**
   * Get audit log statistics
   */
  async getAuditStats(query: Pick<AuditLogQuery, 'startDate' | 'endDate'>) {
    const where = buildAuditLogWhere(query);

    const [totalLogs, byEntity, byAction, byActor] = await Promise.all([
      // Total count
      this.prisma.auditLog.count({ where }),

      // Group by entity
      this.prisma.auditLog.groupBy({
        by: ['entity'],
        where,
        _count: { entity: true },
        orderBy: { _count: { entity: 'desc' } },
      }),

      // Group by action
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
      }),

      // Top actors
      this.prisma.auditLog.groupBy({
        by: ['actorId'],
        where: { ...where, actorId: { not: null } },
        _count: { actorId: true },
        orderBy: { _count: { actorId: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalLogs,
      byEntity: byEntity.map(e => ({ entity: e.entity, count: e._count.entity })),
      byAction: byAction.map(a => ({ action: a.action, count: a._count.action })),
      topActors: await Promise.all(
        byActor.map(async (a) => {
          const actor = await this.prisma.appUser.findUnique({
            where: { id: a.actorId! },
            select: { id: true, email: true, clerkId: true },
          });
          return {
            actorId: a.actorId,
            actor,
            count: a._count.actorId,
          };
        })
      ),
    };
  }

  /**
   * Export audit logs to CSV
   */
  async exportToCsv(query: Pick<AuditLogQuery, 'entity' | 'startDate' | 'endDate'>) {
    const where = buildAuditLogWhere(query);

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      take: 10000, // Limit to prevent memory issues
    });

    // Build CSV
    const headers = ['Timestamp', 'Entity', 'Entity ID', 'Action', 'Actor', 'Actor Email', 'Trace ID'];
    const rows = logs.map(log => [
      log.createdAt.toISOString(),
      log.entity,
      log.entityId,
      log.action,
      log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System',
      log.actor?.email || 'N/A',
      (log.metadata as any)?.traceId || 'N/A',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return {
      filename: `audit-logs-${new Date().toISOString().split('T')[0]}.csv`,
      content: csv,
      contentType: 'text/csv',
    };
  }
}
