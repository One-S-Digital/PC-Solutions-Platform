import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SafetyService } from './safety.service';

describe('SafetyService', () => {
  let service: SafetyService;
  let prisma: { candidateConsent: { findFirst: jest.Mock } };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SafetyService,
        {
          provide: PrismaService,
          useValue: { candidateConsent: { findFirst: jest.fn() } },
        },
      ],
    }).compile();

    service = module.get(SafetyService);
    prisma = module.get(PrismaService) as any;
  });

  // ── assertNoSensitiveFields ────────────────────────────────────────────────

  describe('assertNoSensitiveFields', () => {
    it('passes a clean input payload without throwing', () => {
      expect(() =>
        service.assertNoSensitiveFields({ rawText: 'Educateur 80%', canton: 'GE' }, 'agent'),
      ).not.toThrow();
    });

    it('throws ForbiddenException when a sensitive field is present', () => {
      expect(() =>
        service.assertNoSensitiveFields({ rawText: 'text', nationality: 'Swiss' }, 'agent'),
      ).toThrow(ForbiddenException);
    });

    it('throws for each known sensitive field individually', () => {
      const fields = ['age', 'birthDate', 'photoUrl', 'ssn', 'nationalId', 'religion', 'disability'];
      for (const field of fields) {
        expect(() =>
          service.assertNoSensitiveFields({ [field]: 'value' }, 'agent'),
        ).toThrow(ForbiddenException);
      }
    });

    it('includes the offending field names in the error message', () => {
      expect(() =>
        service.assertNoSensitiveFields({ age: 30, ssn: '123' }, 'agent'),
      ).toThrow(/age|ssn/);
    });

    it('allows fields whose names merely contain sensitive words', () => {
      expect(() =>
        service.assertNoSensitiveFields({ ageGroup: 'TODDLER', languages: ['fr'] }, 'agent'),
      ).not.toThrow();
    });
  });

  // ── stripSensitiveFields ───────────────────────────────────────────────────

  describe('stripSensitiveFields', () => {
    it('removes sensitive keys from the payload', () => {
      const result = service.stripSensitiveFields({
        rawText: 'hello',
        photoUrl: 'http://example.com/photo.jpg',
        age: 25,
      });
      expect(result).toEqual({ rawText: 'hello' });
    });

    it('preserves all non-sensitive keys', () => {
      const result = service.stripSensitiveFields({ canton: 'GE', role: 'EDE', hours: 32 });
      expect(result).toEqual({ canton: 'GE', role: 'EDE', hours: 32 });
    });

    it('returns an empty object when all keys are sensitive', () => {
      const result = service.stripSensitiveFields({ age: 25, ssn: '123', photoUrl: 'x' });
      expect(result).toEqual({});
    });
  });

  // ── assertCandidateConsent ─────────────────────────────────────────────────

  describe('assertCandidateConsent', () => {
    it('resolves without throwing when active consent exists', async () => {
      prisma.candidateConsent.findFirst.mockResolvedValue({
        id: 'c1',
        userId: 'u1',
        isActive: true,
        revokedAt: null,
      });
      await expect(service.assertCandidateConsent('u1')).resolves.not.toThrow();
    });

    it('throws ForbiddenException when no active consent is found', async () => {
      prisma.candidateConsent.findFirst.mockResolvedValue(null);
      await expect(service.assertCandidateConsent('u1')).rejects.toThrow(ForbiddenException);
    });

    it('queries with the correct userId, isActive, and revokedAt filters', async () => {
      prisma.candidateConsent.findFirst.mockResolvedValue(null);
      await service.assertCandidateConsent('user-42').catch(() => {});
      expect(prisma.candidateConsent.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-42', isActive: true, revokedAt: null },
      });
    });
  });
});
