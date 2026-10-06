import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { MailingUnsubscribeController } from './mailing-unsubscribe.controller';
import { MailingUnsubscribeService } from './mailing-unsubscribe.service';

/**
 * The same routes, through Nest's real request pipeline with the production
 * ValidationPipe settings and NO authentication guard. What the service tests
 * cannot show: that a signed-out person clicking a link in their inbox is let
 * in, that the body DTO survives `forbidNonWhitelisted`, and that GET cannot act.
 */
describe('unsubscribe routes over HTTP', () => {
  let app: INestApplication;
  const service = { inspect: jest.fn(), unsubscribe: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MailingUnsubscribeController],
      providers: [{ provide: MailingUnsubscribeService, useValue: service }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    service.inspect.mockReset().mockResolvedValue({ maskedEmail: 'a***@example.com', alreadyUnsubscribed: false });
    service.unsubscribe.mockReset().mockResolvedValue(true);
  });

  it('GET /api/mailing/unsubscribe/status reads without credentials and does not act', async () => {
    const res = await request(app.getHttpServer()).get('/api/mailing/unsubscribe/status?token=abc.def').expect(200);

    expect(res.body).toEqual({ success: true, data: { maskedEmail: 'a***@example.com', alreadyUnsubscribed: false } });
    expect(service.inspect).toHaveBeenCalledWith('abc.def');
    expect(service.unsubscribe).not.toHaveBeenCalled();
  });

  it('POST with the token in a JSON body unsubscribes', async () => {
    await request(app.getHttpServer())
      .post('/api/mailing/unsubscribe')
      .send({ token: 'abc.def' })
      .expect(200, { success: true });
    expect(service.unsubscribe).toHaveBeenCalledWith('abc.def');
  });

  it('POST with the token in the query string unsubscribes, as a mail client would send it', async () => {
    await request(app.getHttpServer())
      .post('/api/mailing/unsubscribe?token=abc.def')
      .expect(200, { success: true });
    expect(service.unsubscribe).toHaveBeenCalledWith('abc.def');
  });

  it('GET on the acting route does nothing — only POST changes anything', async () => {
    await request(app.getHttpServer()).get('/api/mailing/unsubscribe?token=abc.def').expect(404);
    expect(service.unsubscribe).not.toHaveBeenCalled();
  });

  it('answers 400 with a stable code for a link that does not verify', async () => {
    service.inspect.mockResolvedValue(null);
    service.unsubscribe.mockResolvedValue(false);

    const status = await request(app.getHttpServer()).get('/api/mailing/unsubscribe/status?token=bad').expect(400);
    expect(status.body.code).toBe('invalid_unsubscribe_link');

    const post = await request(app.getHttpServer()).post('/api/mailing/unsubscribe').send({ token: 'bad' }).expect(400);
    expect(post.body.code).toBe('invalid_unsubscribe_link');
  });

  it('answers 400 when there is no token at all', async () => {
    await request(app.getHttpServer()).get('/api/mailing/unsubscribe/status').expect(400);
    await request(app.getHttpServer()).post('/api/mailing/unsubscribe').send({}).expect(400);
    expect(service.unsubscribe).not.toHaveBeenCalled();
  });

  it('refuses unexpected body fields rather than ignoring them', async () => {
    await request(app.getHttpServer())
      .post('/api/mailing/unsubscribe')
      .send({ token: 'abc.def', userId: 'someone-else' })
      .expect(400);
    expect(service.unsubscribe).not.toHaveBeenCalled();
  });
});
