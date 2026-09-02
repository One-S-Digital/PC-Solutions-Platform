import { UsersService } from './users.service';
import { UserRole } from '@prisma/client';

/**
 * Build a Prisma transaction-client mock that auto-creates its models.
 *
 * `hardRemove({ force: true })` deliberately reaches across ~30 relations to
 * clear FK constraints before a user row can be dropped, and it grows a new one
 * every time a relation with a Restrict/SetNull FK is added to the schema. A
 * hand-listed mock silently rots the moment that happens: this spec had already
 * drifted far enough that it no longer compiled at all.
 *
 * So instead of enumerating models, unknown ones are vivified on access with
 * neutral defaults. Adding a relation to hardRemove can no longer break this
 * spec, while `overrides` still pins the specific calls the assertions check.
 */
function createTxMock(overrides: Record<string, Record<string, jest.Mock>> = {}): any {
  const models = new Map<string, Record<string, jest.Mock>>();

  const target: Record<string, any> = {
    // safeDeleteMany / safeUpdateMany wrap each statement in a SAVEPOINT so a
    // missing table cannot abort the surrounding transaction.
    $executeRawUnsafe: jest.fn().mockResolvedValue(0),
  };

  return new Proxy(target, {
    get(t, prop) {
      if (typeof prop !== 'string' || prop === 'then') return (t as any)[prop];
      if (prop in t) return t[prop];

      if (!models.has(prop)) {
        models.set(prop, {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockResolvedValue({ id: `${prop}-id` }),
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
          update: jest.fn().mockResolvedValue({ id: `${prop}-id` }),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          upsert: jest.fn().mockResolvedValue({ id: `${prop}-id` }),
          delete: jest.fn().mockResolvedValue({ id: `${prop}-id` }),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          ...(overrides[prop] ?? {}),
        });
      }
      return models.get(prop);
    },
  });
}

