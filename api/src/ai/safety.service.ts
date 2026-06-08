import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Contact PII stripped from tool results before they reach the LLM.
// Single source of truth — SENSITIVE_FIELDS spreads these in below.
const CONTACT_PII_KEYS = new Set([
  'email', 'contactEmail', 'parentEmail', 'emailAddress',
  'phoneNumber', 'phone', 'parentPhone', 'mobilePhone', 'telephone',
  'address', 'streetAddress', 'postalAddress', 'fullAddress',
]);

const SENSITIVE_FIELDS = new Set([
  'age', 'birthDate', 'dateOfBirth', 'nationality', 'race', 'ethnicity',
  'religion', 'health', 'disability', 'familyStatus', 'maritalStatus',
  'pregnancyStatus', 'photoUrl', 'profilePhoto', 'photo', 'avatar',
  'ssn', 'nationalId', 'passportNumber',
  ...CONTACT_PII_KEYS,
]);

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  stripSensitiveFields(input: Record<string, unknown>): Record<string, unknown> {
    const stripped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (!SENSITIVE_FIELDS.has(key)) {
        stripped[key] = value;
      }
    }
    return stripped;
  }

  assertNoSensitiveFields(input: Record<string, unknown>, agentName: string): void {
    const found = Object.keys(input).filter((k) => SENSITIVE_FIELDS.has(k));
    if (found.length > 0) {
      throw new ForbiddenException(
        `Agent "${agentName}" input contains sensitive fields: ${found.join(', ')}`,
      );
    }
  }

  /**
   * Recursively remove contact PII (email, phone, address) from any tool-result
   * object before it is serialised into an LLM prompt. Operates on plain
   * objects and arrays; leaves primitives and null untouched.
   */
  scrubForLlm(data: unknown): unknown {
    if (Array.isArray(data)) {
      return data.map((item) => this.scrubForLlm(item));
    }
    if (data !== null && typeof data === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (CONTACT_PII_KEYS.has(key)) continue;
        out[key] = this.scrubForLlm(value);
      }
      return out;
    }
    return data;
  }

  async assertCandidateConsent(userId: string): Promise<void> {
    const consent = await this.prisma.candidateConsent.findFirst({
      where: { userId, isActive: true, revokedAt: null },
    });
    if (!consent) {
      throw new ForbiddenException(
        `No active candidate consent for user ${userId}. Cannot process profile with AI.`,
      );
    }
  }
}
