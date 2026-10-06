import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrincipalService } from './principal.service';
import { EducatorApprovalStatus, UserRole } from '@prisma/client';

describe('PrincipalService', () => {
  let service: PrincipalService;
  let prisma: {
    appUser: { findUnique: jest.Mock; upsert: jest.Mock };
    user: { findUnique: jest.Mock; upsert: jest.Mock; update: jest.Mock };
    userNotificationPreferences: { upsert: jest.Mock; findUnique: jest.Mock };
    mailingSuppression: { deleteMany: jest.Mock };
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PrincipalService,
        {
          provide: PrismaService,
          useValue: {
            appUser: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
              update: jest.fn(),
            },
            userNotificationPreferences: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
            },
            mailingSuppression: {
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          },
        },
      ],
    }).compile();

    service = module.get(PrincipalService);
    prisma = module.get(PrismaService) as unknown as typeof prisma;
  });

  describe('getOrBootstrapAccountAndProfile', () => {
    it('throws NotFoundException when AppUser missing', async () => {
      prisma.appUser.findUnique.mockResolvedValue(null);

      await expect(service.getOrBootstrapAccountAndProfile('clerk_123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('creates user via upsert when missing', async () => {
      const mockAppUser = {
        id: 'app-1',
        clerkId: 'clerk_123',
        email: 'test@example.com',
        role: UserRole.FOUNDATION,
      };

      const mockUser = {
        id: 'user-1',
        clerkId: 'clerk_123',
        email: 'test@example.com',
        firstName: null,
        lastName: null,
        role: UserRole.FOUNDATION,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.appUser.findUnique.mockResolvedValue(mockAppUser as any);
      prisma.user.upsert.mockResolvedValue(mockUser as any);

      const result = await service.getOrBootstrapAccountAndProfile('clerk_123');

      expect(result.appUser).toEqual({
        id: mockAppUser.id,
        clerkId: mockAppUser.clerkId,
        email: mockAppUser.email,
        role: mockAppUser.role,
      });
      expect(result.user).toEqual(mockUser);
      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { clerkId: 'clerk_123' },
        update: {
          email: mockAppUser.email,
          role: mockAppUser.role,
        },
        create: {
          clerkId: 'clerk_123',
          email: mockAppUser.email,
          role: mockAppUser.role,
          isActive: true,
        },
      });
    });

    it('performs idempotent upserts under concurrency', async () => {
      const mockAppUser = {
        id: 'app-1',
        clerkId: 'clerk_123',
        email: 'test@example.com',
        role: UserRole.FOUNDATION,
      };

      const mockUser = {
        id: 'user-1',
        clerkId: 'clerk_123',
        email: 'test@example.com',
        firstName: null,
        lastName: null,
        role: UserRole.FOUNDATION,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.appUser.findUnique.mockResolvedValue(mockAppUser as any);
      prisma.user.upsert.mockResolvedValue(mockUser as any);

      const results = await Promise.all(
        Array.from({ length: 5 }).map(() => service.getOrBootstrapAccountAndProfile('clerk_123')),
      );

      expect(results).toHaveLength(5);
      expect(prisma.user.upsert).toHaveBeenCalledTimes(5);
    });

    it('passes null email to create when appUser.email is null and no existing User (not empty string)', async () => {
      const mockAppUser = {
        id: 'app-1',
        clerkId: 'clerk_null_email',
        email: null, // AppUser has no email
        role: UserRole.SUPER_ADMIN,
      };

      const mockUser = {
        id: 'user-1',
        clerkId: 'clerk_null_email',
        email: null,
        firstName: null,
        lastName: null,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.appUser.findUnique.mockResolvedValue(mockAppUser as any);
      prisma.user.findUnique.mockResolvedValue(null); // No existing User
      prisma.user.upsert.mockResolvedValue(mockUser as any);

      await service.getOrBootstrapAccountAndProfile('clerk_null_email');

      // Verify that email is passed as null, not as empty string ''
      // This is critical because the DB has a constraint: users_email_not_empty
      // which allows NULL but rejects empty strings
      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { clerkId: 'clerk_null_email' },
        update: {
          email: undefined, // null ?? undefined = undefined
          role: UserRole.SUPER_ADMIN,
        },
        create: {
          clerkId: 'clerk_null_email',
          email: null, // Must be null, NOT ''
          role: UserRole.SUPER_ADMIN,
          isActive: true,
        },
      });
    });

    it('uses existing User email when appUser.email is null', async () => {
      const mockAppUser = {
        id: 'app-1',
        clerkId: 'clerk_existing_email',
        email: null, // AppUser has no email
        role: UserRole.SUPER_ADMIN,
      };

      const existingUserEmail = { email: 'existing@example.com' };

      const mockUser = {
        id: 'user-1',
        clerkId: 'clerk_existing_email',
        email: 'existing@example.com',
        firstName: null,
        lastName: null,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.appUser.findUnique.mockResolvedValue(mockAppUser as any);
      prisma.user.findUnique.mockResolvedValue(existingUserEmail as any); // Existing User has email
      prisma.user.upsert.mockResolvedValue(mockUser as any);

      await service.getOrBootstrapAccountAndProfile('clerk_existing_email');

      // Verify that the existing User email is used for create
      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { clerkId: 'clerk_existing_email' },
        update: {
          email: undefined,
          role: UserRole.SUPER_ADMIN,
        },
        create: {
          clerkId: 'clerk_existing_email',
          email: 'existing@example.com', // Uses existing User's email
          role: UserRole.SUPER_ADMIN,
          isActive: true,
        },
      });
    });
  });

  describe('educator approval status on bootstrap', () => {
    const educatorAppUser = {
      id: 'app-1',
      clerkId: 'clerk_edu',
      email: 'edu@example.com',
      role: UserRole.EDUCATOR,
    };

    it('bootstraps a new educator as INCOMPLETE, not PENDING_REVIEW', async () => {
      // The profile row is created before the educator has submitted anything,
      // so it must not land in the admin review queue.
      prisma.appUser.findUnique.mockResolvedValue(educatorAppUser as any);
      prisma.user.upsert.mockResolvedValue({
        id: 'user-1',
        approvalStatus: EducatorApprovalStatus.INCOMPLETE,
      } as any);

      await service.getOrBootstrapAccountAndProfile('clerk_edu');

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            approvalStatus: EducatorApprovalStatus.INCOMPLETE,
          }),
        }),
      );
    });

    it('backfills a legacy educator with no application as INCOMPLETE', async () => {
      prisma.appUser.findUnique.mockResolvedValue(educatorAppUser as any);
      // Predates the approval workflow: approvalStatus is still null.
      prisma.user.upsert.mockResolvedValue({
        id: 'user-1',
        approvalStatus: null,
        shortBio: null,
        cvUrl: null,
      } as any);
      prisma.user.update.mockResolvedValue({ id: 'user-1' } as any);

      await service.getOrBootstrapAccountAndProfile('clerk_edu');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { approvalStatus: EducatorApprovalStatus.INCOMPLETE },
        }),
      );
    });

    it('backfills a legacy educator who did submit as PENDING_REVIEW', async () => {
      prisma.appUser.findUnique.mockResolvedValue(educatorAppUser as any);
      prisma.user.upsert.mockResolvedValue({
        id: 'user-1',
        approvalStatus: null,
        shortBio: 'I have taught for ten years',
        cvUrl: null,
      } as any);
      prisma.user.update.mockResolvedValue({ id: 'user-1' } as any);

      await service.getOrBootstrapAccountAndProfile('clerk_edu');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { approvalStatus: EducatorApprovalStatus.PENDING_REVIEW },
        }),
      );
    });

    it('leaves an already-decided educator alone', async () => {
      prisma.appUser.findUnique.mockResolvedValue(educatorAppUser as any);
      prisma.user.upsert.mockResolvedValue({
        id: 'user-1',
        approvalStatus: EducatorApprovalStatus.APPROVED,
      } as any);

      await service.getOrBootstrapAccountAndProfile('clerk_edu');

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('does not set an approval status for non-educator roles', async () => {
      prisma.appUser.findUnique.mockResolvedValue({
        ...educatorAppUser,
        role: UserRole.FOUNDATION,
      } as any);
      prisma.user.upsert.mockResolvedValue({ id: 'user-1' } as any);

      await service.getOrBootstrapAccountAndProfile('clerk_foundation');

      const createArg = prisma.user.upsert.mock.calls[0][0].create;
      expect(createArg).not.toHaveProperty('approvalStatus');
    });
  });

  describe('getOrDefaultNotificationPrefs', () => {
    it('creates notification preferences with sensible defaults', async () => {
      const mockPrefs = {
        id: 'prefs-1',
        userId: 'user-1',
        emailNotifications: true,
        authentication: true,
        userManagement: true,
        jobRecruitment: true,
        messaging: true,
        marketplace: false,
        leadManagement: true,
        subscription: true,
        contentModeration: false,
        systemAdmin: false,
        // Marketing defaults to opted-in (see PrincipalService: "Default to
        // opted-in; users can opt out explicitly"), with mailingListOptOut as
        // the explicit opt-out. This assertion previously expected false and
        // had drifted from the implementation.
        marketing: true,
        frequency: 'immediate',
        quietHoursEnabled: false,
      };

      prisma.userNotificationPreferences.upsert.mockResolvedValue(mockPrefs as any);

      const result = await service.getOrDefaultNotificationPrefs('user-1');

      expect(result).toEqual(mockPrefs);
      expect(prisma.userNotificationPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: { userId: 'user-1' },
        create: expect.objectContaining({
          userId: 'user-1',
          emailNotifications: true,
          marketing: true,
        }),
      });
    });
  });
  describe('updateNotificationSettings — mailing list opt-out', () => {
    const saved = {
      leadManagement: true,
      frequency: 'immediate',
      marketing: true,
      mailingListOptOut: false,
    };

    beforeEach(() => {
      prisma.userNotificationPreferences.upsert.mockResolvedValue(saved as any);
      prisma.user.findUnique.mockResolvedValue({ email: 'Ada@Example.com' });
    });

    it('clears the address-level suppression when the user opts back in', async () => {
      // A campaign unsubscribe can leave a row in mailing_suppressions that the
      // sender honours for everyone. Re-subscribing in settings is explicit
      // consent and has to undo it, or the user looks subscribed and is never mailed.
      await service.updateNotificationSettings('user-1', { mailingListOptOut: false });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' }, select: { email: true } });
      expect(prisma.mailingSuppression.deleteMany).toHaveBeenCalledWith({ where: { email: 'ada@example.com' } });
    });

    it.each([
      ['opting out', { mailingListOptOut: true }],
      ['switching promo emails off, which opts out too', { promoRedemptionAlertsToggle: false }],
      ['changing an unrelated setting', { digestRadio: 'Weekly' as const }],
      ['switching promo emails back on, which is not a mailing-list opt-in', { promoRedemptionAlertsToggle: true }],
    ])('leaves suppressions alone when %s', async (_label, data) => {
      await service.updateNotificationSettings('user-1', data);
      expect(prisma.mailingSuppression.deleteMany).not.toHaveBeenCalled();
    });

    it('still saves the preference for a user with no email on file', async () => {
      prisma.user.findUnique.mockResolvedValue({ email: null });

      await service.updateNotificationSettings('user-1', { mailingListOptOut: false });

      expect(prisma.mailingSuppression.deleteMany).not.toHaveBeenCalled();
      expect(prisma.userNotificationPreferences.upsert).toHaveBeenCalledTimes(1);
    });

    it('does not report success when the suppression cannot be cleared', async () => {
      prisma.mailingSuppression.deleteMany.mockRejectedValue(new Error('db down'));

      await expect(service.updateNotificationSettings('user-1', { mailingListOptOut: false })).rejects.toThrow('db down');
      // Nothing was changed: the user is still opted out, which is the safe side.
      expect(prisma.userNotificationPreferences.upsert).not.toHaveBeenCalled();
    });
  });
});
