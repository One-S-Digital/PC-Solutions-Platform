import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrincipalService } from './principal.service';
import { UserRole } from '@prisma/client';

describe('PrincipalService', () => {
  let service: PrincipalService;
  let prisma: jest.Mocked<PrismaService>;

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
            },
            userNotificationPreferences: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get(PrincipalService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
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
        marketing: false,
        frequency: 'immediate',
        quietHoursEnabled: false,
      };

      prisma.userNotificationPreferences.upsert.mockResolvedValue(mockPrefs as any);

      const result = await service.getOrDefaultNotificationPrefs('user-1');

      expect(result).toEqual(mockPrefs);
      expect(prisma.userNotificationPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: {},
        create: expect.objectContaining({
          userId: 'user-1',
          emailNotifications: true,
          marketing: false,
        }),
      });
    });
  });
});
