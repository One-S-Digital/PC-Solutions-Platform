import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssistantPrincipalContext } from './orchestrator.service';
import { AIConversationKind, AIMessageSender } from '@prisma/client';

export type BriefingItemType =
  | 'parent_leads'
  | 'stale_applications'
  | 'pending_replacements'
  | 'canton_updates'
  | 'unread_notifications';

export interface BriefingItem {
  type: BriefingItemType;
  count: number;
  meta?: Record<string, unknown>;
}

export interface Briefing {
  generatedAt: string;
  items: BriefingItem[];
  /** Today's persisted BRIEFING conversation, if one was created. */
  conversationId: string | null;
}

type Locale = 'en' | 'fr' | 'de';

const CACHE_TTL_MS = 30 * 60 * 1000; // regenerate at most twice an hour per user
const LEAD_WINDOW_DAYS = 7;
const STALE_APPLICATION_DAYS = 5;
const CANTON_UPDATE_WINDOW_DAYS = 7;

// Server-side labels are only used for the persisted snapshot message;
// the live briefing card localizes items on the client from typed counts.
const SNAPSHOT_LABELS: Record<Locale, Record<BriefingItemType, (n: number) => string> & { title: (date: string) => string; headline: (n: number) => string }> = {
  en: {
    title: (date) => `Morning briefing — ${date}`,
    headline: (n) => `${n} ${n === 1 ? 'thing needs' : 'things need'} your attention today.`,
    parent_leads: (n) => `${n} new parent ${n === 1 ? 'lead' : 'leads'} waiting for a reply`,
    stale_applications: (n) => `${n} ${n === 1 ? 'application' : 'applications'} waiting more than ${STALE_APPLICATION_DAYS} days`,
    pending_replacements: (n) => `${n} replacement ${n === 1 ? 'match' : 'matches'} pending your review`,
    canton_updates: (n) => `${n} new cantonal policy ${n === 1 ? 'update' : 'updates'}`,
    unread_notifications: (n) => `${n} unread ${n === 1 ? 'notification' : 'notifications'}`,
  },
  fr: {
    title: (date) => `Briefing du matin — ${date}`,
    headline: (n) => `${n} ${n === 1 ? 'élément demande' : 'éléments demandent'} votre attention aujourd'hui.`,
    parent_leads: (n) => `${n} ${n === 1 ? 'nouvelle demande de parent' : 'nouvelles demandes de parents'} en attente de réponse`,
    stale_applications: (n) => `${n} ${n === 1 ? 'candidature' : 'candidatures'} en attente depuis plus de ${STALE_APPLICATION_DAYS} jours`,
    pending_replacements: (n) => `${n} ${n === 1 ? 'proposition de remplacement' : 'propositions de remplacement'} à examiner`,
    canton_updates: (n) => `${n} ${n === 1 ? 'nouvelle directive cantonale' : 'nouvelles directives cantonales'}`,
    unread_notifications: (n) => `${n} ${n === 1 ? 'notification non lue' : 'notifications non lues'}`,
  },
  de: {
    title: (date) => `Morgenbriefing — ${date}`,
    headline: (n) => `${n} ${n === 1 ? 'Punkt erfordert' : 'Punkte erfordern'} heute Ihre Aufmerksamkeit.`,
    parent_leads: (n) => `${n} neue ${n === 1 ? 'Elternanfrage wartet' : 'Elternanfragen warten'} auf Antwort`,
    stale_applications: (n) => `${n} ${n === 1 ? 'Bewerbung wartet' : 'Bewerbungen warten'} seit mehr als ${STALE_APPLICATION_DAYS} Tagen`,
    pending_replacements: (n) => `${n} ${n === 1 ? 'Vertretungsvorschlag' : 'Vertretungsvorschläge'} zur Prüfung`,
    canton_updates: (n) => `${n} neue kantonale ${n === 1 ? 'Richtlinie' : 'Richtlinien'}`,
    unread_notifications: (n) => `${n} ungelesene ${n === 1 ? 'Benachrichtigung' : 'Benachrichtigungen'}`,
  },
};

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Composes the Morning Briefing from existing domain data — deterministic
 * count queries only, no new domain logic. The summary sentence is composed
 * from the structured items (an LLM-written summary can replace it later
 * without changing the API shape: the items stay deterministic either way).
 */
