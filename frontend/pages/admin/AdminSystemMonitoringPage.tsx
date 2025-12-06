import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card';
import { 
    ServerStackIcon, CpuChipIcon, CogIcon,
    ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, ShieldCheckIcon, CloudArrowDownIcon, WrenchScrewdriverIcon, ArrowPathIcon,
    CommandLineIcon, CircleStackIcon
} from '@heroicons/react/24/outline';
import { SystemEventType, SystemStatusLevel, LogEntry, SystemMonitoringData } from '../../types';
import { useTranslation } from 'react-i18next';
import Tabs from '../../components/ui/Tabs';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// Default monitoring data structure for fallback
const DEFAULT_SYSTEM_MONITORING_DATA: SystemMonitoringData = {
  systemStatus: {
    status: 'Operational',
    components: {
      api: 'Operational',
      database: 'Operational',
      authService: 'Operational',
    },
  },
  metadata: {
    environment: 'Production',
    version: '1.0.0',
    uptimeMinutes: 0,
    lastHealthCheck: new Date().toISOString(),
  },
  serverPerformance: {
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    uptimeDays: 0,
  },
  databasePerformance: {
    activeConnections: 0,
    maxConnections: 100,
    avgQueryTimeMs: 0,
    storageUsedGb: 0,
    storageTotalGb: 100,
    status: 'Healthy',
  },
  appPerformance: {
    activeUsers: 0,
    requestsPerMinute: 0,
    avgResponseTimeMs: 0,
    errorRate: 0,
  },
  events: [],
};

