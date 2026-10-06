import { MaintenanceModeMiddleware } from './maintenance-mode.middleware';

/**
 * During maintenance the API answers 503 to everyone except a short allow-list.
 * The unsubscribe link in a campaign email has to be on it: someone asking us to
 * stop writing to them must not be told to come back later.
 */
describe('MaintenanceModeMiddleware', () => {
  const run = async (url: string, method = 'GET') => {
    const platformSettings = { getMaintenanceMode: jest.fn().mockResolvedValue({ enabled: true, message: 'back soon' }) };
    const middleware = new MaintenanceModeMiddleware(platformSettings as any);
    const res: any = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await middleware.use({ method, originalUrl: url } as any, res, next);
    return { res, next };
  };

  it.each([
    '/api/mailing/unsubscribe/status?token=abc.def',
    '/api/mailing/unsubscribe',
    '/api/mailing/unsubscribe?token=abc.def',
  ])('lets %s through while the platform is in maintenance', async url => {
    const { next, res } = await run(url, url.endsWith('unsubscribe') ? 'POST' : 'GET');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('still blocks other mailing routes, which are admin-only', async () => {
    const { next, res } = await run('/api/admin/mailing/campaigns');
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('does not let a look-alike path through', async () => {
    const { next, res } = await run('/api/mailing/unsubscribe-everyone');
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
