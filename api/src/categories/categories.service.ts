import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ELEARNING_CATEGORIES, HR_CATEGORIES, POLICY_CATEGORIES } from '../content/dto/content.enums';

type CategoryKind =
  | 'product'
  | 'service'
  | 'content-elearning'
  | 'content-hr'
  | 'content-policy';

const SETTING_KEY_BY_KIND: Record<CategoryKind, string> = {
  product: 'categories.marketplace.products',
  service: 'categories.marketplace.services',
  'content-elearning': 'categories.content.elearning',
  'content-hr': 'categories.content.hr',
  'content-policy': 'categories.content.policy',
};

const DEFAULT_PRODUCT_CATEGORIES = [
  'Educational Toys',
  'Furniture',
  'Books & Learning Materials',
  'Art & Craft Supplies',
  'Outdoor Play Equipment',
  'Safety & Hygiene Products',
  'Kitchen & Dining',
  'Bedding & Textiles',
  'Technology & Electronics',
  'Musical Instruments',
  'Sports Equipment',
  'Sensory & Therapy Tools',
  'Office Supplies',
  'Cleaning Supplies',
  'Food & Snacks',
  'Baby Care Products',
  'First Aid & Medical',
  'Storage & Organization',
  'Other',
] as const;

const DEFAULT_SERVICE_CATEGORIES = [
  'Cleaning & Maintenance',
  'IT & Technical Support',
  'Facilities Maintenance',
  'Consulting',
  'Training & Coaching',
  'Catering',
  'Security Services',
  'Landscaping & Gardening',
  'Transportation',
  'Pest Control',
  'HVAC Services',
  'Plumbing',
  'Electrical Services',
  'Accounting & Finance',
  'Legal Services',
  'Marketing & Design',
  'Photography & Videography',
  'Event Planning',
  'Other',
] as const;

const DEFAULTS: Record<CategoryKind, readonly string[]> = {
  product: DEFAULT_PRODUCT_CATEGORIES,
  service: DEFAULT_SERVICE_CATEGORIES,
  'content-elearning': ELEARNING_CATEGORIES,
  'content-hr': HR_CATEGORIES,
  'content-policy': POLICY_CATEGORIES,
};

function normalizeName(name: string) {
  const normalized = name.trim().replace(/\s+/g, ' ');
  return normalized.toLowerCase() === 'other' ? 'Other' : normalized;
}

function ensureOtherAtEnd(values: string[]) {
  const withoutOther = values.filter((v) => v.toLowerCase() !== 'other');
  return [...withoutOther, 'Other'];
}

function uniqueCaseInsensitive(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private assertKind(kind: string): asserts kind is CategoryKind {
    if (!(kind in SETTING_KEY_BY_KIND)) {
      throw new BadRequestException('Unknown category kind');
    }
  }

  async getCategories(kind: string): Promise<string[]> {
    this.assertKind(kind);
    const key = SETTING_KEY_BY_KIND[kind];
    const setting = await this.prisma.systemSettings.findUnique({ where: { key } });
    const value = setting?.value as unknown;
    if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      return ensureOtherAtEnd(uniqueCaseInsensitive(value.map((v) => normalizeName(v)).filter(Boolean)));
    }
    return ensureOtherAtEnd([...DEFAULTS[kind]]);
  }

  async addCategory(kind: string, rawName: string): Promise<string[]> {
    this.assertKind(kind);
    const name = normalizeName(rawName);
    if (!name || name.length < 2) {
      throw new BadRequestException('Category name is required');
    }
    if (name.toLowerCase() === 'other') {
      throw new BadRequestException('Please specify a category name');
    }

    const key = SETTING_KEY_BY_KIND[kind];
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const existing = await this.prisma.systemSettings.findUnique({ where: { key } });

      const currentRaw = existing?.value as unknown;
      const current = Array.isArray(currentRaw) && currentRaw.every((v) => typeof v === 'string')
        ? (currentRaw as string[])
        : [...DEFAULTS[kind]];

      const merged = ensureOtherAtEnd(
        uniqueCaseInsensitive([name, ...current].map((v) => normalizeName(v)).filter(Boolean)),
      );

      if (!existing) {
        try {
          await this.prisma.systemSettings.create({
            data: {
              key,
              value: merged as any,
              description: `Auto-managed category list for ${kind}`,
              category: 'categories',
              isEncrypted: false,
              isPublic: false,
            },
          });
          return merged;
        } catch {
          // Likely a concurrent create; retry.
          continue;
        }
      }

      const updatedAt = existing.updatedAt;
      const result = await this.prisma.systemSettings.updateMany({
        where: { key, updatedAt },
        data: { value: merged as any, updatedAt: new Date() },
      });

      if (result.count === 1) {
        return merged;
      }
      // Lost race; retry.
    }

    // Final fallback: return whatever is currently stored.
    return this.getCategories(kind);
  }
}

