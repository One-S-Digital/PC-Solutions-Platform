import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EducatorApprovalStatus, UserRole } from '@prisma/client';
import { AdminOpsHandler } from './admin-ops.handler';
import { AssistantPrincipal } from '../tool-handler.interface';

describe('AdminOpsHandler', () => {
  let prisma: any;
  let users: { inviteUser: jest.Mock };
  let educatorApprovals: {
    listEducators: jest.Mock;
    approveEducator: jest.Mock;
    rejectEducator: jest.Mock;
  };
  let briefing: { computeAdminSignals: jest.Mock };
  let handler: AdminOpsHandler;

  const admin: AssistantPrincipal = { userId: 'admin-1', role: UserRole.ADMIN };
  const foundation: AssistantPrincipal = {
    userId: 'foundation-1',
    role: UserRole.FOUNDATION,
    organizationId: 'org-1',
  };

  const execute = (toolName: string, args: Record<string, unknown> = {}, principal = admin) =>
    handler.execute(toolName, args, principal);

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
      supportTicket: { findMany: jest.fn(), count: jest.fn() },
    };
    users = { inviteUser: jest.fn() };
    educatorApprovals = {
      listEducators: jest.fn(),
      approveEducator: jest.fn(),
      rejectEducator: jest.fn(),
    };
    briefing = { computeAdminSignals: jest.fn() };
    handler = new AdminOpsHandler(
      prisma,
      users as any,
      educatorApprovals as any,
      briefing as any,
    );
  });

  it('rejects non-admin principals for every tool', async () => {
    for (const toolName of handler.toolNames) {
      await expect(execute(toolName, {}, foundation)).rejects.toThrow(ForbiddenException);
    }
  });

  describe('get_pending_educator_approvals', () => {
    it('returns rows shaped as candidates so the result cards render them', async () => {
      educatorApprovals.listEducators.mockResolvedValue({
        educators: [
          {
            id: 'edu-1',
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com',
            jobRole: 'EDE',
            jobRoles: ['EDE'],
            region: 'GE',
            skills: ['First aid'],
          },
        ],
        total: 3,
      });

      const result = await execute('get_pending_educator_approvals');

      expect(educatorApprovals.listEducators).toHaveBeenCalledWith(
        EducatorApprovalStatus.PENDING_REVIEW,
        1,
        expect.any(Number),
      );
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
      expect((result.data as any).candidates).toEqual([
        { id: 'edu-1', name: 'Jane Doe', role: 'EDE', region: 'GE', skills: ['First aid'] },
      ]);
    });
  });

  describe('approve_educator / reject_educator', () => {
    it('approves by educatorId and returns the new status', async () => {
      educatorApprovals.approveEducator.mockResolvedValue({
        id: 'edu-1',
        firstName: 'Jane',
        lastName: 'Doe',
        approvalStatus: EducatorApprovalStatus.APPROVED,
      });

      const result = await execute('approve_educator', { educatorId: 'edu-1' });

      expect(educatorApprovals.approveEducator).toHaveBeenCalledWith('edu-1');
      expect(result.data).toMatchObject({
        educatorId: 'edu-1',
        approvalStatus: EducatorApprovalStatus.APPROVED,
      });
    });

    it('requires rejection notes', async () => {
      await expect(execute('reject_educator', { educatorId: 'edu-1' })).rejects.toThrow(
        BadRequestException,
      );
      expect(educatorApprovals.rejectEducator).not.toHaveBeenCalled();
    });
  });

  describe('get_staffing_signals', () => {
    it('returns the shared briefing signals', async () => {
      const signals = {
        pendingEducatorApprovals: 2,
        staleApplications: 1,
        unassignedParentLeads: 0,
        replacementsWithoutMatches: 4,
        openSupportTickets: 1,
        cantonPolicyUpdates: 0,
      };
      briefing.computeAdminSignals.mockResolvedValue(signals);

      const result = await execute('get_staffing_signals');

      expect(result).toEqual({ data: signals, total: 1, scope: 'platform-wide' });
    });
  });

  describe('draft_user_invite / send_user_invite', () => {
    it('drafts the invite modal payload with a coerced role', async () => {
      const result = await execute('draft_user_invite', {
        email: 'new@example.com',
        role: 'educator',
      });

      expect(result.data).toEqual({
        modal: 'invite_user_modal',
        prefill: { email: 'new@example.com', role: UserRole.EDUCATOR },
      });
    });

    it('sends the invite through UsersService with the caller role', async () => {
      users.inviteUser.mockResolvedValue({ id: 'inv-1' });

      const result = await execute('send_user_invite', {
        email: 'new@example.com',
        role: 'EDUCATOR',
      });

      expect(users.inviteUser).toHaveBeenCalledWith({
        email: 'new@example.com',
        role: UserRole.EDUCATOR,
        callerRole: UserRole.ADMIN,
      });
      expect(result.data).toMatchObject({ email: 'new@example.com', status: 'sent' });
    });

    it('rejects malformed emails and invalid roles before calling Clerk', async () => {
      await expect(
        execute('send_user_invite', { email: 'foo@', role: 'EDUCATOR' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        execute('send_user_invite', { email: 'new@example.com', role: 'WIZARD' }),
      ).rejects.toThrow(BadRequestException);
      expect(users.inviteUser).not.toHaveBeenCalled();
    });
  });
});
