import { Test } from '@nestjs/testing';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HybridMatcherService } from '../staffing/hybrid-matcher.service';

const BASE_REQUEST = {
  id: 'req-1',
  roleRequired: 'Educator',
  contractType: 'REPLACEMENT',
  languages: ['fr'],
  qualifications: ['EDE'],
  ageGroups: [],
  canton: 'GE',
  foundation: { latitude: new Prisma.Decimal('46.2044'), longitude: new Prisma.Decimal('6.1432') },
};

const BASE_CANDIDATE = {
  id: 'cand-1',
  jobRoles: ['educator'],
  jobRole: null,
  availability: 'weekdays',
  availabilitySettings: { mon: true },
  region: 'Genève',
  cities: ['Genève'],
  skills: ['fr', 'EDE'],
  certifications: [],
  latitude: new Prisma.Decimal('46.2'),
  longitude: new Prisma.Decimal('6.14'),
  maxCommuteKm: 30,
  responsivenessScore: new Prisma.Decimal('0.85'),
  availableForReplacement: true,
};

describe('HybridMatcherService', () => {
  let service: HybridMatcherService;
  let prisma: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        HybridMatcherService,
        {
          provide: PrismaService,
          useValue: {
            staffingRequest: {
              findUniqueOrThrow: jest.fn().mockResolvedValue(BASE_REQUEST),
              update: jest.fn().mockResolvedValue({}),
            },
            user: {
              findMany: jest.fn().mockResolvedValue([BASE_CANDIDATE]),
            },
            matchResult: {
              findMany: jest.fn().mockResolvedValue([]),
              create: jest.fn().mockResolvedValue({ id: 'mr-1' }),
              update: jest.fn().mockResolvedValue({}),
            },
          },
        },
      ],
    }).compile();

    service = module.get(HybridMatcherService);
    prisma = module.get(PrismaService);
  });

  // ── match() integration ───────────────────────────────────────────────────

  describe('match()', () => {
    it('returns the count of upserted match results', async () => {
      const count = await service.match('req-1');
      expect(count).toBe(1);
    });

    it('updates the staffing request status to SHORTLISTED', async () => {
      await service.match('req-1');
      expect(prisma.staffingRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'SHORTLISTED' }) }),
      );
    });

    it('creates a MatchResult when none existed', async () => {
      await service.match('req-1');
      expect(prisma.matchResult.create).toHaveBeenCalled();
    });

    it('updates an existing MatchResult instead of creating a new one', async () => {
      prisma.matchResult.findMany.mockResolvedValue([{ id: 'existing-mr', candidateId: 'cand-1' }]);
      await service.match('req-1');
      expect(prisma.matchResult.update).toHaveBeenCalled();
      expect(prisma.matchResult.create).not.toHaveBeenCalled();
    });

    it('queries only EDUCATOR role candidates that are approved and active', async () => {
      await service.match('req-1');
      const whereArg = prisma.user.findMany.mock.calls[0][0].where;
      expect(whereArg.role).toBe(UserRole.EDUCATOR);
      expect(whereArg.approvalStatus).toBe('APPROVED');
      expect(whereArg.isActive).toBe(true);
      expect(whereArg.candidatePoolVisible).toBe(true);
    });
  });

  // ── scoreCandidate (via private method access) ────────────────────────────

  describe('scoreCandidate()', () => {
    const score = (reqOverrides: any = {}, candOverrides: any = {}) => {
      const req = { ...BASE_REQUEST, ...reqOverrides };
      const cand = { ...BASE_CANDIDATE, ...candOverrides };
      return (service as any).scoreCandidate(
        req,
        cand,
        req.foundation ? Number(req.foundation.latitude) : null,
        req.foundation ? Number(req.foundation.longitude) : null,
      );
    };

    describe('role score', () => {
      it('scores 100 when candidate jobRole matches required role', () => {
        expect(score({}, { jobRoles: ['educator'] }).role).toBe(100);
      });

      it('scores 0 when role does not match', () => {
        expect(score({ roleRequired: 'Cook' }, { jobRoles: ['educator'], jobRole: null }).role).toBe(0);
      });

      it('scores 50 when no role is required', () => {
        expect(score({ roleRequired: null }).role).toBe(50);
      });

      it('matches case-insensitively', () => {
        expect(score({ roleRequired: 'EDUCATOR' }, { jobRoles: ['Educator'] }).role).toBe(100);
      });
    });

    describe('language score', () => {
      it('scores 100 when all required languages are present in skills', () => {
        expect(score({ languages: ['fr'] }, { skills: ['fr', 'EDE'] }).language).toBe(100);
      });

      it('scores 50 when no languages are required', () => {
        expect(score({ languages: [] }).language).toBe(50);
      });

      it('scores 0 when no required language is present in skills', () => {
        expect(score({ languages: ['de'] }, { skills: ['fr'] }).language).toBe(0);
      });

      it('scores proportionally for partial matches', () => {
        expect(score({ languages: ['fr', 'de'] }, { skills: ['fr'] }).language).toBe(50);
      });
    });

    describe('qualification score', () => {
      it('scores 100 when all qualifications are matched', () => {
        expect(score({ qualifications: ['EDE'] }, { skills: ['EDE'], certifications: [] }).qualification).toBe(100);
      });

      it('scores 50 when no qualifications are required', () => {
        expect(score({ qualifications: [] }).qualification).toBe(50);
      });

      it('scores 0 when no required qualification is matched', () => {
        expect(score({ qualifications: ['ASSC'] }, { skills: ['fr'], certifications: [] }).qualification).toBe(0);
      });
    });

    describe('contract score', () => {
      it('scores 100 for REPLACEMENT contract when candidate is availableForReplacement', () => {
        expect(score({ contractType: 'REPLACEMENT' }, { availableForReplacement: true }).contract).toBe(100);
      });

      it('scores 30 for REPLACEMENT contract when candidate is not available for replacement', () => {
        expect(score({ contractType: 'REPLACEMENT' }, { availableForReplacement: false }).contract).toBe(30);
      });

      it('scores 50 when no contract type is required', () => {
        expect(score({ contractType: null }).contract).toBe(50);
      });
    });

    describe('availability score', () => {
      it('scores 80 when availabilitySettings is set', () => {
        expect(score({}, { availabilitySettings: { mon: true } }).availability).toBe(80);
      });

      it('scores 50 when only legacy text availability is set', () => {
        expect(score({}, { availabilitySettings: null, availability: 'weekdays' }).availability).toBe(50);
      });

      it('scores 0 when availability is not set at all', () => {
        expect(score({}, { availabilitySettings: null, availability: null }).availability).toBe(0);
      });
    });

    describe('location / distance score', () => {
      it('scores 100 when candidate is within maxCommuteKm', () => {
        // Same coordinates → 0 km distance
        const { location } = score(
          { foundation: { latitude: new Prisma.Decimal('46.2'), longitude: new Prisma.Decimal('6.14') } },
          { latitude: new Prisma.Decimal('46.2'), longitude: new Prisma.Decimal('6.14'), maxCommuteKm: 30 },
        );
        expect(location).toBe(100);
      });

      it('scores 0 when candidate is beyond 2x maxCommuteKm', () => {
        // ~300 km away (Zurich to Geneva approximately)
        const { location } = score(
          { foundation: { latitude: new Prisma.Decimal('47.3769'), longitude: new Prisma.Decimal('8.5417') } },
          { latitude: new Prisma.Decimal('46.2044'), longitude: new Prisma.Decimal('6.1432'), maxCommuteKm: 30 },
        );
        expect(location).toBe(0);
      });

      it('scores 50 when distance is between 1x and 2x maxCommuteKm', () => {
        // ~40 km from foundation, maxCommuteKm = 30 → in 30..60 range → score 50
        const { location } = score(
          { foundation: { latitude: new Prisma.Decimal('46.52'), longitude: new Prisma.Decimal('6.63') } },
          { latitude: new Prisma.Decimal('46.2044'), longitude: new Prisma.Decimal('6.1432'), maxCommuteKm: 30 },
        );
        expect(location).toBe(50);
      });

      it('scores 50 when coordinates are missing', () => {
        const { location } = score(
          { foundation: null },
          { latitude: null, longitude: null },
        );
        expect(location).toBe(50);
      });
    });

    describe('responsiveness score', () => {
      it('maps responsivenessScore * 100 capped at 100', () => {
        expect(score({}, { responsivenessScore: new Prisma.Decimal('0.85') }).responsiveness).toBe(85);
      });

      it('caps at 100 when score exceeds 1.0', () => {
        expect(score({}, { responsivenessScore: new Prisma.Decimal('1.5') }).responsiveness).toBe(100);
      });

      it('defaults to 50 when responsivenessScore is null', () => {
        expect(score({}, { responsivenessScore: null }).responsiveness).toBe(50);
      });
    });

    describe('total score weight integrity', () => {
      it('produces a total score between 0 and 100 for any candidate', () => {
        const WEIGHTS: Record<string, number> = {
          role: 20, availability: 20, location: 15, qualification: 15,
          language: 10, ageGroup: 10, contract: 5, responsiveness: 5,
        };
        const scores = score({}, {});
        const total = Object.entries(scores)
          .filter(([k]) => k !== 'distanceKm')
          .reduce((sum, [key, val]) => sum + ((val as number) / 100) * (WEIGHTS[key] ?? 0), 0);
        expect(total).toBeGreaterThanOrEqual(0);
        expect(total).toBeLessThanOrEqual(100);
      });
    });
  });

  // ── haversineKm ───────────────────────────────────────────────────────────

  describe('haversineKm()', () => {
    it('returns ~0 for identical coordinates', () => {
      const d = (service as any).haversineKm(46.2, 6.14, 46.2, 6.14);
      expect(d).toBeCloseTo(0, 1);
    });

    it('returns ~224 km for Geneva → Zurich', () => {
      // Geneva: 46.2044, 6.1432 — Zurich: 47.3769, 8.5417
      const d = (service as any).haversineKm(46.2044, 6.1432, 47.3769, 8.5417);
      expect(d).toBeGreaterThan(200);
      expect(d).toBeLessThan(260);
    });
  });
});
