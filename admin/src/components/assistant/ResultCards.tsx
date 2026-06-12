import React from 'react';
import {
  UserIcon,
  ClipboardDocumentListIcon,
  ShoppingBagIcon,
  WrenchScrewdriverIcon,
  BuildingOffice2Icon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { ToolResultEvent } from '../../services/assistantService';

// ─── Shared types ──────────────────────────────────────────────────────────

interface ToolEnvelope {
  data?: Record<string, unknown>;
  total?: number;
  suggestions?: { label: string; actionType: string; payload?: Record<string, unknown> }[];
}

interface CandidateItem {
  id: string;
  name: string;
  role?: string | null;
  region?: string | null;
  skills?: string[];
  score?: number;
}

interface JobItem {
  id: string;
  title: string;
  foundationName?: string | null;
  location?: string | null;
  contractType?: string | null;
}

interface ProductItem {
  id: string;
  title: string;
  price?: number | null;
  currency?: string;
  supplierName?: string | null;
}

interface ServiceItem {
  id: string;
  title: string;
  price?: number | null;
  category?: string | null;
  providerName?: string | null;
}

interface FoundationItem {
  id: string;
  name: string;
  city?: string | null;
  canton?: string | null;
}

const CARD = 'my-2 rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm';

// ─── Individual cards ────────────────────────────────────────────────────────

const CandidateResultCard: React.FC<{ c: CandidateItem }> = ({ c }) => (
  <div className={CARD}>
    <div className="flex items-start gap-2">
      <UserIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-swiss-teal" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-swiss-charcoal">{c.name}</span>
          {typeof c.score === 'number' && (
            <span className="ml-auto flex-shrink-0 rounded-full bg-swiss-teal/10 px-1.5 py-0.5 text-xs font-medium text-swiss-teal">
              {c.score}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-gray-500">
          {[c.role, c.region].filter(Boolean).join(' · ')}
        </p>
        {c.skills && c.skills.length > 0 && (
          <p className="mt-0.5 truncate text-xs text-gray-400">{c.skills.join(', ')}</p>
        )}
      </div>
    </div>
  </div>
);

const JobListingCard: React.FC<{ j: JobItem }> = ({ j }) => (
  <div className={CARD}>
    <div className="flex items-start gap-2">
      <ClipboardDocumentListIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-swiss-teal" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <span className="block truncate font-medium text-swiss-charcoal">{j.title}</span>
        <p className="truncate text-xs text-gray-500">
          {[j.foundationName, j.location, j.contractType].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  </div>
);

const ProductCard: React.FC<{ p: ProductItem }> = ({ p }) => (
  <div className={CARD}>
    <div className="flex items-start gap-2">
      <ShoppingBagIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-swiss-teal" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-swiss-charcoal">{p.title}</span>
          {typeof p.price === 'number' && (
            <span className="ml-auto flex-shrink-0 text-xs font-medium text-swiss-charcoal">
              {p.currency ?? 'CHF'} {p.price.toFixed(2)}
            </span>
          )}
        </div>
        {p.supplierName && <p className="truncate text-xs text-gray-500">{p.supplierName}</p>}
      </div>
    </div>
  </div>
);

const ServiceCard: React.FC<{ s: ServiceItem }> = ({ s }) => (
  <div className={CARD}>
    <div className="flex items-start gap-2">
      <WrenchScrewdriverIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-swiss-teal" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-swiss-charcoal">{s.title}</span>
          {typeof s.price === 'number' && (
            <span className="ml-auto flex-shrink-0 text-xs font-medium text-swiss-charcoal">
              CHF {s.price.toFixed(2)}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-gray-500">
          {[s.category, s.providerName].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  </div>
);

const FoundationCard: React.FC<{ f: FoundationItem }> = ({ f }) => (
  <div className={CARD}>
    <div className="flex items-start gap-2">
      <BuildingOffice2Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-swiss-teal" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <span className="block truncate font-medium text-swiss-charcoal">{f.name}</span>
        <p className="truncate text-xs text-gray-500">
          {[f.city, f.canton].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  </div>
);

const NoResultsCard: React.FC<{ message: string; suggestions?: ToolEnvelope['suggestions'] }> = ({
  message,
  suggestions,
}) => {
  const { t } = useTranslation('assistant');
  return (
    <div className="my-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
      <div className="mb-1 flex items-center gap-2">
        <MagnifyingGlassIcon className="h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden="true" />
        <span className="font-medium text-amber-800">{message}</span>
      </div>
      {suggestions && suggestions.length > 0 && (
        <>
          <p className="mt-1 text-xs font-medium text-amber-700">
            {t('results.suggestionsHeading', 'Suggestions:')}
          </p>
          <ul className="mt-0.5 space-y-0.5">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-1 text-xs text-amber-700">
                <span aria-hidden="true">→</span>
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

// ─── Dispatcher ──────────────────────────────────────────────────────────────

// KEEP IN SYNC with RESULT_CARD_TOOLS (and TOOL_STATUS_LABELS) in
// api/src/assistant/orchestrator.service.ts — the backend decides which tools
// emit card events; this set decides which ones render cards.
const RESULT_CARD_TOOLS = new Set([
  'search_candidates',
  'search_candidates_ai',
  'search_products',
  'search_services',
  'search_jobs',
  'search_foundations',
  'find_foundation',
  'view_match_results',
  'get_pending_educator_approvals',
]);

export function isResultCardTool(toolName: string): boolean {
  return RESULT_CARD_TOOLS.has(toolName);
}

interface SearchResultCardsProps {
  toolName: string;
  result?: ToolResultEvent;
  /** Live status label streamed while the tool runs (e.g. "Searching candidates…"). */
  statusLabel?: string;
}

/**
 * Renders the appropriate result cards (or a NoResultsCard) for a search tool's
 * structured result. Falls back to nothing while the result is still pending.
 */
export const SearchResultCards: React.FC<SearchResultCardsProps> = ({ toolName, result, statusLabel }) => {
  const { t } = useTranslation('assistant');

  if (!result) {
    return (
      <p className="my-2 text-xs text-gray-400">
        {statusLabel ?? t('results.searching', 'Searching…')}
      </p>
    );
  }
  if (result.error) {
    return null; // The assistant's text answer covers the error path.
  }

  const envelope = (result.result ?? {}) as ToolEnvelope;
  const total = envelope.total ?? 0;
  const data = envelope.data ?? {};

  if (total === 0) {
    return (
      <NoResultsCard
        message={t('results.none', 'No results found')}
        suggestions={envelope.suggestions}
      />
    );
  }

  switch (toolName) {
    case 'search_candidates':
    case 'search_candidates_ai':
    case 'view_match_results':
    case 'get_pending_educator_approvals': {
      const items = (data.candidates as CandidateItem[]) ?? [];
      return <>{items.filter(Boolean).map((c) => <CandidateResultCard key={c.id} c={c} />)}</>;
    }
    case 'search_jobs': {
      const items = (data.jobs as JobItem[]) ?? [];
      return <>{items.map((j) => <JobListingCard key={j.id} j={j} />)}</>;
    }
    case 'search_products': {
      const items = (data.products as ProductItem[]) ?? [];
      return <>{items.map((p) => <ProductCard key={p.id} p={p} />)}</>;
    }
    case 'search_services': {
      const items = (data.services as ServiceItem[]) ?? [];
      return <>{items.map((s) => <ServiceCard key={s.id} s={s} />)}</>;
    }
    case 'search_foundations':
    case 'find_foundation': {
      const items = (data.foundations as FoundationItem[]) ?? [];
      return <>{items.map((f) => <FoundationCard key={f.id} f={f} />)}</>;
    }
    default:
      return null;
  }
};
