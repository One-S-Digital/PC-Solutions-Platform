import { BadRequestException } from '@nestjs/common';
import { EducatorApprovalStatus } from '@prisma/client';
import { EducatorApprovalsService } from './educator-approvals.service';
import { SignupEvent } from '../signup-log/signup-log.events';

describe('EducatorApprovalsService', () => {
  const baseEducator = {
    id: 'edu-1',
    email: 'educator@example.com',
    firstName: 'Ada',
    shortBio: null,
    cvUrl: null,
    createdAt: new Date(),
  };

  function build(approvalStatus: EducatorApprovalStatus) {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ ...baseEducator, approvalStatus }),
        findUnique: jest.fn().mockResolvedValue({ ...baseEducator, approvalStatus }),
        update: jest.fn().mockResolvedValue({ id: baseEducator.id }),
      },
    };
    const record = jest.fn().mockResolvedValue(undefined);
    const service = new EducatorApprovalsService(
      prisma as any,
      { sendNotification: jest.fn().mockResolvedValue(undefined) } as any,
      { get: jest.fn() } as any,
      { record } as any,
    );
    return { service, prisma, record };
  }

  it('approves an INCOMPLETE educator and marks the override on the trace', async () => {
    const { service, prisma, record } = build(EducatorApprovalStatus.INCOMPLETE);

    await service.approveEducator(baseEducator.id);

    expect(prisma.user.update.mock.calls[0][0].data.approvalStatus).toBe(
      EducatorApprovalStatus.APPROVED,
    );
    const approved = record.mock.calls.find(
      ([args]) => args.event === SignupEvent.ADMIN_EDUCATOR_APPROVED,
    )?.[0];
    expect(approved).toMatchObject({
      approvalStatusBefore: EducatorApprovalStatus.INCOMPLETE,
      detail: { approvedWhileIncomplete: true, hasShortBio: false, hasCvUrl: false },
    });
  });

  it('does not flag a normal PENDING_REVIEW approval as an override', async () => {
    const { service, record } = build(EducatorApprovalStatus.PENDING_REVIEW);

    await service.approveEducator(baseEducator.id);

    const approved = record.mock.calls.find(
      ([args]) => args.event === SignupEvent.ADMIN_EDUCATOR_APPROVED,
    )?.[0];
    expect(approved.detail).toBeNull();
  });

  it('still refuses to reject an INCOMPLETE educator', async () => {
    const { service, prisma } = build(EducatorApprovalStatus.INCOMPLETE);

    await expect(service.rejectEducator(baseEducator.id, 'no')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
