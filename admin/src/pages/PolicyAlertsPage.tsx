import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Textarea, Select, Badge } from '@repo/ui';
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Globe,
  Clock,
  User,
  RefreshCw,
  BarChart3,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';

interface PolicyAlert {
  id: string;
  title: string;
  message: string;
  alertType: string;
  regions: string[];
  isActive: boolean;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface PolicyAlertsSummary {
  totalAlerts: number;
  activeAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  infoAlerts: number;
  recentAlerts: PolicyAlert[];
  regionStats: Array<{
    region: string;
    count: number;
  }>;
}

const PolicyAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<PolicyAlert[]>([]);
  const [summary, setSummary] = useState<PolicyAlertsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedAlertType, setSelectedAlertType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts');
  const [newAlert, setNewAlert] = useState({
    title: '',
    message: '',
    alertType: '',
    regions: [] as string[],
    isActive: true,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  const availableRegions = [
    { code: 'CH', name: 'Switzerland' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'IT', name: 'Italy' },
    { code: 'AT', name: 'Austria' },
    { code: 'LI', name: 'Liechtenstein' },
  ];

  useEffect(() => {
    fetchAlerts();
    fetchSummary();
  }, [searchTerm, selectedRegion, selectedAlertType, selectedStatus]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedRegion) params.append('region', selectedRegion);
      if (selectedAlertType) params.append('alertType', selectedAlertType);
      if (selectedStatus) params.append('isActive', selectedStatus);
      
      const response = await fetch(`/api/policy-alerts?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setAlerts(data.data.alerts);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      toast.error('Failed to load policy alerts');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/policy-alerts/dashboard/summary');
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      toast.error('Failed to load alerts summary');
    }
  };

  const handleCreateAlert = async () => {
    try {
      const response = await fetch('/api/policy-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newAlert,
          createdBy: 'admin', // This should come from auth context
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Policy alert created successfully');
        setIsCreateDialogOpen(false);
        setNewAlert({
          title: '',
          message: '',
          alertType: '',
          regions: [],
          isActive: true,
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
        });
        fetchAlerts();
        fetchSummary();
      } else {
        throw new Error(data.message || 'Failed to create policy alert');
      }
    } catch (error) {
      console.error('Failed to create alert:', error);
      toast.error('Failed to create policy alert');
    }
  };

  const handleToggleAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/policy-alerts/${alertId}/toggle`, {
        method: 'PUT',
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Alert status updated successfully');
        fetchAlerts();
        fetchSummary();
      } else {
        throw new Error(data.message || 'Failed to toggle alert');
      }
    } catch (error) {
      console.error('Failed to toggle alert:', error);
      toast.error('Failed to toggle alert status');
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this policy alert?')) return;

    try {
      const response = await fetch(`/api/policy-alerts/${alertId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Policy alert deleted successfully');
        fetchAlerts();
        fetchSummary();
      } else {
        throw new Error(data.message || 'Failed to delete policy alert');
      }
    } catch (error) {
      console.error('Failed to delete alert:', error);
      toast.error('Failed to delete policy alert');
    }
  };

  const getAlertTypeColor = (alertType: string) => {
    switch (alertType) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'info';
    }
  };

  const getAlertTypeIcon = (alertType: string) => {
    switch (alertType) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'info':
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRegionName = (code: string) => {
    const region = availableRegions.find(r => r.code === code);
    return region ? region.name : code;
  };

  const tabs = [
    { id: 'alerts', label: 'Policy Alerts' },
    { id: 'regions', label: 'Regional Overview' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Policy Alerts</h1>
          <p className="text-muted-foreground">
            Manage policy alerts and notifications for different regions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAlerts} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Alert
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold">{summary.totalAlerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{summary.activeAlerts}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold">{summary.criticalAlerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Warning</p>
                <p className="text-2xl font-bold">{summary.warningAlerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Info</p>
                <p className="text-2xl font-bold">{summary.infoAlerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-swiss-mint text-swiss-mint'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'alerts' && (
          <>
            {/* Filters */}
            <Card className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search alerts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  options={[
                    { value: '', label: 'All Regions' },
                    ...availableRegions.map((region) => ({
                      value: region.code,
                      label: region.name,
                    })),
                  ]}
                />
                <Select
                  value={selectedAlertType}
                  onChange={(e) => setSelectedAlertType(e.target.value)}
                  options={[
                    { value: '', label: 'All Types' },
                    { value: 'info', label: 'Info' },
                    { value: 'warning', label: 'Warning' },
                    { value: 'critical', label: 'Critical' },
                  ]}
                />
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  options={[
                    { value: '', label: 'All Status' },
                    { value: 'true', label: 'Active' },
                    { value: 'false', label: 'Inactive' },
                  ]}
                />
              </div>
            </Card>

            {/* Alerts List */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Policy Alerts</h2>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-4">
                      {getAlertTypeIcon(alert.alertType)}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{alert.title}</h3>
                          <Badge variant={getAlertTypeColor(alert.alertType)}>
                            {alert.alertType}
                          </Badge>
                          <Badge variant={alert.isActive ? 'success' : 'info'}>
                            {alert.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{alert.regions.map(getRegionName).join(', ')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{alert.creator.firstName} {alert.creator.lastName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleAlert(alert.id)}
                      >
                        {alert.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteAlert(alert.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No policy alerts found
                  </p>
                )}
              </div>
            </Card>
          </>
        )}

        {activeTab === 'regions' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Regional Alert Statistics</h2>
            <div className="space-y-4">
              {summary?.regionStats.map((stat) => (
                <div key={stat.region} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4" />
                    <div>
                      <h3 className="font-medium">{getRegionName(stat.region)}</h3>
                      <p className="text-sm text-muted-foreground">Region: {stat.region}</p>
                    </div>
                  </div>
                  <Badge variant="info">{stat.count} alerts</Badge>
                </div>
              ))}
              {(!summary?.regionStats || summary.regionStats.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No regional statistics available
                </p>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Create Alert Dialog */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Create New Policy Alert</h2>
            <div className="space-y-4">
              <Input
                label="Title"
                value={newAlert.title}
                onChange={(e) => setNewAlert(prev => ({ ...prev, title: e.target.value }))}
              />
              <Textarea
                label="Message"
                value={newAlert.message}
                onChange={(e) => setNewAlert(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
              />
              <Select
                label="Alert Type"
                value={newAlert.alertType}
                onChange={(e) => setNewAlert(prev => ({ ...prev, alertType: e.target.value }))}
                options={[
                  { value: '', label: 'Select alert type' },
                  { value: 'info', label: 'Info' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'critical', label: 'Critical' },
                ]}
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Regions</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableRegions.map((region) => (
                    <div key={region.code} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={region.code}
                        checked={newAlert.regions.includes(region.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewAlert(prev => ({
                              ...prev,
                              regions: [...prev.regions, region.code],
                            }));
                          } else {
                            setNewAlert(prev => ({
                              ...prev,
                              regions: prev.regions.filter(r => r !== region.code),
                            }));
                          }
                        }}
                        className="h-4 w-4 text-swiss-mint focus:ring-swiss-mint border-gray-300 rounded"
                      />
                      <label htmlFor={region.code} className="text-sm">
                        {region.name} ({region.code})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  value={newAlert.startDate}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, startDate: e.target.value }))}
                />
                <Input
                  label="End Date (Optional)"
                  type="date"
                  value={newAlert.endDate}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newAlert.isActive}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-swiss-mint focus:ring-swiss-mint border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="text-sm">Active</label>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={() => setIsCreateDialogOpen(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleCreateAlert}>
                Create Alert
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyAlertsPage;