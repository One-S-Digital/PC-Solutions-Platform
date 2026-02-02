import { UsersService } from './users.service';
import { UserRole } from '@prisma/client';

describe('UsersService.remove (soft delete)', () => {
  it('deactivates profile, removes memberships/contact info, and scrubs AppUser', async () => {
    const appUser = {
      id: 'app-user-id',
      clerkId: 'clerk_123',
      email: 'user@example.com',
      role: UserRole.FOUNDATION,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    };

    const profile = {
      id: 'profile-id',
      clerkId: appUser.clerkId,
      email: 'user@example.com',
      firstName: 'A',
      lastName: 'B',
      phoneNumber: '123',
      workExperience: null,
      education: null,
      certifications: [],
      skills: [],
      availability: null,
      cvUrl: null,
      stripeCustomerId: null,
      lastActiveAt: null,
      isActive: true,
    };

    const tx = {
      user: {
        findUnique: jest.fn().mockResolvedValue(profile),
        update: jest.fn().mockResolvedValue({
          ...profile,
          isActive: false,
          deactivatedReasonCode: 'ADMIN_DELETED',
        }),
      },
      userOrganization: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      userContactInfo: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      appUser: {
        update: jest.fn().mockResolvedValue({ ...appUser, email: null, role: UserRole.PARENT }),
      },
    };

    const prisma = {
      appUser: {
        findUnique: jest.fn().mockResolvedValue(appUser),
      },
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    };

    const service = new UsersService(
      prisma as any,
      {} as any, // principal
      {} as any, // roleSyncService
      { get: jest.fn().mockReturnValue(undefined) } as any, // configService
    );

    const result = await service.remove(appUser.id);

    expect(prisma.appUser.findUnique).toHaveBeenCalledWith({ where: { id: appUser.id } });
    expect(tx.user.findUnique).toHaveBeenCalledWith({ where: { clerkId: appUser.clerkId } });
    expect(tx.userOrganization.deleteMany).toHaveBeenCalledWith({ where: { userId: profile.id } });
    expect(tx.userContactInfo.deleteMany).toHaveBeenCalledWith({ where: { userId: profile.id } });
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: profile.id },
        data: expect.objectContaining({
          isActive: false,
          deactivatedReasonCode: 'ADMIN_DELETED',
          role: UserRole.PARENT,
          email: null,
          firstName: null,
          lastName: null,
          phoneNumber: null,
          stripeCustomerId: null,
        }),
      }),
    );
    expect(tx.appUser.update).toHaveBeenCalledWith({
      where: { id: appUser.id },
      data: { email: null, role: UserRole.PARENT },
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: appUser.id,
        clerkId: appUser.clerkId,
        email: null,
        role: UserRole.PARENT,
        isActive: false,
      }),
    );
  });
});

describe('UsersService.hardRemove (hard delete)', () => {
  it('refuses hard-delete when dependent records exist', async () => {
    const appUser = {
      id: 'app-user-id',
      clerkId: 'clerk_123',
      email: 'user@example.com',
      role: UserRole.FOUNDATION,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const profile = { id: 'profile-id', clerkId: appUser.clerkId } as any;

    const prisma = {
      appUser: { findUnique: jest.fn().mockResolvedValue(appUser) },
      user: { findUnique: jest.fn().mockResolvedValue(profile) },
      asset: { count: jest.fn().mockResolvedValue(0) },
      userOrganization: { count: jest.fn().mockResolvedValue(0) },
      userContactInfo: { count: jest.fn().mockResolvedValue(0) },
      message: { count: jest.fn().mockResolvedValue(1) }, // blocking
      conversationParticipant: { count: jest.fn().mockResolvedValue(0) },
      subscription: { count: jest.fn().mockResolvedValue(0) },
      jobApplication: { count: jest.fn().mockResolvedValue(0) },
      supportTicket: { count: jest.fn().mockResolvedValue(0) },
      ticketResponse: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(),
    };

    const service = new UsersService(
      prisma as any,
      {} as any,
      {} as any,
      { get: jest.fn().mockReturnValue(undefined) } as any,
    );

    await expect(service.hardRemove(appUser.id)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'HARD_DELETE_BLOCKED',
      }),
      status: 409,
    });
  });

  it('hard-deletes a clean user (no blocking dependents)', async () => {
    const appUser = {
      id: 'app-user-id',
      clerkId: 'clerk_123',
      email: 'user@example.com',
      role: UserRole.FOUNDATION,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const profile = { id: 'profile-id', clerkId: appUser.clerkId } as any;

    const tx = {
      userOrganization: { deleteMany: jest.fn() },
      userContactInfo: { deleteMany: jest.fn() },
      user: { delete: jest.fn(), deleteMany: jest.fn() },
      appUser: { delete: jest.fn() },
    };

    const prisma = {
      appUser: { findUnique: jest.fn().mockResolvedValue(appUser) },
      user: { findUnique: jest.fn().mockResolvedValue(profile) },
      asset: { count: jest.fn().mockResolvedValue(0) },
      userOrganization: { count: jest.fn().mockResolvedValue(0) },
      userContactInfo: { count: jest.fn().mockResolvedValue(0) },
      message: { count: jest.fn().mockResolvedValue(0) },
      conversationParticipant: { count: jest.fn().mockResolvedValue(0) },
      subscription: { count: jest.fn().mockResolvedValue(0) },
      jobApplication: { count: jest.fn().mockResolvedValue(0) },
      supportTicket: { count: jest.fn().mockResolvedValue(0) },
      ticketResponse: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    };

    const service = new UsersService(
      prisma as any,
      {} as any,
      {} as any,
      { get: jest.fn().mockReturnValue(undefined) } as any,
    );

    await expect(service.hardRemove(appUser.id)).resolves.toEqual({ success: true });
    expect(tx.userOrganization.deleteMany).toHaveBeenCalledWith({ where: { userId: profile.id } });
    expect(tx.userContactInfo.deleteMany).toHaveBeenCalledWith({ where: { userId: profile.id } });
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: profile.id } });
    expect(tx.appUser.delete).toHaveBeenCalledWith({ where: { id: appUser.id } });
  });
});

