import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, EnvelopeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { API_ENDPOINTS } from '../services/api-endpoints';
import { apiService } from '../services/api';

/**
 * Where the unsubscribe link in a campaign email lands.
 *
 * Opening the page only READS: it asks the server whether the link is genuine
 * and who it is for. Nothing is changed until the person presses the button.
 * That ordering is the point — mail scanners and link previewers open every URL
 * in a message, and a page that unsubscribed on load would opt people out before
 * they had read the email.
 *
 * Public on purpose: the person is usually signed out, and may not be a user at
 * all (admins can add out-of-database recipients to a campaign).
 */

type View =
  | { kind: 'checking' }
  | { kind: 'confirm'; maskedEmail: string | null }
  | { kind: 'working' }
  | { kind: 'done' }
  | { kind: 'already' }
  | { kind: 'invalid' }
  | { kind: 'error'; retry: 'check' | 'submit' };

interface ApiReply {
  ok: boolean;
  status: number;
  body: any;
}

/** One request, never throwing: a network failure is a state the page shows, not a crash. */
async function call(path: string, init?: RequestInit): Promise<ApiReply | null> {
  try {
    const response = await fetch(`${apiService.apiBaseUrl}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    });
    let body: any = null;
    try {
      body = await response.json();
    } catch {
      /* an empty or non-JSON body is handled by status alone */
    }
    return { ok: response.ok, status: response.status, body };
  } catch {
    return null;
  }
}

const isInvalidLink = (reply: ApiReply) =>
  reply.status === 400 && reply.body?.code === 'invalid_unsubscribe_link';

const UnsubscribePage: React.FC = () => {
  const { t } = useTranslation(['common']);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [view, setView] = useState<View>({ kind: 'checking' });

  const check = useCallback(async () => {
    if (!token) {
      setView({ kind: 'invalid' });
      return;
    }
    setView({ kind: 'checking' });

    const reply = await call(
      `${API_ENDPOINTS.mailing.unsubscribeStatus}?token=${encodeURIComponent(token)}`,
    );
    if (!reply) return setView({ kind: 'error', retry: 'check' });
    if (isInvalidLink(reply)) return setView({ kind: 'invalid' });
    if (!reply.ok || !reply.body?.data) return setView({ kind: 'error', retry: 'check' });

    const { alreadyUnsubscribed, maskedEmail } = reply.body.data;
    setView(alreadyUnsubscribed ? { kind: 'already' } : { kind: 'confirm', maskedEmail: maskedEmail ?? null });
  }, [token]);

  useEffect(() => {
    void check();
  }, [check]);

  const submit = async () => {
    setView({ kind: 'working' });

    const reply = await call(API_ENDPOINTS.mailing.unsubscribe, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!reply) return setView({ kind: 'error', retry: 'submit' });
    if (isInvalidLink(reply)) return setView({ kind: 'invalid' });
    setView(reply.ok ? { kind: 'done' } : { kind: 'error', retry: 'submit' });
  };

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 sm:p-8 text-center">
        {/* Announced as it changes: the same card goes from "checking" to a result. */}
        <div role="status" aria-live="polite">
          {view.kind === 'checking' && (
            <>
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-swiss-mint mx-auto mb-4" />
              <p className="text-gray-600">{t('common:unsubscribe.checking')}</p>
            </>
          )}

          {(view.kind === 'confirm' || view.kind === 'working') && (
            <>
              <EnvelopeIcon className="w-12 h-12 text-swiss-mint mx-auto mb-3" />
              <h1 className="text-xl sm:text-2xl font-bold text-swiss-charcoal mb-3">
                {t('common:unsubscribe.title')}
              </h1>
              <p className="text-gray-600 mb-2">
                {view.kind === 'confirm' && view.maskedEmail
                  ? t('common:unsubscribe.confirmWithEmail', { email: view.maskedEmail })
                  : t('common:unsubscribe.confirmNoEmail')}
              </p>
              <p className="text-sm text-gray-500 mb-6">{t('common:unsubscribe.confirmNote')}</p>
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={view.kind === 'working'}
                onClick={submit}
              >
                {view.kind === 'working'
                  ? t('common:unsubscribe.working')
                  : t('common:unsubscribe.confirmButton')}
              </Button>
            </>
          )}

          {view.kind === 'done' && (
            <>
              <CheckCircleIcon className="w-14 h-14 text-swiss-mint mx-auto mb-3" />
              <h1 className="text-xl sm:text-2xl font-bold text-swiss-charcoal mb-3">
                {t('common:unsubscribe.doneTitle')}
              </h1>
              <p className="text-gray-600">{t('common:unsubscribe.doneBody')}</p>
            </>
          )}

          {view.kind === 'already' && (
            <>
              <CheckCircleIcon className="w-14 h-14 text-swiss-mint mx-auto mb-3" />
              <h1 className="text-xl sm:text-2xl font-bold text-swiss-charcoal mb-3">
                {t('common:unsubscribe.alreadyTitle')}
              </h1>
              <p className="text-gray-600">{t('common:unsubscribe.alreadyBody')}</p>
            </>
          )}

          {view.kind === 'invalid' && (
            <>
              <ExclamationTriangleIcon className="w-14 h-14 text-amber-500 mx-auto mb-3" />
              <h1 className="text-xl sm:text-2xl font-bold text-swiss-charcoal mb-3">
                {t('common:unsubscribe.invalidTitle')}
              </h1>
              <p className="text-gray-600">{t('common:unsubscribe.invalidBody')}</p>
            </>
          )}

          {view.kind === 'error' && (
            <>
              <ExclamationTriangleIcon className="w-14 h-14 text-amber-500 mx-auto mb-3" />
              <h1 className="text-xl sm:text-2xl font-bold text-swiss-charcoal mb-3">
                {t('common:unsubscribe.errorTitle')}
              </h1>
              <p className="text-gray-600 mb-6">{t('common:unsubscribe.errorBody')}</p>
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                onClick={view.retry === 'submit' ? submit : check}
              >
                {t('common:unsubscribe.retry')}
              </Button>
            </>
          )}
        </div>

        {view.kind !== 'checking' && view.kind !== 'working' && (
          <p className="mt-6 text-sm">
            <Link to="/" className="font-medium text-swiss-mint hover:underline">
              {t('common:unsubscribe.backToSite')}
            </Link>
          </p>
        )}

        {/* The app opens in French whatever the browser says, and the person
            arriving here from an email may read German or English. */}
        <div className="mt-4 flex justify-center">
          <LanguageSwitcher />
        </div>
      </Card>
    </div>
  );
};

export default UnsubscribePage;