const ProgressBar: React.FC<{ value: number; colorClass: string }> = ({ value, colorClass }) => (
  <div className="w-full bg-gray-200 rounded-full h-2.5">
    <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${value}%` }}></div>
  </div>
);

const getProgressBarColor = (value: number): string => {
  if (value > 90) return 'bg-swiss-coral';
  if (value > 70) return 'bg-yellow-500';
  return 'bg-swiss-mint';
};

const getStatusIndicator = (status: SystemStatusLevel) => {
  switch (status) {
    case 'Operational': return 'bg-green-500';
    case 'Degraded': return 'bg-yellow-500';
    case 'Outage': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
};

const AdminSystemMonitoringPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { authenticatedRequest } = useAuthenticatedApi();
  
  const [data, setData] = useState<SystemMonitoringData>(DEFAULT_SYSTEM_MONITORING_DATA);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, logsRes] = await Promise.all([
        authenticatedRequest<SystemMonitoringData>('/health/snapshot'),
        authenticatedRequest<LogEntry[]>('/system-monitoring/logs'),
      ]);

      if (healthRes.success && healthRes.data) {
        setData(healthRes.data);
      }
      if (logsRes.success && logsRes.data) {
        setLogEntries(logsRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch system monitoring data:', error);
      // Keep defaults on error
    } finally {
      setLoading(false);
    }
  }, [authenticatedRequest]);

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const eventIcons: Record<SystemEventType, React.ElementType> = {
    'Health Check': ShieldCheckIcon,
    'Database Backup': CloudArrowDownIcon,
    'Memory Alert': ExclamationTriangleIcon,
    'API Improvement': WrenchScrewdriverIcon,
  };
  
  const eventColors: Record<SystemEventType, string> = {
    'Health Check': 'text-green-500',
    'Database Backup': 'text-blue-500',
    'Memory Alert': 'text-yellow-600',
    'API Improvement': 'text-purple-500',
  };

  const getEventTypeTranslation = (eventType: SystemEventType): string => {
    const key = eventType.replace(/\s/g, '');
    return t(`adminSystemMonitoringPage.eventTypes.${key}`, eventType);
  };

  const LogList: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
    if (logs.length === 0) {
      return <p className="text-center text-gray-400 py-8">{t('adminSystemMonitoringPage.rawLogConsole.emptyLogMessage')}</p>;
    }
    return (
      <div className="bg-swiss-charcoal text-white font-mono text-xs rounded-lg p-4 h-64 overflow-y-auto">
        {logs.map((log: LogEntry) => {
            const levelColor = log.level === 'ERROR' ? 'text-red-400' : log.level === 'WARN' ? 'text-yellow-400' : 'text-green-400';
            return (
                <div key={log.id} className="flex">
                    <span className="text-gray-500 mr-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`w-14 font-bold ${levelColor}`}>{`[${log.level}]`}</span>
                    <p className="flex-1 whitespace-pre-wrap">{log.message}</p>
                </div>
            );
        })}
      </div>
    );
  };

  const logTabs = [
    { label: t('adminSystemMonitoringPage.rawLogConsole.tabs.all'), content: <LogList logs={logEntries} /> },
    { label: t('adminSystemMonitoringPage.rawLogConsole.tabs.errors'), content: <LogList logs={logEntries.filter(l => l.level === 'ERROR')} /> },
    { label: t('adminSystemMonitoringPage.rawLogConsole.tabs.warnings'), content: <LogList logs={logEntries.filter(l => l.level === 'WARN')} /> },
    { label: t('adminSystemMonitoringPage.rawLogConsole.tabs.info'), content: <LogList logs={logEntries.filter(l => l.level === 'INFO')} /> },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
        <ServerStackIcon className="w-8 h-8 mr-3 text-swiss-mint" />
        {t('adminSystemMonitoringPage.title')}
      </h1>

      {/* Overall Status Banner */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center mb-4 sm:mb-0">
                <span className={`h-8 w-8 rounded-full flex items-center justify-center mr-4 ${getStatusIndicator(data.systemStatus.status)}`}>
                    {data.systemStatus.status === 'Operational' && <CheckCircleIcon className="w-6 h-6 text-white"/>}
                    {data.systemStatus.status !== 'Operational' && <ExclamationTriangleIcon className="w-6 h-6 text-white"/>}
                </span>
                <div>
                    <h2 className="text-xl font-semibold text-swiss-charcoal">{t('adminSystemMonitoringPage.overallStatus.title')}</h2>
                    <p className={`font-bold text-lg ${getStatusIndicator(data.systemStatus.status).replace('bg-', 'text-')}`}>
                        {t(`adminSystemMonitoringPage.overallStatus.${data.systemStatus.status.toLowerCase()}`)}
                    </p>
                </div>
            </div>
            <div className="flex space-x-4 text-sm">
                <div className="flex items-center"><span className={`h-2.5 w-2.5 rounded-full mr-2 ${getStatusIndicator(data.systemStatus.components.api)}`}></span> {t('adminSystemMonitoringPage.components.api')}</div>
                <div className="flex items-center"><span className={`h-2.5 w-2.5 rounded-full mr-2 ${getStatusIndicator(data.systemStatus.components.database)}`}></span> {t('adminSystemMonitoringPage.components.database')}</div>
                <div className="flex items-center"><span className={`h-2.5 w-2.5 rounded-full mr-2 ${getStatusIndicator(data.systemStatus.components.authService)}`}></span> {t('adminSystemMonitoringPage.components.authService')}</div>
            </div>
        </div>
      </Card>

      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <Card className="p-4"><p className="text-xs text-gray-500">{t('adminSystemMonitoringPage.metadata.environment')}</p><p className="font-semibold text-lg">{data.metadata.environment}</p></Card>
          <Card className="p-4"><p className="text-xs text-gray-500">{t('adminSystemMonitoringPage.metadata.version')}</p><p className="font-semibold text-lg">{data.metadata.version}</p></Card>
          <Card className="p-4"><p className="text-xs text-gray-500">{t('adminSystemMonitoringPage.metadata.uptime')}</p><p className="font-semibold text-lg">{Math.floor(data.metadata.uptimeMinutes / (60*24))} days</p></Card>
          <Card className="p-4"><p className="text-xs text-gray-500">{t('adminSystemMonitoringPage.metadata.lastCheck')}</p><p className="font-semibold text-lg">{new Date(data.metadata.lastHealthCheck).toLocaleTimeString()}</p></Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Server Performance */}
        <Card className="p-6">
            <h3 className="text-lg font-semibold text-swiss-charcoal mb-4 flex items-center"><CpuChipIcon className="w-6 h-6 mr-2 text-swiss-teal"/>{t('adminSystemMonitoringPage.serverPerformance.title')}</h3>
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-sm mb-1"><p>{t('adminSystemMonitoringPage.serverPerformance.cpuUsage')}</p><p className="font-medium">{data.serverPerformance.cpuUsage.toFixed(1)}%</p></div>
                    <ProgressBar value={data.serverPerformance.cpuUsage} colorClass={getProgressBarColor(data.serverPerformance.cpuUsage)} />
                </div>
                 <div>
                    <div className="flex justify-between text-sm mb-1"><p>{t('adminSystemMonitoringPage.serverPerformance.memoryUsage')}</p><p className="font-medium">{data.serverPerformance.memoryUsage.toFixed(1)}%</p></div>
                    <ProgressBar value={data.serverPerformance.memoryUsage} colorClass={getProgressBarColor(data.serverPerformance.memoryUsage)} />
                </div>
                 <div>
                    <div className="flex justify-between text-sm mb-1"><p>{t('adminSystemMonitoringPage.serverPerformance.diskUsage')}</p><p className="font-medium">{data.serverPerformance.diskUsage.toFixed(1)}%</p></div>
                    <ProgressBar value={data.serverPerformance.diskUsage} colorClass={getProgressBarColor(data.serverPerformance.diskUsage)} />
                </div>
                <div className="text-center pt-2">
                    <p className="text-sm text-gray-500">{t('adminSystemMonitoringPage.serverPerformance.uptimeDays')}</p>
                    <p className="text-2xl font-bold text-swiss-charcoal">{data.serverPerformance.uptimeDays}</p>
                </div>
            </div>
        </Card>

        {/* Database Performance */}
        <Card className="p-6">
            <h3 className="text-lg font-semibold text-swiss-charcoal mb-4 flex items-center"><CircleStackIcon className="w-6 h-6 mr-2 text-swiss-teal"/>{t('adminSystemMonitoringPage.databasePerformance.title')}</h3>
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-sm mb-1"><p>{t('adminSystemMonitoringPage.databasePerformance.activeConnections')}</p><p className="font-medium">{data.databasePerformance.activeConnections} / {data.databasePerformance.maxConnections}</p></div>
                    <ProgressBar value={(data.databasePerformance.activeConnections / data.databasePerformance.maxConnections) * 100} colorClass={getProgressBarColor((data.databasePerformance.activeConnections / data.databasePerformance.maxConnections) * 100)} />
                </div>
                <div className="flex justify-between text-sm items-center"><p>{t('adminSystemMonitoringPage.databasePerformance.queryTime')}</p><p className="font-medium text-lg">{data.databasePerformance.avgQueryTimeMs}ms</p></div>
                 <div>
                    <div className="flex justify-between text-sm mb-1"><p>{t('adminSystemMonitoringPage.databasePerformance.storage')}</p><p className="font-medium">{data.databasePerformance.storageUsedGb.toFixed(1)} / {data.databasePerformance.storageTotalGb} GB</p></div>
                    <ProgressBar value={(data.databasePerformance.storageUsedGb / data.databasePerformance.storageTotalGb) * 100} colorClass={getProgressBarColor((data.databasePerformance.storageUsedGb / data.databasePerformance.storageTotalGb) * 100)} />
                </div>
                <div className="text-center pt-2">
                    <p className="text-sm text-gray-500">{t('adminSystemMonitoringPage.databasePerformance.connectionHealth')}</p>
                    <p className={`text-xl font-bold ${data.databasePerformance.status === 'Healthy' ? 'text-green-600' : 'text-red-600'}`}>
                        {t(`adminSystemMonitoringPage.databasePerformance.${data.databasePerformance.status.toLowerCase()}`)}
                    </p>
                </div>
            </div>
        </Card>

        {/* Application Performance */}
        <Card className="p-6">
            <h3 className="text-lg font-semibold text-swiss-charcoal mb-4 flex items-center"><CogIcon className="w-6 h-6 mr-2 text-swiss-teal"/>{t('adminSystemMonitoringPage.appPerformance.title')}</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-2 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">{t('adminSystemMonitoringPage.appPerformance.activeUsers')}</p><p className="text-2xl font-bold">{data.appPerformance.activeUsers}</p></div>
                <div className="p-2 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">{t('adminSystemMonitoringPage.appPerformance.requestsPerMinute')}</p><p className="text-2xl font-bold">{data.appPerformance.requestsPerMinute}</p></div>
                <div className="p-2 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">{t('adminSystemMonitoringPage.appPerformance.avgResponseTime')}</p><p className="text-2xl font-bold">{data.appPerformance.avgResponseTimeMs}ms</p></div>
                <div className="p-2 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">{t('adminSystemMonitoringPage.appPerformance.errorRate')}</p><p className="text-2xl font-bold">{data.appPerformance.errorRate}%</p></div>
            </div>
        </Card>
      </div>

      {/* Recent System Events */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-swiss-charcoal mb-4 flex items-center">
            <ClockIcon className="w-6 h-6 mr-2" />
            {t('adminSystemMonitoringPage.recentEvents.title')}
        </h2>
<<<<<<< HEAD
        {data.events.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('adminSystemMonitoringPage.recentEvents.empty', 'No recent events')}</p>
        ) : (
          <div className="flow-root">
              <ul role="list" className="-mb-8">
              {data.events.map((event, eventIdx) => {
                  const EventIcon = eventIcons[event.type] || ArrowPathIcon;
                  return (
                  <li key={event.id}>
                      <div className="relative pb-8">
                      {eventIdx !== data.events.length - 1 ? (
                          <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex items-start space-x-3">
                          <div>
                          <div className="relative px-1">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 ring-8 ring-white">
                                  <EventIcon className={`h-5 w-5 ${eventColors[event.type]}`} aria-hidden="true" />
                              </div>
                          </div>
                          </div>
                          <div className="min-w-0 flex-1 py-1.5">
                          <div className="text-sm text-gray-500">
                              <span className="font-medium text-gray-900">{getEventTypeTranslation(event.type)}</span>
                              <span className="whitespace-nowrap ml-2">({new Date(event.timestamp).toLocaleString()})</span>
                          </div>
                          <p className="mt-0.5 text-sm text-gray-700">{event.message}</p>
                          </div>
                      </div>
                      </div>
                  </li>
                  );
              })}
              </ul>
          </div>
        )}
      </Card>

      {/* Raw Log Console */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-swiss-charcoal mb-4 flex items-center">
            <CommandLineIcon className="w-6 h-6 mr-2 text-swiss-teal"/>
            {t('adminSystemMonitoringPage.rawLogConsole.title')}
        </h2>
        <Tabs tabs={logTabs} variant="pills" />
      </Card>

    </div>
  );
};

export default AdminSystemMonitoringPage;