@Injectable()
export class BriefingService {
  private readonly logger = new Logger(BriefingService.name);
  private readonly cache = new Map<string, { briefing: Briefing; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async getBriefing(principal: AssistantPrincipalContext, locale: string): Promise<Briefing> {
    const cached = this.cache.get(principal.userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.briefing;
    }

    const items = await this.computeItems(principal);
    const conversationId =
      items.length > 0 ? await this.ensureBriefingConversation(principal, items, locale) : null;

    const briefing: Briefing = {
      generatedAt: new Date().toISOString(),
      items,
      conversationId,
    };
    this.cache.set(principal.userId, { briefing, expiresAt: Date.now() + CACHE_TTL_MS });
    return briefing;
  }

  private async computeItems(principal: AssistantPrincipalContext): Promise<BriefingItem[]> {
    const orgId = principal.organizationId;

    const [org, leadCount, staleApplications, pendingMatches, unreadNotifications] =
      await Promise.all([
        orgId
          ? this.prisma.organization.findUnique({ where: { id: orgId }, select: { canton: true } })
          : Promise.resolve(null),
        orgId
          ? this.prisma.parentLead.count({
              where: {
                foundationId: orgId,
                status: 'NEW',
                createdAt: { gte: daysAgo(LEAD_WINDOW_DAYS) },
              },
            })
          : Promise.resolve(0),
        orgId
          ? this.prisma.jobApplication.count({
              where: {
                status: 'PENDING',
                createdAt: { lt: daysAgo(STALE_APPLICATION_DAYS) },
                jobListing: { foundationId: orgId },
              },
            })
          : Promise.resolve(0),
        orgId
          ? this.prisma.replacementMatch.count({
              where: {
                status: 'PROPOSED',
                request: { foundationId: orgId, status: 'OPEN' },
              },
            })
          : Promise.resolve(0),
        this.prisma.notification.count({
          where: { userId: principal.userId, read: false },
        }),
      ]);

    const canton = org?.canton ?? null;
    const cantonUpdates = await this.prisma.asset.count({
      where: {
        category: 'STATE_POLICY',
        createdAt: { gte: daysAgo(CANTON_UPDATE_WINDOW_DAYS) },
        ...(canton ? { region: { in: [canton, 'All'] } } : {}),
      },
    });

    const items: BriefingItem[] = [];
    if (leadCount > 0) items.push({ type: 'parent_leads', count: leadCount });
    if (staleApplications > 0) items.push({ type: 'stale_applications', count: staleApplications });
    if (pendingMatches > 0) items.push({ type: 'pending_replacements', count: pendingMatches });
    if (cantonUpdates > 0)
      items.push({ type: 'canton_updates', count: cantonUpdates, meta: canton ? { canton } : undefined });
    if (unreadNotifications > 0)
      items.push({ type: 'unread_notifications', count: unreadNotifications });
    return items;
  }

  /**
   * Persists today's briefing as an AIConversation of kind BRIEFING with a
   * snapshot message, so it shows up in the sidebar history ("Morning
   * briefing — Jun 10"). One per user per day; later calls reuse it.
   */
  private async ensureBriefingConversation(
    principal: AssistantPrincipalContext,
    items: BriefingItem[],
    locale: string,
  ): Promise<string | null> {
    try {
      const existing = await this.prisma.aIConversation.findFirst({
        where: {
          userId: principal.userId,
          kind: AIConversationKind.BRIEFING,
          startedAt: { gte: startOfToday() },
        },
        select: { id: true },
      });
      if (existing) return existing.id;

      const lang: Locale = locale === 'en' || locale === 'de' ? locale : 'fr';
      const labels = SNAPSHOT_LABELS[lang];
      const dateLabel = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(
        new Date(),
      );

      const lines = [
        labels.headline(items.length),
        '',
        ...items.map((item) => `- ${labels[item.type](item.count)}`),
      ];

      const conversation = await this.prisma.aIConversation.create({
        data: {
          userId: principal.userId,
          organizationId: principal.organizationId,
          role: principal.role,
          locale: lang,
          kind: AIConversationKind.BRIEFING,
          title: labels.title(dateLabel),
          messages: {
            create: {
              sender: AIMessageSender.ASSISTANT,
              content: lines.join('\n'),
            },
          },
        },
        select: { id: true },
      });
      return conversation.id;
    } catch (error) {
      // The briefing card must render even if persistence fails
      this.logger.error(`Failed to persist briefing conversation: ${(error as Error).message}`);
      return null;
    }
  }
}
