import { SignupLogService } from './signup-log.service';
import { SignupEvent, SignupSource, SignupStage } from './signup-log.events';

/**
 * These tests guard the two properties that make the signup trace safe to leave
 * switched on in production: it cannot break a signup, and it cannot become a
 * dumping ground for user content.
 */
describe('SignupLogService', () => {
  let create: jest.Mock;
  let service: SignupLogService;

  beforeEach(() => {
    create = jest.fn().mockResolvedValue({});
    service = new SignupLogService({ signupEventLog: { create } } as any);
  });

  const baseArgs = {
    event: SignupEvent.API_EDUCATOR_PATCH_RECEIVED,
    stage: SignupStage.PROFILE,
    source: SignupSource.API,
  } as const;

  it('never rejects when the database write fails', async () => {
    create.mockRejectedValue(new Error('connection terminated'));

    // The assertion IS that this resolves. A diagnostic that can reject would
    // take down the request it is observing.
    await expect(service.record(baseArgs)).resolves.toBeUndefined();
  });

  it('records the event even when no correlation id is known', async () => {
    await service.record({ ...baseArgs, correlationId: undefined });

    expect(create).toHaveBeenCalledTimes(1);
    // An orphan row is still evidence — it is joinable by email and userId.
    expect(create.mock.calls[0][0].data.correlationId).toBe('unlinked');
  });

  it('normalises email so a journey can be found regardless of casing', async () => {
    await service.record({ ...baseArgs, email: '  Educator@Example.COM ' });

    expect(create.mock.calls[0][0].data.email).toBe('educator@example.com');
  });

  it('strips objects out of detail so payloads cannot be stored', async () => {
    await service.record({
      ...baseArgs,
      detail: {
        hasShortBio: true,
        attempt: 2,
        // The shape a leaked request body would arrive in.
        payload: { shortBio: 'my whole life story', cvUrl: 'https://example.com/cv.pdf' },
        cities: ['Geneva', 'Lausanne'],
      },
    });

    const { detail } = create.mock.calls[0][0].data;
    expect(detail).toEqual({ hasShortBio: true, attempt: 2, cities: 2 });
    expect(detail).not.toHaveProperty('payload');
  });

  it('truncates long strings rather than storing them whole', async () => {
    await service.record({ ...baseArgs, errorMessage: 'x'.repeat(5000) });

    expect(create.mock.calls[0][0].data.errorMessage).toHaveLength(500);
  });

  it('writes nothing when disabled by environment', async () => {
    const previous = process.env.SIGNUP_LOG_ENABLED;
    process.env.SIGNUP_LOG_ENABLED = 'false';
    try {
      const disabled = new SignupLogService({ signupEventLog: { create } } as any);
      await disabled.record(baseArgs);
      expect(create).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.SIGNUP_LOG_ENABLED;
      else process.env.SIGNUP_LOG_ENABLED = previous;
    }
  });
});