describe('UsersService.remove (soft delete)', () => {
  it('suspends the user profile (isActive=false) without changing role', async () => {
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
        update: jest.fn().mockResolvedValue({ ...profile, isActive: false }),
        create: jest.fn(),
      },
      userOrganization: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([{ organizationId: 'org-id-1' }]),
      },
      userContactInfo: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      organization: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      subscription: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      appUser: {
        update: jest.fn(),
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
      {} as any, // emailNotificationService
      {} as any, // signupProfileService
    );

    const result = await service.remove(appUser.id);

    expect(prisma.appUser.findUnique).toHaveBeenCalledWith({ where: { id: appUser.id } });
    expect(tx.user.findUnique).toHaveBeenCalledWith({ where: { clerkId: appUser.clerkId } });
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: profile.id },
        data: expect.objectContaining({
          isActive: false,
          deactivatedReasonCode: 'ADMIN_SUSPENDED',
        }),
      }),
    );
    // Cascade: organizations should be deactivated along with the user
    expect(tx.userOrganization.findMany).toHaveBeenCalledWith({
      where: { userId: profile.id },
      select: { organizationId: true },
    });
    expect(tx.organization.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['org-id-1'] } },
      data: { isActive: false },
    });
    // Cascade: subscriptions should be cancelled for the suspended user
    // subscription.updateMany is called twice: once for org-based, once for user-based
    expect(tx.subscription.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: { in: ['org-id-1'] },
          status: { in: ['ACTIVE', 'TRIAL', 'GRACE_PERIOD', 'PAST_DUE'] },
        }),
        data: expect.objectContaining({
          status: 'CANCELLED',
          cancellationReason: 'User account suspended by admin',
        }),
      }),
    );
    expect(tx.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: profile.id,
          status: { in: ['ACTIVE', 'TRIAL', 'GRACE_PERIOD', 'PAST_DUE'] },
        }),
        data: expect.objectContaining({
          status: 'CANCELLED',
          cancellationReason: 'User account suspended by admin',
        }),
      }),
    );
    expect(tx.userOrganization.deleteMany).not.toHaveBeenCalled();
    expect(tx.userContactInfo.deleteMany).not.toHaveBeenCalled();
    expect(tx.appUser.update).not.toHaveBeenCalled();

    expect(result).toEqual(
      expect.objectContaining({
        id: appUser.id,
        clerkId: appUser.clerkId,
        email: appUser.email,
        role: appUser.role,
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
      course: { count: jest.fn().mockResolvedValue(0) },
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
      {} as any, // emailNotificationService
      {} as any, // signupProfileService
    );

    await expect(service.hardRemove(appUser.id)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'HARD_DELETE_BLOCKED',
      }),
      status: 409,
    });
  });

  it('force hard-delete deletes dependent records and completes', async () => {
    const appUser = {
      id: 'app-user-id',
      clerkId: 'clerk_123',
      email: 'user@example.com',
      role: UserRole.FOUNDATION,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const profile = { id: 'profile-id', clerkId: appUser.clerkId } as any;

    // Only the models the assertions below actually inspect need pinning; the
    // rest are vivified with neutral defaults.
    const tx = createTxMock({
      appUser: { upsert: jest.fn().mockResolvedValue({ id: 'system-app-user' }) },
    });

    const prisma = {
      appUser: { findUnique: jest.fn().mockResolvedValue(appUser) },
      user: { findUnique: jest.fn().mockResolvedValue(profile) },
      asset: { count: jest.fn().mockResolvedValue(1) },
      course: { count: jest.fn().mockResolvedValue(1) },
      userOrganization: { count: jest.fn().mockResolvedValue(0) },
      userContactInfo: { count: jest.fn().mockResolvedValue(0) },
      message: { count: jest.fn().mockResolvedValue(1) },
      conversationParticipant: { count: jest.fn().mockResolvedValue(1) },
      subscription: { count: jest.fn().mockResolvedValue(1) },
      jobApplication: { count: jest.fn().mockResolvedValue(1) },
      supportTicket: { count: jest.fn().mockResolvedValue(1) },
      ticketResponse: { count: jest.fn().mockResolvedValue(1) },
      $transaction: jest.fn(async (fn: any) => fn(tx)),
      outbox: { create: jest.fn() },
    };

    const service = new UsersService(
      prisma as any,
      {} as any,
      {} as any,
      { get: jest.fn().mockReturnValue(undefined) } as any,
      {} as any, // emailNotificationService
      {} as any, // signupProfileService
    );
    (service as any).clerk = { users: { deleteUser: jest.fn().mockResolvedValue(undefined) } };

    await expect(service.hardRemove(appUser.id, { force: true })).resolves.toEqual({ success: true });
    expect(tx.message.deleteMany).toHaveBeenCalled();
    expect(tx.asset.updateMany).toHaveBeenCalled();
    expect(tx.course.updateMany).toHaveBeenCalled();
    expect(tx.appUser.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clerkId: 'system' },
        create: expect.objectContaining({ clerkId: 'system', role: UserRole.PARENT }),
      }),
    );
    expect(tx.appUser.delete).toHaveBeenCalledWith({ where: { id: appUser.id } });
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

    const tx = createTxMock();

    const prisma = {
      appUser: { findUnique: jest.fn().mockResolvedValue(appUser) },
      user: { findUnique: jest.fn().mockResolvedValue(profile) },
      asset: { count: jest.fn().mockResolvedValue(0) },
      course: { count: jest.fn().mockResolvedValue(0) },
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
      {} as any, // emailNotificationService
      {} as any, // signupProfileService
    );
    (service as any).clerk = { users: { deleteUser: jest.fn().mockResolvedValue(undefined) } };

    await expect(service.hardRemove(appUser.id)).resolves.toEqual({ success: true });
    expect(tx.userOrganization.deleteMany).toHaveBeenCalledWith({ where: { userId: profile.id } });
    expect(tx.userContactInfo.deleteMany).toHaveBeenCalledWith({ where: { userId: profile.id } });
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: profile.id } });
    expect(tx.appUser.delete).toHaveBeenCalledWith({ where: { id: appUser.id } });
    expect((service as any).clerk.users.deleteUser).toHaveBeenCalledWith(appUser.clerkId);
  });
});

