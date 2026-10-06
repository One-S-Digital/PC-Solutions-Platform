import '@testing-library/jest-dom';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// `t` returns the key (plus the interpolated address, so the masked email is checkable).
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { email?: string }) => (options?.email ? `${key}|${options.email}` : key),
  }),
}));

vi.mock('../../services/api', () => ({ apiService: { apiBaseUrl: 'https://api.test/api' } }));

// The real one reads the app context; it is not what is under test here.
vi.mock('../../components/ui/LanguageSwitcher', () => ({ default: () => null }));

import UnsubscribePage from '../../pages/UnsubscribePage';

const fetchMock = vi.fn();

const json = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const STATUS_OK = json(200, { success: true, data: { maskedEmail: 'a***@example.com', alreadyUnsubscribed: false } });
const INVALID = json(400, { success: false, code: 'invalid_unsubscribe_link' });

function open(search = '?token=abc.def') {
  return render(
    React.createElement(MemoryRouter, { initialEntries: [`/unsubscribe${search}`] }, React.createElement(UnsubscribePage)),
  );
}

const callsTo = (method: string) =>
  fetchMock.mock.calls.filter(([, init]) => (init?.method ?? 'GET') === method);

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * The link is in every campaign email, and mail scanners open every link in a
 * message. Loading the page must therefore be harmless; only the button acts.
 */
describe('UnsubscribePage', () => {
  it('only reads when it loads — nothing is unsubscribed until the button is pressed', async () => {
    fetchMock.mockResolvedValue(STATUS_OK);
    open();

    expect(await screen.findByText('common:unsubscribe.confirmWithEmail|a***@example.com')).toBeInTheDocument();
    expect(callsTo('POST')).toHaveLength(0);
    expect(callsTo('GET')).toHaveLength(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/mailing/unsubscribe/status?token=abc.def');
  });

  it('sends the token in a POST body when the person confirms, then says it is done', async () => {
    fetchMock.mockResolvedValueOnce(STATUS_OK).mockResolvedValueOnce(json(200, { success: true }));
    open();

    fireEvent.click(await screen.findByRole('button', { name: 'common:unsubscribe.confirmButton' }));

    expect(await screen.findByText('common:unsubscribe.doneTitle')).toBeInTheDocument();
    const [url, init] = callsTo('POST')[0];
    expect(url).toBe('https://api.test/api/mailing/unsubscribe');
    expect(JSON.parse(init.body)).toEqual({ token: 'abc.def' });
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('disables the button while the request is in flight, so a double tap sends one request', async () => {
    let finish: (value: unknown) => void = () => undefined;
    fetchMock
      .mockResolvedValueOnce(STATUS_OK)
      .mockReturnValueOnce(new Promise(resolve => (finish = resolve)));
    open();

    fireEvent.click(await screen.findByRole('button', { name: 'common:unsubscribe.confirmButton' }));
    const working = await screen.findByRole('button', { name: 'common:unsubscribe.working' });
    expect(working).toBeDisabled();
    fireEvent.click(working);
    expect(callsTo('POST')).toHaveLength(1);

    finish(json(200, { success: true }));
    expect(await screen.findByText('common:unsubscribe.doneTitle')).toBeInTheDocument();
  });

  it('tells someone who already unsubscribed, and offers no button', async () => {
    fetchMock.mockResolvedValue(json(200, { success: true, data: { maskedEmail: null, alreadyUnsubscribed: true } }));
    open();

    expect(await screen.findByText('common:unsubscribe.alreadyTitle')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows an invalid link as invalid, and never offers to unsubscribe', async () => {
    fetchMock.mockResolvedValue(INVALID);
    open('?token=tampered');

    expect(await screen.findByText('common:unsubscribe.invalidTitle')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('treats a missing token as invalid without asking the server', async () => {
    open('');
    expect(await screen.findByText('common:unsubscribe.invalidTitle')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('URL-encodes the token it puts in the query string', async () => {
    fetchMock.mockResolvedValue(STATUS_OK);
    open(`?token=${encodeURIComponent('a+b/c=d.e')}`);
    await screen.findByRole('button', { name: 'common:unsubscribe.confirmButton' });
    expect(fetchMock.mock.calls[0][0]).toContain('token=a%2Bb%2Fc%3Dd.e');
  });

  it('recovers from a network failure while checking by checking again', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(STATUS_OK);
    open();

    fireEvent.click(await screen.findByRole('button', { name: 'common:unsubscribe.retry' }));

    expect(await screen.findByRole('button', { name: 'common:unsubscribe.confirmButton' })).toBeInTheDocument();
    expect(callsTo('POST')).toHaveLength(0);
  });

  it('retries the unsubscribe itself, not just the check, when the POST fails', async () => {
    fetchMock
      .mockResolvedValueOnce(STATUS_OK)
      .mockResolvedValueOnce(json(500, { message: 'boom' }))
      .mockResolvedValueOnce(json(200, { success: true }));
    open();

    fireEvent.click(await screen.findByRole('button', { name: 'common:unsubscribe.confirmButton' }));
    fireEvent.click(await screen.findByRole('button', { name: 'common:unsubscribe.retry' }));

    expect(await screen.findByText('common:unsubscribe.doneTitle')).toBeInTheDocument();
    expect(callsTo('POST')).toHaveLength(2);
    expect(callsTo('GET')).toHaveLength(1);
  });

  it('does not mistake a server error for an invalid link', async () => {
    fetchMock.mockResolvedValue(json(500, { message: 'boom' }));
    open();
    expect(await screen.findByText('common:unsubscribe.errorTitle')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('common:unsubscribe.invalidTitle')).toBeNull());
  });
});
