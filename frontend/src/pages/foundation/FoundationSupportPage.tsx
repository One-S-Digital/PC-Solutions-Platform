import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { LifebuoyIcon, ChatBubbleLeftRightIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { apiCall } from '../../utils/api';

type SupportContact = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type Conversation = {
  id: string;
  type: string;
  title?: string | null;
  messages?: Array<{ content: string; createdAt: string }>;
};

const FoundationSupportPage: React.FC = () => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<SupportContact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchSupportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSupportData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

      const [contactsResponse, conversationsResponse] = await Promise.all([
        apiCall('/profiles/support/contacts', { headers }),
        apiCall('/messaging/conversations', { headers }),
      ]);

      if (!contactsResponse.ok) {
        throw new Error('Unable to load support contacts');
      }
      const contactsJson = await contactsResponse.json();
      const supportContacts = (contactsJson.data ?? contactsJson) as SupportContact[];
      setContacts(supportContacts);
      if (supportContacts.length > 0) {
        setSelectedContactId(supportContacts[0].id);
      }

      if (conversationsResponse.ok) {
        const conversationsJson = await conversationsResponse.json();
        const allConversations = (conversationsJson.data ?? conversationsJson) as Conversation[];
        setConversations(allConversations.filter((conversation) => conversation.type === 'SUPPORT'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load support data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim() || !selectedContactId) {
      return;
    }

    try {
      setStatus('sending');
      const token = await getToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const conversationResponse = await apiCall('/messaging/conversations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'SUPPORT',
          participantIds: [selectedContactId],
          title: 'Foundation Support Request',
        }),
      });

      if (!conversationResponse.ok) {
        throw new Error('Failed to create support conversation');
      }

      const conversationJson = await conversationResponse.json();
      const conversationId = conversationJson.id ?? conversationJson.data?.id;
      if (!conversationId) {
        throw new Error('Missing conversation identifier');
      }

      const messageResponse = await apiCall('/messaging/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversationId,
          content: message.trim(),
          messageType: 'TEXT',
        }),
      });

      if (!messageResponse.ok) {
        throw new Error('Support message could not be sent');
      }

      setMessage('');
      setStatus('success');
      fetchSupportData();
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex min-h-[280px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-swiss-mint/30 border-t-swiss-mint" />
            <p className="mt-3 text-sm text-gray-500">Contacting support services…</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Card className="border border-rose-100 bg-rose-50 p-6 text-rose-700">
          <h2 className="text-lg font-semibold">Support centre unavailable</h2>
          <p className="mt-2 text-sm">{error}</p>
          <Button className="mt-4" variant="light" onClick={fetchSupportData}>
            Retry
          </Button>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-swiss-mint/10 p-3 text-swiss-teal">
              <LifebuoyIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-swiss-charcoal">Priority support</h2>
              <p className="text-sm text-gray-500">Reach our admin team directly for operational or billing issues.</p>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="text-sm font-medium text-swiss-charcoal">
              Route to
              <select
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-swiss-mint focus:outline-none focus:ring-2 focus:ring-swiss-mint/20"
                value={selectedContactId}
                onChange={(event) => setSelectedContactId(event.target.value)}
              >
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {`${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || contact.email || 'Admin'}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-swiss-charcoal">
              Message
              <textarea
                className="mt-1 h-32 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-swiss-mint focus:outline-none focus:ring-2 focus:ring-swiss-mint/20"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Describe the issue you need help with…"
              />
            </label>
            <Button type="submit" leftIcon={EnvelopeIcon} disabled={status === 'sending'} className="w-full">
              {status === 'sending' ? 'Sending…' : 'Send to support'}
            </Button>
            {status === 'success' && <p className="text-sm font-semibold text-emerald-600">Support request sent successfully.</p>}
            {status === 'error' && <p className="text-sm font-semibold text-rose-600">We couldn’t send your message. Try again.</p>}
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-swiss-charcoal">Recent support tickets</h2>
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-swiss-teal" />
          </div>
          <ul className="mt-6 space-y-3">
            {conversations.length === 0 && (
              <li className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                No support tickets yet. Send a message to the admin team to start a conversation.
              </li>
            )}
            {conversations.map((conversation) => (
              <li key={conversation.id} className="rounded-xl border border-gray-100 p-4">
                <p className="text-sm font-semibold text-swiss-charcoal">{conversation.title ?? 'Support conversation'}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Last activity:{' '}
                  {conversation.messages?.length
                    ? new Date(conversation.messages[0].createdAt).toLocaleString()
                    : 'Awaiting response'}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  };

  return (
    <DashboardLayout title="Support" subtitle="Reach the Pro Crèche Solutions team when you need assistance">
      {renderContent()}
    </DashboardLayout>
  );
};

export default FoundationSupportPage;
