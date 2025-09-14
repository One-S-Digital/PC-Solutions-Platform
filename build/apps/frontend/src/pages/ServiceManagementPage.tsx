import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { marketplaceService, Service, CreateServiceData, UpdateServiceData } from '../services/marketplaceService';
import { SwissCard, SwissButton, Input, Badge, Status } from '@repo/ui';
import { ServiceForm } from '../components/marketplace/ServiceForm';
import { useTranslation } from 'react-i18next';

export function ServiceManagementPage() {
  const { user } = useUser();
  const { t } = useTranslation();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setLoading(true);
    try {
      const servicesData = await marketplaceService.getServices();
      setServices(servicesData);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = async (data: CreateServiceData) => {
    try {
      await marketplaceService.createService(data);
      await loadServices();
      setShowForm(false);
    } catch (error) {
      console.error('Error creating service:', error);
    }
  };

  const handleUpdateService = async (id: string, data: UpdateServiceData) => {
    try {
      await marketplaceService.updateService(id, data);
      await loadServices();
      setEditingService(null);
    } catch (error) {
      console.error('Error updating service:', error);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (window.confirm(t('marketplace.confirmDelete', 'Are you sure you want to delete this service?'))) {
      try {
        await marketplaceService.deleteService(id);
        await loadServices();
      } catch (error) {
        console.error('Error deleting service:', error);
      }
    }
  };

  const handleToggleStatus = async (service: Service) => {
    try {
      await marketplaceService.updateService(service.id, {
        isActive: !service.isActive,
      });
      await loadServices();
    } catch (error) {
      console.error('Error updating service status:', error);
    }
  };

  const filteredServices = services.filter(service =>
    service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price?: number) => {
    if (!price) return t('marketplace.priceOnRequest', 'Price on request');
    return `CHF ${price.toFixed(2)}`;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      CLEANING: 'bg-blue-100 text-blue-800',
      IT_SUPPORT: 'bg-green-100 text-green-800',
      MAINTENANCE: 'bg-yellow-100 text-yellow-800',
      CONSULTING: 'bg-purple-100 text-purple-800',
      TRAINING: 'bg-pink-100 text-pink-800',
      OTHER: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.OTHER;
  };

  return (
    <div className="min-h-screen bg-surface-1">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-default mb-2">
              {t('marketplace.serviceManagement', 'Service Management')}
            </h1>
            <p className="text-text-secondary">
              {t('marketplace.manageYourServices', 'Manage your service offerings')}
            </p>
          </div>
          <SwissButton
            variant="primary"
            onClick={() => setShowForm(true)}
          >
            {t('marketplace.addService', 'Add Service')}
          </SwissButton>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <SwissCard>
            <div className="text-center">
              <div className="text-2xl font-bold text-text-default">
                {services.length}
              </div>
              <div className="text-sm text-text-secondary">
                {t('marketplace.totalServices', 'Total Services')}
              </div>
            </div>
          </SwissCard>
          <SwissCard>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {services.filter(s => s.isActive).length}
              </div>
              <div className="text-sm text-text-secondary">
                {t('marketplace.activeServices', 'Active Services')}
              </div>
            </div>
          </SwissCard>
          <SwissCard>
            <div className="text-center">
              <div className="text-2xl font-bold text-danger">
                {services.filter(s => !s.isActive).length}
              </div>
              <div className="text-sm text-text-secondary">
                {t('marketplace.inactiveServices', 'Inactive Services')}
              </div>
            </div>
          </SwissCard>
          <SwissCard>
            <div className="text-center">
              <div className="text-2xl font-bold text-text-default">
                {new Set(services.map(s => s.category)).size}
              </div>
              <div className="text-sm text-text-secondary">
                {t('marketplace.categories', 'Categories')}
              </div>
            </div>
          </SwissCard>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder={t('marketplace.searchServices', 'Search services...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Services Table */}
        <SwissCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-text-default">
                    {t('marketplace.service', 'Service')}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-default">
                    {t('marketplace.category', 'Category')}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-default">
                    {t('marketplace.price', 'Price')}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-default">
                    {t('marketplace.status', 'Status')}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-default">
                    {t('marketplace.created', 'Created')}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-text-default">
                    {t('marketplace.actions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="py-4 px-4">
                        <div className="animate-pulse">
                          <div className="h-4 bg-surface-2 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-surface-2 rounded w-1/2"></div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="animate-pulse h-4 bg-surface-2 rounded w-1/3"></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="animate-pulse h-4 bg-surface-2 rounded w-1/4"></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="animate-pulse h-6 bg-surface-2 rounded w-16"></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="animate-pulse h-4 bg-surface-2 rounded w-20"></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="animate-pulse h-8 bg-surface-2 rounded w-20 ml-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-secondary">
                      {t('marketplace.noServices', 'No services found')}
                    </td>
                  </tr>
                ) : (
                  filteredServices.map(service => (
                    <tr key={service.id} className="border-b border-border hover:bg-surface-2">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-surface-2 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-accent-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium text-text-default">
                              {service.title}
                            </div>
                            <div className="text-sm text-text-secondary line-clamp-1">
                              {service.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge 
                          variant="secondary" 
                          className={getCategoryColor(service.category)}
                        >
                          {t(`marketplace.serviceCategory.${service.category}`, service.category)}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium text-text-default">
                          {formatPrice(service.price)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <Status
                          variant={service.isActive ? 'success' : 'danger'}
                        >
                          {service.isActive 
                            ? t('marketplace.active', 'Active')
                            : t('marketplace.inactive', 'Inactive')
                          }
                        </Status>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-text-secondary">
                          {new Date(service.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <SwissButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(service)}
                          >
                            {service.isActive ? t('marketplace.deactivate', 'Deactivate') : t('marketplace.activate', 'Activate')}
                          </SwissButton>
                          <SwissButton
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingService(service)}
                          >
                            {t('marketplace.edit', 'Edit')}
                          </SwissButton>
                          <SwissButton
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteService(service.id)}
                          >
                            {t('marketplace.delete', 'Delete')}
                          </SwissButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SwissCard>
      </div>

      {/* Service Form Modal */}
      {(showForm || editingService) && (
        <ServiceForm
          service={editingService}
          onSave={editingService 
            ? (data) => handleUpdateService(editingService.id, data)
            : handleCreateService
          }
          onClose={() => {
            setShowForm(false);
            setEditingService(null);
          }}
        />
      )}
    </div>
  );
}