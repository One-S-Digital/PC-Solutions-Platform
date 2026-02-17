import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { 
  AdminCard, 
  AdminButton, 
  AdminMetric, 
  AdminBadge,
  AdminTable,
  AdminTableHeader,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminTableHeaderCell,
} from '@repo/ui';

interface EmailTemplate {
  id: string;
  name: string;
  event: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmailAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  eventsBreakdown: Array<{ event: string; count: number }>;
}

interface EmailLog {
  id: string;
  event: string;
  recipient: string;
  status: string;
  createdAt: string;
  error?: string;
}

export default function EmailNotificationPage() {
  const { t } = useTranslation(['admin', 'common']);
  const { getToken } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'analytics' | 'logs' | 'send'>('templates');
  const [showSendForm, setShowSendForm] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateModalMode, setTemplateModalMode] = useState<'create' | 'edit' | 'preview'>('create');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    event: '',
    category: 'userManagement',
    subject: '',
    htmlContent: '',
    textContent: '',
    variables: '',
    isActive: true,
  });
  const [previewPayload, setPreviewPayload] = useState('{\n  "firstName": "Alex"\n}');
  const previewPayloadParsed = useMemo(() => {
    try {
      return { ok: true as const, value: previewPayload ? JSON.parse(previewPayload) : {} };
    } catch {
      return { ok: false as const, value: {} };
    }
  }, [previewPayload]);
  const [sendForm, setSendForm] = useState({
    event: '',
    recipient: '',
    recipientName: '',
    payload: '',
  });

  const fetchTemplates = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/email-notifications/templates', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data);
    } catch (err: any) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const openCreateTemplate = () => {
    setTemplateModalMode('create');
    setSelectedTemplate(null);
    setTemplateForm({
      name: '',
      event: '',
      category: 'userManagement',
      subject: '',
      htmlContent: '',
      textContent: '',
      variables: '',
      isActive: true,
    });
    setIsTemplateModalOpen(true);
  };

  const openEditTemplate = (template: EmailTemplate) => {
    setTemplateModalMode('edit');
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name || '',
      event: template.event || '',
      category: template.category || 'userManagement',
      subject: template.subject || '',
      htmlContent: template.htmlContent || '',
      textContent: template.textContent || '',
      variables: (template.variables || []).join(', '),
      isActive: template.isActive ?? true,
    });
    setIsTemplateModalOpen(true);
  };

  const openPreviewTemplate = (template: EmailTemplate) => {
    setTemplateModalMode('preview');
    setSelectedTemplate(template);
    setPreviewPayload('{\n  "firstName": "Alex"\n}');
    setIsTemplateModalOpen(true);
  };

  const processTemplateString = (template: string, payload: Record<string, any>) => {
    let processed = template;
    Object.keys(payload || {}).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, payload[key] ?? '');
    });
    return processed;
  };

  const saveTemplate = async () => {
    if (isSavingTemplate) return;
    setIsSavingTemplate(true);
    try {
      const token = await getToken();
      const variables = templateForm.variables
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

      const payload = {
        name: templateForm.name,
        event: templateForm.event,
        category: templateForm.category,
        subject: templateForm.subject,
        htmlContent: templateForm.htmlContent,
        textContent: templateForm.textContent,
        variables,
        isActive: templateForm.isActive,
      };

      const isEdit = templateModalMode === 'edit' && selectedTemplate?.id;
      const url = isEdit
        ? `/api/admin/email-notifications/templates/${selectedTemplate!.id}`
        : '/api/admin/email-notifications/templates';

      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const msg = await response.text().catch(() => '');
        throw new Error(msg || 'Failed to save template');
      }

      setIsTemplateModalOpen(false);
      await fetchTemplates();
      alert(
        isEdit
          ? t('admin:settings.emailNotifications.templates.alerts.updated', { defaultValue: 'Template updated' })
          : t('admin:settings.emailNotifications.templates.alerts.created', { defaultValue: 'Template created' })
      );
    } catch (err: any) {
      alert(
        t('admin:settings.emailNotifications.templates.alerts.saveFailed', {
          message: err.message,
          defaultValue: `Failed to save template: ${err.message}`,
        })
      );
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/email-notifications/analytics?timeRange=30d', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/email-notifications/logs?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch email logs');
      }

      const data = await response.json();
      setEmailLogs(data);
    } catch (err: any) {
      console.error('Failed to fetch email logs:', err);
    }
  };

  // Clerk's getToken is stable in practice; this is intentionally run once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([
        fetchTemplates(),
        fetchAnalytics(),
        fetchEmailLogs(),
      ]);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleSendEmail = async () => {
    try {
      const token = await getToken();
      const payload = sendForm.payload ? JSON.parse(sendForm.payload) : {};

      const response = await fetch('/api/admin/email-notifications/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: sendForm.event,
          recipient: sendForm.recipient,
          recipientName: sendForm.recipientName,
          payload,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      alert(t('admin:settings.emailNotifications.send.alerts.sent'));
      setSendForm({ event: '', recipient: '', recipientName: '', payload: '' });
      fetchEmailLogs();
    } catch (err: any) {
      alert(t('admin:settings.emailNotifications.send.alerts.sendFailed', { message: err.message }));
    }
  };

  const handleBulkSend = async () => {
    try {
      const token = await getToken();
      const recipients = sendForm.recipient.split(',').map(email => email.trim());
      const payload = sendForm.payload ? JSON.parse(sendForm.payload) : {};

      const response = await fetch('/api/admin/email-notifications/bulk-send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients,
          event: sendForm.event,
          payload,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send bulk emails');
      }

      const result = await response.json();
      alert(t('admin:settings.emailNotifications.send.alerts.bulkSent', { sent: result.sent, failed: result.failed }));
      setSendForm({ event: '', recipient: '', recipientName: '', payload: '' });
      fetchEmailLogs();
    } catch (err: any) {
      alert(t('admin:settings.emailNotifications.send.alerts.bulkFailed', { message: err.message }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'low';
      case 'delivered': return 'low';
      case 'opened': return 'medium';
      case 'clicked': return 'high';
      case 'bounced': return 'critical';
      case 'failed': return 'critical';
      default: return 'low';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'authentication': return 'critical';
      case 'userManagement': return 'medium';
      case 'jobRecruitment': return 'low';
      case 'messaging': return 'low';
      case 'marketplace': return 'medium';
      case 'subscription': return 'high';
      case 'systemAdmin': return 'critical';
      default: return 'low';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen admin-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-accent mx-auto mb-4"></div>
          <p className="text-admin-muted">{t('admin:settings.emailNotifications.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen admin-app">
      {/* Header */}
      <div className="admin-header sticky top-0 z-40 backdrop-blur bg-admin-surface/80 border-b border-admin-border">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1.5 rounded-full bg-admin-accent"></div>
            <h1 className="text-admin-text font-semibold tracking-tight">{t('admin:settings.emailNotifications.title')}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <AdminButton 
              variant="primary" 
              size="sm"
              onClick={() => setActiveTab('send')}
            >
              {t('admin:settings.emailNotifications.sendEmail')}
            </AdminButton>
            <AdminButton 
              variant="outline" 
              size="sm"
              onClick={() => {
                fetchTemplates();
                fetchAnalytics();
                fetchEmailLogs();
              }}
            >
              {t('admin:settings.emailNotifications.refresh')}
            </AdminButton>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Analytics Overview */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <AdminMetric
              label={t('admin:settings.emailNotifications.analytics.labels.emailsSent')}
              value={analytics.totalSent.toLocaleString()}
              change={{ value: 5, type: 'increase' }}
              icon="📧"
            />
            <AdminMetric
              label={t('admin:settings.emailNotifications.analytics.labels.deliveryRate')}
              value={`${analytics.deliveryRate.toFixed(1)}%`}
              change={{ value: 2, type: 'increase' }}
              icon="✅"
            />
            <AdminMetric
              label={t('admin:settings.emailNotifications.analytics.labels.openRate')}
              value={`${analytics.openRate.toFixed(1)}%`}
              change={{ value: 3, type: 'increase' }}
              icon="👁️"
            />
            <AdminMetric
              label={t('admin:settings.emailNotifications.analytics.labels.clickRate')}
              value={`${analytics.clickRate.toFixed(1)}%`}
              change={{ value: 1, type: 'increase' }}
              icon="🖱️"
            />
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'templates', label: t('admin:settings.emailNotifications.tabs.templates') },
              { id: 'analytics', label: t('admin:settings.emailNotifications.tabs.analytics') },
              { id: 'logs', label: t('admin:settings.emailNotifications.tabs.logs') },
              { id: 'send', label: t('admin:settings.emailNotifications.tabs.send') },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-admin-accent text-admin-accent'
                    : 'border-transparent text-admin-muted hover:text-admin-text hover:border-admin-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <AdminCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-admin-text">{t('admin:settings.emailNotifications.templates.title')}</h3>
              <AdminButton variant="primary" size="sm" onClick={openCreateTemplate}>
                {t('admin:settings.emailNotifications.templates.createTemplate')}
              </AdminButton>
            </div>
            
            <div className="overflow-x-auto">
              <AdminTable>
                <AdminTableHeader>
                  <AdminTableRow>
                    <AdminTableHeaderCell>{t('admin:settings.emailNotifications.templates.tableHeaders.name')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('admin:settings.emailNotifications.templates.tableHeaders.event')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('admin:settings.emailNotifications.templates.tableHeaders.category')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('admin:settings.emailNotifications.templates.tableHeaders.subject')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('admin:settings.emailNotifications.templates.tableHeaders.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('admin:settings.emailNotifications.templates.tableHeaders.updated')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('admin:settings.emailNotifications.templates.tableHeaders.actions')}</AdminTableHeaderCell>
                  </AdminTableRow>
                </AdminTableHeader>
                <AdminTableBody>
                  {templates.map((template) => (
                    <AdminTableRow key={template.id}>
                      <AdminTableCell>{template.name}</AdminTableCell>
                      <AdminTableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{template.event}</code>
                      </AdminTableCell>
                      <AdminTableCell>
                        <AdminBadge variant={getCategoryColor(template.category)}>
                          {template.category}
                        </AdminBadge>
                      </AdminTableCell>
                      <AdminTableCell>{template.subject}</AdminTableCell>
                      <AdminTableCell>
                        <AdminBadge variant={template.isActive ? 'low' : 'medium'}>
                          {template.isActive ? t('admin:settings.emailNotifications.templates.status.active') : t('admin:settings.emailNotifications.templates.status.inactive')}
                        </AdminBadge>
                      </AdminTableCell>
                      <AdminTableCell>
                        {new Date(template.updatedAt).toLocaleDateString()}
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className="flex gap-2">
                          <AdminButton variant="outline" size="sm" onClick={() => openEditTemplate(template)}>
                            {t('admin:settings.emailNotifications.templates.buttons.edit')}
                          </AdminButton>
                          <AdminButton variant="secondary" size="sm" onClick={() => openPreviewTemplate(template)}>
                            {t('admin:settings.emailNotifications.templates.buttons.preview')}
                          </AdminButton>
                        </div>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            </div>
          </AdminCard>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <AdminCard className="p-6">
              <h3 className="text-lg font-semibold text-admin-text mb-4">{t('admin:settings.emailNotifications.analytics.performance.title')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">{t('admin:settings.emailNotifications.analytics.labels.totalSent')}</label>
                  <p className="text-2xl font-bold text-admin-text">{analytics.totalSent.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">{t('admin:settings.emailNotifications.analytics.labels.delivered')}</label>
                  <p className="text-2xl font-bold text-admin-text">{analytics.totalDelivered.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">{t('admin:settings.emailNotifications.analytics.labels.opened')}</label>
                  <p className="text-2xl font-bold text-admin-text">{analytics.totalOpened.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">{t('admin:settings.emailNotifications.analytics.labels.clicked')}</label>
                  <p className="text-2xl font-bold text-admin-text">{analytics.totalClicked.toLocaleString()}</p>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="p-6">
              <h3 className="text-lg font-semibold text-admin-text mb-4">{t('admin:settings.emailNotifications.analytics.eventsBreakdown.title')}</h3>
              <div className="space-y-3">
                {analytics.eventsBreakdown.map((event) => (
                  <div key={event.event} className="flex items-center justify-between">
                    <span className="text-admin-text">{event.event}</span>
                    <AdminBadge variant="low">{event.count}</AdminBadge>
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <AdminCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-admin-text">{t('admin:settings.emailNotifications.logs.title')}</h3>
              <AdminButton 
                variant="outline" 
                size="sm"
                onClick={fetchEmailLogs}
              >
                {t('admin:settings.emailNotifications.refresh')}
              </AdminButton>
            </div>
            
            <div className="overflow-x-auto">
              <AdminTable>
                <AdminTableHeader>
                  <AdminTableRow>
                    <AdminTableHeaderCell>{t('admin:settings.emailNotifications.logs.tableHeaders.event')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('admin:settings.emailNotifications.logs.tableHeaders.recipient')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('admin:settings.emailNotifications.logs.tableHeaders.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('admin:settings.emailNotifications.logs.tableHeaders.sentAt')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('admin:settings.emailNotifications.logs.tableHeaders.error')}</AdminTableHeaderCell>
                  </AdminTableRow>
                </AdminTableHeader>
                <AdminTableBody>
                  {emailLogs.map((log) => (
                    <AdminTableRow key={log.id}>
                      <AdminTableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{log.event}</code>
                      </AdminTableCell>
                      <AdminTableCell>{log.recipient}</AdminTableCell>
                      <AdminTableCell>
                        <AdminBadge variant={getStatusColor(log.status)}>
                          {log.status}
                        </AdminBadge>
                      </AdminTableCell>
                      <AdminTableCell>
                        {new Date(log.createdAt).toLocaleString()}
                      </AdminTableCell>
                      <AdminTableCell>
                        {log.error ? (
                          <span className="text-red-500 text-xs">{log.error}</span>
                        ) : '-'}
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            </div>
          </AdminCard>
        )}

        {/* Send Email Tab */}
        {activeTab === 'send' && (
          <AdminCard className="p-6">
            <h3 className="text-lg font-semibold text-admin-text mb-6">{t('admin:settings.emailNotifications.send.title')}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text mb-1">{t('admin:settings.emailNotifications.send.eventType')}</label>
                <select 
                  className="admin-input w-full px-3 py-2"
                  value={sendForm.event}
                  onChange={(e) => setSendForm(prev => ({ ...prev, event: e.target.value }))}
                >
                  <option value="">{t('admin:settings.emailNotifications.send.selectEventType')}</option>
                  <option value="account_verification">{t('admin:settings.emailNotifications.send.eventTypes.account_verification')}</option>
                  <option value="password_reset">{t('admin:settings.emailNotifications.send.eventTypes.password_reset')}</option>
                  <option value="welcome_email">{t('admin:settings.emailNotifications.send.eventTypes.welcome_email')}</option>
                  <option value="job_application_received">{t('admin:settings.emailNotifications.send.eventTypes.job_application_received')}</option>
                  <option value="new_message">{t('admin:settings.emailNotifications.send.eventTypes.new_message')}</option>
                  <option value="order_confirmation">{t('admin:settings.emailNotifications.send.eventTypes.order_confirmation')}</option>
                  <option value="subscription_activation">{t('admin:settings.emailNotifications.send.eventTypes.subscription_activation')}</option>
                  <option value="system_maintenance">{t('admin:settings.emailNotifications.send.eventTypes.system_maintenance')}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-admin-text mb-1">{t('admin:settings.emailNotifications.send.recipientEmail')}</label>
                <input 
                  type="text"
                  className="admin-input w-full px-3 py-2"
                  placeholder={t('admin:settings.emailNotifications.send.recipientEmailPlaceholder')}
                  value={sendForm.recipient}
                  onChange={(e) => setSendForm(prev => ({ ...prev, recipient: e.target.value }))}
                />
                <p className="text-xs text-admin-muted mt-1">
                  {t('admin:settings.emailNotifications.send.recipientEmailHint')}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-admin-text mb-1">{t('admin:settings.emailNotifications.send.recipientName')}</label>
                <input 
                  type="text"
                  className="admin-input w-full px-3 py-2"
                  placeholder={t('admin:settings.emailNotifications.send.recipientNamePlaceholder')}
                  value={sendForm.recipientName}
                  onChange={(e) => setSendForm(prev => ({ ...prev, recipientName: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-admin-text mb-1">{t('admin:settings.emailNotifications.send.templateVariables')}</label>
                <textarea 
                  className="admin-input w-full px-3 py-2"
                  rows={6}
                  placeholder={t('admin:settings.emailNotifications.send.templateVariablesPlaceholder')}
                  value={sendForm.payload}
                  onChange={(e) => setSendForm(prev => ({ ...prev, payload: e.target.value }))}
                />
                <p className="text-xs text-admin-muted mt-1">
                  {t('admin:settings.emailNotifications.send.templateVariablesHint')}
                </p>
              </div>
              
              <div className="flex gap-3">
                <AdminButton 
                  variant="primary"
                  onClick={handleSendEmail}
                  disabled={!sendForm.event || !sendForm.recipient}
                >
                  {t('admin:settings.emailNotifications.send.buttons.sendEmail')}
                </AdminButton>
                <AdminButton 
                  variant="secondary"
                  onClick={handleBulkSend}
                  disabled={!sendForm.event || !sendForm.recipient}
                >
                  {t('admin:settings.emailNotifications.send.buttons.sendBulkEmail')}
                </AdminButton>
              </div>
            </div>
          </AdminCard>
        )}

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Template modal (create / edit / preview) */}
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setIsTemplateModalOpen(false)}
            />
            <div className="relative w-full max-w-4xl rounded-lg bg-white shadow-xl border border-admin-border">
              <div className="flex items-center justify-between px-6 py-4 border-b border-admin-border">
                <h3 className="text-lg font-semibold text-admin-text">
                  {templateModalMode === 'create'
                    ? t('admin:settings.emailNotifications.templates.createTemplate')
                    : templateModalMode === 'edit'
                      ? t('admin:settings.emailNotifications.templates.buttons.edit')
                      : t('admin:settings.emailNotifications.templates.buttons.preview')}
                </h3>
                <button
                  className="text-admin-muted hover:text-admin-text"
                  onClick={() => setIsTemplateModalOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {templateModalMode !== 'preview' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-admin-text mb-1">
                          {t('admin:settings.emailNotifications.templates.tableHeaders.name')}
                        </label>
                        <input
                          className="admin-input w-full px-3 py-2"
                          value={templateForm.name}
                          onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))}
                          placeholder="e.g. Welcome email"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-admin-text mb-1">
                          {t('admin:settings.emailNotifications.templates.tableHeaders.event')}
                        </label>
                        <input
                          className="admin-input w-full px-3 py-2"
                          value={templateForm.event}
                          onChange={(e) => setTemplateForm((p) => ({ ...p, event: e.target.value }))}
                          placeholder="e.g. welcome_email"
                          disabled={templateModalMode === 'edit'}
                        />
                        {templateModalMode === 'edit' && (
                          <p className="text-xs text-admin-muted mt-1">Event is immutable for existing templates.</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-admin-text mb-1">
                          {t('admin:settings.emailNotifications.templates.tableHeaders.category')}
                        </label>
                        <select
                          className="admin-input w-full px-3 py-2"
                          value={templateForm.category}
                          onChange={(e) => setTemplateForm((p) => ({ ...p, category: e.target.value }))}
                        >
                          <option value="authentication">authentication</option>
                          <option value="userManagement">userManagement</option>
                          <option value="jobRecruitment">jobRecruitment</option>
                          <option value="messaging">messaging</option>
                          <option value="marketplace">marketplace</option>
                          <option value="subscription">subscription</option>
                          <option value="systemAdmin">systemAdmin</option>
                          <option value="marketing">marketing</option>
                          <option value="leadManagement">leadManagement</option>
                          <option value="contentModeration">contentModeration</option>
                        </select>
                      </div>

                      <div className="flex items-end gap-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-admin-text">
                          <input
                            type="checkbox"
                            checked={templateForm.isActive}
                            onChange={(e) => setTemplateForm((p) => ({ ...p, isActive: e.target.checked }))}
                          />
                          {t('admin:settings.emailNotifications.templates.tableHeaders.status')}
                        </label>
                        <span className="text-xs text-admin-muted">
                          {templateForm.isActive
                            ? t('admin:settings.emailNotifications.templates.status.active')
                            : t('admin:settings.emailNotifications.templates.status.inactive')}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-admin-text mb-1">
                        {t('admin:settings.emailNotifications.templates.tableHeaders.subject')}
                      </label>
                      <input
                        className="admin-input w-full px-3 py-2"
                        value={templateForm.subject}
                        onChange={(e) => setTemplateForm((p) => ({ ...p, subject: e.target.value }))}
                        placeholder="e.g. Welcome, {{firstName}}!"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-admin-text mb-1">Variables (comma-separated)</label>
                      <input
                        className="admin-input w-full px-3 py-2"
                        value={templateForm.variables}
                        onChange={(e) => setTemplateForm((p) => ({ ...p, variables: e.target.value }))}
                        placeholder="e.g. firstName, dashboardUrl"
                      />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-admin-text mb-1">HTML content</label>
                        <textarea
                          className="admin-input w-full px-3 py-2 font-mono text-xs"
                          rows={12}
                          value={templateForm.htmlContent}
                          onChange={(e) => setTemplateForm((p) => ({ ...p, htmlContent: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-admin-text mb-1">Text content</label>
                        <textarea
                          className="admin-input w-full px-3 py-2 font-mono text-xs"
                          rows={12}
                          value={templateForm.textContent}
                          onChange={(e) => setTemplateForm((p) => ({ ...p, textContent: e.target.value }))}
                        />
                      </div>
                    </div>
                  </>
                )}

                {templateModalMode === 'preview' && selectedTemplate && (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-admin-text mb-1">Preview payload (JSON)</label>
                        <textarea
                          className="admin-input w-full px-3 py-2 font-mono text-xs"
                          rows={10}
                          value={previewPayload}
                          onChange={(e) => setPreviewPayload(e.target.value)}
                        />
                        <p className="text-xs text-admin-muted mt-1">
                          Variables: {(selectedTemplate.variables || []).join(', ') || '—'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-admin-text mb-1">Rendered subject</label>
                        <div className="rounded border border-admin-border bg-admin-surface p-3 text-sm">
                          {!previewPayloadParsed.ok
                            ? 'Invalid JSON payload'
                            : processTemplateString(selectedTemplate.subject || '', previewPayloadParsed.value)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-admin-text mb-1">Rendered HTML</label>
                        <div className="rounded border border-admin-border bg-white p-3">
                          {!previewPayloadParsed.ok ? (
                            <div className="text-sm text-red-600">Invalid JSON payload</div>
                          ) : (
                            <div
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(
                                  processTemplateString(selectedTemplate.htmlContent || '', previewPayloadParsed.value)
                                ),
                              }}
                            />
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-admin-text mb-1">Rendered text</label>
                        <pre className="rounded border border-admin-border bg-admin-surface p-3 text-xs whitespace-pre-wrap">
                          {!previewPayloadParsed.ok
                            ? 'Invalid JSON payload'
                            : processTemplateString(selectedTemplate.textContent || '', previewPayloadParsed.value)}
                        </pre>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-admin-border">
                <AdminButton variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
                  {t('common:cancel', { defaultValue: 'Cancel' })}
                </AdminButton>
                {templateModalMode !== 'preview' && (
                  <AdminButton
                    variant="primary"
                    onClick={saveTemplate}
                    disabled={isSavingTemplate || !templateForm.name || !templateForm.event || !templateForm.subject}
                  >
                    {isSavingTemplate ? 'Saving…' : t('common:save', { defaultValue: 'Save' })}
                  </AdminButton>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}