import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface ScoreWeights {
  role: number;
  availability: number;
  location: number;
  qualification: number;
  language: number;
  ageGroup: number;
  contract: number;
  responsiveness: number;
}

const WEIGHTS: ScoreWeights = {
  role: 20,
  availability: 20,
  location: 15,
  qualification: 15,
  language: 10,
  ageGroup: 10,
  contract: 5,
  responsiveness: 5,
};

const CONTRACT_MAP: Record<string, string[]> = {
  REPLACEMENT: ['TEMPORARY', 'REPLACEMENT'],
  TEMPORARY: ['TEMPORARY', 'REPLACEMENT'],
  PART_TIME: ['PART_TIME'],
  FULL_TIME: ['FULL_TIME'],
  INTERNSHIP: ['INTERNSHIP'],
};

@Injectable()
export class HybridMatcherService {
  private readonly logger = new Logger(HybridMatcherService.name);

  constructor(private readonly prisma: PrismaService) {}

  async match(staffingRequestId: string): Promise<number> {
    const request = await this.prisma.staffingRequest.findUniqueOrThrow({
      where: { id: staffingRequestId },
      include: { foundation: { select: { latitude: true, longitude: true, regionsServed: true } } },
    });

    // ── Hard filters ─────────────────────────────────────────────────────────
    const whereClause: Prisma.UserWhereInput = {
      role: 'EDUCATOR',
      candidatePoolVisible: true,
      approvalStatus: 'APPROVED',
      isActive: true,
      ...(request.canton
        ? {
            OR: [
              { region: { contains: request.canton, mode: 'insensitive' } },
              { cities: { has: request.canton } },
            ],
          }
        : {}),
      ...(request.languages.length > 0
        ? { skills: { hasSome: request.languages } }
        : {}),
    };

    const candidates = await this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        jobRoles: true,
        jobRole: true,
        availability: true,
        availabilitySettings: true,
        region: true,
        cities: true,
        skills: true,
        certifications: true,
        latitude: true,
        longitude: true,
        maxCommuteKm: true,
        responsivenessScore: true,
        availableForReplacement: true,
      },
      take: 200,
    });

    this.logger.log(`Scoring ${candidates.length} candidates for request ${staffingRequestId}`);

    const orgLat = request.foundation?.latitude ? Number(request.foundation.latitude) : null;
    const orgLon = request.foundation?.longitude ? Number(request.foundation.longitude) : null;

    // Fetch existing match results to upsert
    const existing = await this.prisma.matchResult.findMany({
      where: { staffingRequestId },
      select: { id: true, candidateId: true },
    });
    const existingMap = new Map(existing.map((m) => [m.candidateId, m.id]));

    let upserted = 0;

    for (const c of candidates) {
      const scores = this.scoreCandidate(request, c, orgLat, orgLon);
      const total = Object.entries(scores).reduce((sum, [key, val]) => {
        const weight = WEIGHTS[key as keyof ScoreWeights] ?? 0;
        return sum + (val / 100) * weight;
      }, 0);

      const data = {
        staffingRequestId,
        candidateId: c.id,
        totalScore: new Prisma.Decimal(total.toFixed(2)),
        roleScore: new Prisma.Decimal(scores.role.toFixed(2)),
        availabilityScore: new Prisma.Decimal(scores.availability.toFixed(2)),
        locationScore: new Prisma.Decimal(scores.location.toFixed(2)),
        qualificationScore: new Prisma.Decimal(scores.qualification.toFixed(2)),
        languageScore: new Prisma.Decimal(scores.language.toFixed(2)),
        ageGroupScore: new Prisma.Decimal(scores.ageGroup.toFixed(2)),
        contractScore: new Prisma.Decimal(scores.contract.toFixed(2)),
        responsivenessScr: new Prisma.Decimal(scores.responsiveness.toFixed(2)),
        ...(scores.distanceKm !== null
          ? { distanceKm: new Prisma.Decimal(scores.distanceKm.toFixed(2)) }
          : {}),
      };

      const existingId = existingMap.get(c.id);
      if (existingId) {
        await this.prisma.matchResult.update({ where: { id: existingId }, data });
      } else {
        await this.prisma.matchResult.create({ data });
      }
      upserted++;
    }

    await this.prisma.staffingRequest.update({
      where: { id: staffingRequestId },
      data: { status: 'SHORTLISTED', updatedAt: new Date() },
    });

    return upserted;
  }

  private scoreCandidate(
    request: {
      roleRequired: string | null;
      contractType: string | null;
      languages: string[];
      qualifications: string[];
      ageGroups: string[];
      canton: string | null;
    },
    candidate: {
      jobRoles: string[];
      jobRole: string | null;
      availability: string | null;
      availabilitySettings: unknown;
      skills: string[];
      certifications: string[];
      latitude: unknown;
      longitude: unknown;
      maxCommuteKm: number | null;
      responsivenessScore: unknown;
      availableForReplacement: boolean;
    },
    orgLat: number | null,
    orgLon: number | null,
  ): ScoreWeights & { distanceKm: number | null } {
    const roles = [
      ...(candidate.jobRoles ?? []),
      ...(candidate.jobRole ? [candidate.jobRole] : []),
    ].map((r) => r.toLowerCase());

    const role = request.roleRequired
      ? roles.some((r) => r.includes(request.roleRequired!.toLowerCase())) ? 100 : 0
      : 50;

    // Availability — simplified: if availabilitySettings exists treat as structured (80+); legacy text = 50
    const availability = candidate.availabilitySettings ? 80 : candidate.availability ? 50 : 0;

    // Location / distance
    let location = 50;
    let distanceKm: number | null = null;
    const cLat = candidate.latitude ? Number(candidate.latitude) : null;
    const cLon = candidate.longitude ? Number(candidate.longitude) : null;
    if (orgLat !== null && orgLon !== null && cLat !== null && cLon !== null) {
      distanceKm = this.haversineKm(orgLat, orgLon, cLat, cLon);
      const maxKm = candidate.maxCommuteKm ?? 30;
      location = distanceKm <= maxKm ? 100 : distanceKm <= maxKm * 2 ? 50 : 0;
    }

    // Qualifications
    const certs = [...(candidate.certifications ?? []), ...(candidate.skills ?? [])].map((s) =>
      s.toLowerCase(),
    );
    const qualification =
      request.qualifications.length === 0
        ? 50
        : (() => {
            const matched = request.qualifications.filter((q) =>
              certs.some((c) => c.includes(q.toLowerCase())),
            ).length;
            return Math.round((matched / request.qualifications.length) * 100);
          })();

    // Languages
    const language =
      request.languages.length === 0
        ? 50
        : (() => {
            const matched = request.languages.filter((l) =>
              candidate.skills.some((s) => s.toLowerCase() === l.toLowerCase()),
            ).length;
            return Math.round((matched / request.languages.length) * 100);
          })();

    // Age groups — stored in skills/certifications as tags in some setups; default 50 if no data
    const ageGroup = request.ageGroups.length === 0 ? 50 : 50;

    // Contract
    const allowed = request.contractType ? (CONTRACT_MAP[request.contractType] ?? []) : [];
    const contract =
      allowed.length === 0
        ? 50
        : request.contractType === 'REPLACEMENT' && candidate.availableForReplacement
        ? 100
        : 30;

    const responsiveness = candidate.responsivenessScore
      ? Math.min(100, Number(candidate.responsivenessScore) * 100)
      : 50;

    return { role, availability, location, qualification, language, ageGroup, contract, responsiveness, distanceKm };
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
