import * as React from 'react';

type SystemMetrics = {
  cpu: { usage: number; cores: number };
  memory: { usage: number; used: number; total: number };
  network?: { in?: number; out?: number };
};

type UserStats = {
  totalUsers: number;
  newUsersToday: number;
  activeUsers: number;
};

type DatabaseStats = {
  connections: number;
  slowQueries: number;
  storageUsed: number;
  storageTotal: number;
};

type ApplicationStats = {
  requests: number;
  latency: { p50: number; p95: number; p99: number };
  errorRate: number;
  throughput: number;
};

type SystemAlert = { id: string; type: string; severity: string; message: string; value: number; threshold: number; timestamp: string; resolved: boolean };

export function useAdminDashboard() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [systemMetrics, setSystemMetrics] = React.useState<SystemMetrics>({
    cpu: { usage: 22, cores: 8 },
    memory: { usage: 45, used: 8 * 1024 ** 3, total: 16 * 1024 ** 3 },
    network: { in: 120, out: 80 },
  });

  const [userStats, setUserStats] = React.useState<UserStats>({
    totalUsers: 1245,
    newUsersToday: 12,
    activeUsers: 842,
  });

  const [databaseStats, setDatabaseStats] = React.useState<DatabaseStats>({
    connections: 24,
    slowQueries: 0,
    storageUsed: 12,
    storageTotal: 64,
  });

  const [applicationStats, setApplicationStats] = React.useState<ApplicationStats>({
    requests: 5234,
    latency: { p50: 120, p95: 350, p99: 600 },
    errorRate: 0.4,
    throughput: 120,
  });

  const [systemAlerts, setSystemAlerts] = React.useState<SystemAlert[]>([
    { id: '1', type: 'cpu', severity: 'low', message: 'CPU usage normal', value: 22, threshold: 80, timestamp: new Date().toISOString(), resolved: true },
  ]);

  const resolveAlert = async (id: string) => {
    setSystemAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
  };

  const restartService = async (_name: string) => {
    await new Promise((r) => setTimeout(r, 500));
  };

  const clearCache = async () => {
    await new Promise((r) => setTimeout(r, 300));
  };

  const runDiagnostics = async () => {
    await new Promise((r) => setTimeout(r, 800));
    return { ok: true };
  };

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 300));
    } catch (e: any) {
      setError(e?.message || 'Failed to refresh');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    systemMetrics,
    userStats,
    systemAlerts,
    databaseStats,
    applicationStats,
    resolveAlert,
    restartService,
    clearCache,
    runDiagnostics,
    refreshData,
  };
}
