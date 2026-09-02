import { UserRole } from '@prisma/client';
import {
  SignupProfileService,
  parseSignupIntent,
} from './signup-profile.service';

/**
 * These tests exist because of a real production defect: the two paths that
 * create an account — the Clerk `user.created` webhook (email/password) and
 * POST /users/complete-profile (OAuth) — each built the organization inline and
 * persisted DIFFERENT field sets. A Foundation signing up with Google kept its
 * capacity; the same Foundation signing up with email/password silently lost
 * it, along with phone, supplier category and service type.
 *
 * Both paths now go through `applySignupIntent`, and the parity test below is
 * the guard that stops them drifting apart again.
 */
describe('SignupProfileService', () => {
  let service: SignupProfileService;

  const makeTx = () => {
    const organization = { id: 'org-1', name: 'Crèche du Lac', type: 'FOUNDATION' };
    return {
      user: { update: jest.fn().mockResolvedValue({}) },
      userOrganization: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      organization: { create: jest.fn().mockResolvedValue(organization) },
    };
  };

  beforeEach(() => {
    service = new SignupProfileService();
  });

  describe('parseSignupIntent', () => {
    it('coerces the values that arrive as strings through Clerk metadata', () => {
      const intent = parseSignupIntent({
        organisationName: '  Crèche du Lac  ',
        capacity: '42',
        childAge: '3',
        childStartDate: '2026-09-01',
        termsAcceptedAt: '2026-08-30T10:00:00.000Z',
      });

      expect(intent.organisationName).toBe('Crèche du Lac');
      expect(intent.capacity).toBe(42);
      expect(intent.childAge).toBe(3);
      expect(intent.childStartDate).toEqual(new Date('2026-09-01'));
    });

    it('treats consent as a flag, never trusting the client timestamp', () => {
      // Both transports are client-controlled, so a caller could otherwise
      // record a consent time that never happened. The server stamps the time.
      const backdated = parseSignupIntent({ termsAcceptedAt: '1999-01-01T00:00:00.000Z' });
      expect(backdated.termsAccepted).toBe(true);
      expect(backdated as Record<string, unknown>).not.toHaveProperty('termsAcceptedAt');

      expect(parseSignupIntent({ termsAccepted: true }).termsAccepted).toBe(true);
      expect(parseSignupIntent({}).termsAccepted).toBe(false);
      expect(parseSignupIntent({ termsAcceptedAt: 'not-a-date' }).termsAccepted).toBe(false);
    });

    it('drops blank, malformed and unknown values', () => {
      const intent = parseSignupIntent({
        organisationName: '   ',
        capacity: 'not-a-number',
        childAge: -1,
        childStartDate: 'never',
        role: 'ADMIN',
        somethingElse: 'ignored',
      });

      expect(intent.organisationName).toBeUndefined();
      expect(intent.capacity).toBeUndefined();
      expect(intent.childAge).toBeUndefined();
      expect(intent.childStartDate).toBeUndefined();
      // Role must never be taken from client-writable metadata.
      expect(intent as Record<string, unknown>).not.toHaveProperty('role');
      expect(intent as Record<string, unknown>).not.toHaveProperty('somethingElse');
    });

    it('tolerates null and non-object input', () => {
      expect(parseSignupIntent(null).phone).toBeUndefined();
      expect(parseSignupIntent('nope').phone).toBeUndefined();
    });
  });

  describe('applySignupIntent', () => {
    it('persists the foundation capacity and phone onto a new organization', async () => {
      const tx = makeTx();

      await service.applySignupIntent(tx as any, {
        userId: 'user-1',
        role: UserRole.FOUNDATION,
        firstName: 'Ada',
        lastName: 'Lovelace',
        phoneNumber: null,
        intent: parseSignupIntent({
          organisationName: 'Crèche du Lac',
          phone: '+41 79 000 00 00',
          canton: 'Vaud',
          capacity: 42,
        }),
      });

      expect(tx.organization.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Crèche du Lac',
          type: 'FOUNDATION',
          phoneNumber: '+41 79 000 00 00',
          canton: 'Vaud',
          region: 'Vaud',
          capacity: 42,
        }),
      });
      expect(tx.userOrganization.create).toHaveBeenCalled();
    });

    it('maps the supplier and service-provider specific fields', async () => {
      const supplierTx = makeTx();
      await service.applySignupIntent(supplierTx as any, {
        userId: 'user-2',
        role: UserRole.PRODUCT_SUPPLIER,
        intent: parseSignupIntent({ category: 'Furniture' }),
      });
      expect(supplierTx.organization.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ productCategory: 'Furniture' }),
      });

      const providerTx = makeTx();
      await service.applySignupIntent(providerTx as any, {
        userId: 'user-3',
        role: UserRole.SERVICE_PROVIDER,
        intent: parseSignupIntent({ serviceType: 'Cleaning' }),
      });
      expect(providerTx.organization.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ serviceType: 'Cleaning' }),
      });
    });

    it('stores the parent child details that were previously discarded', async () => {
      const tx = makeTx();

      await service.applySignupIntent(tx as any, {
        userId: 'user-4',
        role: UserRole.PARENT,
        intent: parseSignupIntent({ childAge: 3, childStartDate: '2026-09-01' }),
      });

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'user-4' },
        data: expect.objectContaining({
          childAge: 3,
          childStartDate: new Date('2026-09-01'),
        }),
      });
      // Parents are not organization-based.
      expect(tx.organization.create).not.toHaveBeenCalled();
    });

    it('falls back to the signup phone when the provider supplied none', async () => {
      const tx = makeTx();

      await service.applySignupIntent(tx as any, {
        userId: 'user-5',
        role: UserRole.EDUCATOR,
        phoneNumber: null, // Clerk `phone_numbers` is empty for email/password signups
        intent: parseSignupIntent({ phone: '+41 79 111 11 11' }),
      });

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'user-5' },
        data: expect.objectContaining({ phoneNumber: '+41 79 111 11 11' }),
      });
    });

    it('does not create a second organization when one is already linked', async () => {
      const tx = makeTx();
      tx.userOrganization.findFirst.mockResolvedValue({ id: 'existing' });

      await service.applySignupIntent(tx as any, {
        userId: 'user-6',
        role: UserRole.FOUNDATION,
        intent: parseSignupIntent({ organisationName: 'Crèche du Lac' }),
      });

      expect(tx.organization.create).not.toHaveBeenCalled();
      expect(tx.userOrganization.create).not.toHaveBeenCalled();
    });

    it('produces identical writes for the webhook and complete-profile paths', async () => {
      // The webhook receives everything as strings through Clerk unsafe_metadata;
      // complete-profile receives a typed DTO. Same signup, same resulting rows.
      const webhookTx = makeTx();
      await service.applySignupIntent(webhookTx as any, {
        userId: 'user-7',
        role: UserRole.FOUNDATION,
        firstName: 'Ada',
        lastName: 'Lovelace',
        phoneNumber: null,
        intent: parseSignupIntent({
          organisationName: 'Crèche du Lac',
          contactPerson: 'Ada Lovelace',
          phone: '+41 79 000 00 00',
          canton: 'Vaud',
          capacity: '42',
        }),
      });

      const completeProfileTx = makeTx();
      await service.applySignupIntent(completeProfileTx as any, {
        userId: 'user-7',
        role: UserRole.FOUNDATION,
        firstName: 'Ada',
        lastName: 'Lovelace',
        phoneNumber: '+41 79 000 00 00',
        intent: parseSignupIntent({
          organisationName: 'Crèche du Lac',
          contactPerson: 'Ada Lovelace',
          phone: '+41 79 000 00 00',
          canton: 'Vaud',
          capacity: 42,
        }),
      });

      // Assert the writes actually happened before comparing them: `?.[0]` is
      // undefined on both sides when neither path wrote, and
      // expect(undefined).toEqual(undefined) would pass — silently turning this
      // drift guard into a no-op.
      expect(webhookTx.organization.create).toHaveBeenCalledTimes(1);
      expect(completeProfileTx.organization.create).toHaveBeenCalledTimes(1);
      expect(webhookTx.user.update).toHaveBeenCalledTimes(1);
      expect(completeProfileTx.user.update).toHaveBeenCalledTimes(1);

      expect(webhookTx.organization.create.mock.calls[0][0]).toEqual(
        completeProfileTx.organization.create.mock.calls[0][0],
      );
      expect(webhookTx.user.update.mock.calls[0][0]).toEqual(
        completeProfileTx.user.update.mock.calls[0][0],
      );
    });
  });
});
