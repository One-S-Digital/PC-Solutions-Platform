import { Test, TestingModule } from '@nestjs/testing';
import { OutboxWorker } from '../../src/sync/outbox.worker';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';

describe('OutboxWorker', () => {
  let worker: OutboxWorker;
  let prisma: PrismaService;
  
  const mockClerkClient = {
    users: {
      updateUser: jest.fn().mockResolvedValue({}),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxWorker,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
            outbox: {
              delete: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test_secret_key'),
          },
        },
      ],
    }).compile();

    worker = module.get<OutboxWorker>(OutboxWorker);
    prisma = module.get<PrismaService>(PrismaService);
    
    // Mock the Clerk client
    (worker as any).clerk = mockClerkClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processOutbox', () => {
    it('should process mirror.role jobs successfully', async () => {
      const mockJobs = [
        {
          id: BigInt(1),
          topic: 'mirror.role',
          payload: { clerkUserId: 'user_123', role: UserRole.ADMIN },
          attempts: 0,
        },
      ];

      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockJobs);
      (prisma.outbox.delete as jest.Mock).mockResolvedValue({});

      await worker.processOutbox();

      expect(mockClerkClient.users.updateUser).toHaveBeenCalledWith('user_123', {
        publicMetadata: { role: UserRole.ADMIN },
        unsafeMetadata: { role: undefined },
      });

      expect(prisma.outbox.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should handle job failures with retry', async () => {
      const mockJobs = [
        {
          id: BigInt(2),
          topic: 'mirror.role',
          payload: { clerkUserId: 'user_456', role: UserRole.EDUCATOR },
          attempts: 1,
        },
      ];

      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockJobs);
      mockClerkClient.users.updateUser.mockRejectedValue(new Error('API Error'));

      await worker.processOutbox();

      expect(prisma.outbox.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: {
          attempts: 2,
          lastError: 'API Error',
          nextRunAt: expect.any(Date),
        },
      });

      expect(prisma.outbox.delete).not.toHaveBeenCalled();
    });

    it('should skip unknown topics', async () => {
      const mockJobs = [
        {
          id: BigInt(3),
          topic: 'unknown.topic',
          payload: {},
          attempts: 0,
        },
      ];

      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockJobs);

      await worker.processOutbox();

      expect(mockClerkClient.users.updateUser).not.toHaveBeenCalled();
      expect(prisma.outbox.delete).toHaveBeenCalledWith({
        where: { id: 3 },
      });
    });

    it('should handle empty job queue', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      await expect(worker.processOutbox()).resolves.not.toThrow();

      expect(mockClerkClient.users.updateUser).not.toHaveBeenCalled();
      expect(prisma.outbox.delete).not.toHaveBeenCalled();
    });

    it('should apply exponential backoff for retries', async () => {
      const mockJobs = [
        {
          id: BigInt(4),
          topic: 'mirror.role',
          payload: { clerkUserId: 'user_789', role: UserRole.PARENT },
          attempts: 3,
        },
      ];

      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockJobs);
      mockClerkClient.users.updateUser.mockRejectedValue(new Error('Rate limited'));

      await worker.processOutbox();

      const updateCall = (prisma.outbox.update as jest.Mock).mock.calls[0][0];
      const nextRunAt = updateCall.data.nextRunAt;
      const delayMs = nextRunAt.getTime() - Date.now();

      // Should be approximately 2^4 = 16 seconds (with some tolerance)
      expect(delayMs).toBeGreaterThan(15000);
      expect(delayMs).toBeLessThan(17000);
    });
  });
});