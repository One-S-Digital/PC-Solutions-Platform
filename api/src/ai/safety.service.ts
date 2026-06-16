import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SENSITIVE_FIELDS = new Set([
  'age', 'birthDate', 'dateOfBirth', 'nationality', 'race', 'ethnicity',
  'religion', 'health', 'disability', 'familyStatus', 'maritalStatus',
  'pregnancyStatus', 'photoUrl', 'profilePhoto', 'photo', 'avatar',
  'ssn', 'nationalId', 'passportNumber',
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
